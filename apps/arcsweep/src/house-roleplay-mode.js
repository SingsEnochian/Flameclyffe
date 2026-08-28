import {
  HOUSE_INTERACTION_MODES,
  readHouseInteractionMode,
  writeHouseInteractionMode,
} from './fantasy-roleplay-runtime.js';
import { HOUSE_CHAT_SELECTION_KEY, normaliseVoiceSelection } from './house-commons-chat-v5-core.js';

export const HOUSE_ROLEPLAY_MODE_UI_VERSION = 'house-roleplay-mode/v1';
let installed = false;
let observer = null;

function readSelection() {
  try { return normaliseVoiceSelection(JSON.parse(localStorage.getItem(HOUSE_CHAT_SELECTION_KEY) || 'null')); }
  catch { return normaliseVoiceSelection(null); }
}

function persistSelection(form) {
  const ids = [...form.querySelectorAll('input[name="voiceIds"]:checked')].map((input) => input.value);
  try { localStorage.setItem(HOUSE_CHAT_SELECTION_KEY, JSON.stringify(normaliseVoiceSelection(ids))); } catch {}
  const all = form.querySelector('[data-commons-all]');
  const checks = [...form.querySelectorAll('input[name="voiceIds"]')];
  if (all && checks.length) {
    const count = checks.filter((input) => input.checked).length;
    all.checked = count === checks.length;
    all.indeterminate = count > 0 && count < checks.length;
  }
}

function ensureOxAlpha(form) {
  if (form.querySelector('input[name="voiceIds"][value="oxalpha"]')) return;
  const grid = form.querySelector('.voice-grid');
  if (!grid) return;
  const label = document.createElement('label');
  label.className = 'checkbox house-oa-choice';
  label.innerHTML = '<input type="checkbox" name="voiceIds" value="oxalpha" /> <span><b>Ox Alpha</b><small>OA · portable OpenRouter fallback</small></span>';
  const input = label.querySelector('input');
  input.checked = readSelection().includes('oxalpha');
  input.addEventListener('change', () => persistSelection(form));
  grid.append(label);
  persistSelection(form);
}

function modeCopy(mode) {
  if (mode === 'roleplay') return 'Fantasy Roleplay skill active · participant agency and IC/OOC boundaries enforced.';
  if (mode === 'story') return 'Story skill active · longform scene continuity with roleplay boundaries retained.';
  return 'Chat mode · no fantasy interaction skill injected.';
}

function ensureModeSelector(form) {
  if (form.querySelector('[data-house-interaction-mode]')) return;
  const composer = form.querySelector('[data-commons-native-composer]');
  if (!composer) return;
  const wrap = document.createElement('section');
  wrap.className = 'house-interaction-mode';
  wrap.dataset.houseInteractionMode = 'true';
  wrap.innerHTML = `<div><strong>Interaction</strong><span data-house-mode-copy></span></div><div class="house-mode-buttons" role="group" aria-label="House interaction mode">${HOUSE_INTERACTION_MODES.map((mode) => `<button type="button" data-house-mode="${mode}">${mode === 'chat' ? 'Chat' : mode === 'roleplay' ? 'Roleplay' : 'Story'}</button>`).join('')}</div>`;
  composer.insertAdjacentElement('beforebegin', wrap);
  const paint = () => {
    const mode = readHouseInteractionMode();
    wrap.querySelectorAll('[data-house-mode]').forEach((button) => {
      const active = button.dataset.houseMode === mode;
      button.dataset.active = active ? 'true' : 'false';
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    wrap.querySelector('[data-house-mode-copy]').textContent = modeCopy(mode);
  };
  wrap.querySelectorAll('[data-house-mode]').forEach((button) => button.addEventListener('click', () => {
    writeHouseInteractionMode(button.dataset.houseMode);
    paint();
    document.dispatchEvent(new CustomEvent('arcsweep:house-interaction-mode-changed', { detail: { mode: readHouseInteractionMode() } }));
  }));
  paint();
}

function enhance(form = document.querySelector('#commons-form')) {
  if (!form) return;
  ensureOxAlpha(form);
  ensureModeSelector(form);
}

function installStyles() {
  if (document.getElementById('house-roleplay-mode-styles')) return;
  const style = document.createElement('style');
  style.id = 'house-roleplay-mode-styles';
  style.textContent = `.house-interaction-mode{display:flex;align-items:center;justify-content:space-between;gap:.7rem;flex-wrap:wrap;padding:.55rem .65rem;margin:.45rem 0;border:1px solid color-mix(in srgb,var(--gold) 28%,var(--line-soft));border-radius:.75rem;background:color-mix(in srgb,var(--panel-solid) 90%,transparent)}.house-interaction-mode>div:first-child{display:grid;gap:.12rem}.house-interaction-mode span{font-size:.72rem;color:var(--muted)}.house-mode-buttons{display:flex;gap:.3rem}.house-mode-buttons button{border:1px solid var(--line-soft);border-radius:999px;background:transparent;color:inherit;padding:.3rem .6rem;font:inherit;font-size:.78rem}.house-mode-buttons button[data-active="true"]{border-color:var(--gold);background:color-mix(in srgb,var(--gold) 16%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--gold) 18%,transparent)}.house-oa-choice span{display:grid}.house-oa-choice small{color:var(--muted)}`;
  document.head.append(style);
}

export function installHouseRoleplayMode() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  installStyles();
  enhance();
  observer = new MutationObserver(() => enhance());
  observer.observe(document.body, { childList: true, subtree: true });
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installHouseRoleplayMode();
