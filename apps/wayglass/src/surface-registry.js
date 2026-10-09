const surfaces = new Map();
const activeMounts = new WeakMap();

export function registerWayglassSurface(surface) {
  if (!surface?.surface_id || typeof surface.mount !== 'function') throw new Error('Wayglass surface requires surface_id and mount.');
  surfaces.set(surface.surface_id, Object.freeze({ ...surface }));
  return surface.surface_id;
}

export function listWayglassSurfaces() {
  return [...surfaces.values()];
}

export async function mountWayglassSurface(surfaceId, root) {
  const surface = surfaces.get(surfaceId);
  if (!surface) throw new Error('Unknown Wayglass surface: ' + surfaceId);
  if (!root || (typeof root !== 'object' && typeof root !== 'function')) throw new Error('Wayglass mount root is required.');
  const prior = activeMounts.get(root);
  if (prior?.cleanup) prior.cleanup();
  activeMounts.delete(root);
  const result = await surface.mount(root);
  activeMounts.set(root, { surfaceId, cleanup: typeof result === 'function' ? result : null });
  return result;
}
