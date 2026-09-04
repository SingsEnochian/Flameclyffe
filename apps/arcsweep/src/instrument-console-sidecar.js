import { APPLET_CATALOGUE } from './applets.js';
import { loadState } from './storage.js';
import {
  appletHealth,
  buildAppletCompletenessMatrix,
  buildInstrumentContext,
  contextualLaunchUrl,
  normaliseFavourites,
} from './instrument-console.js';

export const INSTRUMENT_CONSOLE_SIDECAR_VERSION = 'arcsweep.instrument-console-sidecar/v1';
const FAVOURITES_KEY = 'hearthgate.arcsweep.applet-favourites.v1';

let installed = false;
let observer = null;
let queued = false;
let query = '';
let category = 'all';
let favouritesOnly = false;
let probes = {};

const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function readFavourites() {
  try { return normaliseFavourites(JSON.parse(globalThis.localStorage?.getItem(FAVOURITES_KEY) || '[]')); }
  catch { return []; }
}

function writeFavourites(ids) {
  const next = normaliseFavourites(ids);
  try { globalThis.localStorage?.setItem(FAVOURITES_KEY, JSON.stringify(next)); } catch {}
  return next;
}

function toggleFavourite(id) {
  const current = readFavourites();
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  writeFavourites(next);
}

function decorateAppletForm(form) {
  if (!form) return;
  let tools = form.querySelector('[data-applet-deck-tools]');
  if (!tools) {
    tools = document.createElement('section');
    tools.className = 'applet-deck-tools';
    tools.dataset.appletDeckTools = INSTRUMENT_CONSOLE_SIDECAR_VERSION;
    tools.innerHTML = `<div class="applet-deck-search"><label>Find applet<input type="search" data-applet-search placeholder="glyph, sound, continuity…" /></label><label>Category<select data-applet-category><option value="all">All categories</option>${[...new Set(APPLET_CATALOGUE.map((item) => item.category))].sort().map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('')}</select></label><label class="applet-favourite-toggle"><input type="checkbox" data-applet-favourites-only /> Favourites only</label></div><p class="muted">★ favourites are local interface preferences. They do not change canon or Worldseed state.</p>`;
    form.prepend(tools);
    tools.querySelector('[data-applet-search]')?.addEventListener('input', (event) => { query = event.target.value.toLowerCase(); applyAppletFilters(form); });
    tools.querySelector('[data-applet-category]')?.addEventListener('change', (event) => { category = event.target.value; applyAppletFilters(form); });
    tools.querySelector('[data-applet-favourites-only]')?.addEventListener('change', (event) => { favouritesOnly = event.target.checked; applyAppletFilters(form); });
  }
  const favourites = readFavourites();
  form.querySelectorAll('[name^="visible-"]').forEach((input) => {
    const id = input.name.replace(/^visible-/, '');
    const row = input.closest('label, .applet-row, article, li, div');
    if (!row || row.querySelector(`[data-applet-favourite="${CSS.escape(id)}"]`)) return;
    const star = document.createElement('button');
    star.type = 'button';
    star.className = 'quiet mini applet-star';
    star.dataset.appletFavourite = id;
    star.setAttribute('aria-label', `Toggle ${id} favourite`);
    star.textContent = favourites.includes(id) ? '★' : '☆';
    star.addEventListener('click', () => {
      toggleFavourite(id);
      decorateAppletForm(form);
      applyAppletFilters(form);
    });
    row.append(star);
  });
  form.querySelectorAll('[data-applet-favourite]').forEach((button) => {
    button.textContent = readFavourites().includes(button.dataset.appletFavourite) ? '★' : '☆';
  });
  applyAppletFilters(form);
}

function applyAppletFilters(form) {
  const favourites = readFavourites();
  form.querySelectorAll('[name^="visible-"]').forEach((input) => {
    const id = input.name.replace(/^visible-/, '');
    const definition = APPLET_CATALOGUE.find((item) => item.id === id);
    const row = input.closest('label, .applet-row, article, li, div');
    if (!row || !definition) return;
    const haystack = `${definition.label} ${definition.id} ${definition.category} ${definition.description || ''}`.toLowerCase();
    const matchQuery = !query || haystack.includes(query);
    const matchCategory = category === 'all' || definition.category === category;
    const matchFavourite = !favouritesOnly || favourites.includes(id);
    row.hidden = !(matchQuery && matchCategory && matchFavourite);
  });
}

async function probeApplet(applet) {
  if (!applet.pagesHref) return { ok: true, reason: 'native ArcSweep room' };
  try {
    const response = await fetch(applet.pagesHref, { method: 'HEAD', cache: 'no-store' });
    return { ok: response.ok, reason: response.ok ? `HTTP ${response.status}` : `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, reason: error?.message || 'network failure' };
  }
}

async function probeLaunchTargets(button) {
  if (button) button.disabled = true;
  const targets = APPLET_CATALOGUE.filter((item) => item.pagesHref);
  const entries = await Promise.all(targets.map(async (item) => [item.id, await probeApplet(item)]));
  probes = Object.fromEntries(entries);
  if (button) button.disabled = false;
  queueRender();
}

function matrixMarkup(matrix, activeWorldId) {
  const rows = matrix.rows.filter((row) => row.worldId === activeWorldId);
  return `<div class="instrument-matrix"><div class="instrument-matrix-head"><span>Applet</span><span>Selected</span><span>Route</span><span>Health</span></div>${rows.map((row) => `<div class="instrument-matrix-row"><span><strong>${esc(row.label)}</strong><small>${esc(row.category)}</small></span><span>${row.selected ? '✓' : '·'}</span><span>${esc(row.routeKind)}</span><span data-health="${esc(row.health)}" title="${esc(row.healthReason)}">${esc(row.health)}</span></div>`).join('')}</div>`;
}

async function render() {
  queued = false;
  const form = document.querySelector('#applet-form');
  if (form) decorateAppletForm(form);
  const worldForm = document.querySelector('#world-registry-form');
  if (!worldForm) return;
  const state = await loadState().catch(() => null);
  if (!state) return;
  const context = buildInstrumentContext(state);
  globalThis.__arcsweepInstrumentContext = context;
  const matrix = buildAppletCompletenessMatrix(state, probes);
  let root = document.querySelector('[data-instrument-console]');
  if (!root) {
    root = document.createElement('section');
    root.className = 'panel instrument-console';
    root.dataset.instrumentConsole = INSTRUMENT_CONSOLE_SIDECAR_VERSION;
    const anchor = document.querySelector('[data-cosmology-lineage-sidecar]') || document.querySelector('[data-deep-history-atlas-sidecar]') || worldForm.closest('.panel');
    anchor?.insertAdjacentElement('afterend', root);
  }
  const favourites = readFavourites();
  root.innerHTML = `<div class="section-heading"><div><p class="eyebrow">World-aware applet control</p><h2>Instrument Console</h2></div><button type="button" class="quiet mini" data-probe-organs>Probe launch targets</button></div><div class="instrument-context"><strong>${esc(context.worldName || 'No active World')}</strong><span>${esc(context.worldId || 'no world id')}</span><span>${esc(context.worldKind || '')}</span><span>${matrix.appletCount} applets · ${favourites.length} favourites</span></div>${matrixMarkup(matrix, context.worldId)}<details><summary>Context-preserving launch preview</summary><div class="instrument-launch-preview">${APPLET_CATALOGUE.filter((item) => item.pagesHref).map((item) => `<p><strong>${esc(item.label)}</strong><code>${esc(contextualLaunchUrl(item.pagesHref, context, item.id))}</code></p>`).join('')}</div></details>`;
  root.querySelector('[data-probe-organs]')?.addEventListener('click', (event) => void probeLaunchTargets(event.currentTarget));
}

function queueRender() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => void render());
}

function installStyles() {
  if (document.querySelector('[data-instrument-console-style]')) return;
  const style = document.createElement('style');
  style.dataset.instrumentConsoleStyle = INSTRUMENT_CONSOLE_SIDECAR_VERSION;
  style.textContent = `.applet-deck-tools{display:grid;gap:.45rem;padding:.7rem;border:1px solid var(--line-soft);border-radius:.8rem;margin-bottom:.8rem}.applet-deck-search{display:grid;grid-template-columns:minmax(12rem,1fr) minmax(10rem,.6fr) auto;gap:.6rem;align-items:end}.applet-star{margin-left:auto}.instrument-console{display:grid;gap:1rem}.instrument-context{display:flex;gap:.6rem;flex-wrap:wrap;align-items:center}.instrument-context span{border-left:1px solid var(--line-soft);padding-left:.6rem;color:var(--muted)}.instrument-matrix{display:grid;gap:.2rem;overflow:auto}.instrument-matrix-head,.instrument-matrix-row{display:grid;grid-template-columns:minmax(13rem,1.5fr) .5fr .8fr .8fr;gap:.6rem;align-items:center;padding:.45rem .55rem}.instrument-matrix-head{font-size:.72rem;color:var(--muted);position:sticky;top:0;background:var(--panel)}.instrument-matrix-row{border-top:1px solid var(--line-soft)}.instrument-matrix-row small{display:block;color:var(--muted)}.instrument-matrix-row [data-health="verified-live"]{font-weight:700}.instrument-matrix-row [data-health="offline"]{text-decoration:underline}.instrument-launch-preview{display:grid;gap:.45rem}.instrument-launch-preview p{margin:0}.instrument-launch-preview code{display:block;overflow-wrap:anywhere;color:var(--muted)}@media(max-width:760px){.applet-deck-search{grid-template-columns:1fr}.instrument-matrix-head,.instrument-matrix-row{grid-template-columns:minmax(10rem,1fr) .5fr .8fr}.instrument-matrix-head span:nth-child(3),.instrument-matrix-row span:nth-child(3){display:none}}`;
  document.head.append(style);
}

export function installInstrumentConsoleSidecar() {
  if (installed || typeof document === 'undefined') return false;
  installed = true;
  installStyles();
  observer = new MutationObserver(queueRender);
  observer.observe(document.body, { childList: true, subtree: true });
  globalThis.addEventListener?.('arcsweep:terra-prime-synchronised', queueRender);
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
  queueRender();
  return true;
}

if (typeof document !== 'undefined') installInstrumentConsoleSidecar();
