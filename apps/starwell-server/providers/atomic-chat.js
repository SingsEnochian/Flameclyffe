'use strict';

const DEFAULT_BASE_URL = 'http://127.0.0.1:1337/v1';
const DEFAULT_HEALTH_TIMEOUT_MS = 2500;
const DEFAULT_CHAT_TIMEOUT_MS = 60000;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

class AtomicChatError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'AtomicChatError';
    this.code = options.code || 'ATOMIC_CHAT_ERROR';
    this.status = options.status || null;
    this.cause = options.cause;
  }
}

function normalizeBaseUrl(value = DEFAULT_BASE_URL, allowLan = false) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    throw new AtomicChatError('Atomic Chat base URL is invalid.', {
      code: 'ATOMIC_CHAT_INVALID_URL',
      cause: error,
    });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AtomicChatError('Atomic Chat base URL must use http or https.', {
      code: 'ATOMIC_CHAT_INVALID_PROTOCOL',
    });
  }

  if (parsed.username || parsed.password) {
    throw new AtomicChatError('Credentials are not permitted in the Atomic Chat base URL.', {
      code: 'ATOMIC_CHAT_URL_CREDENTIALS_FORBIDDEN',
    });
  }

  if (!allowLan && !LOOPBACK_HOSTS.has(parsed.hostname)) {
    throw new AtomicChatError(
      'Atomic Chat must remain on loopback unless ATOMIC_CHAT_ALLOW_LAN=true is explicitly set.',
      { code: 'ATOMIC_CHAT_NON_LOOPBACK_FORBIDDEN' },
    );
  }

  parsed.search = '';
  parsed.hash = '';
  let pathname = parsed.pathname.replace(/\/+$/, '');
  if (!pathname || pathname === '/') pathname = '/v1';
  if (!pathname.endsWith('/v1')) pathname = `${pathname}/v1`.replace(/\/+/g, '/');
  parsed.pathname = pathname;
  return parsed.toString().replace(/\/$/, '');
}

function readJsonResponse(response, source) {
  return response.text().then((text) => {
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new AtomicChatError(`${source} returned invalid JSON.`, {
        code: 'ATOMIC_CHAT_INVALID_JSON',
        status: response.status,
        cause: error,
      });
    }
  });
}

function safeErrorMessage(data, fallback) {
  const candidate = data?.error?.message ?? data?.error ?? data?.message;
  if (typeof candidate !== 'string' || candidate.length === 0) return fallback;
  return candidate.slice(0, 500);
}

function createAtomicChatClient(options = {}) {
  const allowLan = options.allowLan ?? process.env.ATOMIC_CHAT_ALLOW_LAN === 'true';
  const baseUrl = normalizeBaseUrl(
    options.baseUrl || process.env.ATOMIC_CHAT_BASE_URL || DEFAULT_BASE_URL,
    allowLan,
  );
  const apiKey = options.apiKey ?? process.env.ATOMIC_CHAT_API_KEY ?? '';
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const healthTimeoutMs = Number(options.healthTimeoutMs || DEFAULT_HEALTH_TIMEOUT_MS);
  const chatTimeoutMs = Number(options.chatTimeoutMs || DEFAULT_CHAT_TIMEOUT_MS);

  if (typeof fetchImpl !== 'function') {
    throw new AtomicChatError('A fetch implementation is required.', {
      code: 'ATOMIC_CHAT_FETCH_UNAVAILABLE',
    });
  }

  async function request(pathname, init = {}, timeoutMs = healthTimeoutMs) {
    const headers = new Headers(init.headers || {});
    headers.set('Accept', 'application/json');
    if (init.body != null) headers.set('Content-Type', 'application/json');
    if (apiKey) headers.set('Authorization', `Bearer ${apiKey}`);

    let response;
    try {
      response = await fetchImpl(`${baseUrl}${pathname}`, {
        ...init,
        headers,
        signal: init.signal || AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const code = error?.name === 'TimeoutError' || error?.name === 'AbortError'
        ? 'ATOMIC_CHAT_TIMEOUT'
        : 'ATOMIC_CHAT_UNREACHABLE';
      throw new AtomicChatError(
        code === 'ATOMIC_CHAT_TIMEOUT'
          ? `Atomic Chat did not respond within ${timeoutMs} ms.`
          : 'Atomic Chat is not reachable on the configured endpoint.',
        { code, cause: error },
      );
    }

    const data = await readJsonResponse(response, `Atomic Chat ${pathname}`);
    if (!response.ok) {
      throw new AtomicChatError(
        safeErrorMessage(data, `Atomic Chat returned HTTP ${response.status}.`),
        {
          code: 'ATOMIC_CHAT_HTTP_ERROR',
          status: response.status,
        },
      );
    }
    return data;
  }

  async function listModels() {
    const data = await request('/models', { method: 'GET' }, healthTimeoutMs);
    const source = Array.isArray(data.data)
      ? data.data
      : Array.isArray(data.models)
        ? data.models
        : [];
    return source
      .map((item) => {
        if (typeof item === 'string') return { id: item };
        if (!item || typeof item !== 'object') return null;
        const id = item.id || item.name || item.model;
        if (!id) return null;
        return {
          id: String(id),
          ownedBy: item.owned_by || item.ownedBy || null,
          object: item.object || 'model',
        };
      })
      .filter(Boolean);
  }

  async function health() {
    const started = performance.now();
    try {
      const models = await listModels();
      return {
        ok: true,
        provider: 'atomic-chat',
        baseUrl,
        latencyMs: Math.round(performance.now() - started),
        modelCount: models.length,
        models,
      };
    } catch (error) {
      return {
        ok: false,
        provider: 'atomic-chat',
        baseUrl,
        latencyMs: Math.round(performance.now() - started),
        modelCount: 0,
        models: [],
        error: {
          code: error.code || 'ATOMIC_CHAT_ERROR',
          message: error.message,
          status: error.status || null,
        },
      };
    }
  }

  async function chat(input = {}) {
    const model = String(input.model || '').trim();
    if (!model) {
      throw new AtomicChatError('A loaded Atomic Chat model id is required.', {
        code: 'ATOMIC_CHAT_MODEL_REQUIRED',
      });
    }

    if (!Array.isArray(input.messages) || input.messages.length === 0) {
      throw new AtomicChatError('At least one chat message is required.', {
        code: 'ATOMIC_CHAT_MESSAGES_REQUIRED',
      });
    }

    const messages = input.messages.map((message, index) => {
      if (!message || typeof message !== 'object') {
        throw new AtomicChatError(`Message ${index} is invalid.`, {
          code: 'ATOMIC_CHAT_INVALID_MESSAGE',
        });
      }
      const role = String(message.role || 'user');
      const content = typeof message.content === 'string' ? message.content : '';
      if (!['system', 'developer', 'user', 'assistant', 'tool'].includes(role)) {
        throw new AtomicChatError(`Message ${index} has unsupported role ${role}.`, {
          code: 'ATOMIC_CHAT_INVALID_ROLE',
        });
      }
      if (!content) {
        throw new AtomicChatError(`Message ${index} has no text content.`, {
          code: 'ATOMIC_CHAT_EMPTY_MESSAGE',
        });
      }
      return { role, content };
    });

    const body = {
      model,
      messages,
      stream: false,
      max_tokens: Math.max(1, Math.min(32768, Number(input.maxTokens || 2048))),
    };
    if (Number.isFinite(Number(input.temperature))) {
      body.temperature = Math.max(0, Math.min(2, Number(input.temperature)));
    }
    if (Array.isArray(input.tools) && input.tools.length > 0) body.tools = input.tools;
    if (input.toolChoice != null) body.tool_choice = input.toolChoice;

    const data = await request(
      '/chat/completions',
      { method: 'POST', body: JSON.stringify(body) },
      Number(input.timeoutMs || chatTimeoutMs),
    );
    const choice = data.choices?.[0] || {};
    return {
      id: data.id || null,
      provider: 'atomic-chat',
      model: data.model || model,
      text: choice.message?.content || choice.text || '',
      message: choice.message || null,
      finishReason: choice.finish_reason || null,
      usage: data.usage || null,
    };
  }

  return {
    provider: 'atomic-chat',
    baseUrl,
    health,
    listModels,
    chat,
  };
}

module.exports = {
  AtomicChatError,
  DEFAULT_BASE_URL,
  createAtomicChatClient,
  normalizeBaseUrl,
};
