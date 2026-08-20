import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import {
  REACTION_NAV_SCHEMA,
  edgeProjectionCost,
} from './react-ion-engine.js';

export const REACTION_ROUTE_INSPECTION_SCHEMA = 'reaction.route-inspection/v1';
export const REACTION_ROUTE_CANDIDATE_SCHEMA = 'reaction.route-candidate/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`REACT_ION_ROUTE_INSPECTOR: ${message}`);
}

function finitePositiveInteger(value, field, fallback) {
  const number = value == null ? fallback : Number(value);
  invariant(Number.isInteger(number) && number >= 1, `${field} must be a positive integer`);
  return number;
}

function pathKey(path) {
  return path.join(' -> ');
}

export async function inspectProjectionRoutes({
  request,
  graph,
  weights = {},
  maximumHops = 8,
  limit = 5,
  maximumCandidates = 512,
  maximumExploredStates = 4096,
} = {}) {
  invariant(request?.schema === REACTION_NAV_SCHEMA, 'a compiled navigation request is required');
  invariant(graph && typeof graph === 'object', 'graph is required');
  const hopLimit = finitePositiveInteger(maximumHops, 'maximumHops', 8);
  const resultLimit = finitePositiveInteger(limit, 'limit', 5);
  const candidateLimit = finitePositiveInteger(maximumCandidates, 'maximumCandidates', 512);
  const explorationLimit = finitePositiveInteger(maximumExploredStates, 'maximumExploredStates', 4096);

  const start = request.source;
  const target = request.target;
  const rawCandidates = [];
  const stack = [{ node: start, path: [start], edges: [], cost: 0 }];
  let truncated = false;
  let exploredStates = 0;

  while (stack.length) {
    if (exploredStates >= explorationLimit) {
      truncated = true;
      break;
    }
    const current = stack.pop();
    exploredStates += 1;
    if (current.node === target) {
      rawCandidates.push(current);
      if (rawCandidates.length >= candidateLimit) {
        truncated = stack.length > 0;
        break;
      }
      continue;
    }
    if (current.edges.length >= hopLimit) continue;

    const outgoing = Array.isArray(graph[current.node]) ? graph[current.node] : [];
    for (let index = outgoing.length - 1; index >= 0; index -= 1) {
      const edge = outgoing[index];
      if (edge?.blocked === true || edge?.admitted === false) continue;
      const next = String(edge?.to ?? '').trim();
      if (!next || current.path.includes(next)) continue;
      const cost = edgeProjectionCost(edge, weights);
      stack.push({
        node: next,
        path: [...current.path, next],
        edges: [...current.edges, Object.freeze({ ...edge, cost })],
        cost: current.cost + cost,
      });
    }
  }

  rawCandidates.sort((left, right) => (
    left.cost - right.cost
    || left.edges.length - right.edges.length
    || pathKey(left.path).localeCompare(pathKey(right.path))
  ));

  const selected = rawCandidates.slice(0, resultLimit);
  const candidates = [];
  for (let index = 0; index < selected.length; index += 1) {
    const candidate = selected[index];
    const core = {
      schema: REACTION_ROUTE_CANDIDATE_SCHEMA,
      schema_version: 1,
      request_id: request.request_id,
      rank: index + 1,
      source: start,
      target,
      path: Object.freeze(candidate.path),
      edges: Object.freeze(candidate.edges),
      hop_count: candidate.edges.length,
      total_cost: Number(candidate.cost.toFixed(9)),
    };
    const fingerprint = await sha256Hex(core);
    candidates.push(Object.freeze({
      ...core,
      candidate_id: `reaction-candidate-${fingerprint.slice(0, 24)}`,
      fingerprint,
    }));
  }

  const core = {
    schema: REACTION_ROUTE_INSPECTION_SCHEMA,
    schema_version: 1,
    request_id: request.request_id,
    source: start,
    target,
    maximum_hops: hopLimit,
    result_limit: resultLimit,
    candidate_limit: candidateLimit,
    exploration_limit: explorationLimit,
    explored_states: exploredStates,
    truncated,
    candidates: Object.freeze(candidates),
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    inspection_id: `reaction-route-inspection-${fingerprint.slice(0, 24)}`,
    fingerprint,
    best: candidates[0] ?? null,
    alternatives: Object.freeze(candidates.slice(1)),
  });
}
