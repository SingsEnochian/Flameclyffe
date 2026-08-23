import assert from 'node:assert/strict';
import test from 'node:test';
import { createStateSnapshot } from '../src/bifrost-crossing-envelope.js';
import { createControlTrajectory } from '../src/bifrost-replay.js';
import { calculateSpiralHolonomy, comparePathOrder } from '../src/spiral-holonomy.js';

function snap(id, p, confidence = .8) {
  return createStateSnapshot({
    worldIdentity: 'Earth Prime', frameworkLabel: 'Terra Prime', worldRevision: 1,
    stateId: id, stateHash: `sha256:${id}`, effectiveAt: '2026-08-23T05:00:00Z',
    state: {
      premaqc: { schema: 'premaqc/v1', P: p, C: .8, R: .8, E: .2, M: .8, A: .8, Q: .8 },
      spiral: { schema: 'spiral-state/v1', phase: 'release', direction: 'ascending', confidence },
    },
  });
}

const outbound = {
  schema: 'arcsweep.bifrost-crossing-envelope/v1',
  source: snap('departure', .70, .80),
  destination: { world_identity: 'terra-aeterna' },
  translation: {
    candidate_invariants: ['identity_lineage', 'provenance', 'agency', 'declared_intention'],
    untranslatable: ['world-local-tone'],
  },
  lineage: { receipt_id: 'crossing:outbound' },
};

const returned = snap('returned', .82, .90);
const control = snap('control', .74, .83);
const returnEnvelope = {
  schema: 'arcsweep.bifrost-crossing-envelope/v1',
  destination: returned,
  translation: {
    candidate_invariants: ['identity_lineage', 'provenance', 'agency', 'declared_intention'],
    untranslatable: [],
  },
  lineage: { receipt_id: 'crossing:return' },
};

const trajectory = createControlTrajectory({ outboundEnvelope: outbound, returnEnvelope, baselinePrimeSnapshot: control });

test('Spiral Holonomy separates journey delta from ordinary Prime control evolution', () => {
  const h = calculateSpiralHolonomy({ controlTrajectory: trajectory, outboundEnvelope: outbound, returnEnvelope });
  assert.equal(h.journey_delta.premaqc.P, .12);
  assert.equal(h.control_delta.premaqc.P, .04);
  assert.ok(Math.abs(h.residual_after_control.premaqc.P - .08) < 1e-12);
  assert.ok(Math.abs(h.residual_after_control.spiral_confidence - .07) < 1e-12);
});

test('Spiral Holonomy remains multidimensional and does not collapse to a scalar', () => {
  const h = calculateSpiralHolonomy({
    controlTrajectory: trajectory,
    outboundEnvelope: outbound,
    returnEnvelope,
    projectionComparisons: {
      glyph: { structural_delta: .31 },
      runa: { harmonic_delta: .22 },
    },
    relationalDelta: { edge_distortion: .17 },
    canonDelta: { changed: false },
    environmentDelta: { changed: true },
    storyworkDelta: { character_state_shift: .29 },
  });
  assert.equal(h.scalar_summary, null);
  assert.equal(h.journey_delta.glyph.structural_delta, .31);
  assert.equal(h.journey_delta.runa.harmonic_delta, .22);
  assert.equal(h.invariants.survival_ratio, 1);
  assert.deepEqual(h.untranslated.outbound, ['world-local-tone']);
});

test('lost invariants and untranslated residue stay explicit in the holonomy result', () => {
  const alteredReturn = {
    ...returnEnvelope,
    translation: { candidate_invariants: ['identity_lineage', 'provenance', 'agency'], untranslatable: ['return-local-residue'] },
  };
  const alteredTrajectory = createControlTrajectory({ outboundEnvelope: outbound, returnEnvelope: alteredReturn, baselinePrimeSnapshot: control });
  const h = calculateSpiralHolonomy({ controlTrajectory: alteredTrajectory, outboundEnvelope: outbound, returnEnvelope: alteredReturn });
  assert.deepEqual(h.invariants.lost, ['declared_intention']);
  assert.equal(h.invariants.survival_ratio, .75);
  assert.deepEqual(h.untranslated.return, ['return-local-residue']);
});

test('path-order comparison preserves order as an observable instead of assuming commutativity', () => {
  const first = calculateSpiralHolonomy({ controlTrajectory: trajectory, outboundEnvelope: outbound, returnEnvelope });
  const second = { ...first, path: Object.freeze(['earth_prime', 'luna', 'terra-aeterna', 'earth_prime']) };
  const comparison = comparePathOrder(first, second);
  assert.equal(comparison.same_path, false);
  assert.deepEqual(comparison.first_path, ['earth_prime', 'terra-aeterna', 'earth_prime']);
  assert.deepEqual(comparison.second_path, ['earth_prime', 'luna', 'terra-aeterna', 'earth_prime']);
});
