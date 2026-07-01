'use strict';

/*
  Mobius Layered Full Twist v0.2
  Keeps the original Full Twist lane intact, then adds Schumann-absent 3:6:9 layers
  plus validated user layers. Audio routing is established engineering; body and
  perception notes are subjective; cosmological interpretation is speculative.
*/

(function () {
  const FORBIDDEN_TAGS = new Set(['schumann', 'schumann-proxy', 'earth-body', 'earth-ionosphere']);
  const FORBIDDEN_FREQUENCIES = [7.83, 14.3, 20.8, 27.3, 33.8];
  const FORBIDDEN_PROXIES = [423, 772, 1123, 1474, 1825];
  const ROUTES = new Set(['left', 'right', 'centre', 'return']);
  const SAFE_USER_TONE_GAIN = 0.02;
  const SAFE_USER_NOISE_GAIN = 0.006;
  const SAFE_DEPTH = 0.85;
  const EPSILON = 0.03;

  const baseLayers = [
    {
      id: 'orbital-3',
      label: 'Orbital 3 Hz Envelope',
      frequency: 369,
      ampMod: 3,
      modulationDepth: 0.42,
      route: 'left',
      gain: 0.016,
      waveform: 'sine',
      claimLabel: 'subjective-experiment'
    },
    {
      id: 'orbital-6',
      label: 'Orbital 6 Hz Envelope',
      frequency: 432,
      ampMod: 6,
      modulationDepth: 0.36,
      route: 'centre',
      gain: 0.013,
      waveform: 'sine',
      claimLabel: 'subjective-experiment'
    },
    {
      id: 'orbital-9',
      label: 'Orbital 9 Hz Envelope',
      frequency: 522,
      ampMod: 9,
      modulationDepth: 0.32,
      route: 'right',
      gain: 0.011,
      waveform: 'sine',
      claimLabel: 'subjective-experiment'
    },
    {
      id: 'orbital-40-reference',
      label: 'Orbital 40 Hz Reference',
      frequency: 40,
      route: 'centre',
      gain: 0.006,
      waveform: 'sine',
      claimLabel: 'subjective-experiment'
    },
    {
      id: 'orbital-black-sky-noise',
      label: 'Black-Sky Drift Noise',
      noise: { filter: 980, q: 0.35, type: 'pink' },
      route: 'centre',
      gain: 0.0025,
      claimLabel: 'subjective-experiment'
    }
  ];

  const warn = (message, layer) => {
    try {
      console.warn(`[Mobius Layered Full Twist] ${message}`, layer || '');
    } catch (error) {}
  };

  const asNumber = (value, fallback = 0) => {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, asNumber(value, min)));

  const sameFrequency = (frequency, target) => Math.abs(asNumber(frequency) - target) <= EPSILON;

  function tagsFor(layer) {
    const raw = [];
    if (Array.isArray(layer.tags)) raw.push(...layer.tags);
    if (layer.tag) raw.push(layer.tag);
    if (layer.family) raw.push(layer.family);
    if (layer.claimLabel) raw.push(layer.claimLabel);
    return raw.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean);
  }

  function isForbiddenLayer(layer) {
    const tags = tagsFor(layer);
    if (tags.some((tag) => FORBIDDEN_TAGS.has(tag))) return 'forbidden Schumann/Earth-family tag';
    const frequency = asNumber(layer.frequency, 0);
    if (frequency > 0 && FORBIDDEN_FREQUENCIES.some((target) => sameFrequency(frequency, target))) {
      return 'forbidden Schumann-family frequency';
    }
    if (frequency > 0 && FORBIDDEN_PROXIES.some((target) => sameFrequency(frequency, target))) {
      return 'forbidden Schumann proxy frequency';
    }
    return '';
  }

  function normalizeLayer(layer, source = 'user') {
    if (!layer || typeof layer !== 'object') {
      warn('Omitted layer: expected an object.', layer);
      return null;
    }

    const reason = isForbiddenLayer(layer);
    if (reason) {
      warn(`Omitted ${layer.id || 'unnamed layer'}: ${reason}. Use subjective notes only, not audio layers.`, layer);
      return null;
    }

    const id = String(layer.id || '').trim();
    const label = String(layer.label || layer.name || '').trim();
    const route = String(layer.route || '').trim();
    const claimLabel = String(layer.claimLabel || '').trim();
    const hasFrequency = asNumber(layer.frequency, 0) > 0;
    const hasNoise = !!(layer.noise && typeof layer.noise === 'object');

    if (!id || !label || !route || layer.gain == null || !claimLabel || (!hasFrequency && !hasNoise)) {
      warn('Omitted layer: requires id, label/name, frequency or noise config, route, gain, and claim label.', layer);
      return null;
    }

    if (!ROUTES.has(route)) {
      warn(`Omitted ${id}: unsupported route "${route}".`, layer);
      return null;
    }

    const safeGain = hasNoise ? SAFE_USER_NOISE_GAIN : SAFE_USER_TONE_GAIN;
    const normalized = {
      id,
      label,
      route,
      claimLabel,
      gain: clamp(layer.gain, 0, source === 'base' ? asNumber(layer.gain, safeGain) : safeGain),
      waveform: ['sine', 'triangle', 'square', 'sawtooth'].includes(layer.waveform) ? layer.waveform : 'sine'
    };

    if (hasFrequency) {
      normalized.frequency = clamp(layer.frequency, 1, 22050);
      normalized.ampMod = asNumber(layer.ampMod || layer.ampModFrequency, 0);
      normalized.modulationDepth = clamp(layer.modulationDepth ?? layer.ampModDepth ?? 0.4, 0, SAFE_DEPTH);
    }

    if (hasNoise) {
      normalized.noise = {
        filter: clamp(layer.noise.filter ?? layer.noise.frequency ?? 700, 20, 8000),
        q: clamp(layer.noise.q ?? layer.noise.Q ?? 0.75, 0.1, 8),
        type: layer.noise.type === 'white' ? 'white' : 'pink'
      };
    }

    return normalized;
  }

  function validateUserSpec(spec) {
    const layers = Array.isArray(spec?.layers) ? spec.layers : [];
    return layers.map((layer) => normalizeLayer(layer, 'user')).filter(Boolean);
  }

  function allLayers(spec) {
    return [
      ...baseLayers.map((layer) => normalizeLayer(layer, 'base')).filter(Boolean),
      ...validateUserSpec(spec)
    ];
  }

  function install(MobiusAudioBus) {
    if (!MobiusAudioBus || MobiusAudioBus.prototype.__layeredFullTwistV02) return;
    const proto = MobiusAudioBus.prototype;
    const originalOneShot = proto.runOneShotMode;
    const originalHeld = proto.runHeldMode;

    proto.setLayeredSpec = function setLayeredSpec(spec) {
      this.layeredFullTwistSpec = spec && typeof spec === 'object' ? spec : null;
      this.emitState('layered-spec-updated');
    };

    proto.amplitudeModTone = function amplitudeModTone({ frequency = 440, ampMod = 0, modulationDepth = 0.4, route = 'centre', gain = 0.01, waveform = 'sine', duration = this.testSeconds }) {
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      const env = this.makeEnvelope(this.routeFor(route), gain, duration);
      const now = this.ctx.currentTime;
      const end = now + Math.max(0.12, duration);
      osc.type = waveform;
      osc.frequency.setValueAtTime(frequency, now);
      amp.gain.setValueAtTime(1, now);
      osc.connect(amp);
      amp.connect(env.gain);
      osc.start();
      osc.stop(end + 0.08);
      this.activeSources.push(osc, amp, env.gain);

      if (ampMod > 0) {
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(ampMod, now);
        lfoGain.gain.setValueAtTime(clamp(modulationDepth, 0, SAFE_DEPTH) * 0.5, now);
        amp.gain.setValueAtTime(1 - clamp(modulationDepth, 0, SAFE_DEPTH) * 0.5, now);
        lfo.connect(lfoGain);
        lfoGain.connect(amp.gain);
        lfo.start();
        lfo.stop(end + 0.08);
        this.activeSources.push(lfo, lfoGain);
      }

      return osc;
    };

    proto.heldAmplitudeModTone = function heldAmplitudeModTone({ frequency = 440, ampMod = 0, modulationDepth = 0.4, route = 'centre', gain = 0.01, waveform = 'sine' }) {
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      const env = this.makeHeldGain(this.routeFor(route), gain);
      const now = this.ctx.currentTime;
      osc.type = waveform;
      osc.frequency.setValueAtTime(frequency, now);
      amp.gain.setValueAtTime(1, now);
      osc.connect(amp);
      amp.connect(env);
      osc.start();
      this.activeSources.push(osc, amp, env);

      if (ampMod > 0) {
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(ampMod, now);
        lfoGain.gain.setValueAtTime(clamp(modulationDepth, 0, SAFE_DEPTH) * 0.5, now);
        amp.gain.setValueAtTime(1 - clamp(modulationDepth, 0, SAFE_DEPTH) * 0.5, now);
        lfo.connect(lfoGain);
        lfoGain.connect(amp.gain);
        lfo.start();
        this.activeSources.push(lfo, lfoGain);
      }

      return osc;
    };

    proto.runLayeredFullTwist = function runLayeredFullTwist({ held = false } = {}) {
      if (held) {
        this.heldTone({ frequency: 108, route: 'centre', gain: 0.016 });
        this.heldTone({ frequency: 369, route: 'left', gain: 0.025 });
        this.heldTone({ frequency: 363.5, route: 'right', gain: 0.025 });
        this.heldSplitTone({ frequency: 369, primary: 'left', secondary: 'return', primaryGain: 0.014, secondaryGain: 0.024 });
        this.noise({ route: 'centre', gain: 0.004, filter: 520, q: 0.5, loop: true });
      } else {
        this.tone({ frequency: 108, route: 'centre', gain: 0.022 });
        this.tone({ frequency: 369, route: 'left', gain: 0.035 });
        this.tone({ frequency: 363.5, route: 'right', gain: 0.035 });
        this.splitTone({ frequency: 369, primary: 'left', secondary: 'return', primaryGain: 0.020, secondaryGain: 0.032 });
        this.noise({ route: 'centre', gain: 0.006, filter: 520, q: 0.5 });
      }

      allLayers(this.layeredFullTwistSpec || window.mobiusLayeredFullTwistSpec).forEach((layer) => {
        if (layer.noise) {
          this.noise({ route: layer.route, gain: layer.gain, filter: layer.noise.filter, q: layer.noise.q, loop: held });
          return;
        }
        const play = held ? this.heldAmplitudeModTone : this.amplitudeModTone;
        play.call(this, {
          frequency: layer.frequency,
          ampMod: layer.ampMod,
          modulationDepth: layer.modulationDepth,
          route: layer.route,
          gain: layer.gain,
          waveform: layer.waveform
        });
      });
    };

    proto.runOneShotMode = function runOneShotMode(mode) {
      if (mode === 'layered-full-twist') return this.runLayeredFullTwist({ held: false });
      return originalOneShot.call(this, mode);
    };

    proto.runHeldMode = function runHeldMode(mode) {
      if (mode === 'layered-full-twist') return this.runLayeredFullTwist({ held: true });
      return originalHeld.call(this, mode);
    };

    proto.__layeredFullTwistV02 = true;
  }

  window.MobiusLayeredSpecAdapter = { install, validateUserSpec, allLayers, forbiddenTags: [...FORBIDDEN_TAGS] };
  install(window.MobiusAudioBus);
})();
