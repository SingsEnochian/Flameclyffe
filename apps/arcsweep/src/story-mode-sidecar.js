import { STORY_MODE_CONTRACT, STORY_MODE_VALUE } from './story-mode.js';

const STORAGE_KEY = 'arcsweep.story-mode.preference/v1';
const ROOT_SELECTOR = '#app';
const MODE_SELECTORS = [
  'form#feedback-form select[name="mode"]',
  'form#field-feedback-form select[name="mode"]',
];
const LAUNCHER_SELECTOR = '[data-story-mode-launch]';

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

function mountLauncher() {
  const nav = document.querySelector('.sidebar nav[aria-label="Primary Arcsweep rooms"]');
  if (!nav) return null;
  let launcher = nav.querySelector(LAUNCHER_SELECTOR);
  if (!launcher) {
    launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'nav-button story-mode-launch';
    launcher.dataset.room = 'feedback';
    launcher.dataset.storyModeLaunch = 'true';
    launcher.setAttribute('aria-label', 'Open Story Mode');
    launcher.innerHTML = '<span aria-hidden="true">❧</span><span>Story Mode</span>';
    launcher.addEventListener('click', () => writePreference(STORY_MODE_VALUE));
    const feedback = nav.querySelector('[data-room="feedback"]');
    nav.insertBefore(launcher, feedback || null);
  }
  return launcher;
}

function updateLauncherState(active) {
  const launcher = mountLauncher();
  if (!launcher) return;
  launcher.classList.toggle('active', active);
  if (active) launcher.setAttribute('aria-current', 'page');
  else launcher.removeAttribute('aria-current');

  const feedback = document.querySelector('.sidebar nav [data-room="feedback"]:not([data-story-mode-launch])');
  if (feedback) {
    if (active) feedback.classList.remove('active');
    else if (document.querySelector('#feedback-form')) feedback.classList.add('active');
  }
}

function updateNarrativeSurface(form, active) {
  if (!form) return;
  const content = form.closest('.content');
  const heading = content?.querySelector('.section-heading h1');
  const eyebrow = content?.querySelector('.section-heading .eyebrow');
  const submit = form.querySelector('button[type="submit"]');

  if (heading && !heading.dataset.storyModeOriginalText) heading.dataset.storyModeOriginalText = heading.textContent || '';
  if (eyebrow && !eyebrow.dataset.storyModeOriginalText) eyebrow.dataset.storyModeOriginalText = eyebrow.textContent || '';
  if (submit && !submit.dataset.storyModeOriginalText) submit.dataset.storyModeOriginalText = submit.textContent || '';

  if (active) {
    if (heading) heading.textContent = 'Story Mode';
    if (eyebrow) eyebrow.textContent = 'World → scene → voices → event → receipt → continuation';
    if (submit) submit.textContent = 'Continue story ❧';
    content?.setAttribute('data-story-mode-surface', 'true');
  } else {
    if (heading?.dataset.storyModeOriginalText) heading.textContent = heading.dataset.storyModeOriginalText;
    if (eyebrow?.dataset.storyModeOriginalText) eyebrow.textContent = eyebrow.dataset.storyModeOriginalText;
    if (submit?.dataset.storyModeOriginalText) submit.textContent = submit.dataset.storyModeOriginalText;
    content?.removeAttribute('data-story-mode-surface');
  }
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
  if (form?.id === 'feedback-form') {
    updateNarrativeSurface(form, active);
    updateLauncherState(active);
  }
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
  mountLauncher();
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
