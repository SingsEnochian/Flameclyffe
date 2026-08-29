import { SOUND_ORGANS, SOUND_ORGAN_REGISTRY_VERSION, soundOrgan } from './sound-organ-registry.js';

let initialDeepLinkHandled = false;
let focusTimer = null;

function focusOrgan(id) {
  const organ = soundOrgan(id);
  if (!organ?.focusSelector) return;
  if (focusTimer) clearTimeout(focusTimer);
  focusTimer = setTimeout(() => {
    const target = document.querySelector(organ.focusSelector);
    if (!target) return;
    document.querySelectorAll('[data-sound-organ-focused]').forEach((node) => node.removeAttribute('data-sound-organ-focused'));
    target.dataset.soundOrganFocused = id;
    target.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, 40);
}

function nativeButton(organ) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-room sound-organ-link';
  button.dataset.room = organ.roomId;
  button.dataset.soundOrgan = organ.id;
  button.dataset.soundFocus = organ.focusSelector;
  button.title = organ.description;
  button.innerHTML = `<span aria-hidden="true">${organ.glyph}</span><span>${organ.label}</span>`;
  return button;
}

function externalLink(organ) {
  const link = document.createElement('a');
  link.className = 'nav-room sound-organ-link';
  link.dataset.soundOrgan = organ.id;
  link.href = organ.pagesHref;
  link.title = organ.description;
  link.innerHTML = `<span aria-hidden="true">${organ.glyph}</span><span>${organ.label}</span>`;
  return link;
}

export function mountSoundOrganNavigation() {
  const nav = document.querySelector('.sidebar nav[aria-label="Primary Arcsweep rooms"]');
  if (!nav) return null;
  let group = nav.querySelector(`[data-sound-organ-nav="${SOUND_ORGAN_REGISTRY_VERSION}"]`);
  if (group) return group;

  group = document.createElement('section');
  group.className = 'sound-organ-nav';
  group.dataset.soundOrganNav = SOUND_ORGAN_REGISTRY_VERSION;
  group.setAttribute('aria-label', 'Sound and resonance instruments');
  group.innerHTML = '<small>Sound & resonance</small>';
  SOUND_ORGANS.forEach((organ) => group.append(organ.kind === 'external' ? externalLink(organ) : nativeButton(organ)));

  const creative = nav.querySelector('[data-creative-organ-nav]');
  const forge = nav.querySelector('[data-room="forge"]');
  if (creative) creative.insertAdjacentElement('afterend', group);
  else if (forge) forge.insertAdjacentElement('afterend', group);
  else nav.append(group);
  return group;
}

function handleInitialDeepLink() {
  if (initialDeepLinkHandled) return;
  const id = new URLSearchParams(window.location.search).get('soundOrgan');
  const organ = soundOrgan(id);
  if (!organ || organ.kind !== 'native-focus') {
    initialDeepLinkHandled = true;
    return;
  }
  const button = document.querySelector(`[data-sound-organ="${CSS.escape(id)}"][data-room]`);
  if (!button) return;
  initialDeepLinkHandled = true;
  button.click();
  focusOrgan(id);
}

export function installSoundOrganNavigation() {
  mountSoundOrganNavigation();
  handleInitialDeepLink();

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-sound-organ][data-room]');
    if (!trigger) return;
    const id = trigger.dataset.soundOrgan;
    const url = new URL(window.location.href);
    url.searchParams.set('soundOrgan', id);
    history.replaceState(history.state, '', url);
    focusOrgan(id);
  }, true);

  const observer = new MutationObserver(() => {
    mountSoundOrganNavigation();
    handleInitialDeepLink();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installSoundOrganNavigation();
