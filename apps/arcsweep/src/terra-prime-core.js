import { loadState, saveState } from './storage.js';
import { ensureTerraPrimeWakingWorld } from './waking-world.js';
import {
  WORLD_REGISTRY_JOURNAL_KEY,
  createWorldRegistryJournal,
  normaliseWorldRegistryJournal,
  reconcileWorldRegistry,
  recordWorldSnapshot,
} from './world-registry-journal.js';

export const TERRA_PRIME_SYNC_EVENT = 'arcsweep:terra-prime-synchronised';

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
  const loaded = await loadState();
  const reconciled = reconcileWorldRegistry(loaded, readJournal());
  const result = ensureTerraPrimeWakingWorld(reconciled.state, now);
  const changed = Boolean(reconciled.changed || result.changed);

  if (!changed) {
    return { ...result, changed: false, registryRecovered: false };
  }

  writeJournalWorld(result.world, now);
  await saveState(result.state, {
    reason: 'terra-prime-waking-world-sync',
    worldId: result.world.id,
    worldBirthReceiptId: result.receipt?.id || null,
    registryRecovered: reconciled.changed,
  });

  globalThis.document?.dispatchEvent?.(new CustomEvent(TERRA_PRIME_SYNC_EVENT, {
    detail: {
      worldId: result.world.id,
      created: result.created,
      birthReceiptId: result.receipt?.id || null,
      registryRecovered: reconciled.changed,
      stableAnchorRevisedAt: result.world.wakingWorld?.stable_anchor?.source_revised_at || null,
    },
  }));

  return { ...result, changed: true, registryRecovered: reconciled.changed };
}
