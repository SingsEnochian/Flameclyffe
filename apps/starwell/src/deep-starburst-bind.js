import { buildStarburstVars } from './lib/deepStarburst.js';

const PANEL_SELECTOR = '.live-glyph-panel.deep-observer-panel';
const WRAP_SELECTOR = '.glyph-orb-wrap';

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

function applyVars(target, vars) {
  Object.entries(vars).forEach(([name, value]) => {
    target.style.setProperty(name, value);
  });
}

function bindPanel(panel) {
  const glyphWrap = panel.querySelector(WRAP_SELECTOR);
  if (!glyphWrap) return;

  const deep = readDeepPacket(panel);
  const vars = buildStarburstVars(deep, {
    baseSize: 132 + deep.A * 24 + deep.R * 18,
    rotation: (Date.now() / 80) % 360,
  });

  applyVars(glyphWrap, vars);
  glyphWrap.dataset.starburstBound = 'true';
}

function bindAll() {
  document.querySelectorAll(PANEL_SELECTOR).forEach(bindPanel);
}

const observer = new MutationObserver(() => bindAll());

function startBinding() {
  bindAll();
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  window.setInterval(bindAll, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startBinding, { once: true });
} else {
  startBinding();
}
