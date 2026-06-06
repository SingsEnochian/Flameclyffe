import { buildStarburstVars } from './lib/deepStarburst.js';

const PANEL_SELECTOR = '.live-glyph-panel.deep-observer-panel';
const WRAP_SELECTOR = '.glyph-orb-wrap';
const ROOT_SELECTOR = '#root';
const UPDATE_INTERVAL_MS = 1000;
const MUTATION_THROTTLE_MS = 160;

let lastSignature = '';
let mutationTimer = 0;
let intervalId = 0;
let observer = null;

function readNumber(pattern, text, fallback) {
  const match = text.match(pattern);
  if (!match) return fallback;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readDeepPacket(panel) {
  const meterText = Array.from(panel.querySelectorAll('.glyph-meter-grid strong'))
    .map((node) => node.textContent || '')
    .join(' ');

  return {
    P: readNumber(/P\s+([0-9.]+)/i, meterText, 0.42),
    A: readNumber(/A\s+([0-9.]+)/i, meterText, 0.72),
    C: readNumber(/C\s+([0-9.]+)/i, meterText, 0.68),
    R: readNumber(/R\s+([0-9.]+)/i, meterText, 0.74),
    E: readNumber(/E\s+([0-9.]+)/i, meterText, 0.61),
    bz: readNumber(/Bz\s+(-?[0-9.]+)/i, meterText, -5.8),
    M: readNumber(/M\s+([0-9.]+)/i, meterText, 0.3),
    moonIllum: readNumber(/moon\s+([0-9.]+)%/i, meterText, 93),
    kp: readNumber(/Kp\s+([0-9.]+)/i, meterText, 3),
    charge: readNumber(/charge\s+([0-9.]+)/i, meterText, 0.94),
    dphi: 0,
  };
}

function makeSignature(deep) {
  return [deep.P, deep.A, deep.C, deep.R, deep.E, deep.bz, deep.M, deep.moonIllum, deep.kp, deep.charge]
    .map((value) => Number(value).toFixed(3))
    .join('|');
}

function applyVars(target, vars) {
  Object.entries(vars).forEach(([name, value]) => {
    if (target.style.getPropertyValue(name) !== value) {
      target.style.setProperty(name, value);
    }
  });
}

function bindPanel(panel) {
  const glyphWrap = panel.querySelector(WRAP_SELECTOR);
  if (!glyphWrap) return;

  const deep = readDeepPacket(panel);
  const signature = makeSignature(deep);
  if (signature === lastSignature && glyphWrap.dataset.starburstBound === 'true') return;
  lastSignature = signature;

  const vars = buildStarburstVars(deep, {
    baseSize: 132 + deep.A * 24 + deep.R * 18,
    rotation: deep.E * 18 + deep.kp * 2.5,
  });

  applyVars(glyphWrap, vars);
  glyphWrap.dataset.starburstBound = 'true';
  glyphWrap.dataset.starburstSignature = signature;
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

function startBinding() {
  bindAll();

  const root = document.querySelector(ROOT_SELECTOR) || document.body;
  observer = new MutationObserver(scheduleBind);
  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  intervalId = window.setInterval(bindAll, UPDATE_INTERVAL_MS);
}

function stopBinding() {
  if (observer) observer.disconnect();
  if (intervalId) window.clearInterval(intervalId);
  if (mutationTimer) window.clearTimeout(mutationTimer);
}

window.addEventListener('pagehide', stopBinding, { once: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startBinding, { once: true });
} else {
  startBinding();
}
