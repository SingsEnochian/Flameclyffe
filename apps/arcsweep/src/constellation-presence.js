import { loadVoiceBankRegistry } from './knowledge-bank-loader.js';
import {
  getSelectedConstellationVoices,
  setSelectedConstellationVoices,
  WRITER_CONTEXT_EVENTS,
} from './writer-context-resolver.js';
import {
  clearConstellationRuntimeToken,
  hasConstellationRuntimeToken,
  setConstellationRuntimeToken,
  CONSTELLATION_RUNTIME_EVENTS,
} from './constellation-runtime-adapter.js';

const ROOT_ID = 'arcsweep-constellation-presence';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function statusLabel(status = '') {
  if (status.includes('self-authored')) return 'self-authored bank';
  if (status.includes('project-canon')) return 'canon bank';
  if (status.includes('source-gaps')) return 'partial bank';
  if (status.includes('provisional')) return 'provisional bank';
  if (status.includes('founding')) return 'founding bank';
  return 'indexed';
}

function runtimeStateLabel(detail = {}) {
  if (detail.state === 'ready') return 'ready · token held in session memory';
  if (detail.state === 'voice-unavailable') return `${detail.voiceId || 'voice'} unavailable · ${detail.reason || 'no route'}`;
  if (detail.state === 'voice-error') return `${detail.voiceId || 'voice'} route error · ${detail.error || 'unknown error'}`;
  if (detail.state === 'error') return `runtime error · ${detail.error || 'unknown error'}`;
  return 'offline · session token not set';
}

function voiceRow(voice, selected) {
  const checked = selected.has(voice.id) ? 'checked' : '';
  return `<label class="constellation-presence-voice">
    <input type="checkbox" data-constellation-voice="${escapeHtml(voice.id)}" ${checked} />
    <span class="constellation-presence-name">${escapeHtml(voice.displayName)}</span>
    <small>${escapeHtml(statusLabel(voice.bankStatus))}</small>
  </label>`;
}

async function render(root) {
  const registry = await loadVoiceBankRegistry();
  const selected = new Set(getSelectedConstellationVoices());
  const established = registry.canonicalEstablishedVoices || [];
  const developing = registry.developingVoices || [];
  const runtimeReady = hasConstellationRuntimeToken();

  root.innerHTML = `
    <button type="button" class="constellation-presence-toggle" aria-expanded="false">
      <span aria-hidden="true">✦</span>
      <span>Constellation</span>
      <small>${selected.size} present</small>
    </button>
    <div class="constellation-presence-panel" hidden>
      <div class="constellation-presence-head">
        <strong>Writing presence</strong>
        <span>Select who may think beside the field.</span>
      </div>
      <div class="constellation-presence-list">
        ${established.map((voice) => voiceRow(voice, selected)).join('')}
      </div>
      ${developing.length ? `
        <div class="constellation-presence-subhead">Developing</div>
        <div class="constellation-presence-list">
          ${developing.map((voice) => voiceRow(voice, selected)).join('')}
        </div>` : ''}
      <div class="constellation-presence-subhead">Runtime bridge</div>
      <label class="constellation-runtime-auth">
        <span>Session-only House runtime token</span>
        <input type="password" data-constellation-runtime-token autocomplete="off" spellcheck="false" placeholder="Used in memory only" />
      </label>
      <div class="constellation-runtime-row">
        <span class="constellation-runtime-state" aria-live="polite">${runtimeReady ? 'ready · token held in session memory' : 'offline · session token not set'}</span>
        <button type="button" class="quiet" data-constellation-action="forget-token">Forget token</button>
      </div>
      <div class="constellation-presence-actions">
        <button type="button" class="quiet" data-constellation-action="clear">Quiet room</button>
      </div>
      <p class="constellation-presence-note">Selection grants context participation only. It does not grant tool writes, canon commits, or silent edits. The runtime token is never stored in Arcsweep state or local storage and disappears on reload.</p>
    </div>
  `;

  const toggle = root.querySelector('.constellation-presence-toggle');
  const panel = root.querySelector('.constellation-presence-panel');
  const runtimeToken = root.querySelector('[data-constellation-runtime-token]');
  const runtimeState = root.querySelector('.constellation-runtime-state');

  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  });

  root.querySelectorAll('[data-constellation-voice]').forEach((control) => {
    control.addEventListener('change', () => {
      const next = [...root.querySelectorAll('[data-constellation-voice]:checked')].map((item) => item.dataset.constellationVoice);
      setSelectedConstellationVoices(next);
      const count = root.querySelectorAll('[data-constellation-voice]:checked').length;
      toggle.querySelector('small').textContent = `${count} present`;
    });
  });

  runtimeToken?.addEventListener('input', () => {
    const ready = setConstellationRuntimeToken(runtimeToken.value);
    if (runtimeState) runtimeState.textContent = ready ? 'ready · token held in session memory' : 'offline · session token not set';
  });

  root.querySelector('[data-constellation-action="forget-token"]')?.addEventListener('click', () => {
    clearConstellationRuntimeToken();
    if (runtimeToken) runtimeToken.value = '';
    if (runtimeState) runtimeState.textContent = 'offline · session token not set';
  });

  root.querySelector('[data-constellation-action="clear"]')?.addEventListener('click', () => {
    root.querySelectorAll('[data-constellation-voice]').forEach((control) => { control.checked = false; });
    setSelectedConstellationVoices([]);
    toggle.querySelector('small').textContent = '0 present';
  });
}

function injectStyles() {
  if (document.querySelector('#arcsweep-constellation-presence-styles')) return;
  const style = document.createElement('style');
  style.id = 'arcsweep-constellation-presence-styles';
  style.textContent = `
    #${ROOT_ID} { position:fixed; right:1rem; bottom:1rem; z-index:70; width:min(22rem,calc(100vw - 2rem)); font:inherit; }
    .constellation-presence-toggle { margin-left:auto; display:flex; align-items:center; gap:.5rem; border-radius:999px; padding:.55rem .8rem; box-shadow:0 .4rem 1.5rem rgb(0 0 0 / .28); }
    .constellation-presence-toggle small { opacity:.68; font-size:.74rem; }
    .constellation-presence-panel { margin-top:.45rem; max-height:min(76vh,38rem); overflow:auto; padding:.85rem; border:1px solid color-mix(in srgb,var(--gold) 30%,transparent); border-radius:1rem; background:color-mix(in srgb,var(--panel-solid) 96%,black); box-shadow:0 .7rem 2.2rem rgb(0 0 0 / .38); }
    .constellation-presence-head { display:grid; gap:.15rem; margin-bottom:.65rem; }
    .constellation-presence-head span,.constellation-presence-note { font-size:.78rem; opacity:.72; }
    .constellation-presence-list { display:grid; gap:.25rem; }
    .constellation-presence-voice { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:.55rem; padding:.4rem .45rem; border-radius:.55rem; }
    .constellation-presence-voice:hover { background:color-mix(in srgb,var(--gold) 7%,transparent); }
    .constellation-presence-voice small { opacity:.62; font-size:.7rem; }
    .constellation-presence-name { font-weight:650; }
    .constellation-presence-subhead { margin:.75rem 0 .25rem; font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; opacity:.65; }
    .constellation-runtime-auth { display:grid; gap:.3rem; font-size:.78rem; }
    .constellation-runtime-auth input { width:100%; }
    .constellation-runtime-row { display:flex; align-items:center; justify-content:space-between; gap:.6rem; margin-top:.35rem; }
    .constellation-runtime-state { font-size:.72rem; opacity:.72; line-height:1.25; }
    .constellation-runtime-row button { flex:none; }
    .constellation-presence-actions { display:flex; justify-content:flex-end; margin-top:.7rem; }
    .constellation-presence-note { margin:.65rem 0 0; line-height:1.35; }
    @media (max-width:700px) { #${ROOT_ID} { right:.6rem; bottom:.6rem; width:calc(100vw - 1.2rem); } }
  `;
  document.head.append(style);
}

export async function installConstellationPresence() {
  if (typeof document === 'undefined') return;
  injectStyles();
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('aside');
    root.id = ROOT_ID;
    root.setAttribute('aria-label', 'Constellation writing presence');
    document.body.append(root);
  }
  try {
    await render(root);
  } catch (error) {
    root.innerHTML = `<button type="button" class="constellation-presence-toggle" disabled>✦ Constellation unavailable</button>`;
    root.title = error?.message || String(error);
  }

  document.addEventListener(WRITER_CONTEXT_EVENTS.selectionChanged, () => {
    const selected = new Set(getSelectedConstellationVoices());
    root.querySelectorAll('[data-constellation-voice]').forEach((control) => {
      control.checked = selected.has(control.dataset.constellationVoice);
    });
    const count = selected.size;
    const counter = root.querySelector('.constellation-presence-toggle small');
    if (counter) counter.textContent = `${count} present`;
  });

  document.addEventListener(CONSTELLATION_RUNTIME_EVENTS.state, (event) => {
    const state = root.querySelector('.constellation-runtime-state');
    if (state) state.textContent = runtimeStateLabel(event.detail || {});
  });
}

if (typeof document !== 'undefined') void installConstellationPresence();
