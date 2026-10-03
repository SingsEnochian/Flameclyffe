'use strict';

const ROUTES = Object.freeze({
  'local:ollama': Object.freeze({
    route_id: 'local:ollama',
    label: 'Local Model',
    provider: 'ollama',
    model: () => process.env.WAYGLASS_LOCAL_MODEL || 'ornith-1.5',
    endpoint: () => process.env.WAYGLASS_OLLAMA_URL || process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/chat',
    lineage: Object.freeze({ kind: 'external-seed', native_wayglass: false }),
    capabilities: Object.freeze({
      text: true,
      streaming: false,
      realtime: false,
      tools: false,
      trainable: false,
      local: true,
    }),
  }),
  'openai:gpt': Object.freeze({
    route_id: 'openai:gpt',
    label: 'GPT',
    provider: 'openai',
    model: () => process.env.WAYGLASS_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-5.5',
    api_key: () => process.env.OPENAI_API_KEY || process.env.VEE_API_KEY || '',
    endpoint: () => process.env.OPENAI_API_URL || 'https://api.openai.com/v1/responses',
    lineage: Object.freeze({ kind: 'external-route', native_wayglass: false }),
    capabilities: Object.freeze({
      text: true,
      streaming: false,
      realtime: false,
      tools: false,
      trainable: false,
    }),
  }),
});

function cleanId(value, max = 120) {
  return String(value || '').trim().slice(0, max);
}

function resolveWayglassRoute(routeId) {
  return ROUTES[cleanId(routeId)] || null;
}

function publicWayglassRoutes() {
  return Object.values(ROUTES).map((route) => Object.freeze({
    route_id: route.route_id,
    label: route.label,
    provider: route.provider,
    model: route.model(),
    lineage: route.lineage || null,
    capabilities: route.capabilities,
  }));
}

function wayglassRouteIds() {
  return Object.keys(ROUTES);
}

module.exports = {
  resolveWayglassRoute,
  publicWayglassRoutes,
  wayglassRouteIds,
};
