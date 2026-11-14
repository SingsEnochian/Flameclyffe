import { observeIntegratedVoyage } from './integrated-voyage-visual.js';

// One explicit user touch -> one authenticated source-bound native Wyrdrune
// sandbox voyage -> one pigment event. Never an unattended polling loop.
export async function touchWayglass({ mode = 'repair', touch = .65,
  signal, fetchImpl = fetch } = {}) {
  if (!['repair', 'expand'].includes(mode)) throw new TypeError('Unknown Wyrdrune touch mode');
  if (typeof touch !== 'number' || !Number.isFinite(touch) || touch < 0 || touch > 1) {
    throw new RangeError('Touch intensity must be between zero and one');
  }
  const response = await fetchImpl('/api/v1/wayglass/wyrdrune/first-touch', {
    method: 'POST', cache: 'no-store', credentials: 'same-origin', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, touch }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body.error || (
    response.status === 401 ? 'House Steward sign-in required' : 'Wyrdrune voyage unavailable'
  )).slice(0,240));
  if (signal?.aborted) throw new Error('Feather: voyage interrupted');
  if (body.demonstration?.schema !== 'wayglass.first-touch-simulation/v0.1' ||
    body.demonstration.source !== 'synthetic-fixture' ||
    body.demonstration.real_telemetry !== false ||
    body.demonstration.live_ai_called !== false ||
    body.demonstration.preview_only !== true ||
    body.demonstration.mode !== mode) {
    throw new TypeError('Unrecognised or misleading Wyrdrune First Touch result');
  }
  const projection = observeIntegratedVoyage(body);
  return Object.freeze({ host: body, projection });
}
