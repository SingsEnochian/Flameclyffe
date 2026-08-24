import { loadState } from './storage.js';
import { loadSubjectBankManifest } from './knowledge-subject-loader.js';
import { loadScriptCortexMetadata, saveScriptCortexMetadata } from './script-cortex-store.js';

const CONTROLS_CLASS = 'script-cortex-controls';
const SAVE_DELAY_MS = 250;
const saveTimers = new Map();

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function scriptIdFor(form) {
  return form?.querySelector('input[name="id"]')?.value || null;
}

function splitSubjectEntries(manifest = {}) {
  const entries = Object.entries(manifest.subjects || {}).map(([key, value]) => {
    const split = key.indexOf(':');
    return {
      key,
      kind: split > 0 ? key.slice(0, split) : '',
      id: split > 0 ? key.slice(split + 1) : key,
      label: value.label || (split > 0 ? key.slice(split + 1) : key),
      worldIds: value.worldIds || [],
      status: value.status || '',
    };
  });
  return {
    characters: entries.filter((item) => item.kind === 'character'),
    narrators: entries.filter((item) => item.kind === 'narrative_voice'),
    styles: entries.filter((item) => item.kind === 'writing_style'),
  };
}

function optionList(items, selected = '') {
  const known = new Set(items.map((item) => item.id));
  const extra = selected && !known.has(selected)
    ? `<option value="${escapeHtml(selected)}">${escapeHtml(selected)} · local/unregistered</option>`
    : '';
  return `<option value="">None / not set</option>${extra}${items.map((item) =>
    `<option value="${escapeHtml(item.id)}" ${item.id === selected ? 'selected' : ''}>${escapeHtml(item.label)}</option>`
  ).join('')}`;
}

function applyMetadataToForm(form, metadata = {}) {
  form.dataset.worldId = metadata.worldId || form.dataset.worldId || '';
  form.dataset.storyAt = metadata.storyAt || '';
  form.dataset.storyOrder = metadata.storyOrder == null ? '' : String(metadata.storyOrder);
  form.dataset.povCharacterId = metadata.povCharacterId || '';
  form.dataset.narrativeVoiceId = metadata.narrativeVoiceId || '';
  form.dataset.writingStyleId = metadata.writingStyleId || '';
  form.dataset.sceneCharacterIds = (metadata.sceneCharacterIds || []).join(',');
}

function formMetadata(form, worldId) {
  const root = form.querySelector(`.${CONTROLS_CLASS}`);
  return {
    scriptId: scriptIdFor(form),
    worldId,
    storyAt: root?.querySelector('[data-script-cortex="storyAt"]')?.value || '',
    storyOrder: root?.querySelector('[data-script-cortex="storyOrder"]')?.value || '',
    povCharacterId: root?.querySelector('[data-script-cortex="povCharacterId"]')?.value || '',
    narrativeVoiceId: root?.querySelector('[data-script-cortex="narrativeVoiceId"]')?.value || '',
    writingStyleId: root?.querySelector('[data-script-cortex="writingStyleId"]')?.value || '',
    sceneCharacterIds: root?.querySelector('[data-script-cortex="sceneCharacterIds"]')?.value || '',
  };
}

function setStatus(root, text) {
  const node = root?.querySelector('.script-cortex-status');
  if (node) node.textContent = text;
}

function scheduleSave(form, worldId) {
  const id = scriptIdFor(form);
  if (!id) return;
  clearTimeout(saveTimers.get(id));
  const timer = setTimeout(async () => {
    const root = form.querySelector(`.${CONTROLS_CLASS}`);
    try {
      const result = await saveScriptCortexMetadata(formMetadata(form, worldId));
      applyMetadataToForm(form, result.metadata);
      setStatus(root, result.stored ? 'Scene cortex saved locally.' : 'Scene cortex could not be stored in this browser.');
    } catch (error) {
      setStatus(root, `Scene cortex save stopped: ${error?.message || String(error)}`);
    }
  }, SAVE_DELAY_MS);
  saveTimers.set(id, timer);
}

async function injectControls(form) {
  if (!form?.isConnected || form.querySelector(`.${CONTROLS_CLASS}`)) return;
  const scriptId = scriptIdFor(form);
  if (!scriptId) return;

  const [state, manifest, stored] = await Promise.all([
    loadState().catch(() => null),
    loadSubjectBankManifest().catch(() => ({ subjects: {} })),
    loadScriptCortexMetadata(scriptId).catch(() => null),
  ]);
  if (!form.isConnected || form.querySelector(`.${CONTROLS_CLASS}`)) return;

  const script = state?.scripts?.find((item) => item.id === scriptId) || null;
  const worldId = String(stored?.worldId || script?.worldId || state?.activeWorldId || '').trim().toLowerCase();
  const subjects = splitSubjectEntries(manifest);
  const inWorld = (item) => !item.worldIds?.length || !worldId || item.worldIds.includes(worldId);
  const characters = subjects.characters.filter(inWorld);
  const narrators = subjects.narrators.filter(inWorld);
  const styles = subjects.styles.filter(inWorld);
  const metadata = {
    scriptId,
    worldId,
    storyAt: stored?.storyAt || '',
    storyOrder: stored?.storyOrder ?? null,
    povCharacterId: stored?.povCharacterId || '',
    narrativeVoiceId: stored?.narrativeVoiceId || '',
    writingStyleId: stored?.writingStyleId || '',
    sceneCharacterIds: stored?.sceneCharacterIds || [],
  };
  applyMetadataToForm(form, metadata);

  const root = document.createElement('fieldset');
  root.className = CONTROLS_CLASS;
  root.innerHTML = `
    <legend>Scene cortex</legend>
    <p class="muted">Attach chronology, POV, narrator, style, and scene characters to this script. These fields drive the Writer Context Packet; they do not change prose or canon by themselves.</p>
    <div class="grid two compact-grid">
      <label>Story point
        <input data-script-cortex="storyAt" value="${escapeHtml(metadata.storyAt)}" placeholder="e.g. Restoration Year 214 · Midwinter" />
      </label>
      <label>Story order
        <input data-script-cortex="storyOrder" type="number" step="1" value="${metadata.storyOrder == null ? '' : escapeHtml(metadata.storyOrder)}" placeholder="Chronology gate, e.g. 42" />
      </label>
      <label>POV character
        <select data-script-cortex="povCharacterId">${optionList(characters, metadata.povCharacterId)}</select>
      </label>
      <label>Narrative voice
        <select data-script-cortex="narrativeVoiceId">${optionList(narrators, metadata.narrativeVoiceId)}</select>
      </label>
      <label>Writing style
        <select data-script-cortex="writingStyleId">${optionList(styles, metadata.writingStyleId)}</select>
      </label>
      <label>Other scene character IDs
        <input data-script-cortex="sceneCharacterIds" value="${escapeHtml(metadata.sceneCharacterIds.join(', '))}" placeholder="comma-separated ids" />
      </label>
    </div>
    <p class="script-cortex-status" aria-live="polite">${stored ? 'Scene cortex loaded.' : 'No scene cortex saved yet.'}</p>
  `;

  const contentLabel = [...form.querySelectorAll('label')].find((label) => label.querySelector('textarea[name="content"]'));
  if (contentLabel) contentLabel.insertAdjacentElement('beforebegin', root);
  else form.append(root);

  root.querySelectorAll('[data-script-cortex]').forEach((control) => {
    control.addEventListener('input', () => {
      const provisional = formMetadata(form, worldId);
      applyMetadataToForm(form, {
        ...provisional,
        sceneCharacterIds: String(provisional.sceneCharacterIds || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean),
        storyOrder: provisional.storyOrder === '' ? null : Number(provisional.storyOrder),
      });
      setStatus(root, 'Scene cortex changed…');
      scheduleSave(form, worldId);
    });
    control.addEventListener('change', () => scheduleSave(form, worldId));
  });
}

function injectStyles() {
  if (document.querySelector('#arcsweep-script-cortex-styles')) return;
  const style = document.createElement('style');
  style.id = 'arcsweep-script-cortex-styles';
  style.textContent = `
    .${CONTROLS_CLASS} { margin:.25rem 0 .65rem; padding:.8rem; border:1px solid color-mix(in srgb,var(--green) 18%,transparent); border-radius:.75rem; }
    .${CONTROLS_CLASS} legend { padding:0 .35rem; font-weight:700; }
    .${CONTROLS_CLASS} > .muted { margin-top:0; }
    .script-cortex-status { margin:.35rem 0 0; font-size:.72rem; opacity:.68; }
  `;
  document.head.append(style);
}

function scan(root = document) {
  root.querySelectorAll?.('form#script-form').forEach((form) => void injectControls(form));
}

export function installScriptCortexControls() {
  if (typeof document === 'undefined') return;
  injectStyles();
  scan();
  const app = document.querySelector('#app');
  if (app) new MutationObserver(() => scan(app)).observe(app, { childList: true, subtree: true });
}

if (typeof document !== 'undefined') installScriptCortexControls();
