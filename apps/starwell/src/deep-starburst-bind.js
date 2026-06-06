import { fetchBridgeDeepPulse } from './lib/deepBridge.js';
import { makeDeepSignature, normaliseDeepState } from './lib/deepState.js';
import { getDeepSensorByIndex } from './lib/deepSensors.js';
import { buildSensorStarburstVars, buildStarburstVars } from './lib/deepStarburst.js';

const PANEL_SELECTOR = '.live-glyph-panel.deep-observer-panel';
const WRAP_SELECTOR = '.glyph-orb-wrap';
const ROOT_SELECTOR = '#root';
const UPDATE_INTERVAL_MS = 1000;
const BRIDGE_POLL_MS = 60000;
const MUTATION_THROTTLE_MS = 160;

let currentDeep = normaliseDeepState();
let lastSignature = '';
let mutationTimer = 0;
let intervalId = 0;
let bridgePollId = 0;
let observer = null;

function isNativeControlled(element, scope) {
  const value = element?.dataset?.starburstNative;
  return value === 'true' || value === scope;
}

function applyVars(target, vars) {
  Object.entries(vars).forEach(([name, value]) => {
    if (target.style.getPropertyValue(name) !== value) {
      target.style.setProperty(name, value);
    }
  });
}

function ensureChipLegend(chip, sensor) {
  if (isNativeControlled(chip, 'sensor')) return;

  let label = chip.querySelector(':scope > .deep-sensor-label');
  if (!label) {
    label = document.createElement('span');
    label.className = 'deep-sensor-label';
    chip.prepend(label);
  }

  label.textContent = sensor.label;
  chip.title = `${sensor.label}: ${sensor.note}`;
  chip.setAttribute('aria-label', `${sensor.label}. ${sensor.note}`);
}

function bindSensorChips(panel, deep, signature) {
  const chips = Array.from(panel.querySelectorAll('.glyph-meter-grid > div'));

  chips.forEach((chip, index) => {
    const sensor = getDeepSensorByIndex(index);
    if (isNativeControlled(chip, 'sensor')) return;

    const sensorSignature = `${signature}|${sensor.key}`;
    ensureChipLegend(chip, sensor);
    if (chip.dataset.starburstSignature === sensorSignature) return;

    applyVars(chip, buildSensorStarburstVars(deep, sensor));
    chip.dataset.deepSensor = sensor.key;
    chip.dataset.starburstSignature = sensorSignature;
  });
}

function chipsAreBound(panel, signature) {
  const chips = Array.from(panel.querySelectorAll('.glyph-meter-grid > div'));
  return chips.length > 0 && chips.every((chip, index) => {
    if (isNativeControlled(chip, 'sensor')) return true;
    const sensor = getDeepSensorByIndex(index);
    return chip.dataset.starburstSignature === `${signature}|${sensor.key}`;
  });
}

function bindPanel(panel) {
  const glyphWrap = panel.querySelector(WRAP_SELECTOR);
  if (!glyphWrap) return;

  const deep = currentDeep;
  const signature = makeDeepSignature(deep);
  const auraIsNative = isNativeControlled(glyphWrap, 'aura');

  if (signature === lastSignature && (auraIsNative || glyphWrap.dataset.starburstBound === 'true') && chipsAreBound(panel, signature)) return;
  lastSignature = signature;

  if (!auraIsNative) {
    const vars = buildStarburstVars(deep, {
      baseSize: 132 + deep.A * 24 + deep.R * 18,
      rotation: deep.E * 18 + deep.kp * 2.5,
    });

    applyVars(glyphWrap, vars);
    glyphWrap.dataset.starburstBound = 'true';
    glyphWrap.dataset.starburstSignature = signature;
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
