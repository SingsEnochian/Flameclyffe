import { INITIAL_ASPECTS } from './aspects/aspect-contract.js';
import { ASPECT_MESH_EVENTS, readAspectMeshRuntime } from './aspects/aspect-mesh-runtime.js';

export const ASPECT_EXPERIMENT_BED_UI_MARKER = 'aspect-experiment-bed-ui/v0.1';

let installed = false;
let selectedExperimentId = null;
let observer = null;
let queued = false;
let running = new Set();

const names = new Map(INITIAL_ASPECTS.map((aspect) => [aspect.id, aspect.name]));
const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function snapshot() {
  return readAspectMeshRuntime()?.experimentSnapshot?.() || null;
}

function rows(bed) {
  return Array.isArray(bed?.experiments) ? bed.experiments : [];
}

function statusLabel(experiment) {
  if (running.has(experiment.experimentId) || experiment.status === 'running') return 'trying';
  if (experiment.status === 'reflected') return 'reflected';
  if (experiment.status === 'completed') return experiment.outcome || 'observed';
  return 'proposed';
}

function compactRow(experiment) {
  const initiator = names.get(experiment.initiatorAspectId) || experiment.initiatorAspectId || 'Aspect';
  return `<button type="button" class="experiment-bed-row" data-experiment-select="${esc(experiment.experimentId)}" aria-pressed="${experiment.experimentId === selectedExperimentId ? 'true' : 'false'}"><span>⚗</span><span><strong>${esc(experiment.title)}</strong><small>${esc(initiator)} · ${esc(statusLabel(experiment))}</small></span></button>`;
}

function detail(experiment) {
  if (!experiment) return '<p class="experiment-bed-empty">Fresh bench. Curiosity may arrive when it likes.</p>';
  const collaborators = experiment.collaborators.map((id) => names.get(id) || id).join(' + ');
  const canRun = experiment.status === 'proposed' && !running.has(experiment.experimentId);
  return `<section class="experiment-bed-detail"><header><div><strong>${esc(experiment.title)}</strong><small>${esc(statusLabel(experiment))} · ${esc(experiment.experimentId)}</small></div>${canRun ? `<button type="button" data-experiment-run="${esc(experiment.experimentId)}">Try it</button>` : ''}</header>${experiment.hypothesis ? `<p><b>Wondering</b>${esc(experiment.hypothesis)}</p>` : ''}${experiment.method ? `<p><b>Try</b>${esc(experiment.method)}</p>` : ''}${experiment.reversibleScope ? `<p><b>Return path</b>${esc(experiment.reversibleScope)}</p>` : ''}${collaborators ? `<p><b>With</b>${esc(collaborators)}</p>` : ''}${experiment.successSignals.length ? `<p><b>Notice</b>${esc(experiment.successSignals.join(' · '))}</p>` : ''}${experiment.observation ? `<p><b>What happened</b>${esc(experiment.observation)}</p>` : ''}${experiment.reflection ? `<p><b>What changed</b>${esc(experiment.reflection)}</p>` : ''}<p class="experiment-bed-law">Experience, not score. An experiment may work, fail, surprise, or remain inconclusive and still be worth remembering.</p></section>`;
}

function housePanel() {
  return document.querySelector(`[data-experiment-bed-house="${ASPECT_EXPERIMENT_BED_UI_MARKER}"]`);
}

function ensureHousePanel() {
  const rail = document.querySelector('[data-house-channel-rail="house-chat-channel-rail/v1"]');
  if (!rail) return null;
  let panel = housePanel();
  if (panel) return panel;
  panel = document.createElement('section');
  panel.className = 'experiment-bed-panel';
  panel.dataset.experimentBedHouse = ASPECT_EXPERIMENT_BED_UI_MARKER;
  const garden = rail.querySelector('[data-growth-garden-house]');
  if (garden) garden.insertAdjacentElement('afterend', panel);
  else rail.append(panel);
  wirePanel(panel);
  return panel;
}

function codexPanel() {
  return document.querySelector(`[data-experiment-bed-codex="${ASPECT_EXPERIMENT_BED_UI_MARKER}"]`);
}

function ensureCodexPanel() {
  const stage = document.querySelector('#arcsweep-magic-book .magic-book-stage');
  if (!stage) return null;
  let panel = codexPanel();
  if (panel) return panel;
  panel = document.createElement('details');
  panel.className = 'codex-experiment-bed';
  panel.dataset.experimentBedCodex = ASPECT_EXPERIMENT_BED_UI_MARKER;
  stage.append(panel);
  wirePanel(panel);
  return panel;
}

function wirePanel(panel) {
  panel.addEventListener('click', (event) => {
    const select = event.target?.closest?.('[data-experiment-select]');
    if (select) {
      selectedExperimentId = select.dataset.experimentSelect || null;
      render();
      return;
    }
    const run = event.target?.closest?.('[data-experiment-run]');
    if (run) void runExperiment(run.dataset.experimentRun);
  });
}

async function runExperiment(experimentId) {
  const runtime = readAspectMeshRuntime();
  if (!runtime?.runExperiment || !experimentId || running.has(experimentId)) return;
  running.add(experimentId);
  render();
  try {
    await runtime.runExperiment({ experimentId });
    await runtime.flushPersistence?.();
  } catch (error) {
    console.warn('[Aspect Mesh] experiment UI run failed', error);
  } finally {
    running.delete(experimentId);
    render();
  }
}

function selected(bed) {
  const experiments = rows(bed);
  if (!experiments.length) return null;
  const current = experiments.find((experiment) => experiment.experimentId === selectedExperimentId) || experiments[0];
  selectedExperimentId = current.experimentId;
  return current;
}

function renderHouse(bed) {
  const panel = ensureHousePanel();
  if (!panel) return;
  const experiments = rows(bed);
  const current = selected(bed);
  panel.innerHTML = `<header><span><b>Experiment Beds</b><small>${experiments.length ? `${bed.open.length} open · ${bed.completed.length} returned` : 'fresh soil'}</small></span><i>⚗</i></header><div class="experiment-bed-list">${experiments.length ? experiments.slice(0, 6).map(compactRow).join('') : '<p class="experiment-bed-empty">No experiments yet. Curiosity does not owe us productivity.</p>'}</div>${detail(current)}`;
}

function renderCodex(bed) {
  const panel = ensureCodexPanel();
  if (!panel) return;
  const experiments = rows(bed);
  const current = selected(bed);
  panel.innerHTML = `<summary><span>⚗</span><strong>Experiment Beds</strong><small>${bed?.open?.length || 0} open</small></summary><div class="codex-experiment-bed-body"><nav>${experiments.slice(0, 6).map((experiment) => `<button type="button" data-experiment-select="${esc(experiment.experimentId)}" aria-current="${experiment.experimentId === current?.experimentId ? 'true' : 'false'}">${esc(experiment.title)}</button>`).join('')}</nav>${detail(current)}</div>`;
}

function render() {
  queued = false;
  if (typeof document === 'undefined') return;
  const bed = snapshot();
  renderHouse(bed || { experiments: [], open: [], completed: [] });
  renderCodex(bed || { experiments: [], open: [], completed: [] });
}

function scheduleRender() {
  if (queued || typeof requestAnimationFrame !== 'function') return;
  queued = true;
  requestAnimationFrame(render);
}

function needsMount() {
  const rail = document.querySelector('[data-house-channel-rail="house-chat-channel-rail/v1"]');
  const codex = document.querySelector('#arcsweep-magic-book .magic-book-stage');
  return Boolean((rail && !housePanel()) || (codex && !codexPanel()));
}

function installStyles() {
  if (document.getElementById('aspect-experiment-bed-ui-styles')) return;
  const style = document.createElement('style');
  style.id = 'aspect-experiment-bed-ui-styles';
  style.textContent = `.experiment-bed-panel{display:grid;gap:.42rem;padding:.48rem;border:1px solid color-mix(in srgb,var(--gold,#c7a963) 20%,var(--line-soft));border-radius:.72rem;background:color-mix(in srgb,var(--gold,#c7a963) 3%,var(--panel-solid))}.experiment-bed-panel>header{display:flex;align-items:center;justify-content:space-between}.experiment-bed-panel>header>span{display:grid}.experiment-bed-panel>header b{font-size:.66rem}.experiment-bed-panel>header small{color:var(--muted);font-size:.5rem}.experiment-bed-panel>header>i{color:var(--gold,#c7a963);font-style:normal}.experiment-bed-list{display:grid;gap:.18rem}.experiment-bed-row{display:grid;grid-template-columns:1rem minmax(0,1fr);gap:.3rem;align-items:center;width:100%;padding:.3rem;border:0;border-radius:.45rem;background:transparent;color:inherit;text-align:left}.experiment-bed-row:hover,.experiment-bed-row[aria-pressed="true"]{background:color-mix(in srgb,var(--gold,#c7a963) 7%,transparent)}.experiment-bed-row>span:nth-child(2){display:grid;min-width:0}.experiment-bed-row strong{font-size:.6rem}.experiment-bed-row small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:.5rem}.experiment-bed-detail{display:grid;gap:.32rem;padding:.42rem;border-top:1px solid var(--line-soft)}.experiment-bed-detail>header{display:flex;gap:.4rem;align-items:center;justify-content:space-between}.experiment-bed-detail>header>div{display:grid;min-width:0}.experiment-bed-detail>header strong{font-size:.64rem}.experiment-bed-detail>header small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font:500 .47rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace}.experiment-bed-detail>header button{padding:.22rem .42rem;border:1px solid color-mix(in srgb,var(--gold,#c7a963) 38%,transparent);border-radius:.4rem;background:transparent;color:inherit;font-size:.52rem}.experiment-bed-detail p{display:grid;gap:.08rem;margin:0;font-size:.55rem;line-height:1.3}.experiment-bed-detail p>b{color:var(--muted);font-size:.48rem;text-transform:uppercase;letter-spacing:.06em}.experiment-bed-law{font-style:italic;opacity:.7}.experiment-bed-empty{margin:.2rem;color:var(--muted);font-size:.56rem}.codex-experiment-bed{position:absolute;right:.7rem;bottom:.55rem;z-index:12;max-width:min(23rem,44vw);pointer-events:auto;color:inherit;font-family:Georgia,'Times New Roman',serif}.codex-experiment-bed>summary{display:grid;grid-template-columns:auto auto auto;gap:.3rem;align-items:center;width:max-content;margin-left:auto;padding:.28rem .46rem;border:1px solid color-mix(in srgb,var(--gold,#c7a963) 30%,transparent);border-radius:.4rem;background:color-mix(in srgb,#241c13 90%,transparent);box-shadow:0 3px 10px rgba(0,0,0,.22);cursor:pointer;list-style:none}.codex-experiment-bed>summary::-webkit-details-marker{display:none}.codex-experiment-bed>summary strong{font-size:.62rem}.codex-experiment-bed>summary small{opacity:.6;font-size:.5rem}.codex-experiment-bed-body{display:grid;gap:.4rem;margin-top:.28rem;max-height:44vh;overflow:auto;padding:.5rem;border:1px solid color-mix(in srgb,var(--gold,#c7a963) 22%,transparent);border-radius:.45rem;background:color-mix(in srgb,#241c13 95%,transparent);box-shadow:0 8px 22px rgba(0,0,0,.3)}.codex-experiment-bed-body>nav{display:flex;flex-wrap:wrap;gap:.22rem}.codex-experiment-bed-body>nav button{padding:.2rem .35rem;border:1px solid transparent;border-radius:999px;background:transparent;color:inherit;font:inherit;font-size:.52rem}.codex-experiment-bed-body>nav button[aria-current="true"]{border-color:color-mix(in srgb,var(--gold,#c7a963) 42%,transparent);background:color-mix(in srgb,var(--gold,#c7a963) 8%,transparent)}@media(max-width:760px){.codex-experiment-bed{right:.35rem;bottom:2.8rem;max-width:calc(100% - .7rem)}.codex-experiment-bed-body{max-height:48vh}}`;
  document.head.append(style);
}

export function installAspectExperimentBedUI() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  installStyles();
  document.addEventListener(ASPECT_MESH_EVENTS.ready, scheduleRender);
  document.addEventListener(ASPECT_MESH_EVENTS.experimentChanged, scheduleRender);
  document.addEventListener(ASPECT_MESH_EVENTS.experimentStarted, scheduleRender);
  document.addEventListener(ASPECT_MESH_EVENTS.experimentComplete, scheduleRender);
  document.addEventListener(ASPECT_MESH_EVENTS.experimentReflected, scheduleRender);
  document.addEventListener('arcsweep:magic-book-ready', scheduleRender);
  globalThis.addEventListener?.('arcsweep:house-chat-surface-mounted', scheduleRender);
  observer = new MutationObserver(() => { if (needsMount()) scheduleRender(); });
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleRender();
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installAspectExperimentBedUI();
