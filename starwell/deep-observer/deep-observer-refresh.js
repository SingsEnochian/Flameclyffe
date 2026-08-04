/* DEEP Observer Observation Refresh v0.1
   Refreshes browser-native observation context and asks the DEEP engine for a fresh bridge/local pull.
   This is a module seam, not a hardcoded renderer patch.
*/
'use strict';

(() => {
  const STORAGE_KEY = 'deep_observer_refresh_snapshot_v1';

  function ensureButton() {
    if (document.getElementById('observerRefreshBtn')) return;
    const dock = document.querySelector('.filter-row');
    if (!dock) return;
    const btn = document.createElement('button');
    btn.className = 'filter';
    btn.id = 'observerRefreshBtn';
    btn.type = 'button';
    btn.textContent = 'Refresh';
    btn.setAttribute('aria-label', 'Refresh browser readings and DEEP data');
    dock.prepend(btn);
    btn.addEventListener('click', () => refreshObservation('manual-button'));
  }

  function readLocalPacketKeys() {
    const keys = ['ta_deep_state','ta_deep_entries','deepEntries','terra_aeterna_deep','observer_deep','deep_observer_saved_packets'];
    return keys.map(key => {
      try {
        const raw = localStorage.getItem(key);
        return { key, present: Boolean(raw), bytes: raw ? raw.length : 0 };
      } catch (e) {
        return { key, present: false, bytes: 0, error: 'unavailable' };
      }
    });
  }

  function browserSnapshot(reason = 'manual') {
    const now = new Date();
    const reducedMotion = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const coarsePointer = Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    const hoverCapable = Boolean(window.matchMedia && window.matchMedia('(hover: hover)').matches);
    return {
      schema: 'deep-observer-browser-refresh-v0.1',
      reason,
      timestamp: now.toISOString(),
      localTime: now.toString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
      visibility: document.visibilityState,
      online: navigator.onLine,
      viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio || 1 },
      input: {
        pointerEvents: 'PointerEvent' in window,
        maxTouchPoints: navigator.maxTouchPoints || 0,
        coarsePointer,
        hoverCapable
      },
      accessibility: { reducedMotion },
      storage: readLocalPacketKeys(),
      note: 'Browser-native observation snapshot. This is local context and provenance, not hidden-state detection.'
    };
  }

  function saveSnapshot(snapshot) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch (e) {}
  }

  function setHint(text) {
    const hint = document.getElementById('instrumentHint');
    if (hint) hint.textContent = text;
  }

  function pulseButton(status) {
    const btn = document.getElementById('observerRefreshBtn');
    if (!btn) return;
    btn.dataset.refreshStatus = status;
    btn.classList.remove('refreshing','refreshed','refresh-error');
    void btn.offsetWidth;
    if (status === 'refreshing') btn.classList.add('refreshing');
    if (status === 'refreshed') btn.classList.add('refreshed');
    if (status === 'error') btn.classList.add('refresh-error');
  }

  async function callEngineHooks() {
    const result = { bridge: 'unavailable', local: 'unavailable' };
    if (typeof window.pollLocal === 'function') {
      try { window.pollLocal(); result.local = 'refreshed'; } catch (e) { result.local = 'error'; }
    } else if (typeof pollLocal === 'function') {
      try { pollLocal(); result.local = 'refreshed'; } catch (e) { result.local = 'error'; }
    }

    if (typeof window.fetchBridge === 'function') {
      try { await window.fetchBridge(); result.bridge = 'refreshed'; } catch (e) { result.bridge = 'error'; }
    } else if (typeof fetchBridge === 'function') {
      try { await fetchBridge(); result.bridge = 'refreshed'; } catch (e) { result.bridge = 'error'; }
    }
    return result;
  }

  async function refreshObservation(reason = 'manual') {
    const started = performance.now();
    pulseButton('refreshing');
    setHint('Refreshing browser-native readings and asking the DEEP engine for a fresh pulse…');

    const snapshot = browserSnapshot(reason);
    saveSnapshot(snapshot);

    const engine = await callEngineHooks();
    const elapsed = Math.round(performance.now() - started);
    const ok = engine.bridge !== 'error' && engine.local !== 'error';

    const eventDetail = { snapshot, engine, elapsedMs: elapsed };
    window.dispatchEvent(new CustomEvent('deep-observer:refreshed', { detail: eventDetail }));

    pulseButton(ok ? 'refreshed' : 'error');
    window.setTimeout(() => pulseButton('idle'), 1150);

    const sourceText = engine.bridge === 'refreshed' ? 'bridge pulse refreshed' : engine.bridge === 'unavailable' ? 'bridge hook unavailable' : 'bridge refresh error';
    const localText = engine.local === 'refreshed' ? 'local seam refreshed' : engine.local === 'unavailable' ? 'local hook unavailable' : 'local refresh error';
    setHint(`Observation refresh complete: ${sourceText}; ${localText}; browser snapshot saved locally. ${elapsed}ms.`);
    return eventDetail;
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureButton();
    window.DEEP_OBSERVER_REFRESH = {
      refreshObservation,
      browserSnapshot,
      storageKey: STORAGE_KEY,
      note: 'Refreshes browser-native context and calls DEEP engine bridge/local hooks when available.'
    };
  });
})();
