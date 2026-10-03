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
      thinking: true,
      local: true,
    }),
  }),
  'humain:m3-sandbox': Object.freeze({
    route_id: 'humain:m3-sandbox',
    label: 'HUMAIN M3 Sandbox',
    provider: 'humain-node',
    environment: 'sandbox',
    model: () => process.env.WAYGLASS_HUMAIN_SANDBOX_MODEL || process.env.WAYGLASS_HUMAIN_MODEL || 'humain-m3',
    api_key: () => process.env.HUMAIN_NODE_SANDBOX_KEY || '',
    endpoint: () => process.env.HUMAIN_NODE_SANDBOX_URL || process.env.HUMAIN_NODE_URL || 'https://api.node.humain.com/v1/chat/completions',
    catalogue_endpoint: () => process.env.HUMAIN_NODE_SANDBOX_CATALOGUE_URL || process.env.HUMAIN_NODE_CATALOGUE_URL || 'https://api.node.humain.com/v1/models',
    lineage: Object.freeze({ kind: 'external-sandbox-route', native_wayglass: false }),
    data_policy: Object.freeze({
      provider_recording: 'all-preview-inputs-and-outputs-recorded',
      raw_user_linked_retention: 'ordinarily-12-months',
      training_use: 'separate-affirmative-consent-required-for-preview-interactions',
      research_access_zero_retention: false,
      verified_on: '2026-10-03',
      policy_url: 'https://node.humain.com/legal/prompt-output-and-training-data-consent',
    }),
    capabilities: Object.freeze({
      text: true,
      image: false,
      video: false,
      streaming: false,
      realtime: false,
      tools: false,
      trainable: false,
      local: false,
      preview: true,
      sandbox: true,
    }),
    upstream_capabilities: Object.freeze({
      text: true,
      image: true,
      video: true,
      tools: true,
    }),
  }),
  'humain:m3-preview': Object.freeze({
    route_id: 'humain:m3-preview',
    label: 'HUMAIN M3 Preview',
    provider: 'humain-node',
    model: () => process.env.WAYGLASS_HUMAIN_MODEL || 'humain-m3',
    api_key: () => process.env.HUMAIN_NODE_KEY || '',
    endpoint: () => process.env.HUMAIN_NODE_URL || 'https://api.node.humain.com/v1/chat/completions',
    catalogue_endpoint: () => process.env.HUMAIN_NODE_CATALOGUE_URL || 'https://api.node.humain.com/v1/models',
    lineage: Object.freeze({ kind: 'external-preview-route', native_wayglass: false }),
    data_policy: Object.freeze({
      provider_recording: 'all-preview-inputs-and-outputs-recorded',
      raw_user_linked_retention: 'ordinarily-12-months',
      training_use: 'separate-affirmative-consent-required-for-preview-interactions',
      research_access_zero_retention: false,
      verified_on: '2026-10-03',
      policy_url: 'https://node.humain.com/legal/prompt-output-and-training-data-consent',
    }),
    capabilities: Object.freeze({
      text: true,
      image: false,
      video: false,
      streaming: false,
      realtime: false,
      tools: false,
      trainable: false,
      local: false,
      preview: true,
    }),
    upstream_capabilities: Object.freeze({
      text: true,
      image: true,
      video: true,
      tools: true,
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
    environment: route.environment || null,
    model: route.model(),
    lineage: route.lineage || null,
    capabilities: route.capabilities,
    upstream_capabilities: route.upstream_capabilities || null,
    data_policy: route.data_policy || null,
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
