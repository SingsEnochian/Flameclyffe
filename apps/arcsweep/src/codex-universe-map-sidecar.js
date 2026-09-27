import './codex-universe-map.css';

import {
  CODEX_UNIVERSE_MAP_SCHEMA,
  CODEX_UNIVERSES,
  codexUniverseMapSnapshot,
} from './codex/universe-map-registry.js';
import { epraCanonManifestSnapshot } from './codex/epra-canon-ingest-manifest.js';

export const CODEX_UNIVERSE_MAP_SIDECAR_SCHEMA = 'hearthweave.codex-universe-map-sidecar/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
const PANEL_ID = 'codex-universe-map';
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
  if (value === 'anchored') return 'Anchor';
  if (value === 'mapped') return 'Mapped';
  if (value === 'ingest-queued') return 'Ingest queued';
  return 'Discovered';
}

function universeMarkup(universe) {
  const worlds = universe.worldIds.length ? universe.worldIds.join(' · ') : '—';
  const notes = universe.notes.length
    ? `<small class="codex-universe-notes">${esc(universe.notes.join(' · '))}</small>`
    : '';
  const epra = universe.id === 'epra-a-new-hope'
    ? `<div class="codex-universe-ingest"><strong>Canon ingest</strong><span data-codex-epra-ingest-summary></span></div>`
    : '';
  return [
    `<article class="codex-universe-card" data-codex-universe="${esc(universe.id)}" data-mapping-state="${esc(universe.mappingState)}">`,
      '<header>',
        `<div><p>${esc(universe.universeClass)}</p><h3>${esc(universe.name)}</h3></div>`,
        `<span>${esc(statusLabel(universe.mappingState))}</span>`,
      '</header>',
      `<p>${esc(universe.summary)}</p>`,
      '<dl>',
        `<div><dt>Canon authority</dt><dd>${esc(universe.canonAuthority)}</dd></div>`,
        `<div><dt>World IDs</dt><dd>${esc(worlds)}</dd></div>`,
        `<div><dt>Sources</dt><dd>${esc(universe.sourceStatus)}</dd></div>`,
      '</dl>',
      universe.lineage ? `<p class="codex-universe-lineage"><strong>Lineage:</strong> ${esc(universe.lineage)}</p>` : '',
      epra,
      notes,
    '</article>',
  ].join('');
}

function mapMarkup() {
  const snapshot = codexUniverseMapSnapshot();
  const epra = epraCanonManifestSnapshot();
  const cards = CODEX_UNIVERSES.map(universeMarkup).join('');
  return [
    `<section id="${PANEL_ID}" class="codex-universe-map" data-schema="${CODEX_UNIVERSE_MAP_SCHEMA}" role="dialog" aria-modal="false" aria-labelledby="codex-universe-map-title" hidden>`,
      '<header class="codex-universe-map-heading">',
        '<div>',
          '<p class="magic-book-kicker">Universe map · canon boundaries</p>',
          '<h2 id="codex-universe-map-title">The Hearthweave Multiverse</h2>',
          `<p>${esc(snapshot.principle)}</p>`,
        '</div>',
        '<button type="button" data-codex-universe-map-close>Close Map</button>',
      '</header>',
      '<div class="codex-universe-map-summary">',
        `<span>${snapshot.count} universes</span>`,
        `<span>${snapshot.counts.anchored} anchored</span>`,
        `<span>${snapshot.counts.mapped} mapped</span>`,
        `<span>${snapshot.counts['ingest-queued']} ingest queued</span>`,
        `<span>${snapshot.counts.discovered} discovered</span>`,
      '</div>',
      '<aside class="codex-universe-reference">',
        '<strong>Reference frame</strong>',
        '<span>Terra Prime · Our Universe</span>',
        '<small>Empirical observation remains separate from authored/project canon.</small>',
      '</aside>',
      `<div class="codex-universe-grid">${cards}</div>`,
      '<footer>',
        `<small>Epra ingest manifest: ${epra.counts.current} current · ${epra.counts.ancestor} ancestor · ${epra.counts.legacy} legacy · ${epra.counts.reference} reference · ${epra.counts.exclude} excluded.</small>`,
      '</footer>',
    '</section>',
  ].join('');
}

function publish(name, detail = {}) {
  const payload = Object.freeze({ schema: CODEX_UNIVERSE_MAP_SIDECAR_SCHEMA, ...detail });
  try {
    globalThis.__arcsweepOS?.bus?.publish?.(name, payload, { source: 'codex-universe-map' });
  } catch {}
  globalThis.dispatchEvent?.(new CustomEvent(name, { detail: payload }));
}

function ensureButton(root) {
  const actions = root.querySelector('.magic-book-toolbar-actions');
  if (!actions || actions.querySelector('[data-codex-universe-map-open]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.codexUniverseMapOpen = 'true';
  button.textContent = 'Universes';
  const closeButton = actions.querySelector('[data-magic-book-close]');
  actions.insertBefore(button, closeButton || null);
}

function ensurePanel(root) {
  if (root.querySelector(`#${PANEL_ID}`)) return;
  root.insertAdjacentHTML('beforeend', mapMarkup());
  const manifest = epraCanonManifestSnapshot();
  const summary = root.querySelector('[data-codex-epra-ingest-summary]');
  if (summary) summary.textContent = `${manifest.counts.current} current / ${manifest.counts.ancestor} ancestor / ${manifest.counts.legacy} legacy sources`;
}

function ensureMounted() {
  const root = document.getElementById(ROOT_ID);
  if (!root) return false;
  ensureButton(root);
  ensurePanel(root);
  return true;
}

function openMap(trigger = null) {
  if (!ensureMounted()) return false;
  const root = document.getElementById(ROOT_ID);
  const panel = root?.querySelector(`#${PANEL_ID}`);
  if (!root || !panel) return false;
  returnFocus = trigger || document.activeElement;
  panel.hidden = false;
  root.dataset.codexUniverseMapOpen = 'true';
  panel.querySelector('[data-codex-universe-map-close]')?.focus?.();
  publish('arcsweep:codex-universe-map-opened', {
    universeMap: codexUniverseMapSnapshot(),
    epraCanon: epraCanonManifestSnapshot(),
  });
  return true;
}

function closeMap() {
  const root = document.getElementById(ROOT_ID);
  const panel = root?.querySelector(`#${PANEL_ID}`);
  if (!root || !panel || panel.hidden) return false;
  panel.hidden = true;
  delete root.dataset.codexUniverseMapOpen;
  const target = returnFocus;
  returnFocus = null;
  target?.focus?.();
  publish('arcsweep:codex-universe-map-closed');
  return true;
}

function onClick(event) {
  const open = event.target?.closest?.('[data-codex-universe-map-open]');
  if (open) {
    event.preventDefault();
    openMap(open);
    return;
  }
  if (event.target?.closest?.('[data-codex-universe-map-close]')) {
    event.preventDefault();
    closeMap();
  }
}

function onKeydown(event) {
  if (event.key !== 'Escape') return;
  const panel = document.getElementById(PANEL_ID);
  if (!panel || panel.hidden) return;
  event.preventDefault();
  closeMap();
}

export function bootCodexUniverseMap() {
  if (booted) return true;
  booted = true;
  ensureMounted();
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeydown);
  observer = new MutationObserver(() => ensureMounted());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  return true;
}

export function teardownCodexUniverseMap() {
  if (!booted) return;
  booted = false;
  observer?.disconnect?.();
  observer = null;
  document.removeEventListener('click', onClick);
  document.removeEventListener('keydown', onKeydown);
}

if (typeof document !== 'undefined') bootCodexUniverseMap();
