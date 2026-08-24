import { CONSTELLATION_RATIONALE_EVENT } from './constellation-reasoning-preference.js';

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function selectorValue(value = '') {
  return globalThis.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/["\\]/g, '\\$&');
}

function findCard({ requestId, voiceId }) {
  const requests = requestId == null ? [] : [...document.querySelectorAll(`.constellation-thought[data-request-id="${selectorValue(requestId)}"]`)];
  return requests.find((card) => !voiceId || card.dataset.voiceId === String(voiceId)) || null;
}

function injectStyles() {
  if (document.querySelector('#arcsweep-constellation-rationale-styles')) return;
  const style = document.createElement('style');
  style.id = 'arcsweep-constellation-rationale-styles';
  style.textContent = `
    .constellation-visible-rationale { margin-top:.45rem; padding-top:.4rem; border-top:1px solid color-mix(in srgb, var(--gold) 18%, transparent); }
    .constellation-visible-rationale summary { cursor:pointer; font-size:.78rem; opacity:.82; }
    .constellation-visible-rationale div { margin-top:.35rem; line-height:1.45; white-space:pre-wrap; font-size:.88rem; }
    .constellation-visible-rationale small { display:block; margin-top:.3rem; opacity:.62; }
  `;
  document.head.append(style);
}

function receiveRationale(event) {
  const detail = event.detail || {};
  const rationale = String(detail.rationale || '').trim();
  if (!rationale) return;
  const card = findCard(detail);
  if (!card) return;
  const existing = card.querySelector('[data-constellation-visible-rationale]');
  const markup = `<details class="constellation-visible-rationale" data-constellation-visible-rationale>
    <summary>Reasoning</summary>
    <div>${esc(rationale)}</div>
    <small>Visible rationale summary · ${esc(detail.evaluator?.provider || 'provider?')} / ${esc(detail.evaluator?.model || 'model?')}</small>
  </details>`;
  if (existing) existing.outerHTML = markup;
  else card.querySelector('.constellation-thought-body')?.insertAdjacentHTML('afterend', markup);
}

export function installConstellationRationaleSidecar() {
  if (typeof document === 'undefined') return;
  injectStyles();
  document.addEventListener(CONSTELLATION_RATIONALE_EVENT, receiveRationale);
}

if (typeof document !== 'undefined') installConstellationRationaleSidecar();
