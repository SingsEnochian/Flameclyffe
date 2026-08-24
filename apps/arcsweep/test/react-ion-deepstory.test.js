import assert from 'node:assert/strict';
import test from 'node:test';
import { createAskPacket, createAskResponse } from '../src/bifrost-protocol-stack.js';
import { chooseProjectionRoute, compileNavigationRequest } from '../src/react-ion-engine.js';
import {
  createReactionDeepStoryEvent,
  createResponseDeepStoryEvent,
} from '../src/react-ion-deepstory.js';

async function helmReceipt({ routed = true } = {}) {
  const ask = await createAskPacket({
    sender: 'Rowan',
    target: 'terra',
    world: 'Terra Aeterna',
    intention: 'Carry this Ask through the route model',
    transformation: 'Request a bounded change',
    consent: { required: false, granted: false },
    createdAt: '2026-08-13T05:30:00.000Z',
  });
  const navigation = await compileNavigationRequest({
    source: '1.1.1.1@220',
    target: '2.2.2.2@330',
    intention: ask.intention,
    requestedAt: '2026-08-13T05:30:01.000Z',
  });
  const edge = {
    to: navigation.target,
    projection_distance: 0.1,
    jacobian_risk: 0.05,
    harmonic_mismatch: 0.05,
    continuity_risk: 0.05,
  };
  const route = routed ? await chooseProjectionRoute({ request: navigation, graph: { [navigation.source]: [edge] } }) : null;
  return {
    schema: 'reaction.helm-receipt/v1',
    created_at: '2026-08-13T05:30:02.000Z',
    world_id: 'world-terra',
    source: { name: 'present', address: navigation.source },
    target: { name: 'terra', address: navigation.target },
    ask,
    navigation,
    route,
    route_error: routed ? null : 'continuity gate closed',
    projection_state: { state: routed ? 'READY' : 'CONTINUITY_UNSAFE' },
  };
}

test('DEEPStory records route compilation as a software event without declaring transformation success', async () => {
  const receipt = await helmReceipt();
  const event = await createReactionDeepStoryEvent({
    helmReceipt: receipt,
    narrativeContext: 'The Helm found an admitted route.',
    interpretation: 'Navigation remained coherent in the declared software model.',
    recordedAt: '2026-08-13T05:31:00.000Z',
  });

  assert.equal(event.dataset, 'DEEPStory');
  assert.equal(event.event_type, 'reaction.route.compiled');
  assert.equal(event.event.route_id, receipt.route.route_id);
  assert.equal(event.authority.route_compilation_is_not_external_world_success, true);
  assert.equal(event.authority.canon_commit, false);
  assert.ok(event.provenance.source_fingerprints.includes(receipt.route.fingerprint));
});

test('route veto becomes its own DEEPStory software event instead of a fictional journey', async () => {
  const receipt = await helmReceipt({ routed: false });
  const event = await createReactionDeepStoryEvent({
    helmReceipt: receipt,
    recordedAt: '2026-08-13T05:32:00.000Z',
  });
  assert.equal(event.event_type, 'reaction.route.vetoed');
  assert.equal(event.event.route_id, null);
  assert.equal(event.event.route_error, 'continuity gate closed');
});

test('explicit semantic response becomes a DEEPStory response event while return transport remains separate', async () => {
  const receipt = await helmReceipt();
  const response = await createAskResponse({
    packet: receipt.ask,
    code: 'REFUSE',
    responder: 'Target',
    message: 'No.',
    respondedAt: '2026-08-13T05:33:00.000Z',
  });
  const exchange = {
    schema: 'reaction.protocol-exchange/v1',
    response,
    return_receipt: { transport_code: 'UNREACHABLE', delivered: false },
  };
  const event = await createResponseDeepStoryEvent({
    helmReceipt: receipt,
    exchange,
    recordedAt: '2026-08-13T05:33:01.000Z',
  });

  assert.equal(event.event_type, 'reaction.response.recorded');
  assert.equal(event.event.semantic_code, 'REFUSE');
  assert.equal(event.event.return_transport_code, 'UNREACHABLE');
  assert.equal(event.authority.semantic_response_was_explicitly_recorded, true);
  assert.equal(event.authority.engine_generated_response, false);
});
