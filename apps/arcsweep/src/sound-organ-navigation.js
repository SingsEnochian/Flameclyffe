import { SOUND_ORGANS, SOUND_ORGAN_REGISTRY_VERSION, soundOrgan } from './sound-organ-registry.js';

let initialDeepLinkHandled = false;
let focusTimer = null;

function ensureStyles() {
  if (document.querySelector('[data-sound-organ-style]')) return;
  const style = document.createElement('style');
  style.dataset.soundOrganStyle = SOUND_ORGAN_REGISTRY_VERSION;
  style.textContent = `
    .sound-organ-nav{display:grid;gap:.3rem;margin:.35rem 0 .75rem;padding:.55rem .35rem .2rem;border-top:1px solid color-mix(in srgb,var(--accent,#c89b62) 28%,transparent)}
    .sound-organ-nav>small{padding:0 .5rem .2rem;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;opacity:.68}
    .sound-organ-link{display:grid;grid-template-columns:1.6rem 1fr;align-items:center;gap:.45rem;width:100%;padding:.55rem .65rem;border:0;border-radius:.65rem;background:transparent;color:inherit;text-decoration:none;text-align:left;font:inherit;font-size:.86rem;cursor:pointer}
    .sound-organ-link:hover,.sound-organ-link:focus-visible{background:color-mix(in srgb,var(--accent,#c89b62) 12%,transparent);outline:none}
    .sound-instrument-rail{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;margin:0 0 .8rem;padding:.45rem;border:1px solid color-mix(in srgb,var(--accent,#c89b62) 25%,transparent);border-radius:.75rem;background:#0002}
    .sound-instrument-rail>small{padding:0 .35rem;font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;opacity:.66}
    .sound-instrument-rail .sound-organ-link{display:inline-flex;width:auto;padding:.42rem .6rem;font-size:.78rem}
    [data-sound-organ-focused]{scroll-margin-top:1rem;outline:1px solid color-mix(in srgb,var(--accent,#c89b62) 62%,transparent);outline-offset:.35rem}
    .soundfont-runtime-diagnostic[data-state="ready"]{color:var(--secondary,#92b8a1)}
    .soundfont-runtime-diagnostic[data-state="loading"]{color:#d3ad69}
    .soundfont-runtime-diagnostic[data-state="error"]{color:#d98282}
  `;
  document.head.append(style);
}

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
  }, 60);
}

function nativeButton(organ, rail = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sound-organ-link';
  if (!rail) button.dataset.room = organ.roomId;
  button.dataset.soundOrgan = organ.id;
  button.dataset.soundFocus = organ.focusSelector;
  button.title = organ.description;
  button.innerHTML = `<span aria-hidden="true">${organ.glyph}</span><span>${organ.label}</span>`;
  if (rail) button.addEventListener('click', () => focusOrgan(organ.id));
  return button;
}

function externalLink(organ) {
  const link = document.createElement('a');
  link.className = 'sound-organ-link';
  link.dataset.soundOrgan = organ.id;
  link.href = organ.pagesHref;
  link.title = organ.description;
  link.innerHTML = `<span aria-hidden="true">${organ.glyph}</span><span>${organ.label}</span>`;
  return link;
}

export function mountSoundOrganNavigation() {
  ensureStyles();
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

export function mountSoundInstrumentRail() {
  const soundscape = document.querySelector('[data-story-soundscape]') || document.querySelector('.soundfont-rack')?.parentElement;
  if (!soundscape || soundscape.querySelector(`[data-sound-instrument-rail="${SOUND_ORGAN_REGISTRY_VERSION}"]`)) return null;
  const rail = document.createElement('nav');
  rail.className = 'sound-instrument-rail';
  rail.dataset.soundInstrumentRail = SOUND_ORGAN_REGISTRY_VERSION;
  rail.setAttribute('aria-label', 'Sound Room instruments');
  rail.innerHTML = '<small>Sound Room</small>';
  SOUND_ORGANS.forEach((organ) => rail.append(organ.kind === 'external' ? externalLink(organ) : nativeButton(organ, true)));
  soundscape.prepend(rail);
  return rail;
}

function handleInitialDeepLink() {
  if (initialDeepLinkHandled) return;
  const id = new URLSearchParams(window.location.search).get('soundOrgan');
  const organ = soundOrgan(id);
  if (!organ || organ.kind !== 'native-focus') {
    initialDeepLinkHandled = true;
    return;
  }
  const button = document.querySelector(`[data-sound-organ="${id}"][data-room]`);
  if (!button) return;
  initialDeepLinkHandled = true;
  button.click();
  focusOrgan(id);
}

export function installSoundOrganNavigation() {
  mountSoundOrganNavigation();
  mountSoundInstrumentRail();
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
    mountSoundInstrumentRail();
    handleInitialDeepLink();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installSoundOrganNavigation();
