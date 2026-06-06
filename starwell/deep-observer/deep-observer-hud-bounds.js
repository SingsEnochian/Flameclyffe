/* DEEP Observer HUD Bounds v0.1
   Shared geometry helper for floating panels and draggable HUD elements.
   Keeps panels bounded to the instrument HUD instead of the whole page.
*/
'use strict';

(() => {
  const DEFAULT_PAD = 10;

  function getHudElement() {
    return document.querySelector('.instrument') || document.querySelector('.shell') || document.body;
  }

  function getHudRect() {
    const hud = getHudElement();
    const rect = hud.getBoundingClientRect();
    if (!rect || rect.width < 40 || rect.height < 40) {
      return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight };
    }
    return rect;
  }

  function clamp(value, min, max) {
    if (max < min) return min;
    return Math.max(min, Math.min(max, value));
  }

  function clampViewportPoint(x, y, width = 80, height = 80, pad = DEFAULT_PAD) {
    const rect = getHudRect();
    return {
      x: clamp(Number(x) || rect.left + pad, rect.left + pad, rect.right - width - pad),
      y: clamp(Number(y) || rect.top + pad, rect.top + pad, rect.bottom - height - pad)
    };
  }

  function defaultPanelPosition(width = 320, height = 160, anchor = 'right') {
    const rect = getHudRect();
    const pad = DEFAULT_PAD;
    const positions = {
      right: { x: rect.right - width - pad, y: rect.top + pad },
      left: { x: rect.left + pad, y: rect.top + pad },
      bottomRight: { x: rect.right - width - pad, y: rect.bottom - height - pad },
      bottomLeft: { x: rect.left + pad, y: rect.bottom - height - pad },
      top: { x: rect.left + (rect.width - width) / 2, y: rect.top + pad },
      bottom: { x: rect.left + (rect.width - width) / 2, y: rect.bottom - height - pad }
    };
    const p = positions[anchor] || positions.right;
    return clampViewportPoint(p.x, p.y, width, height, pad);
  }

  function nearestSnap(x, y, width = 80, height = 80, pad = DEFAULT_PAD) {
    const rect = getHudRect();
    const candidates = [
      { id: 'left', x: rect.left + pad, y: rect.top + pad },
      { id: 'right', x: rect.right - width - pad, y: rect.top + pad },
      { id: 'bottom-left', x: rect.left + pad, y: rect.bottom - height - pad },
      { id: 'bottom-right', x: rect.right - width - pad, y: rect.bottom - height - pad },
      { id: 'top-centre', x: rect.left + (rect.width - width) / 2, y: rect.top + pad },
      { id: 'bottom-centre', x: rect.left + (rect.width - width) / 2, y: rect.bottom - height - pad }
    ];
    let best = candidates[0];
    let bestD = Infinity;
    candidates.forEach(candidate => {
      const d = Math.hypot((Number(x) || 0) - candidate.x, (Number(y) || 0) - candidate.y);
      if (d < bestD) { best = candidate; bestD = d; }
    });
    const clamped = clampViewportPoint(best.x, best.y, width, height, pad);
    return { ...clamped, zone: best.id, distance: bestD };
  }

  function elementSize(el, fallbackWidth = 80, fallbackHeight = 80) {
    const rect = el?.getBoundingClientRect?.();
    return {
      width: rect?.width || fallbackWidth,
      height: rect?.height || fallbackHeight
    };
  }

  function clampElement(el, x, y, pad = DEFAULT_PAD) {
    const size = elementSize(el);
    return clampViewportPoint(x, y, size.width, size.height, pad);
  }

  function snapElement(el, x, y, pad = DEFAULT_PAD) {
    const size = elementSize(el);
    return nearestSnap(x, y, size.width, size.height, pad);
  }

  function dispatchMap(reason = 'bounds') {
    const detail = {
      reason,
      rect: getHudRect(),
      viewport: window.DEEP_OBSERVER_VIEWPORT_MAP || null
    };
    window.dispatchEvent(new CustomEvent('deep-observer:hud-bounds', { detail }));
    return detail;
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.DEEP_OBSERVER_HUD = {
      getHudElement,
      getHudRect,
      clampViewportPoint,
      defaultPanelPosition,
      nearestSnap,
      clampElement,
      snapElement,
      dispatchMap,
      note: 'Shared HUD bounds helper for keeping floating panels inside the Observer instrument.'
    };
    dispatchMap('dom-ready');
    window.addEventListener('resize', () => dispatchMap('resize'), { passive: true });
    window.addEventListener('orientationchange', () => window.setTimeout(() => dispatchMap('orientationchange'), 180), { passive: true });
    window.addEventListener('deep-observer:viewport-map', () => dispatchMap('viewport-map'), { passive: true });
  });
})();
