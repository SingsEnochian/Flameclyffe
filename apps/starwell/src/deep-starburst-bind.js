import { getDeepSensorByIndex } from './lib/deepSensors.js';
import { buildStarburstVars } from './lib/deepStarburst.js';

const BRIDGE_PULSE_URL = 'https://singsenochian.github.io/-bridge-pulse/pulse.json';
const PANEL_SELECTOR = '.live-glyph-panel.deep-observer-panel';
const WRAP_SELECTOR = '.glyph-orb-wrap';
const ROOT_SELECTOR = '#root';
const UPDATE_INTERVAL_MS = 1000;
const BRIDGE_POLL_MS = 60000;
const MUTATION_THROTTLE_MS = 160;

const FALLBACK_DEEP = {
  P: 0.42,
  A: 0.72,
  C: 0.68,
  R: 0.74,
  E: 0.61,
  bz: -5.8,
  M: 0.3,
  moonIllum: 93,
  kp: 3,
  charge: 0.94,
  dphi: 0,
};

let currentDeep = FALLBACK_DEEP;
let lastSignature = '';
let mutationTimer = 0;
let intervalId = 0;
let bridgePollId = 0;
let observer = null;

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getBridgeDeep(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return payload.deep ?? payload.DEEP ?? payload.state ?? payload.observer ?? null;
}

function normaliseDeep(rawDeep = {}) {
  return {
    P: numberOr(rawDeep.P, FALLBACK_DEEP.P),
    A: numberOr(rawDeep.A, FALLBACK_DEEP.A),
    C: numberOr(rawDeep.C, FALLBACK_DEEP.C),
    R: numberOr(rawDeep.R, FALLBACK_DEEP.R),
    E: numberOr(rawDeep.E, FALLBACK_DEEP.E),
    bz: numberOr(rawDeep.bz, FALLBACK_DEEP.bz),
    M: numberOr(rawDeep.M, FALLBACK_DEEP.M),
    moonIllum: numberOr(rawDeep.moonIllum, FALLBACK_DEEP.moonIllum),
    kp: numberOr(rawDeep.kp, FALLBACK_DEEP.kp),
    charge: numberOr(rawDeep.charge, FALLBACK_DEEP.charge),
    dphi: numberOr(rawDeep.dphi, FALLBACK_DEEP.dphi),
  };
}

function makeSignature(deep) {
  return [deep.P, deep.A, deep.C, deep.R, deep.E, deep.bz, deep.M, deep.moonIllum, deep.kp, deep.charge]
    .map((value) => Number(value).toFixed(3))
    .join('|');
}

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

function buildSensorVars(deep, sensor) {
  const vars = buildStarburstVars(sensor.proxy(deep), {
    baseSize: sensor.baseSize,
    rotation: sensor.rotation + deep.E * 12 + deep.kp,
  });

  return {
    '--sensor-n': vars['--n'],
    '--sensor-w': vars['--w'],
    '--sensor-m': vars['--m'],
    '--sensor-hue': vars['--flare-hue'],
    '--sensor-alpha': vars['--flare-alpha'],
    '--sensor-jitter': vars['--flare-jitter'],
    '--sensor-rot': vars['--flare-rot'],
  };
}

function bindSensorChips(panel, deep, signature) {
  const chips = Array.from(panel.querySelectorAll('.glyph-meter-grid > div'));

  chips.forEach((chip, index) => {
    const sensor = getDeepSensorByIndex(index);
    if (isNativeControlled(chip, 'sensor')) return;

    const sensorSignature = `${signature}|${sensor.key}`;
    ensureChipLegend(chip, sensor);
    if (chip.dataset.starburstSignature === sensorSignature) return;

    applyVars(chip, buildSensorVars(deep, sensor));
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
  const signature = makeSignature(deep);
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
    const response = await fetch(BRIDGE_PULSE_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Bridge pulse returned ${response.status}`);
    const payload = await response.json();
    const bridgeDeep = getBridgeDeep(payload);
    if (!bridgeDeep) throw new Error('Bridge pulse did not include a DEEP state');
    currentDeep = normaliseDeep(bridgeDeep);
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
