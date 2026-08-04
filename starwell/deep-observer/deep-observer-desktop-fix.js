/* DEEP Observer Desktop Panel Repair v0.1
   Clears stale dual-time drag coordinates on wide layouts and keeps the panel
   from covering the Direct Readings card after Time is triggered. */
'use strict';

(() => {
  const POSITION_KEY = 'deep_observer_dual_time_position_v1';
  const RESET_KEY = 'deep_observer_dual_time_position_desktop_reset_v1';
  const DESKTOP_MIN = 1180;

  function isDesktop() {
    return window.innerWidth >= DESKTOP_MIN;
  }

  function safeLocalStorage(action) {
    try { return action(window.localStorage); } catch (error) { return null; }
  }

  function clearStalePositionOnce() {
    if (!isDesktop()) return;
    safeLocalStorage(storage => {
      if (storage.getItem(RESET_KEY) === '1') return;
      storage.removeItem(POSITION_KEY);
      storage.setItem(RESET_KEY, '1');
    });
  }

  function overlaps(a, b) {
    if (!a || !b) return false;
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function savePosition(x, y) {
    safeLocalStorage(storage => storage.setItem(POSITION_KEY, JSON.stringify({ x, y })));
  }

  function dockDualTime(panel) {
    const rect = panel.getBoundingClientRect();
    const margin = 16;
    const x = clamp(window.innerWidth - rect.width - margin, margin, window.innerWidth - rect.width - margin);
    const y = clamp(84, margin, Math.max(margin, window.innerHeight - rect.height - margin));

    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.transform = 'none';
    panel.dataset.desktopDock = 'true';
    savePosition(x, y);
  }

  function repairDualTimePosition() {
    if (!isDesktop()) return;

    const panel = document.getElementById('dualTimeHologram');
    const directCard = document.getElementById('directCard');
    if (!panel) return;

    const panelRect = panel.getBoundingClientRect();
    const directRect = directCard?.getBoundingClientRect();
    const outOfBounds = panelRect.left < 8 || panelRect.top < 8 || panelRect.right > window.innerWidth - 8 || panelRect.bottom > window.innerHeight - 8;
    const coveringReading = directRect ? overlaps(panelRect, directRect) : false;

    if (outOfBounds || coveringReading) dockDualTime(panel);
  }

  document.addEventListener('DOMContentLoaded', () => {
    clearStalePositionOnce();
    window.requestAnimationFrame(() => window.setTimeout(repairDualTimePosition, 80));
  });

  window.addEventListener('deep-observer:dual-time-trigger', () => {
    window.setTimeout(repairDualTimePosition, 120);
  }, { passive: true });

  window.addEventListener('resize', () => {
    window.setTimeout(repairDualTimePosition, 120);
  }, { passive: true });

  window.addEventListener('orientationchange', () => {
    window.setTimeout(repairDualTimePosition, 220);
  }, { passive: true });
})();
