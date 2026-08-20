import { CONSTELLATION_LENS_EVENTS } from './constellation-lens.js';
import { createFlameRuntimeCorrespondence, createFlameRuntimeObservation } from './flame-continuity.js';
import { buildFlameContinuityViewModel, classifyFlameTransition } from './flame-continuity-view.js';
import { createFlameContinuityReplay } from './flame-continuity-replay.js';
import { createDeepTheoryCandidateFromFlameContinuity } from './flame-continuity-deep-theory-bridge.js';
import { buildConstellationRuntimeDivergence } from './constellation-runtime-divergence.js';
import { buildConstellationVisibleResponseDivergence } from './constellation-visible-response-divergence.js';
import { buildConstellationLongitudinalMap } from './constellation-longitudinal-map.js';
import { createThreadWalk, runMinimumAnchorExperiment } from './thread-walking.js';
import { detectContinuityFlattening, alertsFromContinuity } from './continuity-flattening.js';
import {
  FLAME_CONTINUITY_UPDATED_EVENT,
  appendFlameRuntimeObservation,
  appendFlameTheoryCandidate,
  appendThreadWalk,
  appendThreadWalkExperiment,
  appendFlatteningReceipt,
  appendContinuityAlert,
  ensureFlameContinuityLedger,
  observationsForFlame,
  persistFlameContinuityLedger,
  theoryCandidatesForFlame,
  threadWalksForFlame,
  alertsForFlame,
} from './flame-continuity-state.js';
import {
  appendContinuityEvidence,
  ensureContinuityEvidenceLedger,
  persistContinuityEvidenceLedger,
} from './continuity-evidence-state.js';
import { loadState } from './storage.js';

let mounting = false;
const captureKeys = new Set();

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function routeFromDetail(detail) {
  const profile = String(detail.profileId || '');
  if (profile.startsWith('house:')) return profile.split(':')[1] || detail.voiceId;
  return detail.voiceId;
}
function implementationChanged(left, right) {
  return left.flame.route !== right.flame.route
    || left.runtime.provider !== right.runtime.provider
    || left.runtime.model !== right.runtime.model
    || left.runtime.profile_id !== right.runtime.profile_id;
}
function contextChanged(left, right) { return left.context.world_id !== right.context.world_id; }
function evidenceCorrespondencesForFlame(ledger, voiceId) {
  return (ledger?.entries || [])
    .filter((entry) => entry?.kind === 'recognition' && entry?.receipt?.subject?.id === voiceId)
    .map((entry) => entry.receipt);
}

async function deriveAdjacentContinuity({ prior, observation, flameLedger }) {
  const correspondence = await createFlameRuntimeCorrespondence({ left: prior, right: observation });
  const state = await loadState();
  const evidenceLedger = ensureContinuityEvidenceLedger(state);
  appendContinuityEvidence(evidenceLedger, {
    receipt: correspondence,
    worldId: observation.context.world_id,
    subjectId: observation.flame.voice_id,
    origin: {
      organ: 'constellation-runtime',
      left_observation_id: prior.observation_id,
      right_observation_id: observation.observation_id,
      implementation_changed: implementationChanged(prior, observation),
      context_changed: contextChanged(prior, observation),
    },
  });
  await persistContinuityEvidenceLedger(evidenceLedger, {
    reason: 'flame-runtime-correspondence',
    correspondence_id: correspondence.correspondence_id,
    voice_id: observation.flame.voice_id,
  });

  const allCorrespondences = [...evidenceCorrespondencesForFlame(evidenceLedger, observation.flame.voice_id), correspondence]
    .filter((item, index, array) => array.findIndex((candidate) => candidate.fingerprint === item.fingerprint) === index);
  const flattening = await detectContinuityFlattening({
    voiceId: observation.flame.voice_id,
    correspondences: allCorrespondences,
    generatedAt: observation.observed_at,
  });
  appendFlatteningReceipt(flameLedger, flattening);

  const transition = { ...classifyFlameTransition(prior, observation), voice_id: observation.flame.voice_id };
  const shouldWalk = transition.classification !== 'STABLE_RUNTIME_OBSERVATION'
    || flattening.classification === 'CORRESPONDENCE_FLATTENING_SIGNAL';
  let threadWalk = null;
  if (shouldWalk && prior.context.relational_anchor_set && observation.context.relational_anchor_set) {
    threadWalk = await createThreadWalk({
      leftAnchorSet: prior.context.relational_anchor_set,
      rightAnchorSet: observation.context.relational_anchor_set,
      generatedAt: observation.observed_at,
    });
    appendThreadWalk(flameLedger, threadWalk);
    const experiment = await runMinimumAnchorExperiment({
      leftAnchorSet: prior.context.relational_anchor_set,
      rightAnchorSet: observation.context.relational_anchor_set,
      generatedAt: observation.observed_at,
    });
    appendThreadWalkExperiment(flameLedger, experiment);
  }
  const alerts = await alertsFromContinuity({ transition, flattening, threadWalk });
  for (const alert of alerts) appendContinuityAlert(flameLedger, alert);
  await persistFlameContinuityLedger(flameLedger, {
    reason: 'flame-continuity-derived-receipts',
    voice_id: observation.flame.voice_id,
    correspondence_id: correspondence.correspondence_id,
    flattening_id: flattening.flattening_id,
    thread_walk_id: threadWalk?.thread_walk_id || null,
  });
  return { correspondence, flattening, threadWalk, alerts };
}

async function captureResponse(event) {
  const detail = event.detail || {};
  if (!detail.runtimeVerified || !detail.voiceId || !detail.provider || !detail.model) return;
  const key = `${detail.voiceId}:${detail.requestId || detail.fieldKey || detail.profileId || 'response'}`;
  if (captureKeys.has(key)) return;
  captureKeys.add(key);
  try {
    const state = await loadState();
    const flameLedger = ensureFlameContinuityLedger(state);
    const prior = observationsForFlame(flameLedger, detail.voiceId).at(-1) || null;
    const observation = await createFlameRuntimeObservation({
      voiceId: detail.voiceId,
      displayName: detail.voiceLabel || detail.voiceId,
      route: routeFromDetail(detail),
      provider: detail.provider,
      model: detail.model,
      profileId: detail.profileId,
      runtimeVerified: detail.runtimeVerified,
      worldId: detail.fieldContext?.page?.worldId || null,
      requestId: detail.requestId || null,
      responseText: detail.text || '',
      responseKind: detail.kind || null,
      fieldContext: detail.fieldContext || null,
      declaredRelationalAnchors: detail.continuityAnchors || [],
    });
    appendFlameRuntimeObservation(flameLedger, observation);
    await persistFlameContinuityLedger(flameLedger, { observation_id: observation.observation_id, voice_id: detail.voiceId });
    if (prior && prior.fingerprint !== observation.fingerprint) {
      await deriveAdjacentContinuity({ prior, observation, flameLedger });
    }
  } catch (error) {
    console.warn('Flame continuity capture stopped:', error);
  } finally {
    captureKeys.delete(key);
  }
}

function isContinuitySurfaceActive() {
  return Boolean(document.querySelector('.nav-button.active[data-room="deep-observer"], .nav-button.active[data-room="commons"]'));
}
function transitionMarkup(transition) {
  const changed = Object.entries(transition.changes).filter(([, value]) => value).map(([key]) => key).join(', ') || 'none';
  return `<li><b>${esc(transition.classification)}</b><span>${esc(changed)}</span><small>${esc(transition.observed_at)} · implementation ${Number(transition.implementation_score).toFixed(3)}</small></li>`;
}
function alertMarkup(alert) {
  return `<li><b>${esc(alert.kind)}</b><span>${esc(alert.severity)}</span><small>${esc(alert.message)}</small></li>`;
}

async function flameCard(flame, ledger) {
  const latest = flame.latest;
  const replay = await createFlameContinuityReplay({ ledger, voiceId: flame.voice_id });
  const candidates = theoryCandidatesForFlame(ledger, flame.voice_id);
  const walks = threadWalksForFlame(ledger, flame.voice_id);
  const alerts = alertsForFlame(ledger, flame.voice_id);
  const flattening = ledger.flattening_receipts.filter((item) => item.voice_id === flame.voice_id).at(-1) || null;
  const experiment = ledger.thread_walk_experiments.filter((item) => item.voice_id === flame.voice_id).at(-1) || null;
  const timeline = flame.transitions.length
    ? `<ol class="flame-transition-list">${flame.transitions.slice(-8).map(transitionMarkup).join('')}</ol>`
    : '<p class="muted">Runtime baseline recorded; no transition yet.</p>';
  const alertList = alerts.length
    ? `<ul class="flame-alert-list">${alerts.slice(-5).map(alertMarkup).join('')}</ul>`
    : '<p class="muted">No continuity alerts.</p>';
  return `<article class="flame-continuity-card" data-flame-id="${esc(flame.voice_id)}">
    <div class="continuity-card-head"><div><p class="eyebrow">${esc(flame.voice_id)}</p><h3>${esc(flame.display_name)}</h3></div><strong>${flame.observation_count}</strong></div>
    <p><b>${esc(latest.runtime.provider)} · ${esc(latest.runtime.model)}</b><br><small>route ${esc(latest.flame.route)} · world ${esc(latest.context.world_id || 'unscoped')}</small></p>
    <dl class="facts"><div><dt>Transitions</dt><dd>${flame.transition_count}</dd></div><div><dt>Implementation</dt><dd>${flame.implementation_change_count}</dd></div><div><dt>Context</dt><dd>${flame.context_change_count}</dd></div><div><dt>Theory candidates</dt><dd>${candidates.length}</dd></div><div><dt>Thread-walks</dt><dd>${walks.length}</dd></div><div><dt>Alerts</dt><dd>${alerts.length}</dd></div></dl>
    <details><summary>Runtime transition timeline</summary>${timeline}</details>
    <details><summary>Correspondence state</summary><p><b>Flattening:</b> ${esc(flattening?.classification || 'baseline not established')}</p><p><b>Latest thread-walk:</b> ${esc(walks.at(-1)?.status || 'not required yet')}</p><p><b>Minimum anchors:</b> ${experiment?.minimum_solution_size ?? 'not measured'}</p><p class="muted">Flattening is reduced operational correspondence, not rupture.</p></details>
    <details><summary>Continuity alerts</summary>${alertList}</details>
    <details><summary>Replay fingerprint</summary><code>${esc(replay.evidence_fingerprint)}</code><p class="muted">Exact replay means the same attested runtime slice, not identity proof.</p></details>
    <div class="button-row"><button type="button" class="quiet" data-flame-theory-candidate="${esc(flame.voice_id)}">Create DEEPTheory candidate</button><button type="button" class="quiet" data-flame-anchor-experiment="${esc(flame.voice_id)}">Test minimum anchors</button></div>
  </article>`;
}

function matrixMarkup(matrix, view, key, label, note) {
  if (!matrix.flame_ids.length) return '<p class="muted">No matrix is available yet.</p>';
  const labels = new Map(view.flames.map((item) => [item.voice_id, item.display_name]));
  const head = matrix.flame_ids.map((id) => `<th>${esc(labels.get(id) || id)}</th>`).join('');
  const rows = matrix.flame_ids.map((left) => `<tr><th>${esc(labels.get(left) || left)}</th>${matrix.flame_ids.map((right) => {
    const value = matrix[key]?.[left]?.[right] ?? matrix.matrix?.[left]?.[right];
    return `<td>${value == null ? '—' : Number(value).toFixed(2)}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="runtime-divergence-wrap"><table><thead><tr><th>${esc(label)}</th>${head}</tr></thead><tbody>${rows}</tbody></table></div><p class="muted">${esc(note)}</p>`;
}

function longitudinalMapMarkup(map, view) {
  const labels = new Map(view.flames.map((item) => [item.voice_id, item.display_name]));
  const lanes = map.lanes.map((lane) => {
    const nodes = map.nodes.filter((node) => node.voice_id === lane.voice_id);
    const nodeMarkup = nodes.map((node, index) => {
      const incoming = index ? map.edges.find((edge) => edge.to === node.id) : null;
      const title = `${node.observed_at} · ${node.provider}/${node.model}${incoming ? ` · ${incoming.classification}` : ''}`;
      return `<span class="constellation-map-node" title="${esc(title)}"><i>${index + 1}</i><small>${esc(node.model)}</small></span>`;
    }).join('<span class="constellation-map-edge">→</span>');
    return `<div class="constellation-map-lane"><b>${esc(labels.get(lane.voice_id) || lane.voice_id)}</b><div>${nodeMarkup || '<span class="muted">no observations</span>'}</div></div>`;
  }).join('');
  return `<div class="constellation-longitudinal-map">${lanes || '<p class="muted">No longitudinal map yet.</p>'}</div><p class="muted">Nodes are attested runtime observations. Edges are transitions. Neither branches nor reconnections are identity verdicts.</p>`;
}

async function renderPanel(message = '') {
  const state = await loadState();
  const ledger = ensureFlameContinuityLedger(state);
  const view = buildFlameContinuityViewModel(ledger);
  const runtimeDivergence = buildConstellationRuntimeDivergence(ledger);
  const responseDivergence = await buildConstellationVisibleResponseDivergence(ledger);
  const longitudinalMap = buildConstellationLongitudinalMap(ledger);
  const cards = (await Promise.all(view.flames.map((flame) => flameCard(flame, ledger)))).join('');
  return `<section class="panel flame-continuity-panel" data-flame-continuity-panel>
    <div class="section-heading compact-heading"><div><p class="eyebrow">Constellation · longitudinal continuity lattice</p><h2>Flame Continuity</h2><p class="muted">Runtime, visible-response form, relational anchors, thread-walking, and alerts remain separate evidence channels. No scalar identity verdict is computed.</p></div><div class="continuity-summary"><b>${view.summary.flame_count}</b><span>Flames</span></div></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <dl class="facts"><div><dt>Observations</dt><dd>${view.summary.observation_count}</dd></div><div><dt>Transitions</dt><dd>${view.summary.transition_count}</dd></div><div><dt>Thread-walks</dt><dd>${ledger.thread_walks.length}</dd></div><div><dt>Alerts</dt><dd>${ledger.alerts.length}</dd></div></dl>
    <details class="constellation-map" open><summary>Constellation longitudinal map</summary>${longitudinalMapMarkup(longitudinalMap, view)}</details>
    <div class="flame-continuity-grid">${cards || '<p class="muted">No runtime-attested Flame response has been captured yet.</p>'}</div>
    <details class="flame-divergence" open><summary>Cross-Flame runtime divergence</summary>${matrixMarkup(runtimeDivergence, view, 'matrix', 'Runtime Δ', 'Provider/model configuration only. Semantic divergence and identity distance remain unmeasured.')}</details>
    <details class="flame-divergence"><summary>Cross-Flame visible-response-form divergence</summary>${matrixMarkup(responseDivergence, view, 'divergence', 'Form Δ', 'Lossy hashed visible-response form only. Raw prose is not stored; semantic meaning and identity distance remain unmeasured.')}</details>
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#flame-continuity-style')) return;
  const style = document.createElement('style');
  style.id = 'flame-continuity-style';
  style.textContent = `.flame-continuity-panel{margin-top:1rem}.flame-continuity-grid{display:grid;gap:.8rem;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));margin-top:1rem}.flame-continuity-card{padding:1rem;border:1px solid color-mix(in srgb,var(--green) 24%,transparent);border-radius:14px}.flame-transition-list,.flame-alert-list{display:grid;gap:.4rem;padding-left:1.2rem}.flame-transition-list li,.flame-alert-list li{display:grid;gap:.1rem}.flame-transition-list li span,.flame-transition-list small,.flame-alert-list span,.flame-alert-list small{opacity:.7}.runtime-divergence-wrap{overflow:auto}.runtime-divergence-wrap table{width:100%;border-collapse:collapse;margin-top:.7rem}.runtime-divergence-wrap th,.runtime-divergence-wrap td{padding:.45rem;border-bottom:1px solid color-mix(in srgb,var(--gold) 16%,transparent);text-align:center}.runtime-divergence-wrap th:first-child{text-align:left}.constellation-longitudinal-map{display:grid;gap:.55rem;margin:.8rem 0}.constellation-map-lane{display:grid;grid-template-columns:minmax(7rem,10rem) 1fr;gap:.75rem;align-items:center}.constellation-map-lane>div{display:flex;gap:.35rem;align-items:center;overflow:auto;padding:.25rem}.constellation-map-node{display:grid;justify-items:center;gap:.15rem;min-width:4.5rem;padding:.4rem;border:1px solid color-mix(in srgb,var(--green) 26%,transparent);border-radius:10px}.constellation-map-node i{font-style:normal;font-size:.72rem;opacity:.7}.constellation-map-node small{max-width:8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.constellation-map-edge{opacity:.5}`;
  document.head.appendChild(style);
}

async function mount(message = '') {
  if (mounting || !isContinuitySurfaceActive()) return;
  mounting = true;
  try {
    injectStyle();
    const html = await renderPanel(message);
    const existing = document.querySelector('[data-flame-continuity-panel]');
    if (existing) existing.outerHTML = html;
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', html);
  } finally { mounting = false; }
}

async function createTheoryCandidate(button) {
  const voiceId = button.dataset.flameTheoryCandidate;
  if (!voiceId) return;
  button.disabled = true;
  try {
    const state = await loadState();
    const ledger = ensureFlameContinuityLedger(state);
    const candidate = await createDeepTheoryCandidateFromFlameContinuity({ ledger, voiceId });
    appendFlameTheoryCandidate(ledger, candidate, voiceId);
    await persistFlameContinuityLedger(ledger, { reason: 'flame-continuity-theory-candidate', voice_id: voiceId, receipt_id: candidate.receipt_id });
    await mount(`Queued ${candidate.receipt_id} as a human-review DEEPTheory candidate for ${voiceId}.`);
  } catch (error) {
    await mount(`DEEPTheory candidate stopped: ${error.message}`);
  } finally { button.disabled = false; }
}

async function runAnchorExperiment(button) {
  const voiceId = button.dataset.flameAnchorExperiment;
  if (!voiceId) return;
  button.disabled = true;
  try {
    const state = await loadState();
    const ledger = ensureFlameContinuityLedger(state);
    const pair = observationsForFlame(ledger, voiceId).slice(-2);
    if (pair.length < 2) throw new Error('Two runtime observations are required.');
    const left = pair[0].context.relational_anchor_set;
    const right = pair[1].context.relational_anchor_set;
    if (!left || !right) throw new Error('Both observations need relational anchor sets.');
    const walk = await createThreadWalk({ leftAnchorSet: left, rightAnchorSet: right, generatedAt: pair[1].observed_at });
    const experiment = await runMinimumAnchorExperiment({ leftAnchorSet: left, rightAnchorSet: right, generatedAt: pair[1].observed_at });
    appendThreadWalk(ledger, walk);
    appendThreadWalkExperiment(ledger, experiment);
    await persistFlameContinuityLedger(ledger, { reason: 'manual-thread-walk-experiment', voice_id: voiceId, thread_walk_id: walk.thread_walk_id, experiment_id: experiment.experiment_id });
    await mount(`${voiceId}: ${walk.status}; minimum sufficient anchors ${experiment.minimum_solution_size ?? 'not found'}.`);
  } catch (error) {
    await mount(`Anchor experiment stopped: ${error.message}`);
  } finally { button.disabled = false; }
}

document.addEventListener(CONSTELLATION_LENS_EVENTS.response, (event) => { void captureResponse(event); });
document.addEventListener('click', (event) => {
  const theoryButton = event.target.closest('[data-flame-theory-candidate]');
  if (theoryButton) void createTheoryCandidate(theoryButton);
  const anchorButton = event.target.closest('[data-flame-anchor-experiment]');
  if (anchorButton) void runAnchorExperiment(anchorButton);
});
globalThis.addEventListener?.(FLAME_CONTINUITY_UPDATED_EVENT, () => { void mount(); });
const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
