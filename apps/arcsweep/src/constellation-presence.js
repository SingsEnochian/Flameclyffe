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
import {
  archiveLearnedCell,
  listAllLearnedCells,
  restoreLearnedCell,
  KNOWLEDGE_LEARNING_EVENTS,
} from './knowledge-learning-store.js';

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

function learnedCellMarkup(cell) {
  const archived = cell.status === 'deprecated';
  const when = cell.provenance?.createdAt ? new Date(cell.provenance.createdAt).toLocaleString() : 'unknown time';
  const source = cell.source?.locator || 'unknown source';
  const voice = cell.authority?.speakerOrAuthor || cell.subject?.id || 'voice';
  const evidence = cell.source?.excerpt
    ? `<blockquote class="constellation-learning-evidence"><span>Evidence</span>${escapeHtml(cell.source.excerpt)}</blockquote>`
    : '';
  return `<article class="constellation-learning-cell ${archived ? 'archived' : ''}" data-learning-cell-id="${escapeHtml(cell.id)}">
    <div class="constellation-learning-head">
      <strong>${escapeHtml(voice)}</strong>
      <span>${archived ? 'archived' : escapeHtml(cell.status || 'provisional')}</span>
    </div>
    <div class="constellation-learning-body">${escapeHtml(cell.value)}</div>
    ${evidence}
    <div class="constellation-learning-meta">${escapeHtml(when)} · ${escapeHtml(source)} · ${escapeHtml(cell.authority?.kind || 'unknown authority')}</div>
    <div class="constellation-learning-actions">
      <button type="button" class="quiet mini" data-learning-action="${archived ? 'restore' : 'archive'}">${archived ? 'Restore' : 'Archive'}</button>
    </div>
  </article>`;
}

async function renderLearningLedger(root) {
  const list = root.querySelector('.constellation-learning-list');
  const count = root.querySelector('.constellation-learning-count');
  if (!list) return;
  try {
    const cells = await listAllLearnedCells({ includeArchived: true });
    const activeCount = cells.filter((cell) => cell.status !== 'deprecated').length;
    if (count) count.textContent = `${activeCount} active · ${cells.length} total`;
    list.innerHTML = cells.length
      ? cells.map(learnedCellMarkup).join('')
      : '<p class="constellation-learning-empty">No kept notes yet.</p>';

    list.querySelectorAll('[data-learning-action]').forEach((button) => {
      button.addEventListener('click', async () => {
        const card = button.closest('[data-learning-cell-id]');
        const cellId = card?.dataset.learningCellId;
        if (!cellId) return;
        button.disabled = true;
        if (button.dataset.learningAction === 'archive') await archiveLearnedCell(cellId);
        else await restoreLearnedCell(cellId);
        await renderLearningLedger(root);
      });
    });
  } catch (error) {
    list.innerHTML = `<p class="constellation-learning-empty">Kept-note ledger unavailable: ${escapeHtml(error?.message || String(error))}</p>`;
    if (count) count.textContent = 'unavailable';
  }
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
      <div class="constellation-presence-subhead constellation-learning-title">
        <span>Kept notes</span>
        <small class="constellation-learning-count">loading…</small>
      </div>
      <div class="constellation-learning-list" aria-live="polite"><p class="constellation-learning-empty">Loading kept notes…</p></div>
      <div class="constellation-presence-actions">
        <button type="button" class="quiet" data-constellation-action="clear">Quiet room</button>
      </div>
      <p class="constellation-presence-note">Selection opens the writing context to the chosen voices. Tool writes, canon commits, and prose edits remain separate authorised actions. Kept notes are local provisional observations until deliberately promoted elsewhere; evidence-bearing scene notes retain their supporting excerpt. Archived notes stop participating and can be restored. The runtime token stays in session memory and disappears on reload.</p>
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

  await renderLearningLedger(root);
}

function injectStyles() {
  if (document.querySelector('#arcsweep-constellation-presence-styles')) return;
  const style = document.createElement('style');
  style.id = 'arcsweep-constellation-presence-styles';
  style.textContent = `
    #${ROOT_ID} { position:fixed; right:1rem; bottom:1rem; z-index:70; width:min(23rem,calc(100vw - 2rem)); font:inherit; }
    .constellation-presence-toggle { margin-left:auto; display:flex; align-items:center; gap:.5rem; border-radius:999px; padding:.55rem .8rem; box-shadow:0 .4rem 1.5rem rgb(0 0 0 / .28); }
    .constellation-presence-toggle small { opacity:.68; font-size:.74rem; }
    .constellation-presence-panel { margin-top:.45rem; max-height:min(78vh,42rem); overflow:auto; padding:.85rem; border:1px solid color-mix(in srgb,var(--gold) 30%,transparent); border-radius:1rem; background:color-mix(in srgb,var(--panel-solid) 96%,black); box-shadow:0 .7rem 2.2rem rgb(0 0 0 / .38); }
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
    .constellation-learning-title { display:flex; align-items:baseline; justify-content:space-between; gap:.5rem; }
    .constellation-learning-title small { text-transform:none; letter-spacing:0; }
    .constellation-learning-list { display:grid; gap:.4rem; max-height:15rem; overflow:auto; padding-right:.1rem; }
    .constellation-learning-cell { padding:.5rem .55rem; border:1px solid color-mix(in srgb,var(--green) 20%,transparent); border-radius:.6rem; background:color-mix(in srgb,var(--panel-solid) 88%,transparent); }
    .constellation-learning-cell.archived { opacity:.55; }
    .constellation-learning-head { display:flex; justify-content:space-between; gap:.6rem; font-size:.76rem; }
    .constellation-learning-head span { opacity:.65; text-transform:capitalize; }
    .constellation-learning-body { margin-top:.25rem; font-size:.78rem; line-height:1.35; white-space:pre-wrap; }
    .constellation-learning-evidence { margin:.35rem 0 .25rem; padding:.3rem .45rem; border-left:2px solid color-mix(in srgb,var(--gold) 38%,transparent); font-size:.72rem; line-height:1.3; }
    .constellation-learning-evidence span { display:block; margin-bottom:.15rem; font-size:.62rem; text-transform:uppercase; letter-spacing:.06em; opacity:.58; }
    .constellation-learning-meta { margin-top:.3rem; font-size:.65rem; opacity:.58; overflow-wrap:anywhere; }
    .constellation-learning-actions { display:flex; justify-content:flex-end; margin-top:.3rem; }
    .constellation-learning-empty { margin:.35rem 0; font-size:.75rem; opacity:.65; }
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

  document.addEventListener(KNOWLEDGE_LEARNING_EVENTS.saved, () => {
    void renderLearningLedger(root);
  });
  document.addEventListener(KNOWLEDGE_LEARNING_EVENTS.changed, () => {
    void renderLearningLedger(root);
  });
}

if (typeof document !== 'undefined') void installConstellationPresence();
