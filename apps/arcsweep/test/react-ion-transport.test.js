import assert from 'node:assert/strict';
import test from 'node:test';
import { createAskPacket } from '../src/bifrost-protocol-stack.js';
import { chooseProjectionRoute, compileNavigationRequest } from '../src/react-ion-engine.js';
import { traceAskRoute } from '../src/react-ion-transport.js';

async function routeWithHops() {
  const request = await compileNavigationRequest({
    source: '1.1.1.1@220',
    target: '4.4.4.4@528',
    intention: 'Trace the packet through the admitted path',
    requestedAt: '2026-08-13T04:55:00.000Z',
  });
  const middleA = '0002.0002.0002.0002@330';
  const middleB = '0003.0003.0003.0003@440';
  const edge = (to) => ({
    to,
    projection_distance: 0.1,
    jacobian_risk: 0.05,
    harmonic_mismatch: 0.05,
    continuity_risk: 0.05,
  });
  const graph = {
    [request.source]: [edge(middleA)],
    [middleA]: [edge(middleB)],
    [middleB]: [edge(request.target)],
  };
  return chooseProjectionRoute({ request, graph });
}

test('traces an Ask packet hop by hop without conflating delivery with fulfilment', async () => {
  const route = await routeWithHops();
  const packet = await createAskPacket({
    sender: 'Rowan',
    target: 'registered-destination',
    world: 'Test World',
    intention: 'Please receive this Ask',
    transformation: 'No outcome is declared by transport',
    consent: { required: false, granted: false },
    ttl: 4,
    createdAt: '2026-08-13T04:56:00.000Z',
  });

  const trace = await traceAskRoute({ packet, route, startedAt: '2026-08-13T04:56:01.000Z' });
  assert.equal(trace.delivered, true);
  assert.equal(trace.final_code, 'ACK');
  assert.equal(trace.hops.length, 3);
  assert.equal(trace.ttl_start, 4);
  assert.equal(trace.ttl_end, 1);
  assert.equal(trace.authority.acknowledgement_means_received_not_fulfilled, true);
});

test('expires a packet when the route requires more hops than its TTL permits', async () => {
  const route = await routeWithHops();
  const packet = await createAskPacket({
    sender: 'Rowan',
    target: 'registered-destination',
    world: 'Test World',
    intention: 'Try a route with insufficient TTL',
    transformation: 'None',
    consent: { required: false, granted: false },
    ttl: 1,
    createdAt: '2026-08-13T04:57:00.000Z',
  });

  const trace = await traceAskRoute({ packet, route, startedAt: '2026-08-13T04:57:01.000Z' });
  assert.equal(trace.delivered, false);
  assert.equal(trace.final_code, 'EXPIRED');
  assert.equal(trace.hops[0].code, 'ACK');
  assert.equal(trace.hops[1].code, 'EXPIRED');
  assert.equal(trace.ttl_end, 0);
});
