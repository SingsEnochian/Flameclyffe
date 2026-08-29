import { CREATIVE_ORGANS } from './creative-organ-registry.js';

export const CREATIVE_ORGAN_NAV_MARKER = 'arcsweep.creative-organs/v1';

function pagesHref(organ) {
  return organ.pagesHref;
}

function ensureStyles() {
  if (document.querySelector('[data-creative-organ-style]')) return;
  const style = document.createElement('style');
  style.dataset.creativeOrganStyle = CREATIVE_ORGAN_NAV_MARKER;
  style.textContent = `
    .creative-organ-nav{display:grid;gap:.3rem;margin:.35rem 0 .75rem;padding:.55rem .35rem .2rem;border-top:1px solid color-mix(in srgb,var(--accent,#c89b62) 28%,transparent)}
    .creative-organ-nav>small{padding:0 .5rem .2rem;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;opacity:.68}
    .creative-organ-link{display:grid;grid-template-columns:1.6rem 1fr;align-items:center;gap:.45rem;padding:.55rem .65rem;border-radius:.65rem;color:inherit;text-decoration:none;font-size:.86rem}
    .creative-organ-link:hover,.creative-organ-link:focus-visible{background:color-mix(in srgb,var(--accent,#c89b62) 12%,transparent);outline:none}
  `;
  document.head.append(style);
}

function organButton(organ) {
  const button = document.createElement('a');
  button.className = 'creative-organ-link';
  button.dataset.creativeOrgan = organ.id;
  button.href = pagesHref(organ);
  button.title = organ.description;
  button.innerHTML = `<span aria-hidden="true">${organ.glyph}</span><span>${organ.label}</span>`;
  return button;
}

export function mountCreativeOrganNavigation() {
  ensureStyles();
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
