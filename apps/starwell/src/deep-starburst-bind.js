import { fetchBridgeDeepPulse } from './lib/deepBridge.js';
import { makeDeepSignature, normaliseDeepState } from './lib/deepState.js';
import { getDeepSensorByIndex } from './lib/deepSensors.js';
import { buildSensorStarburstVars, buildStarburstVars } from './lib/deepStarburst.js';
import {
  DEEP_STARBURST_BINDING,
  DEEP_STARBURST_SELECTORS,
} from './lib/deepStarburstContract.js';

const {
  panel: PANEL_SELECTOR,
  glyphWrap: WRAP_SELECTOR,
  root: ROOT_SELECTOR,
  sensorChips: SENSOR_CHIP_SELECTOR,
  sensorLabel: SENSOR_LABEL_SELECTOR,
} = DEEP_STARBURST_SELECTORS;

const {
  className: STARBURST_CLASS,
  data: STARBURST_DATA,
  native: STARBURST_NATIVE,
  timing: STARBURST_TIMING,
} = DEEP_STARBURST_BINDING;

const UPDATE_INTERVAL_MS = STARBURST_TIMING.updateIntervalMs;
const BRIDGE_POLL_MS = STARBURST_TIMING.bridgePollMs;
const MUTATION_THROTTLE_MS = STARBURST_TIMING.mutationThrottleMs;

let currentDeep = normaliseDeepState();
let mutationTimer = 0;
let intervalId = 0;
let bridgePollId = 0;
let observer = null;

function isNativeControlled(element, scope) {
  const value = element?.dataset?.[STARBURST_DATA.native];
  return value === STARBURST_NATIVE.true || value === scope;
}

function applyVars(target, vars) {
  Object.entries(vars).forEach(([name, value]) => {
    if (target.style.getPropertyValue(name) !== value) {
      target.style.setProperty(name, value);
    }
  });
}

function ensureChipLegend(chip, sensor) {
  if (isNativeControlled(chip, STARBURST_NATIVE.sensor)) return;

  let label = chip.querySelector(SENSOR_LABEL_SELECTOR);
  if (!label) {
    label = document.createElement('span');
    label.className = STARBURST_CLASS.sensorLabel;
    chip.prepend(label);
  }

  label.textContent = sensor.label;
  chip.title = `${sensor.label}: ${sensor.note}`;
  chip.setAttribute('aria-label', `${sensor.label}. ${sensor.note}`);
}

function bindSensorChips(panel, deep, signature) {
  const chips = Array.from(panel.querySelectorAll(SENSOR_CHIP_SELECTOR));

  chips.forEach((chip, index) => {
    const sensor = getDeepSensorByIndex(index);
    if (isNativeControlled(chip, STARBURST_NATIVE.sensor)) return;

    const sensorSignature = `${signature}|${sensor.key}`;
    ensureChipLegend(chip, sensor);
    if (chip.dataset[STARBURST_DATA.signature] === sensorSignature) return;

    applyVars(chip, buildSensorStarburstVars(deep, sensor));
    chip.dataset[STARBURST_DATA.sensor] = sensor.key;
    chip.dataset[STARBURST_DATA.signature] = sensorSignature;
  });
}

function chipsAreBound(panel, signature) {
  const chips = Array.from(panel.querySelectorAll(SENSOR_CHIP_SELECTOR));
  return chips.length > 0 && chips.every((chip, index) => {
    if (isNativeControlled(chip, STARBURST_NATIVE.sensor)) return true;
    const sensor = getDeepSensorByIndex(index);
    return chip.dataset[STARBURST_DATA.signature] === `${signature}|${sensor.key}`;
  });
}

function panelIsBound(panel, glyphWrap, signature, auraIsNative) {
  const auraIsBound = auraIsNative
    || (glyphWrap.dataset[STARBURST_DATA.bound] === STARBURST_NATIVE.true
      && glyphWrap.dataset[STARBURST_DATA.signature] === signature);

  return auraIsBound && chipsAreBound(panel, signature);
}

function bindPanel(panel) {
  const glyphWrap = panel.querySelector(WRAP_SELECTOR);
  if (!glyphWrap) return;

  const deep = currentDeep;
  const signature = makeDeepSignature(deep);
  const auraIsNative = isNativeControlled(glyphWrap, STARBURST_NATIVE.aura);

  if (panelIsBound(panel, glyphWrap, signature, auraIsNative)) return;

  if (!auraIsNative) {
    const vars = buildStarburstVars(deep, {
      baseSize: 132 + deep.A * 24 + deep.R * 18,
      rotation: deep.E * 18 + deep.kp * 2.5,
    });

    applyVars(glyphWrap, vars);
    glyphWrap.dataset[STARBURST_DATA.bound] = STARBURST_NATIVE.true;
    glyphWrap.dataset[STARBURST_DATA.signature] = signature;
  }

  bindSensorChips(panel, deep, signature);
}

function bindAll() {
  document.querySelectorAll(PANEL_SELECTOR).forEach(bindPanel);
}

function scheduleBind() {
  if (mutationTimer) return;
  mutationTimer = window.setTimeout(() => {
    mutationTimer = 0;
    bindAll();
  }, MUTATION_THROTTLE_MS);
}

async function refreshBridgeDeep() {
  try {
    currentDeep = await fetchBridgeDeepPulse();
  } catch (error) {
    currentDeep = { ...currentDeep };
  } finally {
    bindAll();
  }
}

function startBinding() {
  bindAll();
  refreshBridgeDeep();

  const root = document.querySelector(ROOT_SELECTOR) || document.body;
  observer = new MutationObserver(scheduleBind);
  observer.observe(root, {
    childList: true,
    subtree: true,
  });

  intervalId = window.setInterval(bindAll, UPDATE_INTERVAL_MS);
  bridgePollId = window.setInterval(refreshBridgeDeep, BRIDGE_POLL_MS);
}

function stopBinding() {
  if (observer) observer.disconnect();
  if (intervalId) window.clearInterval(intervalId);
  if (bridgePollId) window.clearInterval(bridgePollId);
  if (mutationTimer) window.clearTimeout(mutationTimer);
}

window.addEventListener('pagehide', stopBinding, { once: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startBinding, { once: true });
} else {
  startBinding();
}
