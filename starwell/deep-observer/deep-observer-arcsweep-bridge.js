'use strict';

(() => {
  const STORAGE_KEY = 'hearthgate.observer.premaq.v1';
  const MESSAGE_TYPE = 'hearthgate.observer.premaq';
  const iframe = document.getElementById('arcsweepFrame');
  const status = document.getElementById('arcsweepBridgeStatus');
  const packetElement = document.getElementById('packet');
  let lastSerialised = '';
  let lastPublishedAt = 0;
  let latestSnapshot = readStoredSnapshot();

  function finite(value, fallback = null) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, min = 0, max = 1) {
    const number = finite(value, min);
    return Math.max(min, Math.min(max, number));
  }

  function meterNumber(id, prefix = '') {
    const text = document.getElementById(id)?.textContent || '';
    const value = text.replace(prefix, '').match(/-?\d+(?:\.\d+)?/);
    return value ? finite(value[0], null) : null;
  }

  function parsePacket() {
    const text = packetElement?.textContent?.trim();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { packetText: text };
    }
  }

  function fieldFrom(raw) {
    const source = raw?.field || raw?.deep || raw?.DEEP || raw?.state || raw?.observer || raw || {};
    const charge = source.Q ?? source.charge ?? raw?.charge ?? meterNumber('mQ', 'Q');
    return {
      P: clamp(source.P ?? meterNumber('mP', 'P')),
      C: clamp(source.C ?? meterNumber('mC', 'C')),
      R: clamp(source.R ?? meterNumber('mR', 'R')),
      E: clamp(source.E ?? meterNumber('mE', 'E')),
      M: clamp(source.M ?? meterNumber('mM', 'M')),
      A: clamp(source.A ?? meterNumber('mA', 'A')),
      H: clamp(source.H ?? meterNumber('mH', 'H')),
      Q: clamp(charge),
      charge: clamp(charge),
      dpdt: finite(source.dpdt, null),
    };
  }

  function directFrom(raw) {
    const moonText = document.getElementById('mMoon')?.textContent || '';
    const sourceText = document.getElementById('mSource')?.textContent || '';
    const direct = raw?.direct || {};
    return {
      moonIllum: finite(
        direct.moonIllum
          ?? raw?.moonIllum
          ?? raw?.moon?.illumination
          ?? moonText.match(/-?\d+(?:\.\d+)?/)?.[0],
        null,
      ),
      moonName: direct.moonName ?? raw?.moon?.name ?? '',
      moonAge: finite(direct.moonAge ?? raw?.moon?.age_days, null),
      kp: finite(direct.kp ?? raw?.kp ?? meterNumber('mKp', 'Kp'), null),
      bz: finite(direct.bz ?? raw?.bz ?? meterNumber('mBz', 'Bz'), null),
      bt: finite(direct.bt ?? raw?.bt, null),
      solarWind: finite(direct.solarWind ?? raw?.solarWind ?? raw?.speed, null),
      sky: direct.sky ?? raw?.sky ?? '',
      source: direct.source ?? raw?.source ?? sourceText.trim() || 'observer',
    };
  }

  function buildSnapshot() {
    const raw = parsePacket();
    return {
      schema: 'hearthgate.observer.premaq/v1',
      generatedAt: new Date().toISOString(),
      source: 'STARWELL · DEEP Observer',
      transport: 'same-origin storage + postMessage',
      location: raw?.location || null,
      field: fieldFrom(raw),
      direct: directFrom(raw),
      raw,
    };
  }

  function readStoredSnapshot() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function updateStatus(state, text) {
    if (!status) return;
    status.dataset.state = state;
    status.textContent = text;
  }

  function postSnapshot(snapshot) {
    if (!iframe?.contentWindow || !snapshot) return;
    let targetOrigin = '*';
    try {
      targetOrigin = new URL(iframe.src, window.location.href).origin;
    } catch {
      // Keep wildcard only for an unresolved local development route.
    }
    iframe.contentWindow.postMessage({ type: MESSAGE_TYPE, payload: snapshot }, targetOrigin);
  }

  function publish(force = false) {
    const now = Date.now();
    if (!force && now - lastPublishedAt < 1000) return;
    const snapshot = buildSnapshot();
    const serialised = JSON.stringify(snapshot);
    if (!force && serialised === lastSerialised) return;

    lastPublishedAt = now;
    lastSerialised = serialised;
    latestSnapshot = snapshot;
    try {
      localStorage.setItem(STORAGE_KEY, serialised);
    } catch {
      // postMessage still provides a live bridge when storage is unavailable.
    }
    window.dispatchEvent(new CustomEvent('hearthgate:observer-state', { detail: snapshot }));
    postSnapshot(snapshot);
    updateStatus('connected', 'Observer ↔ Arcsweep · live PREMAQ');
  }

  if (packetElement) {
    const observer = new MutationObserver(() => publish(false));
    observer.observe(packetElement, { childList: true, characterData: true, subtree: true });
  }

  iframe?.addEventListener('load', () => {
    publish(true);
    postSnapshot(latestSnapshot);
  });

  window.addEventListener('message', (event) => {
    if (event.source !== iframe?.contentWindow) return;
    if (event.data?.type !== 'hearthgate.arcsweep.ready') return;
    publish(true);
    postSnapshot(latestSnapshot);
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      latestSnapshot = JSON.parse(event.newValue);
      postSnapshot(latestSnapshot);
    } catch {
      // Ignore malformed writes from another tab.
    }
  });

  updateStatus(latestSnapshot ? 'connected' : 'waiting', latestSnapshot
    ? 'Observer ↔ Arcsweep · shared state found'
    : 'Observer ↔ Arcsweep · awaiting first packet');
  window.setInterval(() => publish(false), 5000);
  publish(true);
})();
