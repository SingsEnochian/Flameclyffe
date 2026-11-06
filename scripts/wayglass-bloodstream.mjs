// Wayglass Bloodstream v0.1 · one autonomous pulse.
//
// Each pulse observes every open Wayglass/Hearthgate/ArcSweep PR at its exact
// head SHA, then performs at most one structural action (merge into staging,
// close a merged-over PR, or dispatch one Codex reconciliation task) plus a
// small number of supersession receipts. Every action passes the kernel's
// inspectCirculationAction() first. Dry run is the default.

import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { agentVerificationInstructions } from '../apps/arcsweep/src/swarm/agent-verification-inheritance.js';

const require = createRequire(import.meta.url);
const { inspectCirculationAction, KERNEL_SCHEMA } = require('../lib/wayglass-kernel.cjs');
const B = require('../lib/wayglass-bloodstream.cjs');

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const codexToken = process.env.WAYGLASS_CODEX_DISPATCH_TOKEN || '';
const apply = process.env.WAYGLASS_APPLY === 'true';
const budget = Number.parseInt(process.env.WAYGLASS_CODEX_DAILY_BUDGET || '', 10);
const sourceSha = process.env.GITHUB_SHA || null;
const runUrl = repo && process.env.GITHUB_RUN_ID
  ? `https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}` : null;
if (!repo || (!token && process.env.WAYGLASS_GITHUB_TRANSPORT !== 'gh-cli')) {
  throw Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required.');
}

const RELEVANT = /wayglass|hearthgate|arcsweep|eightfold|withness|bloodstream/i;
const MAX_RECEIPTS_PER_PULSE = 3;

// Local verification can route through an already-authenticated `gh` CLI
// instead of a raw token. Only honoured in dry-run, so it cannot mutate.
const ghCli = process.env.WAYGLASS_GITHUB_TRANSPORT === 'gh-cli' && !apply;
async function api(path, { method = 'GET', body, auth = token } = {}) {
  if (ghCli) {
    if (method !== 'GET') throw Error('gh-cli transport is read-only');
    const r = spawnSync('gh', ['api', path.replace(/^\//, '')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) throw Error(`gh api failed ${path}: ${String(r.stderr).slice(0, 200)}`);
    return JSON.parse(r.stdout || 'null');
  }
  const res = await fetch('https://api.github.com' + path, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + auth,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw Error(`GitHub API ${res.status} ${method} ${path}`);
  return res.status === 204 ? null : res.json();
}
async function pages(path, max = 30) {
  const all = [];
  for (let page = 1; page <= max; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const batch = await api(`${path}${sep}per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) return { items: all, complete: true };
  }
  return { items: all, complete: false };
}
const root = `/repos/${repo}`;
const log = [];
const note = line => { log.push(line); console.log(line); };

// ---- Observe --------------------------------------------------------------
const { items: openPrs, complete: prListComplete } = await pages(`${root}/pulls?state=open`, 10);
const relevant = openPrs.filter(p => RELEVANT.test(p.title + ' ' + p.head.ref));
const prs = [];
for (const p of relevant) {
  const { items: files, complete } = await pages(`${root}/pulls/${p.number}/files`, 30);
  prs.push({
    number: p.number, title: p.title, base: p.base.ref, head_ref: p.head.ref,
    head_sha: p.head.sha, observed_head_sha: p.head.sha, draft: p.draft, state: p.state,
    labels: p.labels.map(l => l.name),
    files_complete: complete && files.length < 3000,
    files: files.map(f => ({ path: f.filename, blob_sha: f.sha, status: f.status })),
  });
}
const byNumber = new Map(prs.map(p => [p.number, p]));

const featherIssues = (await pages(`${root}/issues?state=open&labels=${encodeURIComponent(B.FEATHER_LABEL)}`, 2)).items;
const feather = { variable: process.env.WAYGLASS_FEATHER || '', open_feather_issue: featherIssues.length > 0 };
const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
const recentComments = (await pages(`${root}/issues/comments?since=${since}`, 10)).items;
const dispatchesLast24h = recentComments.filter(c => String(c.body || '').includes(B.MARKERS.dispatch)).length;

const context = {
  feather,
  daily_codex_budget: Number.isInteger(budget) ? budget : B.DEFAULT_DAILY_CODEX_BUDGET,
  codex_dispatches_last_24h: dispatchesLast24h,
  codex_dispatch_identity: Boolean(codexToken),
};

const supersessions = B.findSupersessions(prs);
const clusters = B.overlapClusters(prs);
note(`Observed ${prs.length} relevant open PRs (list complete: ${prListComplete}); ${supersessions.length} supersession relations; ${clusters.length} overlap clusters.`);
note(`Feather: ${B.featherStopped(feather) ? 'STOPPED' : 'flowing'} · Codex dispatches last 24h: ${dispatchesLast24h}/${context.daily_codex_budget} · dispatch identity: ${codexToken ? 'present' : 'absent'} · mode: ${apply ? 'APPLY' : 'dry-run'}`);

const decisions = [];
const commentsCache = new Map();
async function commentsOf(n) {
  if (!commentsCache.has(n)) commentsCache.set(n, (await pages(`${root}/issues/${n}/comments`, 10)).items);
  return commentsCache.get(n);
}
function receiptFooter(decision) {
  return [
    '',
    `Kernel: \`${decision.kernel}\` · organ \`${decision.schema}\` · allowed: ${decision.allowed}`,
    `Observed head: \`${decision.head_sha}\`${sourceSha ? ` · bloodstream source main@\`${sourceSha.slice(0, 7)}\`` : ''}${runUrl ? ` · [run](${runUrl})` : ''}`,
    'No model inference is claimed by this receipt. `main` is never merged autonomously.',
  ].join('\n');
}
async function decide(action) {
  const decision = inspectCirculationAction(action, context);
  decisions.push(decision);
  note(`  kernel ${decision.allowed ? 'ALLOWS' : 'HOLDS'} ${decision.action} #${decision.pull_request}${decision.reasons.length ? ' · ' + decision.reasons.join(', ') : ''}`);
  return decision;
}

let structuralActionTaken = false;

// ---- 1. Merge gate: reconciled PRs into staging ---------------------------
for (const pr of prs.filter(p => p.labels.includes(B.BLOODSTREAM_LABEL) && p.base === B.STAGING_BRANCH)) {
  if (structuralActionTaken) break;
  const comments = await commentsOf(pr.number);
  const lastDispatch = [...comments].reverse().find(c => String(c.body || '').includes(B.MARKERS.dispatch));
  const workerReturned = Boolean(lastDispatch) && comments.some(c =>
    c.created_at > lastDispatch.created_at && /codex/i.test(c.user?.login || '')
    && !String(c.body || '').includes(B.MARKERS.dispatch));
  const runs = (await api(`${root}/commits/${pr.head_sha}/check-runs?per_page=100`)).check_runs || [];
  const status = await api(`${root}/commits/${pr.head_sha}/status`);
  const statuses = status.statuses || [];
  const checks = {
    total: runs.length + statuses.length,
    failed: runs.filter(r => ['failure', 'timed_out', 'cancelled', 'action_required'].includes(r.conclusion)).length
      + statuses.filter(s => ['failure', 'error'].includes(s.state)).length,
    pending: runs.filter(r => r.status !== 'completed').length + statuses.filter(s => s.state === 'pending').length,
  };
  const detail = await api(`${root}/pulls/${pr.number}`);
  const decision = await decide({
    type: 'merge-to-staging',
    pr: { ...pr, head_sha: detail.head.sha, worker_returned_after_dispatch: workerReturned, checks, mergeable: detail.mergeable },
  });
  if (decision.allowed && apply) {
    await api(`${root}/pulls/${pr.number}/merge`, { method: 'PUT', body: {
      sha: pr.head_sha, merge_method: 'merge',
      commit_title: `Wayglass Bloodstream: merge #${pr.number} into ${B.STAGING_BRANCH}`,
    } });
    await api(`${root}/issues/${pr.number}/comments`, { method: 'POST', body: { body: [
      B.MARKERS.merge,
      `**Wayglass Bloodstream · merged into \`${B.STAGING_BRANCH}\`.**`,
      `Checks: ${checks.total} observed, 0 failed, 0 pending. A worker reply followed the reconciliation dispatch.`,
      receiptFooter(decision),
    ].join('\n') } });
    structuralActionTaken = true;
    note(`  merged #${pr.number} into ${B.STAGING_BRANCH}`);
  }
}

// ---- 2. Close exact supersessions whose container has landed --------------
for (const pr of prs.filter(p => p.labels.includes(B.SUPERSEDED_LABEL))) {
  if (structuralActionTaken) break;
  const receipt = (await commentsOf(pr.number)).find(c => String(c.body || '').includes(B.MARKERS.supersession));
  const match = String(receipt?.body || '').match(/relation: (exact|candidate) · carried by #(\d+) at `([0-9a-f]{40})`/);
  if (!match) continue;
  const [, relation, byNum, bySha] = match;
  const container = await api(`${root}/pulls/${byNum}`);
  // Byte-identical carriage must still hold at the superseded PR's current head.
  const still = B.supersession(pr, { ...pr, number: Number(byNum), base: container.base.ref,
    files_complete: true,
    files: (await pages(`${root}/pulls/${byNum}/files`, 30)).items.map(f => ({ path: f.filename, blob_sha: f.sha, status: f.status })) });
  const decision = await decide({
    type: 'close-superseded',
    relation: still?.relation === 'exact' ? relation : 'changed-since-receipt',
    pr,
    superseded_by: { number: Number(byNum), head_sha: bySha, merged_into: container.merged_at ? container.base.ref : null },
  });
  if (decision.allowed && apply) {
    await api(`${root}/issues/${pr.number}/comments`, { method: 'POST', body: { body: [
      B.MARKERS.close,
      `**Wayglass Bloodstream · closing as superseded.** Every file in this PR is byte-identical in #${byNum}, which is now merged into \`${container.base.ref}\`. Nothing is deleted: the branch \`${pr.head_ref}\` stays, and this PR can be reopened.`,
      receiptFooter(decision),
    ].join('\n') } });
    await api(`${root}/pulls/${pr.number}`, { method: 'PATCH', body: { state: 'closed' } });
    structuralActionTaken = true;
    note(`  closed #${pr.number} (carried by #${byNum})`);
  }
}

// ---- 3. Supersession receipts (informational, bounded) --------------------
let receipts = 0;
const receipted = new Set();
for (const rel of supersessions) {
  if (receipts >= MAX_RECEIPTS_PER_PULSE || receipted.has(rel.superseded)) continue;
  const pr = byNumber.get(rel.superseded);
  const already = (await commentsOf(rel.superseded)).some(c =>
    String(c.body || '').includes(B.MARKERS.supersession) && c.body.includes(rel.superseded_head_sha));
  if (already) { receipted.add(rel.superseded); continue; }
  const decision = await decide({ type: 'receipt-supersession', pr });
  receipted.add(rel.superseded);
  if (!decision.allowed || !apply) continue;
  await api(`${root}/issues/${rel.superseded}/comments`, { method: 'POST', body: { body: [
    B.MARKERS.supersession,
    `**Wayglass Bloodstream · supersession observed.**`,
    `relation: ${rel.relation} · carried by #${rel.by} at \`${rel.by_head_sha}\``,
    `This PR at \`${rel.superseded_head_sha}\`: ${rel.identical.length} files byte-identical in #${rel.by}${rel.extended.length ? `; ${rel.extended.length} extended there and need a behaviour check: ${rel.extended.map(p => '`' + p + '`').join(', ')}` : ''}.`,
    rel.relation === 'exact'
      ? `When #${rel.by} merges into \`${rel.base}\`, the bloodstream will close this PR (reopenable; the branch is kept).`
      : `A Codex reconciliation task on #${rel.by} must confirm nothing was lost before this PR can be closed.`,
    receiptFooter(decision),
  ].join('\n') } });
  if (rel.relation === 'exact') await api(`${root}/issues/${rel.superseded}/labels`, { method: 'POST', body: { labels: [B.SUPERSEDED_LABEL] } });
  receipts++;
}

// ---- 4. Dispatch one Codex reconciliation task ----------------------------
if (!structuralActionTaken) {
  for (const rel of supersessions.filter(r => r.relation === 'candidate')) {
    const container = byNumber.get(rel.by);
    const done = (await commentsOf(rel.by)).some(c => String(c.body || '').includes(B.MARKERS.dispatch)
      && c.body.includes(`#${rel.superseded} (head ${rel.superseded_head_sha})`));
    if (done) continue;
    const packet = B.codexReconciliationPacket(rel, { verificationInstructions: agentVerificationInstructions(), sourceSha });
    const decision = await decide({ type: 'dispatch-codex', pr: container, packet });
    if (decision.allowed && apply) {
      await api(`${root}/issues/${rel.by}/comments`, { method: 'POST', auth: codexToken, body: { body: packet + '\n' + receiptFooter(decision) } });
      await api(`${root}/issues/${rel.by}/labels`, { method: 'POST', body: { labels: [B.BLOODSTREAM_LABEL] } });
      structuralActionTaken = true;
      note(`  dispatched Codex on #${rel.by} to reconcile #${rel.superseded}`);
    }
    break; // one dispatch decision per pulse, allowed or held
  }
}

// ---- Report ---------------------------------------------------------------
const report = {
  schema: 'wayglass.bloodstream-pulse/v0.1',
  kernel: KERNEL_SCHEMA,
  mode: apply ? 'apply' : 'dry-run',
  source_sha: sourceSha, run_url: runUrl,
  observed_prs: prs.length, pr_list_complete: prListComplete,
  incomplete_file_listings: prs.filter(p => !p.files_complete).map(p => p.number),
  feather, codex_dispatches_last_24h: dispatchesLast24h, codex_dispatch_identity: Boolean(codexToken),
  supersessions: supersessions.map(r => ({ superseded: r.superseded, by: r.by, relation: r.relation, identical: r.identical.length, extended: r.extended })),
  top_clusters: clusters.slice(0, 10).map(c => ({ base: c.base, prs: c.prs, shared_files: c.shared_files.length,
    hottest: c.shared_files.sort((a, b) => b.prs.length - a.prs.length).slice(0, 5) })),
  decisions,
  structural_action_taken: structuralActionTaken,
  log,
};
mkdirSync('.wayglass-artifacts', { recursive: true });
writeFileSync('.wayglass-artifacts/bloodstream-pulse.json', JSON.stringify(report, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  `## Wayglass Bloodstream pulse (${report.mode})\n\n` + log.map(l => '- ' + l.trim()).join('\n') + '\n');
