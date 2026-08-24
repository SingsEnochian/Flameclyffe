/* DEEP Observer Dev Console v0.2
   Hidden-by-default local override console. This is obscurity, not real auth. */
'use strict';

(() => {
  const DEV_ACCESS_KEY = 'deep_observer_dev_access_v1';
  const DEV_ENABLED_KEY = 'deep_observer_dev_console_open_v1';
  const OVERRIDE_ENABLED_KEY = 'deep_observer_dev_override_enabled_v1';
  const LOCAL_PACKET_KEY = 'ta_deep_state';
  const DEFAULTS = { P:.55, C:.50, R:.45, E:.38, M:.30, A:.65, charge:.20, kp:1, bz:0, moonIllum:50, sky:'Night' };
  const MODEL = [
    ['P','Presence',0,1,.01], ['C','Coherence',0,1,.01], ['R','Resonance',0,1,.01],
    ['E','Entanglement',0,1,.01], ['M','Memory',0,1,.01], ['A','Agency',0,1,.01], ['charge','Qualia renderer',0,1,.01]
  ];
  const TELEMETRY = [
    ['kp','Kp',0,9,.1], ['bz','Bz',-20,20,.1], ['moonIllum','Moon %',0,100,1]
  ];

  const state = { ...DEFAULTS, enabled:false };

  function getStoredPacket() {
    try { return JSON.parse(localStorage.getItem(LOCAL_PACKET_KEY) || '{}'); } catch (e) { return {}; }
  }

  function hasDevAccess() {
    try { return localStorage.getItem(DEV_ACCESS_KEY) === '1'; } catch (e) { return false; }
  }

  function setDevAccess(enabled) {
    try { localStorage.setItem(DEV_ACCESS_KEY, enabled ? '1' : '0'); } catch (e) {}
    document.body.classList.toggle('observer-dev-access', enabled);
  }

  function checkUrlAccess() {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('observerDev');
    if (flag === '1' || window.location.hash === '#observer-dev') {
      setDevAccess(true);
      setHintSafe('Observer DEV access unlocked on this device.');
      return true;
    }
    if (flag === '0') {
      hideDevAccess();
      setHintSafe('Observer DEV access hidden on this device.');
      return false;
    }
    document.body.classList.toggle('observer-dev-access', hasDevAccess());
    return hasDevAccess();
  }

  function readCurrentFromPacket() {
    const packet = getStoredPacket();
    const field = packet.field || {};
    const entries = Array.isArray(packet.entries) ? packet.entries : [];
    const entry = entries[0]?.d || {};
    MODEL.forEach(([key]) => {
      if (key === 'charge') {
        if (typeof packet.charge === 'number') state.charge = packet.charge;
      } else if (typeof field[key] === 'number') state[key] = field[key];
    });
    if (typeof entry.kp === 'number') state.kp = entry.kp;
    if (typeof entry.bz === 'number') state.bz = entry.bz;
    if (entry.moon && typeof entry.moon.illumination === 'number') state.moonIllum = entry.moon.illumination;
    if (entry.sky) state.sky = String(entry.sky);
    try { state.enabled = localStorage.getItem(OVERRIDE_ENABLED_KEY) === '1'; } catch (e) {}
  }

  function buildPacket() {
    return {
      observerDevOverride: true,
      schema: 'deep-observer-dev-console-v0.2',
      timestamp: new Date().toISOString(),
      note: 'Local experimental/theoretical override packet. This is a developer/simulation layer, not physical proof.',
      field: {
        P: Number(state.P), C: Number(state.C), R: Number(state.R), E: Number(state.E), M: Number(state.M), A: Number(state.A)
      },
      charge: Number(state.charge),
      entries: [{
        t: new Date().toISOString(),
        d: {
          kp: Number(state.kp),
          bz: Number(state.bz),
          sky: String(state.sky || 'Dev Override'),
          moon: { illumination: Number(state.moonIllum) }
        }
      }]
    };
  }

  function writeOverride() {
    if (!state.enabled) return;
    try { localStorage.setItem(LOCAL_PACKET_KEY, JSON.stringify(buildPacket())); } catch (e) {}
    updateStatus();
  }

  function clearOverride() {
    state.enabled = false;
    try {
      localStorage.setItem(OVERRIDE_ENABLED_KEY, '0');
      const packet = getStoredPacket();
      if (packet.observerDevOverride) localStorage.removeItem(LOCAL_PACKET_KEY);
    } catch (e) {}
    syncControls();
    updateStatus();
  }

  function hideDevAccess() {
    state.enabled = false;
    try {
      localStorage.setItem(OVERRIDE_ENABLED_KEY, '0');
      localStorage.setItem(DEV_ENABLED_KEY, '0');
      localStorage.removeItem(DEV_ACCESS_KEY);
      const packet = getStoredPacket();
      if (packet.observerDevOverride) localStorage.removeItem(LOCAL_PACKET_KEY);
    } catch (e) {}
    setConsoleOpen(false);
    removeButton();
    document.getElementById('observerDevConsole')?.remove();
    document.body.classList.remove('observer-dev-access');
  }

  function removeButton() {
    document.getElementById('observerDevBtn')?.remove();
  }

  function ensureButton() {
    if (!hasDevAccess()) { removeButton(); return; }
    if (document.getElementById('observerDevBtn')) return;
    const dock = document.querySelector('.filter-row');
    if (!dock) return;
    const btn = document.createElement('button');
    btn.className = 'filter';
    btn.id = 'observerDevBtn';
    btn.type = 'button';
    btn.textContent = 'DEV · OFF';
    btn.setAttribute('aria-pressed', 'false');
    dock.appendChild(btn);
    btn.addEventListener('click', () => setConsoleOpen(!isOpen()));
  }

  function ensureConsole() {
    if (!hasDevAccess()) return;
    if (document.getElementById('observerDevConsole')) return;
    const panel = document.createElement('aside');
    panel.id = 'observerDevConsole';
    panel.className = 'observer-dev-console';
    panel.hidden = true;
    panel.setAttribute('aria-label','Observer developer console');
    panel.innerHTML = `
      <div class="dev-head">
        <div class="dev-title">
          <h3>Observer Dev Console</h3>
          <p>Local override seam for experimental model tuning. Hidden access is convenience, not authentication.</p>
        </div>
        <button class="dev-close" id="devClose" type="button" aria-label="Close developer console">×</button>
      </div>
      <div class="dev-status">
        <span class="dev-pill" id="devOpenPill">Console</span>
        <span class="dev-pill" id="devOverridePill">Override Off</span>
        <span class="dev-pill" id="devSourcePill">localStorage seam</span>
      </div>
      <section class="dev-section">
        <h4>Model variables</h4>
        <div class="dev-grid" id="devModelGrid"></div>
      </section>
      <section class="dev-section">
        <h4>Observation simulation</h4>
        <div class="dev-grid" id="devTelemetryGrid"></div>
        <div class="dev-control" style="margin-top:.62rem">
          <label for="devSky">Sky</label>
          <input id="devSky" type="text" value="Night">
          <span></span>
        </div>
      </section>
      <section class="dev-section">
        <h4>Override packet</h4>
        <textarea class="dev-json" id="devJson" spellcheck="false"></textarea>
      </section>
      <div class="dev-actions">
        <button class="dev-action primary" id="devEnable" type="button">Enable override</button>
        <button class="dev-action" id="devApply" type="button">Apply values</button>
        <button class="dev-action" id="devCopy" type="button">Copy JSON</button>
        <button class="dev-action" id="devImport" type="button">Import JSON</button>
        <button class="dev-action danger" id="devReset" type="button">Reset override</button>
        <button class="dev-action danger" id="devHideAccess" type="button">Hide Dev Access</button>
      </div>
      <p class="dev-boundary"><b>Boundary:</b> Dev values are local simulations and theoretical tuning aids. Hidden access keeps casual visitors out of the cockpit, but true security requires authenticated admin hosting.</p>
    `;
    document.body.appendChild(panel);
    buildControls();
    bindPanel();
  }

  function buildControls() {
    const model = document.getElementById('devModelGrid');
    const telemetry = document.getElementById('devTelemetryGrid');
    if (model) model.innerHTML = MODEL.map(row => controlMarkup(row)).join('');
    if (telemetry) telemetry.innerHTML = TELEMETRY.map(row => controlMarkup(row)).join('');
  }

  function controlMarkup([key,label,min,max,step]) {
    const value = state[key];
    return `
      <div class="dev-control" data-dev-control="${key}">
        <label for="dev_${key}">${label}</label>
        <input id="dev_${key}" data-dev-range="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}">
        <input data-dev-number="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${value}">
      </div>
    `;
  }

  function bindPanel() {
    document.getElementById('devClose')?.addEventListener('click', () => setConsoleOpen(false));
    document.getElementById('devHideAccess')?.addEventListener('click', () => {
      hideDevAccess();
      setHintSafe('DEV access hidden. Use ?observerDev=1 or #observer-dev to unlock again on this device.');
    });
    document.getElementById('devEnable')?.addEventListener('click', () => {
      state.enabled = !state.enabled;
      try { localStorage.setItem(OVERRIDE_ENABLED_KEY, state.enabled ? '1' : '0'); } catch (e) {}
      if (state.enabled) writeOverride();
      updateStatus();
      syncControls();
    });
    document.getElementById('devApply')?.addEventListener('click', () => {
      readControls();
      state.enabled = true;
      try { localStorage.setItem(OVERRIDE_ENABLED_KEY, '1'); } catch (e) {}
      writeOverride();
      syncControls();
      setHintSafe('Dev override applied through the local packet seam.');
    });
    document.getElementById('devCopy')?.addEventListener('click', async () => {
      const text = JSON.stringify(buildPacket(), null, 2);
      document.getElementById('devJson').value = text;
      try { await navigator.clipboard.writeText(text); setHintSafe('Dev override JSON copied.'); } catch (e) { setHintSafe('Clipboard blocked; JSON is selected in the console.'); }
    });
    document.getElementById('devImport')?.addEventListener('click', () => {
      const txt = document.getElementById('devJson')?.value || '';
      try {
        const packet = JSON.parse(txt);
        importPacket(packet);
        state.enabled = true;
        try { localStorage.setItem(OVERRIDE_ENABLED_KEY, '1'); } catch (e) {}
        writeOverride();
        syncControls();
        setHintSafe('Imported dev override packet.');
      } catch (e) { setHintSafe('Import failed: JSON did not parse.'); }
    });
    document.getElementById('devReset')?.addEventListener('click', () => {
      Object.assign(state, DEFAULTS);
      clearOverride();
      setHintSafe('Dev override reset. The observer is back to bridge/local/fallback flow.');
    });
    document.addEventListener('input', event => {
      const key = event.target.dataset?.devRange || event.target.dataset?.devNumber;
      if (!key) return;
      const value = Number(event.target.value);
      if (!Number.isFinite(value)) return;
      state[key] = value;
      syncLinkedInputs(key, value);
      updateJson();
      if (state.enabled) writeOverride();
    });
    document.getElementById('devSky')?.addEventListener('input', event => {
      state.sky = event.target.value || 'Dev Override';
      updateJson();
      if (state.enabled) writeOverride();
    });
  }

  function importPacket(packet) {
    const field = packet.field || {};
    MODEL.forEach(([key]) => {
      if (key === 'charge') state.charge = Number(packet.charge ?? state.charge);
      else if (typeof field[key] === 'number') state[key] = field[key];
    });
    const entry = Array.isArray(packet.entries) ? packet.entries[0]?.d || {} : {};
    if (typeof entry.kp === 'number') state.kp = entry.kp;
    if (typeof entry.bz === 'number') state.bz = entry.bz;
    if (entry.moon && typeof entry.moon.illumination === 'number') state.moonIllum = entry.moon.illumination;
    if (entry.sky) state.sky = String(entry.sky);
  }

  function readControls() {
    [...MODEL, ...TELEMETRY].forEach(([key]) => {
      const input = document.querySelector(`[data-dev-number="${key}"]`);
      if (input) state[key] = Number(input.value);
    });
    state.sky = document.getElementById('devSky')?.value || 'Dev Override';
  }

  function syncControls() {
    [...MODEL, ...TELEMETRY].forEach(([key]) => syncLinkedInputs(key, state[key]));
    const sky = document.getElementById('devSky');
    if (sky) sky.value = state.sky;
    const enable = document.getElementById('devEnable');
    if (enable) enable.textContent = state.enabled ? 'Disable override' : 'Enable override';
    updateJson();
    updateStatus();
  }

  function syncLinkedInputs(key, value) {
    document.querySelectorAll(`[data-dev-range="${key}"], [data-dev-number="${key}"]`).forEach(input => input.value = value);
  }

  function updateJson() {
    const area = document.getElementById('devJson');
    if (area) area.value = JSON.stringify(buildPacket(), null, 2);
  }

  function updateStatus() {
    const btn = document.getElementById('observerDevBtn');
    const panel = document.getElementById('observerDevConsole');
    const open = Boolean(panel && !panel.hidden);
    if (btn) {
      btn.textContent = open ? 'DEV · ON' : 'DEV · OFF';
      btn.setAttribute('aria-pressed', String(open));
    }
    const openPill = document.getElementById('devOpenPill');
    const overridePill = document.getElementById('devOverridePill');
    if (openPill) openPill.classList.toggle('active', open);
    if (overridePill) {
      overridePill.textContent = state.enabled ? 'Override On' : 'Override Off';
      overridePill.classList.toggle('active', state.enabled);
    }
  }

  function isOpen() {
    const panel = document.getElementById('observerDevConsole');
    return Boolean(panel && !panel.hidden);
  }

  function setConsoleOpen(open) {
    if (!hasDevAccess()) { removeButton(); return; }
    ensureConsole();
    const panel = document.getElementById('observerDevConsole');
    if (!panel) return;
    panel.hidden = !open;
    try { localStorage.setItem(DEV_ENABLED_KEY, open ? '1' : '0'); } catch (e) {}
    updateStatus();
  }

  function setHintSafe(text) {
    const hint = document.getElementById('instrumentHint');
    if (hint) hint.textContent = text;
  }

  document.addEventListener('DOMContentLoaded', () => {
    readCurrentFromPacket();
    const access = checkUrlAccess();
    if (!access) { removeButton(); return; }
    ensureButton();
    ensureConsole();
    syncControls();
    if (state.enabled) writeOverride();
    let open = false;
    try { open = localStorage.getItem(DEV_ENABLED_KEY) === '1'; } catch (e) {}
    setConsoleOpen(open);
  });
})();
