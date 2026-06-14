const PANEL_SELECTOR = '.live-glyph-panel.deep-observer-panel';
const AURA_SELECTOR = '.glyph-orb-wrap[data-starburst-native="aura"]';
const ROOT_SELECTOR = '#root';
const MATERIAL_VARS = ['--flare-hue', '--flare-alpha', '--flare-jitter', '--flare-rot'];
const UPDATE_THROTTLE_MS = 120;

let observer = null;
let updateTimer = 0;

function readVar(source, name) {
  const inlineValue = source.style.getPropertyValue(name);
  if (inlineValue) return inlineValue.trim();
  return window.getComputedStyle(source).getPropertyValue(name).trim();
}

function bindPanel(panel) {
  const aura = panel.querySelector(AURA_SELECTOR);
  if (!aura) return;

  let copied = 0;
  MATERIAL_VARS.forEach((name) => {
    const value = readVar(aura, name);
    if (!value) return;
    panel.style.setProperty(name, value);
    copied += 1;
  });

  if (copied > 0) {
    panel.dataset.deepMaterialVars = 'live-aura';
  }
}

function bindAll() {
  document.querySelectorAll(PANEL_SELECTOR).forEach(bindPanel);
}

function scheduleBind() {
  if (updateTimer) return;
  updateTimer = window.setTimeout(() => {
    updateTimer = 0;
    bindAll();
  }, UPDATE_THROTTLE_MS);
}

function startBinding() {
  bindAll();

  const root = document.querySelector(ROOT_SELECTOR) || document.body;
  observer = new MutationObserver(scheduleBind);
  observer.observe(root, {
    attributes: true,
    attributeFilter: ['style', 'data-starburst-native'],
    childList: true,
    subtree: true,
  });

  window.addEventListener('resize', scheduleBind, { passive: true });
  window.addEventListener('orientationchange', scheduleBind, { passive: true });
}

function stopBinding() {
  if (observer) observer.disconnect();
  if (updateTimer) window.clearTimeout(updateTimer);
  window.removeEventListener('resize', scheduleBind);
  window.removeEventListener('orientationchange', scheduleBind);
}

window.addEventListener('pagehide', stopBinding, { once: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startBinding, { once: true });
} else {
  startBinding();
}
