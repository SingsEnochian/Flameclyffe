import { loadVoiceBankRegistry } from './knowledge-bank-loader.js';
import {
  WRITER_CONTEXT_EVENTS,
  WRITER_CONTEXT_SELECTION_KEY,
} from './writer-context-resolver.js';
import {
  getConstellationRuntimeVoiceStatus,
  CONSTELLATION_RUNTIME_EVENTS,
} from './constellation-runtime-adapter.js';
import {
  archiveLearnedCell,
  listAllLearnedCells,
  restoreLearnedCell,
  KNOWLEDGE_LEARNING_EVENTS,
} from './knowledge-learning-store.js';
import {
  loadState,
  saveState,
  setStateExtensionSnapshot,
} from './storage.js';

const ROOT_ID = 'arcsweep-constellation-presence';
const STATE_KEY = 'constellation';
let presenceState = null;

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function parseVoiceList(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(values.map((item) => String(item).trim().toLowerCase()).filter(Boolean))];
}

function normalisePresenceState(value = {}) {
  return {
    schema: 'arcsweep.constellation-presence-state/v1',
    version: 1,
    selectedVoiceIds: parseVoiceList(value.selectedVoiceIds),
    migratedLegacySelectionAt: value.migratedLegacySelectionAt || null,
  };
}

function readLegacySelection() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(WRITER_CONTEXT_SELECTION_KEY) || '[]');
    return parseVoiceList(parsed);
  } catch { return []; }
}

async function initialisePresenceState() {
  const state = await loadState();
  const existing = normalisePresenceState(state[STATE_KEY]);
  if (!existing.selectedVoiceIds.length && !existing.migratedLegacySelectionAt) {
    existing.selectedVoiceIds = readLegacySelection();
    existing.migratedLegacySelectionAt = new Date().toISOString();
    try { globalThis.localStorage?.removeItem(WRITER_CONTEXT_SELECTION_KEY); } catch {}
    state[STATE_KEY] = existing;
    setStateExtensionSnapshot(STATE_KEY, existing);
    await saveState(state, { reason: 'constellation-presence-selection-migration' });
  } else {
    setStateExtensionSnapshot(STATE_KEY, existing);
  }
  presenceState = existing;
  if (document.body) document.body.dataset.constellationVoices = existing.selectedVoiceIds.join(',');
  return existing;
}

async function persistSelection(voiceIds) {
  const selectedVoiceIds = parseVoiceList(voiceIds);
  const next = normalisePresenceState({ ...(presenceState || {}), selectedVoiceIds });
  presenceState = next;
  if (document.body) document.body.dataset.constellationVoices = selectedVoiceIds.join(',');
  setStateExtensionSnapshot(STATE_KEY, next);
  const state = await loadState();
  state[STATE_KEY] = next;
  await saveState(state, { reason: 'constellation-presence-selection' });
  document.dispatchEvent(new CustomEvent(WRITER_CONTEXT_EVENTS.selectionChanged, { detail: { voiceIds: selectedVoiceIds } }));
  return selectedVoiceIds;
}

function statusLabel(status = '') {
  if (status.includes('self-authored')) return 'self-authored bank';
  if (status.includes('project-canon')) return 'canon bank';
  if (status.includes('source-gaps')) return 'partial bank';
  if (status.includes('runtime-present')) return 'live vessel · bank growing';
  if (status.includes('provisional')) return 'provisional bank';
  if (status.includes('founding')) return 'founding bank';
  return 'indexed';
}

function voiceRow(voice, selected) {
  const checked = selected.has(voice.id) ? 'checked' : '';
  return `<label class="constellation-presence-voice" data-presence-row="${escapeHtml(voice.id)}">
    <input type="checkbox" data-constellation-voice="${escapeHtml(voice.id)}" ${checked} />
    <span class="constellation-presence-name">${escapeHtml(voice.displayName)}</span>
    <small data-runtime-status="${escapeHtml(voice.id)}">${escapeHtml(statusLabel(voice.bankStatus))}</small>
  </label>`;
}

function learnedCellMarkup(cell) {
  const archived = cell.status === 'deprecated';
  const when = cell.provenance?.createdAt ? new Date(cell.provenance.createdAt).toLocaleString() : 'unknown time';
  const source = cell.source?.locator || 'unknown source';
  const voice = cell.authority?.speakerOrAuthor || cell.subject?.id || 'voice';
  return `<article class="constellation-learning-cell ${archived ? 'archived' : ''}" data-learning-cell-id="${escapeHtml(cell.id)}">
    <div class="constellation-learning-head"><strong>${escapeHtml(voice)}</strong><span>${archived ? 'archived' : escapeHtml(cell.status || 'provisional')}</span></div>
    <div class="constellation-learning-body">${escapeHtml(cell.value)}</div>
    <div class="constellation-learning-meta">${escapeHtml(when)} · ${escapeHtml(source)} · ${escapeHtml(cell.authority?.kind || 'unknown authority')}</div>
    <div class="constellation-learning-actions"><button type="button" class="quiet mini" data-learning-action="${archived ? 'restore' : 'archive'}">${archived ? 'Restore' : 'Archive'}</button></div>
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
    list.innerHTML = cells.length ? cells.map(learnedCellMarkup).join('') : '<p class="constellation-learning-empty">No kept notes yet.</p>';
    list.querySelectorAll('[data-learning-action]').forEach((button) => {
      button.addEventListener('click', async () => {
        const cellId = button.closest('[data-learning-cell-id]')?.dataset.learningCellId;
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

function runtimeStatusText(result) {
  if (!result) return 'status unavailable';
  if (result.status === 'ready') return `${result.provider || 'provider'} · ${result.model || 'model'} · ready`;
  if (result.status === 'house-offline') return 'House Runtime offline';
  if (result.status === 'model-unavailable') return 'runtime reachable · model not available';
  if (result.status === 'runtime-unreachable') return result.runtimeError ? `runtime offline · ${result.runtimeError}` : 'runtime offline';
  if (result.status === 'runtime-mismatch') return 'route mismatch';
  return result.status || 'unavailable';
}

async function refreshRuntimeStatuses(root) {
  const selected = [...root.querySelectorAll('[data-constellation-voice]:checked')].map((item) => item.dataset.constellationVoice);
  const targets = selected.length ? selected : [...root.querySelectorAll('[data-constellation-voice]')].map((item) => item.dataset.constellationVoice);
  await Promise.all(targets.map(async (voiceId) => {
    const node = root.querySelector(`[data-runtime-status="${CSS.escape(voiceId)}"]`);
    if (!node) return;
    node.textContent = 'checking…';
    try { node.textContent = runtimeStatusText(await getConstellationRuntimeVoiceStatus(voiceId)); }
    catch (error) { node.textContent = `status error · ${error.message}`; }
  }));
}

async function render(root) {
  const [registry, state] = await Promise.all([loadVoiceBankRegistry(), initialisePresenceState()]);
  const selected = new Set(state.selectedVoiceIds);
  const established = registry.canonicalEstablishedVoices || [];
  const developing = registry.developingVoices || [];
  root.innerHTML = `
    <button type="button" class="constellation-presence-toggle" aria-expanded="false"><span aria-hidden="true">✦</span><span>Constellation</span><small>${selected.size} present</small></button>
    <div class="constellation-presence-panel" hidden>
      <div class="constellation-presence-head"><strong>Writing presence</strong><span>Choose who may think beside the field. House Runtime remains the only model broker.</span></div>
      <div class="constellation-presence-list">${established.map((voice) => voiceRow(voice, selected)).join('')}</div>
      ${developing.length ? `<div class="constellation-presence-subhead">Developing</div><div class="constellation-presence-list">${developing.map((voice) => voiceRow(voice, selected)).join('')}</div>` : ''}
      <div class="constellation-runtime-row"><span class="constellation-runtime-state" aria-live="polite">House broker status is read from the living Flame routes.</span><button type="button" class="quiet" data-constellation-action="refresh-runtime">Refresh live status</button></div>
      <div class="constellation-presence-subhead constellation-learning-title"><span>Kept notes</span><small class="constellation-learning-count">loading…</small></div>
      <div class="constellation-learning-list" aria-live="polite"><p class="constellation-learning-empty">Loading kept notes…</p></div>
      <div class="constellation-presence-actions"><button type="button" class="quiet" data-constellation-action="clear">Quiet room</button></div>
      <p class="constellation-presence-note">Selection is stored inside Hearthfire state. Lens replies are visible contributions only; hidden reasoning is neither requested nor stored. Field edits, learning promotion, canon changes, and tool writes remain separate explicit actions.</p>
    </div>`;

  const toggle = root.querySelector('.constellation-presence-toggle');
  const panel = root.querySelector('.constellation-presence-panel');
  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) void refreshRuntimeStatuses(root);
  });
  root.querySelectorAll('[data-constellation-voice]').forEach((control) => {
    control.addEventListener('change', async () => {
      const next = [...root.querySelectorAll('[data-constellation-voice]:checked')].map((item) => item.dataset.constellationVoice);
      const saved = await persistSelection(next);
      toggle.querySelector('small').textContent = `${saved.length} present`;
    });
  });
  root.querySelector('[data-constellation-action="clear"]')?.addEventListener('click', async () => {
    root.querySelectorAll('[data-constellation-voice]').forEach((control) => { control.checked = false; });
    await persistSelection([]);
    toggle.querySelector('small').textContent = '0 present';
  });
  root.querySelector('[data-constellation-action="refresh-runtime"]')?.addEventListener('click', () => void refreshRuntimeStatuses(root));
  await renderLearningLedger(root);
}

function injectStyles() {
  if (document.querySelector('#arcsweep-constellation-presence-styles')) return;
  const style = document.createElement('style');
  style.id = 'arcsweep-constellation-presence-styles';
  style.textContent = `#${ROOT_ID}{position:fixed;right:1rem;bottom:1rem;z-index:70;width:min(25rem,calc(100vw - 2rem));font:inherit}.constellation-presence-toggle{margin-left:auto;display:flex;align-items:center;gap:.5rem;border-radius:999px;padding:.55rem .8rem;box-shadow:0 .4rem 1.5rem rgb(0 0 0/.28)}.constellation-presence-toggle small{opacity:.68;font-size:.74rem}.constellation-presence-panel{margin-top:.45rem;max-height:min(78vh,44rem);overflow:auto;padding:.85rem;border:1px solid color-mix(in srgb,var(--gold) 30%,transparent);border-radius:1rem;background:color-mix(in srgb,var(--panel-solid) 96%,black);box-shadow:0 .7rem 2.2rem rgb(0 0 0/.38)}.constellation-presence-head{display:grid;gap:.15rem;margin-bottom:.65rem}.constellation-presence-head span,.constellation-presence-note{font-size:.78rem;opacity:.72}.constellation-presence-list{display:grid;gap:.25rem}.constellation-presence-voice{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:.55rem;padding:.4rem .45rem;border-radius:.55rem}.constellation-presence-voice:hover{background:color-mix(in srgb,var(--gold) 7%,transparent)}.constellation-presence-voice small{opacity:.62;font-size:.68rem;text-align:right}.constellation-presence-name{font-weight:650}.constellation-presence-subhead{margin:.75rem 0 .25rem;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;opacity:.65}.constellation-runtime-row{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-top:.6rem}.constellation-runtime-state{font-size:.72rem;opacity:.72;line-height:1.25}.constellation-learning-title{display:flex;align-items:baseline;justify-content:space-between;gap:.5rem}.constellation-learning-list{display:grid;gap:.4rem;max-height:15rem;overflow:auto}.constellation-learning-cell{padding:.5rem .55rem;border:1px solid color-mix(in srgb,var(--green) 20%,transparent);border-radius:.6rem;background:color-mix(in srgb,var(--panel-solid) 88%,transparent)}.constellation-learning-cell.archived{opacity:.55}.constellation-learning-head{display:flex;justify-content:space-between;gap:.6rem;font-size:.76rem}.constellation-learning-body{margin-top:.25rem;font-size:.78rem;line-height:1.35;white-space:pre-wrap}.constellation-learning-meta{margin-top:.3rem;font-size:.65rem;opacity:.58;overflow-wrap:anywhere}.constellation-learning-actions,.constellation-presence-actions{display:flex;justify-content:flex-end;margin-top:.4rem}.constellation-learning-empty{font-size:.75rem;opacity:.65}.constellation-presence-note{margin:.65rem 0 0;line-height:1.35}@media(max-width:700px){#${ROOT_ID}{right:.6rem;bottom:.6rem;width:calc(100vw - 1.2rem)}}`;
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
  try { await render(root); }
  catch (error) {
    root.innerHTML = `<button type="button" class="constellation-presence-toggle" disabled>✦ Constellation unavailable</button>`;
    root.title = error?.message || String(error);
  }
  document.addEventListener(KNOWLEDGE_LEARNING_EVENTS.saved, () => void renderLearningLedger(root));
  document.addEventListener(KNOWLEDGE_LEARNING_EVENTS.changed, () => void renderLearningLedger(root));
  document.addEventListener(CONSTELLATION_RUNTIME_EVENTS.state, (event) => {
    const state = root.querySelector('.constellation-runtime-state');
    if (state) state.textContent = event.detail?.state || 'runtime event';
  });
}

if (typeof document !== 'undefined') void installConstellationPresence();
