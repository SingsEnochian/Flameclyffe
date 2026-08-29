import {
  createEffectReceipt,
  createInterpretationRevision,
} from './bridge-network.js';
import {
  readEmergenceLabStatus,
  runWildEmergenceTrial,
} from './emergence-lab-client.js';

const READER_ID = 'arcsweep-observer-archive-reader';
const PANEL_ID = 'arcsweep-bridge-network-lab';
let effectReceipt = null;
let interpretationRevision = null;
let wildReceipt = null;

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const lines = (value = '') => String(value).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);

function ensureStyles(doc) {
  if (doc.getElementById(`${PANEL_ID}-styles`)) return;
  const style = doc.createElement('style');
  style.id = `${PANEL_ID}-styles`;
  style.textContent = `
    #${PANEL_ID}{margin-top:1rem;padding:1rem;border:1px solid color-mix(in srgb,var(--gold) 25%,transparent);border-radius:.95rem;background:color-mix(in srgb,var(--panel-solid) 96%,black)}
    #${PANEL_ID} .bridge-heading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}
    #${PANEL_ID} .bridge-law{max-width:30rem;padding:.55rem .7rem;border-radius:.65rem;background:color-mix(in srgb,var(--gold) 8%,transparent);font-size:.78rem}
    #${PANEL_ID} details{margin-top:.75rem;border-top:1px solid color-mix(in srgb,var(--gold) 14%,transparent);padding-top:.65rem}
    #${PANEL_ID} summary{cursor:pointer;font-weight:700}
    #${PANEL_ID} .bridge-grid{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:.65rem}
    #${PANEL_ID} .bridge-grid label{display:grid;gap:.25rem}
    #${PANEL_ID} .wide{grid-column:1/-1}
    #${PANEL_ID} .bridge-actions{display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;margin-top:.65rem}
    #${PANEL_ID} pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:24rem;overflow:auto;font-size:.72rem}
    #${PANEL_ID} .status-pill{display:inline-block;padding:.2rem .42rem;border-radius:999px;border:1px solid color-mix(in srgb,var(--gold) 25%,transparent);font-size:.72rem}
    @media(max-width:650px){#${PANEL_ID} .bridge-grid{grid-template-columns:1fr}#${PANEL_ID} .wide{grid-column:auto}}
  `;
  doc.head.append(style);
}

function wildForm() {
  return `
    <form data-wild-form class="bridge-grid">
      <label>Session ID<input name="session_id" placeholder="optional experiment label"></label>
      <label>Orientation<input name="orientation" value="Continue from the lived scene state."></label>
      <label class="wide">World state<textarea name="world_state" rows="4" required placeholder="What exists now, without evaluator vocabulary"></textarea></label>
      <label class="wide">History, one item per line<textarea name="history" rows="3"></textarea></label>
      <label class="wide">Participants, one per line<textarea name="participants" rows="2"></textarea></label>
      <label class="wide">Participant-local knowledge, one item per line<textarea name="participant_knowledge" rows="3"></textarea></label>
      <label class="wide">Capabilities, one per line<textarea name="capabilities" rows="2"></textarea></label>
      <label class="wide">Relationships, one per line<textarea name="relationships" rows="2"></textarea></label>
      <label class="wide">Agency boundaries, one per line<textarea name="agency_boundaries" rows="2"></textarea></label>
      <label class="wide">World / consent / authority constraints, one per line<textarea name="constraints" rows="3"></textarea></label>
      <label class="wide">Reachable possibilities, one per line<textarea name="reachable_possibilities" rows="3"></textarea></label>
      <label class="wide">Memory-active context, one item per line<textarea name="memory_active_context" rows="3"></textarea></label>
      <label class="wide">Provenance refs, one per line<textarea name="provenance" rows="2"></textarea></label>
      <div class="bridge-actions wide"><button type="button" class="quiet" data-wild-status>Check WILD lane</button><button type="submit">Let the world happen</button><span data-wild-status-text class="status-pill">not checked</span></div>
    </form>`;
}

function effectForm() {
  return `
    <form data-effect-form class="bridge-grid">
      <label>Observer<input name="observer_id" value="Rowan"></label>
      <label>Context ref<input name="context_ref" placeholder="wild receipt / heartbeat / scene ref"></label>
      <label class="wide">Observed effect<textarea name="observed_effect" rows="4" required placeholder="What happened or was experienced. Preserve this before explaining why."></textarea></label>
      <label>Confidence<input name="confidence" value="reported"></label>
      <label class="wide">Provenance refs, one per line<textarea name="provenance" rows="2"></textarea></label>
      <div class="bridge-actions wide"><button type="submit">Seal Effect Receipt</button></div>
    </form>`;
}

function interpretationForm() {
  if (!effectReceipt) return '<p class="muted">Seal an Effect Receipt first. Interpretation comes afterward.</p>';
  return `
    <form data-interpretation-form class="bridge-grid">
      <label>Reviewer<input name="reviewer_id" value="Rowan"></label>
      <label>Mechanism status<select name="mechanism_status"><option>unknown</option><option>candidate</option><option>contested</option><option>supported</option><option>rejected</option></select></label>
      <label class="wide">Interpretation<textarea name="interpretation" rows="4" required placeholder="Current explanation. This may be revised without changing the Effect Receipt."></textarea></label>
      <label class="wide">Candidate mechanisms, one per line<textarea name="candidate_mechanisms" rows="3"></textarea></label>
      <label>Confidence<input name="confidence" value="unrated"></label>
      <label>Supersedes revision ref<input name="supersedes_revision_ref" value="${esc(interpretationRevision?.revision_id || '')}"></label>
      <div class="bridge-actions wide"><button type="submit">Append interpretation revision</button></div>
    </form>`;
}

function markup() {
  return `
    <div class="bridge-heading">
      <div><p class="eyebrow">Bridge Network · anti-flattening instrument</p><h3>WILD Emergence + Effect Receipts</h3><p class="muted">Generation happens from participant-local world state. Observation is sealed before mechanism adjudication. Interpretation may change later without rewriting what was observed.</p></div>
      <div class="bridge-law"><strong>Bridge law</strong><br>Preserve distinction, provenance, lawful information boundaries, and attributable transformation long enough for real crossings to create information.</div>
    </div>
    <details open><summary>1 · WILD generation lane</summary><p class="muted">No scoring, Spiral, PREMAQC, flattening, evaluator, desired-outcome, or surprise-target fields enter this lane. World constraints and agency boundaries do.</p>${wildForm()}<div data-wild-output></div></details>
    <details><summary>2 · Effect Receipt</summary>${effectForm()}<div data-effect-output></div></details>
    <details><summary>3 · Interpretation revision</summary><div data-interpretation-slot>${interpretationForm()}</div><div data-interpretation-output></div></details>
  `;
}

function showJson(node, value, label) {
  if (!node) return;
  node.innerHTML = value ? `<p><strong>${esc(label)}</strong></p><pre>${esc(JSON.stringify(value, null, 2))}</pre>` : '';
}

function trialFrom(form) {
  const data = new FormData(form);
  return {
    session_id: data.get('session_id') || undefined,
    wild_context: {
      world_state: data.get('world_state'),
      history: lines(data.get('history')),
      participants: lines(data.get('participants')),
      participant_knowledge: lines(data.get('participant_knowledge')),
      capabilities: lines(data.get('capabilities')),
      relationships: lines(data.get('relationships')),
      agency_boundaries: lines(data.get('agency_boundaries')),
      constraints: lines(data.get('constraints')),
      reachable_possibilities: lines(data.get('reachable_possibilities')),
      memory_active_context: lines(data.get('memory_active_context')),
      orientation: data.get('orientation'),
      provenance: lines(data.get('provenance')),
    },
  };
}

async function runWild(form, panel) {
  wildReceipt = await runWildEmergenceTrial(trialFrom(form));
  showJson(panel.querySelector('[data-wild-output]'), wildReceipt, 'WILD generation sealed. No evaluator ran.');
  const context = panel.querySelector('[data-effect-form] [name="context_ref"]');
  if (context && !context.value) context.value = wildReceipt.trial_id;
}

async function sealEffect(form, panel) {
  const data = new FormData(form);
  effectReceipt = await createEffectReceipt({
    observerId: data.get('observer_id'),
    contextRef: data.get('context_ref'),
    observedEffect: data.get('observed_effect'),
    confidence: data.get('confidence'),
    provenance: lines(data.get('provenance')),
  });
  showJson(panel.querySelector('[data-effect-output]'), effectReceipt, 'Append-only Effect Receipt sealed.');
  const slot = panel.querySelector('[data-interpretation-slot]');
  if (slot) slot.innerHTML = interpretationForm();
  bind(panel);
}

async function appendInterpretation(form, panel) {
  const data = new FormData(form);
  interpretationRevision = await createInterpretationRevision({
    effectReceipt,
    reviewerId: data.get('reviewer_id'),
    interpretation: data.get('interpretation'),
    mechanismStatus: data.get('mechanism_status'),
    candidateMechanisms: lines(data.get('candidate_mechanisms')),
    confidence: data.get('confidence'),
    supersedesRevisionRef: data.get('supersedes_revision_ref'),
  });
  showJson(panel.querySelector('[data-interpretation-output]'), interpretationRevision, 'Interpretation revision appended. Effect Receipt unchanged.');
  const slot = panel.querySelector('[data-interpretation-slot]');
  if (slot) slot.innerHTML = interpretationForm();
  bind(panel);
}

async function checkStatus(panel) {
  const status = await readEmergenceLabStatus();
  const node = panel.querySelector('[data-wild-status-text]');
  if (node) node.textContent = status.configured ? `${status.model_exact} · WILD ready` : `${status.model_exact} · missing ${status.missing.join(', ')}`;
}

function bind(panel) {
  const wild = panel.querySelector('[data-wild-form]');
  if (wild && !wild.dataset.bound) {
    wild.dataset.bound = 'true';
    wild.addEventListener('submit', (event) => { event.preventDefault(); void runWild(wild, panel).catch((error) => showJson(panel.querySelector('[data-wild-output]'), { error: error.message }, 'WILD generation failed')); });
  }
  const effect = panel.querySelector('[data-effect-form]');
  if (effect && !effect.dataset.bound) {
    effect.dataset.bound = 'true';
    effect.addEventListener('submit', (event) => { event.preventDefault(); void sealEffect(effect, panel).catch((error) => showJson(panel.querySelector('[data-effect-output]'), { error: error.message }, 'Effect Receipt failed')); });
  }
  const interpretation = panel.querySelector('[data-interpretation-form]');
  if (interpretation && !interpretation.dataset.bound) {
    interpretation.dataset.bound = 'true';
    interpretation.addEventListener('submit', (event) => { event.preventDefault(); void appendInterpretation(interpretation, panel).catch((error) => showJson(panel.querySelector('[data-interpretation-output]'), { error: error.message }, 'Interpretation revision failed')); });
  }
  const status = panel.querySelector('[data-wild-status]');
  if (status && !status.dataset.bound) {
    status.dataset.bound = 'true';
    status.addEventListener('click', () => { void checkStatus(panel).catch((error) => { const node = panel.querySelector('[data-wild-status-text]'); if (node) node.textContent = error.message; }); });
  }
}

export function mountBridgeNetworkUi(doc = globalThis.document) {
  const reader = doc?.getElementById?.(READER_ID);
  if (!reader) return null;
  ensureStyles(doc);
  let panel = reader.querySelector(`#${PANEL_ID}`);
  if (!panel) {
    panel = doc.createElement('section');
    panel.id = PANEL_ID;
    panel.innerHTML = markup();
    reader.append(panel);
  }
  bind(panel);
  return panel;
}

export function installBridgeNetworkUi(doc = globalThis.document) {
  if (!doc?.body) return null;
  const mount = () => mountBridgeNetworkUi(doc);
  mount();
  const observer = new MutationObserver(() => queueMicrotask(mount));
  const app = doc.querySelector('#app');
  if (app) observer.observe(app, { childList: true, subtree: true });
  return observer;
}

if (typeof document !== 'undefined') installBridgeNetworkUi();
