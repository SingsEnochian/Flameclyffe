import { createProjectionGraphSnapshot } from './react-ion-graph-snapshot.js';
import {
  compileReactionRegistry,
  normaliseReactionRegistryStore,
} from './react-ion-registry.js';
import { traceAskRoute } from './react-ion-transport.js';

const STORE_KEY = 'hearthgate.arcsweep.react-ion-helm.v1';
const REGISTRY_STORE_KEY = 'hearthgate.arcsweep.react-ion-registry.v1';
let running = false;

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

function readStore() {
  const parsed = readJson(STORE_KEY);
  if (parsed?.version === 1 && Array.isArray(parsed.receipts)) return parsed;
  return { version: 1, receipts: [] };
}

function writeStore(store) {
  try { globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
}

function graphForReceipt(receipt) {
  const runtime = compileReactionRegistry(normaliseReactionRegistryStore(readJson(REGISTRY_STORE_KEY)));
  const graph = Object.fromEntries(Object.entries(runtime.graph).map(([key, edges]) => [key, [...edges]]));
  const direct = receipt?.direct_edge;
  if (direct?.from && direct?.to && !direct.blocked) {
    graph[direct.from] ||= [];
    if (!graph[direct.from].some((edge) => edge.to === direct.to && edge.corridor_id === direct.corridor_id)) {
      graph[direct.from].push(direct);
    }
  }
  return graph;
}

function renderTrace(trace, graphSnapshot) {
  if (!trace) return '';
  const hops = trace.hops.map((hop) => `<li><code>${esc(hop.address)}</code> · ${esc(hop.code)} · TTL ${hop.ttl_before} → ${hop.ttl_after}</li>`).join('');
  return `<div class="reaction-flight-recorder" data-reaction-flight-recorder>
    <p class="eyebrow">Trans-Cosmic Protocol · flight recorder</p>
    <p><b>${trace.delivered ? 'Packet delivered to route endpoint' : 'Packet expired before endpoint'}</b> · ${esc(trace.final_code)} · ${trace.hops.length} hop${trace.hops.length === 1 ? '' : 's'}</p>
    ${graphSnapshot ? `<p class="muted"><b>Captured graph:</b> ${esc(graphSnapshot.snapshot_id)} · ${graphSnapshot.node_count} nodes · ${graphSnapshot.edge_count} edges</p>` : ''}
    <details><summary>Transport hops</summary><ol>${hops}</ol><p class="muted">Delivery is transport state only. It does not declare the requested transformation fulfilled.</p></details>
  </div>`;
}

async function enrich() {
  if (running) return;
  const panel = document.querySelector('[data-reaction-helm]');
  if (!panel) return;
  const store = readStore();
  const receipt = store.receipts.at(-1);
  if (!receipt?.route || !receipt?.ask) return;
  running = true;
  try {
    let changed = false;
    if (!receipt.graph_snapshot) {
      receipt.graph_snapshot = await createProjectionGraphSnapshot({
        graph: graphForReceipt(receipt),
        createdAt: receipt.created_at,
        source: 'react-ion-flight-recorder',
      });
      changed = true;
    }
    if (!receipt.transport) {
      receipt.transport = await traceAskRoute({
        packet: receipt.ask,
        route: receipt.route,
        startedAt: receipt.created_at,
      });
      changed = true;
    }
    if (changed) writeStore(store);
    const existing = panel.querySelector('[data-reaction-flight-recorder]');
    if (!existing) {
      const receiptBox = panel.querySelector('.reaction-helm-receipt');
      if (receiptBox) receiptBox.insertAdjacentHTML('beforeend', renderTrace(receipt.transport, receipt.graph_snapshot));
    }
  } finally {
    running = false;
  }
}

const observer = new MutationObserver(() => { void enrich(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void enrich(); }, { once: true });
else void enrich();
