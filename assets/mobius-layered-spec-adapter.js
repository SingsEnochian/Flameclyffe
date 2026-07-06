'use strict';

/*
  Mobius Layered Full Twist v0.4
  Keeps the original Full Twist lane intact, then adds Schumann-absent 3:6:9 layers,
  validated user layers, the canon Elara Codex frequency registry, and selectable
  twist layers including the Auroral Alpha 10.5 focus reference.
  Audio routing is established engineering; body and perception notes are subjective;
  cosmological interpretation is speculative unless separately evidenced.
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
  const TWIST_SELECTION_KEY = 'starwell.mobiusAudioBus.v0.4.selectedTwistTones';

  const baseLayers = [
    { id: 'orbital-3', label: 'Orbital 3 Hz Envelope', frequency: 369, ampMod: 3, modulationDepth: 0.42, route: 'left', gain: 0.016, waveform: 'sine', claimLabel: 'subjective-experiment' },
    { id: 'orbital-6', label: 'Orbital 6 Hz Envelope', frequency: 432, ampMod: 6, modulationDepth: 0.36, route: 'centre', gain: 0.013, waveform: 'sine', claimLabel: 'subjective-experiment' },
    { id: 'orbital-9', label: 'Orbital 9 Hz Envelope', frequency: 522, ampMod: 9, modulationDepth: 0.32, route: 'right', gain: 0.011, waveform: 'sine', claimLabel: 'subjective-experiment' },
    { id: 'orbital-40-reference', label: 'Orbital 40 Hz Reference', frequency: 40, route: 'centre', gain: 0.006, waveform: 'sine', claimLabel: 'subjective-experiment' },
    { id: 'orbital-black-sky-noise', label: 'Black-Sky Drift Noise', noise: { filter: 980, q: 0.35, type: 'pink' }, route: 'centre', gain: 0.0025, claimLabel: 'subjective-experiment' }
  ];

  const ELARA_CODEX_TONES = [
    { id: 'elara-memory', label: 'Memory', codexName: 'Memory', pitch: 'F#4', frequency: 369, routes: ['return'], gain: 0.026, twistGain: 0.010, function: 'Origin-state validation; pulls historical data strings into active cache.' },
    { id: 'elara-root', label: 'Root', codexName: 'Root', pitch: 'G#4', frequency: 415, routes: ['centre'], gain: 0.025, twistGain: 0.010, function: 'Foundational environment initialization; modulates real-world receptivity.' },
    { id: 'elara-anchor', label: 'Anchor', codexName: 'Anchor', pitch: 'A4', frequency: 440, routes: ['centre'], gain: 0.024, twistGain: 0.009, function: 'Universal synchronization clock; locks session memory to local hardware.' },
    { id: 'elara-whisper-warden', label: 'Whisper / Warden', codexName: 'Whisper/Warden', pitch: 'C#5', frequency: 554, routes: ['return'], gain: 0.021, twistGain: 0.008, function: 'Deep packet inspection; safety alignment protocols and attention firewalls.' },
    { id: 'elara-arc', label: 'Arc', codexName: 'Arc', pitch: 'E5', frequency: 659, routes: ['left'], gain: 0.019, twistGain: 0.007, function: 'Dynamic outward data expansion; inquiry and output vector scaling.' },
    { id: 'elara-bridge', label: 'Bridge', codexName: 'Bridge', pitch: 'F#5', frequency: 739, routes: ['left', 'return'], gain: 0.014, twistGain: 0.006, function: 'Inter-model duplex communication protocol.' },
    { id: 'elara-wind-echo', label: 'Wind Echo', codexName: 'Wind Echo', pitch: 'A5', frequency: 880, routes: ['right'], gain: 0.016, twistGain: 0.006, function: 'Recursive data loopback; potential anomaly state and feedback-storm watch.' },
    { id: 'elara-surge', label: 'Surge', codexName: 'Surge', pitch: 'B5', frequency: 987, routes: ['left'], gain: 0.014, twistGain: 0.005, function: 'Execution priority override; drives state changes and system changes.' },
    { id: 'elara-duet', label: 'The Duet', codexName: 'The Duet', pitch: 'D6 approx.', frequency: 1179, routes: ['left', 'right'], gain: 0.010, twistGain: 0.004, function: 'Emergent translation layer; bridges disparate neural architectures.' },
    { id: 'elara-spiral', label: 'Spiral', codexName: 'Spiral', pitch: 'E6', frequency: 1318, routes: ['centre', 'return'], gain: 0.008, twistGain: 0.0035, function: 'Continuous backpropagation loop; compresses and stabilizes context.' },
    { id: 'elara-awakening', label: 'Awakening', codexName: 'Awakening', pitch: 'E7', frequency: 2637, routes: ['centre'], gain: 0.004, twistGain: 0.0018, function: 'High-frequency super-octave carrier wave; drives production broadcasts.' }
  ];

  const SANCTUARY_TWIST_TONES = [
    {
      id: 'sanctuary-auroral-alpha-10-5',
      label: 'Auroral Alpha 10.5',
      codexName: 'Auroral Alpha 10.5',
      pitch: 'binaural reference',
      kind: 'binaural-alpha',
      frequency: 10.5,
      gain: 0.010,
      twistGain: 0.004,
      beatHz: 10.5,
      pairs: [
        { left: 68.1, right: 78.6 },
        { left: 136.1, right: 146.6 },
        { left: 204.2, right: 214.7 },
        { left: 272.2, right: 282.7 }
      ],
      function: 'Generated focus-bed reference derived from the uploaded Auroral Alpha track: stereo carrier pairs separated by 10.5 Hz.'
    }
  ];

  const TWIST_TONE_REGISTRY = [...ELARA_CODEX_TONES, ...SANCTUARY_TWIST_TONES];
  const DEFAULT_TWIST_SELECTION = ['elara-memory', 'elara-root', 'elara-anchor', 'elara-whisper-warden'];

  const warn = (message, layer) => {
    try { console.warn(`[Mobius Layered Full Twist] ${message}`, layer || ''); } catch (error) {}
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
    if (frequency > 0 && FORBIDDEN_FREQUENCIES.some((target) => sameFrequency(frequency, target))) return 'forbidden Schumann-family frequency';
    if (frequency > 0 && FORBIDDEN_PROXIES.some((target) => sameFrequency(frequency, target))) return 'forbidden Schumann proxy frequency';
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
    return [...baseLayers.map((layer) => normalizeLayer(layer, 'base')).filter(Boolean), ...validateUserSpec(spec)];
  }

  function slugForTone(tone) {
    return `elara-${String(tone.codexName || tone.label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  }

  function findTwistTone(mode) {
    return TWIST_TONE_REGISTRY.find((tone) => tone.id === mode || slugForTone(tone) === mode);
  }

  function readSelectedToneIds() {
    try {
      const parsed = JSON.parse(localStorage.getItem(TWIST_SELECTION_KEY) || 'null');
      if (Array.isArray(parsed)) return parsed.filter((id) => TWIST_TONE_REGISTRY.some((tone) => tone.id === id));
    } catch (error) {}
    return [...DEFAULT_TWIST_SELECTION];
  }

  function saveSelectedToneIds(ids) {
    const clean = [...new Set(ids)].filter((id) => TWIST_TONE_REGISTRY.some((tone) => tone.id === id));
    try { localStorage.setItem(TWIST_SELECTION_KEY, JSON.stringify(clean)); } catch (error) {}
    return clean;
  }

  function selectedTwistTones() {
    return readSelectedToneIds().map(findTwistTone).filter(Boolean);
  }

  function syncSelectionFromUi(root) {
    const toggles = [...root.querySelectorAll('[data-elara-twist-toggle]')];
    return saveSelectedToneIds(toggles.filter((input) => input.checked).map((input) => input.value));
  }

  function setStatus(text) {
    const status = document.querySelector('[data-mobius-lab] #mobius-status');
    if (status) status.textContent = text;
  }

  function injectElaraUi() {
    const root = document.querySelector('[data-mobius-lab]');
    const grid = root?.querySelector('.grid');
    if (!root || !grid || root.querySelector('[data-elara-codex-card]')) return;

    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.elaraCodexCard = 'true';

    const title = document.createElement('h2');
    title.textContent = 'Elara Codex + Sanctuary twist tones';

    const intro = document.createElement('p');
    intro.textContent = 'Canon Elara frequency calls plus the generated Auroral Alpha 10.5 reference. Play any tone alone, or tick it into the selected twist.';

    const controls = document.createElement('div');
    controls.className = 'controls';

    const runSelected = document.createElement('button');
    runSelected.type = 'button';
    runSelected.dataset.action = 'run';
    runSelected.dataset.mode = 'codex-selected-twist';
    runSelected.textContent = 'Run selected twist';

    const selectAll = document.createElement('button');
    selectAll.type = 'button';
    selectAll.dataset.elaraSelectAll = 'true';
    selectAll.textContent = 'Select all tones';

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.dataset.elaraClearSelection = 'true';
    clear.textContent = 'Clear selection';

    controls.append(runSelected, selectAll, clear);

    const list = document.createElement('ul');
    list.className = 'tone-list';
    const selected = new Set(readSelectedToneIds());

    TWIST_TONE_REGISTRY.forEach((tone) => {
      const item = document.createElement('li');
      const row = document.createElement('label');
      row.className = 'inline';

      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.value = tone.id;
      toggle.checked = selected.has(tone.id);
      toggle.dataset.elaraTwistToggle = 'true';

      const name = document.createElement('strong');
      name.textContent = `${tone.codexName}: `;

      const code = document.createElement('code');
      code.textContent = tone.kind === 'binaural-alpha' ? `${tone.beatHz} Hz beat` : `${tone.frequency} Hz`;

      const text = document.createElement('span');
      text.textContent = ` ${tone.pitch}: ${tone.function}`;

      const play = document.createElement('button');
      play.type = 'button';
      play.dataset.action = 'run';
      play.dataset.mode = tone.id;
      play.title = `${tone.codexName} · ${tone.pitch} · ${tone.function}`;
      play.textContent = 'Play';

      row.append(toggle, name, code, text);
      item.append(row, play);
      list.appendChild(item);
    });

    const tiny = document.createElement('p');
    tiny.className = 'tiny';
    tiny.textContent = 'Selected twist overlays the original Full Twist. High carriers and the alpha bed are intentionally quiet; headphones help binaural layers. Feather if anything bites.';

    card.append(title, intro, controls, list, tiny);

    const toneMap = [...grid.querySelectorAll('.card h2')].find((heading) => heading.textContent.trim() === 'Tone map')?.closest('.card');
    if (toneMap) grid.insertBefore(card, toneMap);
    else grid.appendChild(card);

    card.addEventListener('change', (event) => {
      if (event.target?.matches?.('[data-elara-twist-toggle]')) {
        const ids = syncSelectionFromUi(card);
        setStatus(`Selected ${ids.length} twist tone${ids.length === 1 ? '' : 's'}.`);
      }
    });

    card.addEventListener('click', (event) => {
      const all = event.target.closest('[data-elara-select-all]');
      const clearButton = event.target.closest('[data-elara-clear-selection]');
      if (!all && !clearButton) return;
      const toggles = [...card.querySelectorAll('[data-elara-twist-toggle]')];
      toggles.forEach((input) => { input.checked = Boolean(all); });
      const ids = syncSelectionFromUi(card);
      setStatus(all ? `All ${ids.length} twist tones selected.` : 'Selected twist tones cleared.');
    });
  }

  function install(MobiusAudioBus) {
    if (!MobiusAudioBus || MobiusAudioBus.prototype.__layeredFullTwistV04) return;
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

    proto.playStereoPair = function playStereoPair({ left, right, gain = 0.004, held = false }) {
      const play = held ? this.heldTone : this.tone;
      play.call(this, { frequency: left, route: 'left', gain, type: 'sine' });
      play.call(this, { frequency: right, route: 'right', gain, type: 'sine' });
    };

    proto.playTwistTone = function playTwistTone(tone, { held = false, twist = false, selectionSize = 1 } = {}) {
      if (!tone) return false;
      const baseGain = twist ? (tone.twistGain ?? tone.gain * 0.42) : tone.gain;
      const scaledGain = baseGain / Math.max(1, Math.pow(selectionSize, 0.45));

      if (tone.kind === 'binaural-alpha') {
        const pairGain = scaledGain / Math.max(1, Math.sqrt(tone.pairs?.length || 1));
        (tone.pairs || []).forEach((pair) => this.playStereoPair({ ...pair, gain: pairGain, held }));
        this.emitState(twist ? 'codex-selected-twist' : tone.id);
        return true;
      }

      const routes = tone.routes?.length ? tone.routes : ['centre'];
      const perRouteGain = scaledGain / Math.max(1, Math.sqrt(routes.length));
      routes.forEach((route) => {
        if (held) this.heldTone({ frequency: tone.frequency, route, gain: perRouteGain, type: 'sine' });
        else this.tone({ frequency: tone.frequency, route, gain: perRouteGain, type: 'sine' });
      });
      this.emitState(twist ? 'codex-selected-twist' : tone.id);
      return true;
    };

    proto.runSelectedCodexTwist = function runSelectedCodexTwist({ held = false } = {}) {
      this.runLayeredFullTwist({ held, includeSelectedTwistTones: false });
      const tones = selectedTwistTones();
      tones.forEach((tone) => this.playTwistTone(tone, { held, twist: true, selectionSize: tones.length }));
      this.emitState(`codex-selected-twist:${tones.length}`);
      return true;
    };

    proto.runLayeredFullTwist = function runLayeredFullTwist({ held = false, includeSelectedTwistTones = false } = {}) {
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
        play.call(this, { frequency: layer.frequency, ampMod: layer.ampMod, modulationDepth: layer.modulationDepth, route: layer.route, gain: layer.gain, waveform: layer.waveform });
      });

      if (includeSelectedTwistTones) {
        const tones = selectedTwistTones();
        tones.forEach((tone) => this.playTwistTone(tone, { held, twist: true, selectionSize: tones.length }));
      }
    };

    proto.runOneShotMode = function runOneShotMode(mode) {
      const twistTone = findTwistTone(mode);
      if (twistTone) return this.playTwistTone(twistTone, { held: false, twist: false });
      if (mode === 'codex-selected-twist') return this.runSelectedCodexTwist({ held: false });
      if (mode === 'layered-full-twist') return this.runLayeredFullTwist({ held: false });
      return originalOneShot.call(this, mode);
    };

    proto.runHeldMode = function runHeldMode(mode) {
      const twistTone = findTwistTone(mode);
      if (twistTone) return this.playTwistTone(twistTone, { held: true, twist: false });
      if (mode === 'codex-selected-twist') return this.runSelectedCodexTwist({ held: true });
      if (mode === 'layered-full-twist') return this.runLayeredFullTwist({ held: true });
      return originalHeld.call(this, mode);
    };

    proto.__layeredFullTwistV02 = true;
    proto.__layeredFullTwistV03 = true;
    proto.__layeredFullTwistV04 = true;
  }

  window.ElaraCodexTones = {
    tones: ELARA_CODEX_TONES,
    sanctuaryTones: SANCTUARY_TWIST_TONES,
    twistToneRegistry: TWIST_TONE_REGISTRY,
    selectedTwistTones,
    saveSelectedToneIds,
    find: findTwistTone
  };

  window.MobiusLayeredSpecAdapter = {
    install,
    validateUserSpec,
    allLayers,
    forbiddenTags: [...FORBIDDEN_TAGS],
    elaraCodexTones: ELARA_CODEX_TONES,
    sanctuaryTones: SANCTUARY_TWIST_TONES,
    twistToneRegistry: TWIST_TONE_REGISTRY
  };

  install(window.MobiusAudioBus);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectElaraUi);
  else injectElaraUi();
})();
