import { REACTION_REGISTRY_RUNTIME_SCHEMA } from './react-ion-registry.js';

export const REACTION_ROUTE_MAP_SCHEMA = 'reaction.route-map/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`REACT_ION_ROUTE_MAP: ${message}`);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function edgeKey(from, to) {
  return `${from}=>${to}`;
}

export function buildReactionRouteMap({
  runtime,
  route = null,
  inspection = null,
  directEdge = null,
  width = 900,
  height = 420,
  padding = 64,
} = {}) {
  invariant(runtime?.schema === REACTION_REGISTRY_RUNTIME_SCHEMA, 'compiled registry runtime is required');
  const w = Number(width);
  const h = Number(height);
  const pad = Number(padding);
  invariant(Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0, 'map dimensions must be positive');
  invariant(Number.isFinite(pad) && pad >= 0 && pad * 2 < Math.min(w, h), 'padding is invalid');

  const endpointByAddress = new Map(runtime.destinations.map((endpoint) => [endpoint.address_text, endpoint]));
  const routeAddresses = route?.path || [];
  const alternateAddresses = (inspection?.candidates || []).flatMap((candidate) => candidate.path || []);
  const addresses = unique([
    ...runtime.destinations.map((endpoint) => endpoint.address_text),
    ...routeAddresses,
    ...alternateAddresses,
    directEdge?.from,
    directEdge?.to,
  ]).sort();

  const centerX = w / 2;
  const centerY = h / 2;
  const radiusX = Math.max(1, centerX - pad);
  const radiusY = Math.max(1, centerY - pad);
  const activeAddresses = new Set(routeAddresses);

  const nodes = addresses.map((address, index) => {
    const angle = addresses.length <= 1 ? 0 : -Math.PI / 2 + (Math.PI * 2 * index) / addresses.length;
    const endpoint = endpointByAddress.get(address) || null;
    return Object.freeze({
      id: address,
      address,
      label: endpoint?.name || address,
      world_id: endpoint?.world?.id || null,
      kind: endpoint?.location ? 'place' : endpoint?.anchor ? 'anchor' : endpoint ? 'world' : 'route-only',
      x: Number((centerX + Math.cos(angle) * radiusX).toFixed(3)),
      y: Number((centerY + Math.sin(angle) * radiusY).toFixed(3)),
      active: activeAddresses.has(address),
      source: route?.source === address,
      target: route?.target === address,
    });
  });

  const bestEdges = new Set((route?.edges || []).map((edge) => edgeKey(edge.from || null, edge.to)));
  const candidateRanks = new Map();
  for (const candidate of inspection?.candidates || []) {
    for (let index = 0; index < (candidate.path?.length || 0) - 1; index += 1) {
      const key = edgeKey(candidate.path[index], candidate.path[index + 1]);
      const previous = candidateRanks.get(key);
      if (previous == null || candidate.rank < previous) candidateRanks.set(key, candidate.rank);
    }
  }

  const rawEdges = [...runtime.corridors];
  if (directEdge?.from && directEdge?.to) rawEdges.push(directEdge);
  for (const edge of route?.edges || []) {
    if (!rawEdges.some((existing) => (existing.from || null) === (edge.from || null) && existing.to === edge.to)) rawEdges.push(edge);
  }

  const edges = rawEdges.map((edge, index) => {
    const from = edge.from || null;
    const to = edge.to || null;
    const key = edgeKey(from, to);
    return Object.freeze({
      id: edge.corridor_id || `route-edge-${index + 1}`,
      from,
      to,
      blocked: Boolean(edge.blocked),
      active: bestEdges.has(key),
      candidate_rank: candidateRanks.get(key) ?? null,
      jacobian_risk: Number(edge.jacobian_risk || 0),
      harmonic_mismatch: Number(edge.harmonic_mismatch || 0),
      continuity_risk: Number(edge.continuity_risk || 0),
      cost: edge.cost == null ? null : Number(edge.cost),
    });
  }).filter((edge) => addresses.includes(edge.from) && addresses.includes(edge.to));

  return Object.freeze({
    schema: REACTION_ROUTE_MAP_SCHEMA,
    width: w,
    height: h,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    legend: Object.freeze({
      active: 'selected route',
      candidate: 'retained alternate route',
      blocked: 'continuity-vetoed corridor',
      idle: 'approved corridor',
    }),
    authority: Object.freeze({
      layout_is_interface_geometry: true,
      map_is_not_physical_spacetime_cartography: true,
    }),
  });
}
