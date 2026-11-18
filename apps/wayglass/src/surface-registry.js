const surfaces = new Map();
const aliases = new Map();
const activeMounts = new WeakMap();

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
  const prior = activeMounts.get(root);
  if (prior?.cleanup) prior.cleanup();
  activeMounts.delete(root);
  const result = await surface.mount(root);
  activeMounts.set(root, { surfaceId: resolvedId, cleanup: typeof result === 'function' ? result : (typeof result?.destroy === 'function' ? () => result.destroy() : null) });
  return result;
}
