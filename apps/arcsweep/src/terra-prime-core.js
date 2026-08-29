import { HOUSE_DR_BUNDLE } from './house-dr-bundle.js';
import {
  applyHouseDrBundle,
  inspectHouseDrBundleIntegrity,
  repairHouseDrBundle,
} from './house-dr-library.js';
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

export function reconcileHouseDrLibraryBeforeHydration(state, now = new Date().toISOString()) {
  const integrity = inspectHouseDrBundleIntegrity(state, HOUSE_DR_BUNDLE);
  if (integrity.complete) {
    return { state, changed: false, mode: 'verified', integrity, summary: null };
  }

  if (integrity.currentReceipt) {
    const repaired = repairHouseDrBundle(state, HOUSE_DR_BUNDLE, now);
    return {
      ...repaired,
      mode: 'additive-repair',
      integrity,
    };
  }

  const installed = applyHouseDrBundle(state, HOUSE_DR_BUNDLE, now);
  return {
    ...installed,
    changed: true,
    mode: 'install',
    integrity,
  };
}

export async function synchroniseTerraPrimeWakingWorld(now = new Date().toISOString()) {
  const loaded = await loadState();
  const library = reconcileHouseDrLibraryBeforeHydration(loaded, now);
  const reconciled = reconcileWorldRegistry(library.state, readJournal());
  const result = ensureTerraPrimeWakingWorld(reconciled.state, now);
  const changed = Boolean(library.changed || reconciled.changed || result.changed);

  if (!changed) {
    return {
      ...result,
      changed: false,
      registryRecovered: false,
      houseLibraryRecovered: false,
      houseLibraryMode: library.mode,
      houseLibrarySummary: library.summary,
    };
  }

  writeJournalWorld(result.world, now);
  await saveState(result.state, {
    reason: library.changed ? 'house-library-and-terra-prime-integrity-sync' : 'terra-prime-waking-world-sync',
    worldId: result.world.id,
    worldBirthReceiptId: result.receipt?.id || null,
    registryRecovered: reconciled.changed,
    houseLibraryRecovered: library.changed,
    houseLibraryMode: library.mode,
    houseLibrarySummary: library.summary,
  });

  globalThis.document?.dispatchEvent?.(new CustomEvent(TERRA_PRIME_SYNC_EVENT, {
    detail: {
      worldId: result.world.id,
      created: result.created,
      birthReceiptId: result.receipt?.id || null,
      registryRecovered: reconciled.changed,
      houseLibraryRecovered: library.changed,
      houseLibraryMode: library.mode,
      houseLibrarySummary: library.summary,
      stableAnchorRevisedAt: result.world.wakingWorld?.stable_anchor?.source_revised_at || null,
    },
  }));

  return {
    ...result,
    changed: true,
    registryRecovered: reconciled.changed,
    houseLibraryRecovered: library.changed,
    houseLibraryMode: library.mode,
    houseLibrarySummary: library.summary,
  };
}
