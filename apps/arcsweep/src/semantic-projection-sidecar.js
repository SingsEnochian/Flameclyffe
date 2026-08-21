import { CONSTELLATION_LENS_EVENTS } from './constellation-lens.js';
import {
  CONSTELLATION_RATIONALE_EVENT,
  reasoningSummariesEnabled,
} from './constellation-reasoning-preference.js';
import { createVisibleResponseSignature } from './visible-response-correspondence.js';
import { evaluateVisibleSemanticProjection } from './semantic-projection-evaluator.js';
import { buildConstellationSemanticProjectionDivergence } from './constellation-semantic-projection-divergence.js';
import {
  SEMANTIC_PROJECTION_UPDATED_EVENT,
  appendSemanticProjection,
  ensureSemanticProjectionLedger,
  persistSemanticProjectionLedger,
} from './semantic-projection-state.js';
import { loadState } from './storage.js';

let mounting = false;
const inFlight = new Set();

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function activeSurface() {
  return Boolean(document.querySelector('.nav-button.active[data-room="deep-observer"], .nav-button.active[data-room="commons"]'));
}

function dispatchRationale(detail, evaluated) {
  if (!reasoningSummariesEnabled() || !evaluated.rationale) return;
  document.dispatchEvent(new CustomEvent(CONSTELLATION_RATIONALE_EVENT, {
    detail: {
      requestId: detail.requestId || null,
      voiceId: detail.voiceId,
      fieldKey: detail.fieldKey || null,
      rationale: evaluated.rationale,
      sourceProjectionId: evaluated.projection.projection_id,
      evaluator: evaluated.projection.evaluator,
      authority: {
        visible_shareable_summary: true,
        hidden_chain_of_thought: false,
        persisted_with_projection: false,
      },
    },
  }));
}

async function captureSemanticProjection(event) {
  const detail = event.detail || {};
  if (!detail.runtimeVerified || !detail.voiceId || !String(detail.text || '').trim()) return;
  const signature = await createVisibleResponseSignature(detail.text, { generatedAt: new Date().toISOString() });
  const key = `${detail.voiceId}:${signature.visible_response_hash}`;
  if (inFlight.has(key)) return;
  inFlight.add(key);
  try {
    const state = await loadState();
    const ledger = ensureSemanticProjectionLedger(state);
    if (ledger.projections.some((item) => item.voice_id === detail.voiceId && item.visible_response_hash === signature.visible_response_hash)) return;
    const evaluated = await evaluateVisibleSemanticProjection({
      voiceId: detail.voiceId,
      text: detail.text,
      requestId: detail.requestId || null,
      includeRationale: reasoningSummariesEnabled(),
      generatedAt: signature.generated_at,
    });
    if (evaluated.status !== 'projected') return;
    appendSemanticProjection(ledger, evaluated.projection);
    await persistSemanticProjectionLedger(ledger, {
      projection_id: evaluated.projection.projection_id,
      voice_id: detail.voiceId,
      request_id: detail.requestId || null,
    });
    dispatchRationale(detail, evaluated);
  } catch (error) {
    console.warn('Semantic projection capture stopped:', error);
  } finally {
    inFlight.delete(key);
  }
}

function matrixMarkup(matrix) {
  if (!matrix.flame_ids.length) return '<p class="muted">No semantic projections have been receipted yet.</p>';
  const head = matrix.flame_ids.map((id) => `<th>${esc(id)}</th>`).join('');
  const rows = matrix.flame_ids.map((left) => `<tr><th>${esc(left)}</th>${matrix.flame_ids.map((right) => {
    const value = matrix.divergence[left]?.[right];
    return `<td>${value == null ? '—' : Number(value).toFixed(2)}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="runtime-divergence-wrap"><table><thead><tr><th>Projected semantic Δ</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

async function renderPanel() {
  const state = await loadState();
  const ledger = ensureSemanticProjectionLedger(state);
  const matrix = await buildConstellationSemanticProjectionDivergence(ledger);
  const latest = [...ledger.projections].slice(-8).reverse();
  const receipts = latest.map((item) => `<li><b>${esc(item.voice_id || 'unscoped')}</b><span>${esc(item.projection.intent || 'intent unavailable')}</span><small>${esc(item.evaluator.provider || 'provider?')} · ${esc(item.evaluator.model || 'model?')} · ${esc(item.evaluator.mode)}</small></li>`).join('');
  return `<section class="panel semantic-projection-panel" data-semantic-projection-panel>
    <div class="section-heading compact-heading"><div><p class="eyebrow">Constellation · model-mediated interpretation</p><h2>Semantic Projection</h2><p class="muted">A second pass projects already-visible replies into compact intent/concept/stance/affect records. The raw reply is not persisted here.</p></div><div class="continuity-summary"><b>${ledger.projections.length}</b><span>Projections</span></div></div>
    ${matrixMarkup(matrix)}
    <p class="muted"><b>Boundary:</b> projected semantic divergence ≠ semantic ground truth ≠ identity distance. Same-Flame second-pass evaluation does not remove evaluator bias.</p>
    <details><summary>Recent projection receipts</summary><ul class="flame-transition-list">${receipts || '<li>No receipts yet.</li>'}</ul></details>
  </section>`;
}

async function mount() {
  if (mounting || !activeSurface()) return;
  mounting = true;
  try {
    const html = await renderPanel();
    const existing = document.querySelector('[data-semantic-projection-panel]');
    if (existing) existing.outerHTML = html;
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', html);
  } finally {
    mounting = false;
  }
}

document.addEventListener(CONSTELLATION_LENS_EVENTS.response, (event) => { void captureSemanticProjection(event); });
globalThis.addEventListener?.(SEMANTIC_PROJECTION_UPDATED_EVENT, () => { void mount(); });
const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
