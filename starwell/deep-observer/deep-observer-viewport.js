/* DEEP Observer Viewport Token Applier v0.1
   Reads STARWELL_OBSERVER_VIEWPORT_REGISTRY and writes CSS variables.
   This keeps responsive layout values in a registry-shaped layer.
*/
'use strict';

(() => {
  const EVENT_NAME = 'deep-observer:viewport-map';

  function getRegistry() {
    return window.STARWELL_OBSERVER_VIEWPORT_REGISTRY || null;
  }

  function applyViewport(reason = 'init') {
    const registry = getRegistry();
    if (!registry || typeof registry.classify !== 'function') return null;

    const band = registry.classify(window.innerWidth);
    if (!band) return null;

    const root = document.documentElement;
    const tokens = band.tokens || {};
    const cssVarMap = registry.cssVarMap || {};

    Object.entries(tokens).forEach(([key, value]) => {
      const cssVar = cssVarMap[key];
      if (cssVar) root.style.setProperty(cssVar, String(value));
    });

    document.body.dataset.viewportBand = band.id;

    const detail = {
      reason,
      bandId: band.id,
      label: band.label,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      tokens
    };

    window.DEEP_OBSERVER_VIEWPORT_MAP = detail;
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
    return detail;
  }

  function debounce(fn, wait = 120) {
    let timer = null;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), wait);
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyViewport('dom-ready');
    const resizeApply = debounce(() => applyViewport('resize'), 120);
    window.addEventListener('resize', resizeApply, { passive: true });
    window.addEventListener('orientationchange', () => window.setTimeout(() => applyViewport('orientationchange'), 180), { passive: true });
    window.DEEP_OBSERVER_VIEWPORT = {
      applyViewport,
      eventName: EVENT_NAME,
      note: 'Applies registry-driven layout tokens for glyph scale, sensor ring, dock spacing, and future HUD bounds.'
    };
  });
})();
