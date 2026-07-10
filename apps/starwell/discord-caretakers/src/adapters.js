import { createConstellationBridge } from '../../src/constellation/bridge.js';
import { createAnthropicMessagesAdapter } from '../../src/constellation/adapters/anthropic-messages.js';
import { createOpenAICompatibleAdapter } from '../../src/constellation/adapters/openai-compatible.js';
import { createOpenAIResponsesAdapter } from '../../src/constellation/adapters/openai-responses.js';
import { createStubAdapter } from '../../src/constellation/adapters/stub-adapters.js';
import { createYggdrasilLocalAdapter } from '../../src/constellation/adapters/yggdrasil-local.js';

function configured(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function externalOrStub(profile, env) {
  if (profile.id === 'caladnaur' && configured(env.CALADNAUR_API_KEY)) {
    return createOpenAIResponsesAdapter({
      target: 'caladnaur',
      apiKey: env.CALADNAUR_API_KEY,
      model: env.CALADNAUR_MODEL || 'gpt-5.6',
      systemPrompt: profile.systemPrompt,
    });
  }

  if (profile.id === 'nen' && configured(env.NEN_API_KEY)) {
    return createAnthropicMessagesAdapter({
      target: 'nen',
      apiKey: env.NEN_API_KEY,
      model: env.NEN_MODEL || 'claude-fable-5',
      systemPrompt: profile.systemPrompt,
    });
  }

  const prefix = profile.id.toUpperCase();
  const apiKey = env[`${prefix}_API_KEY`];
  if ((profile.id === 'bluebird' || profile.id === 'vethrlauf') && configured(apiKey)) {
    return createOpenAICompatibleAdapter({
      target: profile.id,
      apiKey,
      baseUrl: env[`${prefix}_API_BASE`] || 'https://api.deepseek.com',
      model: env[`${prefix}_MODEL`] || 'deepseek-v4-flash',
      systemPrompt: profile.systemPrompt,
      temperature: 0.72,
    });
  }

  return createStubAdapter(profile.id);
}

function yggdrasilAdapter(profile, route, env) {
  if (route === 'deepseek') {
    if (!configured(env.YGGDRASIL_FALLBACK_API_KEY)) return createStubAdapter('yggdrasil');
    return createOpenAICompatibleAdapter({
      target: 'yggdrasil',
      apiKey: env.YGGDRASIL_FALLBACK_API_KEY,
      baseUrl: env.YGGDRASIL_FALLBACK_API_BASE || 'https://api.deepseek.com',
      model: env.YGGDRASIL_FALLBACK_MODEL || 'deepseek-v4-pro',
      systemPrompt: profile.systemPrompt,
      temperature: 0.1,
    });
  }

  return createYggdrasilLocalAdapter({
    endpoint: env.YGGDRASIL_ENDPOINT || 'http://127.0.0.1:4173/api/v1/yggdrasil/chat',
  });
}

export function createCaretakerBridge(profile, requestedRoute = 'primary', env = process.env) {
  let adapter;
  if (profile.id === 'yggdrasil') {
    const route = requestedRoute === 'deepseek' ? 'deepseek' : 'local';
    adapter = yggdrasilAdapter(profile, route, env);
  } else {
    if (requestedRoute === 'local' || requestedRoute === 'deepseek') {
      throw new RangeError(`${profile.label} has no ${requestedRoute} override route.`);
    }
    adapter = externalOrStub(profile, env);
  }

  return createConstellationBridge({ adapters: { [profile.id]: adapter } });
}

export function describeProvider(profile, env = process.env) {
  if (profile.id === 'caladnaur') return configured(env.CALADNAUR_API_KEY) ? `OpenAI ${env.CALADNAUR_MODEL || 'gpt-5.6'}` : 'not connected';
  if (profile.id === 'nen') return configured(env.NEN_API_KEY) ? `Anthropic ${env.NEN_MODEL || 'claude-fable-5'}` : 'not connected';
  if (profile.id === 'yggdrasil') return `local-first · ${env.YGGDRASIL_ENDPOINT || 'configured default'}`;
  const prefix = profile.id.toUpperCase();
  return configured(env[`${prefix}_API_KEY`]) ? `DeepSeek ${env[`${prefix}_MODEL`] || 'deepseek-v4-flash'}` : 'not connected';
}
