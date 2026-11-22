const surfaces = new Map();
const aliases = new Map();
const activeMounts = new WeakMap();
const mountEpochs = new WeakMap();

export function registerWayglassSurface(surface) {
  if (!surface?.surface_id || typeof surface.mount !== 'function') throw new Error('Wayglass surface requires surface_id and mount.');
  surfaces.set(surface.surface_id, Object.freeze({ ...surface }));
  return surface.surface_id;
}

export function registerWayglassSurfaceAlias(aliasId, targetId) {
  const alias = String(aliasId || '').trim();
  const target = String(targetId || '').trim();
  if (!alias || !target) throw new Error('Wayglass surface alias requires alias and target.');
  if (alias === target) throw new Error('Wayglass surface alias cannot target itself.');
  aliases.set(alias, target);
  return alias;
}

export function resolveWayglassSurfaceId(surfaceId) {
  let current = String(surfaceId || '').trim();
  const seen = new Set();
  while (aliases.has(current)) {
    if (seen.has(current)) throw new Error('Wayglass surface alias cycle: ' + current);
    seen.add(current);
    current = aliases.get(current);
  }
  return current;
}

export function listWayglassSurfaceAliases() {
  return Object.freeze([...aliases.entries()].map(([alias_id, target_id]) => Object.freeze({ alias_id, target_id })));
}

export function listWayglassSurfaces() {
  return [...surfaces.values()];
}

export async function mountWayglassSurface(surfaceId, root) {
  const resolvedId = resolveWayglassSurfaceId(surfaceId);
  const surface = surfaces.get(resolvedId);
  if (!surface) throw new Error('Unknown Wayglass surface: ' + surfaceId);
  if (!root || (typeof root !== 'object' && typeof root !== 'function')) throw new Error('Wayglass mount root is required.');
  // An older async mount must never become the active owner after a newer navigation.
  const epoch = (mountEpochs.get(root) || 0) + 1;
  mountEpochs.set(root, epoch);
  const prior = activeMounts.get(root);
  activeMounts.delete(root);
  if (prior?.controller) prior.controller.abort('room-navigation');
  if (prior?.cleanup) prior.cleanup();
  const controller = new AbortController();
  activeMounts.set(root, { surfaceId: resolvedId, controller, cleanup: null });
  let result;
  try {
    // Existing one-argument mounts remain compatible; new rooms can observe signal.
    result = await surface.mount(root, { signal: controller.signal, surfaceId: resolvedId });
  } catch (error) {
    controller.abort('mount-failed');
    if (mountEpochs.get(root) === epoch) activeMounts.delete(root);
    throw error;
  }
  const cleanup = typeof result === 'function' ? result : (typeof result?.destroy === 'function' ? () => result.destroy() : null);
  if (mountEpochs.get(root) !== epoch) {
    controller.abort('superseded-room');
    if (cleanup) cleanup();
    return result;
  }
  activeMounts.set(root, { surfaceId: resolvedId, controller, cleanup });
  return result;
}
