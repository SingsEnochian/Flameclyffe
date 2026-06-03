/* DEEP Observer Sensory Engine v0.1 */
'use strict';

(() => {
  const STORAGE_KEY = 'deep_observer_sensory_v1';
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
    lastTrigger: 0,
    response: 0
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

  function ensurePanel() {
    if (document.getElementById('sensoryPanel')) return;
    const panel = document.createElement('aside');
    panel.id = 'sensoryPanel';
    panel.className = 'sensory-panel';
    panel.setAttribute('aria-label', 'Sensory engine controls');
    panel.innerHTML = `
      <div class="sensory-title"><span>Sensory Engine</span><button id="sensoryMinimise" type="button">min</button></div>
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
      save(); syncPanel(); respond('toggle', .45);
    });
    document.getElementById('sensoryMinimise')?.addEventListener('click', () => {
      panel.classList.toggle('minimised');
    });
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
        default:
          noiseClick(.04, .022 * soft);
      }
    }

    if (kind === 'time') haptic([12, 24, 12]);
    else if (kind === 'toggle') haptic(18);
    else if (kind === 'packet') haptic([10, 20, 10]);
    else haptic(8);
  }

  function classify(target) {
    if (!target) return null;
    if (target.closest?.('[data-reading="time"], [data-meter="time"]')) return 'time';
    if (target.closest?.('[data-reading], .sensor-node, [data-meter], .meter')) return 'gem';
    if (target.closest?.('[data-filter], .filter, #themeBtn, #toyBtn, #stimBtn, .interface-cloak-toggle')) return 'toggle';
    if (target.closest?.('#copyPacket, #saveLocal, .action')) return 'packet';
    if (target.closest?.('canvas')) return 'canvas';
    if (target.closest?.('#dualTimeHologram')) return 'gem';
    return null;
  }

  function bind() {
    document.addEventListener('pointerdown', event => {
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
