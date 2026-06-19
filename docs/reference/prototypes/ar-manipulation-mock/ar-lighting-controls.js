import { AR_LIGHT_DEFAULTS, AR_LIGHT_LIMITS, AR_LIGHT_PRESETS } from './ar-lighting.model.js';

function clampLight(value) {
  return Math.max(AR_LIGHT_LIMITS.min, Math.min(AR_LIGHT_LIMITS.max, Number(value)));
}

export function createARLightingControls(options = {}) {
  let state = { ...AR_LIGHT_DEFAULTS };
  const onChange = options.onChange ?? (() => {});

  function emit() {
    onChange({ ...state });
  }

  function setLight(name, value) {
    if (!(name in state)) return;
    state[name] = clampLight(value);
    emit();
  }

  function applyPreset(presetName) {
    const preset = AR_LIGHT_PRESETS[presetName];
    if (!preset) return;
    state = { ...state, ...preset.values };
    emit();
  }

  function reset() {
    state = { ...AR_LIGHT_DEFAULTS };
    emit();
  }

  function getState() {
    return { ...state };
  }

  emit();

  return {
    getState,
    setLight,
    applyPreset,
    reset,
  };
}

export function applyLightingToElement(element, lightState) {
  element.style.setProperty('--ar-ambient', String(lightState.ambient));
  element.style.setProperty('--ar-bloom', String(lightState.bloom));
  element.style.setProperty('--ar-green', String(lightState.green));
  element.style.setProperty('--ar-rim', String(lightState.rim));
}
