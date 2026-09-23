import './universal-codex-animation.css';

import {
  DEFAULT_CODEX_ANIMATION_STATE,
  UNIVERSAL_CODEX_ANIMATION_KEY,
  UNIVERSAL_CODEX_ANIMATION_SCHEMA,
  glyphSampleToPagePoint,
  migrateCodexAnimationState,
  patchCodexAnimationState,
  receiptToCodexPulse,
} from './universal-codex-animation-model.js';
import { createLocalCodexProjection } from './universal-codex-local-projection.js';

const BOOK_ID = 'arcsweep-magic-book';

let state = loadState();
let rendererController = null;
let rootObserver = null;
let mountObserver = null;
let resizeObserver = null;
let mountedRoot = null;

function loadState() {
  try {
    const raw = globalThis.localStorage?.getItem(UNIVERSAL_CODEX_ANIMATION_KEY);
    return migrateCodexAnimationState(raw ? JSON.parse(raw) : DEFAULT_CODEX_ANIMATION_STATE);
  } catch {
    return migrateCodexAnimationState(DEFAULT_CODEX_ANIMATION_STATE);
  }
}

function saveState() {
  try {
    globalThis.localStorage?.setItem(UNIVERSAL_CODEX_ANIMATION_KEY, JSON.stringify(state));
  } catch {}
}

function publishState(reason = 'ui') {
  saveState();
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:universal-codex-animation-state', {
    detail: Object.freeze({ ...state, reason }),
  }));
}

function button(label, key) {
  return `<button type="button" data-codex-fx-toggle="${key}" aria-pressed="${state[key] ? 'true' : 'false'}">${label}</button>`;
}

function dockMarkup() {
  return [
    '<details class="universal-codex-control-dock" data-universal-codex-control-dock>',
      '<summary>Book light</summary>',
      '<div class="universal-codex-control-row">',
        button('Margin light', 'holograms'),
        button('Ink aura', 'inkAura'),
        button('Ember motion', 'orbit'),
      '</div>',
      '<label class="universal-codex-intensity">',
        '<span>Light</span>',
        `<input type="range" min="0.15" max="1" step="0.01" value="${state.intensity}" data-codex-fx-intensity>`,
        `<output data-codex-fx-intensity-output>${Math.round(state.intensity * 100)}</output>`,
      '</label>',
    '</details>',
  ].join('');
}

function renderDock(root) {
  let dock = root.querySelector('[data-universal-codex-control-dock]');
  if (!dock) {
    root.querySelector('.magic-book-stage')?.insertAdjacentHTML('beforeend', dockMarkup());
    dock = root.querySelector('[data-universal-codex-control-dock]');
  }
  for (const key of ['holograms', 'inkAura', 'orbit']) {
    const control = dock?.querySelector(`[data-codex-fx-toggle="${key}"]`);
    if (control) control.setAttribute('aria-pressed', state[key] ? 'true' : 'false');
  }
  const range = dock?.querySelector('[data-codex-fx-intensity]');
  const output = dock?.querySelector('[data-codex-fx-intensity-output]');
  if (range) range.value = String(state.intensity);
  if (output) output.value = String(Math.round(state.intensity * 100));
}

function installDockEvents(root) {
  if (root.dataset.codexAnimationControls === 'true') return;
  root.dataset.codexAnimationControls = 'true';
  root.addEventListener('click', (event) => {
    const control = event.target.closest?.('[data-codex-fx-toggle]');
    if (!control) return;
    const key = control.dataset.codexFxToggle;
    if (!['holograms', 'inkAura', 'orbit'].includes(key)) return;
    state = patchCodexAnimationState(state, { [key]: !state[key] });
    renderDock(root);
    rendererController?.applyState?.(state);
    publishState(`toggle:${key}`);
  });
  root.addEventListener('input', (event) => {
    const range = event.target.closest?.('[data-codex-fx-intensity]');
    if (!range) return;
    state = patchCodexAnimationState(state, { intensity: Number(range.value) });
    const output = root.querySelector('[data-codex-fx-intensity-output]');
    if (output) output.value = String(Math.round(state.intensity * 100));
    rendererController?.applyState?.(state);
    publishState('intensity');
  });
}


function mount(root) {
  if (!root || root.dataset.codexAnimationMounted === 'true') return;
  const spread = root.querySelector('.magic-book-spread');
  if (!spread) return;
  root.dataset.codexAnimationMounted = 'true';
  mountedRoot = root;
  const margin = document.createElement('div');
  margin.className = 'universal-codex-margin';
  margin.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.className = 'universal-codex-fx universal-codex-margin-fx';
  canvas.dataset.universalCodexFx = UNIVERSAL_CODEX_ANIMATION_SCHEMA;
  canvas.setAttribute('aria-hidden', 'true');
  margin.append(canvas);
  spread.append(margin);
  renderDock(root);
  installDockEvents(root);
  rendererController = createLocalCodexProjection(canvas, root, state);
  root.dataset.codexHolography = rendererController.mode;
  rendererController.applyState?.(state);
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(() => rendererController?.resize?.());
    resizeObserver.observe(spread);
  }
  publishState('mount');
}

function findAndMount() {
  const root = document.getElementById(BOOK_ID);
  if (root) mount(root);
}

globalThis.addEventListener?.('arcsweep:glyph-brush-sample', (event) => {
  if (!rendererController || !state.inkAura) return;
  rendererController.addInkSpark?.(glyphSampleToPagePoint(event.detail));
});

globalThis.addEventListener?.('arcsweep:magic-book-receipt', (event) => {
  rendererController?.pulse?.(receiptToCodexPulse(event.detail));
});

globalThis.addEventListener?.('arcsweep:magic-book-ready', findAndMount);

findAndMount();
if (!mountedRoot && typeof MutationObserver !== 'undefined') {
  mountObserver = new MutationObserver(findAndMount);
  mountObserver.observe(document.body, { childList: true, subtree: true });
}

rootObserver = typeof MutationObserver !== 'undefined' ? new MutationObserver(() => {
  if (mountedRoot && !document.body.contains(mountedRoot)) {
    resizeObserver?.disconnect();
    rendererController?.destroy?.();
    rendererController = null;
    mountedRoot = null;
    findAndMount();
  }
  if (!mountedRoot) findAndMount();
}) : null;
rootObserver?.observe(document.body, { childList: true, subtree: true });

globalThis.__universalCodexAnimation = Object.freeze({
  schema: UNIVERSAL_CODEX_ANIMATION_SCHEMA,
  state: () => structuredClone(state),
  patch(patch) {
    state = patchCodexAnimationState(state, patch);
    rendererController?.applyState?.(state);
    if (mountedRoot) renderDock(mountedRoot);
    publishState('api');
    return structuredClone(state);
  },
  pulse(kind = 'manual') {
    rendererController?.pulse?.({ strength: 0.9, kind });
  },
});

globalThis.addEventListener?.('pagehide', () => {
  resizeObserver?.disconnect?.();
  mountObserver?.disconnect?.();
  rootObserver?.disconnect?.();
  rendererController?.destroy?.();
  rendererController = null;
}, { once: true });
