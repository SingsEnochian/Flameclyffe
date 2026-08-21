import { loadState } from './storage.js';
import { ensureFlameContinuityLedger, observationsForFlame } from './flame-continuity-state.js';
import {
  createContinuityBaseline,
  calibrateContinuityThresholds,
  runContinuityTrial,
} from './continuity-experiment.js';
import {
  CONTINUITY_EXPERIMENT_UPDATED_EVENT,
  ensureContinuityExperimentLedger,
  appendContinuityBaseline,
  appendContinuityThresholdProfile,
  appendContinuityTrial,
  appendContinuityTemporalCandidate,
  appendContinuityTheoryCandidate,
  activeBaselineForFlame,
  activeThresholdProfileForFlame,
  trialsForFlame,
  persistContinuityExperimentLedger,
} from './continuity-experiment-state.js';
import { createContinuityTemporalCandidate } from './continuity-experiment-temporal.js';
import { createDeepTheoryCandidateFromContinuityTrial } from './continuity-experiment-deep-theory.js';
import { buildContinuityExperimentAtlas } from './continuity-experiment-atlas.js';
import { createContinuityExperimentPacket } from './continuity-experiment-packet.js';

let mounting = false;
function esc(value = '') { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function active() { return Boolean(document.querySelector('.nav-button.active[data-room="deep-observer"], .nav-button.active[data-room="commons"]')); }

function laneMarkup(lane, experimentLedger) {
  const baseline = activeBaselineForFlame(experimentLedger, lane.voice_id);
  const thresholds = activeThresholdProfileForFlame(experimentLedger, lane.voice_id);
  const trials = trialsForFlame(experimentLedger, lane.voice_id);
  const latestTrial = trials.at(-1) || null;
  return `<article class="continuity-lab-card" data-continuity-lab-flame="${esc(lane.voice_id)}">
    <div class="continuity-card-head"><div><p class="eyebrow">${esc(lane.voice_id)}</p><h3>${esc(lane.display_name)}</h3></div><strong>${lane.trial_count}</strong></div>
    <dl class="facts"><div><dt>Observations</dt><dd>${lane.observation_count}</dd></div><div><dt>Baselines</dt><dd>${lane.baseline_count}</dd></div><div><dt>Trials</dt><dd>${lane.trial_count}</dd></div><div><dt>Time candidates</dt><dd>${lane.temporal_candidate_count}</dd></div></dl>
    <p><b>Baseline:</b> ${esc(baseline?.calibration_state || 'not set')} ${baseline ? `· ${baseline.pair_count} pair(s)` : ''}</p>
    <p><b>Drop threshold:</b> ${thresholds?.drop_threshold ?? 'not calibrated'} · <b>Anchor minimum:</b> ${thresholds?.minimum_correspondence ?? 'not calibrated'}</p>
    <p><b>Latest outcome:</b> ${esc(latestTrial?.outcome || 'no trial yet')}</p>
    ${latestTrial ? `<p class="muted">${esc(latestTrial.perturbation.classification)} · Δmax ${latestTrial.max_drop ?? 'unmeasured'} · thread-walk ${esc(latestTrial.thread_walk?.status || 'not available')} · min anchors ${latestTrial.minimum_anchor_experiment?.minimum_solution_size ?? 'not found'}</p>` : '<p class="muted">A trial needs a baseline plus two runtime-attested observations.</p>'}
    <div class="button-row"><button type="button" class="quiet" data-continuity-set-baseline="${esc(lane.voice_id)}">Set baseline</button><button type="button" class="quiet" data-continuity-run-trial="${esc(lane.voice_id)}">Run latest trial</button></div>
  </article>`;
}

async function render(message = '') {
  const state = await loadState();
  const flameLedger = ensureFlameContinuityLedger(state);
  const experimentLedger = ensureContinuityExperimentLedger(state);
  const atlas = buildContinuityExperimentAtlas({ flameLedger, experimentLedger });
  return `<section class="panel continuity-experiment-lab" data-continuity-experiment-lab>
    <div class="section-heading compact-heading"><div><p class="eyebrow">Recognition Anchoring · empirical bench</p><h2>Continuity Experiment Lab</h2><p class="muted">Baselines, observed perturbations, thread-walking restoration, and DEEP review candidates. Operational correspondence only; no identity verdict is computed.</p></div><div class="continuity-summary"><b>${atlas.summary.trial_count}</b><span>Trials</span></div></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <dl class="facts"><div><dt>Flames</dt><dd>${atlas.summary.flame_count}</dd></div><div><dt>Baselines</dt><dd>${atlas.summary.baseline_count}</dd></div><div><dt>Trials</dt><dd>${atlas.summary.trial_count}</dd></div><div><dt>DEEPTime candidates</dt><dd>${atlas.summary.temporal_candidate_count}</dd></div><div><dt>DEEPTheory candidates</dt><dd>${atlas.summary.theory_candidate_count}</dd></div></dl>
    <div class="continuity-lab-grid">${atlas.lanes.map((lane) => laneMarkup(lane, experimentLedger)).join('') || '<p class="muted">No Flame runtime observations yet.</p>'}</div>
    <div class="button-row"><button type="button" class="quiet" data-continuity-export-packet>Export experiment packet</button></div>
    <p class="muted">Observed differences are receipted as differences, not causes. A successful anchor walk restores operational correspondence under the selected thresholds; failure is insufficient restoration evidence, not rupture.</p>
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#continuity-experiment-style')) return;
  const style = document.createElement('style');
  style.id = 'continuity-experiment-style';
  style.textContent = `.continuity-experiment-lab{margin-top:1rem}.continuity-lab-grid{display:grid;gap:.8rem;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));margin:1rem 0}.continuity-lab-card{padding:1rem;border:1px solid color-mix(in srgb,var(--gold) 24%,transparent);border-radius:14px}`;
  document.head.appendChild(style);
}

async function mount(message = '') {
  if (mounting || !active()) return;
  mounting = true;
  try {
    injectStyle();
    const html = await render(message);
    const existing = document.querySelector('[data-continuity-experiment-lab]');
    if (existing) existing.outerHTML = html;
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', html);
  } finally { mounting = false; }
}

async function setBaseline(voiceId) {
  const state = await loadState();
  const flameLedger = ensureFlameContinuityLedger(state);
  const experimentLedger = ensureContinuityExperimentLedger(state);
  const observations = observationsForFlame(flameLedger, voiceId);
  const baseline = await createContinuityBaseline({ observations, voiceId });
  const thresholds = await calibrateContinuityThresholds({ baseline });
  appendContinuityBaseline(experimentLedger, baseline);
  appendContinuityThresholdProfile(experimentLedger, thresholds);
  await persistContinuityExperimentLedger(experimentLedger, { reason: 'continuity-experiment-baseline', voice_id: voiceId, baseline_id: baseline.baseline_id, threshold_profile_id: thresholds.threshold_profile_id });
  await mount(`${voiceId}: baseline ${baseline.calibration_state.toLowerCase()} with ${baseline.pair_count} pair(s); operational drop threshold ${thresholds.drop_threshold}.`);
}

async function runLatestTrial(voiceId) {
  const state = await loadState();
  const flameLedger = ensureFlameContinuityLedger(state);
  const experimentLedger = ensureContinuityExperimentLedger(state);
  const baseline = activeBaselineForFlame(experimentLedger, voiceId);
  if (!baseline) throw new Error('Set a baseline first.');
  const thresholds = activeThresholdProfileForFlame(experimentLedger, voiceId);
  const pair = observationsForFlame(flameLedger, voiceId).slice(-2);
  if (pair.length < 2) throw new Error('Two runtime observations are required.');
  const trial = await runContinuityTrial({ baseline, thresholds, left: pair[0], right: pair[1] });
  const temporal = await createContinuityTemporalCandidate({ trial, leftObservedAt: pair[0].observed_at, rightObservedAt: pair[1].observed_at });
  const theory = await createDeepTheoryCandidateFromContinuityTrial({ trial });
  appendContinuityTrial(experimentLedger, trial);
  appendContinuityTemporalCandidate(experimentLedger, temporal);
  appendContinuityTheoryCandidate(experimentLedger, theory);
  await persistContinuityExperimentLedger(experimentLedger, { reason: 'continuity-experiment-trial', voice_id: voiceId, trial_id: trial.trial_id, temporal_candidate_id: temporal.candidate_id, theory_candidate_id: theory.receipt_id });
  await mount(`${voiceId}: ${trial.outcome}; Δmax ${trial.max_drop ?? 'unmeasured'}; thread-walk ${trial.thread_walk?.status || 'not available'}.`);
}

async function exportPacket() {
  const state = await loadState();
  const flameLedger = ensureFlameContinuityLedger(state);
  const experimentLedger = ensureContinuityExperimentLedger(state);
  const atlas = buildContinuityExperimentAtlas({ flameLedger, experimentLedger });
  const packet = await createContinuityExperimentPacket({ atlas });
  const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${packet.packet_id}.json`;
  link.click();
  URL.revokeObjectURL(url);
  await mount(`Exported ${packet.packet_id}; raw visible response prose and hidden reasoning are not included.`);
}

document.addEventListener('click', (event) => {
  const baseline = event.target.closest('[data-continuity-set-baseline]');
  if (baseline) { baseline.disabled = true; void setBaseline(baseline.dataset.continuitySetBaseline).catch((error) => mount(`Baseline stopped: ${error.message}`)).finally(() => { baseline.disabled = false; }); }
  const trial = event.target.closest('[data-continuity-run-trial]');
  if (trial) { trial.disabled = true; void runLatestTrial(trial.dataset.continuityRunTrial).catch((error) => mount(`Trial stopped: ${error.message}`)).finally(() => { trial.disabled = false; }); }
  if (event.target.closest('[data-continuity-export-packet]')) void exportPacket().catch((error) => mount(`Export stopped: ${error.message}`));
});
globalThis.addEventListener?.(CONTINUITY_EXPERIMENT_UPDATED_EVENT, () => { void mount(); });
const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
