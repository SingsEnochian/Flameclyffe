import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuantumQuad } from '../src/quantum-quad.js';
import { runWayglassBifrost } from '../src/bifrost-quad-adapter.js';

// Synthetic, explicitly non-firsthand fixture. Q is context-only, never evolved.
const component = (value, derivative = 0) => ({
  value, derivative, uncertainty: 0.05, confidence: 0.9, contributors: []
});
function fixture(provenance_refs = ['fixture:synthetic']) {
  return {
    schema_version: '2.0.0', id: 'fixture:premaqc-1',
    observed_at: '2026-11-05T15:00:00.000Z',
    registry_version: 'premaqc-registry/2.0',
    receipt_id: 'fixture:receipt-1', sequence: 1,
    prior_state_ref: null, model_version: 'synthetic-test/1',
    provenance_refs,
    qualia: {
      schema: 'premaqc.qualia-report/v1', present: false,
      authority: 'firsthand-only', inferred: false, report: null,
      report_receipt_id: null, observed_at: null,
    },
    state: {
      P: component(0.78, .02), C: component(.82, .01),
      R: component(.88, .03), E: component(.31, .01),
      M: component(.71, .02), A: component(.79, .01),
      Q: { value: 0, derivative: 0, uncertainty: 0,
        confidence: 1, contributors: [], semantics: 'firsthand-report-presence-bit' },
    },
  };
}
const jacobian = Array.from({length: 7}, (_, row) =>
  Array.from({length: 7}, (_, col) => row === col ? (row === 5 ? 1e-10 : 1) : 0));
const worldProfile = {
  worldId: 'wayglass-test-world', focusAxis: 'R',
  enterThreshold: .82, releaseThreshold: .68, compressionGain: 1,
  releaseFraction: .35, derivativeRelease: .08, memoryRelease: .04,
  phaseReleaseGain: Math.PI / 4, radialGain: .5,
  entropyGain: .1, angularGain: Math.PI / 3,
  temporalWeights: { fold: .55, derivative: .2, entropy: .15, phase: .1 },
  tone: { worldId: 'wayglass-test-world', toneLayerId: 'fixture-tone',
    rootHz: 220, excursion: 5, approvalState: 'pending',
    approvalReceiptId: null },
};

test('canonical PREMAQC Math Spine v1.8 executes with deterministic replay and no inferred Qualia', async () => {
  const result = await runWayglassBifrost({
    premaqcPacket: fixture(), jacobian, worldProfile,
    worldId: 'wayglass-test-world',
  });
  assert.equal(result.status, 'executed');
  assert.equal(result.vocabulary, 'PREMAQC');
  assert.equal(result.spine_version, 'hearthgate-braided-spine/1.8');
  assert.equal(result.replay_verified, true);
  assert.equal(result.qualia_evolved, false);
  assert.match(result.packet_fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(result.output.released_state.probabilities, 'Q'), false);
});
test('Quad invokes cognition after real verified Math Spine output', async () => {
  let seen;
  const quad = createQuantumQuad({
    cognition: async ({ transformation }) => {
      seen = transformation;
      return { status: 'answered', output: 'Observed and ready for return.' };
    },
  });
  const result = await quad.cycle({
    input: 'Continue voyage', participantId: 'wayglass:test-participant',
    worldId: 'wayglass-test-world', premaqcPacket: fixture(),
    jacobian, worldProfile
  });
  assert.equal(result.status, 'completed');
  assert.equal(seen.replay_verified, true);
  assert.deepEqual(result.receipts.map(r => r.organ),
    ['observer','bifrost','cognition','continuity']);
  assert.equal(result.persistence, 'ephemeral');
});
test('revoked PREMAQC evidence blocks before cognition is invoked', async () => {
  let calls = 0;
  const quad = createQuantumQuad({
    cognition: async () => { calls++; return { status: 'answered' }; }
  });
  const result = await quad.cycle({
    input: 'Use revoked input', participantId: 'wayglass:test-participant',
    worldId: 'wayglass-test-world',
    premaqcPacket: fixture(['fixture:revoked']),
    revokedRefs: ['fixture:revoked'], jacobian, worldProfile
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.receipts[1].status, 'blocked');
  assert.equal(calls, 0);
  assert.equal(result.persistence, 'not-attempted');
});
