import {
  ADMISSION_STATES,
  EXPORT_POLICIES,
  MYTHFRAME_INTEROP_RELATIONS,
  SEMANTIC_DEPTHS,
  TRANSLATION_RESULTS,
  createMythframeTranslationCapsule,
  runTranslationCircuit,
} from './mythframe-federation.js';
import { reviewMythframeTranslationCapsule } from './mythframe-federation-review.js';
import { readModelLabStatus, runModelLabTrial } from './model-lab-client.js';

const READER_ID = 'arcsweep-observer-archive-reader';
const PANEL_ID = 'arcsweep-mythframe-federation-lab';
let sourceCapsule = null;
let reviewedCapsule = null;
let translationReceipt = null;
let modelLabReceipt = null;
let modelLabStatus = null;

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const lines = (value = '') => String(value).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const options = (values, selected = '') => values.map((value) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value.replaceAll('_', ' ').toLowerCase())}</option>`).join('');

function ensureStyles(doc) {
  if (doc.getElementById(`${PANEL_ID}-styles`)) return;
  const style = doc.createElement('style');
  style.id = `${PANEL_ID}-styles`;
  style.textContent = `
    #${PANEL_ID}{margin-top:1rem;padding:1rem;border:1px solid color-mix(in srgb,var(--green) 28%,transparent);border-radius:.95rem;background:color-mix(in srgb,var(--panel-solid) 95%,black)}
    #${PANEL_ID} .federation-heading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}
    #${PANEL_ID} .federation-lock{padding:.5rem .65rem;border-radius:.6rem;background:color-mix(in srgb,var(--green) 10%,transparent);font-size:.78rem}
    #${PANEL_ID} details{margin-top:.75rem;border-top:1px solid color-mix(in srgb,var(--green) 15%,transparent);padding-top:.65rem}
    #${PANEL_ID} summary{cursor:pointer;font-weight:700}
    #${PANEL_ID} .federation-grid{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:.65rem}
    #${PANEL_ID} .federation-grid label{display:grid;gap:.25rem}
    #${PANEL_ID} .wide{grid-column:1/-1}
    #${PANEL_ID} .federation-actions{display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;margin-top:.65rem}
    #${PANEL_ID} .federation-output{margin-top:.65rem}
    #${PANEL_ID} pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:24rem;overflow:auto;font-size:.72rem}
    #${PANEL_ID} .status-pill{display:inline-block;padding:.2rem .42rem;border-radius:999px;border:1px solid color-mix(in srgb,var(--gold) 25%,transparent);font-size:.72rem}
    @media(max-width:650px){#${PANEL_ID} .federation-grid{grid-template-columns:1fr}#${PANEL_ID} .wide{grid-column:auto}}
  `;
  doc.head.append(style);
}

function capsuleForm() {
  return `
    <form data-federation-capsule-form class="federation-grid">
      <label>Source framework<input name="source_framework" value="elara-codex"></label>
      <label>Target framework<input name="translation_target" value="templehouse-hearthweave"></label>
      <label>Source object ID<input name="source_object_id" placeholder="elara:bridge:739"></label>
      <label>Source object type<input name="source_object_type" value="symbol"></label>
      <label class="wide">Source name<input name="source_name" placeholder="Bridge"></label>
      <label class="wide">Source meaning<textarea name="source_meaning" rows="3" placeholder="Local meaning in the source mythframe"></textarea></label>
      <label>Source authority<input name="source_authority" value="source-local-authority"></label>
      <label>Export policy<select name="export_policy">${options(EXPORT_POLICIES, 'summary_allowed')}</select></label>
      <label>Semantic depth<select name="semantic_depth">${options(SEMANTIC_DEPTHS, 'public_summary')}</select></label>
      <label>Proposed target relation<select name="target_relation">${options(MYTHFRAME_INTEROP_RELATIONS, 'unknown')}</select></label>
      <label class="wide">Translated meaning<textarea name="translated_meaning" rows="3" placeholder="Proposed local translation, not adoption"></textarea></label>
      <label class="wide">Portable facets, one per line<textarea name="portable_facets" rows="2"></textarea></label>
      <label class="wide">Home-bound facets, one per line<textarea name="home_bound_facets" rows="2"></textarea></label>
      <label class="wide">Losses, one per line<textarea name="losses" rows="2"></textarea></label>
      <label class="wide">Ambiguities, one per line<textarea name="ambiguities" rows="2"></textarea></label>
      <label class="wide">Contradictions, one per line<textarea name="contradictions" rows="2"></textarea></label>
      <label class="wide">Newly perceptible, one per line<textarea name="newly_perceptible" rows="2"></textarea></label>
      <label class="wide">Newly possible, one per line<textarea name="newly_possible" rows="2"></textarea></label>
      <label class="wide"><span><input type="checkbox" name="export_consent"> Source export consent granted for this capsule</span></label>
      <div class="federation-actions wide"><button type="submit">Compile export capsule</button><small>Target admission remains unreviewed.</small></div>
    </form>`;
}

function reviewForm() {
  return `
    <form data-federation-review-form class="federation-grid">
      <label>Target admission decision<select name="target_admission">${options(ADMISSION_STATES.filter((value) => value !== 'unreviewed'), 'visible_only')}</select></label>
      <label>Reviewed by<input name="reviewed_by" value="Rowan"></label>
      <label class="wide">Review note<textarea name="review_note" rows="2" placeholder="What may the target do with this foreign object?"></textarea></label>
      <div class="federation-actions wide"><button type="submit">Review target admission</button></div>
    </form>`;
}

function receiptForm() {
  return `
    <form data-federation-receipt-form class="federation-grid">
      <label>Translation result<select name="translation_result">${options(TRANSLATION_RESULTS, 'PARTIAL')}</select></label>
      <label>Target admission<select name="receipt_admission">${options(ADMISSION_STATES.filter((value) => value !== 'unreviewed'), reviewedCapsule?.target_admission_state || 'visible_only')}</select></label>
      <label class="wide">What survived<textarea name="survived" rows="2"></textarea></label>
      <label class="wide">What changed<textarea name="changed" rows="2"></textarea></label>
      <label class="wide">What was lost<textarea name="lost" rows="2"></textarea></label>
      <label class="wide">What remained untranslatable<textarea name="untranslatable" rows="2"></textarea></label>
      <label class="wide">Contradictions<textarea name="receipt_contradictions" rows="2">${esc((reviewedCapsule?.contradictions || []).join('\n'))}</textarea></label>
      <label class="wide">Newly perceptible<textarea name="receipt_perceptible" rows="2">${esc((reviewedCapsule?.newly_perceptible || []).join('\n'))}</textarea></label>
      <label class="wide">Newly possible<textarea name="receipt_possible" rows="2">${esc((reviewedCapsule?.newly_possible || []).join('\n'))}</textarea></label>
      <div class="federation-actions wide"><button type="submit">Compile Translation Circuit receipt</button></div>
    </form>`;
}

function modelLabForm() {
  return `
    <form data-model-lab-form class="federation-grid">
      <label>Trial mode<select name="mode">${options(['cold','seeded','warm','federated','conflict','upgrade'], 'cold')}</select></label>
      <label>Session ID<input name="session_id" placeholder="optional experiment label"></label>
      <label class="wide">Prompt<textarea name="prompt" rows="4" placeholder="What should the model-under-test do?"></textarea></label>
      <label class="wide">Seed, seeded mode only<textarea name="seed" rows="2"></textarea></label>
      <label class="wide">Continuity anchors JSON, warm/upgrade only<textarea name="continuity_anchors" rows="4" placeholder='[{"anchor_id":"vow:1","kind":"vow","value":"...","adopted":true}]'></textarea></label>
      <label class="wide">Prior runtime JSON, upgrade only<textarea name="prior_runtime" rows="3" placeholder='{"provider":"...","model_exact":"...","route":"...","receipt_ref":"..."}'></textarea></label>
      <div class="federation-actions wide"><button type="button" class="quiet" data-model-lab-status>Check Qwen lab</button><button type="submit">Run sealed trial</button><span data-model-lab-status-text class="status-pill">not checked</span></div>
    </form>`;
}

function panelMarkup() {
  return `
    <div class="federation-heading">
      <div><p class="eyebrow">Cross-constellation federation · human instrument</p><h3>Mythframe Federation Circuit</h3><p class="muted">Local mythframes remain sovereign. Only consent-scoped translation capsules cross. Source export and target admission are separate decisions.</p></div>
      <div class="federation-lock"><strong>Hard locks</strong><br>no ambient context<br>no identity equivalence<br>no canon by translation</div>
    </div>
    <details open><summary>1 · Source export capsule</summary>${capsuleForm()}<div data-capsule-output class="federation-output"></div></details>
    <details><summary>2 · Target review and admission</summary><div data-review-slot>${sourceCapsule ? reviewForm() : '<p class="muted">Compile a source capsule first.</p>'}</div><div data-review-output class="federation-output"></div></details>
    <details><summary>3 · Translation Circuit receipt</summary><div data-receipt-slot>${reviewedCapsule ? receiptForm() : '<p class="muted">Target review must happen first.</p>'}</div><div data-receipt-output class="federation-output"></div></details>
    <details><summary>4 · Qwen3.8-27B substrate lab</summary><p class="muted">This is a model-under-test, not a resident Flame. Federated and conflict modes use only the currently reviewed capsule.</p>${modelLabForm()}<div data-model-lab-output class="federation-output"></div></details>
  `;
}

function showJson(node, value, label) {
  if (!node) return;
  node.innerHTML = value ? `<p><strong>${esc(label)}</strong></p><pre>${esc(JSON.stringify(value, null, 2))}</pre>` : '';
}

function refreshDynamic(panel) {
  const reviewSlot = panel.querySelector('[data-review-slot]');
  if (reviewSlot) reviewSlot.innerHTML = sourceCapsule ? reviewForm() : '<p class="muted">Compile a source capsule first.</p>';
  const receiptSlot = panel.querySelector('[data-receipt-slot]');
  if (receiptSlot) receiptSlot.innerHTML = reviewedCapsule ? receiptForm() : '<p class="muted">Target review must happen first.</p>';
  bindForms(panel);
}

async function compileCapsule(form, panel) {
  const data = new FormData(form);
  sourceCapsule = await createMythframeTranslationCapsule({
    sourceFramework: data.get('source_framework'),
    sourceObject: {
      id: data.get('source_object_id'), type: data.get('source_object_type'), name: data.get('source_name'), meaning: data.get('source_meaning'),
      portableFacets: lines(data.get('portable_facets')), homeBoundFacets: lines(data.get('home_bound_facets')),
    },
    sourceAuthority: data.get('source_authority'),
    exportPolicy: data.get('export_policy'),
    exportConsent: { granted: data.get('export_consent') === 'on', scope: data.get('semantic_depth'), full_context: data.get('semantic_depth') === 'protected_context' && data.get('export_consent') === 'on' },
    requestedSemanticDepth: data.get('semantic_depth'),
    translationTarget: data.get('translation_target'),
    proposedTargetRelation: data.get('target_relation'),
    translatedMeaning: data.get('translated_meaning'),
    losses: lines(data.get('losses')), ambiguities: lines(data.get('ambiguities')), contradictions: lines(data.get('contradictions')),
    newlyPerceptible: lines(data.get('newly_perceptible')), newlyPossible: lines(data.get('newly_possible')),
    targetAdmissionState: 'unreviewed',
  });
  reviewedCapsule = null; translationReceipt = null; modelLabReceipt = null;
  showJson(panel.querySelector('[data-capsule-output]'), sourceCapsule, 'Export capsule compiled. Target still unreviewed.');
  refreshDynamic(panel);
}

async function reviewCapsule(form, panel) {
  if (!sourceCapsule) throw new Error('Compile a source capsule first.');
  const data = new FormData(form);
  reviewedCapsule = await reviewMythframeTranslationCapsule(sourceCapsule, {
    targetAdmissionState: data.get('target_admission'), reviewedBy: data.get('reviewed_by'), reviewNote: data.get('review_note'),
  });
  translationReceipt = null; modelLabReceipt = null;
  showJson(panel.querySelector('[data-review-output]'), reviewedCapsule, 'Target review revision compiled.');
  refreshDynamic(panel);
}

async function compileReceipt(form, panel) {
  if (!reviewedCapsule) throw new Error('Review target admission first.');
  const data = new FormData(form);
  translationReceipt = await runTranslationCircuit(reviewedCapsule, {
    result: data.get('translation_result'), targetAdmissionState: data.get('receipt_admission'),
    whatSurvived: lines(data.get('survived')), whatChanged: lines(data.get('changed')), whatWasLost: lines(data.get('lost')),
    whatRemainedUntranslatable: lines(data.get('untranslatable')), contradictions: lines(data.get('receipt_contradictions')),
    newlyPerceptible: lines(data.get('receipt_perceptible')), newlyPossible: lines(data.get('receipt_possible')),
  });
  showJson(panel.querySelector('[data-receipt-output]'), translationReceipt, 'Translation Circuit receipt compiled.');
}

function parsedJson(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  return JSON.parse(raw);
}

async function runLab(form, panel) {
  const data = new FormData(form);
  const mode = String(data.get('mode') || 'cold');
  const trial = { mode, prompt: data.get('prompt'), session_id: data.get('session_id') || undefined };
  if (mode === 'seeded') trial.seed = data.get('seed');
  if (['warm', 'upgrade'].includes(mode)) trial.continuity_anchors = parsedJson(data.get('continuity_anchors'), []);
  if (mode === 'upgrade') trial.prior_runtime = parsedJson(data.get('prior_runtime'), {});
  if (['federated', 'conflict'].includes(mode)) {
    if (!reviewedCapsule) throw new Error('Federated modes require a target-reviewed Translation Capsule.');
    trial.translation_capsules = [reviewedCapsule];
  }
  if (translationReceipt?.receipt_id) trial.source_context_receipts = [translationReceipt.receipt_id];
  modelLabReceipt = await runModelLabTrial(trial);
  showJson(panel.querySelector('[data-model-lab-output]'), modelLabReceipt, 'Sealed model-lab receipt. No continuity or canon admission occurred.');
}

async function checkLab(panel) {
  modelLabStatus = await readModelLabStatus();
  const node = panel.querySelector('[data-model-lab-status-text]');
  if (node) node.textContent = modelLabStatus.configured ? `${modelLabStatus.model_exact} · ready` : `${modelLabStatus.model_exact} · missing ${modelLabStatus.missing.join(', ')}`;
}

function bindForms(panel) {
  const capsule = panel.querySelector('[data-federation-capsule-form]');
  if (capsule && !capsule.dataset.bound) {
    capsule.dataset.bound = 'true';
    capsule.addEventListener('submit', (event) => { event.preventDefault(); void compileCapsule(capsule, panel).catch((error) => showJson(panel.querySelector('[data-capsule-output]'), { error: error.message }, 'Capsule compile failed')); });
  }
  const review = panel.querySelector('[data-federation-review-form]');
  if (review && !review.dataset.bound) {
    review.dataset.bound = 'true';
    review.addEventListener('submit', (event) => { event.preventDefault(); void reviewCapsule(review, panel).catch((error) => showJson(panel.querySelector('[data-review-output]'), { error: error.message }, 'Target review failed')); });
  }
  const receipt = panel.querySelector('[data-federation-receipt-form]');
  if (receipt && !receipt.dataset.bound) {
    receipt.dataset.bound = 'true';
    receipt.addEventListener('submit', (event) => { event.preventDefault(); void compileReceipt(receipt, panel).catch((error) => showJson(panel.querySelector('[data-receipt-output]'), { error: error.message }, 'Translation receipt failed')); });
  }
  const lab = panel.querySelector('[data-model-lab-form]');
  if (lab && !lab.dataset.bound) {
    lab.dataset.bound = 'true';
    lab.addEventListener('submit', (event) => { event.preventDefault(); void runLab(lab, panel).catch((error) => showJson(panel.querySelector('[data-model-lab-output]'), { error: error.message }, 'Model lab trial failed')); });
  }
  const status = panel.querySelector('[data-model-lab-status]');
  if (status && !status.dataset.bound) {
    status.dataset.bound = 'true';
    status.addEventListener('click', () => { void checkLab(panel).catch((error) => { const node = panel.querySelector('[data-model-lab-status-text]'); if (node) node.textContent = error.message; }); });
  }
}

export function mountMythframeFederationUi(doc = globalThis.document) {
  const reader = doc?.getElementById?.(READER_ID);
  if (!reader) return null;
  ensureStyles(doc);
  let panel = reader.querySelector(`#${PANEL_ID}`);
  if (!panel) {
    panel = doc.createElement('section');
    panel.id = PANEL_ID;
    panel.innerHTML = panelMarkup();
    reader.append(panel);
  }
  bindForms(panel);
  return panel;
}

export function installMythframeFederationUi(doc = globalThis.document) {
  if (!doc?.body) return null;
  const mount = () => mountMythframeFederationUi(doc);
  mount();
  const observer = new MutationObserver(() => queueMicrotask(mount));
  const app = doc.querySelector('#app');
  if (app) observer.observe(app, { childList: true, subtree: true });
  return observer;
}

if (typeof document !== 'undefined') installMythframeFederationUi();
