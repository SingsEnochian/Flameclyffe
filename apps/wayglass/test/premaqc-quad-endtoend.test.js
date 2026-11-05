import test from 'node:test';
import assert from 'node:assert/strict';
import { runWayglassBifrost } from '../src/bifrost-quad-adapter.js';
import { createQuantumQuad } from '../src/quantum-quad.js';

const component = (value, derivative = 0) =>
  ({ value, derivative, uncertainty: .05, confidence: .9, contributors: [] });
function acceptedObservation() {
  return {
    schema_version: '2.0.0',
    id: 'synthetic-observation-001',
    receipt_id: 'synthetic-receipt-001',
    observed_at: '2026-08-11T18:00:00.000Z',
    registry_version: 'premaqc-registry/2.0',
    model_version: 'synthetic-fixture/1',
    sequence: 1,
    provenance_refs: ['synthetic:approved'],
    state: {
      P: component(.78, .02), C: component(.82, .01),
      R: component(.88, .03), E: component(.31, .01),
      M: component(.71, .02), A: component(.79, .01),
      Q: { value: 0, derivative: 0, uncertainty: 0, confidence: 1, contributors: [] },
    },
    qualia: {
      schema: 'premaqc.qualia-report/v1',
      present: false, authority: 'firsthand-only', inferred: false,
      report_receipt_id: null, observed_at: null, report: null,
    },
  };
}
const jacobian = Array.from({ length: 7 }, (_, i) =>
  Array.from({ length: 7 }, (_, j) => i === j ? (i === 5 ? 1e-10 : 1) : 0));
const worldProfile = {
  worldId: 'wayglass:test-world', focusAxis: 'R',
  enterThreshold: .82, releaseThreshold: .68,
  compressionGain: 1, releaseFraction: .35,
  derivativeRelease: .08, memoryRelease: .04,
  phaseReleaseGain: Math.PI / 4, radialGain: .5,
  entropyGain: .1, angularGain: Math.PI / 3,
  temporalWeights: { fold: .55, derivative: .2, entropy: .15, phase: .1 },
  tone: {
    worldId: 'wayglass:test-world', toneLayerId: 'synthetic-test-tone',
    rootHz: 220, excursion: 5, approvalState: 'pending',
    approvalReceiptId: null,
  },
};

test('canonical PREMAQC observation traverses real Math Spine v1.8 and replays', async () => {
  const result = await runWayglassBifrost({
    premaqcPacket: acceptedObservation(), jacobian, worldProfile,
    worldId: 'wayglass:test-world',
  });
  assert.equal(result.status, 'executed');
  assert.equal(result.vocabulary, 'PREMAQC');
  assert.equal(result.spine_version, 'hearthgate-braided-spine/1.8');
  assert.equal(result.replay_verified, true);
  assert.equal(result.qualia_evolved, false);
  assert.equal(result.persistence, 'not-persisted');
  assert.match(result.packet_fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(result.output.released_state.spiral.cycle, 1);
  assert.equal(Object.hasOwn(result.output.released_state.probabilities, 'Q'), false);
  assert.equal(result.output.tone_sequence.render_authority, 'pending-human-calibration');
});

test('missing measured Jacobian stays unexecuted', async () => {
  const result = await runWayglassBifrost({ premaqcPacket: acceptedObservation() });
  assert.equal(result.status, 'not-executed');
  assert.match(result.reason, /Jacobian/);
});

test('Q rejects invented magnitude, inferred reports and changed derivatives', async () => {
  const magnitude = acceptedObservation();
  magnitude.state.Q.value = .75;
  await assert.rejects(runWayglassBifrost({ premaqcPacket: magnitude }), /Qualia|Q /);
  const inferred = acceptedObservation();
  inferred.qualia.inferred = true;
  await assert.rejects(runWayglassBifrost({ premaqcPacket: inferred }), /Qualia|Q /);
  const derivative = acceptedObservation();
  derivative.state.Q.derivative = .1;
  await assert.rejects(runWayglassBifrost({ premaqcPacket: derivative }), /Qualia|Q /);
});

test('revoked source prevents mathematical transformation and delegated model call', async () => {
  let invoked = false;
  const quad = createQuantumQuad({
    cognition: async () => { invoked = true; return { output: 'must not run' }; },
  });
  const result = await quad.cycle({
    input: 'test', worldId: 'wayglass:test-world', participantId: 'test-client',
    premaqcPacket: acceptedObservation(), jacobian, worldProfile,
    revokedRefs: ['synthetic:approved'],
  });
  assert.equal(result.status, 'blocked');
  assert.equal(invoked, false);
  assert.equal(result.persistence, 'not-attempted');
});

test('real route adapter receives preserved Writing Room context, once', async () => {
  const requests = [];
  const quad = createQuantumQuad();
  const response = await quad.cycle({
    input: 'ship awake?', worldId: 'wayglass:writing-room',
    participantId: 'writing-room-local-client', routeId: 'openai:gpt',
    history: [{ role: 'user', content: 'old context' }],
    interaction: { channel: 'OOC', turn_owner: 'Rowan' },
    sessionId: 'test-session', fetchImpl: async (path, options) => {
      requests.push({ path, body: JSON.parse(options.body) });
      return {
        ok: true, status: 200,
        json: async () => ({ output: 'test response', provider: 'synthetic', model: 'fixture',
          receipt: { receipt_id: 'synthetic-route-receipt' } }),
      };
    }
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/api/v1/wayglass/respond');
  assert.deepEqual(requests[0].body.history, [{ role: 'user', content: 'old context' }]);
  assert.deepEqual(requests[0].body.interaction, { channel: 'OOC', turn_owner: 'Rowan' });
  assert.equal(response.result.output, 'test response');
  assert.equal(response.receipts.length, 4);
  assert.equal(response.persistence, 'ephemeral');
});
