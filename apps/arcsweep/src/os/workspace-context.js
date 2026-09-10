import { loadState, saveState, setStateExtensionSnapshot, clearStateExtensionSnapshot, readPersistedStateExtension } from '../storage.js';

export const OS_WORKSPACE_CONTEXT_KEY = 'arcsweepOSContext';

export function createWorkspaceContext({ load = loadState, save = saveState, read = readPersistedStateExtension,
  set = setStateExtensionSnapshot, clear = clearStateExtensionSnapshot } = {}) {
  let pending = Promise.resolve();
  function write(value) {
    const snapshot = structuredClone(value);
    const operation = pending.catch(() => {}).then(async () => {
      const previous = await read(OS_WORKSPACE_CONTEXT_KEY);
      const state = await load();
      set(OS_WORKSPACE_CONTEXT_KEY, snapshot);
      state[OS_WORKSPACE_CONTEXT_KEY] = snapshot;
      try {
        await save(state, { reason: 'arcsweep-os-context' });
        const actual = await read(OS_WORKSPACE_CONTEXT_KEY);
        if (JSON.stringify(actual) !== JSON.stringify(snapshot)) throw new Error('OS workspace context readback mismatch.');
        return { stored: true, storage: 'hearthfire-state', cloud_verified: false };
      } catch (error) {
        if (previous === null) clear(OS_WORKSPACE_CONTEXT_KEY);
        else set(OS_WORKSPACE_CONTEXT_KEY, previous);
        throw error;
      }
    });
    pending = operation;
    return operation;
  }
  return Object.freeze({
    read: () => read(OS_WORKSPACE_CONTEXT_KEY),
    write,
    activeContext: async () => {
      const state = await load();
      return { world_id: state.activeWorldId || null };
    },
  });
}
