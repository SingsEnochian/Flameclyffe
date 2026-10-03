'use strict';

const ROUTES = Object.freeze({
  'openai:gpt': Object.freeze({
    route_id: 'openai:gpt',
    label: 'GPT',
    provider: 'openai',
    model: () => process.env.WAYGLASS_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-5.5',
    api_key: () => process.env.OPENAI_API_KEY || process.env.VEE_API_KEY || '',
    endpoint: () => process.env.OPENAI_API_URL || 'https://api.openai.com/v1/responses',
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
