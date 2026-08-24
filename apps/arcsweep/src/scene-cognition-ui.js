import { buildFieldContext } from './constellation-lens.js';
import {
  createSceneObservationCell,
  runSceneCognitionPass,
  SCENE_COGNITION_DEFAULT_VOICES,
} from './scene-cognition.js';
import { KNOWLEDGE_LEARNING_EVENTS } from './knowledge-learning-store.js';

const PANEL_CLASS = 'scene-cognition-panel';
const VOICE_LABELS = Object.freeze({ uial: 'Uial', lioreal: 'Lioreal' });

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function selectedVoiceIds(root) {
  return [...root.querySelectorAll('[data-scene-cognition-voice]:checked')]
    .map((control) => control.dataset.sceneCognitionVoice)
    .filter(Boolean);
}

function observationMarkup(observation, voiceResult, pass) {
  const target = `${observation.target.kind}:${observation.target.id}`;
  const confidence = observation.confidence == null ? 'unscored' : `${Math.round(observation.confidence * 100)}%`;
  const keepLabel = observation.keepable ? 'Keep evidence' : 'Evidence unresolved';
  const reason = observation.keepable ? 'Verified against current scene prose.' : observation.reasons.join(' · ');
  return `
    <article class="scene-cognition-observation ${observation.keepable ? 'verified' : 'unverified'}"
      data-cognition-voice="${escapeHtml(voiceResult.voiceId)}"
      data-cognition-observation="${observation.index}">
      <div class="scene-cognition-observation-head">
        <strong>${escapeHtml(observation.observationKind)}</strong>
        <span>${escapeHtml(target)} · ${escapeHtml(confidence)}</span>
      </div>
      <p>${escapeHtml(observation.claim || 'Observation arrived without a claim.')}</p>
      <blockquote>${escapeHtml(observation.evidence || 'No evidence excerpt supplied.')}</blockquote>
      <div class="scene-cognition-observation-foot">
        <small>${escapeHtml(reason)}</small>
        <button type="button" class="quiet mini" data-cognition-keep ${observation.keepable ? '' : 'disabled'}>${escapeHtml(keepLabel)}</button>
      </div>
    </article>
  `;
}

function voiceMarkup(voiceResult, pass) {
  const label = voiceResult.voiceLabel || VOICE_LABELS[voiceResult.voiceId] || voiceResult.voiceId;
  if (voiceResult.status !== 'replied') {
    const detail = voiceResult.status === 'offline-no-token'
      ? 'Session token needed in the Constellation rail.'
      : voiceResult.error || voiceResult.reason || voiceResult.status;
    return `<article class="scene-cognition-voice-card unavailable">
      <div class="scene-cognition-voice-head"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(voiceResult.status)}</span></div>
      <p class="muted">${escapeHtml(detail)}</p>
    </article>`;
  }
  const observations = (voiceResult.observations || []).map((observation) => observationMarkup(observation, voiceResult, pass)).join('');
  return `<article class="scene-cognition-voice-card">
    <div class="scene-cognition-voice-head">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml([voiceResult.provider, voiceResult.model].filter(Boolean).join(' · ') || 'runtime reply')}</span>
    </div>
    ${voiceResult.contribution ? `<p class="scene-cognition-contribution">${escapeHtml(voiceResult.contribution)}</p>` : '<p class="muted">Quiet contribution.</p>'}
    ${voiceResult.overflowCount ? `<p class="muted">${voiceResult.overflowCount} additional observation${voiceResult.overflowCount === 1 ? '' : 's'} can travel in another pass.</p>` : ''}
    <div class="scene-cognition-observations">${observations || '<p class="muted">No evidence-bearing observations proposed in this pass.</p>'}</div>
  </article>`;
}

function renderPass(root, pass) {
  root._sceneCognitionPass = pass;
  if (pass.status === 'blocked-by-cortex') {
    const failed = (pass.acceptance?.checks || []).filter((item) => !item.passed);
    root.querySelector('.scene-cognition-results').innerHTML = `
      <div class="scene-cognition-pass-head"><strong>Cognition held at cortex gate</strong><span>${failed.length} check${failed.length === 1 ? '' : 's'} need attention</span></div>
      <ul>${failed.map((item) => `<li><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail || '')}</small></li>`).join('')}</ul>
      <p class="muted">Resolve the scene cortex first; no voice route was invoked.</p>
    `;
    return;
  }
  const cards = (pass.voices || []).map((voice) => voiceMarkup(voice, pass)).join('');
  root.querySelector('.scene-cognition-results').innerHTML = `
    <div class="scene-cognition-pass-head">
      <strong>Scene cognition · ${escapeHtml(pass.status)}</strong>
      <span>${escapeHtml(pass.passId)}</span>
    </div>
    <p class="muted">Observations remain provisional. Nothing enters the local neuron bank until you choose Keep evidence.</p>
    <div class="scene-cognition-voice-grid">${cards}</div>
  `;
  bindKeepButtons(root);
}

function bindKeepButtons(root) {
  const pass = root._sceneCognitionPass;
  if (!pass) return;
  root.querySelectorAll('[data-cognition-keep]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('[data-cognition-observation]');
      const voiceId = card?.dataset.cognitionVoice;
      const index = Number(card?.dataset.cognitionObservation);
      const voiceResult = (pass.voices || []).find((item) => item.voiceId === voiceId);
      const observation = voiceResult?.observations?.find((item) => item.index === index);
      if (!voiceResult || !observation?.keepable) return;
      try {
        const cell = createSceneObservationCell({
          passId: pass.passId,
          voiceResult,
          packet: pass.packet,
          observation,
        });
        button.disabled = true;
        button.classList.add('keeping');
        button.dataset.learningCellId = cell.id;
        button.textContent = 'Keeping…';
        document.dispatchEvent(new CustomEvent(KNOWLEDGE_LEARNING_EVENTS.proposal, { detail: { cell } }));
      } catch (error) {
        button.textContent = 'Keep stopped';
        button.title = error?.message || String(error);
      }
    });
  });
}

async function run(form, root, button) {
  const field = form.querySelector('textarea[name="content"], [contenteditable="true"]');
  if (!field) return;
  const voiceIds = selectedVoiceIds(root);
  if (!voiceIds.length) {
    root.querySelector('.scene-cognition-results').innerHTML = '<p class="muted">Choose at least one voice for this cognition pass.</p>';
    return;
  }
  button.disabled = true;
  button.textContent = 'Listening…';
  root.querySelector('.scene-cognition-results').innerHTML = '<p class="muted">Resolving scene cortex, then inviting the selected voices…</p>';
  try {
    const pass = await runSceneCognitionPass(buildFieldContext(field, 'scene-cognition'), { voiceIds });
    renderPass(root, pass);
  } catch (error) {
    root.querySelector('.scene-cognition-results').innerHTML = `<p class="muted">Scene cognition stopped: ${escapeHtml(error?.message || String(error))}</p>`;
  } finally {
    button.disabled = false;
    button.textContent = 'Run cognition pass';
  }
}

function attach(form) {
  if (!form?.isConnected || form.querySelector(`.${PANEL_CLASS}`)) return;
  const cortex = form.querySelector('.script-cortex-controls');
  if (!cortex) return;
  const root = document.createElement('section');
  root.className = PANEL_CLASS;
  root.setAttribute('data-constellation-lens-ignore', 'true');
  root.innerHTML = `
    <div class="scene-cognition-head">
      <div><strong>Scene cognition</strong><p class="muted">Invite named voices beside the assembled narrator, style, and POV cortex.</p></div>
      <div class="scene-cognition-voices">
        ${SCENE_COGNITION_DEFAULT_VOICES.map((voiceId) => `<label><input type="checkbox" data-scene-cognition-voice="${escapeHtml(voiceId)}" checked /> ${escapeHtml(VOICE_LABELS[voiceId] || voiceId)}</label>`).join('')}
      </div>
    </div>
    <div class="button-row"><button type="button" data-scene-cognition-run>Run cognition pass</button></div>
    <div class="scene-cognition-results" aria-live="polite"><p class="muted">Each pass runs the cortex gate first. Model observations require verified scene evidence before they can be kept.</p></div>
  `;
  cortex.append(root);
  root.querySelector('[data-scene-cognition-run]')?.addEventListener('click', (event) => void run(form, root, event.currentTarget));
}

function scan(root = document) {
  root.querySelectorAll?.('form#script-form').forEach(attach);
}

function injectStyles() {
  if (document.querySelector('#scene-cognition-styles')) return;
  const style = document.createElement('style');
  style.id = 'scene-cognition-styles';
  style.textContent = `
    .${PANEL_CLASS} { margin-top:.8rem; padding-top:.75rem; border-top:1px solid color-mix(in srgb,var(--gold) 18%,transparent); }
    .scene-cognition-head { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
    .scene-cognition-head p { margin:.15rem 0 0; }
    .scene-cognition-voices { display:flex; gap:.65rem; flex-wrap:wrap; font-size:.82rem; }
    .scene-cognition-results { margin-top:.65rem; display:grid; gap:.6rem; }
    .scene-cognition-pass-head,.scene-cognition-voice-head,.scene-cognition-observation-head,.scene-cognition-observation-foot { display:flex; align-items:baseline; justify-content:space-between; gap:.7rem; flex-wrap:wrap; }
    .scene-cognition-pass-head span,.scene-cognition-voice-head span,.scene-cognition-observation-head span,.scene-cognition-observation-foot small { opacity:.65; font-size:.72rem; }
    .scene-cognition-voice-grid { display:grid; gap:.65rem; }
    .scene-cognition-voice-card { padding:.7rem; border:1px solid color-mix(in srgb,var(--green) 19%,transparent); border-radius:.7rem; background:color-mix(in srgb,var(--panel-solid) 91%,transparent); }
    .scene-cognition-voice-card.unavailable { opacity:.72; }
    .scene-cognition-contribution { margin:.5rem 0 .65rem; white-space:pre-wrap; }
    .scene-cognition-observations { display:grid; gap:.45rem; }
    .scene-cognition-observation { padding:.55rem .6rem; border-radius:.55rem; border:1px solid color-mix(in srgb,var(--gold) 18%,transparent); }
    .scene-cognition-observation.unverified { opacity:.68; }
    .scene-cognition-observation p { margin:.35rem 0; }
    .scene-cognition-observation blockquote { margin:.35rem 0 .45rem; padding:.35rem .55rem; border-left:2px solid color-mix(in srgb,var(--gold) 40%,transparent); font-size:.82rem; }
    .scene-cognition-results ul { margin:.4rem 0; padding-left:1.2rem; }
    .scene-cognition-results li { margin:.2rem 0; }
    .scene-cognition-results li small { display:block; opacity:.65; }
  `;
  document.head.append(style);
}

export function installSceneCognitionUi() {
  if (typeof document === 'undefined') return;
  injectStyles();
  scan();
  const app = document.querySelector('#app');
  if (app) new MutationObserver(() => scan(app)).observe(app, { childList: true, subtree: true });

  document.addEventListener(KNOWLEDGE_LEARNING_EVENTS.saved, (event) => {
    const cellId = event.detail?.cell?.id;
    if (!cellId) return;
    document.querySelectorAll(`[data-learning-cell-id="${CSS.escape(cellId)}"]`).forEach((button) => {
      button.classList.remove('keeping');
      button.textContent = event.detail?.stored === false ? 'Not stored' : 'Kept';
      button.disabled = true;
    });
  });
  document.addEventListener(KNOWLEDGE_LEARNING_EVENTS.error, (event) => {
    document.querySelectorAll(`.${PANEL_CLASS} [data-cognition-keep].keeping`).forEach((button) => {
      button.classList.remove('keeping');
      button.disabled = false;
      button.textContent = 'Keep evidence';
      button.title = event.detail?.message || 'Learning store error';
    });
  });
}

if (typeof document !== 'undefined') installSceneCognitionUi();
