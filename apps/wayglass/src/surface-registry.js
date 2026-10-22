const surfaces = new Map();

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
  return surface.mount(root);
}
