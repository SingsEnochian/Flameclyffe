import { CREATIVE_ORGANS } from './creative-organ-registry.js';

export const CREATIVE_ORGAN_NAV_MARKER = 'arcsweep.creative-organs/v1';

function pagesHref(organ) {
  if (window.location.hostname === 'singsenochian.github.io') return organ.pagesHref;
  return organ.pagesHref;
}

function organButton(organ) {
  const button = document.createElement('a');
  button.className = 'nav-room creative-organ-link';
  button.dataset.creativeOrgan = organ.id;
  button.href = pagesHref(organ);
  button.title = organ.description;
  button.innerHTML = `<span aria-hidden="true">${organ.glyph}</span><span>${organ.label}</span>`;
  return button;
}

export function mountCreativeOrganNavigation() {
  const nav = document.querySelector('.sidebar nav[aria-label="Primary Arcsweep rooms"]');
  if (!nav) return null;
  let group = nav.querySelector(`[data-creative-organ-nav="${CREATIVE_ORGAN_NAV_MARKER}"]`);
  if (group) return group;

  const forge = nav.querySelector('[data-room="forge"]');
  group = document.createElement('section');
  group.className = 'creative-organ-nav';
  group.dataset.creativeOrganNav = CREATIVE_ORGAN_NAV_MARKER;
  group.setAttribute('aria-label', 'Creative instruments');
  group.innerHTML = '<small>Creative instruments</small>';
  CREATIVE_ORGANS.forEach((organ) => group.append(organButton(organ)));
  if (forge) forge.insertAdjacentElement('afterend', group);
  else nav.append(group);
  return group;
}

export function installCreativeOrganNavigation() {
  mountCreativeOrganNavigation();
  const observer = new MutationObserver(() => mountCreativeOrganNavigation());
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installCreativeOrganNavigation();
