// In-page, user-click navigation handoff. Never persists, authorises, or contacts a provider.
const WORLD_IDS = new Set(['bluebird:spicychat','vethrlauf:spicychat','evil-gene:film-2015']);
let pendingWorld = null;
export function prepareWayglassCrewRoom(worldId) {
  if (!WORLD_IDS.has(worldId)) throw new TypeError('Unknown Crew destination');
  pendingWorld = worldId;
}
export function consumeWayglassCrewRoom() {
  const current = pendingWorld;
  pendingWorld = null;
  return current;
}
