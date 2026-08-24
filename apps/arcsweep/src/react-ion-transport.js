import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import {
  ASK_PACKET_SCHEMA,
  diagnosticAcknowledgement,
  routeAskPacket,
} from './bifrost-protocol-stack.js';
import { REACTION_ROUTE_SCHEMA } from './react-ion-engine.js';

export const REACTION_TRACEROUTE_SCHEMA = 'reaction.trans-cosmic-traceroute/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`REACT_ION_TRANSPORT: ${message}`);
}

export async function traceAskRoute({
  packet,
  route,
  startedAt = new Date().toISOString(),
} = {}) {
  invariant(packet?.schema === ASK_PACKET_SCHEMA, 'an Ask packet is required');
  invariant(route?.schema === REACTION_ROUTE_SCHEMA, 'a projection route is required');
  invariant(route.path?.length >= 1, 'route path is required');
  invariant(route.path[0] === route.source && route.path.at(-1) === route.target, 'route path must connect its declared source and target');
  invariant(!Number.isNaN(Date.parse(startedAt)), 'startedAt must be an ISO-compatible timestamp');

  let travelling = packet;
  const hops = [];
  let expired = false;

  for (let index = 1; index < route.path.length; index += 1) {
    const address = route.path[index];
    if (travelling.transport.ttl <= 0) {
      expired = true;
      hops.push(Object.freeze({
        hop: index,
        address,
        code: 'EXPIRED',
        ttl_before: 0,
        ttl_after: 0,
        loopback: Boolean(travelling.transport.loopback),
        diagnostic: null,
      }));
      break;
    }

    const ttlBefore = travelling.transport.ttl;
    travelling = routeAskPacket(travelling, address);
    const diagnostic = diagnosticAcknowledgement({
      reason: travelling.transport.loopback ? 'transport loopback detected' : 'hop received',
      recoverable: Boolean(travelling.transport.loopback),
      loopback: Boolean(travelling.transport.loopback),
    });
    hops.push(Object.freeze({
      hop: index,
      address,
      code: diagnostic.code,
      ttl_before: ttlBefore,
      ttl_after: travelling.transport.ttl,
      loopback: Boolean(travelling.transport.loopback),
      diagnostic,
    }));
  }

  const reachedTarget = !expired
    && hops.length === Math.max(0, route.path.length - 1)
    && route.path.at(-1) === route.target;
  const core = {
    schema: REACTION_TRACEROUTE_SCHEMA,
    schema_version: 1,
    started_at: new Date(startedAt).toISOString(),
    packet_id: packet.packet_id,
    packet_fingerprint: packet.fingerprint,
    route_id: route.route_id,
    route_fingerprint: route.fingerprint,
    source: route.source,
    target: route.target,
    delivered: reachedTarget,
    final_code: reachedTarget ? 'ACK' : 'EXPIRED',
    ttl_start: packet.transport.ttl,
    ttl_end: travelling.transport.ttl,
    hops: Object.freeze(hops),
    authority: Object.freeze({
      acknowledgement_means_received_not_fulfilled: true,
      delivery_is_transport_state_not_transformation_success: true,
      physical_transport_claimed: false,
    }),
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    traceroute_id: `reaction-traceroute-${fingerprint.slice(0, 24)}`,
    fingerprint,
    final_packet: travelling,
  });
}
