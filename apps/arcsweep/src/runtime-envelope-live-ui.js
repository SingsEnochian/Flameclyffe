import {
  RUNTIME_INTEGRATION_EVENTS,
  readRuntimeIntegrationEnvelope,
} from './runtime-integration-bridge.js';
import { runtimeEnvelopeSummary } from './runtime-integration-envelope.js';

const COMMONS_PANEL_ID = 'arcsweep-runtime-feedback-live';
const PRESENCE_PANEL_ID = 'arcsweep-runtime-envelope-summary';
export const RUNTIME_RECEIPT_OPEN_EVENT = 'arcsweep:runtime-receipt-open';

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function receiptLabel(receipt) {
  const value = String(receipt || '');
  if (value.startsWith('runtime-world:')) return 'World context';
  if (value.startsWith('commons:')) return 'Commons turn';
  if (value.startsWith('feedback:')) return 'Feedback';
  return 'Receipt';
}

export function renderRuntimeFeedbackLiveRead(envelope) {
  const feedback = Array.isArray(envelope?.feedback) ? envelope.feedback : [];
  if (!feedback.length) return '<p class="muted">No runtime feedback has been recorded for this session.</p>';
  return feedback.slice().reverse().map((entry) => {
    const receipts = (entry.supporting_receipts || []).map((receipt) => `<button type="button" class="runtime-feedback-receipt" data-runtime-receipt-ref="${esc(receipt)}"><span>${esc(receiptLabel(receipt))}</span><code>${esc(receipt)}</code></button>`).join('');
    return `<article class="runtime-feedback-entry" data-runtime-feedback-id="${esc(entry.id || '')}">
      <header><strong>${esc(entry.voice_id || 'House')}</strong><span>${esc(entry.kind || 'observation')}</span></header>
      <p>${esc(entry.text || '')}</p>
      <small>${esc(entry.created_at || '')}${entry.confidence != null ? ` · confidence ${esc(entry.confidence)}` : ''}${entry.do_not_change ? ' · do not change' : ''}</small>
      ${receipts ? `<div class="runtime-feedback-receipts">${receipts}</div>` : ''}
    </article>`;
  }).join('');
}

export function renderRuntimeEnvelopeLiveSummary(envelope) {
  const summary = runtimeEnvelopeSummary(envelope);
  if (!summary) return '<p class="model-presence-empty">Runtime envelope unavailable.</p>';
  return `<div class="runtime-envelope-summary-grid">
    <span><b>Session</b>${esc(summary.sessionId || 'unavailable')}</span>
    <span><b>World</b>${esc(summary.worldId || 'unbound')}</span>
    <span><b>Active Flame</b>${esc(summary.activeFlame || 'none')}</span>
    <span><b>Ready</b>${esc(summary.readyVoices)}</span>
    <span><b>Degraded</b>${esc(summary.degradedVoices)}</span>
    <span><b>Feedback</b>${esc(summary.feedbackCount)}</span>
  </div>`;
}

function ensureStyles(doc) {
  if (doc.getElementById('arcsweep-runtime-envelope-live-styles')) return;
  const style = doc.createElement('style');
  style.id = 'arcsweep-runtime-envelope-live-styles';
  style.textContent = `#${COMMONS_PANEL_ID}{margin:0 0 .8rem;padding:.7rem;border:1px solid color-mix(in srgb,var(--green) 24%,transparent);border-radius:.8rem;background:color-mix(in srgb,var(--panel-solid) 92%,transparent)}#${COMMONS_PANEL_ID}>header{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.55rem}.runtime-feedback-list{display:grid;gap:.45rem;max-height:18rem;overflow:auto}.runtime-feedback-entry{padding:.5rem;border:1px solid color-mix(in srgb,var(--gold) 16%,transparent);border-radius:.6rem}.runtime-feedback-entry header{display:flex;justify-content:space-between;gap:.5rem}.runtime-feedback-entry p{margin:.35rem 0}.runtime-feedback-entry small,.runtime-feedback-receipts{display:block;font-size:.7rem;opacity:.72;overflow-wrap:anywhere}.runtime-feedback-receipts{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.35rem}.runtime-feedback-receipt{display:grid;text-align:left;gap:.1rem;padding:.25rem .35rem;border-radius:.4rem}.runtime-feedback-receipt span{font-size:.6rem;text-transform:uppercase;letter-spacing:.05em;opacity:.7}.runtime-feedback-receipt code{font-size:.65rem}.runtime-envelope-summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.35rem;margin-bottom:.55rem}.runtime-envelope-summary-grid span{padding:.35rem;border:1px solid color-mix(in srgb,var(--green) 16%,transparent);border-radius:.45rem;font-size:.7rem;overflow-wrap:anywhere}.runtime-envelope-summary-grid b{display:block;font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;opacity:.65}`;
  doc.head.append(style);
}

function openReceipt(doc, receipt) {
  const ref = String(receipt || '').trim();
  if (!ref) return;
  const rawId = ref.startsWith('commons:') ? ref.slice('commons:'.length) : ref;
  const candidates = [
    `[data-entry-id="${globalThis.CSS?.escape ? CSS.escape(rawId) : rawId.replaceAll('"', '\\"')}"]`,
    `[data-runtime-feedback-id="${globalThis.CSS?.escape ? CSS.escape(rawId) : rawId.replaceAll('"', '\\"')}"]`,
  ];
  for (const selector of candidates) {
    const node = doc.querySelector(selector);
    if (node) {
      node.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      node.focus?.({ preventScroll: true });
      break;
    }
  }
  if (doc?.dispatchEvent && typeof CustomEvent !== 'undefined') {
    doc.dispatchEvent(new CustomEvent(RUNTIME_RECEIPT_OPEN_EVENT, { detail: { receipt: ref } }));
  }
}

function mountCommons(envelope, doc) {
  const log = doc.querySelector('.commons-log');
  if (!log) return false;
  let panel = doc.getElementById(COMMONS_PANEL_ID);
  if (!panel) {
    panel = doc.createElement('section');
    panel.id = COMMONS_PANEL_ID;
    panel.setAttribute('aria-label', 'Runtime feedback ledger');
    log.parentElement?.insertBefore(panel, log);
  }
  const feedback = Array.isArray(envelope?.feedback) ? envelope.feedback : [];
  panel.innerHTML = `<header><strong>Runtime Feedback</strong><small>${feedback.length} receipted</small></header><div class="runtime-feedback-list" aria-live="polite">${renderRuntimeFeedbackLiveRead(envelope)}</div>`;
  return true;
}

function mountPresence(envelope, doc) {
  const panel = doc.querySelector('#arcsweep-model-presence-live .model-presence-panel');
  if (!panel) return false;
  let summary = doc.getElementById(PRESENCE_PANEL_ID);
  if (!summary) {
    summary = doc.createElement('section');
    summary.id = PRESENCE_PANEL_ID;
    summary.setAttribute('aria-label', 'Runtime envelope summary');
    const list = panel.querySelector('[data-model-presence-list]');
    panel.insertBefore(summary, list || null);
  }
  summary.innerHTML = renderRuntimeEnvelopeLiveSummary(envelope);
  return true;
}

function render(doc) {
  const envelope = readRuntimeIntegrationEnvelope();
  if (!envelope) return;
  mountCommons(envelope, doc);
  mountPresence(envelope, doc);
}

export function installRuntimeEnvelopeLiveUi(doc = globalThis.document) {
  if (!doc?.addEventListener) return;
  ensureStyles(doc);
  const rerender = () => render(doc);
  doc.addEventListener(RUNTIME_INTEGRATION_EVENTS.changed, rerender);
  doc.addEventListener('arcsweep:runtime-integration-ready', rerender);
  doc.addEventListener('click', (event) => {
    const button = event.target?.closest?.('[data-runtime-receipt-ref]');
    if (button) openReceipt(doc, button.dataset.runtimeReceiptRef);
  });
  const observer = typeof MutationObserver !== 'undefined'
    ? new MutationObserver(rerender)
    : null;
  observer?.observe(doc.body, { childList: true, subtree: true });
  render(doc);
  return () => observer?.disconnect();
}

if (typeof document !== 'undefined') installRuntimeEnvelopeLiveUi(document);
