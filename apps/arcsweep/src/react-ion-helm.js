import { createAskPacket, diagnosticAcknowledgement } from './bifrost-protocol-stack.js';
import {
  chooseProjectionRoute,
  classifyProjectionState,
  compileNavigationRequest,
} from './react-ion-engine.js';
import {
  buildProjectionEdge,
  createReactionDeepTimeReceipt,
  createReactionEndpoint,
  createRunaHarmonicSignature,
  evaluateContinuityGate,
} from './react-ion-bridge.js';
import {
  compileReactionRegistry,
  findApprovedWorldDestination,
  normaliseReactionRegistryStore,
} from './react-ion-registry.js';
import { inspectProjectionRoutes } from './react-ion-route-inspector.js';
import { createProjectionGraphSnapshot } from './react-ion-graph-snapshot.js';
import { traceAskRoute } from './react-ion-transport.js';

export const REACTION_HELM_SCHEMA = 'reaction.helm-receipt/v1';
export const REACTION_HELM_SOURCE = 'hearthfire-react-ion-helm/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`REACT_ION_HELM: ${message}`);
}

function numberOrNull(value) {
  if (value === '' || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Expected a finite number, received ${value}.`);
  return number;
}

export function parseHelmJacobian(value) {
  if (Array.isArray(value)) {
    invariant(value.length && value.every((row) => Array.isArray(row) && row.length === value[0].length && row.every(Number.isFinite)), 'Jacobian must be a non-empty rectangular finite matrix.');
    return value.map((row) => [...row]);
  }
  const rows = String(value ?? '').trim().split(';').map((row) => row.trim()).filter(Boolean);
  invariant(rows.length, 'Instrument Bay Jacobian is required.');
  const matrix = rows.map((row) => row.split(',').map((part) => Number(part.trim())));
  invariant(matrix.every((row) => row.length === matrix[0].length && row.every(Number.isFinite)), 'Jacobian must be a rectangular matrix such as 1,0;0,1.');
  return matrix;
}

function harmonic(worldId, rootHz, phase, label) {
  const hz = numberOrNull(rootHz);
  if (hz == null) return null;
  return createRunaHarmonicSignature({
    worldId,
    rootHz: hz,
    phase: numberOrNull(phase),
    sourceRef: `${REACTION_HELM_SOURCE}:${label}`,
    profileVersion: 'hearthfire-v1',
    evidenceClass: 'symbolic',
  });
}

function addEdge(graph, from, edge) {
  graph[from] ||= [];
  graph[from].push(edge);
}

function cloneGraph(graph = {}) {
  return Object.fromEntries(Object.entries(graph).map(([key, edges]) => [key, edges.map((edge) => structuredClone(edge))]));
}

function worstRouteState(route, fallbackEdge) {
  const edges = route?.edges?.length ? route.edges : fallbackEdge ? [fallbackEdge] : [];
  if (!edges.length) {
    return Object.freeze({
      schema: 'reaction.projection-state/v1',
      state: 'CONTINUITY_UNSAFE',
      cusp_score: 1,
      continuity: 0,
      harmonic_mismatch: 1,
      thresholds: Object.freeze({ cusp: 0.85, continuity: 0.8, harmonic: 0.35 }),
    });
  }
  const cuspEdge = [...edges].sort((left, right) => Number(right.jacobian_risk) - Number(left.jacobian_risk))[0];
  const audit = cuspEdge.diagnostics?.jacobian;
  const continuity = Math.min(...edges.map((edge) => Number(edge.diagnostics?.continuity?.minimum_score ?? (1 - Number(edge.continuity_risk || 0)))));
  const mismatch = Math.max(...edges.map((edge) => Number(edge.harmonic_mismatch || 0)));
  return classifyProjectionState({
    sigmaMin: Number(audit?.sigma_min ?? Math.max(0, 1 - Number(cuspEdge.jacobian_risk || 0))),
    sigmaMax: Number(audit?.sigma_max ?? 1),
    continuity,
    harmonicMismatch: mismatch,
  });
}

function normalisePreserve(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  return list.map((item) => String(item).trim()).filter(Boolean);
}

export async function compileHelmReceipt({
  reaction = null,
  world,
  premaqc = null,
  input = {},
  now = new Date(),
} = {}) {
  invariant(world?.id && world?.name, 'active world id and name are required');
  const timestamp = now instanceof Date ? now : new Date(now);
  invariant(!Number.isNaN(timestamp.getTime()), 'now must be a valid date');

  const registryRuntime = compileReactionRegistry(normaliseReactionRegistryStore(reaction?.registry));
  const sourceName = String(input.sourceName || `${world.name} · present frame`).trim();
  const targetName = String(input.targetName || '').trim();
  invariant(sourceName, 'source name is required');
  invariant(targetName, 'target name is required');
  invariant(String(input.ask || '').trim(), 'Ask is required');
  invariant(String(input.transformation || '').trim(), 'requested transformation is required');

  const registeredSource = registryRuntime.registry.resolve(sourceName)?.endpoint || findApprovedWorldDestination(registryRuntime, world.id);
  const registeredTarget = registryRuntime.registry.resolve(targetName)?.endpoint || null;
  const targetWorld = registeredTarget?.world || {
    id: String(input.targetWorldId || world.id).trim(),
    name: String(input.targetWorldName || world.name).trim(),
  };
  invariant(targetWorld.id && targetWorld.name, 'target world id and name are required');

  const source = registeredSource || createReactionEndpoint({
    name: sourceName,
    world: { id: world.id, name: world.name },
    address: input.sourceAddress || '1.1.1.1',
    harmonic: harmonic(world.id, input.sourceHz, input.sourcePhase, 'source'),
    provenance: { source: REACTION_HELM_SOURCE, notice: String(input.notice || '').trim() || null },
  });
  const target = registeredTarget || createReactionEndpoint({
    name: targetName,
    world: targetWorld,
    address: input.targetAddress,
    harmonic: harmonic(targetWorld.id, input.targetHz, input.targetPhase, 'target'),
    provenance: { source: REACTION_HELM_SOURCE },
  });

  const authorised = input.authorised === true;
  const preserve = normalisePreserve(input.preserve || ['identity', 'continuity', 'agency', 'causal-history']);
  const operatorGate = evaluateContinuityGate({
    required: ['identity', 'continuity', 'agency'],
    scores: {
      identity: Number(input.identityScore ?? 0.95),
      continuity: Number(input.continuityScore ?? 0.95),
      agency: Number(input.agencyScore ?? 0.95),
    },
    vetoes: authorised ? [] : ['ask-not-authorised'],
  });
  const canRoute = authorised && operatorGate.admitted;
  const directEdge = buildProjectionEdge({
    from: source,
    to: target,
    jacobian: parseHelmJacobian(input.jacobian || '1,0;0,1'),
    continuity: operatorGate,
  });
  const navigation = await compileNavigationRequest({
    source: source.address,
    target: target.address,
    intention: input.ask,
    preserve,
  });

  const graph = cloneGraph(registryRuntime.graph);
  if (canRoute && input.allowDirect !== false && !directEdge.blocked) addEdge(graph, navigation.source, directEdge);

  let route = null;
  let inspection = null;
  let routeError = null;
  if (canRoute) {
    try {
      inspection = await inspectProjectionRoutes({ request: navigation, graph, limit: 5, maximumHops: 8 });
      route = await chooseProjectionRoute({ request: navigation, graph, maximumHops: 32 });
    } catch (error) {
      routeError = error.message;
    }
  } else {
    routeError = operatorGate.blocked_by.join(', ') || 'route-gate-closed';
  }

  const packet = await createAskPacket({
    sender: input.sender || 'Rowan',
    target: targetName,
    world: targetWorld.name,
    intention: input.ask,
    transformation: input.transformation,
    constraints: { preserve },
    consent: { required: true, granted: authorised, revocable: true, scope: 'this Helm compilation' },
    evidence: String(input.notice || '').trim()
      ? [{ class: 'observed', source: 'operator-notice', value: String(input.notice).trim(), confidence: 1 }]
      : [],
    ttl: Number(input.ttl ?? 8),
  });

  const projectionState = worstRouteState(route, directEdge);
  const diagnostic = diagnosticAcknowledgement({
    reason: route ? 'helm route received' : routeError || operatorGate.blocked_by.join(', '),
    recoverable: Boolean(route && source.address_text === target.address_text),
    loopback: Boolean(route && source.address_text === target.address_text),
  });

  let deepTime = null;
  if (route && premaqc) {
    deepTime = await createReactionDeepTimeReceipt({
      sequenceId: `reaction-${navigation.request_id}`,
      sequenceRevision: 1,
      lambda: 0,
      utc: timestamp.toISOString(),
      julianDate: timestamp.getTime() / 86_400_000 + 2_440_587.5,
      julianTimeScale: 'UTC',
      premaqc,
      observationRunId: premaqc.receipt_id,
      acceptanceMaskId: 'reaction.continuity-gate/v1',
      acceptanceMaskVersion: '1',
      navigationRequest: navigation,
      route,
      askPacket: packet,
      dataQuality: 1,
      missing: [!source.harmonic ? 'source-harmonic-profile' : null, !target.harmonic ? 'target-harmonic-profile' : null].filter(Boolean),
    });
  }

  const graphSnapshot = await createProjectionGraphSnapshot({
    graph,
    createdAt: timestamp.toISOString(),
    source: REACTION_HELM_SOURCE,
  });
  const transport = route
    ? await traceAskRoute({ packet, route, startedAt: timestamp.toISOString() })
    : null;

  return Object.freeze({
    schema: REACTION_HELM_SCHEMA,
    created_at: timestamp.toISOString(),
    world_id: world.id,
    source: Object.freeze({ name: source.name, address: source.address_text, registration_id: source.provenance?.registration_id || null }),
    target: Object.freeze({ name: target.name, address: target.address_text, registration_id: target.provenance?.registration_id || null }),
    notice: String(input.notice || '').trim() || null,
    ask: packet,
    navigation,
    direct_edge: directEdge,
    registry: Object.freeze({
      source_resolved: Boolean(registeredSource),
      target_resolved: Boolean(registeredTarget),
      approved_destinations: registryRuntime.destinations.length,
      compiled_corridors: registryRuntime.corridors.length,
      diagnostics: structuredClone(registryRuntime.diagnostics),
    }),
    route,
    route_error: routeError,
    route_inspection: inspection,
    projection_state: projectionState,
    deep_time: deepTime,
    graph_snapshot: graphSnapshot,
    transport,
    diagnostic,
    authority: Object.freeze({
      route_compiled: Boolean(route),
      ask_authorised: authorised,
      operator_continuity_gate_admitted: operatorGate.admitted,
      route_gate_admitted: canRoute,
      transport_delivery_is_fulfilment: false,
      ask_acceptance_is_observed_transformation: false,
      physical_travel_claimed: false,
    }),
  });
}
