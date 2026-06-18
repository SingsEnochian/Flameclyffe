import { makeVectorFromRecord, mergeVectorRecords } from '../../math-kernels/unit-resonance/index.js';

export function nodeFromRoute(route = {}, options = {}) {
  const dimensions = options.dimensions || [];
  const resonance = mergeVectorRecords(route.resonance, route.metadata?.resonance);

  return {
    id: route.id || route.key || route.slug || route.path || `${options.idPrefix || 'route'}-${options.index ?? 0}`,
    kind: options.kind || route.kind || 'route',
    vector: makeVectorFromRecord(resonance, dimensions),
    meta: {
      label: route.title || route.label || route.name || route.path || 'Route',
      path: route.path,
      visible: route.visible ?? true,
      consent: route.consent ?? true,
      position: route.position || route.metadata?.position,
      raw: route,
    },
  };
}

export function nodesFromRouteRegistry(routes = [], options = {}) {
  return routes.map((route, index) => nodeFromRoute(route, { ...options, index }));
}
