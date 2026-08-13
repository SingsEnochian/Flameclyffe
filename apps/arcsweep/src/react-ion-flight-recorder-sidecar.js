import { traceAskRoute } from './react-ion-transport.js';

const STORE_KEY = 'hearthgate.arcsweep.react-ion-helm.v1';
let running = false;

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function readStore() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) || 'null');
    if (parsed?.version === 1 && Array.isArray(parsed.receipts)) return parsed;
  } catch {}
  return { version: 1, receipts: [] };
}

function writeStore(store) {
  try { globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
}

function renderTrace(trace) {
  if (!trace) return '';
  const hops = trace.hops.map((hop) => `<li><code>${esc(hop.address)}</code> · ${esc(hop.code)} · TTL ${hop.ttl_before} → ${hop.ttl_after}</li>`).join('');
  return `<div class="reaction-flight-recorder" data-reaction-flight-recorder>
    <p class="eyebrow">Trans-Cosmic Protocol · traceroute</p>
    <p><b>${trace.delivered ? 'Packet delivered to route endpoint' : 'Packet expired before endpoint'}</b> · ${esc(trace.final_code)} · ${trace.hops.length} hop${trace.hops.length === 1 ? '' : 's'}</p>
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
    if (!receipt.transport) {
      receipt.transport = await traceAskRoute({
        packet: receipt.ask,
        route: receipt.route,
        startedAt: receipt.created_at,
      });
      writeStore(store);
    }
    const existing = panel.querySelector('[data-reaction-flight-recorder]');
    if (!existing) {
      const receiptBox = panel.querySelector('.reaction-helm-receipt');
      if (receiptBox) receiptBox.insertAdjacentHTML('beforeend', renderTrace(receipt.transport));
    }
  } finally {
    running = false;
  }
}

const observer = new MutationObserver(() => { void enrich(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void enrich(); }, { once: true });
else void enrich();
