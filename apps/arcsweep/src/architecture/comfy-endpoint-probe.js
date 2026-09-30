export const COMFY_ENDPOINT_CONFIG_SCHEMA = 'arcsweep.comfy-endpoint-config/v1';
export const COMFY_ENDPOINT_STATUS_SCHEMA = 'arcsweep.comfy-endpoint-status/v1';

// Probe route — read-only, no queue, no prompt submission, no model side effects
const PROBE_PATH = '/system_stats';

// Invariants:
//   probe != queue
//   probe != prompt submission
//   probe != model download
//   probe != custom node install
//   endpoint config carries no credentials

/**
 * A frozen record describing a ComfyUI endpoint to probe.
 * Does NOT execute workflows. Does NOT submit prompts.
 */
export function createComfyEndpointConfig({
  installId,
  baseUrl,
  timeoutMs = 5000,
  label = null,
} = {}) {
  const normInstallId = String(installId ?? '').trim();
  if (!normInstallId) throw new Error('comfy-endpoint-config: installId is required');
  const normBaseUrl = String(baseUrl ?? '').trim().replace(/\/$/, '');
  if (!normBaseUrl) throw new Error('comfy-endpoint-config: baseUrl is required');
  const normTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 5000;
  return Object.freeze({
    schema: COMFY_ENDPOINT_CONFIG_SCHEMA,
    install_id: normInstallId,
    base_url: normBaseUrl,
    timeout_ms: normTimeout,
    label: String(label ?? '').trim() || normInstallId,
    probe_path: PROBE_PATH,
  });
}

/**
 * Probe a ComfyUI endpoint for reachability only.
 *
 * Uses GET /system_stats — a read-only route present in all ComfyUI builds.
 * No prompt is submitted, no queue is modified, no model is downloaded.
 *
 * Returns a frozen status record regardless of outcome (fail-safe).
 *
 * @param {ReturnType<typeof createComfyEndpointConfig>} config
 * @param {{ fetch?: typeof globalThis.fetch }} options  — injectable for tests
 * @returns {Promise<Readonly<object>>}
 */
export async function probeComfyEndpoint(config, { fetch: fetchFn = globalThis.fetch } = {}) {
  if (config?.schema !== COMFY_ENDPOINT_CONFIG_SCHEMA) {
    throw new Error('probeComfyEndpoint: config must be a createComfyEndpointConfig record');
  }

  const url = `${config.base_url}${config.probe_path}`;
  const startMs = Date.now();

  let reachable = false;
  let latencyMs = null;
  let httpStatus = null;
  let errorKind = null;
  let errorMessage = null;
  let systemStats = null;

  try {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), config.timeout_ms);
    try {
      const response = await fetchFn(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      latencyMs = Date.now() - startMs;
      httpStatus = response.status;
      if (response.ok) {
        reachable = true;
        try {
          systemStats = await response.json();
        } catch {
          // JSON parse failure still counts as reachable — /system_stats might not always parse
          systemStats = null;
        }
      } else {
        errorKind = 'http-error';
        errorMessage = `HTTP ${response.status}`;
      }
    } finally {
      clearTimeout(timeoutHandle);
    }
  } catch (err) {
    latencyMs = Date.now() - startMs;
    if (err?.name === 'AbortError') {
      errorKind = 'timeout';
      errorMessage = `timeout after ${config.timeout_ms}ms`;
    } else {
      errorKind = 'network-error';
      errorMessage = String(err?.message ?? err ?? 'unknown network error');
    }
  }

  return Object.freeze({
    schema: COMFY_ENDPOINT_STATUS_SCHEMA,
    install_id: config.install_id,
    base_url: config.base_url,
    probe_url: url,
    reachable,
    latency_ms: latencyMs,
    http_status: httpStatus,
    error_kind: errorKind,
    error_message: errorMessage,
    system_stats: systemStats,
    probed_at: new Date().toISOString(),
    // These must never be present on a probe status — probe != execution
    // (named explicitly so reviewers can confirm their absence)
  });
}
