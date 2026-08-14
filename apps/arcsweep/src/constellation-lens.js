const EDITABLE_SELECTOR = [
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="password"]):not(.richtext-source-field)',
  'textarea:not(.richtext-source-field)',
  'select',
  '[contenteditable="true"]',
].join(',');

const REQUEST_EVENT = 'arcsweep:constellation-context-request';
const RESPONSE_EVENT = 'arcsweep:constellation-response';
const DEBOUNCE_MS = 1100;

export function normaliseControlValue(control) {
  if (!control) return null;
  const type = String(control.type || '').toLowerCase();

  if (type === 'password') return null;
  if (type === 'checkbox' || type === 'radio') return Boolean(control.checked);
  if (type === 'file') {
    return [...(control.files || [])].map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    }));
  }
  if (control.tagName === 'SELECT' && control.multiple) {
    return [...control.selectedOptions].map((option) => option.value);
  }
  if (control.isContentEditable) return control.innerText || control.textContent || '';
  return control.value ?? '';
}

function labelFor(control) {
  if (control.getAttribute('aria-label')) return control.getAttribute('aria-label');
  if (control.id) {
    const explicit = document.querySelector(`label[for="${CSS.escape(control.id)}"]`);
    if (explicit) return explicit.textContent.trim();
  }
  const parentLabel = control.closest('label');
  if (parentLabel) {
    const clone = parentLabel.cloneNode(true);
    clone.querySelectorAll('input, textarea, select, button, [contenteditable]').forEach((node) => node.remove());
    const text = clone.textContent.trim();
    if (text) return text;
  }
  return control.name || control.id || control.dataset.fieldId || 'Untitled field';
}

function fieldKey(control) {
  if (!control.dataset.constellationFieldKey) {
    const form = control.closest('form');
    const formId = form?.id || form?.getAttribute('name') || 'form';
    const local = control.name || control.id || control.dataset.fieldId || `field-${Math.random().toString(36).slice(2, 9)}`;
    control.dataset.constellationFieldKey = `${formId}:${local}`;
  }
  return control.dataset.constellationFieldKey;
}

function formRecordId(form) {
  if (!form) return null;
  const idControl = form.elements?.namedItem?.('id') || form.querySelector?.('input[name="id"]');
  return idControl?.value || form.dataset.documentId || form.dataset.recordId || null;
}

function visibleWorldName() {
  return document.querySelector('.sidebar-world strong')?.textContent?.trim() || null;
}

export function buildFieldContext(control, trigger = 'pause') {
  const form = control.closest?.('form');
  const documentId = formRecordId(form) || document.body?.dataset.documentId || null;
  return {
    contract: 'arcsweep.constellation-field-context/v1',
    trigger,
    field: {
      key: fieldKey(control),
      id: control.id || null,
      name: control.name || null,
      label: labelFor(control),
      type: control.type || (control.isContentEditable ? 'rich-text' : control.tagName?.toLowerCase()) || 'unknown',
      value: normaliseControlValue(control),
      required: Boolean(control.required),
      disabled: Boolean(control.disabled),
    },
    form: {
      id: form?.id || null,
      name: form?.getAttribute('name') || null,
      roomId: form?.dataset.roomId || form?.closest('[data-room-id]')?.dataset.roomId || null,
      recordId: documentId,
    },
    page: {
      path: window.location?.pathname || null,
      worldId: form?.dataset.worldId || document.body?.dataset.worldId || null,
      worldName: document.body?.dataset.worldName || visibleWorldName(),
      documentId,
      sceneId: form?.dataset.sceneId || document.body?.dataset.sceneId || null,
      povCharacterId: form?.dataset.povCharacterId || document.body?.dataset.povCharacterId || null,
      narrativeVoiceId: form?.dataset.narrativeVoiceId || document.body?.dataset.narrativeVoiceId || null,
    },
  };
}

function dispatchRequest(control, trigger) {
  if (!control?.isConnected || control.disabled) return;
  const detail = buildFieldContext(control, trigger);
  control.dispatchEvent(new CustomEvent(REQUEST_EVENT, { bubbles: true, detail }));
}

function thoughtMarkup(detail = {}) {
  const voice = String(detail.voiceLabel || detail.voiceId || 'Constellation');
  const kind = String(detail.kind || 'thought');
  const text = String(detail.text || '');
  return `
    <div class="constellation-thought-head">
      <strong>${escapeHtml(voice)}</strong>
      <span>${escapeHtml(kind)}</span>
    </div>
    <div class="constellation-thought-body">${escapeHtml(text)}</div>
  `;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function ensureLens(control) {
  if (control.dataset.constellationLens === 'true') return;
  if (control.type === 'password') return;
  if (control.closest?.('#arcsweep-constellation-presence, [data-constellation-lens-ignore="true"]')) return;
  control.dataset.constellationLens = 'true';
  const key = fieldKey(control);

  const lens = document.createElement('div');
  lens.className = 'constellation-lens';
  lens.dataset.forField = key;
  lens.innerHTML = `
    <button type="button" class="constellation-lens-button" title="Ask the Constellation about this field" aria-label="Ask the Constellation about ${escapeHtml(labelFor(control))}">✦</button>
    <span class="constellation-lens-state" aria-live="polite">quiet</span>
    <div class="constellation-thoughts" hidden></div>
  `;

  control.insertAdjacentElement('afterend', lens);
  const state = lens.querySelector('.constellation-lens-state');
  const ask = lens.querySelector('.constellation-lens-button');

  let timer = null;
  const schedule = (trigger = 'pause') => {
    clearTimeout(timer);
    state.textContent = 'listening';
    timer = setTimeout(() => {
      state.textContent = 'considering';
      dispatchRequest(control, trigger);
    }, DEBOUNCE_MS);
  };

  ask.addEventListener('click', () => {
    clearTimeout(timer);
    state.textContent = 'considering';
    dispatchRequest(control, 'explicit-summon');
  });

  control.addEventListener('focus', () => {
    state.textContent = 'listening';
  });
  control.addEventListener('input', () => schedule('pause'));
  control.addEventListener('change', () => schedule('field-complete'));
  control.addEventListener('blur', () => {
    if (state.textContent === 'listening') state.textContent = 'quiet';
  });
}

function attachAll(root = document) {
  root.querySelectorAll(EDITABLE_SELECTOR).forEach(ensureLens);
}

function receiveResponse(event) {
  const detail = event.detail || {};
  const key = detail.fieldKey;
  if (!key) return;
  const lens = [...document.querySelectorAll('.constellation-lens')]
    .find((candidate) => candidate.dataset.forField === key);
  if (!lens) return;

  const state = lens.querySelector('.constellation-lens-state');
  const thoughts = lens.querySelector('.constellation-thoughts');
  const card = document.createElement('article');
  card.className = `constellation-thought constellation-thought-${String(detail.kind || 'thought')}`;
  card.innerHTML = thoughtMarkup(detail);
  thoughts.append(card);
  thoughts.hidden = false;
  state.textContent = detail.kind === 'question' ? 'question available' : detail.kind === 'continuity' ? 'continuity flag' : detail.kind === 'canon' ? 'canon flag' : detail.kind === 'refusal' ? 'voice paused' : 'thought available';
}

function injectStyles() {
  if (document.querySelector('#arcsweep-constellation-lens-styles')) return;
  const style = document.createElement('style');
  style.id = 'arcsweep-constellation-lens-styles';
  style.textContent = `
    .constellation-lens { display:flex; align-items:center; gap:.4rem; flex-wrap:wrap; margin:.3rem 0 .15rem; }
    .constellation-lens-button { width:2rem; height:2rem; padding:0; border-radius:999px; font-size:1rem; line-height:1; }
    .constellation-lens-state { font-size:.78rem; opacity:.72; }
    .constellation-thoughts { flex-basis:100%; display:grid; gap:.4rem; }
    .constellation-thought { padding:.55rem .7rem; border:1px solid color-mix(in srgb, var(--gold) 24%, transparent); border-radius:.65rem; background:color-mix(in srgb, var(--panel-solid) 88%, transparent); }
    .constellation-thought-head { display:flex; align-items:baseline; justify-content:space-between; gap:1rem; margin-bottom:.25rem; font-size:.82rem; }
    .constellation-thought-head span { opacity:.68; text-transform:capitalize; }
    .constellation-thought-body { line-height:1.45; white-space:pre-wrap; }
  `;
  document.head.append(style);
}

export function installConstellationLens() {
  injectStyles();
  attachAll();
  document.addEventListener(RESPONSE_EVENT, receiveResponse);

  const app = document.querySelector('#app');
  if (app) new MutationObserver(() => attachAll(app)).observe(app, { childList: true, subtree: true });
}

export const CONSTELLATION_LENS_EVENTS = Object.freeze({
  request: REQUEST_EVENT,
  response: RESPONSE_EVENT,
});

if (typeof document !== 'undefined') installConstellationLens();
