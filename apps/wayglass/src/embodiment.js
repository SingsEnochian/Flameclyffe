export function detectEmbodimentCapabilities(env = globalThis) {
  const nav = env.navigator || {};
  const match = (query) => env.matchMedia?.(query)?.matches === true;

  return Object.freeze({
    schema: 'wayglass.embodiment/v0.1',
    keyboard: typeof env.addEventListener === 'function',
    touch: Number(nav.maxTouchPoints || 0) > 0,
    fine_pointer: match('(pointer: fine)'),
    hover: match('(hover: hover)'),
    vibration: typeof nav.vibrate === 'function',
    webxr: Boolean(nav.xr),
    secure_context: env.isSecureContext === true,
    platform_hint: String(nav.userAgentData?.platform || nav.platform || '').slice(0, 80),
  });
}

export async function detectARSupport(env = globalThis) {
  const xr = env.navigator?.xr;
  if (!xr?.isSessionSupported) {
    return Object.freeze({ supported: false, reason: 'webxr-unavailable' });
  }
  if (env.isSecureContext !== true) {
    return Object.freeze({ supported: false, reason: 'secure-context-required' });
  }

  try {
    const supported = await xr.isSessionSupported('immersive-ar');
    return Object.freeze({
      supported: Boolean(supported),
      reason: supported ? 'immersive-ar-supported' : 'immersive-ar-unsupported',
    });
  } catch (error) {
    return Object.freeze({
      supported: false,
      reason: 'webxr-check-failed',
      detail: String(error?.message || error).slice(0, 160),
    });
  }
}

export function publishEmbodiment(capabilities, ar) {
  const detail = Object.freeze({ ...capabilities, ar });
  if (typeof globalThis.CustomEvent === 'function') {
    globalThis.dispatchEvent?.(new CustomEvent('wayglass:embodiment-ready', { detail }));
  }
  return detail;
}
