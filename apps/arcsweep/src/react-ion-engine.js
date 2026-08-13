import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import {
  DIMENSIONAL_ADDRESS_SCHEMA,
  formatDimensionalAddress,
  parseDimensionalAddress,
  resolveE8x32Coordinate,
} from './bifrost-protocol-stack.js';

export const REACTION_NAV_SCHEMA = 'reaction.navigation-request/v1';
export const REACTION_ROUTE_SCHEMA = 'reaction.projection-route/v1';
export const REACTION_STATE_SCHEMA = 'reaction.projection-state/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`REACT_ION_ENGINE: ${message}`);
}

function finite(value, field) {
  const number = Number(value);
  invariant(Number.isFinite(number), `${field} must be finite`);
  return number;
}

function clamp01(value, field) {
  const number = finite(value, field);
  invariant(number >= 0 && number <= 1, `${field} must lie within 0..1`);
  return number;
}

function normaliseWeights(weights = {}) {
  const result = {
    projection: finite(weights.projection ?? 1, 'weights.projection'),
    jacobian: finite(weights.jacobian ?? 2, 'weights.jacobian'),
    harmonic: finite(weights.harmonic ?? 1, 'weights.harmonic'),
    continuity: finite(weights.continuity ?? 3, 'weights.continuity'),
  };
  invariant(Object.values(result).every((value) => value >= 0), 'route weights cannot be negative');
  return Object.freeze(result);
}

export function edgeProjectionCost(edge, weights = {}) {
  const w = normaliseWeights(weights);
  const projectionDistance = clamp01(edge?.projection_distance ?? 0, 'projection_distance');
  const jacobianRisk = clamp01(edge?.jacobian_risk ?? 0, 'jacobian_risk');
  const harmonicMismatch = clamp01(edge?.harmonic_mismatch ?? 0, 'harmonic_mismatch');
  const continuityRisk = clamp01(edge?.continuity_risk ?? 0, 'continuity_risk');
  return Number((
    w.projection * projectionDistance
    + w.jacobian * jacobianRisk
    + w.harmonic * harmonicMismatch
    + w.continuity * continuityRisk
  ).toFixed(9));
}

export function classifyProjectionState({
  sigmaMin,
  sigmaMax,
  continuity,
  harmonicMismatch = 0,
  cuspThreshold = 0.85,
  continuityFloor = 0.8,
  harmonicCeiling = 0.35,
  epsilon = 1e-9,
} = {}) {
  const min = finite(sigmaMin, 'sigmaMin');
  const max = finite(sigmaMax, 'sigmaMax');
  invariant(min >= 0 && max >= 0 && max >= min, 'singular values must satisfy 0 <= sigmaMin <= sigmaMax');
  const continuityValue = clamp01(continuity, 'continuity');
  const harmonic = clamp01(harmonicMismatch, 'harmonicMismatch');
  const cusp = 1 - min / (max + Math.abs(finite(epsilon, 'epsilon')));
  const cuspScore = Number(Math.max(0, Math.min(1, cusp)).toFixed(9));

  const state = continuityValue < continuityFloor ? 'CONTINUITY_UNSAFE'
    : cuspScore >= cuspThreshold ? 'CUSP_NEARBY'
      : harmonic > harmonicCeiling ? 'DEGRADED'
        : 'READY';

  return Object.freeze({
    schema: REACTION_STATE_SCHEMA,
    state,
    cusp_score: cuspScore,
    continuity: continuityValue,
    harmonic_mismatch: harmonic,
    thresholds: Object.freeze({ cusp: cuspThreshold, continuity: continuityFloor, harmonic: harmonicCeiling }),
  });
}

export async function compileNavigationRequest({
  source,
  target,
  intention,
  preserve = ['identity', 'continuity', 'crew', 'causal-history'],
  requestedAt = new Date().toISOString(),
} = {}) {
  invariant(String(intention ?? '').trim(), 'intention is required');
  invariant(!Number.isNaN(Date.parse(requestedAt)), 'requestedAt must be an ISO-compatible timestamp');
  const sourceAddress = typeof source === 'string' ? parseDimensionalAddress(source) : source;
  const targetAddress = typeof target === 'string' ? parseDimensionalAddress(target) : target;
  invariant(sourceAddress?.schema === DIMENSIONAL_ADDRESS_SCHEMA, 'source dimensional address is required');
  invariant(targetAddress?.schema === DIMENSIONAL_ADDRESS_SCHEMA, 'target dimensional address is required');
  const invariants = [...new Set((preserve || []).map(String).map((value) => value.trim()).filter(Boolean))];
  invariant(invariants.length > 0, 'at least one continuity invariant must be preserved');

  const core = {
    schema: REACTION_NAV_SCHEMA,
    schema_version: 1,
    requested_at: new Date(requestedAt).toISOString(),
    source: formatDimensionalAddress(sourceAddress),
    target: formatDimensionalAddress(targetAddress),
    intention: String(intention).trim(),
    preserve: Object.freeze(invariants),
    source_lattice: await resolveE8x32Coordinate(sourceAddress),
    target_lattice: await resolveE8x32Coordinate(targetAddress),
    authority: Object.freeze({
      navigation_is_projection_model: true,
      physical_multiverse_travel_claimed: false,
      continuity_required: true,
    }),
  };

  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    request_id: `reaction-nav-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}

export async function chooseProjectionRoute({
  request,
  graph,
  weights = {},
  maximumHops = 32,
} = {}) {
  invariant(request?.schema === REACTION_NAV_SCHEMA, 'a compiled navigation request is required');
  invariant(graph && typeof graph === 'object', 'graph is required');
  invariant(Number.isInteger(maximumHops) && maximumHops >= 1, 'maximumHops must be a positive integer');

  const start = request.source;
  const target = request.target;
  const distances = new Map([[start, 0]]);
  const previous = new Map();
  const visited = new Set();
  const frontier = new Set([start]);

  while (frontier.size) {
    let current = null;
    let currentDistance = Infinity;
    for (const node of frontier) {
      const distance = distances.get(node) ?? Infinity;
      if (distance < currentDistance) {
        current = node;
        currentDistance = distance;
      }
    }

    frontier.delete(current);
    if (current === target) break;
    if (visited.has(current)) continue;
    visited.add(current);

    const edges = Array.isArray(graph[current]) ? graph[current] : [];
    for (const edge of edges) {
      if (edge?.blocked === true || edge?.admitted === false) continue;
      const next = String(edge?.to ?? '').trim();
      invariant(next, `graph edge from ${current} is missing to`);
      if (visited.has(next)) continue;
      const cost = edgeProjectionCost(edge, weights);
      const candidate = currentDistance + cost;
      if (candidate < (distances.get(next) ?? Infinity)) {
        distances.set(next, candidate);
        previous.set(next, Object.freeze({ from: current, edge: Object.freeze({ ...edge, cost }) }));
        frontier.add(next);
      }
    }
  }

  invariant(distances.has(target), 'target is unreachable through the supplied projection graph');
  const path = [];
  const traversedEdges = [];
  let cursor = target;
  path.unshift(cursor);
  while (cursor !== start) {
    const step = previous.get(cursor);
    invariant(step, 'route reconstruction failed');
    traversedEdges.unshift(step.edge);
    cursor = step.from;
    path.unshift(cursor);
    invariant(path.length - 1 <= maximumHops, 'route exceeds maximumHops');
  }

  const core = {
    schema: REACTION_ROUTE_SCHEMA,
    schema_version: 1,
    request_id: request.request_id,
    source: start,
    target,
    path: Object.freeze(path),
    edges: Object.freeze(traversedEdges),
    hop_count: path.length - 1,
    total_cost: Number((distances.get(target) ?? 0).toFixed(9)),
    weights: normaliseWeights(weights),
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    route_id: `reaction-route-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}
