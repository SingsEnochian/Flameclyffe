import { loadState } from './storage.js';
import { attachCuspObservationToFeedbackCycle } from './cusp-feedback-observer.js';
import { buildCuspObserverBench } from './cusp-observer-view.js';

const STORE_KEY = 'hearthgate.arcsweep.cusp-observer.v1';
const MAX_PACKETS_PER_WORLD = 96;
let mounting = false;
let memoryFallback = { version: 1, byWorld: {} };

function readStore() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) || 'null');
    if (parsed?.version === 1 && parsed.byWorld && typeof parsed.byWorld === 'object') return parsed;
  } catch {}
  return structuredClone(memoryFallback);
}

function writeStore(store) {
  memoryFallback = structuredClone(store);
  try { globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
}

function worldStore(store, worldId) {
  store.byWorld[worldId] ||= { packets: [], latestEnvelope: null, latestControls: { structure: -1, intention: 0, order_parameter: 0 } };
  return store.byWorld[worldId];
}

function compactEnvelope(envelope) {
  return {
    schema: envelope.schema,
    schema_version: envelope.schema_version,
    world: structuredClone(envelope.world),
    envelope_id: envelope.envelope_id,
    envelope_fingerprint: envelope.envelope_fingerprint,
    cusp_observation_packet: structuredClone(envelope.cusp_observation_packet),
    cusp_replay_receipt: structuredClone(envelope.cusp_replay_receipt),
    cusp_trace_receipt: structuredClone(envelope.cusp_trace_receipt),
    observer_event_candidates: structuredClone(envelope.observer_event_candidates),
    authority: structuredClone(envelope.authority),
    created_at: envelope.created_at,
  };
}

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function fixed(value, digits = 4) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';
}

function pathPoints(points, xAccessor, yAccessor, width, height, padding = 18) {
  if (!points.length) return '';
  const xs = points.map(xAccessor);
  const ys = points.map(yAccessor);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const xSpan = Math.max(1e-9, maxX - minX);
  const ySpan = Math.max(1e-9, maxY - minY);
  return points.map((point) => {
    const x = padding + ((xAccessor(point) - minX) / xSpan) * (width - padding * 2);
    const y = height - padding - ((yAccessor(point) - minY) / ySpan) * (height - padding * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

function potentialSvg(bench) {
  const width = 430; const height = 220; const points = bench.potential_landscape.points;
  const line = pathPoints(points, (p) => p.x, (p) => p.potential, width, height);
  const allY = points.map((p) => p.potential);
  const minY = Math.min(...allY); const maxY = Math.max(...allY); const ySpan = Math.max(1e-9, maxY - minY);
  const xMin = bench.potential_landscape.minimum_x; const xMax = bench.potential_landscape.maximum_x; const xSpan = xMax - xMin;
  const markers = bench.equilibria.map((point) => {
    const x = 18 + ((point.x - xMin) / xSpan) * (width - 36);
    const y = height - 18 - ((point.potential - minY) / ySpan) * (height - 36);
    const radius = point.selected ? 6 : 4;
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius}" class="cusp-eq ${point.stability} ${point.selected ? 'selected' : ''}"><title>${esc(point.branch)} · ${esc(point.stability)}</title></circle>`;
  }).join('');
  return `<svg class="cusp-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Cusp potential landscape"><polyline class="cusp-line" points="${line}" />${markers}</svg>`;
}

function controlSvg(bench) {
  const width = 430; const height = 220; const padding = 18;
  const locus = [...bench.control_plane.fold_locus.lower, ...[...bench.control_plane.fold_locus.upper].reverse()];
  const minStructure = Math.min(...locus.map((p) => p.structure), bench.controls.structure, -2);
  const maxStructure = Math.max(0, bench.controls.structure);
  const intentionLimit = Math.max(0.5, ...locus.map((p) => Math.abs(p.intention)), Math.abs(bench.controls.intention)) * 1.12;
  const x = (value) => padding + ((value - minStructure) / Math.max(1e-9, maxStructure - minStructure)) * (width - padding * 2);
  const y = (value) => height - padding - ((value + intentionLimit) / (intentionLimit * 2)) * (height - padding * 2);
  const polygon = locus.map((p) => `${x(p.structure).toFixed(2)},${y(p.intention).toFixed(2)}`).join(' ');
  const currentX = x(bench.controls.structure); const currentY = y(bench.controls.intention);
  return `<svg class="cusp-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Cusp control plane"><polygon class="cusp-region" points="${polygon}" /><line class="cusp-axis" x1="${padding}" y1="${y(0).toFixed(2)}" x2="${width - padding}" y2="${y(0).toFixed(2)}" /><circle class="cusp-current" cx="${currentX.toFixed(2)}" cy="${currentY.toFixed(2)}" r="6"><title>structure ${fixed(bench.controls.structure)} · intention ${fixed(bench.controls.intention)}</title></circle></svg>`;
}

function renderBench(world, record, bench = null, message = '') {
  const controls = record.latestControls || { structure: -1, intention: 0, order_parameter: 0 };
  const candidate = bench?.event_candidate;
  return `<section class="panel cusp-bench-panel" data-cusp-bench-sidecar>
    <div class="section-heading compact-heading"><div><p class="eyebrow">Math Spine companion · explicit controls only</p><h2>Cusp Observer Bench</h2><p class="muted">${esc(world.name)} · Intention is a control parameter here, not PREMAQC Agency.</p></div>${record.packets.length ? `<button type="button" class="quiet" data-cusp-action="clear">Clear trace</button>` : ''}</div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <div class="grid three compact-grid cusp-controls">
      <label>Structure · a<input data-cusp-field="structure" type="number" step="0.01" value="${esc(controls.structure)}" /></label>
      <label>Intention · b<input data-cusp-field="intention" type="number" step="0.01" value="${esc(controls.intention)}" /></label>
      <label>Order parameter · x<input data-cusp-field="order_parameter" type="number" step="0.01" value="${esc(controls.order_parameter)}" /></label>
    </div>
    <div class="button-row"><button type="button" data-cusp-action="observe">Observe cusp against latest Math Spine receipt</button></div>
    ${bench ? `<div class="grid two cusp-plots"><article><p class="eyebrow">Potential landscape</p>${potentialSvg(bench)}</article><article><p class="eyebrow">Control plane</p>${controlSvg(bench)}</article></div>
      <dl class="facts"><div><dt>Regime</dt><dd>${esc(bench.regime)}</dd></div><div><dt>Fold polynomial</dt><dd>${fixed(bench.fold_polynomial, 6)}</dd></div><div><dt>Selected branch</dt><dd>${esc(bench.selected_equilibrium?.branch || 'none')} · ${esc(bench.selected_equilibrium?.stability || 'unselected')}</dd></div><div><dt>Intention sweep</dt><dd>${esc(bench.history?.intention_direction || 'stationary')}</dd></div><div><dt>Hysteresis</dt><dd>${bench.hysteresis.detected ? `WITNESSED · ${bench.hysteresis.witnesses.length} receipt pair${bench.hysteresis.witnesses.length === 1 ? '' : 's'}` : 'not witnessed'}</dd></div><div><dt>Trace depth</dt><dd>${record.packets.length} observation${record.packets.length === 1 ? '' : 's'}</dd></div></dl>
      ${candidate ? `<p class="cusp-candidate"><b>BRANCH-SNAP CANDIDATE</b> · evidence review required · not asserted · sound remains manual</p>` : '<p class="muted">No branch-transition candidate in the latest observation.</p>'}` : '<p class="muted">Run a receipted Feedback or Field cycle, then enter explicit controls here. The bench will not infer Intention from prose, PREMAQC, ambient data, or Agency.</p>'}
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#cusp-bench-sidecar-style')) return;
  const style = document.createElement('style');
  style.id = 'cusp-bench-sidecar-style';
  style.textContent = `.cusp-bench-panel{margin-top:1rem}.cusp-chart{width:100%;min-height:210px;background:color-mix(in srgb,var(--panel-solid) 82%,transparent);border:1px solid color-mix(in srgb,var(--gold) 28%,transparent);border-radius:12px}.cusp-line{fill:none;stroke:var(--gold);stroke-width:2}.cusp-eq{fill:var(--green);stroke:var(--bg);stroke-width:2}.cusp-eq.unstable{fill:transparent;stroke:var(--gold)}.cusp-eq.selected{stroke-width:4}.cusp-region{fill:color-mix(in srgb,var(--green) 18%,transparent);stroke:var(--green);stroke-width:1.5}.cusp-axis{stroke:color-mix(in srgb,var(--text) 25%,transparent);stroke-width:1}.cusp-current{fill:var(--gold);stroke:var(--text);stroke-width:2}.cusp-candidate{padding:.8rem 1rem;border:1px solid var(--gold);border-radius:10px}.cusp-controls input{font-variant-numeric:tabular-nums}`;
  document.head.appendChild(style);
}

async function currentWorldAndCycle() {
  const state = await loadState();
  const world = state.worlds.find((item) => item.id === state.activeWorldId) || state.worlds[0];
  const cycle = (state.feedbackCycles || []).find((item) => item.world?.id === world?.id && item.math_spine_packet) || null;
  return { state, world, cycle };
}

async function mount() {
  if (mounting || document.querySelector('[data-cusp-bench-sidecar]')) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (!['Relational Feedback Chamber', 'Field · DEEP Observer'].includes(title)) return;
  mounting = true;
  try {
    injectStyle();
    const { world } = await currentWorldAndCycle();
    if (!world || document.querySelector('[data-cusp-bench-sidecar]')) return;
    const store = readStore();
    const record = worldStore(store, world.id);
    const bench = record.latestEnvelope ? buildCuspObserverBench(record.latestEnvelope) : null;
    const main = document.querySelector('main.content');
    if (main) main.insertAdjacentHTML('beforeend', renderBench(world, record, bench));
  } finally { mounting = false; }
}

async function observe(button) {
  const panel = button.closest('[data-cusp-bench-sidecar]');
  if (!panel) return;
  button.disabled = true;
  try {
    const { world, cycle } = await currentWorldAndCycle();
    if (!world) throw new Error('No active world is available.');
    if (!cycle) throw new Error('No receipted Math Spine cycle exists for this world yet.');
    const structure = Number(panel.querySelector('[data-cusp-field="structure"]').value);
    const intention = Number(panel.querySelector('[data-cusp-field="intention"]').value);
    const orderParameter = Number(panel.querySelector('[data-cusp-field="order_parameter"]').value);
    if (![structure, intention, orderParameter].every(Number.isFinite)) throw new Error('Structure, Intention, and Order parameter must be finite numbers.');
    const store = readStore();
    const record = worldStore(store, world.id);
    const envelope = await attachCuspObservationToFeedbackCycle({
      cycle,
      cusp: { structure, intention, orderParameter },
      cuspHistory: record.packets,
      generatedAt: new Date().toISOString(),
    });
    record.packets = [...record.packets, structuredClone(envelope.cusp_observation_packet)].slice(-MAX_PACKETS_PER_WORLD);
    record.latestEnvelope = compactEnvelope(envelope);
    record.latestControls = { structure, intention, order_parameter: orderParameter };
    writeStore(store);
    const bench = buildCuspObserverBench(record.latestEnvelope);
    panel.outerHTML = renderBench(world, record, bench, `Cusp receipt ${envelope.cusp_observation_packet.packet_id} replay-matched.`);
  } catch (error) {
    const output = panel.querySelector('.callout') || document.createElement('p');
    output.className = 'callout';
    output.textContent = `Cusp observation stopped: ${error.message}`;
    if (!output.parentElement) panel.prepend(output);
  } finally { button.disabled = false; }
}

async function clear(button) {
  const { world } = await currentWorldAndCycle();
  if (!world) return;
  const store = readStore();
  const record = worldStore(store, world.id);
  record.packets = [];
  record.latestEnvelope = null;
  writeStore(store);
  const panel = button.closest('[data-cusp-bench-sidecar]');
  if (panel) panel.outerHTML = renderBench(world, record, null, 'Cusp trace cleared for this world.');
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-cusp-action]');
  if (!button) return;
  if (button.dataset.cuspAction === 'observe') void observe(button);
  if (button.dataset.cuspAction === 'clear') void clear(button);
});

const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
