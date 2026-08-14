import { loadState, persistObservatoryStore } from './storage.js';
import { buildArcsweepProvenanceGraph, connectedProvenanceComponent, createProvenanceBundle } from './receipt-provenance-graph.js';
import { createProvenanceExportReceipt } from './receipt-provenance-export.js';

const TRANSFORMATION_KEY = 'hearthgate.arcsweep.transformation-requests.v1';
const MAX_EXPORT_RECEIPTS = 24;
let mounting = false;
let activeNodeId = null;
let activeFocusId = null;
let lastModel = null;

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch { return fallback; }
}

function transformationsForState(state) {
  const core = state.transformationRequests || state.observatory?.transformations;
  if (core?.byWorld) return core;
  return readJson(TRANSFORMATION_KEY, { version: 1, byWorld: {} });
}

function requestOptions(transformations, worldId) {
  const record = transformations?.byWorld?.[worldId];
  return [...(record?.requests || [])].reverse();
}

async function model() {
  const state = await loadState();
  const world = state.worlds.find((item) => item.id === state.activeWorldId) || state.worlds[0] || null;
  if (!world) return null;
  const transformations = transformationsForState(state);
  const graph = buildArcsweepProvenanceGraph({
    worldId: world.id,
    transformations,
    feedbackCycles: state.feedbackCycles || [],
    feedbackQueue: state.feedbackQueue || null,
    observatory: state.observatory || null,
  });
  const requests = requestOptions(transformations, world.id);
  if (activeFocusId === null && requests[0]?.request_id) activeFocusId = requests[0].request_id;
  if (activeFocusId && !graph.nodes.some((item) => item.id === activeFocusId)) activeFocusId = requests[0]?.request_id || '';
  const focused = activeFocusId ? connectedProvenanceComponent(graph, activeFocusId) : graph;
  if (activeNodeId && !focused.nodes.some((item) => item.id === activeNodeId)) activeNodeId = null;
  if (!activeNodeId) activeNodeId = focused.nodes.find((item) => item.id === activeFocusId)?.id || focused.nodes.at(-1)?.id || null;
  const exportReceipts = (state.observatory?.provenance_exports || []).filter((item) => item.world_id === world.id);
  return { state, world, transformations, graph, focused, requests, exportReceipts };
}

function modelSignature(m) {
  if (!m) return 'none';
  const lastNode = m.graph.nodes.at(-1)?.id || 'none';
  const lastEdge = m.graph.edges.at(-1);
  const lastExport = m.exportReceipts.at(-1)?.export_receipt_id || 'none';
  return `${m.world.id}:${activeFocusId || 'all'}:${activeNodeId || 'none'}:${m.graph.summary.node_count}:${m.graph.summary.edge_count}:${lastNode}:${lastEdge ? `${lastEdge.from}>${lastEdge.to}` : 'none'}:${lastExport}`;
}

function stageColumns(graph) {
  const byStage = new Map();
  for (const item of graph.nodes) {
    if (!byStage.has(item.stage)) byStage.set(item.stage, []);
    byStage.get(item.stage).push(item);
  }
  return [...byStage.entries()].sort(([a], [b]) => a - b);
}

function graphSvg(graph) {
  if (!graph.nodes.length) return '<p class="muted">No connected receipts are available for this focus yet.</p>';
  const columns = stageColumns(graph);
  const width = Math.max(720, columns.length * 190 + 40);
  const tallest = Math.max(...columns.map(([, items]) => items.length), 1);
  const height = Math.max(260, tallest * 82 + 50);
  const positions = new Map();
  columns.forEach(([, items], columnIndex) => {
    const x = 40 + columnIndex * ((width - 80) / Math.max(1, columns.length - 1));
    const span = Math.max(1, items.length - 1);
    items.forEach((item, rowIndex) => {
      const y = items.length === 1 ? height / 2 : 35 + rowIndex * ((height - 70) / span);
      positions.set(item.id, { x, y });
    });
  });
  const lines = graph.edges.map((item) => {
    const from = positions.get(item.from);
    const to = positions.get(item.to);
    if (!from || !to) return '';
    const mx = (from.x + to.x) / 2;
    return `<path d="M ${from.x} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${to.x} ${to.y}" class="prov-edge"><title>${esc(item.relation)}</title></path>`;
  }).join('');
  const nodes = graph.nodes.map((item) => {
    const p = positions.get(item.id);
    const selected = item.id === activeNodeId ? ' selected' : '';
    const short = item.label.length > 24 ? `${item.label.slice(0, 22)}…` : item.label;
    return `<g class="prov-node${selected}" data-prov-svg-node="${esc(item.id)}" tabindex="0" role="button" aria-label="${esc(item.label)}"><circle cx="${p.x}" cy="${p.y}" r="12"/><text x="${p.x}" y="${p.y + 29}" text-anchor="middle">${esc(short)}</text><title>${esc(item.kind)} · ${esc(item.id)}</title></g>`;
  }).join('');
  return `<div class="prov-graph-scroll"><svg class="prov-graph" viewBox="0 0 ${width} ${height}" role="img" aria-label="Arcsweep receipt provenance graph">${lines}${nodes}</svg></div>`;
}

function nodeCards(graph) {
  if (!graph.nodes.length) return '';
  return `<div class="prov-node-list">${graph.nodes.map((item) => `<button type="button" class="prov-node-card ${item.id === activeNodeId ? 'selected' : ''}" data-prov-node="${esc(item.id)}"><span>${esc(item.kind.replaceAll('_', ' '))}</span><strong>${esc(item.label)}</strong><small>${esc(item.id)}</small></button>`).join('')}</div>`;
}

function selectedReceipt(graph) {
  const selected = graph.nodes.find((item) => item.id === activeNodeId) || null;
  if (!selected) return '<p class="muted">Select a receipt node to inspect its source packet.</p>';
  return `<article class="prov-inspector"><div class="section-heading compact-heading"><div><p class="eyebrow">Receipt inspector</p><h3>${esc(selected.label)}</h3><p class="muted">${esc(selected.kind)} · ${esc(selected.id)}</p></div></div><pre>${esc(JSON.stringify(selected.receipt, null, 2))}</pre></article>`;
}

function structuralMarkup(graph) {
  if (!graph.summary.unresolved_edge_count && !graph.summary.collision_count) return '<small>Structural audit clean</small>';
  return `<small>${graph.summary.unresolved_edge_count} unresolved receipt link${graph.summary.unresolved_edge_count === 1 ? '' : 's'} · ${graph.summary.collision_count} collision${graph.summary.collision_count === 1 ? '' : 's'}</small>`;
}

function render(m, message = '') {
  const { world, focused, graph, requests, exportReceipts } = m;
  const options = [`<option value="" ${activeFocusId ? '' : 'selected'}>All connected receipts</option>`, ...requests.map((request) => `<option value="${esc(request.request_id)}" ${request.request_id === activeFocusId ? 'selected' : ''}>Ask · ${esc(requestLabel(request))}</option>`)].join('');
  const orphanCount = graph.nodes.length - focused.nodes.length;
  const key = modelSignature(m);
  const latestExport = exportReceipts.at(-1) || null;
  return `<section class="panel receipt-provenance" data-receipt-provenance data-prov-key="${esc(key)}">
    <div class="section-heading compact-heading"><div><p class="eyebrow">Receipts remember the path</p><h2>Provenance Graph</h2><p class="muted">Trace an Ask through BAI, cusp, Feedback, DEEPTime, Theory, Advisor and Runa. The graph follows explicit receipt identifiers only; it does not invent missing joins.</p></div><span class="bai-topology-badge">${focused.nodes.length} nodes</span></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <div class="grid two compact-grid prov-controls"><label>Focus<select data-prov-focus>${options}</select></label><div class="prov-actions"><button type="button" data-prov-action="export">Export & receipt connected bundle</button><small>${focused.edges.length} links${orphanCount > 0 ? ` · ${orphanCount} unrelated receipt${orphanCount === 1 ? '' : 's'} hidden` : ''}</small>${structuralMarkup(focused)}</div></div>
    ${graphSvg(focused)}
    ${nodeCards(focused)}
    ${selectedReceipt(focused)}
    <p class="muted">Provenance exports receipted for this world: ${exportReceipts.length}${latestExport ? ` · latest ${esc(latestExport.export_receipt_id)}` : ''}. The archive stores export metadata and bundle fingerprint, not a second full copy of every source receipt.</p>
  </section>`;
}

function requestLabel(request) { return request?.request?.description || request?.description || request.request_id; }

function injectStyle() {
  if (document.querySelector('#receipt-provenance-style')) return;
  const style = document.createElement('style');
  style.id = 'receipt-provenance-style';
  style.textContent = `.receipt-provenance{margin-top:1rem}.prov-controls{align-items:end}.prov-actions{display:flex;flex-direction:column;align-items:flex-start;gap:.35rem}.prov-graph-scroll{overflow:auto;margin:.8rem 0;border:1px solid color-mix(in srgb,var(--gold) 22%,transparent);border-radius:12px;background:color-mix(in srgb,var(--panel-solid) 88%,transparent)}.prov-graph{display:block;width:100%;min-width:720px;min-height:250px}.prov-edge{fill:none;stroke:color-mix(in srgb,var(--text) 28%,transparent);stroke-width:1.6}.prov-node{cursor:pointer}.prov-node circle{fill:var(--panel-solid);stroke:var(--gold);stroke-width:2}.prov-node text{fill:var(--text);font-size:10px;pointer-events:none}.prov-node.selected circle{stroke-width:4}.prov-node-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.45rem;margin:.7rem 0}.prov-node-card{display:flex;flex-direction:column;align-items:flex-start;text-align:left;gap:.18rem;padding:.65rem .75rem}.prov-node-card span{text-transform:uppercase;letter-spacing:.07em;font-size:.67rem;opacity:.68}.prov-node-card small{max-width:100%;overflow:hidden;text-overflow:ellipsis}.prov-node-card.selected{outline:2px solid var(--gold)}.prov-inspector{margin-top:.8rem}.prov-inspector pre{max-height:420px;overflow:auto;white-space:pre-wrap;word-break:break-word;padding:.8rem;border:1px solid color-mix(in srgb,var(--gold) 20%,transparent);border-radius:10px;background:color-mix(in srgb,var(--panel-solid) 92%,black 8%);font-size:.76rem}`;
  document.head.appendChild(style);
}

async function mount(message = '') {
  if (mounting) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (!['Relational Feedback Chamber', 'Field · DEEP Observer'].includes(title)) {
    document.querySelector('[data-receipt-provenance]')?.remove();
    return;
  }
  mounting = true;
  try {
    injectStyle();
    const next = await model();
    if (!next) return;
    const existing = document.querySelector('[data-receipt-provenance]');
    const key = modelSignature(next);
    if (!message && existing?.dataset.provKey === key) {
      lastModel = next;
      return;
    }
    lastModel = next;
    const html = render(next, message);
    if (existing) existing.outerHTML = html;
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', html);
  } finally { mounting = false; }
}

function browserDownload(bundle, worldName) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const slug = String(worldName || 'world').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'world';
  link.href = url;
  link.download = `arcsweep-provenance-${slug}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.addEventListener('change', (event) => {
  const select = event.target.closest('[data-prov-focus]');
  if (!select) return;
  activeFocusId = select.value || '';
  activeNodeId = activeFocusId || null;
  void mount();
});

document.addEventListener('click', async (event) => {
  const nodeButton = event.target.closest('[data-prov-node]');
  const svgNode = event.target.closest?.('[data-prov-svg-node]');
  const nodeId = nodeButton?.dataset.provNode || svgNode?.dataset.provSvgNode;
  if (nodeId) {
    activeNodeId = nodeId;
    await mount();
    return;
  }
  const exportButton = event.target.closest('[data-prov-action="export"]');
  if (!exportButton) return;
  try {
    const m = lastModel || await model();
    if (!m) throw new Error('No active world is available.');
    const bundle = await createProvenanceBundle({ graph: m.graph, focusId: activeFocusId || null });
    const exportReceipt = await createProvenanceExportReceipt({ bundle });
    const observatory = structuredClone(m.state.observatory || {});
    const exports = (observatory.provenance_exports || []).filter((item) => item.export_receipt_id !== exportReceipt.export_receipt_id);
    observatory.provenance_exports = [...exports, structuredClone(exportReceipt)].slice(-MAX_EXPORT_RECEIPTS);
    await persistObservatoryStore(observatory, {
      reason: 'provenance-bundle-export',
      bundleId: bundle.bundle_id,
      bundleFingerprint: bundle.bundle_fingerprint,
      exportReceiptId: exportReceipt.export_receipt_id,
    });
    browserDownload(bundle, m.world.name);
    await mount(`Exported ${bundle.bundle_id} with ${bundle.graph.nodes.length} source receipt nodes · export receipted as ${exportReceipt.export_receipt_id}.`);
  } catch (error) {
    await mount(`Provenance export stopped: ${error.message}`);
  }
});

document.addEventListener('keydown', (event) => {
  const node = event.target.closest?.('[data-prov-svg-node]');
  if (!node || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  activeNodeId = node.dataset.provSvgNode;
  void mount();
});

globalThis.addEventListener?.('arcsweep:receipts-updated', () => { void mount(); });

const observer = new MutationObserver(() => { if (!document.querySelector('[data-receipt-provenance]')) void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
