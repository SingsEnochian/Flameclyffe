import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MATH_SPINE_PACKET_SCHEMA,
  createMathSpinePacket,
  replayMathSpinePacket,
  validateMathSpinePacket,
} from '../src/math-spine/math-spine-packet.js';

function component(value, derivative = 0) {
  return { value, derivative, uncertainty: 0.05, confidence: 0.9, contributors: [] };
}

const premaq = {
  schema_version: '2.0.0', id: 'premaq-spine', observed_at: '2026-08-11T18:00:00.000Z',
  registry_version: 'premaq-registry/2.0', receipt_id: 'receipt-spine', sequence: 81,
  prior_state_ref: null, model_version: 'observer/2.0', provenance_refs: ['observer:81'],
  state: {
    P: component(.78, .02), C: component(.82, .01), R: component(.88, .03),
    E: component(.31, .01), M: component(.71, .02), A: component(.79, .01), Q: component(.79, .02),
  },
};

const jacobian = [
  [1, 0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0], [0, 0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 1e-10],
];

const worldProfile = {
  worldId: 'terra-aeterna', focusAxis: 'Q', enterThreshold: .82, releaseThreshold: .68,
  compressionGain: 1, releaseFraction: .35, derivativeRelease: .08, memoryRelease: .04,
  phaseReleaseGain: Math.PI / 4, radialGain: .5, entropyGain: .1, angularGain: Math.PI / 3,
  temporalWeights: { fold: .55, derivative: .2, entropy: .15, phase: .1 },
  tone: { worldId: 'terra-aeterna', toneLayerId: 'hearthlight-root', rootHz: 220, excursion: 5, approvalState: 'pending', approvalReceiptId: null },
};

test('creates one fingerprinted v1.8 packet containing the complete derivation projection', async () => {
  const packet = await createMathSpinePacket({ premaq, jacobian, worldProfile, generatedAt: '2026-08-11T18:01:00.000Z' });
  assert.equal(packet.schema, MATH_SPINE_PACKET_SCHEMA);
  assert.equal(packet.world_id, 'terra-aeterna');
  assert.match(packet.packet_fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(packet.projection.fold.active, true);
  assert.equal(packet.projection.receipt.next_operation, 'compression-of-release');
  assert.equal(packet.projection.released_state.spiral.cycle, 1);
  assert.doesNotThrow(() => validateMathSpinePacket(packet));
});

test('deterministic replay reproduces the exact packet fingerprint', async () => {
  const packet = await createMathSpinePacket({ premaq, jacobian, worldProfile });
  const replay = await replayMathSpinePacket(packet);
  assert.equal(replay.matched, true);
  assert.equal(replay.replay_fingerprint, packet.packet_fingerprint);
});

test('replay detects a changed derivation input', async () => {
  const packet = await createMathSpinePacket({ premaq, jacobian, worldProfile });
  const changed = structuredClone(packet);
  changed.input.world_profile.compressionGain = 2;
  const replay = await replayMathSpinePacket(changed);
  assert.equal(replay.matched, false);
});
