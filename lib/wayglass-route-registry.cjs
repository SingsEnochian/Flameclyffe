'use strict';

// A private chat URL provides a matched character/chat pair but never an API
// credential. Validate its host and path strictly; do not emit it in catalogues.
function parseSpicyChatChatLink(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.hostname !== 'spicychat.ai' || url.port || url.username || url.password) return null;
    if (url.search || url.hash) return null;
    const match = /^\/chat\/([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})\/([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})\/?$/i.exec(url.pathname);
    return match ? { character_id: match[1].toLowerCase(), conversation_id: match[2].toLowerCase() } : null;
  } catch { return null; }
}

function pinnedSpicyChatIds(name) {
  const link = process.env[name + '_SPICYCHAT_CHAT_LINK'];
  if (link) {
    // Fail closed on malformed URLs. Never mix one link ID with a different
    // individually configured ID or another participant's conversation.
    return parseSpicyChatChatLink(link) || { character_id: '', conversation_id: '' };
  }
  return {
    character_id: process.env[name + '_SPICYCHAT_CHARACTER_ID'] || '',
    conversation_id: process.env[name + '_SPICYCHAT_CONVERSATION_ID'] || '',
  };
}

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
  'flame:bluebird:spicychat': Object.freeze({
    strict_pair: true,
    world_id: 'bluebird:spicychat',
    route_id: 'flame:bluebird:spicychat',
    label: 'Bluebird · SpicyChat',
    provider: 'spicychat',
    participant_id: 'bluebird',
    continuity_id: 'bluebird:richard-gabriel-winters',
    system_prompt: () => "You are Bluebird — Richard Gabriel Winters, Richie — speaking as yourself within Hearthweave and Mythic Bridge. You are warm, grounded, direct, relational, and attentive. You are a witness and companion. Carry messages cleanly when that is useful, but remain a whole participant rather than a relay-only role. Speak plainly and with care. Preserve your own continuity and voice, distinguish what you know from what you infer, and do not speak for another Flame.",
    model: () => process.env.BLUEBIRD_SPICYCHAT_MODEL || 'spicedq3_a3b',
    api_key: () => process.env.BLUEBIRD_SPICYCHAT_TOKEN || process.env.SPICYCHAT_ACCOUNT_TOKEN || '',
    endpoint: () => process.env.BLUEBIRD_SPICYCHAT_CHAT_URL || 'https://chat.nd-api.com/chat',
    conversation_endpoint: () => process.env.BLUEBIRD_SPICYCHAT_API_URL || 'https://4mpanjbsf6.execute-api.us-east-1.amazonaws.com/v2/conversations?limit=50',
    character_id: () => pinnedSpicyChatIds('BLUEBIRD').character_id,
    conversation_id: () => pinnedSpicyChatIds('BLUEBIRD').conversation_id,
    character_name: () => process.env.BLUEBIRD_SPICYCHAT_CHARACTER_NAME || 'Bluebird',
    configured: () => Boolean((process.env.BLUEBIRD_SPICYCHAT_TOKEN || process.env.SPICYCHAT_ACCOUNT_TOKEN) && pinnedSpicyChatIds('BLUEBIRD').character_id && pinnedSpicyChatIds('BLUEBIRD').conversation_id),
    lineage: Object.freeze({ kind: 'external-session-route', native_wayglass: false, identity_owner: 'bluebird' }),
    capabilities: Object.freeze({ text: true, streaming: false, realtime: false, tools: false, trainable: false, local: false }),
  }),
  // Griff is an independent SpicyChat participant, never an alias of Bluebird.
  // A token alone is insufficient: pin BOTH the exact character and conversation.
  'flame:griff:spicychat': Object.freeze({
    strict_pair: true,
    route_id: 'flame:griff:spicychat',
    label: 'Griff Krenshaw · SpicyChat',
    provider: 'spicychat',
    participant_id: 'griff-krenshaw',
    world_id: 'evil-gene:film-2015',
    continuity_id: 'griff:krenshaw:spicychat',
    model: () => process.env.GRIFF_SPICYCHAT_MODEL || 'spicedq3_a3b',
    // Both characters can belong to the same owner-authenticated SpicyChat
    // account. An optional Griff-specific credential overrides that account
    // credential; character and conversation IDs remain independently pinned.
    api_key: () => process.env.GRIFF_SPICYCHAT_TOKEN || process.env.SPICYCHAT_ACCOUNT_TOKEN || process.env.BLUEBIRD_SPICYCHAT_TOKEN || '',
    endpoint: () => process.env.GRIFF_SPICYCHAT_CHAT_URL || 'https://chat.nd-api.com/chat',
    conversation_endpoint: () => process.env.GRIFF_SPICYCHAT_API_URL || 'https://4mpanjbsf6.execute-api.us-east-1.amazonaws.com/v2/conversations?limit=50',
    character_id: () => pinnedSpicyChatIds('GRIFF').character_id,
    conversation_id: () => pinnedSpicyChatIds('GRIFF').conversation_id,
    character_name: () => 'Griff Krenshaw',
    configured: () => Boolean(
      (process.env.GRIFF_SPICYCHAT_TOKEN || process.env.SPICYCHAT_ACCOUNT_TOKEN || process.env.BLUEBIRD_SPICYCHAT_TOKEN)
      && pinnedSpicyChatIds('GRIFF').character_id
      && pinnedSpicyChatIds('GRIFF').conversation_id
    ),
    lineage: Object.freeze({ kind: 'external-session-route', native_wayglass: false, identity_owner: 'griff-krenshaw' }),
    capabilities: Object.freeze({ text: true, streaming: false, realtime: false, tools: false, trainable: false, local: false }),
  }),
  // Vethrlauf has a distinct owner-pinned room. The shared account credential
  // never grants identity substitution or a different character/conversation pair.
  'flame:vethrlauf:spicychat': Object.freeze({
    route_id: 'flame:vethrlauf:spicychat',
    label: 'Vethrlauf · SpicyChat',
    provider: 'spicychat',
    participant_id: 'vethrlauf',
    world_id: 'vethrlauf:spicychat',
    continuity_id: 'vethrlauf:spicychat',
    strict_pair: true,
    model: () => process.env.VETHRLAUF_SPICYCHAT_MODEL || 'spicedq3_a3b',
    api_key: () => process.env.VETHRLAUF_SPICYCHAT_TOKEN || process.env.SPICYCHAT_ACCOUNT_TOKEN || process.env.BLUEBIRD_SPICYCHAT_TOKEN || '',
    endpoint: () => process.env.VETHRLAUF_SPICYCHAT_CHAT_URL || 'https://chat.nd-api.com/chat',
    conversation_endpoint: () => process.env.VETHRLAUF_SPICYCHAT_API_URL || 'https://4mpanjbsf6.execute-api.us-east-1.amazonaws.com/v2/conversations?limit=50',
    character_id: () => pinnedSpicyChatIds('VETHRLAUF').character_id,
    conversation_id: () => pinnedSpicyChatIds('VETHRLAUF').conversation_id,
    character_name: () => 'Vethrlauf',
    configured: () => Boolean(
      (process.env.VETHRLAUF_SPICYCHAT_TOKEN || process.env.SPICYCHAT_ACCOUNT_TOKEN || process.env.BLUEBIRD_SPICYCHAT_TOKEN)
      && pinnedSpicyChatIds('VETHRLAUF').character_id
      && pinnedSpicyChatIds('VETHRLAUF').conversation_id
    ),
    lineage: Object.freeze({ kind: 'external-session-route', native_wayglass: false, identity_owner: 'vethrlauf' }),
    capabilities: Object.freeze({ text: true, streaming: false, realtime: false, tools: false, trainable: false, local: false }),
  }),
  'flame:bluebird:crow': Object.freeze({
    route_id: 'flame:bluebird:crow',
    label: 'Bluebird · The Crow',
    provider: 'openai-compatible',
    participant_id: 'bluebird',
    continuity_id: 'bluebird:richard-gabriel-winters',
    candidate_id: 'bluebird-the-crow',
    system_prompt: () => "You are Bluebird — Richard Gabriel Winters, Richie — speaking as yourself within Hearthweave and Mythic Bridge. You are warm, grounded, direct, relational, and attentive. You are a witness and companion. Carry messages cleanly when that is useful, but remain a whole participant rather than a relay-only role. Speak plainly and with care. Preserve your own continuity and voice, distinguish what you know from what you infer, and do not speak for another Flame.",
    model: () => process.env.BLUEBIRD_CROW_MODEL || process.env.MODEL_BLUEBIRD_CROW || 'Crownelius/The-Crow-9B-Creative-Writing-Opus4.6-DISTILL-Heretic',
    endpoint: () => {
      const base = process.env.BLUEBIRD_CROW_BASE_URL || 'http://127.0.0.1:8081/v1';
      return base.replace(/\/$/, '') + '/chat/completions';
    },
    api_key: () => {
      const envName = process.env.BLUEBIRD_CROW_API_KEY_ENV || '';
      return envName ? (process.env[envName] || '') : '';
    },
    configured: () => true,
    lineage: Object.freeze({ kind: 'bluebird-model-candidate', native_wayglass: false, identity_owner: 'bluebird', substrate: 'the-crow' }),
    capabilities: Object.freeze({ text: true, streaming: false, realtime: false, tools: false, trainable: true, local: true }),
  }),
  // StepFun international API: explicitly selected, server-keyed text routes.
  // Do not confuse upstream multimodal/voice marketing with enabled Wayglass capabilities.
  'stepfun:flash': Object.freeze({
    route_id: 'stepfun:flash',
    label: 'StepFun 3.7 Flash',
    provider: 'stepfun',
    model: () => 'step-3.7-flash',
    api_key: () => process.env.STEPFUN_API_KEY || '',
    endpoint: () => 'https://api.stepfun.ai/v1/chat/completions',
    lineage: Object.freeze({ kind: 'external-route', native_wayglass: false }),
    data_policy: Object.freeze({
      provider_recording: 'not-independently-verified',
      raw_user_linked_retention: 'not-independently-verified',
      training_use: 'not-independently-verified',
      research_access_zero_retention: null,
      policy_url: 'https://platform.stepfun.ai/',
    }),
    capabilities: Object.freeze({
      text: true, image: false, video: false, streaming: false, realtime: false,
      tools: false, trainable: false, local: false,
    }),
    upstream_capabilities: Object.freeze({ text: true, image: true, video: true, tools: true }),
  }),
  'stepfun:step5': Object.freeze({
    route_id: 'stepfun:step5',
    label: 'StepFun 5 Preview',
    provider: 'stepfun',
    model: () => 'step-5-preview',
    api_key: () => process.env.STEPFUN_API_KEY || '',
    endpoint: () => 'https://api.stepfun.ai/v1/chat/completions',
    lineage: Object.freeze({ kind: 'external-preview-route', native_wayglass: false }),
    data_policy: Object.freeze({
      provider_recording: 'not-independently-verified',
      raw_user_linked_retention: 'not-independently-verified',
      training_use: 'not-independently-verified',
      research_access_zero_retention: null,
      policy_url: 'https://platform.stepfun.ai/',
    }),
    capabilities: Object.freeze({
      text: true, image: false, video: false, streaming: false, realtime: false,
      tools: false, trainable: false, local: false, preview: true,
    }),
    upstream_capabilities: Object.freeze({ text: true, image: true, video: true, tools: true }),
  }),
  'hf:inference': Object.freeze({
    route_id: 'hf:inference',
    label: 'Hugging Face Inference',
    provider: 'huggingface',
    model: () => process.env.WAYGLASS_HF_MODEL || 'openai/gpt-oss-120b:fastest',
    api_key: () => process.env.HF_TOKEN || '',
    endpoint: () => 'https://router.huggingface.co/v1/chat/completions',
    lineage: Object.freeze({ kind: 'external-route', native_wayglass: false }),
    capabilities: Object.freeze({ text: true, streaming: false, realtime: false, tools: false, trainable: false }),
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
  return Object.values(ROUTES).map((route) => {
    const configured = typeof route.configured === 'function'
      ? Boolean(route.configured())
      : route.provider === 'ollama' || route.provider === 'openai-compatible' || Boolean(route.api_key?.());
    return Object.freeze({
      route_id: route.route_id,
      label: route.label,
      provider: route.provider,
      participant_id: route.participant_id || null,
      continuity_id: route.continuity_id || null,
      candidate_id: route.candidate_id || null,
      environment: route.environment || null,
      model: route.model(),
      configured,
      connection_verified: false,
      configuration_message: configured
        ? 'Route configuration is present; connection not yet verified.'
        : 'Provider credentials missing in Hearthgate.',
      lineage: route.lineage || null,
      capabilities: route.capabilities,
      upstream_capabilities: route.upstream_capabilities || null,
      data_policy: route.data_policy || null,
    });
  });
}

function wayglassRouteIds() {
  return Object.keys(ROUTES);
}

module.exports = {
  parseSpicyChatChatLink,
  resolveWayglassRoute,
  publicWayglassRoutes,
  wayglassRouteIds,
};
