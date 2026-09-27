import {
  astronomyContextFromEvent,
  CODEX_ASTRONOMY_CONTEXT_SCHEMA,
} from './codex/codex-astronomy-context.js';

export const CODEX_ASTRONOMY_CONTEXT_SIDECAR_SCHEMA = 'hearthweave.codex-astronomy-context-sidecar/v0.1';

const TARGETS = Object.freeze({
  astrolabe: Object.freeze({
    actionSelector: '.codex-astrolabe-actions',
    inputSelector: '[data-codex-astrolabe-form] input[name="observedAt"]',
    label: 'Astrolabe',
  }),
  orrery: Object.freeze({
    actionSelector: '.codex-orrery-actions',
    inputSelector: '[data-codex-orrery-form] input[name="selectedAt"]',
    label: 'Orrery',
  }),
  'celestial-sphere': Object.freeze({
    actionSelector: '.codex-celestial-actions',
    inputSelector: '[data-codex-celestial-form] input[name="selectedAt"]',
    label: 'Celestial Sphere',
  }),
});

let currentOffer = null;
let observer = null;
let booted = false;

function localInputValue(isoString) {
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function sourceLabel(source) {
  return TARGETS[source]?.label || source;
}

function ensureButtons() {
  for (const [targetId, target] of Object.entries(TARGETS)) {
    const actions = document.querySelector(target.actionSelector);
    if (!actions || actions.querySelector(`[data-codex-astronomy-context-use="${targetId}"]`)) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.codexAstronomyContextUse = targetId;
    button.disabled = true;
    button.textContent = 'Shared Time: none';
    button.title = 'A shared astronomy time appears after another instrument computes a reading.';
    actions.prepend(button);
  }
  refreshButtons();
}

function refreshButtons() {
  document.querySelectorAll('[data-codex-astronomy-context-use]').forEach((button) => {
    const targetId = button.dataset.codexAstronomyContextUse;
    const sameInstrument = currentOffer?.source === targetId;
    button.disabled = !currentOffer || sameInstrument;
    if (!currentOffer) {
      button.textContent = 'Shared Time: none';
      button.title = 'A shared astronomy time appears after another instrument computes a reading.';
    } else if (sameInstrument) {
      button.textContent = 'This instrument set shared time';
      button.title = `${sourceLabel(currentOffer.source)} supplied ${currentOffer.selectedAt}.`;
    } else {
      button.textContent = `Use ${sourceLabel(currentOffer.source)} Time`;
      button.title = `Prefill ${currentOffer.selectedAt}. This will not recompute automatically.`;
    }
  });
}

function publish(name, detail = {}) {
  const payload = Object.freeze({
    schema: CODEX_ASTRONOMY_CONTEXT_SIDECAR_SCHEMA,
    contextSchema: CODEX_ASTRONOMY_CONTEXT_SCHEMA,
    ...detail,
  });
  try { globalThis.__arcsweepOS?.bus?.publish?.(name, payload, { source: 'codex-astronomy-context' }); } catch {}
  globalThis.dispatchEvent?.(new CustomEvent(name, { detail: payload }));
}

function acceptOffer(eventName, detail) {
  try {
    const offer = astronomyContextFromEvent(eventName, detail);
    if (!offer) return false;
    currentOffer = offer;
    ensureButtons();
    refreshButtons();
    publish('codex:astronomy-context-offered', { offer });
    return true;
  } catch {
    return false;
  }
}

function adoptOffer(targetId) {
  if (!currentOffer || currentOffer.source === targetId) return false;
  const target = TARGETS[targetId];
  if (!target) return false;
  const input = document.querySelector(target.inputSelector);
  if (!input) return false;

  input.value = localInputValue(currentOffer.selectedAt);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.focus?.();

  publish('codex:astronomy-context-adopted', {
    offer: currentOffer,
    target: targetId,
    recomputed: false,
  });
  return true;
}

function onAstrolabe(event) {
  acceptOffer('codex:astrolabe-reading', event.detail);
}

function onOrrery(event) {
  acceptOffer('codex:orrery-time-change', event.detail);
}

function onCelestial(event) {
  acceptOffer('codex:celestial-time-change', event.detail);
}

function onClick(event) {
  const button = event.target?.closest?.('[data-codex-astronomy-context-use]');
  if (!button) return;
  event.preventDefault();
  adoptOffer(button.dataset.codexAstronomyContextUse);
}

export function codexAstronomyContextSnapshot() {
  return Object.freeze({
    schema: CODEX_ASTRONOMY_CONTEXT_SIDECAR_SCHEMA,
    context: currentOffer,
    persists: false,
    automaticAdoption: false,
    automaticRecompute: false,
  });
}

export function bootCodexAstronomyContext() {
  if (booted) return true;
  booted = true;
  ensureButtons();
  document.addEventListener('click', onClick);
  globalThis.addEventListener?.('codex:astrolabe-reading', onAstrolabe);
  globalThis.addEventListener?.('codex:orrery-time-change', onOrrery);
  globalThis.addEventListener?.('codex:celestial-time-change', onCelestial);
  observer = new MutationObserver(() => ensureButtons());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  return true;
}

export function teardownCodexAstronomyContext() {
  if (!booted) return;
  booted = false;
  observer?.disconnect?.();
  observer = null;
  document.removeEventListener('click', onClick);
  globalThis.removeEventListener?.('codex:astrolabe-reading', onAstrolabe);
  globalThis.removeEventListener?.('codex:orrery-time-change', onOrrery);
  globalThis.removeEventListener?.('codex:celestial-time-change', onCelestial);
}

if (typeof document !== 'undefined') bootCodexAstronomyContext();
