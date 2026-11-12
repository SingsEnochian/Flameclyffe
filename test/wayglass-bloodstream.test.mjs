import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { agentVerificationInstructions } from '../apps/arcsweep/src/swarm/agent-verification-inheritance.js';

const require = createRequire(import.meta.url);
const B = require('../lib/wayglass-bloodstream.cjs');
const { inspectCirculationAction, KERNEL_SCHEMA } = require('../lib/wayglass-kernel.cjs');

const sha = c => c.repeat(40);
const pr = (number, files, extra = {}) => ({
  number, base: 'wayglass/current', head_sha: sha(String(number % 10)), draft: false, state: 'open',
  labels: [], files_complete: true,
  files: files.map(([path, blob]) => ({ path, blob_sha: blob, status: 'modified' })), ...extra,
});
const flowing = { feather: {}, daily_codex_budget: 3, codex_dispatches_last_24h: 0, codex_dispatch_identity: true };

test('detects exact and candidate supersession like #527/#547 and #539/#547', () => {
  const small = pr(527, [['a.js', 'x1'], ['b.js', 'x2']]);
  const partial = pr(539, [['a.js', 'x1'], ['c.js', 'old']]);
  const big = pr(547, [['a.js', 'x1'], ['b.js', 'x2'], ['c.js', 'new'], ['d.js', 'x4']]);
  const rels = B.findSupersessions([small, partial, big]);
  assert.deepEqual(rels.map(r => [r.superseded, r.by, r.relation]), [[527, 547, 'exact'], [539, 547, 'candidate']]);
  assert.deepEqual(rels[1].extended, ['c.js']);
});

test('never compares across bases or incomplete listings', () => {
  const a = pr(1, [['a.js', 'x']]);
  assert.equal(B.supersession(a, pr(2, [['a.js', 'x']], { base: 'main' })), null);
  assert.equal(B.supersession(a, pr(3, [['a.js', 'x']], { files_complete: false })), null);
});

test('overlap clusters group PRs sharing files on the same base', () => {
  const c = B.overlapClusters([pr(1, [['m.js', 'a']]), pr(2, [['m.js', 'b']]), pr(3, [['z.js', 'c']])]);
  assert.equal(c.length, 1);
  assert.deepEqual(c[0].prs, [1, 2]);
});

test('kernel owns the decision and never merges main', () => {
  const d = inspectCirculationAction({ type: 'merge-to-staging', pr: pr(9, [], { base: 'main' }) }, flowing);
  assert.equal(d.kernel, KERNEL_SCHEMA);
  assert.equal(d.allowed, false);
  assert.ok(d.reasons.includes('main-is-never-autonomous'));
  assert.equal(d.main_autonomous, false);
});

test('staging merge requires label, worker return, green checks, non-draft and an unmoved head', () => {
  const ready = pr(5, [], { labels: [B.BLOODSTREAM_LABEL], worker_returned_after_dispatch: true,
    checks: { total: 4, failed: 0, pending: 0 }, mergeable: true });
  assert.equal(inspectCirculationAction({ type: 'merge-to-staging', pr: ready }, flowing).allowed, true);
  const cases = {
    'draft-awaits-owner-ready-gesture': { draft: true },
    'not-entered-into-bloodstream': { labels: [] },
    'no-worker-return-after-dispatch': { worker_returned_after_dispatch: false },
    'no-check-evidence': { checks: { total: 0, failed: 0, pending: 0 } },
    'checks-failed': { checks: { total: 3, failed: 1, pending: 0 } },
    'checks-pending': { checks: { total: 3, failed: 0, pending: 1 } },
    'head-moved-since-observation': { observed_head_sha: sha('f') },
    'merge-conflict': { mergeable: false },
  };
  for (const [reason, patch] of Object.entries(cases)) {
    const d = inspectCirculationAction({ type: 'merge-to-staging', pr: { ...ready, ...patch } }, flowing);
    assert.ok(d.reasons.includes(reason), reason);
  }
});

test('Feather stops every action, by variable or by labelled issue', () => {
  for (const feather of [{ variable: 'stopped' }, { open_feather_issue: true }]) {
    const d = inspectCirculationAction({ type: 'receipt-supersession', pr: pr(4, []) }, { ...flowing, feather });
    assert.ok(d.reasons.includes('feather-stopped'));
  }
});

test('Codex dispatch needs credential, budget and inherited verification rules', () => {
  const rel = B.findSupersessions([pr(1, [['a', 'x'], ['b', 'y']]), pr(2, [['a', 'x'], ['b', 'z']])])[0];
  const packet = B.codexReconciliationPacket(rel, { verificationInstructions: agentVerificationInstructions(), sourceSha: sha('a') });
  assert.match(packet, /^<!-- wayglass-bloodstream:codex-dispatch:v1 -->\n@codex /);
  assert.match(packet, /Do not merge/);
  const target = pr(2, []);
  assert.equal(inspectCirculationAction({ type: 'dispatch-codex', pr: target, packet }, flowing).allowed, true);
  assert.ok(inspectCirculationAction({ type: 'dispatch-codex', pr: target, packet }, { ...flowing, codex_dispatch_identity: false }).reasons.includes('codex-dispatch-credential-absent'));
  assert.ok(inspectCirculationAction({ type: 'dispatch-codex', pr: target, packet }, { ...flowing, codex_dispatches_last_24h: 3 }).reasons.includes('codex-daily-budget-spent'));
  assert.ok(inspectCirculationAction({ type: 'dispatch-codex', pr: target, packet: '@codex do it' }, flowing).reasons.includes('verification-inheritance-missing'));
  assert.throws(() => B.codexReconciliationPacket(rel, {}));
});

test('only exact supersession closes, and only after the container lands on the same base', () => {
  const target = pr(527, []);
  const by = { number: 547, head_sha: sha('7'), merged_into: 'wayglass/current' };
  assert.equal(inspectCirculationAction({ type: 'close-superseded', relation: 'exact', pr: target, superseded_by: by }, flowing).allowed, true);
  assert.ok(inspectCirculationAction({ type: 'close-superseded', relation: 'candidate', pr: target, superseded_by: by }, flowing).reasons.includes('only-exact-supersession-closes'));
  assert.ok(inspectCirculationAction({ type: 'close-superseded', relation: 'exact', pr: target, superseded_by: { ...by, merged_into: null } }, flowing).reasons.includes('container-not-yet-merged-into-same-base'));
});

test('foreign constellation paths are held', () => {
  const d = inspectCirculationAction({ type: 'receipt-supersession', pr: pr(8, [['mdkubit/ideas/x.md', 'a']]) }, flowing);
  assert.ok(d.reasons.includes('foreign-constellation-path'));
});
