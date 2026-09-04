import { loadState } from './storage.js';
import {
  COSMOLOGY_INHERITANCE_MODES,
  MULTIVERSE_MODEL_GALLERY,
  TEMPORAL_UNCERTAINTIES,
  buildAllDivergenceRecords,
  buildWorldLineageGraph,
  temporalRange,
} from './world-cosmology-lineage.js';

export const COSMOLOGY_LINEAGE_SIDECAR_VERSION = 'arcsweep.cosmology-lineage-sidecar/v1';

let installed = false;
let observer = null;
let queued = false;
let activeView = 'lineage';
let selectedWorldId = null;

const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function modeLabel(id) {
  return COSMOLOGY_INHERITANCE_MODES.find((item) => item.id === id)?.label || id || 'Unknown';
}

function lineageMarkup(graph) {
  if (!graph.nodes.length) return '<p class="muted">No worlds available.</p>';
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  return `<div class="cosmo-lineage-list">${graph.nodes.map((node) => {
    const parent = node.parentWorldId ? byId.get(node.parentWorldId) : null;
    return `<button type="button" class="cosmo-lineage-node${selectedWorldId === node.id ? ' active' : ''}" data-cosmo-world="${esc(node.id)}"><span>${node.parentWorldId ? `${esc(parent?.label || node.parentWorldId)} → ` : 'ROOT · '}</span><strong>${esc(node.label)}</strong><small>${esc(node.kind)} · ${esc(modeLabel(node.cosmology.mode))}</small>${node.cosmology.branchPoint ? `<em>branch: ${esc(node.cosmology.branchPoint)}</em>` : ''}</button>`;
  }).join('')}</div>`;
}

function selectedDetail(graph) {
  const node = graph.nodes.find((item) => item.id === selectedWorldId) || graph.nodes[0];
  if (!node) return '';
  selectedWorldId ||= node.id;
  return `<aside class="cosmo-lineage-detail"><p class="eyebrow">Selected world</p><h3>${esc(node.label)}</h3><dl><div><dt>Cosmology mode</dt><dd>${esc(modeLabel(node.cosmology.mode))}</dd></div><div><dt>Source world</dt><dd>${esc(node.cosmology.sourceWorldId || 'none / unknown')}</dd></div><div><dt>Reason</dt><dd>${esc(node.cosmology.reason || 'not recorded')}</dd></div><div><dt>Branch point</dt><dd>${esc(node.cosmology.branchPoint || 'not recorded')}</dd></div></dl></aside>`;
}

function divergenceMarkup(records) {
  if (!records.length) return '<p class="muted">No parent→child branches currently produce divergence records.</p>';
  return `<div class="cosmo-divergence-list">${records.map((record) => `<details><summary>${esc(record.childWorldName)} · ${record.differenceCount} recorded differences</summary><p class="muted">${esc(record.law)}</p>${record.branchPoint ? `<p><strong>Branch point:</strong> ${esc(record.branchPoint)}</p>` : ''}<div>${record.differences.map((diff) => `<article><strong>${esc(diff.label)}</strong><code>${esc(diff.path)}</code><p><span>Parent:</span> ${esc(JSON.stringify(diff.parentValue))}</p><p><span>Child:</span> ${esc(JSON.stringify(diff.childValue))}</p></article>`).join('')}</div></details>`).join('')}</div>`;
}

function modelsMarkup() {
  return `<div class="multiverse-gallery">${MULTIVERSE_MODEL_GALLERY.map((model) => `<article><header><strong>${esc(model.label)}</strong><span>${esc(model.status)}</span></header><p>${esc(model.summary)}</p><dl><div><dt>Family</dt><dd>${esc(model.family)}</dd></div><div><dt>Empirical status</dt><dd>${esc(model.empiricalStatus)}</dd></div></dl></article>`).join('')}</div>`;
}

function uncertaintyMarkup() {
  return `<div class="temporal-uncertainty-list">${TEMPORAL_UNCERTAINTIES.map((item) => {
    const range = temporalRange(item);
    return `<article><header><strong>${esc(item.label)}</strong><span>${esc(item.confidence)} confidence</span></header><p>${range ? `${esc(range.minimum)} → ${esc(range.maximum)} ${esc(range.unit)}` : 'Range unavailable'}</p><small>${esc(item.provenance)}</small></article>`;
  }).join('')}</div>`;
}

function bodyMarkup(graph, records) {
  if (activeView === 'models') return modelsMarkup();
  if (activeView === 'divergence') return divergenceMarkup(records);
  if (activeView === 'uncertainty') return uncertaintyMarkup();
  return `<div class="cosmo-lineage-grid">${lineageMarkup(graph)}${selectedDetail(graph)}</div>`;
}

async function render() {
  queued = false;
  const anchor = document.querySelector('[data-deep-history-atlas-sidecar]');
  if (!anchor) return;
  const state = await loadState().catch(() => null);
  if (!state) return;
  const graph = buildWorldLineageGraph(state.worlds || []);
  const records = buildAllDivergenceRecords(state.worlds || []);
  if (!selectedWorldId || !graph.nodes.some((node) => node.id === selectedWorldId)) selectedWorldId = graph.nodes[0]?.id || null;
  let root = document.querySelector('[data-cosmology-lineage-sidecar]');
  if (!root) {
    root = document.createElement('section');
    root.className = 'panel cosmology-lineage-sidecar';
    root.dataset.cosmologyLineageSidecar = COSMOLOGY_LINEAGE_SIDECAR_VERSION;
    anchor.insertAdjacentElement('afterend', root);
  }
  root.innerHTML = `<div class="section-heading"><div><p class="eyebrow">World ancestry · epistemic topology</p><h2>Cosmology & Lineage</h2></div><span class="cosmo-chip">difference without overwrite</span></div><nav class="cosmo-tabs" aria-label="Cosmology and lineage"><button type="button" data-cosmo-view="lineage" class="quiet mini${activeView === 'lineage' ? ' active' : ''}">World lineage</button><button type="button" data-cosmo-view="divergence" class="quiet mini${activeView === 'divergence' ? ' active' : ''}">Divergence</button><button type="button" data-cosmo-view="uncertainty" class="quiet mini${activeView === 'uncertainty' ? ' active' : ''}">Uncertainty</button><button type="button" data-cosmo-view="models" class="quiet mini${activeView === 'models' ? ' active' : ''}">Multiverse models</button></nav><div data-cosmo-body>${bodyMarkup(graph, records)}</div>`;
  root.querySelectorAll('[data-cosmo-view]').forEach((button) => button.addEventListener('click', () => { activeView = button.dataset.cosmoView; void render(); }));
  root.querySelectorAll('[data-cosmo-world]').forEach((button) => button.addEventListener('click', () => { selectedWorldId = button.dataset.cosmoWorld; void render(); }));
}

function queueRender() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => void render());
}

function styles() {
  if (document.querySelector('[data-cosmology-lineage-style]')) return;
  const style = document.createElement('style');
  style.dataset.cosmologyLineageStyle = COSMOLOGY_LINEAGE_SIDECAR_VERSION;
  style.textContent = `.cosmology-lineage-sidecar{display:grid;gap:1rem}.cosmo-tabs{display:flex;gap:.4rem;flex-wrap:wrap}.cosmo-tabs .active{outline:1px solid var(--accent)}.cosmo-chip{display:inline-flex;border:1px dashed var(--line-soft);border-radius:999px;padding:.15rem .45rem;font-size:.7rem}.cosmo-lineage-grid{display:grid;grid-template-columns:minmax(16rem,.8fr) minmax(18rem,1.2fr);gap:1rem}.cosmo-lineage-list{display:grid;gap:.4rem}.cosmo-lineage-node{display:grid;text-align:left;gap:.2rem;padding:.7rem;border:1px solid var(--line-soft);border-radius:.8rem;background:transparent;color:inherit}.cosmo-lineage-node.active{outline:1px solid var(--accent)}.cosmo-lineage-node span,.cosmo-lineage-node small,.cosmo-lineage-node em{color:var(--muted);font-size:.72rem}.cosmo-lineage-detail{padding:1rem;border-left:2px solid var(--accent)}.cosmo-lineage-detail dl,.multiverse-gallery article dl{display:grid;gap:.4rem}.cosmo-lineage-detail dl div,.multiverse-gallery article dl div{display:grid;grid-template-columns:9rem 1fr;gap:.7rem}.cosmo-lineage-detail dt,.multiverse-gallery dt{color:var(--muted)}.cosmo-divergence-list{display:grid;gap:.65rem}.cosmo-divergence-list details{border:1px solid var(--line-soft);border-radius:.8rem;padding:.75rem}.cosmo-divergence-list article{padding:.55rem 0;border-top:1px solid var(--line-soft)}.cosmo-divergence-list code{display:block;color:var(--muted)}.multiverse-gallery,.temporal-uncertainty-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));gap:.65rem}.multiverse-gallery article,.temporal-uncertainty-list article{border:1px solid var(--line-soft);border-radius:.8rem;padding:.8rem}.multiverse-gallery header,.temporal-uncertainty-list header{display:flex;justify-content:space-between;gap:.5rem;align-items:start}.multiverse-gallery header span,.temporal-uncertainty-list header span{font-size:.68rem;color:var(--muted)}@media(max-width:760px){.cosmo-lineage-grid{grid-template-columns:1fr}.cosmo-lineage-detail{border-left:0;border-top:2px solid var(--accent)}}`;
  document.head.append(style);
}

export function installCosmologyLineageSidecar() {
  if (installed || typeof document === 'undefined') return false;
  installed = true;
  styles();
  observer = new MutationObserver(queueRender);
  observer.observe(document.body, { childList: true, subtree: true });
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
  queueRender();
  return true;
}

if (typeof document !== 'undefined') installCosmologyLineageSidecar();
