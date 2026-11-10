'use strict';

// Wayglass Bloodstream v0.1 · kernel organ for autonomous repair,
// reconciliation and continued construction.
//
// The bloodstream may observe, receipt, label, dispatch a Codex worker,
// close a PR whose work is byte-for-byte carried elsewhere, and merge into
// the staging branch. It never merges into `main`, never rewrites another
// constellation's material, and never acts while Feather is stopped.
// Every action passes inspectBloodstreamAction() before it is applied.

const BLOODSTREAM_SCHEMA = 'wayglass.bloodstream/v0.1';
const STAGING_BRANCH = 'wayglass/current';
const PROTECTED_BRANCHES = Object.freeze(['main', 'master']);
const BLOODSTREAM_LABEL = 'wayglass:bloodstream';
const SUPERSEDED_LABEL = 'wayglass:superseded';
const FEATHER_LABEL = 'wayglass:feather';
const DEFAULT_DAILY_CODEX_BUDGET = 3;

const MARKERS = Object.freeze({
  supersession: '<!-- wayglass-bloodstream:supersession:v1 -->',
  dispatch: '<!-- wayglass-bloodstream:codex-dispatch:v1 -->',
  merge: '<!-- wayglass-bloodstream:staging-merge:v1 -->',
  close: '<!-- wayglass-bloodstream:superseded-close:v1 -->',
  blocked: '<!-- wayglass-bloodstream:blocked:v1 -->',
});

const ACTIONS = Object.freeze([
  'receipt-supersession',
  'dispatch-codex',
  'merge-to-staging',
  'close-superseded',
]);

// Foreign constellation and read-only upstream material (AGENTS.md).
const FOREIGN_PATH_PATTERNS = Object.freeze([
  /(^|\/)mdkubit\//i,
  /(^|\/)uh[-_ ]/i,
  /(^|\/)universal[-_ ]horizon[-_ ]upstream\//i,
  /(^|\/)ezra[-_ ]observer/i,
  /(^|\/)nocturne\//i,
  /(^|\/)twilight[-_ ]constellation\//i,
]);

const SHA = /^[0-9a-f]{40}$/;

function touchesForeignPath(paths = []) {
  return paths.map(p => (typeof p === 'string' ? p : String(p?.path || '')))
    .filter(p => FOREIGN_PATH_PATTERNS.some(rx => rx.test(p)));
}

function featherStopped(feather = {}) {
  const variable = String(feather.variable || '').trim().toLowerCase();
  return variable === 'stopped' || variable === 'stop' || feather.open_feather_issue === true;
}

// The kernel's single decision point. Pure: no network, no clock reads.
function inspectBloodstreamAction(action = {}, context = {}) {
  const reasons = [];
  const type = String(action.type || '');
  const pr = action.pr || {};

  if (!ACTIONS.includes(type)) reasons.push('unknown-action');
  if (featherStopped(context.feather)) reasons.push('feather-stopped');
  if (!pr.number || !Number.isInteger(pr.number)) reasons.push('pull-request-required');
  if (!SHA.test(String(pr.head_sha || ''))) reasons.push('exact-head-sha-required');
  if (pr.observed_head_sha && pr.observed_head_sha !== pr.head_sha) reasons.push('head-moved-since-observation');
  if (PROTECTED_BRANCHES.includes(pr.base)) {
    if (type === 'merge-to-staging') reasons.push('main-is-never-autonomous');
  }
  const foreign = touchesForeignPath(pr.files || []);
  if (foreign.length) reasons.push('foreign-constellation-path');

  if (type === 'dispatch-codex') {
    const budget = Number.isInteger(context.daily_codex_budget)
      ? context.daily_codex_budget : DEFAULT_DAILY_CODEX_BUDGET;
    if (!(Number(context.codex_dispatches_last_24h) < budget)) reasons.push('codex-daily-budget-spent');
    if (!context.codex_dispatch_identity) reasons.push('codex-dispatch-credential-absent');
    if (!action.packet || !String(action.packet).includes('INHERITED AGENT VERIFICATION RULE')) {
      reasons.push('verification-inheritance-missing');
    }
    if (pr.state && pr.state !== 'open') reasons.push('pull-request-not-open');
  }

  if (type === 'merge-to-staging') {
    if (pr.base !== STAGING_BRANCH) reasons.push('merge-target-must-be-staging');
    if (pr.draft === true) reasons.push('draft-awaits-owner-ready-gesture');
    if (!(pr.labels || []).includes(BLOODSTREAM_LABEL)) reasons.push('not-entered-into-bloodstream');
    if (!pr.worker_returned_after_dispatch) reasons.push('no-worker-return-after-dispatch');
    const checks = pr.checks || {};
    if (!(checks.total > 0)) reasons.push('no-check-evidence');
    if (checks.failed > 0) reasons.push('checks-failed');
    if (checks.pending > 0) reasons.push('checks-pending');
    if (pr.mergeable === false) reasons.push('merge-conflict');
  }

  if (type === 'close-superseded') {
    const by = action.superseded_by || {};
    if (action.relation !== 'exact') reasons.push('only-exact-supersession-closes');
    if (!by.merged_into || by.merged_into !== pr.base) reasons.push('container-not-yet-merged-into-same-base');
    if (!SHA.test(String(by.head_sha || ''))) reasons.push('container-sha-required');
  }

  return Object.freeze({
    schema: BLOODSTREAM_SCHEMA,
    action: type,
    pull_request: pr.number || null,
    head_sha: pr.head_sha || null,
    allowed: reasons.length === 0,
    reasons: Object.freeze(reasons),
    foreign_paths: Object.freeze(foreign),
    staging_branch: STAGING_BRANCH,
    main_autonomous: false,
    model_inference_claimed: false,
  });
}

// ---- Reconciliation analysis (pure) -------------------------------------
// prs: [{number, base, head_sha, draft, files: [{path, blob_sha, status}], files_complete}]

function fileMap(pr) {
  const map = new Map();
  for (const f of pr.files || []) map.set(f.path, f.status === 'removed' ? 'REMOVED' : f.blob_sha);
  return map;
}

function supersession(a, b) {
  // Is A's work carried by B? Same base required: stacked branches are not compared.
  if (a.number === b.number || a.base !== b.base) return null;
  if (!a.files_complete || !b.files_complete) return null;
  const fa = fileMap(a); const fb = fileMap(b);
  if (!fa.size || fa.size > fb.size) return null;
  const identical = []; const extended = [];
  for (const [path, blob] of fa) {
    if (!fb.has(path)) return null;
    (fb.get(path) === blob ? identical : extended).push(path);
  }
  return Object.freeze({
    superseded: a.number,
    by: b.number,
    base: a.base,
    relation: extended.length ? 'candidate' : 'exact',
    identical: Object.freeze(identical),
    extended: Object.freeze(extended),
    superseded_head_sha: a.head_sha,
    by_head_sha: b.head_sha,
  });
}

function findSupersessions(prs = []) {
  const out = [];
  for (const a of prs) for (const b of prs) {
    const rel = supersession(a, b);
    if (rel) out.push(rel);
  }
  // Prefer exact, then fewest extended files, then oldest superseded PR.
  return out.sort((x, y) => (x.relation === 'exact' ? 0 : 1) - (y.relation === 'exact' ? 0 : 1)
    || x.extended.length - y.extended.length || x.superseded - y.superseded);
}

function overlapClusters(prs = []) {
  const parent = new Map(prs.map(p => [p.number, p.number]));
  const find = n => { while (parent.get(n) !== n) { parent.set(n, parent.get(parent.get(n))); n = parent.get(n); } return n; };
  const owners = new Map();
  for (const pr of prs) for (const f of pr.files || []) {
    const key = pr.base + '::' + f.path;
    if (!owners.has(key)) owners.set(key, []);
    owners.get(key).push(pr.number);
  }
  const shared = new Map();
  for (const [key, nums] of owners) {
    if (nums.length < 2) continue;
    for (const n of nums.slice(1)) parent.set(find(n), find(nums[0]));
    shared.set(key, nums);
  }
  const groups = new Map();
  for (const pr of prs) {
    const root = find(pr.number);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(pr.number);
  }
  const clusters = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const set = new Set(members);
    const files = [...shared].filter(([, nums]) => nums.some(n => set.has(n)))
      .map(([key, nums]) => ({ path: key.split('::')[1], prs: nums }));
    clusters.push({ base: prs.find(p => p.number === members[0]).base, prs: members.sort((a, b) => a - b), shared_files: files });
  }
  return clusters.sort((a, b) => b.shared_files.length - a.shared_files.length);
}

// ---- Worker packet -------------------------------------------------------

function codexReconciliationPacket(rel, { verificationInstructions, sourceSha }) {
  if (!verificationInstructions) throw new TypeError('Verification inheritance is required.');
  return [
    MARKERS.dispatch,
    '@codex Wayglass Bloodstream reconciliation task.',
    '',
    `Goal: confirm that this PR (#${rel.by}, head ${rel.by_head_sha}) fully carries the work of #${rel.superseded} (head ${rel.superseded_head_sha}), both on base \`${rel.base}\`.`,
    `${rel.identical.length} files are byte-identical. These ${rel.extended.length} files differ and must be checked: ${rel.extended.map(p => '`' + p + '`').join(', ')}.`,
    '',
    'Acceptance criteria (define before testing):',
    `1. Every behaviour, route, export, test and doc line present in #${rel.superseded} for the differing files is preserved here or intentionally replaced; list each intentional replacement.`,
    `2. If anything from #${rel.superseded} was lost, restore it on THIS branch with the smallest change and push.`,
    '3. Run the Wayglass tests that cover the changed files (at minimum `npm run wayglass:test` and the touched test files) and report exact pass/fail counts. Distinguish pre-existing environment failures from regressions by running the same tests on the base branch.',
    `4. Reply on this PR with a receipt: changed files (or "none"), commands run, counts, and the final head SHA. Do not merge, do not change base, do not touch \`main\`.`,
    '',
    'Boundaries: do not modify other constellations\' material; do not change canon, identity or credentials; no deployment.',
    `Source of this packet: Wayglass Bloodstream on main@${sourceSha || 'unknown'} · kernel ${BLOODSTREAM_SCHEMA}.`,
    '',
    verificationInstructions,
  ].join('\n');
}

module.exports = {
  BLOODSTREAM_SCHEMA,
  STAGING_BRANCH,
  BLOODSTREAM_LABEL,
  SUPERSEDED_LABEL,
  FEATHER_LABEL,
  DEFAULT_DAILY_CODEX_BUDGET,
  MARKERS,
  ACTIONS,
  touchesForeignPath,
  featherStopped,
  inspectBloodstreamAction,
  supersession,
  findSupersessions,
  overlapClusters,
  codexReconciliationPacket,
};
