import {
  DEFAULT_OBSERVER_OUTPUT_CLAIM_CLASSES,
  OBSERVER_CLAIM_CLASSES,
  OBSERVER_COMPARISON_MODES,
  OBSERVER_CONTROL_POLICIES,
  createObserverComparisonAsk,
} from './observer-comparison-ask.js';

const READER_ID = 'arcsweep-observer-archive-reader';
const PANEL_ID = 'arcsweep-observer-comparison-ask';
const selected = new Set();
let activeQueryId = null;
let compiledAsk = null;

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

function receiptFromReader(reader) {
  const receipt = reader.querySelector('.observer-query-receipt');
  const summary = receipt?.querySelector('summary')?.textContent || '';
  const raw = receipt?.querySelector('pre')?.textContent || '';
  const queryId = summary.split('·').slice(1).join('·').trim();
  if (!queryId || !raw) return null;
  try {
    const projection = JSON.parse(raw);
    const resultRefs = Array.isArray(projection.result_refs) ? projection.result_refs : [];
    return {
      schema: 'hearthgate.observer-query-receipt/v1',
      query_id: queryId,
      requested_at: projection.requested_at,
      executed_at: projection.executed_at,
      source_table: 'deep_observer_events',
      source_schema: 'public',
      retrieval_mode: 'index',
      exact_filters: projection.filters || {},
      chronology_cutoff: projection.chronology_cutoff,
      result_refs: resultRefs,
      result_count: resultRefs.length,
      page: projection.page || {},
    };
  } catch {
    return null;
  }
}

function ensureStyles(doc) {
  if (doc.getElementById(`${PANEL_ID}-styles`)) return;
  const style = doc.createElement('style');
  style.id = `${PANEL_ID}-styles`;
  style.textContent = `
    #${READER_ID} .observer-compare-picker{display:flex;gap:.35rem;align-items:center;margin:.55rem 0 .15rem;font-size:.8rem}
    #${PANEL_ID}{margin-top:1rem;padding:1rem;border:1px solid color-mix(in srgb,var(--gold) 32%,transparent);border-radius:.9rem;background:color-mix(in srgb,var(--panel-solid) 94%,black)}
    #${PANEL_ID} .observer-ask-heading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}
    #${PANEL_ID} .observer-ask-grid{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:.75rem}
    #${PANEL_ID} .observer-ask-grid label{display:grid;gap:.25rem}
    #${PANEL_ID} .observer-ask-wide{grid-column:1/-1}
    #${PANEL_ID} .observer-claim-grid{display:flex;flex-wrap:wrap;gap:.45rem}
    #${PANEL_ID} .observer-claim-grid label{display:flex;gap:.25rem;align-items:center;padding:.3rem .45rem;border:1px solid color-mix(in srgb,var(--green) 20%,transparent);border-radius:.55rem}
    #${PANEL_ID} .observer-ask-output{margin-top:.8rem}
    #${PANEL_ID} .observer-ask-output pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:28rem;overflow:auto;font-size:.76rem}
    #${PANEL_ID} .observer-ask-lock{padding:.45rem .6rem;border-radius:.55rem;background:color-mix(in srgb,var(--gold) 10%,transparent);font-size:.78rem}
    #${PANEL_ID} .observer-ask-actions{display:flex;gap:.45rem;flex-wrap:wrap;align-items:center;margin-top:.65rem}
    @media(max-width:650px){#${PANEL_ID} .observer-ask-grid{grid-template-columns:1fr}#${PANEL_ID} .observer-ask-wide{grid-column:auto}}
  `;
  doc.head.append(style);
}

function claimClassMarkup() {
  return OBSERVER_CLAIM_CLASSES.map((claim) => `<label><input type="checkbox" name="claim_class" value="${esc(claim)}" ${DEFAULT_OBSERVER_OUTPUT_CLAIM_CLASSES.includes(claim) ? 'checked' : ''}>${esc(claim.replaceAll('_', ' '))}</label>`).join('');
}

function panelMarkup() {
  return `
    <div class="observer-ask-heading">
      <div><p class="eyebrow">Comparison instrument · human compile</p><h3>Compile comparison Ask</h3><p class="muted">Select receipted evidence above, state the question, then compile a bounded Ask. This step does not call a model.</p></div>
      <div class="observer-ask-lock"><strong>Authority lock</strong><br>continuity_effect: none</div>
    </div>
    <form data-observer-ask-form class="observer-ask-grid">
      <label class="observer-ask-wide">Question<textarea name="question" rows="4" placeholder="What relationships, differences, or patterns should be examined across the selected evidence?"></textarea></label>
      <label>Comparison mode<select name="comparison_mode">${OBSERVER_COMPARISON_MODES.map((value) => `<option value="${esc(value)}" ${value === 'pattern' ? 'selected' : ''}>${esc(value.replaceAll('-', ' '))}</option>`).join('')}</select></label>
      <label>Control policy<select name="control_policy">${OBSERVER_CONTROL_POLICIES.map((value) => `<option value="${esc(value)}">${esc(value.replaceAll('-', ' '))}</option>`).join('')}</select></label>
      <fieldset class="observer-ask-wide"><legend>Allowed output claim classes</legend><div class="observer-claim-grid">${claimClassMarkup()}</div></fieldset>
      <label class="observer-ask-wide">Notes<textarea name="notes" rows="2" placeholder="Optional scope notes. These remain part of the Ask receipt."></textarea></label>
      <div class="observer-ask-actions observer-ask-wide"><button type="submit">Compile Ask</button><button type="button" class="quiet" data-observer-clear-selection>Clear selection</button><small data-observer-selection-count>0 selected</small></div>
    </form>
    <div class="observer-ask-output" data-observer-ask-output></div>
  `;
}

function ensurePanel(reader) {
  let panel = reader.querySelector(`#${PANEL_ID}`);
  if (panel) return panel;
  panel = reader.ownerDocument.createElement('section');
  panel.id = PANEL_ID;
  panel.innerHTML = panelMarkup();
  reader.append(panel);
  bindPanel(reader, panel);
  return panel;
}

function updateCount(panel) {
  const node = panel.querySelector('[data-observer-selection-count]');
  if (node) node.textContent = `${selected.size} selected`;
}

function syncQueryBoundary(reader, panel) {
  const receipt = receiptFromReader(reader);
  const nextId = receipt?.query_id || null;
  if (nextId !== activeQueryId) {
    activeQueryId = nextId;
    selected.clear();
    compiledAsk = null;
    const output = panel.querySelector('[data-observer-ask-output]');
    if (output) output.innerHTML = '';
  }
  return receipt;
}

function decorateCards(reader, panel) {
  const receipt = syncQueryBoundary(reader, panel);
  const allowed = new Set((receipt?.result_refs || []).map((ref) => ref.id));
  for (const id of [...selected]) if (!allowed.has(id)) selected.delete(id);
  reader.querySelectorAll('.observer-archive-card[data-observer-event-id]').forEach((card) => {
    const id = card.dataset.observerEventId;
    let picker = card.querySelector('.observer-compare-picker');
    if (!picker) {
      picker = reader.ownerDocument.createElement('label');
      picker.className = 'observer-compare-picker';
      picker.innerHTML = `<input type="checkbox" data-observer-compare-select value="${esc(id)}"><span>Select for comparison Ask</span>`;
      card.append(picker);
      picker.querySelector('input')?.addEventListener('change', (event) => {
        if (event.target.checked) selected.add(id); else selected.delete(id);
        compiledAsk = null;
        updateCount(panel);
      });
    }
    const checkbox = picker.querySelector('input');
    if (checkbox) checkbox.checked = selected.has(id);
  });
  updateCount(panel);
}

function outputMarkup(ask) {
  return `<section><p><strong>Compiled.</strong> This is a receipted question object only. No model has seen it and no relation or continuity state has changed.</p><pre>${esc(JSON.stringify(ask, null, 2))}</pre><div class="observer-ask-actions"><button type="button" class="quiet" data-observer-copy-ask>Copy Ask JSON</button><small>${esc(ask.ask_fingerprint)}</small></div></section>`;
}

async function compile(reader, panel, form) {
  const receipt = receiptFromReader(reader);
  if (!receipt) throw new Error('Run an archive search first so the Ask has a query receipt.');
  if (!selected.size) throw new Error('Select at least one receipted report first.');
  const data = new FormData(form);
  const claims = data.getAll('claim_class').map(String);
  compiledAsk = await createObserverComparisonAsk({
    question: String(data.get('question') || ''),
    queryReceipt: receipt,
    selectedEventRefs: [...selected],
    comparisonMode: String(data.get('comparison_mode') || 'pattern'),
    controlPolicy: String(data.get('control_policy') || 'none'),
    allowedOutputClaimClasses: claims,
    notes: String(data.get('notes') || ''),
    createdBy: 'Rowan',
  });
  const output = panel.querySelector('[data-observer-ask-output]');
  if (output) output.innerHTML = outputMarkup(compiledAsk);
}

function bindPanel(reader, panel) {
  panel.querySelector('[data-observer-ask-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    void compile(reader, panel, form).catch((error) => {
      const output = panel.querySelector('[data-observer-ask-output]');
      if (output) output.innerHTML = `<p class="error">${esc(error.message || 'Comparison Ask compilation failed.')}</p>`;
    });
  });
  panel.querySelector('[data-observer-clear-selection]')?.addEventListener('click', () => {
    selected.clear();
    compiledAsk = null;
    reader.querySelectorAll('[data-observer-compare-select]').forEach((input) => { input.checked = false; });
    const output = panel.querySelector('[data-observer-ask-output]');
    if (output) output.innerHTML = '';
    updateCount(panel);
  });
  panel.addEventListener('click', (event) => {
    if (!event.target.closest?.('[data-observer-copy-ask]') || !compiledAsk) return;
    void globalThis.navigator?.clipboard?.writeText?.(JSON.stringify(compiledAsk, null, 2));
  });
}

export function mountObserverComparisonAskUi(doc = globalThis.document) {
  const reader = doc?.getElementById?.(READER_ID);
  if (!reader) return null;
  ensureStyles(doc);
  const panel = ensurePanel(reader);
  decorateCards(reader, panel);
  return panel;
}

export function installObserverComparisonAskUi(doc = globalThis.document) {
  if (!doc?.body) return null;
  const mount = () => mountObserverComparisonAskUi(doc);
  mount();
  const observer = new MutationObserver(() => queueMicrotask(mount));
  const app = doc.querySelector('#app');
  if (app) observer.observe(app, { childList: true, subtree: true });
  return observer;
}

if (typeof document !== 'undefined') installObserverComparisonAskUi();
