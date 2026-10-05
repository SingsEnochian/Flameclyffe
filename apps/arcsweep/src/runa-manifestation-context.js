import { loadState } from './storage.js';

export async function readRunaManifestationContext({
  readWorkspace = loadState,
  readBinding = () => globalThis.__arcsweepMagicBook?.state?.(),
  readSession = () => globalThis.__arcsweepOS?.session?.(),
} = {}) {
  let workspace;
  let binding;
  let session;
  try { workspace = await readWorkspace(); } catch {}
  try { binding = readBinding(); } catch {}
  try { session = readSession(); } catch {}
  // The workspace owns current selection. Navigation's session and the book's
  // persisted binding can lag behind it, particularly on a direct ?book=1 load.
  const worldId = workspace?.activeWorldId || binding?.active_world_id || session?.active_world_id || null;
  const world = workspace?.worlds?.find((item) => item.id === worldId);
  const worldName = world?.name
    || (binding?.active_world_id === worldId && binding?.active_world_name)
    || (session?.active_world_id === worldId && session?.active_world_name)
    || null;
  return {
    worldId,
    worldName,
    from: 'universal-codex',
    // Carry only audio configuration across the capability boundary.
    world: world ? {
      id: world.id,
      name: world.name,
      houseSourceKey: world.houseSourceKey,
      root_hz: world.root_hz,
      rootHz: world.rootHz,
      soundscape: world.soundscape ? { ...world.soundscape } : undefined,
    } : undefined,
  };
}
