export const AIOS_KERNEL_BRIDGE_SCHEMA = 'hearthweave.aios-kernel-bridge/v0.1';
export const AIOS_KERNEL_SNAPSHOT_SCHEMA = 'hearthweave.aios-kernel-snapshot/v0.1';
export const AIOS_KERNEL_CONFIG_KEY = 'arcsweep.aios-kernel-bridge.v0.1';
export const DEFAULT_AIOS_KERNEL_URL = 'http://127.0.0.1:8000';

const QUERY_TYPES = new Set(['llm', 'tool', 'storage', 'memory']);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function text(value) {
  return String(value ?? '').trim();
}

function nowIso() {
  return new Date().toISOString();
}

export function normaliseAIOSKernelUrl(value = DEFAULT_AIOS_KERNEL_URL) {
  const raw = text(value) || DEFAULT_AIOS_KERNEL_URL;
  let url;
  try {
    url = new URL(raw, globalThis.location?.href || undefined);
  } catch {
    throw new TypeError(`Invalid AIOS kernel URL: ${raw}`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new TypeError(`AIOS kernel URL must use http or https: ${url.protocol}`);
  }
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

export function isLoopbackAIOSKernelUrl(value) {
  const url = new URL(normaliseAIOSKernelUrl(value));
  return LOOPBACK_HOSTS.has(url.hostname);
}

export function classifyAIOSKernelAccess(value, pageLocation = globalThis.location) {
  const baseUrl = normaliseAIOSKernelUrl(value);
  const url = new URL(baseUrl);
  const loopback = LOOPBACK_HOSTS.has(url.hostname);
  const pageProtocol = pageLocation?.protocol || '';
  if (loopback) return Object.freeze({ baseUrl, mode: 'local-direct', allowed: true, loopback: true });
  if (url.protocol === 'https:') return Object.freeze({ baseUrl, mode: 'remote-https', allowed: true, loopback: false });
  if (pageProtocol === 'http:' && url.protocol === 'http:') {
    return Object.freeze({ baseUrl, mode: 'remote-http-development', allowed: true, loopback: false });
  }
  return Object.freeze({
    baseUrl,
    mode: 'blocked-insecure-remote',
    allowed: false,
    loopback: false,
    reason: 'Remote AIOS kernels must use HTTPS. Plain HTTP is allowed only for loopback or HTTP development pages.',
  });
}

export function loadAIOSKernelConfig(storage = globalThis.localStorage) {
  const fallback = Object.freeze({
    schema: AIOS_KERNEL_BRIDGE_SCHEMA,
    baseUrl: DEFAULT_AIOS_KERNEL_URL,
    enabled: true,
    pollMs: 30_000,
  });
  try {
    const stored = JSON.parse(storage?.getItem?.(AIOS_KERNEL_CONFIG_KEY) || 'null');
    if (!stored || typeof stored !== 'object') return fallback;
    return Object.freeze({
      schema: AIOS_KERNEL_BRIDGE_SCHEMA,
      baseUrl: normaliseAIOSKernelUrl(stored.baseUrl || fallback.baseUrl),
      enabled: stored.enabled !== false,
      pollMs: Math.max(10_000, Math.min(120_000, Number(stored.pollMs) || fallback.pollMs)),
    });
  } catch {
    return fallback;
  }
}

export function saveAIOSKernelConfig(next = {}, storage = globalThis.localStorage) {
  const current = loadAIOSKernelConfig(storage);
  const value = Object.freeze({
    schema: AIOS_KERNEL_BRIDGE_SCHEMA,
    baseUrl: normaliseAIOSKernelUrl(next.baseUrl || current.baseUrl),
    enabled: next.enabled ?? current.enabled,
    pollMs: Math.max(10_000, Math.min(120_000, Number(next.pollMs) || current.pollMs)),
  });
  try {
    storage?.setItem?.(AIOS_KERNEL_CONFIG_KEY, JSON.stringify(value));
  } catch {}
  return value;
}

function finiteTimeout(signal, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('AIOS request timed out', 'TimeoutError')), timeoutMs);
  const onAbort = () => controller.abort(signal.reason);
  signal?.addEventListener?.('abort', onAbort, { once: true });
  return {
    signal: controller.signal,
    done() {
      clearTimeout(timer);
      signal?.removeEventListener?.('abort', onAbort);
    },
  };
}

function safeError(error) {
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') return 'AIOS kernel did not answer before the request deadline.';
  return text(error?.message || error || 'AIOS kernel request failed.');
}

export function createAIOSKernelBridge({
  baseUrl = DEFAULT_AIOS_KERNEL_URL,
  fetchImpl = globalThis.fetch?.bind(globalThis),
  timeoutMs = 3_500,
  pageLocation = globalThis.location,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('AIOS kernel bridge requires fetch.');
  const access = classifyAIOSKernelAccess(baseUrl, pageLocation);

  async function request(path, { method = 'GET', body = null, signal = null, timeout = timeoutMs } = {}) {
    if (!access.allowed) throw new Error(access.reason || 'AIOS kernel endpoint is not allowed.');
    const bounded = finiteTimeout(signal, Math.max(500, Number(timeout) || timeoutMs));
    try {
      const response = await fetchImpl(`${access.baseUrl}${path}`, {
        method,
        headers: body == null ? { accept: 'application/json' } : {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: body == null ? undefined : JSON.stringify(body),
        signal: bounded.signal,
        cache: 'no-store',
      });
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok) {
        const detail = payload?.detail?.message || payload?.detail || payload?.message || `HTTP ${response.status}`;
        throw new Error(`AIOS ${method} ${path} failed: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
      }
      return payload;
    } finally {
      bounded.done();
    }
  }

  async function snapshot() {
    const fetchedAt = nowIso();
    if (!access.allowed) {
      return Object.freeze({
        schema: AIOS_KERNEL_SNAPSHOT_SCHEMA,
        state: 'blocked',
        reachable: false,
        access,
        components: {},
        llms: [],
        processes: [],
        fetchedAt,
        message: access.reason,
      });
    }

    const settled = await Promise.allSettled([
      request('/status'),
      request('/core/status'),
      request('/core/llms/list'),
      request('/agents/ps'),
    ]);
    const [statusResult, coreResult, llmsResult, processResult] = settled;
    const reachable = settled.some((result) => result.status === 'fulfilled');
    const status = statusResult.status === 'fulfilled' ? statusResult.value : null;
    const components = coreResult.status === 'fulfilled' && coreResult.value && typeof coreResult.value === 'object'
      ? coreResult.value
      : {};
    const llms = llmsResult.status === 'fulfilled' && Array.isArray(llmsResult.value?.llms)
      ? llmsResult.value.llms
      : [];
    const processes = processResult.status === 'fulfilled' && Array.isArray(processResult.value?.processes)
      ? processResult.value.processes
      : [];
    const activeComponents = Object.values(components).filter((value) => value === 'active').length;
    const componentCount = Object.keys(components).length;
    const state = !reachable ? 'offline'
      : status?.status === 'ok' && (componentCount === 0 || activeComponents === componentCount) ? 'ready'
        : 'degraded';
    const errors = settled
      .filter((result) => result.status === 'rejected')
      .map((result) => safeError(result.reason));

    return Object.freeze({
      schema: AIOS_KERNEL_SNAPSHOT_SCHEMA,
      state,
      reachable,
      access,
      components: Object.freeze({ ...components }),
      llms: Object.freeze([...llms]),
      processes: Object.freeze(processes.map((process) => Object.freeze({ ...process }))),
      fetchedAt,
      message: text(status?.message),
      errors: Object.freeze(errors),
    });
  }

  async function submitAgent({ agentId, task, config = {}, signal = null } = {}) {
    const id = text(agentId);
    const work = text(task);
    if (!id) throw new TypeError('AIOS agent submission requires agentId.');
    if (!work) throw new TypeError('AIOS agent submission requires task.');
    return request('/agents/submit', {
      method: 'POST',
      signal,
      timeout: 10_000,
      body: {
        agent_id: id,
        agent_config: { ...config, task: work },
      },
    });
  }

  async function agentStatus(executionId, { signal = null } = {}) {
    const id = Number(executionId);
    if (!Number.isSafeInteger(id) || id < 0) throw new TypeError('AIOS execution id must be a non-negative integer.');
    return request(`/agents/${id}/status`, { signal, timeout: 10_000 });
  }

  async function query({ agentName, queryType, queryData, userId = null, signal = null } = {}) {
    const agent = text(agentName);
    const type = text(queryType).toLowerCase();
    if (!agent) throw new TypeError('AIOS query requires agentName.');
    if (!QUERY_TYPES.has(type)) throw new TypeError(`Unsupported AIOS query type: ${type || '<empty>'}`);
    if (!queryData || typeof queryData !== 'object') throw new TypeError('AIOS query requires queryData.');
    if ((type === 'llm' || type === 'memory') && !text(userId)) {
      throw new TypeError(`${type} queries through the Hearthweave bridge require an explicit userId scope.`);
    }
    return request('/query', {
      method: 'POST',
      signal,
      timeout: type === 'llm' ? 60_000 : 15_000,
      body: {
        agent_name: agent,
        query_type: type,
        query_data: queryData,
        ...(text(userId) ? { user_id: text(userId) } : {}),
      },
    });
  }

  return Object.freeze({
    schema: AIOS_KERNEL_BRIDGE_SCHEMA,
    access,
    snapshot,
    submitAgent,
    agentStatus,
    query,
  });
}
