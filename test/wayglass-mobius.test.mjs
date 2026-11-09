import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const M = require('../lib/wayglass-mobius.cjs');
const K = require('../lib/wayglass-kernel.cjs');
const { digest } = require('../lib/wyrdrune/canonical.cjs');

// FR-09: deterministic scheduling — `delay` counts event-loop turns, never wall-clock milliseconds.
const sleep = turns => new Promise(r => { let n = turns; const step = () => (--n > 0 ? setImmediate(step) : r()); setImmediate(step); });
// A small doubling system: emits its value as a staged effect, carries value * 2.
function doubling({ log = [], verifyOk = v => v > 0, delay = 0, transcend } = {}) {
  const wait = () => (delay ? sleep(delay) : null);
  return {
    perceive: async ctx => { await wait(); return { value: ctx.carried.n, origin: ctx.origin }; },
    compress: async (ctx, o) => { await wait(); return { n: o.perceive.value }; },
    release: async (ctx, o) => { await wait(); return [o.compress.n]; },
    verify: async (ctx, o) => { await wait(); return [{ ok: verifyOk(o.compress.n), reason: 'positive' }]; },
    integrate: async (ctx, o) => { await wait(); return { n: o.release[0] }; },
    choose: async (ctx, o) => {
      await wait();
      ctx.stage({ kind: 'emit', describe: { n: o.integrate.n }, apply: async () => { log.push(o.integrate.n); return o.integrate.n; },
        undo: async () => { log.push('undo:' + o.integrate.n); } });
      return { selected: o.integrate.n, dropped: [] };
    },
    transcend: transcend || (async (ctx, o) => ({ n: o.choose.selected * 2 })),
  };
}
const lineage = (extra = {}) => M.createLineage({ system: 'test-system', seeds: { n: 1 }, ...extra });

test('one cycle: eight phases in order at their star angles, checkpoint chained to the root', async () => {
  const log = []; const L = lineage();
  const r = await L.cycle(doubling({ log }));
  assert.equal(r.status, 'committed');
  assert.deepEqual(r.receipts.map(x => x.phase), M.PHASES);
  assert.deepEqual(r.receipts.map(x => x.angle), [0, 45, 90, 135, 180, 225, 270, 315]);
  assert.equal(r.checkpoint.prev, L.root);
  assert.equal(r.checkpoint.center, 'withness');
  assert.deepEqual(log, [1]);
});

test('three cycles alternate faces, carry the twist forward, and form a valid chain', async () => {
  const log = []; const L = lineage(); const cps = [];
  const out = await L.run(doubling({ log }), { cycles: 3 });
  for (const r of out.results) cps.push(r.checkpoint);
  assert.deepEqual(log, [1, 2, 4]);
  assert.deepEqual(cps.map(c => c.face), ['outer', 'inner', 'outer']);
  assert.equal(out.results[1].outputs.perceive.origin, 'carried');
  assert.deepEqual(M.verifyChain(L.root, cps), { ok: true, length: 3, head: digest(cps[2]) });
  const forged = cps.map(c => ({ ...c })); forged[1].carry = { n: 999 };
  assert.equal(M.verifyChain(L.root, forged).ok, false, 'tampering breaks the chain');
  const head = cps.map(c => ({ ...c })); head[2].carry = { n: 999 };
  assert.equal(M.verifyChain(L.root, head).ok, false, 'tampering with the head is caught too');
  assert.throws(() => lineage({ previous: head[2] }), /does not match its digest/);
});

test('a failed Verify rolls the whole cycle back: no effect applied, head unchanged', async () => {
  const log = []; const L = lineage();
  await L.cycle(doubling({ log }));
  const head = L.head;
  const r = await L.cycle(doubling({ log, verifyOk: () => false }));
  assert.equal(r.status, 'rolled-back');
  assert.deepEqual(log, [1]);
  assert.equal(L.head, head);
});

test('unknown is not true: an undecided verdict also rolls back', async () => {
  const r = await lineage().cycle(doubling({ verifyOk: () => null }));
  assert.equal(r.status, 'rolled-back');
  assert.deepEqual(r.reason, ['positive']);
});

test('the carry must keep the seeds\' shape', async () => {
  const L = lineage();
  const r = await L.cycle(doubling({ transcend: async () => ({ other: 1 }) }));
  assert.equal(r.status, 'committed-no-carry');
  assert.deepEqual(L.head.carry, { n: 1 });
});

test('a failing effect at Return compensates applied effects in reverse', async () => {
  const log = []; const phases = doubling({ log });
  const choose = phases.choose;
  phases.choose = async (ctx, o) => {
    const r = await choose(ctx, o);
    ctx.stage({ kind: 'breaks', apply: async () => { throw new Error('host refused'); }, undo: async () => {} });
    return r;
  };
  const r = await lineage().cycle(phases);
  assert.equal(r.status, 'failed-after-commit');
  assert.deepEqual(log, [1, 'undo:1']);
  assert.deepEqual(r.outputs.return.map(e => e.status), ['applied', 'failed', 'compensated']);
});

test('irreversible effects need owner consent at staging', async () => {
  const phases = doubling();
  phases.choose = async ctx => { ctx.stage({ kind: 'merge', apply: async () => 1 }); return {}; };
  const r = await lineage().cycle(phases);
  assert.equal(r.status, 'rolled-back');
  assert.match(r.reason[0], /without owner consent/);
});

test('Feather: before Return nothing commits; after Return the commit stands and Transcend waits', async () => {
  const log = []; let stop = false; const L = lineage({ feather: () => stop });
  const phases = doubling({ log });
  const verify = phases.verify;
  phases.verify = async (ctx, o) => { stop = true; return verify(ctx, o); };
  const r1 = await L.cycle(phases);
  assert.equal(r1.status, 'feather-stopped');
  assert.deepEqual(log, []);
  assert.equal(L.head, null);
  stop = false;
  const p2 = doubling({ log });
  p2.transcend = async () => { throw new Error('must not run'); };
  const choose = p2.choose;
  p2.choose = async (ctx, o) => { const r = await choose(ctx, o); ctx.stage({ kind: 'raise-feather', apply: async () => { stop = true; }, undo: async () => {} }); return r; };
  const r2 = await L.cycle(p2);
  assert.equal(r2.status, 'committed-feather');
  assert.deepEqual(log, [1]);
  assert.deepEqual(L.head.carry, { n: 1 }, 'carry unchanged until Feather is released');
});

test('Möbius fixed point: a constant carry converges at 3; a period-2 orbit at 2', async () => {
  const constant = doubling({ verifyOk: () => true, transcend: async () => ({ n: 5 }) });
  assert.equal((await lineage({ seeds: { n: 0 } }).run(constant, { cycles: 50, until: 'stable' })).results.length, 3);
  const flip = doubling({ verifyOk: () => true, transcend: async (ctx, o) => ({ n: 1 - o.choose.selected }) });
  const out = await lineage({ seeds: { n: 0 } }).run(flip, { cycles: 50, until: 'stable' });
  assert.equal(out.status, 'converged');
  assert.equal(out.results.length, 2);
});

test('cold return and crossings resume the same chain; foreign or misshapen checkpoints are refused', async () => {
  const A = lineage(); await A.run(doubling(), { cycles: 2 });
  const B = lineage({ previous: A.head, worker: 'another-process' });
  const r = await B.cycle(doubling());
  assert.equal(r.checkpoint.cycle, 3);
  assert.equal(r.checkpoint.face, 'outer');
  assert.equal(r.checkpoint.prev, digest(A.head));
  assert.throws(() => M.createLineage({ system: 'other', seeds: { n: 1 }, previous: A.head }), /another lineage/);
  assert.throws(() => lineage({ root: A.root, seeds: { m: 1 }, previous: A.head }), /shape/);
});

test('a lineage never runs two of its own cycles at once', () => {
  const L = lineage(); L.begin(doubling());
  assert.throws(() => L.begin(doubling()), /two cycles at once/);
});

test('quad core: four cores of two phases make the eight, with Withness at the center', () => {
  assert.deepEqual(M.CORES.flatMap(c => c.phases), M.PHASES);
  assert.deepEqual(M.CORES.map(c => c.name), ['intake', 'trial', 'judgment', 'passage']);
});

test('quad core pipelines four lineages at once, and each lineage matches its solo run exactly', async () => {
  const systems = ['observer', 'return-engine', 'writing-room', 'bloodstream'];
  const solo = [];
  for (const s of systems) {
    const L = M.createLineage({ system: s, seeds: { n: 1 } });
    await L.run(doubling({ delay: 2 }), { cycles: 3 });
    solo.push(digest(L.head));
  }
  const jobs = systems.map(s => ({ lineage: M.createLineage({ system: s, seeds: { n: 1 } }),
    phases: doubling({ delay: 5 }), cycles: 3 }));
  const out = await M.runQuadCore(jobs);
  assert.equal(out.peak_concurrency, 4, 'all four cores were busy at once');
  out.lineages.forEach((l, i) => {
    assert.equal(l.status, 'committed');
    assert.equal(digest(l.head), solo[i], `${l.system}: pipelined chain equals solo chain`);
    assert.ok(M.verifyChain(l.root, l.results.map(r => r.checkpoint)).ok);
  });
  assert.equal(out.ledger.filter(e => e.core === 'IV').length, 12, 'Core IV committed every cycle');
});

test('the kernel hands out lineages and the quad core', async () => {
  const L = K.openMobiusLineage({ system: 'kernel-test', seeds: { n: 1 } });
  assert.equal((await L.cycle(doubling())).status, 'committed');
  assert.equal(K.runQuadCore, M.runQuadCore);
  assert.deepEqual(K.MOBIUS_PHASES, M.PHASES);
});
