import { loadState } from './storage.js';
import { TRANSFORMATION_AXES, assessTransformationResponse, createTransformationRequest } from './transformation-request.js';
import { runRequestedTransformationCircuit } from './requested-transformation-circuit.js';

const STORE_KEY = 'hearthgate.arcsweep.transformation-requests.v1';
let mounting = false;
let fallback = { version: 1, byWorld: {} };

function readStore() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) || 'null');
    if (parsed?.version === 1 && parsed.byWorld) return parsed;
  } catch {}
  return structuredClone(fallback);
}

function writeStore(store) {
  fallback = structuredClone(store);
  try { globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
}

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function worldRecord(store, worldId) {
  store.byWorld[worldId] ||= { requests: [], responses: [], circuits: [] };
  store.byWorld[worldId].circuits ||= [];
  return store.byWorld[worldId];
}

async function context() {
  const state = await loadState();
  const world = state.worlds.find((item) => item.id === state.activeWorldId) || state.worlds[0];
  const cycles = (state.feedbackCycles || []).filter((cycle) => cycle.world?.id === world?.id);
  const premaqc = state.premaqcByWorld?.[world?.id] || cycles[0]?.premaqc_after || null;
  return { state, world, premaqc, cycles };
}

function responseSummary(response) {
  if (!response) return '<p class="muted">No post-request response has been measured.</p>';
  const deltas = TRANSFORMATION_AXES.map((axis) => `${axis} ${Number(response.measurement.deltas[axis]).toFixed(3)}`).join(' · ');
  return `<div class="transformation-result"><p><b>${esc(response.classification.status)}</b> · ${esc(response.classification.coupling)}</p><p class="muted">Δ ${esc(deltas)}</p><p class="muted">χᵤ ${esc(TRANSFORMATION_AXES.map((axis) => `${axis} ${Number(response.measurement.susceptibility[axis]).toFixed(3)}`).join(' · '))}</p></div>`;
}

function render(world, record, message = '') {
  const latest = record.requests.at(-1) || null;
  const response = latest ? [...record.responses].reverse().find((item) => item.request_id === latest.request_id) : null;
  const circuit = latest ? [...record.circuits].reverse().find((item) => item.request.request_id === latest.request_id) : null;
  return `<section class="panel transformation-request-panel" data-transformation-sidecar>
    <div class="section-heading compact-heading"><div><p class="eyebrow">Ask → Actuate → Listen → Measure</p><h2>Requested Transformation</h2><p class="muted">${esc(world.name)} · Intention enters as a bounded control input, never as a manufactured observation.</p></div></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <form data-transformation-form class="stack">
      <label>What change are we asking for?<textarea name="description" rows="3" required placeholder="State the requested change without declaring that it occurred."></textarea></label>
      <fieldset><legend>Observable PREMAQC targets</legend><div class="transformation-axis-grid">${TRANSFORMATION_AXES.map((axis) => `<label class="checkbox"><input type="checkbox" name="axis" value="${axis}" /> ${axis}</label>`).join('')}</div></fieldset>
      <div class="grid three compact-grid"><label>Direction<select name="direction"><option value="increase">Increase</option><option value="decrease">Decrease</option></select></label><label>Minimum observed Δ<input name="minimumDelta" type="number" min="0.001" max="1" step="0.001" value="0.03" /></label><label>Intervention strength<input name="strength" type="number" min="0.01" max="1" step="0.01" value="0.35" /></label></div>
      <div class="grid three compact-grid"><label>Intervention type<input name="type" value="soundscape-and-writing" /></label><label>Maximum cycles<input name="maximumCycles" type="number" min="1" max="24" step="1" value="3" /></label><label>Requested by<input name="authority" value="Rowan" required /></label></div>
      <label>Stop conditions<input name="stopConditions" value="Feather; Q decline; E spike" /></label>
      <label class="checkbox"><input name="consent" type="checkbox" /> I authorise this bounded request; Feather stops it.</label>
      <button type="submit">Receipt the Ask</button>
    </form>
    ${latest ? `<div class="transformation-latest"><p class="eyebrow">Latest request</p><p><b>${esc(latest.request.description)}</b></p><dl class="facts"><div><dt>Status</dt><dd>${esc(latest.request.status)}</dd></div><div><dt>Targets</dt><dd>${esc(latest.target.axes.join(', '))} · ${esc(latest.target.direction)}</dd></div><div><dt>Strength</dt><dd>${latest.intervention.strength}</dd></div><div><dt>Window</dt><dd>${latest.bounds.maximum_cycles} cycles</dd></div><div><dt>Baseline</dt><dd>PREMAQC ${esc(latest.baseline.sequence)} · ${esc(latest.baseline.receipt_id)}</dd></div></dl>
      <div class="grid two compact-grid"><label>Observed structure · a<input data-transformation-field="structure" type="number" step="0.01" value="-1" /></label><label>Observed order parameter · x<input data-transformation-field="order-parameter" type="number" step="0.01" value="0" /></label></div>
      <div class="button-row"><button type="button" data-transformation-action="twine" data-request-id="${esc(latest.request_id)}">Twine Ask through latest feedback cycle</button><button type="button" class="quiet" data-transformation-action="measure" data-request-id="${esc(latest.request_id)}">Measure latest receipted response</button></div>
      ${circuit ? `<p class="callout"><b>Circuit closed</b> · ${esc(circuit.measured_response.classification.status)} · ${esc(circuit.measured_response.classification.coupling)} · b ${Number(circuit.control.cusp_intention_b).toFixed(3)} · ${esc(circuit.circuit_id)}</p>` : '<p class="muted">The Ask has not yet crossed a later feedback receipt.</p>'}${responseSummary(response)}</div>` : '<p class="muted">No requested transformation is active for this world.</p>'}
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#transformation-request-style')) return;
  const style = document.createElement('style');
  style.id = 'transformation-request-style';
  style.textContent = `.transformation-request-panel{margin-top:1rem}.transformation-axis-grid{display:grid;grid-template-columns:repeat(7,minmax(3.2rem,1fr));gap:.4rem}.transformation-latest,.transformation-result{margin-top:1rem;padding:1rem;border:1px solid color-mix(in srgb,var(--gold) 30%,transparent);border-radius:12px}@media(max-width:760px){.transformation-axis-grid{grid-template-columns:repeat(4,1fr)}}`;
  document.head.appendChild(style);
}

async function mount() {
  if (mounting || document.querySelector('[data-transformation-sidecar]')) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (!['Relational Feedback Chamber', 'Field · DEEP Observer'].includes(title)) return;
  mounting = true;
  try {
    const { world } = await context();
    if (!world || document.querySelector('[data-transformation-sidecar]')) return;
    injectStyle();
    const store = readStore();
    const main = document.querySelector('main.content');
    if (main) main.insertAdjacentHTML('beforeend', render(world, worldRecord(store, world.id)));
  } finally { mounting = false; }
}

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-transformation-form]');
  if (!form) return;
  event.preventDefault();
  const panel = form.closest('[data-transformation-sidecar]');
  try {
    const { world, premaqc } = await context();
    if (!premaqc) throw new Error('Run a receipted Feedback or Field cycle to establish the baseline first.');
    const data = new FormData(form);
    const receipt = await createTransformationRequest({
      world,
      baselinePremaqc: premaqc,
      description: data.get('description'),
      targetAxes: data.getAll('axis'),
      direction: data.get('direction'),
      minimumDelta: data.get('minimumDelta'),
      intervention: { type: data.get('type'), strength: data.get('strength') },
      authority: data.get('authority'),
      consent: form.elements.consent.checked,
      maximumCycles: Number(data.get('maximumCycles')),
      stopConditions: String(data.get('stopConditions') || '').split(';').map((item) => item.trim()).filter(Boolean),
    });
    const store = readStore(); const record = worldRecord(store, world.id);
    record.requests.push(structuredClone(receipt));
    writeStore(store);
    panel.outerHTML = render(world, record, `Ask receipted as ${receipt.request_id}. No outcome has been declared.`);
  } catch (error) {
    const output = panel.querySelector('.callout') || document.createElement('p');
    output.className = 'callout'; output.textContent = `Request stopped: ${error.message}`;
    if (!output.parentElement) panel.prepend(output);
  }
});

document.addEventListener('click', async (event) => {
  const twine = event.target.closest('[data-transformation-action="twine"]');
  if (twine) {
    const panel = twine.closest('[data-transformation-sidecar]');
    twine.disabled = true;
    try {
      const { world, cycles } = await context();
      const store = readStore(); const record = worldRecord(store, world.id);
      const request = record.requests.find((item) => item.request_id === twine.dataset.requestId);
      if (!request) throw new Error('The request receipt is unavailable.');
      const cycle = cycles.find((item) => Number(item.premaqc_after?.sequence) > Number(request.baseline.sequence));
      if (!cycle) throw new Error('Run a later receipted feedback cycle before twining this Ask.');
      const structure = Number(panel.querySelector('[data-transformation-field="structure"]').value);
      const orderParameter = Number(panel.querySelector('[data-transformation-field="order-parameter"]').value);
      const cuspHistory = record.circuits.map((item) => item.cusp?.observation_packet).filter(Boolean);
      const circuit = await runRequestedTransformationCircuit({ request, feedbackCycle: cycle, structure, orderParameter, cuspHistory });
      record.circuits.push(structuredClone(circuit));
      record.responses.push(structuredClone(circuit.measured_response));
      writeStore(store);
      panel.outerHTML = render(world, record, `Circuit closed as ${circuit.circuit_id}. Ask remained control; response remained observed.`);
    } catch (error) {
      const output = panel.querySelector('.callout') || document.createElement('p');
      output.className = 'callout'; output.textContent = `Circuit stopped: ${error.message}`;
      if (!output.parentElement) panel.prepend(output);
    } finally { twine.disabled = false; }
    return;
  }
  const button = event.target.closest('[data-transformation-action="measure"]');
  if (!button) return;
  const panel = button.closest('[data-transformation-sidecar]');
  try {
    const { world, premaqc } = await context();
    const store = readStore(); const record = worldRecord(store, world.id);
    const request = record.requests.find((item) => item.request_id === button.dataset.requestId);
    if (!request) throw new Error('The request receipt is unavailable.');
    const cycleCount = Number(premaqc?.sequence) - Number(request.baseline.sequence);
    const response = await assessTransformationResponse({ request, responsePremaqc: premaqc, cycleCount });
    record.responses.push(structuredClone(response)); writeStore(store);
    panel.outerHTML = render(world, record, `Response measured: ${response.classification.status} · ${response.classification.coupling}.`);
  } catch (error) {
    const output = panel.querySelector('.callout') || document.createElement('p');
    output.className = 'callout'; output.textContent = `Measurement stopped: ${error.message}`;
    if (!output.parentElement) panel.prepend(output);
  }
});

const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
