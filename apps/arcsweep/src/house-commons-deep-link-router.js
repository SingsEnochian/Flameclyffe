export const COMMONS_DEEP_LINK_KEY = 'arcsweep.house-commons-deep-link/v1';
const esc = (value = '') => String(value).replaceAll('"', '\\"');
const roomForKind = Object.freeze({ world: 'worlds', script: 'scripts', scene: 'scripts', record: 'records', canon: 'records', feedback: 'feedback' });

export function deepLinkSelector(kind, id) {
  const value = esc(id);
  if (kind === 'world') return `[data-world-id="${value}"]`;
  if (kind === 'script' || kind === 'scene') return `[data-script-id="${value}"]`;
  if (kind === 'record' || kind === 'canon') return `[data-record-id="${value}"]`;
  if (kind === 'feedback') return `[data-cycle-id="${value}"]`;
  return null;
}
export function createCommonsDeepLink(kind, id, label = null) {
  const normalKind = String(kind || '').trim().toLowerCase();
  const targetId = String(id || '').trim();
  return { kind: normalKind, id: targetId, label: label ? String(label) : null, room: roomForKind[normalKind] || null, selector: deepLinkSelector(normalKind, targetId) };
}
function remember(link) { try { localStorage.setItem(COMMONS_DEEP_LINK_KEY, JSON.stringify(link)); } catch {} }
function clear() { try { localStorage.removeItem(COMMONS_DEEP_LINK_KEY); } catch {} }
function read() { try { return JSON.parse(localStorage.getItem(COMMONS_DEEP_LINK_KEY) || 'null'); } catch { return null; } }
function activateRoom(room) { const button = document.querySelector(`[data-room="${room}"]`); button?.click(); }
function resolve(link, attempts = 0) {
  if (!link?.selector) return false;
  const target = document.querySelector(link.selector);
  if (target) {
    if (link.kind !== 'feedback') target.click?.();
    const focus = link.kind === 'feedback' ? target.closest('.queue-entry,.runtime-observation') || target : target;
    focus.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    focus.classList?.add('commons-deep-link-target');
    setTimeout(() => focus.classList?.remove('commons-deep-link-target'), 4000);
    clear();
    document.dispatchEvent(new CustomEvent('arcsweep:deep-link-opened', { detail: link }));
    return true;
  }
  if (attempts < 24) setTimeout(() => resolve(link, attempts + 1), 75);
  return false;
}
export function openCommonsDeepLink(input) {
  const link = createCommonsDeepLink(input?.kind, input?.id, input?.label);
  if (!link.room || !link.selector) return false;
  remember(link); activateRoom(link.room); queueMicrotask(() => resolve(link)); return true;
}
export function installCommonsDeepLinkRouter() {
  if (typeof document === 'undefined') return;
  const style = document.createElement('style'); style.textContent = '.commons-deep-link-target{outline:3px solid var(--gold)!important;outline-offset:4px;box-shadow:0 0 0 8px color-mix(in srgb,var(--gold) 15%,transparent)!important}'; document.head.append(style);
  const handle = (event) => openCommonsDeepLink(event.detail || {});
  document.addEventListener('arcsweep:commons-open-link', handle);
  document.addEventListener('arcsweep:commons-cross-link-open', handle);
  const pending = read(); if (pending?.room) { activateRoom(pending.room); queueMicrotask(() => resolve(pending)); }
}
if (typeof document !== 'undefined') installCommonsDeepLinkRouter();
