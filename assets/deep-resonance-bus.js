/* Deep Resonance Bus v1
   Shared browser sound layer for DEEP/STARWELL/Flameclyffe instruments.
   Reads a visible packet, maps DEEP variables to layered tones, and treats interaction as view/sensory response, not truth mutation. */
'use strict';

(function () {
  const STORAGE_KEY = 'deep_resonance_bus_v1';
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const n = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;

  const fallbackDeep = {
    P: .55, C: .50, R: .45, E: .38, M: .30, A: .65, H: .50,
    charge: .20, moonIllum: 50, kp: 1, bz: 0, sky: 'Night', source: 'fallback'
  };

  const layerSpecs = {
    foundation: { base: 108, type: 'sine', gain: .020, pan: 0, label: 'Presence and horizon floor' },
    field: { base: 174, type: 'triangle', gain: .014, pan: -.28, label: 'Coherence body' },
    pulse: { base: 432, type: 'sine', gain: .012, pan: .28, label: 'Resonance and momentum pulse' },
    shimmer: { base: 888, type: 'sine', gain: .006, pan: 0, label: 'Alignment and moon glint' },
    texture: { base: 1180, type: 'sawtooth', gain: .003, pan: 0, label: 'Entropy breath texture' }
  };

  const state = {
    active: false,
    soft: false,
    ctx: null,
    master: null,
    compressor: null,
    layers: {},
    raf: null,
    lastPacketText: '',
    cachedPacket: null,
    packetSelector: '#packet',
    sourceLabel: 'fallback',
    lastPing: 0,
    onState: null
  };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      state.soft = Boolean(saved.soft);
      state.packetSelector = saved.packetSelector || state.packetSelector;
    } catch (e) {}
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ soft: state.soft, packetSelector: state.packetSelector }));
    } catch (e) {}
  }

  function emit() {
    try {
      window.dispatchEvent(new CustomEvent('deep-resonance:state', {
        detail: { active: state.active, soft: state.soft, source: state.sourceLabel, layers: Object.keys(state.layers) }
      }));
      if (typeof state.onState === 'function') state.onState({ active: state.active, soft: state.soft, source: state.sourceLabel });
    } catch (e) {}
  }

  async function ensureAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    if (!state.ctx) {
      state.ctx = new AudioContext();
      state.master = state.ctx.createGain();
      state.master.gain.value = state.soft ? .040 : .072;
      state.compressor = state.ctx.createDynamicsCompressor();
      state.compressor.threshold.value = -30;
      state.compressor.knee.value = 24;
      state.compressor.ratio.value = 7;
      state.compressor.attack.value = .018;
      state.compressor.release.value = .32;
      state.master.connect(state.compressor);
      state.compressor.connect(state.ctx.destination);
    }
    if (state.ctx.state === 'suspended') await state.ctx.resume();
    return true;
  }

  function pannedGain(pan = 0) {
    const gain = state.ctx.createGain();
    gain.gain.value = 0.0001;
    let panner = null;
    if (state.ctx.createStereoPanner) {
      panner = state.ctx.createStereoPanner();
      panner.pan.value = clamp(pan, -1, 1);
      gain.connect(panner);
      panner.connect(state.master);
    } else {
      gain.connect(state.master);
    }
    return { input: gain, gain, panner };
  }

  function createLayer(name, spec) {
    if (!state.ctx) return null;
    const osc = state.ctx.createOscillator();
    const route = pannedGain(spec.pan);
    const filter = state.ctx.createBiquadFilter();
    osc.type = spec.type;
    osc.frequency.value = spec.base;
    filter.type = name === 'texture' ? 'bandpass' : 'lowpass';
    filter.frequency.value = name === 'texture' ? 950 : 1800;
    filter.Q.value = name === 'texture' ? 4 : .6;
    osc.connect(filter);
    filter.connect(route.input);
    osc.start();
    return { name, spec, osc, filter, gain: route.gain, panner: route.panner };
  }

  function readPacket() {
    const el = document.querySelector(state.packetSelector);
    const text = el?.textContent || '';
    if (text && text !== state.lastPacketText) {
      state.lastPacketText = text;
      try {
        const packet = JSON.parse(text);
        const deep = packet.deep || packet.DEEP || packet.state || {};
        state.cachedPacket = { packet, deep: { ...fallbackDeep, ...deep, source: packet.source || deep.source || fallbackDeep.source } };
      } catch (e) {}
    }
    if (state.cachedPacket) return state.cachedPacket;
    return { packet: null, deep: fallbackDeep };
  }

  function targetsFor(deep, timeMs) {
    const P = clamp(n(deep.P, fallbackDeep.P));
    const C = clamp(n(deep.C, fallbackDeep.C));
    const R = clamp(n(deep.R, fallbackDeep.R));
    const E = clamp(n(deep.E, fallbackDeep.E));
    const M = clamp(n(deep.M, fallbackDeep.M));
    const A = clamp(n(deep.A, fallbackDeep.A));
    const H = clamp(n(deep.H, fallbackDeep.H));
    const Q = clamp(n(deep.charge, fallbackDeep.charge));
    const moon = clamp(n(deep.moonIllum, fallbackDeep.moonIllum), 0, 100) / 100;
    const kp = clamp(n(deep.kp, fallbackDeep.kp), 0, 9) / 9;
    const bz = clamp(n(deep.bz, fallbackDeep.bz), -20, 20) / 20;
    const soft = state.soft ? .42 : 1;
    const wobble = Math.sin(timeMs * .00044 + M * 5) * (.012 + E * .05);
    const slowOrbit = Math.sin(timeMs * .00016 + R * TAU);

    return {
      foundation: { freq: 96 + P * 36 + H * 42 + Q * 16, gain: (.005 + P * .014 + H * .006 + Q * .006) * soft, pan: 0, filter: 1200 + C * 900 },
      field: { freq: 144 + C * 150 + bz * 12, gain: (.003 + C * .013 + P * .003) * soft, pan: clamp(-.34 + wobble, -.72, .12), filter: 900 + C * 1600 },
      pulse: { freq: 216 + R * 260 + M * 72 + kp * 36, gain: (.0025 + R * .011 + M * .004 + kp * .004) * soft, pan: clamp(.34 - wobble, -.12, .72), filter: 1000 + R * 1800 },
      shimmer: { freq: 720 + A * 420 + moon * 240 + bz * 22, gain: (.0013 + A * .0045 + moon * .003 + Q * .002) * soft, pan: slowOrbit * (.16 + R * .22), filter: 1600 + A * 2400 },
      texture: { freq: 520 + E * 740 + kp * 260, gain: (.0008 + E * .004 + kp * .002) * soft, pan: -slowOrbit * (.20 + E * .2), filter: 700 + E * 2200 }
    };
  }

  function modulate(timeMs) {
    if (!state.active || !state.ctx) {
      state.raf = null;
      return;
    }
    const { deep } = readPacket();
    state.sourceLabel = deep.source || 'fallback';
    const targets = targetsFor(deep, timeMs);
    const now = state.ctx.currentTime;

    Object.entries(targets).forEach(([name, target]) => {
      const layer = state.layers[name];
      if (!layer) return;
      try {
        layer.osc.frequency.cancelScheduledValues(now);
        layer.osc.frequency.linearRampToValueAtTime(Math.max(20, target.freq), now + .20);
        layer.gain.gain.cancelScheduledValues(now);
        layer.gain.gain.linearRampToValueAtTime(Math.max(0.0001, Math.min(.036, target.gain)), now + .24);
        if (layer.panner) {
          layer.panner.pan.cancelScheduledValues(now);
          layer.panner.pan.linearRampToValueAtTime(clamp(target.pan, -1, 1), now + .26);
        }
        if (layer.filter) {
          layer.filter.frequency.cancelScheduledValues(now);
          layer.filter.frequency.linearRampToValueAtTime(Math.max(80, target.filter), now + .28);
        }
      } catch (e) {}
    });

    emit();
    state.raf = requestAnimationFrame(modulate);
  }

  async function start(options = {}) {
    if (options.packetSelector) state.packetSelector = options.packetSelector;
    if (typeof options.soft === 'boolean') state.soft = options.soft;
    if (typeof options.onState === 'function') state.onState = options.onState;
    save();
    const ok = await ensureAudio();
    if (!ok) return false;
    state.active = true;
    Object.entries(layerSpecs).forEach(([name, spec]) => {
      if (!state.layers[name]) state.layers[name] = createLayer(name, spec);
    });
    if (!state.raf) state.raf = requestAnimationFrame(modulate);
    emit();
    return true;
  }

  function stop() {
    state.active = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = null;
    const now = state.ctx?.currentTime || 0;
    Object.values(state.layers).forEach(layer => {
      try {
        layer.gain.gain.cancelScheduledValues(now);
        layer.gain.gain.linearRampToValueAtTime(0.0001, now + .32);
        window.setTimeout(() => {
          try { layer.osc.stop(); } catch (e) {}
          try { layer.osc.disconnect(); layer.filter?.disconnect(); layer.gain.disconnect(); layer.panner?.disconnect(); } catch (e) {}
        }, 380);
      } catch (e) {}
    });
    state.layers = {};
    emit();
  }

  function setSoft(value) {
    state.soft = Boolean(value);
    if (state.master) state.master.gain.value = state.soft ? .040 : .072;
    save();
    emit();
  }

  function shortRoute(pan = 0) {
    if (!state.ctx || !state.master) return null;
    const route = pannedGain(pan);
    return route.gain ? route : null;
  }

  function ping(kind = 'gem', options = {}) {
    const nowMs = performance.now();
    if (nowMs - state.lastPing < 36) return;
    state.lastPing = nowMs;
    if (!state.ctx || state.ctx.state === 'suspended') ensureAudio();
    if (!state.ctx) return;

    const deep = readPacket().deep;
    const soft = state.soft ? .45 : 1;
    const intensity = clamp(n(options.intensity, .6));
    const pan = clamp(n(options.pan, 0), -1, 1);
    const now = state.ctx.currentTime;
    const route = shortRoute(pan);
    if (!route) return;

    const osc = state.ctx.createOscillator();
    const gain = route.gain;
    const base = kind === 'time' ? 432 : kind === 'packet' ? 880 : kind === 'canvas' ? 300 : kind === 'toggle' ? 520 : 740;
    const freq = base + clamp(n(deep.R, .45)) * 90 + clamp(n(deep.A, .65)) * 36;
    osc.type = kind === 'packet' ? 'triangle' : kind === 'canvas' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, (.012 + intensity * .024) * soft), now + .012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + .10 + intensity * .10);
    osc.connect(route.input);
    osc.start();
    osc.stop(now + .28);
  }

  function isActive() { return state.active; }
  function getState() { return { active: state.active, soft: state.soft, source: state.sourceLabel, packetSelector: state.packetSelector }; }

  load();
  window.DeepResonanceBus = { start, stop, setSoft, ping, isActive, getState, readPacket };
})();
