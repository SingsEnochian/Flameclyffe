import assert from 'node:assert/strict';
import test from 'node:test';
import { createAskPacket } from '../src/bifrost-protocol-stack.js';
import {
  chooseProjectionRoute,
  compileNavigationRequest,
} from '../src/react-ion-engine.js';
import {
  REACTION_DEEPTIME_SCHEMA,
  bindAskPacketToTransformation,
  buildProjectionEdge,
  createReactionDeepTimeReceipt,
  createReactionDestinationRegistry,
  createReactionEndpoint,
  createRunaHarmonicSignature,
  evaluateContinuityGate,
  harmonicMismatch,
} from '../src/react-ion-bridge.js';

function premaqc(sequence = 1) {
  return {
    id: `premaqc-${sequence}`,
    receipt_id: `premaqc-receipt-${sequence}`,
    sequence,
    observed_at: `2026-08-13T04:${String(20 + sequence).padStart(2, '0')}:00.000Z`,
    state: Object.fromEntries(['P', 'C', 'R', 'E', 'M', 'A', 'Q'].map((axis) => [axis, { value: 0.72 }])),
  };
}

function signature(worldId, rootHz, phase = null) {
  return createRunaHarmonicSignature({
    worldId,
    rootHz,
    phase,
    sourceRef: `runa:${worldId}:test`,
    profileVersion: 'test-v1',
    evidenceClass: 'symbolic',
  });
}

test('resolves dimensional names and aliases back to one world endpoint', () => {
  const terra = createReactionEndpoint({
    name: 'templehouse.hearthweave.terra',
    aliases: ['terra.templehouse', 'home.terra'],
    world: { id: 'terra-aeterna', name: 'Terra Aeterna' },
    location: { id: 'templehouse', name: 'Templehouse' },
    address: '137.42.219.88@220',
    harmonic: signature('terra-aeterna', 220),
    provenance: { source: 'world-registry' },
  });
  const registry = createReactionDestinationRegistry([terra]);
  const resolved = registry.resolve('HOME.TERRA');
  assert.equal(registry.size, 1);
  assert.equal(resolved.endpoint.world.id, 'terra-aeterna');
  assert.equal(resolved.endpoint.location.id, 'templehouse');
  assert.equal(resolved.dns.address.x, 137);
});

test('compares Runa signatures using logarithmic root distance and circular phase', () => {
  const left = signature('left', 220, 0);
  const sameOctaveFamily = signature('right', 440, Math.PI * 2 - 0.1);
  const result = harmonicMismatch(left, sameOctaveFamily, { maxOctaves: 4, phaseWeight: 0.2 });
  assert.ok(result.root_mismatch > 0);
  assert.ok(result.root_mismatch < 0.3);
  assert.ok(result.phase_mismatch < 0.05);
  assert.ok(result.mismatch < 0.3);
});

test('continuity gate blocks missing and below-floor invariants', () => {
  const gate = evaluateContinuityGate({
    required: ['identity', 'continuity', 'crew'],
    scores: { identity: 0.95, continuity: 0.61 },
    floor: 0.8,
  });
  assert.equal(gate.admitted, false);
  assert.equal(gate.continuity_risk, 1);
  assert.ok(gate.blocked_by.includes('below-floor:continuity'));
  assert.ok(gate.blocked_by.includes('missing:crew'));
});

test('builds route edges from dimensional distance, the real Jacobian analyser, Runa and Continuity Gate', () => {
  const from = createReactionEndpoint({
    name: 'earth.anchor',
    world: { id: 'waking-world', name: 'Waking World' },
    address: '1.2.3.4@220',
    harmonic: signature('waking-world', 220),
  });
  const to = createReactionEndpoint({
    name: 'terra.templehouse',
    world: { id: 'terra-aeterna', name: 'Terra Aeterna' },
    address: '137.42.219.88@220',
    harmonic: signature('terra-aeterna', 220),
  });
  const continuity = evaluateContinuityGate({
    required: ['identity', 'continuity'],
    scores: { identity: 0.96, continuity: 0.92 },
  });
  const edge = buildProjectionEdge({
    from,
    to,
    jacobian: [[1, 0], [0, 0.9]],
    continuity,
  });
  assert.equal(edge.blocked, false);
  assert.ok(edge.projection_distance > 0);
  assert.equal(edge.harmonic_mismatch, 0);
  assert.ok(edge.jacobian_risk >= 0 && edge.jacobian_risk <= 1);
  assert.equal(edge.diagnostics.continuity.admitted, true);
});

test('binds a Bifrost Ask to the existing Requested Transformation instrument without declaring success', async () => {
  const packet = await createAskPacket({
    sender: 'Rowan',
    target: 'TerraAeterna',
    world: 'Terra Aeterna',
    intention: 'Ask for a bounded change and listen for the measured response',
    transformation: 'Increase observable relational coherence',
    constraints: { preserve: ['agency', 'continuity'] },
    consent: { required: true, granted: true, revocable: true, scope: 'this request only' },
    ttl: 6,
    createdAt: '2026-08-13T04:30:00.000Z',
  });
  const link = await bindAskPacketToTransformation({
    packet,
    world: { id: 'terra-aeterna', name: 'Terra Aeterna' },
    baselinePremaqc: premaqc(1),
    targetAxes: ['R', 'C'],
    direction: 'increase',
    minimumDelta: 0.03,
    intervention: { type: 'observer-and-soundscape', strength: 0.25 },
    maximumCycles: 3,
  });
  assert.equal(link.packet_id, packet.packet_id);
  assert.equal(link.request.request.description, packet.transformation);
  assert.equal(link.request.authority.request_is_success, false);
  assert.equal(link.authority.transformation_request_is_success, false);
});

test('writes a projection route as a DEEPTime extension with receipted PREMAQC provenance', async () => {
  const navigationRequest = await compileNavigationRequest({
    source: '1.1.1.1@220',
    target: '2.2.2.2@220',
    intention: 'Test a deterministic receipted route',
    requestedAt: '2026-08-13T04:30:00.000Z',
  });
  const route = await chooseProjectionRoute({
    request: navigationRequest,
    graph: {
      [navigationRequest.source]: [{
        to: navigationRequest.target,
        projection_distance: 0.1,
        jacobian_risk: 0.05,
        harmonic_mismatch: 0,
        continuity_risk: 0.02,
      }],
    },
  });
  const receipt = await createReactionDeepTimeReceipt({
    sequenceId: 'dt-reaction-test',
    sequenceRevision: 1,
    lambda: 12,
    utc: '2026-08-13T04:31:00.000Z',
    julianDate: 2461265.688194,
    premaqc: premaqc(2),
    observationRunId: 'observer-run-test',
    acceptanceMaskId: 'mask-test',
    acceptanceMaskVersion: '1',
    navigationRequest,
    route,
    dataQuality: 0.95,
  });
  assert.equal(receipt.dataset, 'DEEPTime');
  assert.equal(receipt.schema, REACTION_DEEPTIME_SCHEMA);
  assert.equal(receipt.reaction.route_id, route.route_id);
  assert.equal(receipt.authority.route_is_observation, false);
  assert.match(receipt.provenance.accepted_state_hash, /^[0-9a-f]{64}$/);
  assert.ok(receipt.provenance.source_receipt_hashes.includes(route.fingerprint));
});

test('route solver refuses a direct edge that Continuity Gate vetoed', async () => {
  const request = await compileNavigationRequest({
    source: '10.10.10.10@220',
    target: '40.40.40.40@528',
    intention: 'Never route through a continuity veto',
    requestedAt: '2026-08-13T04:30:00.000Z',
  });
  const middle = '0020.0020.0020.0020@330';
  const route = await chooseProjectionRoute({
    request,
    graph: {
      [request.source]: [
        { to: request.target, projection_distance: 0, jacobian_risk: 0, harmonic_mismatch: 0, continuity_risk: 0, blocked: true },
        { to: middle, projection_distance: 0.1, jacobian_risk: 0.1, harmonic_mismatch: 0.1, continuity_risk: 0.1 },
      ],
      [middle]: [
        { to: request.target, projection_distance: 0.1, jacobian_risk: 0.1, harmonic_mismatch: 0.1, continuity_risk: 0.1 },
      ],
    },
  });
  assert.deepEqual(route.path, [request.source, middle, request.target]);
});
