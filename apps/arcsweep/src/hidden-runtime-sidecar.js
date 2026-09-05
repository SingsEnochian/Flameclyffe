import {
  HIDDEN_RUNTIME_SCHEMA,
  HIDDEN_RUNTIME_MODELS,
  compareHypotheses,
  createHiddenRuntimePacket,
  createResidualRecord,
  normaliseEvidence,
} from './hidden-runtime-hypothesis.js';

const STORAGE_KEY = 'arcsweep.hidden-runtime.v1';
const UPDATED_EVENT = 'arcsweep:hidden-runtime-updated';
let mounting = false;

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function active() {
  return Boolean(document.querySelector('.nav-button.active[data-room="deep-observer"], [data-room-id="deep-observer"]'));
}

function emptyState() {
  return { schema: HIDDEN_RUNTIME_SCHEMA, evidence: [], residuals: [], updated_at: null };
}

function readState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return emptyState();
    return {
      schema: HIDDEN_RUNTIME_SCHEMA,
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      residuals: Array.isArray(parsed.residuals) ? parsed.residuals : [],
      updated_at: parsed.updated_at || null,
    };
  } catch {
    return emptyState();
  }
}

function writeState(state) {
  const next = { ...state, schema: HIDDEN_RUNTIME_SCHEMA, updated_at: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  globalThis.dispatchEvent?.(new CustomEvent(UPDATED_EVENT, { detail: next }));
  return next;
}

function scoreLabel(score) {
  if (score >= 0.55) return 'currently supported';
  if (score >= 0.15) return 'leans supportive';
  if (score <= -0.55) return 'currently contradicted';
  if (score <= -0.15) return 'leans contradictory';
  return 'undetermined';
}

function modelCard(result) {
  const { model, score, evidence_count: evidenceCount } = result;
  const scorePct = Math.round(score * 100);
  return `<article class="hidden-runtime-model" data-hidden-runtime-model="${esc(model.id)}">
    <div class="hidden-runtime-model-head">
      <div><p class="eyebrow">${esc(model.family)}</p><h3>${esc(model.label)}</h3></div>
      <strong title="Evidence balance from -100 to +100">${scorePct > 0 ? '+' : ''}${scorePct}</strong>
    </div>
    <p>${esc(model.description)}</p>
    <p class="muted"><b>${esc(scoreLabel(score))}</b> · ${evidenceCount} entered evidence item${evidenceCount === 1 ? '' : 's'}</p>
    <details><summary>Predicted signatures</summary><ul>${model.predicted_signatures.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></details>
    <details><summary>Falsifiers</summary><ul>${model.falsifiers.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></details>
  </article>`;
}

function evidenceRows(evidence) {
  const rows = evidence.slice(-8).reverse();
  if (!rows.length) return '<p class="muted">No evidence entries yet.</p>';
  return `<div class="hidden-runtime-ledger">${rows.map((item) => {
    const model = HIDDEN_RUNTIME_MODELS.find((candidate) => candidate.id === item.model_id);
    return `<article><b>${esc(model?.label || item.model_id)}</b><span>${esc(item.direction)} · q=${Number(item.quality).toFixed(2)}</span><p>${esc(item.note || 'No note')}</p></article>`;
  }).join('')}</div>`;
}

function residualRows(residuals) {
  const rows = residuals.slice(-8).reverse();
  if (!rows.length) return '<p class="muted">No residuals recorded yet.</p>';
  return `<div class="hidden-runtime-ledger">${rows.map((item) => {
    const sigma = item.standardised_residual == null ? '' : ` · ${Number(item.standardised_residual).toFixed(2)}σ`;
    return `<article><b>${esc(item.label)}</b><span>Δ ${Number(item.residual).toFixed(4)} ${esc(item.unit || '')}${esc(sigma)}</span><p>${esc(item.context || 'No context')}</p></article>`;
  }).join('')}</div>`;
}

function render(message = '') {
  const state = readState();
  const rankings = compareHypotheses(state.evidence);
  return `<section class="panel hidden-runtime-bench" data-hidden-runtime-bench>
    <div class="section-heading compact-heading">
      <div><p class="eyebrow">DEEP/Observer · latent structure laboratory</p><h2>Hidden Runtime</h2><p class="muted">Compare particle, field, hidden-sector, gravity, emergent-spacetime, and computational-substrate models against the same receipts. Predictions and falsifiers stay attached to each model.</p></div>
      <div class="hidden-runtime-summary"><b>${state.evidence.length}</b><span>evidence</span><b>${state.residuals.length}</b><span>residuals</span></div>
    </div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <div class="hidden-runtime-model-grid">${rankings.map(modelCard).join('')}</div>
    <div class="hidden-runtime-form-grid">
      <form class="hidden-runtime-form" data-hidden-runtime-evidence-form>
        <h3>Add evidence</h3>
        <label>Model<select name="model_id">${HIDDEN_RUNTIME_MODELS.map((model) => `<option value="${esc(model.id)}">${esc(model.label)}</option>`).join('')}</select></label>
        <label>Direction<select name="direction"><option value="supports">Supports</option><option value="contradicts">Contradicts</option><option value="neutral">Neutral</option></select></label>
        <label>Evidence quality<input name="quality" type="number" min="0" max="1" step="0.05" value="0.5"></label>
        <label>Observation / receipt<textarea name="note" rows="3" required placeholder="What was observed before interpretation?"></textarea></label>
        <label>Source / provenance<input name="source" placeholder="paper, detector, data file, experiment…"></label>
        <button type="submit">Add evidence</button>
      </form>
      <form class="hidden-runtime-form" data-hidden-runtime-residual-form>
        <h3>Add residual</h3>
        <label>Label<input name="label" required placeholder="Observed minus predicted"></label>
        <label>Observed<input name="observed" type="number" step="any" required></label>
        <label>Predicted<input name="predicted" type="number" step="any" required></label>
        <label>Uncertainty σ<input name="uncertainty" type="number" min="0" step="any" placeholder="optional"></label>
        <label>Unit<input name="unit" placeholder="keV, km/s, dimensionless…"></label>
        <label>Context<textarea name="context" rows="3" placeholder="Instrument, window, model version, conditions…"></textarea></label>
        <button type="submit">Add residual</button>
      </form>
    </div>
    <div class="hidden-runtime-ledger-grid"><section><h3>Recent evidence</h3>${evidenceRows(state.evidence)}</section><section><h3>Recent residuals</h3>${residualRows(state.residuals)}</section></div>
    <div class="button-row"><button type="button" class="quiet" data-hidden-runtime-export>Export Hidden Runtime packet</button><button type="button" class="quiet" data-hidden-runtime-clear>Clear local bench</button></div>
    <p class="muted">Score = quality-weighted entered support minus contradiction for each model. It is a comparison surface, not an ontology verdict. The useful signal is whether a model predicts new observations and survives held-out data.</p>
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#hidden-runtime-style')) return;
  const style = document.createElement('style');
  style.id = 'hidden-runtime-style';
  style.textContent = `
    .hidden-runtime-bench{margin-top:1rem}.hidden-runtime-summary{display:grid;grid-template-columns:auto auto;gap:.15rem .5rem;align-items:baseline;text-align:right}.hidden-runtime-summary b{font-size:1.25rem}.hidden-runtime-summary span{font-size:.75rem;opacity:.72;text-transform:uppercase;letter-spacing:.08em}
    .hidden-runtime-model-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:.8rem;margin:1rem 0}.hidden-runtime-model{padding:1rem;border:1px solid color-mix(in srgb,var(--gold) 24%,transparent);border-radius:14px;background:color-mix(in srgb,var(--panel) 92%,transparent)}.hidden-runtime-model-head{display:flex;justify-content:space-between;gap:1rem}.hidden-runtime-model-head strong{font-size:1.35rem}.hidden-runtime-model details{margin-top:.55rem}.hidden-runtime-model li{margin:.35rem 0}
    .hidden-runtime-form-grid,.hidden-runtime-ledger-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin:1rem 0}.hidden-runtime-form{display:grid;gap:.65rem;padding:1rem;border:1px solid color-mix(in srgb,var(--gold) 18%,transparent);border-radius:14px}.hidden-runtime-form label{display:grid;gap:.25rem}.hidden-runtime-form input,.hidden-runtime-form select,.hidden-runtime-form textarea{width:100%;box-sizing:border-box}.hidden-runtime-ledger{display:grid;gap:.55rem}.hidden-runtime-ledger article{padding:.7rem .8rem;border-left:2px solid color-mix(in srgb,var(--gold) 48%,transparent);background:color-mix(in srgb,var(--panel) 94%,transparent)}.hidden-runtime-ledger article span{display:block;font-size:.78rem;opacity:.72;margin:.15rem 0}.hidden-runtime-ledger article p{margin:.2rem 0 0}
  `;
  document.head.appendChild(style);
}

async function mount(message = '') {
  if (mounting || !active()) return;
  mounting = true;
  try {
    injectStyle();
    const html = render(message);
    const existing = document.querySelector('[data-hidden-runtime-bench]');
    if (existing) existing.outerHTML = html;
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', html);
  } finally {
    mounting = false;
  }
}

function addEvidence(form) {
  const data = new FormData(form);
  const item = normaliseEvidence({
    model_id: data.get('model_id'),
    direction: data.get('direction'),
    quality: data.get('quality'),
    note: data.get('note'),
    source: data.get('source'),
  });
  const state = readState();
  writeState({ ...state, evidence: [...state.evidence, item] });
  form.reset();
  return mount(`Added evidence for ${HIDDEN_RUNTIME_MODELS.find((model) => model.id === item.model_id)?.label || item.model_id}.`);
}

function addResidual(form) {
  const data = new FormData(form);
  const residual = createResidualRecord({
    label: data.get('label'),
    observed: data.get('observed'),
    predicted: data.get('predicted'),
    uncertainty: data.get('uncertainty'),
    unit: data.get('unit'),
    context: data.get('context'),
  });
  const state = readState();
  writeState({ ...state, residuals: [...state.residuals, residual] });
  form.reset();
  return mount(`Recorded residual ${residual.label}: Δ ${residual.residual}${residual.unit ? ` ${residual.unit}` : ''}.`);
}

function exportPacket() {
  const state = readState();
  const packet = createHiddenRuntimePacket({ evidence: state.evidence, residuals: state.residuals });
  const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hidden-runtime-${new Date().toISOString().replaceAll(':', '-')}.json`;
  link.click();
  URL.revokeObjectURL(url);
  return mount('Exported Hidden Runtime comparison packet with models, evidence, residuals, predictions, falsifiers, and rankings.');
}

document.addEventListener('submit', (event) => {
  const evidenceForm = event.target.closest?.('[data-hidden-runtime-evidence-form]');
  if (evidenceForm) {
    event.preventDefault();
    try { void addEvidence(evidenceForm); } catch (error) { void mount(`Evidence entry stopped: ${error.message}`); }
    return;
  }
  const residualForm = event.target.closest?.('[data-hidden-runtime-residual-form]');
  if (residualForm) {
    event.preventDefault();
    try { void addResidual(residualForm); } catch (error) { void mount(`Residual entry stopped: ${error.message}`); }
  }
});

document.addEventListener('click', (event) => {
  if (event.target.closest?.('[data-hidden-runtime-export]')) void exportPacket();
  if (event.target.closest?.('[data-hidden-runtime-clear]')) {
    localStorage.removeItem(STORAGE_KEY);
    globalThis.dispatchEvent?.(new CustomEvent(UPDATED_EVENT, { detail: emptyState() }));
    void mount('Hidden Runtime local bench cleared. Model definitions remain intact.');
  }
});

globalThis.addEventListener?.(UPDATED_EVENT, () => { void mount(); });
const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
