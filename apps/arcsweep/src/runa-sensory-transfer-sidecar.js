import { loadState, persistObservatoryStore } from './storage.js';
import {
  SENSORY_MODES,
  SENSORY_SEMANTIC_STATES,
  RUNA_SENSORY_PROFILE_SCHEMA,
  compileSensoryTransferPlan,
  createDefaultSensoryTransferProfile,
  createSensoryTransferRenderReceipt,
  createSensoryTransferResponse,
  profileWithCalibrationReceipt,
} from './runa-sensory-transfer.js';
import {
  launchSensoryTransferPlan,
  sensoryTransferIsActive,
  stopSensoryTransfer,
} from './runa-sensory-transfer-player.js';

const MAX_ITEMS = 60;
let mounting = false;
let selectedMode = 'field';
let selectedSemantic = 'presence';
let message = '';

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function score(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.min(5, number)) : null;
}

function latestForWorld(items, worldId) {
  return [...(items || [])].reverse().find((item) => item.world_id === worldId || item.world?.id === worldId) || null;
}

async function context() {
  const state = await loadState();
  const world = state.worlds.find((item) => item.id === state.activeWorldId) || state.worlds[0] || null;
  if (!world) return null;
  const obs = state.observatory || {};
  const profile = [...(obs.runa_sensory_profiles || [])].reverse().find((item) => item?.schema === RUNA_SENSORY_PROFILE_SCHEMA) || null;
  const plan = latestForWorld(obs.runa_sensory_transfer_plans, world.id);
  const render = plan
    ? [...(obs.runa_sensory_transfer_renders || [])].reverse().find((item) => item.source?.plan_id === plan.plan_id) || null
    : null;
  const response = render
    ? [...(obs.runa_sensory_transfer_responses || [])].reverse().find((item) => item.source?.render_id === render.render_id) || null
    : null;
  return { state, obs, world, profile, plan, render, response };
}

function modeStats(obs, worldId) {
  const plansById = new Map((obs.runa_sensory_transfer_plans || []).filter((item) => item.world?.id === worldId).map((item) => [item.plan_id, item]));
  const rendersById = new Map((obs.runa_sensory_transfer_renders || []).filter((item) => item.world_id === worldId).map((item) => [item.render_id, item]));
  const buckets = Object.fromEntries(SENSORY_MODES.map((mode) => [mode, []]));
  for (const response of obs.runa_sensory_transfer_responses || []) {
    if (response.world_id !== worldId) continue;
    const render = rendersById.get(response.source?.render_id);
    const plan = render ? plansById.get(render.source?.plan_id) : null;
    const mode = plan?.transfer?.mode;
    const clarity = Number(response.participant_report?.clarity);
    if (mode && Number.isFinite(clarity)) buckets[mode].push(clarity);
  }
  return Object.fromEntries(Object.entries(buckets).map(([mode, values]) => [mode, values.length ? values.reduce((a, b) => a + b, 0) / values.length : null]));
}

function profileMarkup(profile) {
  if (!profile) return '<p class="muted">No calibration profile receipted yet. The first compiled trial will create v1.</p>';
  return `<div class="callout"><b>${esc(profile.profile_id)}</b> · ${esc(profile.participant_ref)} · ${profile.calibration_receipt_refs.length} calibration receipt(s) · Qualia inferred: no</div>`;
}

function responseMarkup(render, response) {
  if (!render) return '';
  if (response) {
    const p = response.participant_report;
    return `<div class="callout"><b>Calibration receipted</b> · ${esc(response.response_id)} · noticed ${p.noticed ? 'yes' : 'no'} · clarity ${p.clarity ?? 'open'} · comfort ${p.comfort ?? 'open'} · confidence ${p.confidence ?? 'open'}</div>`;
  }
  return `<article class="sensory-response-form"><p class="eyebrow">Participant response</p><div class="grid three compact-grid"><label>Noticed<select data-sensory-noticed><option value="yes">Yes</option><option value="no">No</option></select></label><label>Meaning heard/felt<select data-sensory-identified><option value="">Open / unsure</option>${Object.entries(SENSORY_SEMANTIC_STATES).map(([key, item]) => `<option value="${key}">${esc(item.label)}</option>`).join('')}</select></label><label>Clarity 1–5<input data-sensory-clarity type="number" min="1" max="5" step="1" value="3" /></label><label>Comfort 1–5<input data-sensory-comfort type="number" min="1" max="5" step="1" value="3" /></label><label>Confidence 1–5<input data-sensory-confidence type="number" min="1" max="5" step="1" value="3" /></label></div><label>First-person note<textarea data-sensory-note rows="2" placeholder="What was perceptible? What became clearer or less clear?"></textarea></label><button type="button" data-sensory-action="record-response">Record calibration receipt</button></article>`;
}

function perceptibilityMarkup(stats) {
  const bar = (mode) => {
    const value = stats[mode];
    const width = value == null ? 0 : Math.round((value / 5) * 100);
    return `<div class="sensory-meter-row"><b>${mode.toUpperCase()}</b><div class="sensory-meter"><span style="width:${width}%"></span></div><small>${value == null ? 'OPEN' : `${value.toFixed(2)}/5 clarity`}</small></div>`;
  };
  return `<article class="sensory-map"><p class="eyebrow">Semantic perceptibility map</p>${bar('air')}${bar('bone')}${bar('field')}<small>Calibration clarity only. This is not an audiogram and does not infer Qualia.</small></article>`;
}

function renderMarkup(c) {
  const { world, profile, plan, render, response, obs } = c;
  const stats = modeStats(obs, world.id);
  const modeButtons = SENSORY_MODES.map((mode) => `<button type="button" class="${selectedMode === mode ? '' : 'quiet'}" data-sensory-mode="${mode}">${mode.toUpperCase()}${mode === 'bone' ? ' · haptic' : ''}</button>`).join('');
  const semanticOptions = Object.entries(SENSORY_SEMANTIC_STATES).map(([key, item]) => `<option value="${key}" ${selectedSemantic === key ? 'selected' : ''}>${esc(item.label)} · ${esc(item.operation)}</option>`).join('');
  const active = sensoryTransferIsActive();
  const currentPlan = plan ? `<dl class="facts"><div><dt>Plan</dt><dd>${esc(plan.plan_id)}</dd></div><div><dt>State</dt><dd>${esc(plan.semantic.label)}</dd></div><div><dt>Mode</dt><dd>${esc(plan.transfer.mode.toUpperCase())}</dd></div><div><dt>Carriers</dt><dd>${esc(plan.transfer.carrier_plans.map((item) => item.carrier).join(' + '))}</dd></div><div><dt>Profile</dt><dd>v${plan.profile.version}</dd></div></dl>` : '<p class="muted">No compiled sensory transfer trial for this world yet.</p>';
  let execution = '';
  if (plan && !render) {
    execution = `<div class="button-row"><label>Launched by<input data-sensory-launcher value="Rowan" /></label><button type="button" data-sensory-action="launch">Launch ${esc(plan.transfer.mode.toUpperCase())} trial</button><button type="button" class="quiet" data-sensory-action="stop">Feather · stop all carriers</button></div>`;
  } else if (render) {
    execution = `<div class="callout"><b>Render receipted</b> · ${esc(render.render_id)} · audio ${render.runtime.audio_rendered ? 'rendered' : render.runtime.audio_requested ? 'unavailable' : 'not requested'} · haptic ${render.runtime.haptic_rendered ? 'rendered' : render.runtime.haptic_requested ? render.runtime.haptic_supported ? 'not rendered' : 'unsupported here' : 'not requested'}${render.runtime.stopped_early ? ` · stopped ${esc(render.runtime.stop_reason)}` : ''}</div>`;
  }
  return `<section class="panel runa-sensory-transfer" data-runa-sensory-transfer><div class="section-heading compact-heading"><div><p class="eyebrow">Meaning → carrier translation → participant receipt</p><h2>Bone / Air / Field</h2><p class="muted">Runa preserves the semantic relationship while the carrier changes. BONE currently targets surface haptics. Dedicated bone-conduction audio remains a separate future carrier, never silently simulated.</p></div><span class="bai-topology-badge">${active ? 'ACTIVE' : response ? 'RECEIPTED' : plan ? 'PLAN READY' : 'OPEN'}</span></div>${message ? `<p class="callout">${esc(message)}</p>` : ''}${profileMarkup(profile)}<article class="sensory-controls"><div class="button-row sensory-mode-row">${modeButtons}</div><div class="grid three compact-grid"><label>Semantic state<select data-sensory-semantic>${semanticOptions}</select></label><label>Intensity<input data-sensory-intensity type="range" min="0.05" max="1" step="0.05" value="0.45" /></label><label>Duration ms<input data-sensory-duration type="number" min="350" max="12000" step="50" value="2800" /></label></div><label>Participant profile<input data-sensory-participant value="${esc(profile?.participant_ref || 'Rowan')}" /></label><div class="button-row"><button type="button" data-sensory-action="compile">Compile ${selectedMode.toUpperCase()} trial</button>${active ? '<button type="button" class="quiet" data-sensory-action="stop">Feather · stop all carriers</button>' : ''}</div></article>${currentPlan}${execution}${responseMarkup(render, response)}${perceptibilityMarkup(stats)}</section>`;
}

function injectStyle() {
  if (document.querySelector('#runa-sensory-transfer-style')) return;
  const style = document.createElement('style');
  style.id = 'runa-sensory-transfer-style';
  style.textContent = `.runa-sensory-transfer{margin-top:1rem}.sensory-controls,.sensory-response-form,.sensory-map{display:grid;gap:.65rem;margin-top:.8rem;padding:.9rem 1rem;border:1px solid color-mix(in srgb,var(--gold) 22%,transparent);border-radius:12px}.sensory-mode-row button{min-width:7rem}.sensory-meter-row{display:grid;grid-template-columns:4rem minmax(8rem,1fr) 8rem;gap:.65rem;align-items:center}.sensory-meter{height:.65rem;border-radius:999px;background:color-mix(in srgb,var(--text) 12%,transparent);overflow:hidden}.sensory-meter span{display:block;height:100%;background:currentColor;opacity:.65}@media(max-width:760px){.sensory-meter-row{grid-template-columns:3.5rem 1fr}.sensory-meter-row small{grid-column:2}}`;
  document.head.appendChild(style);
}

async function mount(nextMessage = message) {
  if (mounting) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (!['Relational Feedback Chamber', 'Field · DEEP Observer'].includes(title)) {
    document.querySelector('[data-runa-sensory-transfer]')?.remove();
    return;
  }
  mounting = true;
  try {
    injectStyle();
    const c = await context();
    if (!c) return;
    message = nextMessage || '';
    const html = renderMarkup(c);
    const existing = document.querySelector('[data-runa-sensory-transfer]');
    if (existing) existing.outerHTML = html;
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', html);
  } finally {
    mounting = false;
  }
}

async function persistList(_state, key, value, idField, reason) {
  const latest = await loadState();
  const obs = structuredClone(latest.observatory || {});
  obs[key] ||= [];
  obs[key] = [...obs[key].filter((item) => item?.[idField] !== value?.[idField]), structuredClone(value)].slice(-MAX_ITEMS);
  await persistObservatoryStore(obs, { reason, sensoryTransferId: value?.[idField] });
}

async function persistProfile(_state, profile) {
  const latest = await loadState();
  const obs = structuredClone(latest.observatory || {});
  obs.runa_sensory_profiles ||= [];
  obs.runa_sensory_profiles = [...obs.runa_sensory_profiles.filter((item) => item.profile_id !== profile.profile_id), structuredClone(profile)].slice(-MAX_ITEMS);
  await persistObservatoryStore(obs, { reason: 'runa-sensory-profile', profileId: profile.profile_id });
}

document.addEventListener('click', async (event) => {
  const modeButton = event.target.closest('[data-sensory-mode]');
  if (modeButton) {
    selectedMode = modeButton.dataset.sensoryMode;
    await mount('Carrier mode selected. Nothing rendered.');
    return;
  }

  const button = event.target.closest('[data-sensory-action]');
  if (!button) return;
  try {
    const c = await context();
    if (!c) throw new Error('No active world is available.');
    const panel = button.closest('[data-runa-sensory-transfer]');
    const action = button.dataset.sensoryAction;

    if (action === 'stop') {
      const stopped = stopSensoryTransfer('Feather');
      await mount(stopped ? 'Feather received. Active audio and haptic carriers were stopped.' : 'No sensory transfer was active.');
      return;
    }

    if (action === 'compile') {
      selectedSemantic = panel.querySelector('[data-sensory-semantic]')?.value || selectedSemantic;
      const participantRef = panel.querySelector('[data-sensory-participant]')?.value?.trim() || 'local-participant';
      let profile = c.profile;
      if (!profile || profile.participant_ref !== participantRef) {
        profile = createDefaultSensoryTransferProfile({ participantRef });
        await persistProfile(c.state, profile);
      }
      const plan = await compileSensoryTransferPlan({
        world: c.world,
        profile,
        semanticKey: selectedSemantic,
        mode: selectedMode,
        intensity: panel.querySelector('[data-sensory-intensity]')?.value,
        durationMs: panel.querySelector('[data-sensory-duration]')?.value,
      });
      await persistList(c.state, 'runa_sensory_transfer_plans', plan, 'plan_id', 'runa-sensory-transfer-plan');
      await mount(`${plan.semantic.label} compiled for ${plan.transfer.mode.toUpperCase()}. Explicit launch is still required.`);
      return;
    }

    if (action === 'launch') {
      if (!c.plan) throw new Error('Compile a sensory transfer trial first.');
      const runtime = await launchSensoryTransferPlan(c.plan);
      const render = await createSensoryTransferRenderReceipt({
        plan: c.plan,
        runtime,
        launchedBy: panel.querySelector('[data-sensory-launcher]')?.value || c.profile?.participant_ref || 'local-participant',
      });
      await persistList(c.state, 'runa_sensory_transfer_renders', render, 'render_id', 'runa-sensory-transfer-render');
      const hapticNote = render.runtime.haptic_requested && !render.runtime.haptic_supported ? ' Haptic output was unsupported in this browser and was receipted as such.' : '';
      await mount(`Sensory transfer completed and receipted.${hapticNote}`);
      return;
    }

    if (action === 'record-response') {
      if (!c.render) throw new Error('A completed sensory render is required before response capture.');
      const response = await createSensoryTransferResponse({
        renderReceipt: c.render,
        noticed: panel.querySelector('[data-sensory-noticed]')?.value === 'yes',
        identifiedSemanticKey: panel.querySelector('[data-sensory-identified]')?.value || null,
        clarity: score(panel.querySelector('[data-sensory-clarity]')?.value),
        comfort: score(panel.querySelector('[data-sensory-comfort]')?.value),
        confidence: score(panel.querySelector('[data-sensory-confidence]')?.value),
        participantReport: panel.querySelector('[data-sensory-note]')?.value || '',
      });
      await persistList(c.state, 'runa_sensory_transfer_responses', response, 'response_id', 'runa-sensory-transfer-response');
      const baseProfile = c.profile || createDefaultSensoryTransferProfile({ participantRef: 'local-participant' });
      const nextProfile = profileWithCalibrationReceipt(baseProfile, response);
      await persistProfile(c.state, nextProfile);
      await mount(`Calibration response receipted. Sensory profile advanced to v${nextProfile.version}; no Qualia or PREMAQC value was inferred.`);
    }
  } catch (error) {
    await mount(error?.message || String(error));
  }
});

document.addEventListener('change', async (event) => {
  if (event.target.matches('[data-sensory-semantic]')) {
    selectedSemantic = event.target.value;
  }
});

document.addEventListener('arcsweep:rendered', () => { void mount(); });
window.addEventListener('hashchange', () => { void mount(); });

void mount();
