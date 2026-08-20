import { CONSTELLATION_LENS_EVENTS } from './constellation-lens.js';
import { createFlameRuntimeCorrespondence, createFlameRuntimeObservation } from './flame-continuity.js';
import {
  FLAME_CONTINUITY_UPDATED_EVENT,
  appendFlameRuntimeObservation,
  ensureFlameContinuityLedger,
  observationsForFlame,
  persistFlameContinuityLedger,
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

async function renderPanel() {
  const state = await loadState();
  const ledger = ensureFlameContinuityLedger(state);
  const byVoice = new Map();
  for (const item of ledger.observations) {
    const list = byVoice.get(item.flame.voice_id) || [];
    list.push(item);
    byVoice.set(item.flame.voice_id, list);
  }
  const cards = [...byVoice.entries()].map(([voiceId, observations]) => {
    const latest = observations.at(-1);
    const changes = observations.slice(1).filter((item, index) => implementationChanged(observations[index], item)).length;
    return `<article class="flame-continuity-card"><b>${esc(latest.flame.display_name || voiceId)}</b><span>${esc(latest.runtime.provider)} · ${esc(latest.runtime.model)}</span><small>${observations.length} attested observations · ${changes} implementation change${changes === 1 ? '' : 's'}</small></article>`;
  }).join('');
  return `<section class="panel flame-continuity-panel" data-flame-continuity-panel>
    <div class="section-heading compact-heading"><div><p class="eyebrow">Constellation · runtime lineage</p><h2>Flame Continuity</h2><p class="muted">Provider, model, route, and context changes are receipted as implementation history. They do not become identity verdicts.</p></div></div>
    <div class="flame-continuity-grid">${cards || '<p class="muted">No runtime-attested Flame response has been captured yet.</p>'}</div>
  </section>`;
}

async function mount() {
  if (mounting || !isContinuitySurfaceActive()) return;
  mounting = true;
  try {
    const html = await renderPanel();
    const existing = document.querySelector('[data-flame-continuity-panel]');
    if (existing) existing.outerHTML = html;
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', html);
  } finally { mounting = false; }
}

document.addEventListener(CONSTELLATION_LENS_EVENTS.response, (event) => { void captureResponse(event); });
globalThis.addEventListener?.(FLAME_CONTINUITY_UPDATED_EVENT, () => { void mount(); });
const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
