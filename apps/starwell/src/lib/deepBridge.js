import { getBridgeDeep, normaliseDeepState } from './deepState.js';

export const BRIDGE_PULSE_URL = 'https://singsenochian.github.io/-bridge-pulse/pulse.json';

export async function fetchBridgeDeepPulse({ fetchImpl = globalThis.fetch, url = BRIDGE_PULSE_URL } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('Bridge pulse fetch is unavailable in this runtime');
  }

  const response = await fetchImpl(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Bridge pulse returned ${response.status}`);
  }

  const payload = await response.json();
  const bridgeDeep = getBridgeDeep(payload);
  if (!bridgeDeep) {
    throw new Error('Bridge pulse did not include a DEEP state');
  }

  return normaliseDeepState(bridgeDeep);
}
