import { compileReactionRegistry, normaliseReactionRegistryStore } from './react-ion-registry.js';
import { buildReactionRouteMap } from './react-ion-route-map.js';

const HELM_STORE_KEY = 'hearthgate.arcsweep.react-ion-helm.v1';
const REGISTRY_STORE_KEY = 'hearthgate.arcsweep.react-ion-registry.v1';

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function readJson(key) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function latestReceipt() {
  const store = readJson(HELM_STORE_KEY);
  return Array.isArray(store?.receipts) ? store.receipts.at(-1) || null : null;
}

function runtime() {
  return compileReactionRegistry(normaliseReactionRegistryStore(readJson(REGISTRY_STORE_KEY)));
}

function renderMap(model) {
  const nodeById = new Map(model.nodes.map((node) => [node.id, node]));
  const edges = model.edges.map((edge) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) return '';
    const classes = ['reaction-map-edge'];
    if (edge.active) classes.push('active');
    else if (edge.candidate_rank != null) classes.push('candidate');
    if (edge.blocked) classes.push('blocked');
    const title = `${edge.from} → ${edge.to}; Jacobian risk ${edge.jacobian_risk.toFixed(3)}; harmonic mismatch ${edge.harmonic_mismatch.toFixed(3)}; continuity risk ${edge.continuity_risk.toFixed(3)}`;
    return `<line class="${classes.join(' ')}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"><title>${esc(title)}</title></line>`;
  }).join('');

  const nodes = model.nodes.map((node) => {
    const classes = ['reaction-map-node'];
    if (node.active) classes.push('active');
    if (node.source) classes.push('source');
    if (node.target) classes.push('target');
    const label = node.label.length > 24 ? `${node.label.slice(0, 23)}…` : node.label;
    return `<g class="${classes.join(' ')}" transform="translate(${node.x} ${node.y})"><circle r="10"><title>${esc(node.label)} · ${esc(node.address)}</title></circle><text y="-16" text-anchor="middle">${esc(label)}</text></g>`;
  }).join('');

  return `<section class="reaction-route-map" data-reaction-route-map>
    <div class="section-heading compact-heading"><div><p class="eyebrow">Instrument Bay · projection topology</p><h3>Route Map</h3></div></div>
    <svg viewBox="0 0 ${model.width} ${model.height}" role="img" aria-label="React-ion projection route map">${edges}${nodes}</svg>
    <p class="muted">Selected route · retained alternates · approved corridors · continuity-vetoed corridors. Interface geometry only, not physical spacetime cartography.</p>
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#reaction-route-map-style')) return;
  const style = document.createElement('style');
  style.id = 'reaction-route-map-style';
  style.textContent = `.reaction-route-map{margin-top:1rem;padding-top:1rem;border-top:1px solid color-mix(in srgb,var(--gold) 20%,transparent)}.reaction-route-map svg{width:100%;min-height:240px;max-height:420px;overflow:visible}.reaction-map-edge{stroke:color-mix(in srgb,var(--green) 52%,transparent);stroke-width:2}.reaction-map-edge.candidate{stroke:color-mix(in srgb,var(--gold) 55%,transparent);stroke-width:2.5}.reaction-map-edge.active{stroke:var(--gold);stroke-width:4}.reaction-map-edge.blocked{stroke:color-mix(in srgb,var(--text) 35%,transparent);stroke-dasharray:8 7}.reaction-map-node circle{fill:var(--panel-solid);stroke:var(--green);stroke-width:2}.reaction-map-node.active circle{stroke:var(--gold);stroke-width:3}.reaction-map-node.source circle{stroke-width:4}.reaction-map-node.target circle{stroke-width:4}.reaction-map-node text{fill:var(--text);font-size:12px;paint-order:stroke;stroke:var(--panel-solid);stroke-width:3px;stroke-linejoin:round}`;
  document.head.appendChild(style);
}

function mount() {
  const panel = document.querySelector('[data-reaction-helm]');
  if (!panel || panel.querySelector('[data-reaction-route-map]')) return;
  const receipt = latestReceipt();
  if (!receipt?.navigation) return;
  try {
    const model = buildReactionRouteMap({
      runtime: runtime(),
      route: receipt.route,
      inspection: receipt.route_inspection,
      directEdge: receipt.direct_edge,
    });
    if (!model.nodes.length) return;
    injectStyle();
    const receiptBox = panel.querySelector('.reaction-helm-receipt');
    if (receiptBox) receiptBox.insertAdjacentHTML('beforeend', renderMap(model));
  } catch (error) {
    console.warn('React-ion route map could not render:', error);
  }
}

const observer = new MutationObserver(() => mount());
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
