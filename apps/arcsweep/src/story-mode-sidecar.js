import { STORY_MODE_CONTRACT, STORY_MODE_VALUE } from './story-mode.js';

const STORAGE_KEY = 'arcsweep.story-mode.preference/v1';
const ROOT_SELECTOR = '#app';
const MODE_SELECTORS = [
  'form#feedback-form select[name="mode"]',
  'form#field-feedback-form select[name="mode"]',
];

function readPreference() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === STORY_MODE_VALUE ? STORY_MODE_VALUE : null;
  } catch {
    return null;
  }
}

function writePreference(value) {
  try {
    if (value === STORY_MODE_VALUE) localStorage.setItem(STORAGE_KEY, STORY_MODE_VALUE);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function storyNote(select) {
  const label = select.closest('label');
  if (!label) return null;
  let note = label.querySelector(':scope > .story-mode-note');
  if (!note) {
    note = document.createElement('small');
    note.className = 'story-mode-note muted';
    note.setAttribute('role', 'status');
    note.setAttribute('aria-live', 'polite');
    label.append(note);
  }
  return note;
}

function updateSurface(select) {
  const active = select.value === STORY_MODE_VALUE;
  const form = select.closest('form');
  const textarea = form?.querySelector('textarea[name="work"]');
  const note = storyNote(select);

  if (textarea && !textarea.dataset.storyModeOriginalPlaceholder) {
    textarea.dataset.storyModeOriginalPlaceholder = textarea.getAttribute('placeholder') || '';
  }

  if (active) {
    writePreference(STORY_MODE_VALUE);
    if (textarea) textarea.setAttribute('placeholder', 'Continue the scene. Preserve POV, tense, chronology, character knowledge, agency, and unresolved edges.');
    if (note) note.textContent = 'Story Mode · continuous narrative · C/R/M continuity · event-reactive soundscape · canon remains review-gated · Qualia remains firsthand-only.';
  } else {
    writePreference(null);
    if (textarea) textarea.setAttribute('placeholder', textarea.dataset.storyModeOriginalPlaceholder || '');
    if (note) note.textContent = '';
  }

  form?.toggleAttribute('data-story-mode', active);
  document.documentElement.toggleAttribute('data-arcsweep-story-mode', active);
  window.dispatchEvent(new CustomEvent('arcsweep:story-mode-change', {
    detail: { active, mode: select.value, contract_id: STORY_MODE_CONTRACT.id },
  }));
}

function mountSelect(select) {
  if (!(select instanceof HTMLSelectElement)) return;
  if (!select.querySelector(`option[value="${STORY_MODE_VALUE}"]`)) {
    const option = document.createElement('option');
    option.value = STORY_MODE_VALUE;
    option.textContent = STORY_MODE_CONTRACT.label;
    select.insertBefore(option, select.firstElementChild);
  }

  if (!select.dataset.storyModeMounted) {
    select.dataset.storyModeMounted = 'true';
    select.addEventListener('change', () => updateSurface(select));
  }

  if (readPreference() === STORY_MODE_VALUE && !select.dataset.storyModePreferenceApplied) {
    select.value = STORY_MODE_VALUE;
    select.dataset.storyModePreferenceApplied = 'true';
  }
  updateSurface(select);
}

function mountStoryMode() {
  for (const selector of MODE_SELECTORS) {
    document.querySelectorAll(selector).forEach(mountSelect);
  }
}

const root = document.querySelector(ROOT_SELECTOR);
let scheduled = false;
function scheduleMount() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    mountStoryMode();
  });
}

mountStoryMode();

if (root) {
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) scheduleMount();
  });
  observer.observe(root, { childList: true, subtree: true });
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
}

export { STORAGE_KEY, mountStoryMode };
