import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/** Deliberately read-only, opt-in loopback discovery. No model inference or credentials. */
export const WAYGLASS_LOCAL_PROBE_SCHEMA = 'wayglass.local-provider-readiness/v0.1';
export const PROVIDER_ENDPOINTS = Object.freeze([
  Object.freeze({ provider: 'ollama', url: 'http://127.0.0.1:11434/api/tags', model_field: 'models', name_field: 'name' }),
  Object.freeze({ provider: 'localai', url: 'http://127.0.0.1:8080/v1/models', model_field: 'data', name_field: 'id' }),
]);

const safeName = value => typeof value === 'string' ? value.slice(0, 100) : null;
export async function inspectWayglassLocalProviders({ request = fetch, timeoutMs = 3000 } = {}) {
  if (typeof request !== 'function') throw new TypeError('request must be a fetch-compatible function');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 10000) throw new RangeError('timeoutMs out of bounds');
  const checks = [];
  for (const target of PROVIDER_ENDPOINTS) {
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await request(target.url, {
        method: 'GET', redirect: 'error', cache: 'no-store',
        headers: { Accept: 'application/json' }, signal: controller.signal,
      });
      if (!response.ok) {
        checks.push({ provider: target.provider, status: 'unavailable', models: [], http_status: response.status });
        continue;
      }
      const body = await response.json();
      const models = body && body[target.model_field];
      if (!Array.isArray(models)) {
        checks.push({ provider: target.provider, status: 'unexpected-response', models: [] });
        continue;
      }
      const names = [...new Set(models.map(item => safeName(item?.[target.name_field])).filter(Boolean))].slice(0, 20);
      checks.push({ provider: target.provider, status: 'responsive', models: names, truncated: models.length > 20 });
    } catch {
      // No raw upstream errors, credentials, URLs or response bodies leave this probe.
      checks.push({ provider: target.provider, status: 'unavailable', models: [] });
    } finally { clearTimeout(deadline); }
  }
  return Object.freeze({
    schema: WAYGLASS_LOCAL_PROBE_SCHEMA,
    mode: 'loopback-get-only',
    checks,
    evidence: { local_process_observed: false, inference_tested: false, gpu_measured: false, voice_tested: false, write_performed: false },
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv.includes('--probe')) {
    console.log('Dry run only. Add --probe to GET the fixed Ollama and LocalAI loopback model catalogues; no inference or credentials.');
  } else {
    inspectWayglassLocalProviders().then(result => console.log(JSON.stringify(result, null, 2)))
      .catch(() => { console.error('Local readiness probe failed.'); process.exitCode = 1; });
  }
}
