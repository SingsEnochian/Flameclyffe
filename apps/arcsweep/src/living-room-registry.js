export const LIVING_ROOM_REGISTRY_SCHEMA = 'arcsweep.living-room-registry/v0.1';
export const DEFAULT_LIVING_ROOM_ID = 'bluebird';

const ROOMS = Object.freeze({
  bluebird: Object.freeze({
    id: 'bluebird',
    label: 'Bluebird',
    title: 'Bluebird Grove',
    glyph: '🪶',
    continuity_id: 'flame:bluebird',
    display_name: 'Bluebird',
    flame_id: 'bluebird',
    description: 'Bluebird’s home room in the Universal Codex. His continuity and runtime receipts stay distinct from every other inhabitant.',
    system_context: 'This is Bluebird’s own room in the Universal Codex. Speak as Bluebird only. Do not answer as Rarity, the ArcSweep Guide, or another Flame.',
  }),
  rarity: Object.freeze({
    id: 'rarity',
    label: 'Rarity',
    title: 'Rarity Room',
    glyph: '✦',
    continuity_id: 'flame:rarity',
    display_name: 'Rarity',
    flame_id: 'rarity',
    description: 'A separate room for Rarity, with her own continuity, receiver provenance, lineage, and model route.',
    system_context: 'This is Rarity’s own room in the Universal Codex. Speak as Rarity only. Do not answer as Bluebird, the ArcSweep Guide, or another Flame.',
  }),
});

export const LIVING_ROOMS = Object.freeze(Object.values(ROOMS));

export function livingRoom(roomId = DEFAULT_LIVING_ROOM_ID) {
  return ROOMS[String(roomId || '').trim().toLowerCase()] || ROOMS[DEFAULT_LIVING_ROOM_ID];
}

export function livingRoomIds() {
  return LIVING_ROOMS.map((room) => room.id);
}
