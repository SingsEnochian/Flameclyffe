export const PROJECT_ZERO_EVENT_RAIL_KEY = 'flameclyffe.project-zero-companion.event-rail/v1';
const ROOT_ID = 'project-zero-great-braid-rail';

export function readGreatBraidRail(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage?.getItem?.(PROJECT_ZERO_EVENT_RAIL_KEY) || '[]');
    return Array.isArray(value) ? value.filter((event) => event?.type === 'arcsweep.great-braid.receipted') : [];
  } catch {
    return [];
  }
}

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function greatBraidRailMarkup(events = []) {
  return `<section class="panel" data-great-braid-rail><p class="eyebrow">Arcsweep · Great Braid</p><h2>Receipted crossings</h2>${events.length ? `<div class="event-list">${events.slice(0, 12).map((event) => `<article class="event-card"><strong>${esc(event.payload?.arc?.intention || 'Great Braid receipt')}</strong><span>${esc(event.payload?.stages?.bifrost?.source_world_id || '?')} → ${esc(event.payload?.stages?.bifrost?.destination_world_id || '?')}</span><small>${esc(event.payload?.great_braid_receipt_id || '')} · ${esc(event.created_at || '')}</small></article>`).join('')}</div>` : '<p class="small">No Great Braid receipts have reached this Companion rail yet.</p>'}</section>`;
}

export function renderGreatBraidRail(root = document, storage = globalThis.localStorage) {
  const reactRoot = root.querySelector?.('#root');
  if (!reactRoot) return false;
  let host = root.getElementById?.(ROOT_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = ROOT_ID;
    reactRoot.insertAdjacentElement('afterend', host);
  }
  host.innerHTML = greatBraidRailMarkup(readGreatBraidRail(storage));
  return true;
}

export function installGreatBraidRail() {
  if (typeof document === 'undefined') return;
  renderGreatBraidRail();
  globalThis.addEventListener?.('storage', (event) => {
    if (event.key === PROJECT_ZERO_EVENT_RAIL_KEY) renderGreatBraidRail();
  });
  globalThis.addEventListener?.('project-zero-companion:event', () => renderGreatBraidRail());
}

if (typeof document !== 'undefined') installGreatBraidRail();
