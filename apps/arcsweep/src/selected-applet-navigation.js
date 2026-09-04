import { visibleApplets } from './applets.js';
import { loadState } from './storage.js';

export const SELECTED_APPLET_NAV_VERSION = 'arcsweep.selected-applet-navigation/v1';

const PERMANENT_ROOM_IDS = new Set([
  'portal', 'worlds', 'scripts', 'records', 'kelyran-school', 'feedback',
  'commons', 'waking-thread', 'forge', 'deep-observer', 'settings',
]);

let refreshQueued = false;
let refreshGeneration = 0;

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

function activeRoomId() {
  return document.querySelector('.content[data-houseglass-room]')?.dataset.houseglassRoom
    || document.querySelector('.sidebar nav [data-room].active')?.dataset.room
    || 'portal';
}

function activeWorldFromState(state) {
  return state?.worlds?.find((world) => world.id === state.activeWorldId) || state?.worlds?.[0] || null;
}

export function selectedNavigationApplets(state) {
  const world = activeWorldFromState(state);
  if (!world) return [];
  return visibleApplets(world.applets || []).filter((applet) => !PERMANENT_ROOM_IDS.has(applet.id));
}

function navMarkup(applets) {
  const active = activeRoomId();
  return applets.map((applet) => `<button class="nav-button ${active === applet.id ? 'active' : ''}" data-room="${escapeHtml(applet.id)}" data-selected-applet="true"><span aria-hidden="true">${escapeHtml(applet.glyph)}</span><span>${escapeHtml(applet.label)}</span></button>`).join('');
}

export async function refreshSelectedAppletNavigation() {
  if (typeof document === 'undefined') return { status: 'no-document', count: 0 };
  const generation = ++refreshGeneration;
  const primary = document.querySelector('.sidebar nav[aria-label="Primary Arcsweep rooms"]');
  if (!primary) return { status: 'no-sidebar', count: 0 };

  let state;
  try { state = await loadState(); }
  catch { return { status: 'state-unavailable', count: 0 }; }
  if (generation !== refreshGeneration) return { status: 'superseded', count: 0 };

  const applets = selectedNavigationApplets(state);
  let nav = document.querySelector('.sidebar nav[data-selected-applet-nav]');
  if (!applets.length) {
    nav?.remove();
    return { status: 'ready', count: 0 };
  }
  if (!nav) {
    nav = document.createElement('nav');
    nav.dataset.selectedAppletNav = SELECTED_APPLET_NAV_VERSION;
    nav.setAttribute('aria-label', 'Selected Arcsweep applets');
    primary.insertAdjacentElement('afterend', nav);
  }
  const next = navMarkup(applets);
  if (nav.innerHTML !== next) nav.innerHTML = next;
  return { status: 'ready', count: applets.length };
}

function queueRefresh(delay = 0) {
  if (refreshQueued) return;
  refreshQueued = true;
  setTimeout(() => {
    refreshQueued = false;
    void refreshSelectedAppletNavigation();
  }, delay);
}

export function installSelectedAppletNavigation() {
  if (typeof document === 'undefined' || globalThis.__arcsweepSelectedAppletNavigationInstalled) return false;
  globalThis.__arcsweepSelectedAppletNavigationInstalled = SELECTED_APPLET_NAV_VERSION;

  const app = document.querySelector('#app');
  if (app) new MutationObserver(() => queueRefresh()).observe(app, { childList: true, subtree: true });
  document.addEventListener('submit', (event) => {
    if (event.target?.id === 'applet-form') queueRefresh(180);
  }, true);
  globalThis.addEventListener?.('arcsweep:durable-state-reconciled', () => queueRefresh());
  queueRefresh();
  return true;
}

if (typeof document !== 'undefined') installSelectedAppletNavigation();
