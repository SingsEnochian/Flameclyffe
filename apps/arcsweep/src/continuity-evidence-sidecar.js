import { loadState } from './storage.js';
import { semanticStateDistance } from './glyph-continuity.js';
import {
  GLYPH_CONTINUITY_UPDATED_EVENT,
  ensureGlyphContinuityLedger,
} from './glyph-continuity-state.js';
import { createRecognitionCorrespondence } from './recognition-correspondence.js';
import { REACTION_STATE_UPDATED_EVENT } from './react-ion-state.js';
import {
  CONTINUITY_EVIDENCE_UPDATED_EVENT,
  appendContinuityEvidence,
  ensureContinuityEvidenceLedger,
  harvestEmbeddedContinuityEvidence,
  persistContinuityEvidenceLedger,
} from './continuity-evidence-state.js';
import { buildContinuityEvidenceViewModel } from './continuity-evidence-view.js';

let mounting = false;
let syncing = false;
let refreshTimer = null;

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isDeepObserverActive() {
  return Boolean(document.querySelector('.nav-button.active[data-room="deep-observer"]'));
}

function activeWorld(state) {
  return state.worlds?.find((world) => world.id === state.activeWorldId) || state.worlds?.[0] || null;
}

function worldGlyphEntries(ledger, worldId) {
  return (ledger?.heartbeats || []).filter((entry) => entry?.world_id === worldId && entry?.heartbeat?.signature);
}

function score(value) {
  return value == null || !Number.isFinite(Number(value)) ? 'unavailable' : Number(value).toFixed(3);
}

function layerMarkup(layer) {
  const state = layer.available ? score(layer.score) : 'no evidence';
  const evidence = layer.evidence_ids?.length ? `<small>${esc(layer.evidence_ids.join(' · '))}</small>` : '<small>nothing inferred</small>';
  return `<li class="continuity-layer ${layer.available ? 'has-evidence' : 'no-evidence'}">
    <div><b>${esc(layer.label)}</b><span>${esc(state)}</span></div>
    ${evidence}
  </li>`;
}

function recognitionMarkup(item) {
  return `<article class="continuity-recognition-card">
    <div class="continuity-card-head"><div><p class="eyebrow">${esc(item.subject_label)}</p><h3>${esc(item.classification)}</h3></div><strong>${score(item.recognition_score)}</strong></div>
    <p class="muted">Visibility ${score(item.visibility_mass)} · ${esc(item.indices?.left?.label || item.indices?.left?.id || 'left index')} ↔ ${esc(item.indices?.right?.label || item.indices?.right?.id || 'right index')}</p>
    <ol class="continuity-layer-list">${item.layers.map(layerMarkup).join('')}</ol>
    <details><summary>Evidence receipt</summary><p><code>${esc(item.fingerprint)}</code></p><p class="muted">Recognition is operational correspondence. Structural closure remains an independent evidence layer.</p></details>
  </article>`;
}

function residualMarkup(item) {
  return `<article class="continuity-residual-card">
    <div class="continuity-card-head"><div><p class="eyebrow">${esc(item.mode)}</p><h3>${esc(item.classification)}</h3></div><small>${esc(item.origin?.organ || 'derived receipt')}</small></div>
    <dl class="facts">${item.components.map((component) => `<div><dt>${esc(component.label)}</dt><dd>${score(component.value)}</dd></div>`).join('')}</dl>
    <details><summary>Residual receipt</summary><p><code>${esc(item.fingerprint)}</code></p><p class="muted">Geometry is not permission. Permission is not transport. Transport is not semantic response. None of them alone is fulfilment.</p></details>
  </article>`;
}

function donorMarkup(source) {
  return `<li><b>${esc(source.title)}</b><br><code>${esc(source.source_hash || source.id)}</code></li>`;
}

function render(model, { canCompareGlyphs = false, message = '' } = {}) {
  const recognition = model.recognition.length
    ? model.recognition.map(recognitionMarkup).join('')
    : '<p class="muted">No Recognition Correspondence receipt exists for this world yet.</p>';
  const residuals = model.residuals.length
    ? model.residuals.map(residualMarkup).join('')
    : '<p class="muted">No transformation or React-ion residual has been harvested for this world yet.</p>';
  const donors = model.provenance.donor_sources.length
    ? `<ul class="continuity-donor-list">${model.provenance.donor_sources.map(donorMarkup).join('')}</ul>`
    : '<p class="muted">No external implementation donor is attached to the current evidence set.</p>';

  return `<section class="panel continuity-evidence-view" data-continuity-evidence-view>
    <div class="section-heading compact-heading"><div>
      <p class="eyebrow">Continuity Gate · correspondence + residual geometry</p>
      <h2>Continuity View</h2>
      <p class="muted">Six evidence layers remain independent. This view never reduces continuity to a single same/not-same verdict.</p>
    </div><div class="continuity-summary"><b>${model.summary.evidence_count}</b><span>receipts</span></div></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <div class="callout"><b>Truth partition:</b> recognition ≠ structural closure; geometry ≠ permission ≠ transport ≠ semantic response ≠ fulfilment.</div>
    <div class="button-row"><button type="button" data-continuity-receipt-glyph ${canCompareGlyphs ? '' : 'disabled'}>Receipt latest Glyph correspondence</button></div>
    <div class="grid two continuity-evidence-grid">
      <section><p class="eyebrow">Layered identity evidence</p>${recognition}</section>
      <section><p class="eyebrow">Admissibility residuals</p>${residuals}</section>
    </div>
    <details class="continuity-provenance" open><summary>Implementation provenance · ${model.provenance.donor_sources.length} donor source${model.provenance.donor_sources.length === 1 ? '' : 's'}</summary>
      ${donors}
      <p class="muted">${model.provenance.unresolved_external_receipt_edges} explicit cross-ledger receipt link${model.provenance.unresolved_external_receipt_edges === 1 ? '' : 's'} remain unresolved here rather than being invented.</p>
    </details>
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#continuity-evidence-style')) return;
  const style = document.createElement('style');
  style.id = 'continuity-evidence-style';
  style.textContent = `
    .continuity-evidence-view{margin-top:1rem}.continuity-summary{display:grid;text-align:center;align-self:start}.continuity-summary b{font-size:1.5rem}.continuity-summary span{font-size:.72rem;opacity:.7;text-transform:uppercase;letter-spacing:.08em}.continuity-evidence-grid{align-items:start;margin-top:1rem}.continuity-recognition-card,.continuity-residual-card{margin:.7rem 0;padding:1rem;border:1px solid color-mix(in srgb,var(--green) 28%,transparent);border-radius:14px;background:color-mix(in srgb,var(--panel-solid) 92%,transparent)}.continuity-residual-card{border-color:color-mix(in srgb,var(--gold) 28%,transparent)}.continuity-card-head{display:flex;justify-content:space-between;gap:1rem;align-items:start}.continuity-card-head h3{margin:.1rem 0}.continuity-card-head>strong{font-size:1.35rem}.continuity-layer-list{list-style:none;margin:.75rem 0;padding:0;display:grid;gap:.4rem}.continuity-layer{padding:.55rem .65rem;border-radius:9px;border:1px solid color-mix(in srgb,var(--green) 18%,transparent)}.continuity-layer.no-evidence{border-style:dashed;opacity:.72}.continuity-layer>div{display:flex;justify-content:space-between;gap:1rem}.continuity-layer small{display:block;margin-top:.2rem;opacity:.65;word-break:break-word}.continuity-donor-list code,.continuity-evidence-view details code{word-break:break-all}.continuity-donor-list li{margin:.55rem 0}
  `;
  document.head.appendChild(style);
}

async function syncEmbeddedEvidence(state, ledger) {
  const harvest = harvestEmbeddedContinuityEvidence(state, ledger);
  if (harvest.added > 0) {
    await persistContinuityEvidenceLedger(ledger, {
      reason: 'continuity-evidence-harvest',
      harvested_receipts: harvest.added,
    });
  }
  return harvest.added;
}

async function renderPanel(message = '') {
  const state = await loadState();
  const world = activeWorld(state);
  if (!world) return '';
  const ledger = ensureContinuityEvidenceLedger(state);
  if (!syncing) {
    syncing = true;
    try { await syncEmbeddedEvidence(state, ledger); } finally { syncing = false; }
  }
  const glyphLedger = ensureGlyphContinuityLedger(state);
  const canCompareGlyphs = worldGlyphEntries(glyphLedger, world.id).length >= 2;
  const model = buildContinuityEvidenceViewModel(ledger, { worldId: world.id });
  return render(model, { canCompareGlyphs, message });
}

async function replacePanel(message = '') {
  if (!isDeepObserverActive()) return;
  const main = document.querySelector('main.content');
  if (!main) return;
  const html = await renderPanel(message);
  const existing = document.querySelector('[data-continuity-evidence-view]');
  if (existing) existing.outerHTML = html;
  else main.insertAdjacentHTML('beforeend', html);
}

async function mount() {
  if (mounting || !isDeepObserverActive() || document.querySelector('[data-continuity-evidence-view]')) return;
  mounting = true;
  try {
    injectStyle();
    await replacePanel();
  } catch (error) {
    console.warn('Continuity View could not mount:', error);
  } finally {
    mounting = false;
  }
}

function queueRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void replacePanel();
  }, 90);
}

async function receiptLatestGlyphCorrespondence(button) {
  button.disabled = true;
  try {
    const state = await loadState();
    const world = activeWorld(state);
    if (!world) throw new Error('No active world is available.');
    const glyphLedger = ensureGlyphContinuityLedger(state);
    const pair = worldGlyphEntries(glyphLedger, world.id).slice(-2);
    if (pair.length < 2) throw new Error('Two receipted Glyph heartbeats are required.');
    const left = pair[0].heartbeat.signature;
    const right = pair[1].heartbeat.signature;
    const semanticScore = Math.max(0, 1 - semanticStateDistance(left, right));
    const receipt = await createRecognitionCorrespondence({
      subject: { id: world.id, label: world.name },
      leftIndex: { id: left.signature_id || left.fingerprint, label: pair[0].heartbeat.observed_at || 'Earlier heartbeat' },
      rightIndex: { id: right.signature_id || right.fingerprint, label: pair[1].heartbeat.observed_at || 'Later heartbeat' },
      leftGlyph: left,
      rightGlyph: right,
      continuityLayers: {
        implementation: {
          score: left.schema === right.schema ? 1 : 0,
          evidence_ids: [left.signature_id || left.fingerprint, right.signature_id || right.fingerprint],
          evidence_class: 'glyph-signature-schema-correspondence',
          representation_status: 'implementation-evidence',
        },
        stored_state: {
          score: semanticScore,
          evidence_ids: [left.source?.receipt_id, right.source?.receipt_id].filter(Boolean),
          evidence_class: 'premaqc-semantic-correspondence',
          representation_status: 'operational-proxy',
        },
        behaviour_voice: null,
        relational_invariants: null,
        structural_closure_evidence: null,
      },
      generatedAt: pair[1].heartbeat.observed_at || pair[1].heartbeat.created_at || new Date().toISOString(),
    });
    const ledger = ensureContinuityEvidenceLedger(state);
    appendContinuityEvidence(ledger, {
      receipt,
      worldId: world.id,
      subjectId: world.id,
      origin: {
        organ: 'glyph-continuity',
        left_heartbeat_id: pair[0].heartbeat.heartbeat_id || null,
        right_heartbeat_id: pair[1].heartbeat.heartbeat_id || null,
      },
    });
    await persistContinuityEvidenceLedger(ledger, {
      reason: 'glyph-recognition-correspondence',
      correspondence_id: receipt.correspondence_id,
    });
    await replacePanel(`Recognition receipted as ${receipt.correspondence_id}. Structural closure remains unfilled unless separately evidenced.`);
  } catch (error) {
    await replacePanel(`Recognition stopped: ${error.message}`);
  } finally {
    button.disabled = false;
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-continuity-receipt-glyph]');
  if (button) void receiptLatestGlyphCorrespondence(button);
});

for (const eventName of [
  REACTION_STATE_UPDATED_EVENT,
  GLYPH_CONTINUITY_UPDATED_EVENT,
  CONTINUITY_EVIDENCE_UPDATED_EVENT,
  'arcsweep:receipts-updated',
]) {
  globalThis.addEventListener?.(eventName, queueRefresh);
}

const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
