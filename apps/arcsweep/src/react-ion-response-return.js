import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import {
  ASK_PACKET_SCHEMA,
  ASK_RESPONSE_SCHEMA,
} from './bifrost-protocol-stack.js';
import {
  REACTION_ROUTE_SCHEMA,
  chooseProjectionRoute,
  compileNavigationRequest,
} from './react-ion-engine.js';

export const REACTION_RESPONSE_RETURN_SCHEMA = 'reaction.protocol-response-return/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`REACT_ION_RESPONSE_RETURN: ${message}`);
}

function positiveInteger(value, field, fallback) {
  const number = value == null ? fallback : Number(value);
  invariant(Number.isInteger(number) && number >= 1 && number <= 64, `${field} must be an integer from 1..64`);
  return number;
}

export async function routeProtocolResponse({
  packet,
  response,
  outboundRoute,
  graph,
  ttl = null,
  weights = {},
  maximumHops = 32,
  sentAt = new Date().toISOString(),
} = {}) {
  invariant(packet?.schema === ASK_PACKET_SCHEMA, 'an Ask packet is required');
  invariant(response?.schema === ASK_RESPONSE_SCHEMA, 'an Ask response is required');
  invariant(response.packet_id === packet.packet_id, 'response does not belong to the supplied Ask packet');
  invariant(response.packet_fingerprint === packet.fingerprint, 'response packet fingerprint does not match the supplied Ask');
  invariant(outboundRoute?.schema === REACTION_ROUTE_SCHEMA, 'the outbound projection route is required');
  invariant(graph && typeof graph === 'object', 'the current projection graph is required');
  invariant(!Number.isNaN(Date.parse(sentAt)), 'sentAt must be an ISO-compatible timestamp');

  const ttlStart = positiveInteger(ttl, 'ttl', packet.transport?.ttl || 8);
  const navigation = await compileNavigationRequest({
    source: outboundRoute.target,
    target: outboundRoute.source,
    intention: `Return ${response.code} response for ${packet.packet_id}`,
    preserve: ['response-integrity', 'packet-linkage', 'semantic-code'],
    requestedAt: sentAt,
  });

  let route = null;
  let routeError = null;
  try {
    route = await chooseProjectionRoute({ request: navigation, graph, weights, maximumHops });
  } catch (error) {
    routeError = error.message;
  }

  let ttlRemaining = ttlStart;
  const hops = [];
  let expired = false;
  if (route) {
    for (let index = 1; index < route.path.length; index += 1) {
      const address = route.path[index];
      if (ttlRemaining <= 0) {
        expired = true;
        hops.push(Object.freeze({
          hop: index,
          address,
          code: 'EXPIRED',
          ttl_before: 0,
          ttl_after: 0,
        }));
        break;
      }
      const before = ttlRemaining;
      ttlRemaining -= 1;
      hops.push(Object.freeze({
        hop: index,
        address,
        code: 'ACK',
        ttl_before: before,
        ttl_after: ttlRemaining,
      }));
    }
  }

  const delivered = Boolean(route && !expired && hops.length === Math.max(0, route.path.length - 1));
  const transportCode = delivered ? 'ACK' : expired ? 'EXPIRED' : 'UNREACHABLE';
  const core = {
    schema: REACTION_RESPONSE_RETURN_SCHEMA,
    schema_version: 1,
    sent_at: new Date(sentAt).toISOString(),
    packet_id: packet.packet_id,
    packet_fingerprint: packet.fingerprint,
    response_id: response.response_id,
    response_fingerprint: response.fingerprint,
    semantic_code: response.code,
    outbound_route_id: outboundRoute.route_id,
    return_navigation_request_id: navigation.request_id,
    return_route_id: route?.route_id ?? null,
    delivered,
    transport_code: transportCode,
    route_error: routeError,
    ttl_start: ttlStart,
    ttl_end: ttlRemaining,
    hops: Object.freeze(hops),
    authority: Object.freeze({
      semantic_response_is_distinct_from_transport_ack: true,
      transport_scope: 'response-delivery',
      transformation_state_source: 'separate-receipt-chain',
      accept_means_accepted_not_observed: response.code === 'ACCEPT',
      reverse_route_is_solved_not_assumed: true,
    }),
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    return_receipt_id: `reaction-response-return-${fingerprint.slice(0, 24)}`,
    fingerprint,
    navigation,
    route,
  });
}
