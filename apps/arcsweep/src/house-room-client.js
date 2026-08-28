import { HOUSE_COOKIE_SESSION, readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';

async function activeSession(fetchImpl = fetch) {
  return readHouseRuntimeToken() || await restoreHouseRuntimeSession(fetchImpl);
}
function authHeaders(token) {
  return token && token !== HOUSE_COOKIE_SESSION ? { authorization: `Bearer ${token}` } : {};
}
async function requestRooms(options = {}, fetchImpl = fetch) {
  const token = await activeSession(fetchImpl);
  if (!token) throw new Error('House Runtime offline.');
  const response = await fetchImpl('/api/v1/house/rooms', {
    ...options,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { ...(options.headers || {}), ...authHeaders(token) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `House rooms ${response.status}`);
  return data;
}

export function readHouseRooms(fetchImpl = fetch) {
  return requestRooms({}, fetchImpl);
}
export function markHouseRoomRead(roomId, lastReadEntryId = null, lastReadAt = new Date().toISOString(), fetchImpl = fetch) {
  return requestRooms({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'mark-read', room_id: roomId, last_read_entry_id: lastReadEntryId, last_read_at: lastReadAt }),
  }, fetchImpl);
}
export function upsertHouseRoom(room, fetchImpl = fetch) {
  return requestRooms({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'upsert-room', room }),
  }, fetchImpl);
}

export function roomUnreadCount(entries = [], room = null, read = null) {
  if (!room?.id) return 0;
  const cutoff = read?.last_read_at ? Date.parse(read.last_read_at) : 0;
  return entries.filter((entry) => {
    const thread = entry?.thread_id || entry?.turn_id || entry?.id;
    if (thread !== room.id) return false;
    const created = Date.parse(entry?.created_at || '') || 0;
    return created > cutoff && entry?.kind !== 'steward';
  }).length;
}
