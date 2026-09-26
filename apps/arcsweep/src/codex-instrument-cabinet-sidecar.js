import './codex-instrument-cabinet.css';

import {
  CODEX_INSTRUMENT_CABINET_SCHEMA,
  CODEX_INSTRUMENTS,
  codexInstrumentCabinetSnapshot,
} from './codex/codex-instrument-cabinet.js';

export const CODEX_INSTRUMENT_CABINET_SIDECAR_SCHEMA = 'hearthweave.codex-instrument-cabinet-sidecar/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
const PANEL_ID = 'codex-instrument-cabinet';
let observer = null;
let booted = false;
let returnFocus = null;

function esc(value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function statusLabel(value) {
  if (value === 'implemented') return 'Implemented';
  if (value === 'prototype') return 'Prototype';
  return 'Proposed';
}

function instrumentMarkup(instrument) {
  const semantics = instrument.exposes
    .map((axis) => `<span class="codex-instrument-semantic">${esc(axis)}</span>`)
    .join('');
  const references = instrument.references.length
    ? `<small class="codex-instrument-references">${esc(instrument.references.join(' · '))}</small>`
    : '';
  return [
    `<article class="codex-instrument-card" data-codex-instrument="${esc(instrument.id)}" data-codex-material="${esc(instrument.material.id)}" data-implementation="${esc(instrument.implementation)}">`,
      '<header>',
        `<div><p class="codex-instrument-kind">${esc(instrument.kind)}</p><h3>${esc(instrument.label)}</h3></div>`,
        `<span class="codex-instrument-status">${esc(statusLabel(instrument.implementation))}</span>`,
      '</header>',
      `<p>${esc(instrument.note)}</p>`,
      `<div class="codex-instrument-semantics" aria-label="Semantic information exposed">${semantics}</div>`,
      '<dl>',
        `<div><dt>Material</dt><dd>${esc(instrument.material.surface)}</dd></div>`,
        `<div><dt>Motion</dt><dd>${esc(instrument.motionProfile)}</dd></div>`,
        `<div><dt>Quiet</dt><dd>${esc(instrument.quietState)}</dd></div>`,
      '</dl>',
      references,
    '</article>',
  ].join('');
}

function cabinetMarkup() {
  const snapshot = codexInstrumentCabinetSnapshot();
  const cards = CODEX_INSTRUMENTS.map(instrumentMarkup).join('');
  return [
    `<section id="${PANEL_ID}" class="codex-instrument-cabinet" data-schema="${CODEX_INSTRUMENT_CABINET_SCHEMA}" role="dialog" aria-modal="false" aria-labelledby="codex-instrument-cabinet-title" hidden>`,
      '<header class="codex-instrument-cabinet-heading">',
        '<div>',
          '<p class="magic-book-kicker">Instrument cabinet · semantic artefacts</p>',
          '<h2 id="codex-instrument-cabinet-title">Working Instruments</h2>',
          `<p>${esc(snapshot.principle)}</p>`,
        '</div>',
        '<button type="button" data-codex-instrument-cabinet-close>Close Cabinet</button>',
      '</header>',
      '<div class="codex-instrument-cabinet-summary">',
        `<span>${snapshot.count} artefacts</span>`,
        `<span>${snapshot.counts.implemented} implemented</span>`,
        `<span>${snapshot.counts.prototype} prototype</span>`,
        `<span>${snapshot.counts.proposed} proposed</span>`,
      '</div>',
      `<div class="codex-instrument-grid">${cards}</div>`,
    '</section>',
  ].join('');
}

function publish(name, detail = {}) {
  const payload = Object.freeze({
    schema: CODEX_INSTRUMENT_CABINET_SIDECAR_SCHEMA,
    ...detail,
  });
  try {
    globalThis.__arcsweepOS?.bus?.publish?.(name, payload, { source: 'codex-instrument-cabinet' });
  } catch {}
  globalThis.dispatchEvent?.(new CustomEvent(name, { detail: payload }));
}

function ensureButton(root) {
  const actions = root.querySelector('.magic-book-toolbar-actions');
  if (!actions || actions.querySelector('[data-codex-instrument-cabinet-open]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.codexInstrumentCabinetOpen = 'true';
  button.textContent = 'Instruments';
  const closeButton = actions.querySelector('[data-magic-book-close]');
  actions.insertBefore(button, closeButton || null);
}

function ensurePanel(root) {
  if (root.querySelector(`#${PANEL_ID}`)) return;
  root.insertAdjacentHTML('beforeend', cabinetMarkup());
}

function ensureMounted() {
  const root = document.getElementById(ROOT_ID);
  if (!root) return false;
  ensureButton(root);
  ensurePanel(root);
  return true;
}

function openCabinet(trigger = null) {
  if (!ensureMounted()) return false;
  const root = document.getElementById(ROOT_ID);
  const panel = root?.querySelector(`#${PANEL_ID}`);
  if (!root || !panel) return false;
  returnFocus = trigger || document.activeElement;
  panel.hidden = false;
  root.dataset.codexInstrumentCabinetOpen = 'true';
  panel.querySelector('[data-codex-instrument-cabinet-close]')?.focus?.();
  publish('arcsweep:codex-instrument-cabinet-opened', {
    cabinet: codexInstrumentCabinetSnapshot(),
  });
  return true;
}

function closeCabinet() {
  const root = document.getElementById(ROOT_ID);
  const panel = root?.querySelector(`#${PANEL_ID}`);
  if (!root || !panel || panel.hidden) return false;
  panel.hidden = true;
  delete root.dataset.codexInstrumentCabinetOpen;
  const target = returnFocus;
  returnFocus = null;
  target?.focus?.();
  publish('arcsweep:codex-instrument-cabinet-closed');
  return true;
}

function onClick(event) {
  const open = event.target?.closest?.('[data-codex-instrument-cabinet-open]');
  if (open) {
    event.preventDefault();
    openCabinet(open);
    return;
  }
  if (event.target?.closest?.('[data-codex-instrument-cabinet-close]')) {
    event.preventDefault();
    closeCabinet();
  }
}

function onKeydown(event) {
  if (event.key !== 'Escape') return;
  const panel = document.getElementById(PANEL_ID);
  if (!panel || panel.hidden) return;
  event.preventDefault();
  closeCabinet();
}

export function bootCodexInstrumentCabinet() {
  if (booted) return true;
  booted = true;
  ensureMounted();
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeydown);
  observer = new MutationObserver(() => ensureMounted());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  return true;
}

export function teardownCodexInstrumentCabinet() {
  if (!booted) return;
  booted = false;
  observer?.disconnect?.();
  observer = null;
  document.removeEventListener('click', onClick);
  document.removeEventListener('keydown', onKeydown);
}

if (typeof document !== 'undefined') bootCodexInstrumentCabinet();
