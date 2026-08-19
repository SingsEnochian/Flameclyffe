import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import {
  REACTION_NAV_SCHEMA,
  REACTION_ROUTE_SCHEMA,
  chooseProjectionRoute,
} from './react-ion-engine.js';

export const REACTION_REPLAY_SCHEMA = 'reaction.route-replay/v1';
export const REACTION_HOLONOMY_SCHEMA = 'reaction.holonomy-receipt/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`REACT_ION_REPLAY: ${message}`);
}

function finiteVector(value, field) {
  invariant(Array.isArray(value) && value.length > 0, `${field} must be a non-empty vector`);
  const vector = value.map(Number);
  invariant(vector.every(Number.isFinite), `${field} must contain only finite values`);
  return vector;
}

export async function replayProjectionRoute({
  request,
  route,
  graph,
  weights = {},
  maximumHops = 32,
  replayedAt = new Date().toISOString(),
} = {}) {
  invariant(request?.schema === REACTION_NAV_SCHEMA, 'navigation request is required');
  invariant(route?.schema === REACTION_ROUTE_SCHEMA, 'route receipt is required');
  invariant(route.request_id === request.request_id, 'route must belong to the navigation request');
  invariant(!Number.isNaN(Date.parse(replayedAt)), 'replayedAt must be an ISO-compatible timestamp');

  let recomputed = null;
  let error = null;
  try {
    recomputed = await chooseProjectionRoute({ request, graph, weights, maximumHops });
  } catch (caught) {
    error = caught.message;
  }

  const pathMatched = Boolean(recomputed && JSON.stringify(recomputed.path) === JSON.stringify(route.path));
  const costMatched = Boolean(recomputed && Math.abs(Number(recomputed.total_cost) - Number(route.total_cost)) <= 1e-9);
  const fingerprintMatched = Boolean(recomputed && recomputed.fingerprint === route.fingerprint);
  const core = {
    schema: REACTION_REPLAY_SCHEMA,
    schema_version: 1,
    replayed_at: new Date(replayedAt).toISOString(),
    request_id: request.request_id,
    original_route_id: route.route_id,
    original_route_fingerprint: route.fingerprint,
    recomputed_route_id: recomputed?.route_id ?? null,
    recomputed_route_fingerprint: recomputed?.fingerprint ?? null,
    matched: Boolean(pathMatched && costMatched && fingerprintMatched),
    checks: Object.freeze({ path: pathMatched, cost: costMatched, fingerprint: fingerprintMatched }),
    error,
    authority: Object.freeze({
      replay_verifies_declared_software_inputs_only: true,
      replay_is_not_independent_physical_validation: true,
    }),
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    replay_id: `reaction-replay-${fingerprint.slice(0, 24)}`,
    fingerprint,
    recomputed_route: recomputed,
  });
}

export async function analyseClosedProjectionLoop({
  routes,
  orientationBefore = null,
  orientationAfter = null,
  tolerance = 1e-9,
  observedAt = new Date().toISOString(),
} = {}) {
  invariant(Array.isArray(routes) && routes.length > 0, 'at least one route is required');
  invariant(routes.every((route) => route?.schema === REACTION_ROUTE_SCHEMA), 'every route must be a React-ion route receipt');
  invariant(!Number.isNaN(Date.parse(observedAt)), 'observedAt must be an ISO-compatible timestamp');
  const epsilon = Number(tolerance);
  invariant(Number.isFinite(epsilon) && epsilon >= 0, 'tolerance must be nonnegative');

  for (let index = 1; index < routes.length; index += 1) {
    invariant(routes[index - 1].target === routes[index].source, `route ${index} does not continue the prior route`);
  }
  const start = routes[0].source;
  const end = routes.at(-1).target;
  invariant(start === end, 'route chain is not closed');

  const edges = routes.flatMap((route) => route.edges || []);
  const totalCost = routes.reduce((sum, route) => sum + Number(route.total_cost || 0), 0);
  const maximumCuspRisk = edges.length ? Math.max(...edges.map((edge) => Number(edge.jacobian_risk || 0))) : 0;
  const maximumHarmonicMismatch = edges.length ? Math.max(...edges.map((edge) => Number(edge.harmonic_mismatch || 0))) : 0;
  const maximumContinuityRisk = edges.length ? Math.max(...edges.map((edge) => Number(edge.continuity_risk || 0))) : 0;

  let orientation = null;
  if (orientationBefore != null || orientationAfter != null) {
    const before = finiteVector(orientationBefore, 'orientationBefore');
    const after = finiteVector(orientationAfter, 'orientationAfter');
    invariant(before.length === after.length, 'orientation vectors must have equal dimensions');
    const delta = after.map((value, index) => value - before[index]);
    const norm = Math.sqrt(delta.reduce((sum, value) => sum + value ** 2, 0));
    orientation = Object.freeze({
      before: Object.freeze(before),
      after: Object.freeze(after),
      delta: Object.freeze(delta),
      delta_norm: Number(norm.toFixed(12)),
      changed: norm > epsilon,
      basis: 'declared-model-orientation-vector',
    });
  }

  const core = {
    schema: REACTION_HOLONOMY_SCHEMA,
    schema_version: 1,
    observed_at: new Date(observedAt).toISOString(),
    start,
    end,
    closed: true,
    route_ids: Object.freeze(routes.map((route) => route.route_id)),
    route_fingerprints: Object.freeze(routes.map((route) => route.fingerprint)),
    hop_count: routes.reduce((sum, route) => sum + Number(route.hop_count || 0), 0),
    total_cost: Number(totalCost.toFixed(9)),
    maximum_jacobian_risk: Number(maximumCuspRisk.toFixed(9)),
    maximum_harmonic_mismatch: Number(maximumHarmonicMismatch.toFixed(9)),
    maximum_continuity_risk: Number(maximumContinuityRisk.toFixed(9)),
    orientation,
    holonomy_detected: Boolean(orientation?.changed),
    authority: Object.freeze({
      holonomy_is_a_property_of_the_declared_projection_model: true,
      physical_spacetime_holonomy_claimed: false,
      same_address_does_not_imply_same_internal_orientation: true,
    }),
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    holonomy_id: `reaction-holonomy-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}
