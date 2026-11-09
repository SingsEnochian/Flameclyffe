// Wayglass Bloodstream v0.2 · one autonomous pulse = one Eightfold Möbius cycle.
//
// Perceive   observe every open Wayglass/Hearthgate/ArcSweep PR at its exact head
// Compress   supersession relations and overlap clusters (incomplete listings = loss)
// Release    every candidate action, as alternatives
// Verify     the observation is complete and the carried pulse count is sound
// Integrate  weave each alternative with the kernel's inspectCirculationAction()
// Choose     at most one structural action + up to three receipts; dropped kept
// Return     Withness applies staged GitHub effects; reversible ones compensate
// Transcend  carry {pulse} to the next cycle on the opposite face
// The lineage's checkpoints persist on a `wayglass:lineage` issue so every pulse
// chains to the last. Dry run is the default and stages nothing.

import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { agentVerificationInstructions } from '../apps/arcsweep/src/swarm/agent-verification-inheritance.js';

const require = createRequire(import.meta.url);
const { inspectCirculationAction, KERNEL_SCHEMA, openMobiusLineage, verifyMobiusChain } = require('../lib/wayglass-kernel.cjs');
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

const LINEAGE_LABEL = 'wayglass:lineage';
const decisions = [];
const commentsCache = new Map();
async function commentsOf(n) {
  if (!commentsCache.has(n)) commentsCache.set(n, (await pages(`${root}/issues/${n}/comments`, 10)).items);
  return commentsCache.get(n);
}
function receiptFooter(decision, cycle) {
  return [
    '',
    `Kernel: \`${decision.kernel}\` · organ \`${decision.schema}\` · allowed: ${decision.allowed}`,
    `Möbius: bloodstream lineage cycle ${cycle.cycle} (${cycle.face} face) · observed head: \`${decision.head_sha}\`${sourceSha ? ` · source \`${sourceSha.slice(0, 7)}\`` : ''}${runUrl ? ` · [run](${runUrl})` : ''}`,
    'No model inference is claimed by this receipt. `main` is never merged autonomously.',
  ].join('\n');
}

// Reversible GitHub effects. Return applies them in order and compensates in reverse.
function commentEffect(n, body, auth = token) {
  let id = null;
  return { kind: 'comment', describe: { issue: n },
    apply: async () => { id = (await api(`${root}/issues/${n}/comments`, { method: 'POST', body: { body }, auth })).id; return id; },
    undo: async () => { if (id) await api(`${root}/issues/comments/${id}`, { method: 'DELETE', auth }); } };
}
const labelEffect = (n, label) => ({ kind: 'label', describe: { issue: n, label },
  apply: async () => { await api(`${root}/issues/${n}/labels`, { method: 'POST', body: { labels: [label] } }); return label; },
  undo: async () => { await api(`${root}/issues/${n}/labels/${encodeURIComponent(label)}`, { method: 'DELETE' }); } });
const closeEffect = n => ({ kind: 'close', describe: { pr: n },
  apply: async () => { await api(`${root}/pulls/${n}`, { method: 'PATCH', body: { state: 'closed' } }); return 'closed'; },
  undo: async () => { await api(`${root}/pulls/${n}`, { method: 'PATCH', body: { state: 'open' } }); } });
// A merge cannot be unmade by the bloodstream. It is the one irreversible
// effect; owner consent is Rowan's apply switch (WAYGLASS_BLOODSTREAM_APPLY).
const mergeEffect = (n, sha) => ({ kind: 'merge', describe: { pr: n, sha, into: B.STAGING_BRANCH }, consent: apply,
  apply: async () => { const m = await api(`${root}/pulls/${n}/merge`, { method: 'PUT', body: {
    sha, merge_method: 'merge', commit_title: `Wayglass Bloodstream: merge #${n} into ${B.STAGING_BRANCH}` } }); return m.sha || null; } });

// ---- Restore the lineage (cold return) ------------------------------------
// The lineage issue is a write-ahead journal: an `intent` entry before any
// effect is applied, a `commit` entry (carrying the checkpoint) after.
const JOURNAL_MARKER = '<!-- wayglass-mobius-journal:v1 -->';
const lineageIssues = (await pages(`${root}/issues?state=open&labels=${encodeURIComponent(LINEAGE_LABEL)}`, 1)).items
  .filter(i => !i.pull_request);
let lineageIssueNumber = lineageIssues[0]?.number ?? null;
const entries = [];
if (lineageIssueNumber) {
  for (const c of await commentsOf(lineageIssueNumber)) {
    const m = String(c.body || '').match(/<!-- wayglass-mobius-journal:v1 -->\s*```json\s*([\s\S]*?)```/);
    if (!m) continue;
    try { entries.push(JSON.parse(m[1])); }
    catch { throw Error(`Return refused: unreadable journal entry in comment ${c.id}. Not guessing.`); }
  }
}
const persisted = entries.filter(e => e.kind === 'commit').map(e => e.checkpoint);
let featherState = { variable: process.env.WAYGLASS_FEATHER || '', open_feather_issue: false };
const lineageOptions = {
  system: 'wayglass-bloodstream', name: 'bloodstream',
  intent: "reconcile the ship's parallel work without losing anyone's",
  seeds: { pulse: 0 }, worker: runUrl || 'local-dry-run',
  feather: () => B.featherStopped(featherState),
};
const probe = openMobiusLineage(lineageOptions);
if (persisted.length) {
  const chain = verifyMobiusChain(probe.root, persisted);
  // FR-17: a broken chain is a refusal, never a fresh start under the old name.
  if (!chain.ok) throw Error(`Return refused: bloodstream chain broken at checkpoint ${chain.at} (${chain.why}). Review issue #${lineageIssueNumber}.`);
}
const restored = persisted.length ? `resumed at cycle ${persisted.at(-1).cycle}` : 'fresh';
async function journalWrite(entry) {
  if (!lineageIssueNumber) {
    lineageIssueNumber = (await api(`${root}/issues`, { method: 'POST', body: { title: 'Wayglass Bloodstream · Möbius lineage',
      labels: [LINEAGE_LABEL], body: 'Write-ahead journal for the Wayglass Bloodstream lineage: an `intent` before each Return applies effects, a `commit` with the checkpoint after. Do not edit. Close this issue only to retire the lineage.' } })).number;
  }
  await api(`${root}/issues/${lineageIssueNumber}/comments`, { method: 'POST', body: { body:
    `${JOURNAL_MARKER}\n${entry.kind} · cycle ${entry.cycle}\n\`\`\`json\n${JSON.stringify(entry)}\n\`\`\`` } });
}
const lineage = openMobiusLineage({ ...lineageOptions, previous: persisted.at(-1) || null,
  journalTail: entries.at(-1) || null, journal: apply ? { write: journalWrite } : null });
note(`Möbius lineage ${lineage.root.slice(0, 18)}… · ${restored}`);

// Full observations live here; phase outputs are their canonical summaries.
const world = { prs: [], byNumber: new Map(), supersessions: [], clusters: [], alternatives: [] };
const context = {};

const phases = {
  async perceive(ctx) {
    const { items: openPrs, complete } = await pages(`${root}/pulls?state=open`, 10);
    for (const p of openPrs.filter(p => RELEVANT.test(p.title + ' ' + p.head.ref))) {
      const { items: files, complete: fc } = await pages(`${root}/pulls/${p.number}/files`, 30);
      world.prs.push({ number: p.number, title: p.title, base: p.base.ref, head_ref: p.head.ref,
        head_sha: p.head.sha, observed_head_sha: p.head.sha, draft: p.draft, state: p.state,
        labels: p.labels.map(l => l.name), files_complete: fc && files.length < 3000,
        files: files.map(f => ({ path: f.filename, blob_sha: f.sha, status: f.status })) });
    }
    world.byNumber = new Map(world.prs.map(p => [p.number, p]));
    world.listComplete = complete;
    const featherIssues = (await pages(`${root}/issues?state=open&labels=${encodeURIComponent(B.FEATHER_LABEL)}`, 2)).items;
    featherState = { ...featherState, open_feather_issue: featherIssues.length > 0 };
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const recent = (await pages(`${root}/issues/comments?since=${since}`, 10)).items;
    Object.assign(context, {
      feather: featherState,
      daily_codex_budget: Number.isInteger(budget) ? budget : B.DEFAULT_DAILY_CODEX_BUDGET,
      codex_dispatches_last_24h: recent.filter(c => String(c.body || '').includes(B.MARKERS.dispatch)).length,
      codex_dispatch_identity: Boolean(codexToken),
    });
    ctx.possibility('gathered', world.prs.length);
    note(`Perceive · ${world.prs.length} relevant open PRs (list complete: ${complete}) · Feather ${B.featherStopped(featherState) ? 'STOPPED' : 'flowing'} · Codex ${context.codex_dispatches_last_24h}/${context.daily_codex_budget} in 24h · identity ${codexToken ? 'present' : 'absent'} · ${apply ? 'APPLY' : 'dry-run'} · ${ctx.face} face, origin ${ctx.origin}`);
    return { prs: world.prs.map(p => [p.number, p.head_sha]), list_complete: complete,
      feather: B.featherStopped(featherState), carried_pulse: ctx.carried.pulse };
  },

  async compress(ctx) {
    world.supersessions = B.findSupersessions(world.prs);
    world.clusters = B.overlapClusters(world.prs);
    ctx.possibility('generated', world.supersessions.length + world.clusters.length);
    const loss = world.prs.filter(p => !p.files_complete).map(p => p.number);
    note(`Compress · ${world.supersessions.length} supersession relations · ${world.clusters.length} overlap clusters · loss: ${loss.length ? loss.join(', ') : 'none'}`);
    return { supersessions: world.supersessions.map(r => [r.superseded, r.by, r.relation, r.identical.length, r.extended.length]),
      clusters: world.clusters.map(c => [c.base, c.prs.length, c.shared_files.length]), loss };
  },

  async release(ctx) {
    const alts = [];
    for (const pr of world.prs.filter(p => p.labels.includes(B.BLOODSTREAM_LABEL) && p.base === B.STAGING_BRANCH)) {
      const comments = await commentsOf(pr.number);
      const lastDispatch = [...comments].reverse().find(c => String(c.body || '').includes(B.MARKERS.dispatch));
      const workerReturned = Boolean(lastDispatch) && comments.some(c => c.created_at > lastDispatch.created_at
        && /codex/i.test(c.user?.login || '') && !String(c.body || '').includes(B.MARKERS.dispatch));
      const runs = (await api(`${root}/commits/${pr.head_sha}/check-runs?per_page=100`)).check_runs || [];
      const statuses = (await api(`${root}/commits/${pr.head_sha}/status`)).statuses || [];
      const checks = { total: runs.length + statuses.length,
        failed: runs.filter(r => ['failure', 'timed_out', 'cancelled', 'action_required'].includes(r.conclusion)).length
          + statuses.filter(s => ['failure', 'error'].includes(s.state)).length,
        pending: runs.filter(r => r.status !== 'completed').length + statuses.filter(s => s.state === 'pending').length };
      const detail = await api(`${root}/pulls/${pr.number}`);
      alts.push({ type: 'merge-to-staging', structural: true, pr: { ...pr, head_sha: detail.head.sha,
        worker_returned_after_dispatch: workerReturned, checks, mergeable: detail.mergeable } });
    }
    for (const pr of world.prs.filter(p => p.labels.includes(B.SUPERSEDED_LABEL))) {
      const rec = (await commentsOf(pr.number)).find(c => String(c.body || '').includes(B.MARKERS.supersession));
      const m = String(rec?.body || '').match(/relation: (exact|candidate) · carried by #(\d+) at `([0-9a-f]{40})`/);
      if (!m) continue;
      const [, relation, byNum, bySha] = m;
      const container = await api(`${root}/pulls/${byNum}`);
      const still = B.supersession(pr, { ...pr, number: Number(byNum), base: container.base.ref, files_complete: true,
        files: (await pages(`${root}/pulls/${byNum}/files`, 30)).items.map(f => ({ path: f.filename, blob_sha: f.sha, status: f.status })) });
      alts.push({ type: 'close-superseded', structural: true, pr, by: Number(byNum), base: container.base.ref,
        relation: still?.relation === 'exact' ? relation : 'changed-since-receipt',
        superseded_by: { number: Number(byNum), head_sha: bySha, merged_into: container.merged_at ? container.base.ref : null } });
    }
    const receipted = new Set();
    for (const rel of world.supersessions) {
      if (receipted.has(rel.superseded)) continue;
      receipted.add(rel.superseded);
      const already = (await commentsOf(rel.superseded)).some(c =>
        String(c.body || '').includes(B.MARKERS.supersession) && c.body.includes(rel.superseded_head_sha));
      if (!already) alts.push({ type: 'receipt-supersession', structural: false, pr: world.byNumber.get(rel.superseded), rel });
    }
    for (const rel of world.supersessions.filter(r => r.relation === 'candidate')) {
      const done = (await commentsOf(rel.by)).some(c => String(c.body || '').includes(B.MARKERS.dispatch)
        && c.body.includes(`#${rel.superseded} (head ${rel.superseded_head_sha})`));
      if (done) continue;
      const packet = B.codexReconciliationPacket(rel, { verificationInstructions: agentVerificationInstructions(), sourceSha });
      alts.push({ type: 'dispatch-codex', structural: true, pr: world.byNumber.get(rel.by), rel, packet });
    }
    world.alternatives = alts;
    ctx.possibility('generated', alts.length);
    note(`Release · ${alts.length} alternative actions`);
    return alts.map(a => [a.type, a.pr?.number ?? null]);
  },

  async verify(ctx, o) {
    const pulse = ctx.carried.pulse;
    return [
      { ok: o.perceive.list_complete === true, reason: 'open PR list observed completely' },
      { ok: Number.isInteger(pulse) && pulse >= 0, reason: 'carried pulse count re-verified on this face' },
      { ok: world.supersessions.every(r => world.byNumber.get(r.superseded)?.files_complete && world.byNumber.get(r.by)?.files_complete),
        reason: 'every compared PR has a complete file listing' },
    ];
  },

  async integrate(ctx) {
    const woven = [];
    for (const alt of world.alternatives) {
      const action = alt.type === 'close-superseded'
        ? { type: alt.type, relation: alt.relation, pr: alt.pr, superseded_by: alt.superseded_by }
        : { type: alt.type, pr: alt.pr, packet: alt.packet };
      const decision = inspectCirculationAction(action, context);
      decisions.push(decision);
      alt.decision = decision;
      woven.push([alt.type, alt.pr?.number ?? null, decision.allowed, decision.reasons]);
    }
    note(`Integrate · kernel allowed ${woven.filter(w => w[2]).length} of ${woven.length}`);
    // Harmony: how much of the released possibility the kernel finds coherent with the ship's law.
    ctx.harmony(woven.length ? woven.filter(w => w[2]).length / woven.length : 1);
    return woven;
  },

  async choose(ctx) {
    const selected = []; const dropped = [];
    const pick = (alt, why) => { selected.push([alt.type, alt.pr?.number ?? null, why]); note(`  chosen ${alt.type} #${alt.pr?.number} · ${why}`); };
    const drop = (alt, why) => dropped.push([alt.type, alt.pr?.number ?? null, why]);
    let structural = null;
    for (const t of ['merge-to-staging', 'close-superseded']) {
      for (const alt of world.alternatives.filter(a => a.type === t)) {
        if (!structural && alt.decision.allowed) { structural = alt; pick(alt, 'first allowed structural action'); }
        else drop(alt, alt.decision.allowed ? 'one structural action per pulse' : alt.decision.reasons.join(', '));
      }
    }
    let receipts = 0;
    for (const alt of world.alternatives.filter(a => a.type === 'receipt-supersession')) {
      if (alt.decision.allowed && receipts < MAX_RECEIPTS_PER_PULSE) { receipts++; pick(alt, 'supersession receipt'); stageReceipt(ctx, alt); }
      else drop(alt, alt.decision.allowed ? 'receipt limit per pulse' : alt.decision.reasons.join(', '));
    }
    const dispatches = world.alternatives.filter(a => a.type === 'dispatch-codex');
    dispatches.forEach((alt, i) => {
      if (i === 0 && !structural && alt.decision.allowed) { structural = alt; pick(alt, 'one Codex reconciliation per pulse'); }
      else drop(alt, i > 0 ? 'one dispatch decision per pulse' : structural ? 'structural action already chosen' : alt.decision.reasons.join(', '));
    });
    if (structural) stageStructural(ctx, structural);
    for (const d of dropped) note(`  held ${d[0]} #${d[1]} · ${d[2]}`);
    ctx.possibility('generated', selected.length);
    return { selected, dropped, staged: apply };
  },

  async transcend(ctx) {
    return { pulse: ctx.carried.pulse + 1 };
  },
};

function stageReceipt(ctx, alt) {
  if (!apply) return;
  const { rel } = alt;
  ctx.stage(commentEffect(rel.superseded, [
    B.MARKERS.supersession,
    `**Wayglass Bloodstream · supersession observed.**`,
    `relation: ${rel.relation} · carried by #${rel.by} at \`${rel.by_head_sha}\``,
    `This PR at \`${rel.superseded_head_sha}\`: ${rel.identical.length} files byte-identical in #${rel.by}${rel.extended.length ? `; ${rel.extended.length} extended there and need a behaviour check: ${rel.extended.map(p => '`' + p + '`').join(', ')}` : ''}.`,
    rel.relation === 'exact'
      ? `When #${rel.by} merges into \`${rel.base}\`, the bloodstream will close this PR (reopenable; the branch is kept).`
      : `A Codex reconciliation task on #${rel.by} must confirm nothing was lost before this PR can be closed.`,
    receiptFooter(alt.decision, ctx),
  ].join('\n')));
  if (rel.relation === 'exact') ctx.stage(labelEffect(rel.superseded, B.SUPERSEDED_LABEL));
}

function stageStructural(ctx, alt) {
  if (!apply) return;
  const n = alt.pr.number;
  if (alt.type === 'merge-to-staging') {
    ctx.stage(mergeEffect(n, alt.pr.observed_head_sha));
    ctx.stage(commentEffect(n, [B.MARKERS.merge, `**Wayglass Bloodstream · merged into \`${B.STAGING_BRANCH}\`.**`,
      `Checks: ${alt.pr.checks.total} observed, 0 failed, 0 pending. A worker reply followed the reconciliation dispatch.`,
      receiptFooter(alt.decision, ctx)].join('\n')));
  } else if (alt.type === 'close-superseded') {
    ctx.stage(commentEffect(n, [B.MARKERS.close,
      `**Wayglass Bloodstream · closing as superseded.** Every file in this PR is byte-identical in #${alt.by}, which is now merged into \`${alt.base}\`. Nothing is deleted: the branch \`${alt.pr.head_ref}\` stays, and this PR can be reopened.`,
      receiptFooter(alt.decision, ctx)].join('\n')));
    ctx.stage(closeEffect(n));
  } else if (alt.type === 'dispatch-codex') {
    // FR-11: deleting the comment cannot recall a Codex task that has started, so
    // the dispatch is irreversible: owner consent (the apply switch), applied last.
    ctx.stage(labelEffect(n, B.BLOODSTREAM_LABEL));
    ctx.stage({ kind: 'codex-dispatch', describe: { pr: n }, consent: apply,
      apply: async () => (await api(`${root}/issues/${n}/comments`, { method: 'POST',
        body: { body: alt.packet + '\n' + receiptFooter(alt.decision, ctx) }, auth: codexToken })).id });
  }
}

// ---- One cycle -------------------------------------------------------------
const result = await lineage.cycle(phases);
note(`Möbius cycle ${result.cycle} (${result.face} face) · ${result.status}${result.reason ? ' · ' + result.reason.join('; ') : ''}`);
const sp = result.checkpoint?.spiral;
if (sp) note(`Spiral turn ${sp.turn} · ln r ${sp.ln_r} (×${sp.growth_factor}) · ${sp.chirality} · chaos ${sp.chaos} · harmony ${sp.harmony} · propulsion ${sp.propulsion} · ${sp.state}`);

if (result.journal_error) { note(`JOURNAL: ${result.journal_error}`); process.exitCode = 1; }

// ---- Report ---------------------------------------------------------------
const report = {
  schema: 'wayglass.bloodstream-pulse/v0.2',
  kernel: KERNEL_SCHEMA,
  mode: apply ? 'apply' : 'dry-run',
  source_sha: sourceSha, run_url: runUrl,
  mobius: { root: lineage.root, restored, cycle: result.cycle, face: result.face, status: result.status,
    receipts: result.receipts, checkpoint: result.checkpoint, outputs: result.outputs },
  observed_prs: world.prs.length, pr_list_complete: world.listComplete,
  incomplete_file_listings: world.prs.filter(p => !p.files_complete).map(p => p.number),
  feather: featherState, codex_dispatches_last_24h: context.codex_dispatches_last_24h, codex_dispatch_identity: Boolean(codexToken),
  supersessions: world.supersessions.map(r => ({ superseded: r.superseded, by: r.by, relation: r.relation, identical: r.identical.length, extended: r.extended })),
  top_clusters: world.clusters.slice(0, 10).map(c => ({ base: c.base, prs: c.prs, shared_files: c.shared_files.length,
    hottest: [...c.shared_files].sort((a, b) => b.prs.length - a.prs.length).slice(0, 5) })),
  decisions,
  log,
};
mkdirSync('.wayglass-artifacts', { recursive: true });
writeFileSync('.wayglass-artifacts/bloodstream-pulse.json', JSON.stringify(report, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  `## Wayglass Bloodstream pulse (${report.mode}) · Möbius cycle ${result.cycle}, ${result.face} face\n\n` + log.map(l => '- ' + l.trim()).join('\n') + '\n');
if (!['committed', 'committed-feather', 'feather-stopped'].includes(result.status)) process.exitCode = 1;
