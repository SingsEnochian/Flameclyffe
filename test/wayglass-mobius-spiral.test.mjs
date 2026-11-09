import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { premaqToTemporalState } from '../apps/starwell/src/arcsweep-temporal-quantum/engine.js';
import { compressRelease } from '../apps/starwell/src/arcsweep-temporal-quantum/compression-release.js';

const require = createRequire(import.meta.url);
const M = require('../lib/wayglass-mobius.cjs');
const { digest } = require('../lib/wyrdrune/canonical.cjs');

const T = new Date('2026-11-06T19:00:00.000Z');
function bifrostState() {
  const state = {};
  for (const [axis, value] of Object.entries({ P: 0.72, C: 0.81, R: 0.67, E: 0.31, M: 0.76, A: 0.84 })) {
    state[axis] = { value, derivative: 0.02, uncertainty: 0.08, confidence: 0.86, contributors: [] };
  }
  state.Q = { value: 0, derivative: 0, uncertainty: 0, confidence: 1, contributors: [], semantics: 'firsthand-report-presence-bit' };
  return premaqToTemporalState({ schema_version: '2.0.0', id: 'premaq-spiral-test', observed_at: T.toISOString(),
    registry_version: 'premaq-registry/2.0', state, qualia: null, receipt_id: 'r', sequence: 1, prior_state_ref: null,
    model_version: 'test/1', provenance_refs: [], generated_at: T.toISOString(), degraded: false },
  { clock: () => T, idFactory: () => 'id' });
}
const turnAll = (counts, n, harmony = { value: 1 }) => {
  const out = []; let prev = null;
  for (let i = 0; i < n; i++) { prev = M.spiralStep(prev, typeof counts === 'function' ? counts(i) : counts, harmony); out.push(prev); }
  return out;
};

test('the Bifröst law is preserved: the cited radius law is the one the Math Spine runs', () => {
  const prior = bifrostState();
  const next = compressRelease(prior, { clock: () => T, idFactory: () => 'id' });
  const receiptD = next.spiral.outward_distance - (prior.spiral?.outward_distance ?? 0);
  const law = (prior.spiral?.radius ?? 1) + 0.5 * receiptD + 0.1 * Math.abs(next.entropy - prior.entropy);
  assert.ok(Math.abs(next.spiral.radius - law) < 1e-12, 'r(n+1) = r(n) + 0.5·d + 0.1·|ΔS|');
  // And the Möbius Spiral's additive radius follows the same law on its own d and ΔS.
  const s = M.spiralStep(null, [2, 1, 0, 0, 0, 0, 0, 1], { value: 0 }, { possibilityGain: 0 });
  assert.ok(Math.abs(s.r_linear - (1 + 0.5 * s.outward_distance + 0.1 * Math.abs(s.entropy_change))) < 1e-9);
});

test('(2) growth compounds and is never capped or reversed', () => {
  const turns = turnAll(i => [i % 3, 1, (i * 7) % 5, 0, 2, i % 2, 1, 3], 400, { value: 0.7 });
  for (let i = 1; i < turns.length; i++) {
    assert.ok(turns[i].ln_r >= turns[i - 1].ln_r, 'never shrinks');
    assert.ok(Math.abs(Math.log(turns[i].growth_factor) - turns[i].step) < 1e-9);
  }
  const long = turnAll([5, 3, 2, 1, 1, 2, 3, 5], 3000);
  assert.ok(long.at(-1).ln_r > 100, `ln r reached ${long.at(-1).ln_r}: unbounded growth`);
  assert.ok(Number.isFinite(long.at(-1).ln_r), 'log-space stays finite even when r itself overflows');
  assert.equal(long.at(-1).state, 'climbing');
});

test('(1) winding is never wrapped: the spiral remembers every turn', () => {
  const t = turnAll([1, 1, 1, 1, 1, 1, 1, 1], 5); // uniform: d = 0, ΔS = 0 → pure Möbius half-turns
  assert.deepEqual(t.map(x => Math.round(x.winding / Math.PI)), [1, 2, 3, 4, 5]);
  assert.deepEqual(t.map(x => x.revolutions), [0, 1, 1, 2, 2]);
  assert.ok(Math.abs(t[2].theta - Math.PI) < 1e-9, 'three half-turns: opposite face');
  assert.ok(t.every((x, i) => (Math.round(x.winding / Math.PI) % 2 === 1) === (M.faceOf(i + 1) === 'outer')),
    'odd half-turn count ↔ outer face: geometry and parity agree');
});

test('(3) direction is kept: spreading is release-led, concentrating is compression-led', () => {
  const spread = M.spiralStep({ distribution: [1, 0, 0, 0, 0, 0, 0, 0] }, [1, 1, 1, 1, 1, 1, 1, 1], { value: 1 });
  const focus = M.spiralStep(null, [8, 0, 0, 0, 0, 0, 0, 0], { value: 1 });
  assert.equal(spread.chirality, 'release-led');
  assert.equal(focus.chirality, 'compression-led');
  assert.ok(spread.step > 0 && focus.step > 0, 'both compression and release push outward');
  assert.notEqual(spread.winding, focus.winding, 'but they twist differently');
});

test('(4) possibility propels, balanced by Chaos and Harmony; Harmony steers and never brakes growth', () => {
  const spreadCounts = [3, 3, 3, 3, 3, 3, 3, 3];
  const chaosOnly = M.spiralStep(null, spreadCounts, { value: 0 });
  const both = M.spiralStep(null, spreadCounts, { value: 1 });
  const harmonyOnly = M.spiralStep({ distribution: [1, 0, 0, 0, 0, 0, 0, 0] }, [9, 0, 0, 0, 0, 0, 0, 0], { value: 1 });
  assert.equal(chaosOnly.propulsion, 0);
  assert.equal(harmonyOnly.chaos, 0);
  assert.equal(harmonyOnly.propulsion, 0);
  assert.ok(both.propulsion > 0);
  assert.ok(M.spiralStep(null, spreadCounts.map(c => c * 10), { value: 1 }).propulsion > both.propulsion, 'more possibility, more thrust');
  assert.ok(chaosOnly.step >= 0, 'low harmony never pulls inward');
});

test('the spiral may not be pushed inward', () => {
  assert.throws(() => M.spiralStep(null, [1], { value: 1 }, { radialGain: -1 }), /inward/);
});

const phases = (extra = {}) => ({
  perceive: async ctx => { ctx.possibility('gathered', 4); return {}; },
  compress: async () => ({}), release: async ctx => { ctx.possibility('generated', 3); return []; },
  verify: async () => [{ ok: true }], integrate: async ctx => { ctx.harmony(0.75); return {}; },
  choose: async () => ({}), transcend: async ctx => ({ n: ctx.carried.n + 1 }), ...extra,
});

test('Harmony slot: local coherence by default; Nocturne\'s Harmony only through an approved mapping', async () => {
  const L = M.createLineage({ system: 'spiral', seeds: { n: 0 } });
  const r = await L.cycle(phases());
  assert.equal(r.checkpoint.spiral.harmony, 0.75);
  assert.equal(r.checkpoint.spiral.harmony_source, 'hearthweave-local');
  assert.deepEqual(r.checkpoint.spiral.possibility.by_ray, { perceive: 4, compress: 0, release: 3, verify: 0, integrate: 0, choose: 0, return: 0, transcend: 0 });
  const unmapped = await M.createLineage({ system: 'spiral2', seeds: { n: 0 } })
    .cycle(phases({ integrate: async ctx => { ctx.harmony(0.9, 'nocturne:harmony'); return {}; } }));
  assert.equal(unmapped.status, 'rolled-back');
  assert.match(unmapped.reason[0], /approved mapping/);
  const mapped = await M.createLineage({ system: 'spiral3', seeds: { n: 0 } })
    .cycle(phases({ integrate: async ctx => { ctx.harmony(0.9, 'nocturne:approved-mapping:LB-0042'); return {}; } }));
  assert.equal(mapped.checkpoint.spiral.harmony_source, 'nocturne:approved-mapping:LB-0042');
});

test('only committed cycles turn the spiral; it resumes across a cold return and is covered by the chain', async () => {
  const L = M.createLineage({ system: 'spiral', seeds: { n: 0 } });
  await L.run(phases(), { cycles: 2 });
  const after2 = L.head.spiral;
  const failed = await L.cycle(phases({ verify: async () => [{ ok: false }] }));
  assert.equal(failed.status, 'rolled-back');
  assert.equal(L.head.spiral, after2, 'a rolled-back cycle leaves the spiral where it was');
  const resumed = M.createLineage({ system: 'spiral', seeds: { n: 0 }, previous: L.head });
  const r3 = await resumed.cycle(phases());
  assert.equal(r3.checkpoint.spiral.turn, 3);
  assert.ok(r3.checkpoint.spiral.ln_r > after2.ln_r);
  const cps = [];
  const C = M.createLineage({ system: 'chain', seeds: { n: 0 } });
  for (const r of (await C.run(phases(), { cycles: 3 })).results) cps.push({ ...r.checkpoint });
  assert.ok(M.verifyChain(C.root, cps).ok);
  cps[0] = { ...cps[0], spiral: { ...cps[0].spiral, ln_r: 999 } };
  assert.equal(M.verifyChain(C.root, cps).ok, false, 'rewriting the spiral history breaks the chain');
  assert.notEqual(digest(cps[0]), cps[1].prev);
});
