import { loadState, saveState } from './storage.js';
import { ensureTerraPrimeWakingWorld } from './waking-world.js';
import {
  WORLD_REGISTRY_JOURNAL_KEY,
  createWorldRegistryJournal,
  normaliseWorldRegistryJournal,
  recordWorldSnapshot,
} from './world-registry-journal.js';

const SYNC_EVENT = 'arcsweep:terra-prime-synchronised';

function readJournal() {
  try {
    const raw = globalThis.localStorage?.getItem(WORLD_REGISTRY_JOURNAL_KEY);
    return normaliseWorldRegistryJournal(raw ? JSON.parse(raw) : createWorldRegistryJournal());
  } catch {
    return createWorldRegistryJournal();
  }
}

function writeJournalWorld(world, writtenAt) {
  const journal = recordWorldSnapshot(readJournal(), world, writtenAt);
  try {
    globalThis.localStorage?.setItem(WORLD_REGISTRY_JOURNAL_KEY, JSON.stringify(journal));
  } catch {
    throw new Error('Terra Prime could not be written to the durable World Registry recovery journal');
  }
  return journal;
}

export async function synchroniseTerraPrimeWakingWorld(now = new Date().toISOString()) {
  const state = await loadState();
  const result = ensureTerraPrimeWakingWorld(state, now);
  if (!result.changed) return result;

  writeJournalWorld(result.world, now);
  await saveState(result.state, {
    reason: 'terra-prime-waking-world-sync',
    worldId: result.world.id,
    worldBirthReceiptId: result.receipt?.id || null,
  });
  globalThis.document?.dispatchEvent?.(new CustomEvent(SYNC_EVENT, {
    detail: {
      worldId: result.world.id,
      created: result.created,
      birthReceiptId: result.receipt?.id || null,
      stableAnchorRevisedAt: result.world.wakingWorld?.stable_anchor?.source_revised_at || null,
    },
  }));
  return result;
}

export function installTerraPrimeWakingWorldSidecar() {
  if (typeof document === 'undefined') return;
  void synchroniseTerraPrimeWakingWorld()
    .then((result) => {
      if (result.changed) globalThis.location?.reload?.();
    })
    .catch((error) => console.error('TERRA_PRIME_WAKING_WORLD_SYNC', error));
}

export const TERRA_PRIME_EVENTS = Object.freeze({ synchronised: SYNC_EVENT });

if (typeof document !== 'undefined') installTerraPrimeWakingWorldSidecar();
