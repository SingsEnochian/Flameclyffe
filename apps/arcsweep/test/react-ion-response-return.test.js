import assert from 'node:assert/strict';
import test from 'node:test';
import { createAskPacket, createAskResponse } from '../src/bifrost-protocol-stack.js';
import { chooseProjectionRoute, compileNavigationRequest } from '../src/react-ion-engine.js';
import { routeProtocolResponse } from '../src/react-ion-response-return.js';

const edge = (to) => ({
  to,
  projection_distance: 0.1,
  jacobian_risk: 0.05,
  harmonic_mismatch: 0.05,
  continuity_risk: 0.05,
});

async function outbound() {
  const request = await compileNavigationRequest({
    source: '1.1.1.1@220',
    target: '2.2.2.2@330',
    intention: 'Deliver an Ask outward',
    requestedAt: '2026-08-13T05:20:00.000Z',
  });
  const graph = { [request.source]: [edge(request.target)] };
  return {
    request,
    route: await chooseProjectionRoute({ request, graph }),
  };
}

async function exchange(code = 'ACK') {
  const packet = await createAskPacket({
    sender: 'Rowan',
    target: 'Target',
    world: 'Test World',
    intention: 'Please answer this Ask',
    transformation: 'A bounded requested change',
    consent: { required: false, granted: false },
    ttl: 8,
    createdAt: '2026-08-13T05:20:01.000Z',
  });
  const response = await createAskResponse({
    packet,
    code,
    responder: 'Target',
    message: code === 'REFUSE' ? 'No.' : 'Received.',
    respondedAt: '2026-08-13T05:20:02.000Z',
  });
  return { packet, response };
}

test('solves an explicit return route instead of assuming the outward edge is reversible', async () => {
  const { route } = await outbound();
  const { packet, response } = await exchange('REFUSE');
  const returnGraph = { [route.target]: [edge(route.source)] };
  const receipt = await routeProtocolResponse({
    packet,
    response,
    outboundRoute: route,
    graph: returnGraph,
    ttl: 3,
    sentAt: '2026-08-13T05:20:03.000Z',
  });

  assert.equal(receipt.delivered, true);
  assert.equal(receipt.semantic_code, 'REFUSE');
  assert.equal(receipt.transport_code, 'ACK');
  assert.equal(receipt.route.source, route.target);
  assert.equal(receipt.route.target, route.source);
  assert.equal(receipt.authority.reverse_route_is_solved_not_assumed, true);
  assert.equal(receipt.authority.response_delivery_does_not_prove_requested_transformation_occurred, true);
});

test('keeps the semantic response receipted even when no return route exists', async () => {
  const { route } = await outbound();
  const { packet, response } = await exchange('ACK');
  const receipt = await routeProtocolResponse({
    packet,
    response,
    outboundRoute: route,
    graph: {},
    ttl: 3,
    sentAt: '2026-08-13T05:21:00.000Z',
  });

  assert.equal(receipt.delivered, false);
  assert.equal(receipt.semantic_code, 'ACK');
  assert.equal(receipt.transport_code, 'UNREACHABLE');
  assert.equal(receipt.route, null);
  assert.match(receipt.route_error, /unreachable/);
});

test('keeps ACCEPT distinct from evidence that the requested transformation occurred', async () => {
  const { route } = await outbound();
  const packet = await createAskPacket({
    sender: 'Rowan',
    target: 'Target',
    world: 'Test World',
    intention: 'Ask with explicit consent',
    transformation: 'A bounded requested change',
    consent: { required: true, granted: true, scope: 'this test' },
    ttl: 8,
    createdAt: '2026-08-13T05:22:00.000Z',
  });
  const response = await createAskResponse({
    packet,
    code: 'ACCEPT',
    responder: 'Target',
    respondedAt: '2026-08-13T05:22:01.000Z',
  });
  const receipt = await routeProtocolResponse({
    packet,
    response,
    outboundRoute: route,
    graph: { [route.target]: [edge(route.source)] },
    sentAt: '2026-08-13T05:22:02.000Z',
  });

  assert.equal(response.authority.success_declared, 'accepted-not-yet-observed');
  assert.equal(receipt.authority.accept_means_accepted_not_observed, true);
});
