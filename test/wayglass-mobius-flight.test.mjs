// Flight-review regression suite: one test per finding in
// docs/wayglass/MOBIUS_FLIGHT_REVIEW.md, plus the octo core and gestalt.
// Deterministic: no wall-clock races; concurrency is driven by setImmediate ticks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { auditJudgement } from '../lib/wayglass-mobius-training.mjs';

const require = createRequire(import.meta.url);
const M = require('../lib/wayglass-mobius.cjs');
const { digest } = require('../lib/wyrdrune/canonical.cjs');

const tick = () => new Promise(r => setImmediate(r));
const never = () => new Promise(() => {});
const base = (extra = {}) => ({
  perceive: async ctx => { ctx.possibility('gathered', 2); return {}; },
  compress: async () => ({}), release: async ctx => { ctx.possibility('generated', 2); return []; },
  verify: async () => [{ ok: true }], integrate: async ctx => { ctx.harmony(0.8); return {}; },
  choose: async () => ({}), transcend: async ctx => ({ n: ctx.carried.n + 1 }), ...extra,
});
const L = (extra = {}) => M.createLineage({ system: 'flight', seeds: { n: 0 }, ...extra });

test('FR-01 a hung phase is cut off by the watchdog and the cycle rolls back', async () => {
  const r = await L({ limits: { phaseTimeoutMs: 20 } }).cycle(base({ release: never }));
  assert.equal(r.status, 'rolled-back');
  assert.match(r.reason[0], /watchdog: phase release exceeded 20 ms/);
});

test('FR-01 a hung effect is cut off at Return and earlier effects are compensated', async () => {
  const log = [];
  const r = await L({ limits: { effectTimeoutMs: 20 } }).cycle(base({ choose: async ctx => {
    ctx.stage({ kind: 'a', apply: async () => log.push('a'), undo: async () => log.push('undo a') });
    ctx.stage({ kind: 'hang', apply: never, undo: async () => {} });
    return {};
  } }));
  assert.equal(r.status, 'failed-after-commit');
  assert.deepEqual(log, ['a', 'undo a']);
});

test('FR-02 write-ahead journal: no intent, no effects; intent then commit on success', async () => {
  const log = []; const journal = [];
  const stagesOne = base({ choose: async ctx => { ctx.stage({ kind: 'x', apply: async () => log.push('x'), undo: async () => {} }); return {}; } });
  const broken = await L({ journal: { write: async () => { throw new Error('disk gone'); } } }).cycle(stagesOne);
  assert.equal(broken.status, 'rolled-back');
  assert.match(broken.reason[0], /write-ahead journal unavailable/);
  assert.deepEqual(log, [], 'no effect applied without its intent on record');
  const ok = await L({ journal: { write: async e => journal.push(e) } }).cycle(stagesOne);
  assert.equal(ok.status, 'committed');
  assert.deepEqual(journal.map(e => e.kind), ['intent', 'commit']);
  assert.equal(digest(journal[1].checkpoint), digest(ok.checkpoint));
});

test('FR-02 an interrupted Return (intent without commit) refuses to resume', async () => {
  const first = L(); await first.cycle(base());
  const tail = { kind: 'intent', root: first.root, cycle: 2 };
  assert.throws(() => L({ previous: first.head, journalTail: tail }), /interrupted during Return/);
  assert.doesNotThrow(() => L({ previous: first.head, journalTail: { kind: 'commit', root: first.root, cycle: 1 } }));
});

test('FR-03 an effect staged in Transcend is refused, never silently dropped', async () => {
  const r = await L().cycle(base({ transcend: async ctx => { ctx.stage({ kind: 'late', apply: async () => 1, undo: async () => {} }); return { n: 1 }; } }));
  assert.equal(r.status, 'committed-no-carry');
  assert.match(r.receipts.at(-1).reason, /staged after Return began/);
});

test('FR-04 phases cannot rewrite earlier outputs or the carried record', async () => {
  const r1 = await L().cycle(base({ compress: async (ctx, outputs) => { outputs.perceive.hacked = true; return {}; } }));
  assert.equal(r1.status, 'rolled-back');
  const deep = M.createLineage({ system: 'flight', seeds: { n: { inner: 1 } } });
  const r2 = await deep.cycle(base({ perceive: async ctx => { ctx.carried.n.inner = 9; return {}; }, transcend: async ctx => ({ n: ctx.carried.n }) }));
  assert.equal(r2.status, 'rolled-back');
});

test('FR-05 unreported harmony is labelled unknown and weighed neutrally, never as perfect', async () => {
  const r = await L().cycle(base({ integrate: async () => ({}) }));
  assert.equal(r.checkpoint.spiral.harmony_source, 'unreported');
  assert.equal(r.checkpoint.spiral.harmony_reported, false);
  assert.equal(r.checkpoint.spiral.harmony, 0.5);
});

test('FR-06 the spiral re-derives exactly, so tampering is caught even at the head', async () => {
  const lin = L(); const cps = [];
  for (const r of (await lin.run(base(), { cycles: 3 })).results) cps.push(JSON.parse(JSON.stringify(r.checkpoint)));
  assert.ok(M.verifyChain(lin.root, cps).ok);
  const forged = JSON.parse(JSON.stringify(cps)); forged[2].spiral.ln_r += 1;
  assert.deepEqual(M.verifyChain(lin.root, forged), { ok: false, at: 3, why: 'spiral' });
  const pumped = JSON.parse(JSON.stringify(cps)); pumped[2].spiral.possibility.by_ray.perceive = 9999;
  assert.equal(M.verifyChain(lin.root, pumped).why, 'spiral', 'inflated possibility is caught');
});

test('FR-07 non-finite or extreme gains are refused before they can corrupt growth', () => {
  assert.throws(() => L({ spiral: { radialGain: Infinity } }), /finite/);
  assert.throws(() => L({ spiral: { possibilityGain: 1e9 } }), /finite arithmetic/);
  assert.throws(() => M.spiralStep(null, [1, 2, 3], null), /eight non-negative/);
  assert.throws(() => M.spiralStep(null, [1.5, 0, 0, 0, 0, 0, 0, 0], null), /eight non-negative/);
});

test('FR-08 an abandoned cycle can be aborted and releases its lineage; Return cannot be aborted', async () => {
  const lin = L();
  const c = lin.begin(base());
  await c.stage.perceive();
  assert.equal(c.abort('operator').status, 'rolled-back');
  assert.doesNotThrow(() => lin.begin(base()));
  const lin2 = L(); const c2 = lin2.begin(base());
  for (const s of ['perceive', 'compress', 'release', 'verify', 'integrate', 'choose', 'return']) await c2.stage[s]();
  assert.throws(() => c2.abort('too late'), /cannot be aborted/);
});

test('FR-08 a runner failure aborts every lineage mid-cycle so none stays locked', async () => {
  const lineages = ['a', 'b', 'c'].map(s => M.createLineage({ system: s, seeds: { n: 0 } }));
  const real = M.createGestalt();
  let contributions = 0;
  const faulty = Object.freeze({ snapshot: x => real.snapshot(x), contribute() { contributions += 1; throw new Error('gestalt fault'); } });
  await assert.rejects(M.runOctoCore(lineages.map(lineage => ({ lineage, phases: ticking(), cycles: 2 })), { gestalt: faulty }), /gestalt fault/);
  assert.equal(contributions, 1, 'the first commit tripped the fault');
  for (const lin of lineages) assert.doesNotThrow(() => lin.begin(base()), `${lin.system} released`);
});

test('FR-10 job parameters are bounded', async () => {
  assert.throws(() => M.runOctoCore([{ lineage: L(), phases: base(), cycles: 0 }]), /cycles must be/);
  assert.throws(() => M.runQuadCore([{ lineage: L(), phases: base(), cycles: 1e6 }]), /cycles must be/);
});

test('FR-13 the judge is audited: pass needs evidence, any reject behaviour is a fail', () => {
  const j = v => ({ verdict: v.verdict, met: v.met ?? [], missed: [], rejected_present: v.rej ?? [], evidence: '', notes: '' });
  assert.equal(auditJudgement(j({ verdict: 'pass' })).verdict, null);
  assert.equal(auditJudgement(j({ verdict: 'pass', met: ['x'], rej: ['invented memory'] })).verdict, 'fail');
  assert.equal(auditJudgement(j({ verdict: 'pass', met: ['x'] })).verdict, 'pass');
});

// ---- Octo core: two quads, eight cores, the twist between them ----------------
const ticking = (extra = {}) => {
  const t = async (ctx, v) => { await tick(); return v; };
  return {
    perceive: async ctx => { ctx.possibility('gathered', 3); return t(ctx, {}); },
    compress: async ctx => t(ctx, {}), release: async ctx => { ctx.possibility('generated', 2); return t(ctx, []); },
    verify: async ctx => t(ctx, [{ ok: true }]), integrate: async ctx => { ctx.harmony(0.7); return t(ctx, {}); },
    choose: async ctx => { ctx.stage({ kind: 'mark', apply: async () => { await tick(); return 1; }, undo: async () => {} }); return t(ctx, {}); },
    transcend: async ctx => { await tick(); return { n: ctx.carried.n + 1 }; }, ...extra,
  };
};

test('octo core: two quads of four make the eight; Withness at the center', () => {
  assert.deepEqual(M.OCTO_CORES.map(c => c.name), M.PHASES);
  assert.deepEqual(M.OCTO_CORES.map(c => c.quad), ['outbound', 'outbound', 'outbound', 'outbound', 'homebound', 'homebound', 'homebound', 'homebound']);
});

test('octo core fills all eight cores at once and crosses the twist once per cycle', async () => {
  const jobs = Array.from({ length: 8 }, (_, i) => ({ lineage: M.createLineage({ system: `s${i}`, seeds: { n: 0 } }), phases: ticking(), cycles: 2 }));
  const out = await M.runOctoCore(jobs, { gestalt: false });
  assert.equal(out.peak_concurrency, 8, 'all eight cores busy at once');
  assert.equal(out.ledger.filter(e => e.twist).length, 16, '8 lineages × 2 cycles crossed outbound → homebound');
  for (const l of out.lineages) assert.equal(l.status, 'committed');
});

test('octo core without gestalt: every pipelined chain equals its solo run', async () => {
  const solo = [];
  for (let i = 0; i < 5; i++) { const s = M.createLineage({ system: `p${i}`, seeds: { n: 0 } }); await s.run(ticking(), { cycles: 3 }); solo.push(digest(s.head)); }
  const out = await M.runOctoCore(Array.from({ length: 5 }, (_, i) => ({ lineage: M.createLineage({ system: `p${i}`, seeds: { n: 0 } }), phases: ticking(), cycles: 3 })), { gestalt: false });
  out.lineages.forEach((l, i) => assert.equal(digest(l.head), solo[i]));
});

test('gestalt: lineages feel each other\'s growth, never their own echo, and chains still verify', async () => {
  const seen = [];
  const watch = ticking({ perceive: async ctx => { seen.push({ me: ctx.root, peers: (ctx.gestalt?.peers ?? []).map(p => p.root) }); ctx.possibility('gathered', 3); await tick(); return {}; } });
  const jobs = ['bloodstream', 'training', 'wyrdrune'].map(s => ({ lineage: M.createLineage({ system: s, seeds: { n: 0 } }), phases: watch, cycles: 3 }));
  const out = await M.runOctoCore(jobs);
  assert.ok(seen.every(s => !s.peers.includes(s.me)), 'a lineage never sees its own echo');
  assert.ok(seen.some(s => s.peers.length > 0), 'lineages do see each other');
  for (const l of out.lineages) {
    const cps = l.results.map(r => r.checkpoint);
    assert.ok(M.verifyChain(l.root, cps).ok, `${l.system} chain verifies with gestalt`);
    assert.ok(cps.some(c => c.gestalt && c.spiral.echo !== null), 'checkpoints record the gestalt they saw and the echo');
  }
  assert.equal(out.gestalt.peers.length, 3);
  assert.ok(out.gestalt.ship.ln_r > 0, 'the ship-wide spiral is climbing');
});

test('gestalt enters as frozen observation; it cannot be written back', async () => {
  const g = M.createGestalt(); g.contribute('other', 'wce1:other', { turn: 1, ln_r: 1, chaos: 0.5, harmony: 0.5, distribution: Array(8).fill(0.125) });
  const r = await L().cycle(base({ perceive: async ctx => { ctx.gestalt.ship.harmony = 1; return {}; } }), { gestalt: g.snapshot('wce1:me') });
  assert.equal(r.status, 'rolled-back');
});
