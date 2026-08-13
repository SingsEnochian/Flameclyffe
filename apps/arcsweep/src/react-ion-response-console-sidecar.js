import {
  RESPONSE_CODES,
  createAskResponse,
} from './bifrost-protocol-stack.js';
import {
  compileReactionRegistry,
  normaliseReactionRegistryStore,
} from './react-ion-registry.js';
import { routeProtocolResponse } from './react-ion-response-return.js';

const HELM_STORE_KEY = 'hearthgate.arcsweep.react-ion-helm.v1';
const REGISTRY_STORE_KEY = 'hearthgate.arcsweep.react-ion-registry.v1';
let mounting = false;

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

function readHelmStore() {
  const value = readJson(HELM_STORE_KEY);
  return value?.version === 1 && Array.isArray(value.receipts) ? value : { version: 1, receipts: [] };
}

function writeHelmStore(store) {
  try { globalThis.localStorage?.setItem(HELM_STORE_KEY, JSON.stringify(store)); } catch {}
}

function runtime() {
  return compileReactionRegistry(normaliseReactionRegistryStore(readJson(REGISTRY_STORE_KEY)));
}

function latestReceipt(store) {
  return store.receipts.at(-1) || null;
}

function responseCards(receipt) {
  const exchanges = receipt?.protocol_responses || [];
  if (!exchanges.length) return '<p class="muted">No semantic response has been recorded for this Ask.</p>';
  return `<div class="reaction-response-list">${[...exchanges].reverse().map((exchange) => {
    const response = exchange.response;
    const returned = exchange.return_receipt;
    return `<article class="reaction-response-card"><div><b>${esc(response.code)}</b> · ${esc(response.responder)}<br><span class="muted">${esc(response.message || 'No message')} · return ${esc(returned.transport_code)}${returned.delivered ? ' · delivered to sender endpoint' : ''}</span>${response.counterproposal ? `<p><b>Counter:</b> ${esc(response.counterproposal)}</p>` : ''}</div><details><summary>Response receipt</summary><pre>${esc(JSON.stringify(exchange, null, 2))}</pre></details></article>`;
  }).join('')}</div>`;
}

function render(receipt, message = '') {
  if (!receipt?.ask || !receipt?.route) return '';
  return `<section class="reaction-response-console" data-reaction-response-console>
    <div class="section-heading compact-heading"><div><p class="eyebrow">Bifröst · semantic return channel</p><h3>Response Console</h3><p class="muted">Record a response that was actually received or intentionally authored in a story/simulation. The engine never manufactures one. Semantic response and transport ACK remain separate.</p></div></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <form data-reaction-response-form class="stack compact-stack">
      <div class="grid three compact-grid"><label>Response<select name="code">${RESPONSE_CODES.map((code) => `<option>${esc(code)}</option>`).join('')}</select></label><label>Responder<input name="responder" value="${esc(receipt.target.name || 'Target')}" required /></label><label>Return TTL<input name="ttl" type="number" min="1" max="64" value="8" /></label></div>
      <label>Message<textarea name="message" rows="2" placeholder="What was answered?"></textarea></label>
      <label>Counterproposal<textarea name="counterproposal" rows="2" placeholder="Required when the response code is COUNTER."></textarea></label>
      <div class="grid two compact-grid"><label>Evidence class<select name="evidenceClass">${['symbolic','observed','derived','simulated','model-generated'].map((value) => `<option>${value}</option>`).join('')}</select></label><label>Evidence source<input name="evidenceSource" value="operator-recorded-response" required /></label></div>
      <button type="submit">Receipt response and solve return path</button>
    </form>
    ${responseCards(receipt)}
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#reaction-response-console-style')) return;
  const style = document.createElement('style');
  style.id = 'reaction-response-console-style';
  style.textContent = `.reaction-response-console{margin-top:1rem;padding-top:1rem;border-top:1px solid color-mix(in srgb,var(--gold) 20%,transparent)}.reaction-response-list{display:grid;gap:.65rem;margin-top:.8rem}.reaction-response-card{padding:.75rem;border:1px solid color-mix(in srgb,var(--green) 28%,transparent);border-radius:10px}.reaction-response-card pre{max-height:24rem;overflow:auto;white-space:pre-wrap}`;
  document.head.appendChild(style);
}

function mount() {
  if (mounting) return;
  const panel = document.querySelector('[data-reaction-helm]');
  if (!panel || panel.querySelector('[data-reaction-response-console]')) return;
  const store = readHelmStore();
  const receipt = latestReceipt(store);
  if (!receipt?.ask || !receipt?.route) return;
  mounting = true;
  try {
    injectStyle();
    const box = panel.querySelector('.reaction-helm-receipt');
    if (box) box.insertAdjacentHTML('beforeend', render(receipt));
  } finally {
    mounting = false;
  }
}

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-reaction-response-form]');
  if (!form) return;
  event.preventDefault();
  const consolePanel = form.closest('[data-reaction-response-console]');
  try {
    const data = new FormData(form);
    const store = readHelmStore();
    const receipt = latestReceipt(store);
    if (!receipt?.ask || !receipt?.route) throw new Error('A routed Helm Ask is required before recording a response.');
    const response = await createAskResponse({
      packet: receipt.ask,
      code: data.get('code'),
      responder: data.get('responder'),
      message: data.get('message'),
      counterproposal: data.get('counterproposal'),
      evidence: [{
        class: data.get('evidenceClass'),
        source: data.get('evidenceSource'),
        value: {
          code: data.get('code'),
          message: String(data.get('message') || '').trim() || null,
        },
      }],
    });
    const currentRuntime = runtime();
    const returnReceipt = await routeProtocolResponse({
      packet: receipt.ask,
      response,
      outboundRoute: receipt.route,
      graph: currentRuntime.graph,
      ttl: Number(data.get('ttl')),
    });
    receipt.protocol_responses ||= [];
    receipt.protocol_responses.push({
      schema: 'reaction.protocol-exchange/v1',
      recorded_at: new Date().toISOString(),
      response,
      return_receipt: returnReceipt,
      authority: {
        response_was_explicitly_recorded: true,
        engine_generated_response: false,
        transport_delivery_is_not_transformation_success: true,
      },
    });
    writeHelmStore(store);
    consolePanel.outerHTML = render(receipt, returnReceipt.delivered
      ? `${response.code} receipted and returned to the sender endpoint.`
      : `${response.code} receipted. No admitted return route was available: ${returnReceipt.route_error || returnReceipt.transport_code}.`);
  } catch (error) {
    const output = consolePanel.querySelector('.callout') || document.createElement('p');
    output.className = 'callout';
    output.textContent = `Response stopped: ${error.message}`;
    if (!output.parentElement) consolePanel.prepend(output);
  }
});

const observer = new MutationObserver(() => mount());
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
