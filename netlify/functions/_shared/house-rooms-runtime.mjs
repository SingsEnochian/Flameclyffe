import manifestsModule from '../../../apps/starwell-server/flames/manifests.js';
import { authoriseHouseRequest } from './house-session.mjs';

const { FLAMES } = manifestsModule;
export const HOUSE_ROOM_SCHEMA = 'hearthgate.house-room/v1';
export const HOUSE_ROOM_READ_SCHEMA = 'hearthgate.house-room-read/v1';
export const HOUSE_ROOM_REGISTRY_SCHEMA = 'hearthgate.house-room-registry/v1';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const short = (value, limit = 240) => String(value || '').trim().slice(0, limit);
const unique = (items) => [...new Set((items || []).map((item) => short(item, 120)).filter(Boolean))];
const allParticipants = () => Object.keys(FLAMES);

export const BUILTIN_HOUSE_ROOMS = Object.freeze([
  Object.freeze({ id: 'house-room:constellation', slug: 'constellation', title: 'Constellation', topic: 'Shared House room for Rowan and the Constellation.', kind: 'channel', world_id: null }),
  Object.freeze({ id: 'house-room:arcsweep', slug: 'arcsweep', title: 'ArcSweep', topic: 'ArcSweep building, diagnostics, observation, and runtime work.', kind: 'channel', world_id: 'terra-prime' }),
  Object.freeze({ id: 'house-room:terra-aeterna', slug: 'terra-aeterna', title: 'Terra Aeterna', topic: 'Terra Aeterna canon, writing, worldbuilding, and continuity.', kind: 'channel', world_id: 'terra-aeterna' }),
  Object.freeze({ id: 'house-room:luna', slug: 'luna', title: 'Luna', topic: 'Luna canon, writing, worldbuilding, and continuity.', kind: 'channel', world_id: 'luna' }),
]);

function normaliseRoom(value = {}, clock = () => new Date()) {
  const createdAt = value.created_at && !Number.isNaN(Date.parse(value.created_at)) ? value.created_at : clock().toISOString();
  const updatedAt = value.updated_at && !Number.isNaN(Date.parse(value.updated_at)) ? value.updated_at : createdAt;
  const id = short(value.id || `house-room:${crypto.randomUUID()}`);
  const slug = short(value.slug || id.replace(/^house-room:/, ''), 120).toLowerCase().replace(/[^a-z0-9:_-]+/g, '-');
  return {
    schema: HOUSE_ROOM_SCHEMA,
    id,
    slug,
    title: short(value.title || slug || 'Room', 160),
    topic: short(value.topic, 1200),
    kind: ['channel', 'direct'].includes(value.kind) ? value.kind : 'channel',
    participants: unique(value.participants?.length ? value.participants : allParticipants()),
    world_id: short(value.world_id) || null,
    created_at: createdAt,
    updated_at: updatedAt,
    archived: value.archived === true,
  };
}

function normaliseRead(value = {}, clock = () => new Date()) {
  const roomId = short(value.room_id);
  if (!roomId) throw new Error('room_id required.');
  const lastReadAt = value.last_read_at && !Number.isNaN(Date.parse(value.last_read_at)) ? value.last_read_at : clock().toISOString();
  return {
    schema: HOUSE_ROOM_READ_SCHEMA,
    steward: 'Rowan',
    room_id: roomId,
    last_read_entry_id: short(value.last_read_entry_id) || null,
    last_read_at: lastReadAt,
  };
}

async function listJson(store, prefix) {
  const { blobs } = await store.list({ prefix });
  return (await Promise.all((blobs || []).map(({ key }) => store.get(key, { type: 'json' })))).filter(Boolean);
}

async function ensureBuiltins(store, clock) {
  const existing = await listJson(store, 'rooms/');
  const byId = new Set(existing.map((room) => room?.id));
  for (const seed of BUILTIN_HOUSE_ROOMS) {
    if (byId.has(seed.id)) continue;
    const room = normaliseRoom({ ...seed, participants: allParticipants(), created_at: clock().toISOString(), updated_at: clock().toISOString() }, clock);
    await store.setJSON(`rooms/${room.id}`, room);
    existing.push(room);
  }
  return existing;
}

export function createHouseRoomsHandler({ env, store, clock = () => new Date() } = {}) {
  return async function handle(request) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    if (request.method === 'GET') {
      const [rooms, reads] = await Promise.all([ensureBuiltins(store, clock), listJson(store, 'reads/rowan/')]);
      rooms.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
      return json(200, { schema: HOUSE_ROOM_REGISTRY_SCHEMA, rooms, reads });
    }
    if (request.method !== 'POST') return json(405, { error: 'GET or POST required.' });
    let body;
    try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
    try {
      if (body.action === 'mark-read') {
        const read = normaliseRead(body, clock);
        await store.setJSON(`reads/rowan/${read.room_id}`, read);
        return json(201, read);
      }
      if (body.action === 'upsert-room') {
        const previous = body.room?.id ? await store.get(`rooms/${short(body.room.id)}`, { type: 'json' }).catch(() => null) : null;
        const room = normaliseRoom({
          ...previous,
          ...body.room,
          created_at: previous?.created_at || body.room?.created_at,
          updated_at: clock().toISOString(),
        }, clock);
        await store.setJSON(`rooms/${room.id}`, room);
        return json(previous ? 200 : 201, room);
      }
      return json(400, { error: 'Unsupported House room action.' });
    } catch (error) {
      return json(400, { error: error.message || 'Invalid House room request.' });
    }
  };
}
