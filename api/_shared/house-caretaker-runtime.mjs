import caretakerContract from '../../apps/starwell-server/caretaker/contract.js';
import {
  authoriseHouseRequest,
  validateSupabaseStewardToken,
} from '../../netlify/functions/_shared/house-session.mjs';

const {
  DEFAULT_MODEL,
  PLAN_SCHEMA,
  STATUS_SCHEMA,
  RESPONSE_SCHEMA,
  ALLOWED_ACTIONS,
} = caretakerContract;

export const DEFAULT_CARETAKER_MODEL = DEFAULT_MODEL;
export const DEFAULT_CARETAKER_HOSTED_MODEL = 'zai-org/GLM-5.3-Flash';
export const CARETAKER_PLAN_SCHEMA = PLAN_SCHEMA;
export const CARETAKER_GITHUB_PAGES_ORIGIN = 'https://singsenochian.github.io';

const HF_ROUTER = 'https://router.huggingface.co/v1';

function cleanBase(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function csv(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function bearer(request) {
  const header = request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function requestOrigin(request) {
  return String(request.headers.get('origin') || '').trim();
}

export function caretakerBrowserOriginAllowed(request, env) {
  const origin = requestOrigin(request);
  if (!origin) return false;
  try {
    if (origin === new URL(request.url).origin) return true;
  } catch {}
  if (origin === CARETAKER_GITHUB_PAGES_ORIGIN) return true;
  return csv(env.get('ARCSWEEP_CARETAKER_BROWSER_ORIGINS')).includes(origin);
}

function corsHeaders(request, env) {
  const origin = requestOrigin(request);
  if (!origin || !caretakerBrowserOriginAllowed(request, env)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '600',
    vary: 'Origin',
  };
}

function json(request, env, status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...corsHeaders(request, env),
      ...headers,
    },
  });
}

function hostedCredential(env) {
  return String(env.get('HF_TOKEN') || env.get('HFTOKEN') || '').trim();
}

function runtimeConfig(env) {
  const model = env.get('MODEL_ARCSWEEP_CARETAKER') || DEFAULT_CARETAKER_MODEL;
  const hostedModel = env.get('MODEL_ARCSWEEP_CARETAKER_HOSTED') || DEFAULT_CARETAKER_HOSTED_MODEL;
  const hostedToken = hostedCredential(env);
  const gatewayUrl = cleanBase(env.get('HEARTHGATE_GATEWAY_URL'));
  const gatewayToken = String(env.get('HEARTHGATE_GATEWAY_TOKEN') || '').trim();
  const explicitDirect = cleanBase(env.get('OLLAMA_URL_CARETAKER') || env.get('OLLAMA_ENDPOINT'));
  const directEndpoint = explicitDirect || (!env.get('VERCEL') ? 'http://127.0.0.1:11434' : '');
  const gatewayConfigured = Boolean(gatewayUrl && gatewayToken);
  const hostedConfigured = Boolean(hostedToken && hostedModel);
  return {
    model,
    hostedModel,
    hostedToken,
    hostedConfigured,
    gatewayUrl,
    gatewayToken,
    gatewayConfigured,
    directEndpoint,
  };
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

async function gatewayStatus(config, fetchImpl) {
  try {
    const response = await fetchImpl(`${config.gatewayUrl}/api/v1/house/caretaker/status`, {
      headers: { authorization: `Bearer ${config.gatewayToken}` },
      signal: AbortSignal.timeout(5000),
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
      execution_path: 'hearthgate-gateway',
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
      execution_path: 'hearthgate-gateway',
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
      execution_path: 'direct-ollama',
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
      execution_path: 'direct-ollama',
      missing: ['OLLAMA_REACHABLE'],
      error: error?.message || String(error),
    };
  }
}

function hostedStatus(config, fallbackFrom = null) {
  return {
    provider: 'huggingface-inference-providers',
    configured: config.hostedConfigured,
    gateway_configured: config.gatewayConfigured,
    runtime_reachable: config.hostedConfigured,
    model_available: config.hostedConfigured,
    installed_count: null,
    model: config.hostedModel,
    execution_path: 'huggingface-hosted-fallback',
    fallback_from: fallbackFrom,
    missing: config.hostedConfigured ? [] : ['HF_TOKEN|HFTOKEN'],
    error: null,
  };
}

async function runtimeStatus(config, fetchImpl = fetch) {
  if (config.gatewayConfigured) {
    const primary = await gatewayStatus(config, fetchImpl);
    if (primary.configured) return { ...primary, hosted_fallback: hostedStatus(config) };
    if (config.hostedConfigured) return { ...hostedStatus(config, 'hearthgate-gateway'), primary_error: primary.error };
    return primary;
  }
  if (config.directEndpoint) {
    const primary = await directStatus(config, fetchImpl);
    if (primary.configured && primary.model_available) return { ...primary, hosted_fallback: hostedStatus(config) };
    if (config.hostedConfigured) return { ...hostedStatus(config, 'direct-ollama'), primary_error: primary.error };
    return primary;
  }
  if (config.hostedConfigured) return hostedStatus(config, 'no-primary-runtime');
  return {
    provider: 'unconfigured',
    configured: false,
    gateway_configured: false,
    runtime_reachable: false,
    model_available: false,
    installed_count: null,
    model: config.model,
    execution_path: null,
    missing: ['HEARTHGATE_GATEWAY_URL|OLLAMA_ENDPOINT', 'HF_TOKEN|HFTOKEN'],
    error: 'Caretaker has no available model execution path.',
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
    execution_path: 'hearthgate-gateway',
    fallback_from: null,
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
    execution_path: 'direct-ollama',
    fallback_from: null,
  };
}

async function invokeHosted(config, message, fetchImpl, fallbackFrom = null) {
  if (!config.hostedConfigured) throw new Error('Caretaker hosted fallback is not configured.');
  const response = await fetchImpl(`${HF_ROUTER}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.hostedToken}`,
    },
    body: JSON.stringify({
      model: config.hostedModel,
      max_tokens: 900,
      temperature: 0.3,
      stream: false,
      messages: [
        { role: 'system', content: caretakerContract.SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
    }),
    signal: AbortSignal.timeout(90000),
  });
  const data = await readJson(response);
  if (!response.ok) {
    const detail = data.error?.message || data.error || data.message || 'provider rejected request';
    throw new Error(`Caretaker Hugging Face ${response.status}: ${detail}`);
  }
  const content = String(data.choices?.[0]?.message?.content || '').trim();
  if (!content) throw new Error('Caretaker hosted model returned an empty response.');
  return {
    message: content,
    provider: 'huggingface-inference-providers',
    model: config.hostedModel,
    execution_path: 'huggingface-hosted-fallback',
    fallback_from: fallbackFrom,
  };
}

async function invoke(config, message, fetchImpl = fetch) {
  let primaryError = null;
  if (config.gatewayConfigured) {
    try { return await invokeGateway(config, message, fetchImpl); }
    catch (error) { primaryError = error; }
  } else if (config.directEndpoint) {
    try { return await invokeDirect(config, message, fetchImpl); }
    catch (error) { primaryError = error; }
  }

  if (config.hostedConfigured) {
    const fallbackFrom = config.gatewayConfigured ? 'hearthgate-gateway' : config.directEndpoint ? 'direct-ollama' : 'no-primary-runtime';
    return invokeHosted(config, message, fetchImpl, fallbackFrom);
  }

  if (primaryError) throw primaryError;
  throw new Error('Caretaker has no configured model execution path.');
}

export async function authoriseCaretakerRequest(request, env, fetchImpl = fetch) {
  const house = authoriseHouseRequest(request, env);
  if (house) return house;
  if (!caretakerBrowserOriginAllowed(request, env)) return null;
  const token = bearer(request);
  if (!token) return null;
  const valid = await validateSupabaseStewardToken(token, env, fetchImpl);
  return valid ? { mode: 'supabase-bearer', claims: { role: 'steward' } } : null;
}

export function createHouseCaretakerHandler({ env, fetchImpl = fetch }) {
  return async function handleCaretaker(request) {
    if (request.method === 'OPTIONS') {
      if (!caretakerBrowserOriginAllowed(request, env)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    const authorisation = await authoriseCaretakerRequest(request, env, fetchImpl);
    if (!authorisation) return json(request, env, 401, { error: 'ArcSweep Steward sign-in required.' });
    const config = runtimeConfig(env);

    if (request.method === 'GET') {
      const status = await runtimeStatus(config, fetchImpl);
      return json(request, env, 200, {
        schema: STATUS_SCHEMA,
        role: 'house-intelligence',
        provider: status.provider,
        model: status.model,
        default_model: DEFAULT_CARETAKER_MODEL,
        hosted_model: config.hostedModel,
        source_model: 'DavidAU/Gemma-The-Writer-Mighty-Sword-9B-GGUF',
        action_schema: CARETAKER_PLAN_SCHEMA,
        allowed_actions: [...ALLOWED_ACTIONS],
        configured: status.configured,
        gateway_configured: status.gateway_configured,
        runtime_reachable: status.runtime_reachable,
        model_available: status.model_available,
        installed_count: status.installed_count,
        execution_path: status.execution_path || null,
        fallback_from: status.fallback_from || null,
        hosted_fallback: status.hosted_fallback || null,
        missing: status.missing,
        runtime_error: status.error || status.primary_error || null,
        auth_mode: authorisation.mode,
      });
    }

    if (request.method !== 'POST') return json(request, env, 405, { error: 'Method not allowed.' });

    const body = await request.json().catch(() => null);
    const message = String(body?.message || '').trim();
    if (!message) return json(request, env, 400, { error: 'message required' });
    if (message.length > 24000) return json(request, env, 413, { error: 'Caretaker request is too large.' });

    try {
      const started = Date.now();
      const result = await invoke(config, message, fetchImpl);
      return json(request, env, 200, {
        schema: RESPONSE_SCHEMA,
        role: 'house-intelligence',
        provider: result.provider,
        model: result.model,
        action_schema: CARETAKER_PLAN_SCHEMA,
        message: result.message,
        latency_ms: Date.now() - started,
        execution_path: result.execution_path || null,
        fallback_from: result.fallback_from || null,
        auth_mode: authorisation.mode,
        runtime_braid: null,
      });
    } catch (error) {
      return json(request, env, 502, {
        schema: RESPONSE_SCHEMA,
        role: 'house-intelligence',
        provider: config.hostedConfigured ? 'huggingface-inference-providers' : config.gatewayConfigured ? 'hearthgate-gateway' : 'ollama',
        model: config.hostedConfigured ? config.hostedModel : config.model,
        error: error?.message || String(error),
      });
    }
  };
}
