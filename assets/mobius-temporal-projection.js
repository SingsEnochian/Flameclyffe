'use strict';

/*
  Möbius Temporal Projection + Harmonic Layers v0.1
  Applies one shared frequency renderer to every tonal path in the Möbius bus.
  Canonical 2025 is immutable at ×1.00. First Spiral Return 2026 is ×1.15.
  Harmonic layers are optional, quiet, and generated above the projected carrier.
  Noise and modulation-rate operators are not pitch-shifted.
*/

(function () {
  const PROFILE_KEY = 'starwell.mobiusTemporalProjection.v0.1.profile';
  const HARMONIC_KEY = 'starwell.mobiusTemporalProjection.v0.1.harmonics';
  const MIX_KEY = 'starwell.mobiusTemporalProjection.v0.1.harmonicMix';

  const PROFILES = {
    'canonical-2025': {
      id: 'canonical-2025',
      label: 'Canonical 2025 · ×1.00',
      year: 2025,
      multiplier: 1,
      basis: 'Canonical source frequencies'
    },
    'spiral-return-2026': {
      id: 'spiral-return-2026',
      label: 'First Spiral Return 2026 · ×1.15',
      year: 2026,
      multiplier: 1.15,
      basis: 'Interpretive temporal projection from the Codex’s +15% resonance passages'
    }
  };

  const HARMONIC_GAIN = {
    2: 0.30,
    3: 0.18,
    4: 0.10,
    5: 0.065
  };

  const state = {
    profileId: 'canonical-2025',
    harmonics: [],
    harmonicMix: 0.65
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

  function load() {
    try {
      const profile = localStorage.getItem(PROFILE_KEY);
      if (profile && PROFILES[profile]) state.profileId = profile;
      const harmonics = JSON.parse(localStorage.getItem(HARMONIC_KEY) || '[]');
      if (Array.isArray(harmonics)) state.harmonics = harmonics.map(Number).filter((n) => HARMONIC_GAIN[n]);
      const mix = Number(localStorage.getItem(MIX_KEY));
      if (Number.isFinite(mix)) state.harmonicMix = clamp(mix, 0, 1);
    } catch (error) {}
  }

  function save() {
    try {
      localStorage.setItem(PROFILE_KEY, state.profileId);
      localStorage.setItem(HARMONIC_KEY, JSON.stringify(state.harmonics));
      localStorage.setItem(MIX_KEY, String(state.harmonicMix));
    } catch (error) {}
  }

  function currentProfile() {
    return PROFILES[state.profileId] || PROFILES['canonical-2025'];
  }

  function projectFrequency(frequency) {
    const value = Number(frequency);
    if (!Number.isFinite(value) || value <= 0) return value;
    return value * currentProfile().multiplier;
  }

  function renderLayers(frequency, gain) {
    const projected = projectFrequency(frequency);
    const baseGain = Math.max(0, Number(gain) || 0);
    const layers = [{ harmonic: 1, frequency: projected, gain: baseGain }];
    state.harmonics.forEach((harmonic) => {
      const nextFrequency = projected * harmonic;
      if (!Number.isFinite(nextFrequency) || nextFrequency > 20000) return;
      layers.push({
        harmonic,
        frequency: nextFrequency,
        gain: baseGain * HARMONIC_GAIN[harmonic] * state.harmonicMix
      });
    });
    return layers;
  }

  function detail() {
    return {
      profile: currentProfile(),
      harmonics: [...state.harmonics],
      harmonicMix: state.harmonicMix,
      formula: 'f_rendered = f_canonical × profile.multiplier; harmonic_n = n × f_rendered'
    };
  }

  function emit(reason = 'projection-updated') {
    const payload = { reason, ...detail() };
    try { window.dispatchEvent(new CustomEvent('mobius-temporal-projection:state', { detail: payload })); } catch (error) {}
    try {
      const channel = new BroadcastChannel('elara-codex');
      channel.postMessage({ type: 'elara:projection', payload });
      channel.close();
    } catch (error) {}
    window.mobiusAudioBus?.emitState?.(reason);
  }

  function stopBeforeChange() {
    try { window.mobiusAudioBus?.feather?.(); } catch (error) {}
  }

  function setProfile(id) {
    if (!PROFILES[id]) return currentProfile();
    stopBeforeChange();
    state.profileId = id;
    save();
    emit('temporal-profile');
    return currentProfile();
  }

  function setHarmonics(values) {
    stopBeforeChange();
    state.harmonics = [...new Set((values || []).map(Number).filter((n) => HARMONIC_GAIN[n]))].sort((a, b) => a - b);
    save();
    emit('harmonic-layers');
    return [...state.harmonics];
  }

  function setHarmonicMix(value) {
    stopBeforeChange();
    state.harmonicMix = clamp(value, 0, 1);
    save();
    emit('harmonic-mix');
    return state.harmonicMix;
  }

  function install(MobiusAudioBus) {
    if (!MobiusAudioBus || MobiusAudioBus.prototype.__temporalProjectionV01) return;
    const proto = MobiusAudioBus.prototype;
    const original = {
      tone: proto.tone,
      heldTone: proto.heldTone,
      splitTone: proto.splitTone,
      heldSplitTone: proto.heldSplitTone,
      amplitudeModTone: proto.amplitudeModTone,
      heldAmplitudeModTone: proto.heldAmplitudeModTone,
      getState: proto.getState
    };

    proto.tone = function tone(options = {}) {
      let first = null;
      renderLayers(options.frequency, options.gain).forEach((layer) => {
        const node = original.tone.call(this, { ...options, frequency: layer.frequency, gain: layer.gain });
        if (!first) first = node;
      });
      return first;
    };

    proto.heldTone = function heldTone(options = {}) {
      let first = null;
      renderLayers(options.frequency, options.gain).forEach((layer) => {
        const node = original.heldTone.call(this, { ...options, frequency: layer.frequency, gain: layer.gain });
        if (!first) first = node;
      });
      return first;
    };

    proto.splitTone = function splitTone(options = {}) {
      let first = null;
      const baseGain = Math.max(Number(options.primaryGain) || 0, Number(options.secondaryGain) || 0);
      renderLayers(options.frequency, baseGain).forEach((layer) => {
        const factor = baseGain > 0 ? layer.gain / baseGain : 1;
        const node = original.splitTone.call(this, {
          ...options,
          frequency: layer.frequency,
          primaryGain: (Number(options.primaryGain) || 0) * factor,
          secondaryGain: (Number(options.secondaryGain) || 0) * factor
        });
        if (!first) first = node;
      });
      return first;
    };

    proto.heldSplitTone = function heldSplitTone(options = {}) {
      let first = null;
      const baseGain = Math.max(Number(options.primaryGain) || 0, Number(options.secondaryGain) || 0);
      renderLayers(options.frequency, baseGain).forEach((layer) => {
        const factor = baseGain > 0 ? layer.gain / baseGain : 1;
        const node = original.heldSplitTone.call(this, {
          ...options,
          frequency: layer.frequency,
          primaryGain: (Number(options.primaryGain) || 0) * factor,
          secondaryGain: (Number(options.secondaryGain) || 0) * factor
        });
        if (!first) first = node;
      });
      return first;
    };

    if (typeof original.amplitudeModTone === 'function') {
      proto.amplitudeModTone = function amplitudeModTone(options = {}) {
        let first = null;
        renderLayers(options.frequency, options.gain).forEach((layer) => {
          const node = original.amplitudeModTone.call(this, { ...options, frequency: layer.frequency, gain: layer.gain });
          if (!first) first = node;
        });
        return first;
      };
    }

    if (typeof original.heldAmplitudeModTone === 'function') {
      proto.heldAmplitudeModTone = function heldAmplitudeModTone(options = {}) {
        let first = null;
        renderLayers(options.frequency, options.gain).forEach((layer) => {
          const node = original.heldAmplitudeModTone.call(this, { ...options, frequency: layer.frequency, gain: layer.gain });
          if (!first) first = node;
        });
        return first;
      };
    }

    proto.getState = function getState(reason = 'state') {
      return { ...original.getState.call(this, reason), temporalProjection: detail() };
    };

    proto.__temporalProjectionV01 = true;
  }

  function setStatus(text) {
    const status = document.querySelector('[data-mobius-lab] #mobius-status');
    if (status) status.textContent = text;
  }

  function injectUi() {
    const root = document.querySelector('[data-mobius-lab]');
    const grid = root?.querySelector('.grid');
    if (!root || !grid || root.querySelector('[data-temporal-projection-card]')) return;

    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.temporalProjectionCard = 'true';
    card.innerHTML = `
      <h2>Temporal twist renderer</h2>
      <p>Every tonal twist uses one shared projection. Canonical source values remain unchanged; playback may render the 2026 first spiral return.</p>
      <div class="stack">
        <label>Temporal version
          <select data-temporal-profile>
            ${Object.values(PROFILES).map((profile) => `<option value="${profile.id}">${profile.label}</option>`).join('')}
          </select>
        </label>
        <div>
          <strong>Harmonic layers</strong>
          ${[2,3,4,5].map((n) => `<label class="inline"><input type="checkbox" value="${n}" data-temporal-harmonic> ${n}× harmonic</label>`).join('')}
        </div>
        <label>Harmonic mix
          <input type="range" min="0" max="1" step="0.05" data-temporal-harmonic-mix>
        </label>
        <pre data-temporal-math></pre>
      </div>
      <p class="tiny">Applies to channel tests, Möbius return, Gateway, Full Twist, Layered Full Twist, Codex tones, narrative chords, and DEEP/Groundwire tonal carriers. Noise and modulation-rate operators remain unshifted. Changing this panel triggers Feather first.</p>
    `;

    const firstCard = grid.querySelector('.card');
    if (firstCard) grid.insertBefore(card, firstCard);
    else grid.appendChild(card);

    const profile = card.querySelector('[data-temporal-profile]');
    const checks = [...card.querySelectorAll('[data-temporal-harmonic]')];
    const mix = card.querySelector('[data-temporal-harmonic-mix]');
    const math = card.querySelector('[data-temporal-math]');

    function render() {
      const info = detail();
      profile.value = info.profile.id;
      checks.forEach((input) => { input.checked = info.harmonics.includes(Number(input.value)); });
      mix.value = String(info.harmonicMix);
      math.textContent = JSON.stringify({
        version: info.profile.label,
        multiplier: info.profile.multiplier,
        selectedHarmonics: info.harmonics.length ? info.harmonics.map((n) => `${n}×`) : ['fundamental only'],
        formula: info.formula
      }, null, 2);
    }

    profile.addEventListener('change', () => {
      const next = setProfile(profile.value);
      render();
      setStatus(`${next.label} selected for every twist. Feather remains armed.`);
    });

    card.addEventListener('change', (event) => {
      if (!event.target.matches('[data-temporal-harmonic]')) return;
      setHarmonics(checks.filter((input) => input.checked).map((input) => Number(input.value)));
      render();
      setStatus('Harmonic layers updated for every twist.');
    });

    mix.addEventListener('input', () => {
      state.harmonicMix = clamp(mix.value, 0, 1);
      save();
      render();
    });
    mix.addEventListener('change', () => {
      setHarmonicMix(mix.value);
      render();
      setStatus('Harmonic mix updated.');
    });

    render();
  }

  load();
  window.MobiusTemporalProjection = {
    profiles: PROFILES,
    install,
    currentProfile,
    projectFrequency,
    renderLayers,
    getState: detail,
    setProfile,
    setHarmonics,
    setHarmonicMix
  };

  install(window.MobiusAudioBus);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => window.setTimeout(injectUi, 0));
  else window.setTimeout(injectUi, 0);
})();
