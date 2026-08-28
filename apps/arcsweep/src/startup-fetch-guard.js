import './pages-house-transport-bridge.js';

export const HOUSE_SESSION_STARTUP_TIMEOUT_MS = 2500;

export function installStartupFetchGuard(target = globalThis, timeoutMs = HOUSE_SESSION_STARTUP_TIMEOUT_MS) {
  if (!target?.fetch || target.__arcsweepStartupFetchGuardInstalled) return false;
  const baseFetch = target.fetch.bind(target);

  target.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const isHouseSession = /\/api\/v1\/house\/session(?:\?|$)/.test(url);
    if (!isHouseSession || init.signal) return baseFetch(input, init);

    const signal = typeof AbortSignal?.timeout === 'function'
      ? AbortSignal.timeout(timeoutMs)
      : undefined;
    return baseFetch(input, signal ? { ...init, signal } : init);
  };

  target.__arcsweepStartupFetchGuardInstalled = true;
  return true;
}

if (typeof window !== 'undefined') installStartupFetchGuard(window);
