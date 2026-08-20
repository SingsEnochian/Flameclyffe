import { createAskPacket, createAskResponse } from './bifrost-protocol-stack.js';
import { createReactionDeepStoryEvent, createResponseDeepStoryEvent } from './react-ion-deepstory.js';
import { createProjectionGraphSnapshot, projectionGraphFromSnapshot } from './react-ion-graph-snapshot.js';
import { evaluateEndpointAccessPolicy } from './react-ion-access-policy.js';
import { createReactionDeepTimeReceipt } from './react-ion-bridge.js';
import { chooseProjectionRoute, compileNavigationRequest } from './react-ion-engine.js';
import { compileReactionRegistry } from './react-ion-registry.js';
import { replayProjectionRoute } from './react-ion-replay.js';
import { routeProtocolResponse } from './react-ion-response-return.js';
import { traceAskRoute } from './react-ion-transport.js';

export const REACTION_TEST_FLIGHT_SCHEMA = 'reaction.test-flight/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`REACT_ION_TEST_FLIGHT: ${message}`);
}

function at(timeline, key, fallback = null) {
  return timeline?.[key] || fallback || new Date().toISOString();
}

function resolvedEndpoint(runtime, name, role) {
  const resolved = runtime.registry.resolve(name);
  invariant(resolved?.endpoint, `${role} destination is not approved or cannot be resolved: ${name}`);
  return resolved.endpoint;
}

function accessContext(context = {}) {
  return {
    globalAuthorised: Boolean(context.globalAuthorised),
    callerIsOwner: context.callerIsOwner !== false,
    circleMember: Boolean(context.circleMember),
    explicitInvitation: Boolean(context.explicitInvitation),
    explicitTarget: context.explicitTarget !== false,
  };
}

function buildHelmReceipt({ source, target, ask, navigation, route, createdAt }) {
  return Object.freeze({
    schema: 'reaction.helm-receipt/v1',
    created_at: createdAt,
    world_id: target.world.id,
    source: Object.freeze({ name: source.name, address: source.address_text }),
    target: Object.freeze({ name: target.name, address: target.address_text }),
    ask,
    navigation,
    route,
    route_error: null,
    projection_state: Object.freeze({ state: 'READY' }),
  });
}

/**
 * Execute one deterministic React-ion integration flight against an approved
 * registry snapshot. This is the ship-level software exercise: DNS resolution,
 * access gate, route solve, TCP trace, graph capture, replay, optional DEEPTime,
 * DEEPStory route event, and an optional explicitly supplied semantic response
 * with a separately solved return route.
 */
export async function conductReactionTestFlight({
  registryStore,
  sourceName,
  targetName,
  sender = 'Rowan',
  intention,
  transformation = 'No transformation asserted by the flight harness',
  constraints = {},
  consent = { required: false, granted: false },
  ttl = 8,
  access = { globalAuthorised: true, callerIsOwner: true, explicitTarget: true },
  timeline = {},
  deepTime = null,
  explicitResponse = null,
} = {}) {
  invariant(registryStore, 'registryStore is required');
  invariant(sourceName, 'sourceName is required');
  invariant(targetName, 'targetName is required');
  invariant(String(intention || '').trim(), 'intention is required');

  const runtime = compileReactionRegistry(registryStore);
  invariant(runtime.destinations.length > 0, 'no approved destinations are available');

  const source = resolvedEndpoint(runtime, sourceName, 'source');
  const target = resolvedEndpoint(runtime, targetName, 'target');
  const policy = evaluateEndpointAccessPolicy({ endpoint: target, ...accessContext(access) });
  invariant(policy.admitted, `target access denied: ${policy.blocked_by.join(', ')}`);

  const ask = await createAskPacket({
    sender,
    target: target.name,
    world: target.world.name,
    intention: String(intention).trim(),
    transformation,
    constraints,
    consent,
    ttl,
    createdAt: at(timeline, 'askCreatedAt'),
  });

  const navigation = await compileNavigationRequest({
    source: source.address_text,
    target: target.address_text,
    intention: ask.intention,
    requestedAt: at(timeline, 'navigationRequestedAt', ask.created_at),
  });

  const graphSnapshot = await createProjectionGraphSnapshot({
    graph: runtime.graph,
    createdAt: at(timeline, 'graphCapturedAt', navigation.requested_at),
    source: 'reaction-test-flight',
  });

  const route = await chooseProjectionRoute({ request: navigation, graph: runtime.graph });
  const transport = await traceAskRoute({
    packet: ask,
    route,
    startedAt: at(timeline, 'transportStartedAt'),
  });
  invariant(transport.delivered, `outbound transport failed: ${transport.final_code}`);

  const historicalReplay = await replayProjectionRoute({
    request: navigation,
    route,
    graph: projectionGraphFromSnapshot(graphSnapshot),
    replayedAt: at(timeline, 'replayedAt'),
  });
  invariant(historicalReplay.matched, 'captured-graph replay did not reproduce the outbound route');

  const helmReceipt = buildHelmReceipt({
    source,
    target,
    ask,
    navigation,
    route,
    createdAt: at(timeline, 'helmReceiptAt'),
  });

  const routeStory = await createReactionDeepStoryEvent({
    helmReceipt,
    narrativeContext: 'React-ion test flight route compiled and outbound transport reached the declared endpoint.',
    interpretation: 'The declared software route remained coherent under captured-graph replay.',
    recordedAt: at(timeline, 'routeStoryAt'),
  });

  const deepTimeReceipt = deepTime ? await createReactionDeepTimeReceipt({
    ...deepTime,
    navigationRequest: navigation,
    route,
  }) : null;

  let exchange = null;
  let responseStory = null;
  if (explicitResponse) {
    const response = await createAskResponse({
      packet: ask,
      code: explicitResponse.code,
      responder: explicitResponse.responder,
      message: explicitResponse.message || '',
      respondedAt: at(timeline, 'responseAt'),
    });
    const returnReceipt = await routeProtocolResponse({
      packet: ask,
      response,
      outboundRoute: route,
      graph: runtime.graph,
      ttl: explicitResponse.ttl ?? ttl,
      sentAt: at(timeline, 'returnStartedAt'),
    });
    exchange = Object.freeze({
      schema: 'reaction.protocol-exchange/v1',
      response,
      return_receipt: returnReceipt,
    });
    responseStory = await createResponseDeepStoryEvent({
      helmReceipt,
      exchange,
      recordedAt: at(timeline, 'responseStoryAt'),
    });
  }

  const status = exchange
    ? (exchange.return_receipt.delivered ? 'ROUND_TRIP_COMPLETE' : 'RESPONSE_RECORDED_RETURN_UNREACHABLE')
    : 'ARRIVED_AWAITING_RESPONSE';

  return Object.freeze({
    schema: REACTION_TEST_FLIGHT_SCHEMA,
    flight_id: `test-flight:${ask.packet_id}`,
    status,
    source: Object.freeze({ name: source.name, address: source.address_text, world: source.world }),
    target: Object.freeze({ name: target.name, address: target.address_text, world: target.world }),
    access_policy: policy,
    ask,
    navigation,
    route,
    transport,
    graph_snapshot: graphSnapshot,
    historical_replay: historicalReplay,
    deep_time: deepTimeReceipt,
    deep_story_route: routeStory,
    exchange,
    deep_story_response: responseStory,
    authority: Object.freeze({
      ack_means_received_not_fulfilled: true,
      route_is_modelled_navigation: true,
      semantic_response_must_be_explicitly_supplied: true,
      captured_graph_replay_is_required: true,
    }),
  });
}
