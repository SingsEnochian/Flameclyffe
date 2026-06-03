/* DEEP Observer Sensory Engine v0.2 */
'use strict';

(() => {
  const STORAGE_KEY = 'deep_observer_sensory_v1';
  const POSITION_KEY = 'deep_observer_sensory_position_v1';
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  const state = {
    enabled: false,
    haptics: true,
    hum: false,
    low: false,
    ctx: null,
    master: null,
    humGain: null,
    humOsc: null,
    dragNoise: null,
    dragFilter: null,
    dragGain: null,
    lastTrigger: 0,
    lastDragTone: 0,
    response: 0,
    dragging: false,
    moved: false,
    dragOffsetX: 0,
    dragOffsetY: 0
  };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      Object.assign(state, {
        enabled: Boolean(saved.enabled),
        haptics: saved.haptics !== false,
        hum: Boolean(saved.hum),
        low: Boolean(saved.low)
      });
    } catch (e) {}
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        enabled: state.enabled,
        haptics: state.haptics,
        hum: state.hum,
        low: state.low
      }));
    } catch (e) {}
  }

  function loadPosition() {
    try {
      return JSON.parse(localStorage.getItem(POSITION_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function savePosition(x, y) {
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify({ x, y }));
    } catch (e) {}
  }

  function clampPanelPosition(x, y, panel) {
    const pad = 10;
    const rect = panel.getBoundingClientRect();
    const w = rect.width || 72;
    const h = rect.height || 72;
    return {
      x: clamp(x, pad, window.innerWidth - w - pad),
      y: clamp(y, pad, window.innerHeight - h - pad)
    };
  }

  function setPanelPosition(x, y, persist = true) {
    const panel = document.getElementById('sensoryPanel');
    if (!panel) return;
    const p = clampPanelPosition(x, y, panel);
    panel.style.left = `${p.x}px`;
    panel.style.top = `${p.y}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    if (persist) savePosition(p.x, p.y);
  }

  function applySavedPosition() {
    const panel = document.getElementById('sensoryPanel');
    if (!panel) return;
    const saved = loadPosition();
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      setPanelPosition(saved.x, saved.y, false);
    }
  }

  function ensurePanel() {
    if (document.getElementById('sensoryPanel')) return;
    const panel = document.createElement('aside');
    panel.id = 'sensoryPanel';
    panel.className = 'sensory-panel';
    panel.setAttribute('aria-label', 'Sensory engine controls');
    panel.innerHTML = `
      <div class="sensory-title" id="sensoryDragHandle"><span>Sensory Engine</span><button id="sensoryMinimise" type="button">min</button></div>
      <div class="sensory-controls">
        <button class="sensory-toggle primary" id="sensoryEnable" type="button" aria-pressed="false">Sound Off</button>
        <button class="sensory-toggle" id="sensoryHaptics" type="button" aria-pressed="true">Haptics</button>
        <button class="sensory-toggle" id="sensoryHum" type="button" aria-pressed="false">Hum</button>
        <button class="sensory-toggle" id="sensoryLow" type="button" aria-pressed="false">Soft</button>
      </div>
      <div class="sensory-details">
        <span id="sensoryStatus">Tap Sound Off to wake the gem-click engine.</span>
        <div class="sensory-meter" aria-label="Interface responsiveness"><span id="sensoryMeter"></span></div>
      </div>
    `;
    document.body.appendChild(panel);
    applySavedPosition();

    document.getElementById('sensoryEnable')?.addEventListener('click', async () => {
      state.enabled = !state.enabled;
      if (state.enabled) await wake();
      if (!state.enabled) stopHum();
      save();
      syncPanel();
      respond('toggle', state.enabled ? 1 : .45);
    });
    document.getElementById('sensoryHaptics')?.addEventListener('click', () => {
      state.haptics = !state.haptics;
      save(); syncPanel(); respond('toggle', .65);
    });
    document.getElementById('sensoryHum')?.addEventListener('click', async () => {
      state.hum = !state.hum;
      if (state.hum && state.enabled) await startHum();
      if (!state.hum) stopHum();
      save(); syncPanel(); respond('hum', .7);
    });
    document.getElementById('sensoryLow')?.addEventListener('click', () => {
      state.low = !state.low;
      if (state.master) state.master.gain.value = state.low ? .055 : .09;
      if (state.humGain) state.humGain.gain.value = state.low ? .012 : .022;
      save(); syncPanel(); respond('toggle', .45);
    });
    document.getElementById('sensoryMinimise')?.addEventListener('click', event => {
      event.stopPropagation();
      panel.classList.toggle('minimised');
      respond(panel.classList.contains('minimised') ? 'minimise' : 'unfold', .55);
    });

    bindPanelDrag(panel);
  }

  function syncPanel() {
    const enable = document.getElementById('sensoryEnable');
    const haptics = document.getElementById('sensoryHaptics');
    const hum = document.getElementById('sensoryHum');
    const low = document.getElementById('sensoryLow');
    const status = document.getElementById('sensoryStatus');
    if (enable) {
      enable.textContent = state.enabled ? 'Sound On' : 'Sound Off';
      enable.setAttribute('aria-pressed', String(state.enabled));
    }
    if (haptics) haptics.setAttribute('aria-pressed', String(state.haptics));
    if (hum) hum.setAttribute('aria-pressed', String(state.hum));
    if (low) low.setAttribute('aria-pressed', String(state.low));
    if (status) {
      status.textContent = state.enabled
        ? `Gem clicks ${state.low ? 'softened' : 'active'} · haptics ${state.haptics ? 'armed' : 'off'} · hum ${state.hum ? 'listening' : 'idle'}`
        : 'Tap Sound Off to wake the gem-click engine.';
    }
  }

  async function wake() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!state.ctx) {
      state.ctx = new AudioContext();
      state.master = state.ctx.createGain();
      state.master.gain.value = state.low ? .055 : .09;
      state.master.connect(state.ctx.destination);
    }
    if (state.ctx.state === 'suspended') await state.ctx.resume();
    if (state.hum) startHum();
  }

  function envGain(duration = .12, peak = .05) {
    if (!state.ctx || !state.master) return null;
    const g = state.ctx.createGain();
    const now = state.ctx.currentTime;
    const amount = state.low ? peak * .45 : peak;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, amount), now + .012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    g.connect(state.master);
    return g;
  }

  function tone(freq, duration = .12, type = 'sine', peak = .045, detune = 0) {
    if (!state.enabled || !state.ctx) return;
    const osc = state.ctx.createOscillator();
    const g = envGain(duration, peak);
    if (!g) return;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, state.ctx.currentTime);
    osc.detune.value = detune;
    osc.connect(g);
    osc.start();
    osc.stop(state.ctx.currentTime + duration + .02);
  }

  function noiseClick(duration = .055, peak = .04) {
    if (!state.enabled || !state.ctx) return;
    const bufferSize = Math.max(1, Math.floor(state.ctx.sampleRate * duration));
    const buffer = state.ctx.createBuffer(1, bufferSize, state.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const decay = 1 - i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * decay * decay * .45;
    }
    const source = state.ctx.createBufferSource();
    const filter = state.ctx.createBiquadFilter();
    const g = envGain(duration + .04, peak);
    if (!g) return;
    filter.type = 'bandpass';
    filter.frequency.value = 1150;
    filter.Q.value = 1.8;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(g);
    source.start();
  }

  async function startHum() {
    if (!state.enabled) return;
    await wake();
    if (!state.ctx || state.humOsc) return;
    state.humGain = state.ctx.createGain();
    state.humGain.gain.value = 0;
    state.humGain.connect(state.master);
    state.humOsc = state.ctx.createOscillator();
    state.humOsc.type = 'sine';
    state.humOsc.frequency.value = 110;
    state.humOsc.connect(state.humGain);
    state.humOsc.start();
    const now = state.ctx.currentTime;
    state.humGain.gain.cancelScheduledValues(now);
    state.humGain.gain.setValueAtTime(0.0001, now);
    state.humGain.gain.linearRampToValueAtTime(state.low ? .012 : .022, now + .8);
  }

  function stopHum() {
    if (!state.ctx || !state.humOsc || !state.humGain) return;
    const osc = state.humOsc;
    const g = state.humGain;
    const now = state.ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.linearRampToValueAtTime(0.0001, now + .35);
    window.setTimeout(() => {
      try { osc.stop(); } catch (e) {}
      try { osc.disconnect(); g.disconnect(); } catch (e) {}
    }, 420);
    state.humOsc = null;
    state.humGain = null;
  }

  function startGlassDrag() {
    if (!state.enabled || !state.ctx || state.low || state.dragNoise) return;
    const bufferSize = Math.floor(state.ctx.sampleRate * 1.2);
    const buffer = state.ctx.createBuffer(1, bufferSize, state.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * .18;
    const source = state.ctx.createBufferSource();
    const filter = state.ctx.createBiquadFilter();
    const gain = state.ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 2.2;
    gain.gain.value = 0.0001;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(state.master);
    source.start();
    const now = state.ctx.currentTime;
    gain.gain.linearRampToValueAtTime(.008, now + .08);
    state.dragNoise = source;
    state.dragFilter = filter;
    state.dragGain = gain;
  }

  function updateGlassDrag(velocity) {
    if (!state.dragFilter || !state.dragGain || !state.ctx) return;
    const v = clamp(velocity / 34, 0, 1);
    const now = state.ctx.currentTime;
    state.dragFilter.frequency.cancelScheduledValues(now);
    state.dragFilter.frequency.linearRampToValueAtTime(900 + v * 1800, now + .06);
    state.dragGain.gain.cancelScheduledValues(now);
    state.dragGain.gain.linearRampToValueAtTime((state.low ? .003 : .006) + v * .016, now + .05);
  }

  function stopGlassDrag() {
    if (!state.ctx || !state.dragNoise || !state.dragGain) return;
    const source = state.dragNoise;
    const gain = state.dragGain;
    const now = state.ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.linearRampToValueAtTime(0.0001, now + .14);
    window.setTimeout(() => {
      try { source.stop(); source.disconnect(); gain.disconnect(); } catch (e) {}
    }, 180);
    state.dragNoise = null;
    state.dragFilter = null;
    state.dragGain = null;
  }

  function haptic(pattern) {
    if (!state.haptics || state.low) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }

  function meter(amount) {
    state.response = clamp(amount);
    const el = document.getElementById('sensoryMeter');
    if (el) el.style.width = `${Math.round(state.response * 100)}%`;
    document.body.classList.remove('sensory-pulse');
    void document.body.offsetWidth;
    document.body.classList.add('sensory-pulse');
    window.setTimeout(() => document.body.classList.remove('sensory-pulse'), 520);
  }

  function respond(kind = 'gem', intensity = .6) {
    const now = performance.now();
    if (now - state.lastTrigger < 42) return;
    state.lastTrigger = now;
    meter(intensity);

    if (state.enabled) {
      if (!state.ctx) wake();
      const soft = state.low ? .55 : 1;
      switch (kind) {
        case 'gem':
          noiseClick(.04, .028 * soft);
          tone(740, .09, 'sine', .032 * soft, -8);
          tone(1180, .075, 'triangle', .018 * soft, 6);
          break;
        case 'time':
          noiseClick(.045, .022 * soft);
          tone(432, .16, 'sine', .035 * soft);
          window.setTimeout(() => tone(648, .18, 'sine', .026 * soft), 75);
          break;
        case 'toggle':
          noiseClick(.055, .032 * soft);
          tone(520, .10, 'triangle', .026 * soft);
          window.setTimeout(() => tone(780, .12, 'sine', .020 * soft), 55);
          break;
        case 'hum':
          tone(220, .22, 'sine', .030 * soft);
          window.setTimeout(() => tone(330, .18, 'sine', .018 * soft), 80);
          break;
        case 'packet':
          noiseClick(.035, .020 * soft);
          tone(880, .07, 'triangle', .022 * soft);
          window.setTimeout(() => tone(1320, .08, 'sine', .016 * soft), 45);
          break;
        case 'canvas':
          noiseClick(.035, .018 * soft);
          tone(300, .08, 'sine', .018 * soft);
          break;
        case 'minimise':
          noiseClick(.04, .018 * soft);
          tone(390, .12, 'sine', .020 * soft);
          break;
        case 'unfold':
          tone(390, .10, 'sine', .018 * soft);
          window.setTimeout(() => tone(620, .13, 'triangle', .022 * soft), 55);
          break;
        case 'snap':
          noiseClick(.032, .020 * soft);
          tone(940, .07, 'triangle', .016 * soft);
          break;
        default:
          noiseClick(.04, .022 * soft);
      }
    }

    if (kind === 'time') haptic([12, 24, 12]);
    else if (kind === 'toggle') haptic(18);
    else if (kind === 'packet') haptic([10, 20, 10]);
    else if (kind === 'snap') haptic([7, 18, 7]);
    else haptic(8);
  }

  function bindPanelDrag(panel) {
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;

    const isDragTarget = target => {
      if (panel.classList.contains('minimised') || document.body.classList.contains('interface-cloaked')) return target.closest?.('#sensoryPanel');
      return target.closest?.('#sensoryDragHandle');
    };

    panel.addEventListener('pointerdown', async event => {
      if (!isDragTarget(event.target)) return;
      if (event.target.closest?.('button') && !panel.classList.contains('minimised') && !document.body.classList.contains('interface-cloaked')) return;
      await wake();
      const rect = panel.getBoundingClientRect();
      state.dragging = true;
      state.moved = false;
      state.dragOffsetX = event.clientX - rect.left;
      state.dragOffsetY = event.clientY - rect.top;
      lastX = event.clientX;
      lastY = event.clientY;
      lastT = performance.now();
      panel.classList.add('dragging');
      panel.setPointerCapture?.(event.pointerId);
      startGlassDrag();
      event.preventDefault();
    });

    panel.addEventListener('pointermove', event => {
      if (!state.dragging) return;
      const now = performance.now();
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      const dt = Math.max(16, now - lastT);
      const velocity = Math.hypot(dx, dy) / dt * 16;
      if (Math.hypot(dx, dy) > 2) state.moved = true;
      setPanelPosition(event.clientX - state.dragOffsetX, event.clientY - state.dragOffsetY, true);
      updateGlassDrag(velocity);
      lastX = event.clientX;
      lastY = event.clientY;
      lastT = now;
    });

    function endDrag(event) {
      if (!state.dragging) return;
      state.dragging = false;
      panel.classList.remove('dragging');
      stopGlassDrag();
      try { if (event?.pointerId !== undefined) panel.releasePointerCapture?.(event.pointerId); } catch (e) {}
      if (state.moved) respond('snap', .52);
    }

    panel.addEventListener('pointerup', event => {
      const wasMoved = state.moved;
      endDrag(event);
      if (!wasMoved && (panel.classList.contains('minimised') || document.body.classList.contains('interface-cloaked'))) {
        if (!document.body.classList.contains('interface-cloaked')) {
          panel.classList.remove('minimised');
          respond('unfold', .55);
        } else {
          respond('gem', .45);
        }
      }
    });
    panel.addEventListener('pointercancel', endDrag);
  }

  function handleCloakChange(cloaked) {
    const panel = document.getElementById('sensoryPanel');
    if (!panel) return;
    if (cloaked) {
      panel.classList.add('minimised');
      respond('minimise', .44);
    } else {
      panel.classList.remove('minimised');
      respond('unfold', .50);
    }
  }

  function classify(target) {
    if (!target) return null;
    if (target.closest?.('[data-reading="time"], [data-meter="time"]')) return 'time';
    if (target.closest?.('[data-reading], .sensor-node, [data-meter], .meter, #sensoryPanel.minimised')) return 'gem';
    if (target.closest?.('[data-filter], .filter, #themeBtn, #toyBtn, #stimBtn, .interface-cloak-toggle')) return 'toggle';
    if (target.closest?.('#copyPacket, #saveLocal, .action')) return 'packet';
    if (target.closest?.('canvas')) return 'canvas';
    if (target.closest?.('#dualTimeHologram')) return 'gem';
    return null;
  }

  function bind() {
    document.addEventListener('pointerdown', event => {
      if (event.target.closest?.('#sensoryPanel')) return;
      const kind = classify(event.target);
      if (!kind) return;
      respond(kind, kind === 'time' ? .95 : kind === 'packet' ? .7 : .55);
    }, { passive: true });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const kind = classify(document.activeElement);
      if (!kind) return;
      respond(kind, kind === 'time' ? .95 : .55);
    });

    window.addEventListener('deep-observer:cloak', event => {
      handleCloakChange(Boolean(event.detail?.cloaked));
    });

    window.addEventListener('resize', () => {
      const panel = document.getElementById('sensoryPanel');
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      setPanelPosition(rect.left, rect.top, true);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopHum();
      else if (state.enabled && state.hum) startHum();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    load();
    ensurePanel();
    syncPanel();
    bind();
  });
})();
