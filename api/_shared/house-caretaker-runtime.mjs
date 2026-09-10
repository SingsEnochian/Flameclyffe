import caretakerContract from '../../apps/starwell-server/caretaker/contract.js';
import { authoriseHouseRequest } from '../../netlify/functions/_shared/house-session.mjs';

const {
  DEFAULT_MODEL,
  PLAN_SCHEMA,
  STATUS_SCHEMA,
  RESPONSE_SCHEMA,
  ALLOWED_ACTIONS,
} = caretakerContract;

export const DEFAULT_CARETAKER_MODEL = DEFAULT_MODEL;
export const CARETAKER_PLAN_SCHEMA = PLAN_SCHEMA;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function cleanBase(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function runtimeConfig(env) {
  const model = env.get('MODEL_ARCSWEEP_CARETAKER') || DEFAULT_CARETAKER_MODEL;
  const gatewayUrl = cleanBase(env.get('HEARTHGATE_GATEWAY_URL'));
  const gatewayToken = String(env.get('HEARTHGATE_GATEWAY_TOKEN') || '').trim();
  const explicitDirect = cleanBase(env.get('OLLAMA_URL_CARETAKER') || env.get('OLLAMA_ENDPOINT'));
  const directEndpoint = explicitDirect || (!env.get('VERCEL') ? 'http://127.0.0.1:11434' : '');
  const gatewayConfigured = Boolean(gatewayUrl && gatewayToken);
  return { model, gatewayUrl, gatewayToken, gatewayConfigured, directEndpoint };
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

async function gatewayStatus(config, fetchImpl) {
  try {
    const response = await fetchImpl(`${config.gatewayUrl}/api/v1/house/caretaker/status`, {
      headers: { authorization: `Bearer ${config.gatewayToken}` },
      signal: AbortSignal.timeout(10000),
    });
    const body = await readJson(response);
    if (!response.ok) throw new Error(body.error || `Hearthgate gateway ${response.status}`);
    return {
      provider: 'hearthgate-gateway',
      configured: body.runtime_reachable === true && body.model_available === true,
      gateway_configured: true,
      runtime_reachable: body.runtime_reachable === true,
      model_available: body.model_available === true,
      installed_count: body.installed_count ?? null,
      model: body.model || config.model,
      missing: body.model_available === true ? [] : (body.missing || [`OLLAMA_MODEL:${body.model || config.model}`]),
      error: body.runtime_error || body.error || null,
    };
  } catch (error) {
    return {
      provider: 'hearthgate-gateway',
      configured: false,
      gateway_configured: true,
      runtime_reachable: false,
      model_available: false,
      installed_count: null,
      model: config.model,
      missing: ['HEARTHGATE_GATEWAY_REACHABLE'],
      error: error?.message || String(error),
    };
  }
}

async function directStatus(config, fetchImpl) {
  try {
    const response = await fetchImpl(`${config.directEndpoint}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Ollama ${response.status}`);
    const body = await readJson(response);
    const installed = (body.models || []).flatMap((item) => [item.name, item.model]).filter(Boolean);
    return {
      provider: 'ollama',
      configured: true,
      gateway_configured: false,
      runtime_reachable: true,
      model_available: installed.includes(config.model),
      installed_count: installed.length,
      model: config.model,
      missing: installed.includes(config.model) ? [] : [`OLLAMA_MODEL:${config.model}`],
      error: null,
    };
  } catch (error) {
    return {
      provider: 'ollama',
      configured: false,
      gateway_configured: false,
      runtime_reachable: false,
      model_available: false,
      installed_count: null,
      model: config.model,
      missing: ['OLLAMA_REACHABLE'],
      error: error?.message || String(error),
    };
  }
}

async function runtimeStatus(config, fetchImpl = fetch) {
  if (config.gatewayConfigured) return gatewayStatus(config, fetchImpl);
  if (config.directEndpoint) return directStatus(config, fetchImpl);
  return {
    provider: 'hearthgate-gateway',
    configured: false,
    gateway_configured: false,
    runtime_reachable: false,
    model_available: false,
    installed_count: null,
    model: config.model,
    missing: ['HEARTHGATE_GATEWAY_URL', 'HEARTHGATE_GATEWAY_TOKEN'],
    error: 'Caretaker has no hosted Hearthgate gateway configuration.',
  };
}

async function invokeGateway(config, message, fetchImpl) {
  const response = await fetchImpl(`${config.gatewayUrl}/api/v1/house/caretaker/chat`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.gatewayToken}`,
    },
    body: JSON.stringify({ message }),
    signal: AbortSignal.timeout(120000),
  });
  const body = await readJson(response);
  if (!response.ok) throw new Error(`Caretaker Hearthgate gateway ${response.status}: ${body.error || 'gateway rejected request'}`);
  return {
    message: String(body.message || '').trim(),
    provider: body.provider || 'hearthgate-gateway',
    model: body.model || config.model,
  };
}

async function invokeDirect(config, message, fetchImpl) {
  const response = await fetchImpl(`${config.directEndpoint}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      stream: false,
      format: 'json',
      messages: [
        { role: 'system', content: caretakerContract.SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      options: { temperature: 0.35 },
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Caretaker Ollama ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ''}`);
  }
  const body = await readJson(response);
  return {
    message: String(body.message?.content || '').trim(),
    provider: 'ollama',
    model: config.model,
  };
}

async function invoke(config, message, fetchImpl = fetch) {
  if (config.gatewayConfigured) return invokeGateway(config, message, fetchImpl);
  if (config.directEndpoint) return invokeDirect(config, message, fetchImpl);
  throw new Error('Caretaker has no configured Hearthgate gateway or direct Ollama endpoint.');
}

export function createHouseCaretakerHandler({ env, fetchImpl = fetch }) {
  return async function handleCaretaker(request) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'House Runtime session required.' });
    const config = runtimeConfig(env);

    if (request.method === 'GET') {
      const status = await runtimeStatus(config, fetchImpl);
      return json(200, {
        schema: STATUS_SCHEMA,
        role: 'house-intelligence',
        provider: status.provider,
        model: status.model,
        default_model: DEFAULT_CARETAKER_MODEL,
        source_model: 'DavidAU/Gemma-The-Writer-Mighty-Sword-9B-GGUF',
        action_schema: CARETAKER_PLAN_SCHEMA,
        allowed_actions: [...ALLOWED_ACTIONS],
        configured: status.configured,
        gateway_configured: status.gateway_configured,
        runtime_reachable: status.runtime_reachable,
        model_available: status.model_available,
        installed_count: status.installed_count,
        missing: status.missing,
        runtime_error: status.error,
      });
    }

    if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });

    const body = await request.json().catch(() => null);
    const message = String(body?.message || '').trim();
    if (!message) return json(400, { error: 'message required' });
    if (message.length > 24000) return json(413, { error: 'Caretaker request is too large.' });

    try {
      const started = Date.now();
      const result = await invoke(config, message, fetchImpl);
      return json(200, {
        schema: RESPONSE_SCHEMA,
        role: 'house-intelligence',
        provider: result.provider,
        model: result.model,
        action_schema: CARETAKER_PLAN_SCHEMA,
        message: result.message,
        latency_ms: Date.now() - started,
        runtime_braid: null,
      });
    } catch (error) {
      return json(502, {
        schema: RESPONSE_SCHEMA,
        role: 'house-intelligence',
        provider: config.gatewayConfigured ? 'hearthgate-gateway' : 'ollama',
        model: config.model,
        error: error?.message || String(error),
      });
    }
  };
}
