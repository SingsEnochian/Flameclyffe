import { CONSTELLATION_LENS_EVENTS } from './constellation-lens.js';
import { createFlameRuntimeCorrespondence, createFlameRuntimeObservation } from './flame-continuity.js';
import { buildFlameContinuityViewModel } from './flame-continuity-view.js';
import { createFlameContinuityReplay } from './flame-continuity-replay.js';
import { createDeepTheoryCandidateFromFlameContinuity } from './flame-continuity-deep-theory-bridge.js';
import { buildConstellationRuntimeDivergence } from './constellation-runtime-divergence.js';
import {
  FLAME_CONTINUITY_UPDATED_EVENT,
  appendFlameRuntimeObservation,
  appendFlameTheoryCandidate,
  ensureFlameContinuityLedger,
  observationsForFlame,
  persistFlameContinuityLedger,
  theoryCandidatesForFlame,
} from './flame-continuity-state.js';
import {
  appendContinuityEvidence,
  ensureContinuityEvidenceLedger,
  persistContinuityEvidenceLedger,
} from './continuity-evidence-state.js';
import { loadState } from './storage.js';

let mounting = false;
let capturing = false;

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

function contextChanged(left, right) {
  return left.context.world_id !== right.context.world_id;
}

async function captureResponse(event) {
  if (capturing) return;
  const detail = event.detail || {};
  if (!detail.runtimeVerified || !detail.voiceId || !detail.provider || !detail.model) return;
  capturing = true;
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
    });
    appendFlameRuntimeObservation(flameLedger, observation);
    await persistFlameContinuityLedger(flameLedger, { observation_id: observation.observation_id, voice_id: detail.voiceId });

    if (prior && prior.fingerprint !== observation.fingerprint && (implementationChanged(prior, observation) || contextChanged(prior, observation))) {
      const correspondence = await createFlameRuntimeCorrespondence({ left: prior, right: observation });
      const evidenceLedger = ensureContinuityEvidenceLedger(await loadState());
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
    }
  } catch (error) {
    console.warn('Flame continuity capture stopped:', error);
  } finally { capturing = false; }
}

function isContinuitySurfaceActive() {
  return Boolean(document.querySelector('.nav-button.active[data-room="deep-observer"], .nav-button.active[data-room="commons"]'));
}

function transitionMarkup(transition) {
  const changed = Object.entries(transition.changes).filter(([, value]) => value).map(([key]) => key).join(', ') || 'none';
  return `<li><b>${esc(transition.classification)}</b><span>${esc(changed)}</span><small>${esc(transition.observed_at)} · implementation ${Number(transition.implementation_score).toFixed(3)}</small></li>`;
}

async function flameCard(flame, ledger) {
  const latest = flame.latest;
  const replay = await createFlameContinuityReplay({ ledger, voiceId: flame.voice_id });
  const candidates = theoryCandidatesForFlame(ledger, flame.voice_id);
  const timeline = flame.transitions.length
    ? `<ol class="flame-transition-list">${flame.transitions.slice(-8).map(transitionMarkup).join('')}</ol>`
    : '<p class="muted">Runtime baseline recorded; no transition yet.</p>';
  return `<article class="flame-continuity-card" data-flame-id="${esc(flame.voice_id)}">
    <div class="continuity-card-head"><div><p class="eyebrow">${esc(flame.voice_id)}</p><h3>${esc(flame.display_name)}</h3></div><strong>${flame.observation_count}</strong></div>
    <p><b>${esc(latest.runtime.provider)} · ${esc(latest.runtime.model)}</b><br><small>route ${esc(latest.flame.route)} · world ${esc(latest.context.world_id || 'unscoped')}</small></p>
    <dl class="facts"><div><dt>Transitions</dt><dd>${flame.transition_count}</dd></div><div><dt>Implementation</dt><dd>${flame.implementation_change_count}</dd></div><div><dt>Context</dt><dd>${flame.context_change_count}</dd></div><div><dt>Theory candidates</dt><dd>${candidates.length}</dd></div></dl>
    <details><summary>Runtime transition timeline</summary>${timeline}</details>
    <details><summary>Replay fingerprint</summary><code>${esc(replay.evidence_fingerprint)}</code><p class="muted">Exact replay means the same attested runtime slice, not identity proof.</p></details>
    <div class="button-row"><button type="button" class="quiet" data-flame-theory-candidate="${esc(flame.voice_id)}">Create DEEPTheory candidate</button></div>
  </article>`;
}

function divergenceMarkup(divergence, view) {
  if (!divergence.flame_ids.length) return '<p class="muted">No cross-Flame runtime matrix is available yet.</p>';
  const labels = new Map(view.flames.map((item) => [item.voice_id, item.display_name]));
  const head = divergence.flame_ids.map((id) => `<th>${esc(labels.get(id) || id)}</th>`).join('');
  const rows = divergence.flame_ids.map((left) => `<tr><th>${esc(labels.get(left) || left)}</th>${divergence.flame_ids.map((right) => {
    const value = divergence.matrix[left]?.[right];
    return `<td>${value == null ? '—' : Number(value).toFixed(2)}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="runtime-divergence-wrap"><table><thead><tr><th>Runtime Δ</th>${head}</tr></thead><tbody>${rows}</tbody></table></div><p class="muted">This matrix compares provider/model configuration only. Semantic divergence and identity distance remain unmeasured.</p>`;
}

async function renderPanel(message = '') {
  const state = await loadState();
  const ledger = ensureFlameContinuityLedger(state);
  const view = buildFlameContinuityViewModel(ledger);
  const divergence = buildConstellationRuntimeDivergence(ledger);
  const cards = (await Promise.all(view.flames.map((flame) => flameCard(flame, ledger)))).join('');
  return `<section class="panel flame-continuity-panel" data-flame-continuity-panel>
    <div class="section-heading compact-heading"><div><p class="eyebrow">Constellation · longitudinal runtime lineage</p><h2>Flame Continuity</h2><p class="muted">Provider, model, route, profile, and context changes remain inspectable implementation history. No scalar identity verdict is computed.</p></div><div class="continuity-summary"><b>${view.summary.flame_count}</b><span>Flames</span></div></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <dl class="facts"><div><dt>Observations</dt><dd>${view.summary.observation_count}</dd></div><div><dt>Transitions</dt><dd>${view.summary.transition_count}</dd></div><div><dt>Implementation changes</dt><dd>${view.summary.implementation_change_count}</dd></div><div><dt>Context changes</dt><dd>${view.summary.context_change_count}</dd></div></dl>
    <div class="flame-continuity-grid">${cards || '<p class="muted">No runtime-attested Flame response has been captured yet.</p>'}</div>
    <details class="flame-divergence" open><summary>Cross-Flame runtime divergence</summary>${divergenceMarkup(divergence, view)}</details>
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#flame-continuity-style')) return;
  const style = document.createElement('style');
  style.id = 'flame-continuity-style';
  style.textContent = `.flame-continuity-panel{margin-top:1rem}.flame-continuity-grid{display:grid;gap:.8rem;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));margin-top:1rem}.flame-continuity-card{padding:1rem;border:1px solid color-mix(in srgb,var(--green) 24%,transparent);border-radius:14px}.flame-transition-list{display:grid;gap:.4rem;padding-left:1.2rem}.flame-transition-list li{display:grid;gap:.1rem}.flame-transition-list li span,.flame-transition-list small{opacity:.7}.runtime-divergence-wrap{overflow:auto}.runtime-divergence-wrap table{width:100%;border-collapse:collapse;margin-top:.7rem}.runtime-divergence-wrap th,.runtime-divergence-wrap td{padding:.45rem;border-bottom:1px solid color-mix(in srgb,var(--gold) 16%,transparent);text-align:center}.runtime-divergence-wrap th:first-child{text-align:left}`;
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

document.addEventListener(CONSTELLATION_LENS_EVENTS.response, (event) => { void captureResponse(event); });
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-flame-theory-candidate]');
  if (button) void createTheoryCandidate(button);
});
globalThis.addEventListener?.(FLAME_CONTINUITY_UPDATED_EVENT, () => { void mount(); });
const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
