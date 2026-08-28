import { readHouseRooms, upsertHouseRoom } from './house-room-client.js';
import { HOUSE_CHAT_HOME_ROOM_ID } from './house-commons-chat-v5-core.js';

let installed = false;
let observer = null;
let cache = [];
let refreshInFlight = null;

async function refreshRooms() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = readHouseRooms().then((data) => { cache = Array.isArray(data?.rooms) ? data.rooms : []; return cache; }).catch(() => cache).finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

function activeSelect() { return document.querySelector('.commons-log [data-house-room-select], .commons-log [data-commons-thread]'); }
function activeRoom() { const id = activeSelect()?.value || ''; return cache.find((room) => room.id === id) || null; }
function slugFromTitle(title) { return String(title || '').trim().toLowerCase().replace(/[^a-z0-9:_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'room'; }
function reflectRoom(room) {
  if (!room) return;
  const selector = activeSelect();
  const option = selector ? [...selector.options].find((item) => item.value === room.id) : null;
  if (option) option.textContent = `${room.kind === 'direct' ? '@' : '#'}${room.slug || room.title}`;
  if (selector?.value === room.id) {
    const heading = document.querySelector('.commons-chat-log-head h2'); if (heading) heading.textContent = `${room.kind === 'direct' ? '@' : '#'}${room.slug || room.title}`;
    const topic = document.querySelector('.commons-chat-log-head h2 + span'); if (topic) topic.textContent = room.topic || '';
  }
}

async function renameRoom(room) {
  if (!room) return;
  const title = window.prompt('Room title', room.title || room.slug || 'Room');
  if (!title?.trim()) return;
  const cleanTitle = title.trim().slice(0, 160);
  const saved = await upsertHouseRoom({ ...room, title: cleanTitle, slug: slugFromTitle(cleanTitle) });
  const index = cache.findIndex((item) => item.id === saved.id); index >= 0 ? cache.splice(index, 1, saved) : cache.push(saved);
  reflectRoom(saved);
  document.dispatchEvent(new CustomEvent('arcsweep:house-room-metadata-changed', { detail: { room: saved } }));
}

async function archiveRoom(room) {
  if (!room || room.id === HOUSE_CHAT_HOME_ROOM_ID) return;
  const saved = await upsertHouseRoom({ ...room, archived: true });
  const index = cache.findIndex((item) => item.id === saved.id); index >= 0 ? cache.splice(index, 1, saved) : cache.push(saved);
  document.dispatchEvent(new CustomEvent('arcsweep:house-room-metadata-changed', { detail: { room: saved } }));
  const selector = activeSelect();
  if (selector) {
    const archivedOption = [...selector.options].find((option) => option.value === room.id);
    archivedOption?.remove();
    selector.value = [...selector.options].some((option) => option.value === HOUSE_CHAT_HOME_ROOM_ID) ? HOUSE_CHAT_HOME_ROOM_ID : selector.options[0]?.value || '';
    selector.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function decorate() {
  if (document.querySelector('#commons-form')?.dataset.commonsEnhanced !== 'v5') return;
  const tools = document.querySelector('.commons-chat-log-head .commons-log-tools');
  if (!tools || tools.querySelector('[data-v5-room-rename]')) return;
  const rename = document.createElement('button'); rename.type = 'button'; rename.className = 'quiet mini'; rename.dataset.v5RoomRename = 'true'; rename.textContent = 'Rename room';
  const archive = document.createElement('button'); archive.type = 'button'; archive.className = 'quiet mini'; archive.dataset.v5RoomArchive = 'true'; archive.textContent = 'Archive room';
  rename.onclick = async () => { await refreshRooms(); await renameRoom(activeRoom()); };
  archive.onclick = async () => { await refreshRooms(); const room = activeRoom(); archive.disabled = room?.id === HOUSE_CHAT_HOME_ROOM_ID; await archiveRoom(room); archive.disabled = false; };
  tools.append(rename, archive);
  const room = activeRoom(); archive.disabled = room?.id === HOUSE_CHAT_HOME_ROOM_ID;
}

function captureLegacyManagement(event) {
  if (document.querySelector('#commons-form')?.dataset.commonsEnhanced !== 'v5') return;
  const rename = event.target.closest?.('[data-commons-command-room] [data-rename-thread]');
  const archive = event.target.closest?.('[data-commons-command-room] [data-archive-thread]');
  const button = rename || archive;
  if (!button) return;
  const id = rename?.dataset.renameThread || archive?.dataset.archiveThread;
  if (!String(id || '').startsWith('house-room:')) return;
  event.preventDefault(); event.stopImmediatePropagation();
  void refreshRooms().then(() => {
    const room = cache.find((item) => item.id === id);
    return rename ? renameRoom(room) : archiveRoom(room);
  });
}

export function installHouseChatRoomManagementV5() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('click', captureLegacyManagement, true);
  document.addEventListener('arcsweep:house-room-metadata-changed', () => { void refreshRooms().then(() => { reflectRoom(activeRoom()); decorate(); }); });
  observer = new MutationObserver(decorate); observer.observe(document.body, { childList: true, subtree: true });
  void refreshRooms().then(decorate);
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installHouseChatRoomManagementV5();
