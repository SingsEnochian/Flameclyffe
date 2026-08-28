import { currentModelPresence, MODEL_PRESENCE_EVENT } from './model-presence-bus.js';
import { HOUSE_CHAT_SELECTION_KEY, runtimeHouseVoices } from './house-commons-chat-v5-core.js';

const ROOT_ATTR = 'data-house-runtime-roster';
let installed = false;
let observer = null;

function readSavedSelection() {
  try {
    const value = JSON.parse(localStorage.getItem(HOUSE_CHAT_SELECTION_KEY) || 'null');
    return Array.isArray(value) ? new Set(value.map((id) => String(id).toLowerCase())) : null;
  } catch {
    return null;
  }
}

function writeSavedSelection(ids) {
  try { localStorage.setItem(HOUSE_CHAT_SELECTION_KEY, JSON.stringify([...ids])); } catch {}
}

function runtimeVoices() {
  return runtimeHouseVoices(currentModelPresence());
}

function ensureInput(form, voice, selected) {
  let input = [...form.querySelectorAll('input[name="voiceIds"]')].find((node) => node.value === voice.id);
  if (!input) {
    input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'voiceIds';
    input.value = voice.id;
    input.hidden = true;
    input.dataset.runtimeVoice = 'true';
    form.append(input);
  }
  input.checked = selected;
  return input;
}

function setSelection(form, ids) {
  const selected = new Set(ids);
  for (const input of form.querySelectorAll('input[name="voiceIds"]')) input.checked = selected.has(input.value);
  writeSavedSelection(selected);
  form.dispatchEvent(new CustomEvent('house-chat:runtime-selection', { bubbles: true, detail: { voiceIds: [...selected] } }));
}

function voiceChip(voice, selected) {
  const meta = [voice.state, voice.provider, voice.model].filter(Boolean).join(' · ');
  return `<button type="button" class="house-runtime-voice${selected ? ' is-selected' : ''}" data-runtime-voice-id="${voice.id}" aria-pressed="${selected ? 'true' : 'false'}"><span class="house-runtime-presence" data-state="${voice.state || 'bootstrap'}" aria-hidden="true"></span><span><strong>${voice.name}</strong>${meta ? `<small>${meta}</small>` : ''}</span></button>`;
}

function render(form) {
  if (!(form instanceof HTMLFormElement)) return;
  const voices = runtimeVoices();
  if (!voices.length) return;

  const saved = readSavedSelection();
  const existingSelected = new Set([...form.querySelectorAll('input[name="voiceIds"]:checked')].map((input) => input.value));
  const allowed = new Set(voices.map((voice) => voice.id));
  let selected = new Set([...(saved || existingSelected)].filter((id) => allowed.has(id)));
  if (!selected.size) selected = new Set(voices.map((voice) => voice.id));

  for (const voice of voices) ensureInput(form, voice, selected.has(voice.id));
  for (const input of form.querySelectorAll('input[name="voiceIds"]')) {
    if (!allowed.has(input.value)) input.checked = false;
  }

  const legacy = form.querySelector('fieldset');
  if (legacy) {
    legacy.classList.add('house-runtime-roster-legacy');
    legacy.setAttribute('aria-hidden', 'true');
  }

  let root = form.querySelector(`[${ROOT_ATTR}]`);
  if (!root) {
    root = document.createElement('section');
    root.setAttribute(ROOT_ATTR, 'true');
    root.className = 'house-runtime-roster';
    (legacy || form.firstElementChild)?.insertAdjacentElement('beforebegin', root);
    if (!root.isConnected) form.prepend(root);
  }

  root.innerHTML = `<div class="house-runtime-roster-head"><div><strong>House voices</strong><small>Live runtime roster · tap to choose who may answer</small></div><button type="button" class="quiet mini" data-runtime-roster-all>${selected.size === voices.length ? 'Clear' : 'All'}</button></div><div class="house-runtime-voice-grid">${voices.map((voice) => voiceChip(voice, selected.has(voice.id))).join('')}</div>`;

  root.querySelectorAll('[data-runtime-voice-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = new Set([...form.querySelectorAll('input[name="voiceIds"]:checked')].map((input) => input.value));
      next.has(button.dataset.runtimeVoiceId) ? next.delete(button.dataset.runtimeVoiceId) : next.add(button.dataset.runtimeVoiceId);
      if (!next.size) next.add(button.dataset.runtimeVoiceId);
      setSelection(form, next);
      render(form);
    });
  });

  root.querySelector('[data-runtime-roster-all]')?.addEventListener('click', () => {
    const current = new Set([...form.querySelectorAll('input[name="voiceIds"]:checked')].map((input) => input.value));
    const next = current.size === voices.length ? new Set([voices[0].id]) : new Set(voices.map((voice) => voice.id));
    setSelection(form, next);
    render(form);
  });

  setSelection(form, selected);
}

function installStyles() {
  if (document.getElementById('house-chat-runtime-roster-styles')) return;
  const style = document.createElement('style');
  style.id = 'house-chat-runtime-roster-styles';
  style.textContent = `.house-runtime-roster-legacy{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.house-runtime-roster{display:grid;gap:.55rem;margin:.35rem 0 .75rem;padding:.65rem;border:1px solid color-mix(in srgb,var(--gold) 24%,var(--line-soft));border-radius:.85rem;background:color-mix(in srgb,var(--panel-solid) 90%,transparent)}.house-runtime-roster-head{display:flex;justify-content:space-between;gap:.75rem;align-items:center}.house-runtime-roster-head>div{display:grid;gap:.08rem}.house-runtime-roster-head small,.house-runtime-voice small{color:var(--muted);font-size:.7rem}.house-runtime-voice-grid{display:flex;flex-wrap:wrap;gap:.4rem}.house-runtime-voice{display:flex;align-items:center;gap:.45rem;min-width:9.5rem;padding:.45rem .55rem;border:1px solid var(--line-soft);border-radius:.7rem;background:transparent;color:inherit;text-align:left}.house-runtime-voice>span:last-child{display:grid}.house-runtime-voice.is-selected{border-color:color-mix(in srgb,var(--green) 55%,var(--line-soft));background:color-mix(in srgb,var(--green) 9%,var(--panel-solid));box-shadow:0 0 0 1px color-mix(in srgb,var(--green) 16%,transparent)}.house-runtime-presence{width:.58rem;height:.58rem;border-radius:50%;background:var(--muted);box-shadow:0 0 0 .16rem color-mix(in srgb,var(--muted) 14%,transparent)}.house-runtime-presence[data-state="ready"],.house-runtime-presence[data-state="speaking"],.house-runtime-presence[data-state="thinking"]{background:var(--green);box-shadow:0 0 0 .16rem color-mix(in srgb,var(--green) 16%,transparent)}.house-runtime-presence[data-state="degraded"],.house-runtime-presence[data-state="error"]{background:var(--gold)}@media(max-width:650px){.house-runtime-voice{flex:1 1 9rem}}`;
  document.head.append(style);
}

function mount() {
  const form = document.querySelector('#commons-form');
  if (form) render(form);
}

export function installHouseChatRuntimeRosterUi() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  installStyles();
  mount();
  document.addEventListener(MODEL_PRESENCE_EVENT, mount);
  observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => [...mutation.addedNodes].some((node) => node?.nodeType === 1 && (node.matches?.('#commons-form') || node.querySelector?.('#commons-form'))))) mount();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installHouseChatRuntimeRosterUi();
