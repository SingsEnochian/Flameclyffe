import { HOUSE_DR_BUNDLE } from './house-dr-bundle.js';
import {
  applyHouseDrBundle,
  inspectHouseDrBundleIntegrity,
  repairHouseDrBundle,
} from './house-dr-library.js';
import { loadState, saveState } from './storage.js';
import { ensureTerraPrimeWakingWorld } from './waking-world.js';
import { enrichAllWorldKnowledge, TERRA_PRIME_HISTORY_SCHEMA } from './terra-prime-history-ingest.js';
import { buildHydrationReceipt, worldCompletionReport } from './truth-provenance.js';
import {
  WORLD_REGISTRY_JOURNAL_KEY,
  createWorldRegistryJournal,
  normaliseWorldRegistryJournal,
  reconcileWorldRegistry,
  recordWorldSnapshot,
} from './world-registry-journal.js';

export const TERRA_PRIME_SYNC_EVENT = 'arcsweep:terra-prime-synchronised';
export const WORLD_HYDRATION_RECEIPT_LIMIT = 100;

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
    throw new Error('World knowledge could not be written to the durable World Registry recovery journal');
  }
  return journal;
}

function cloneWorlds(worlds = []) {
  return new Map(worlds.map((world) => [world.id, structuredClone(world)]));
}

function recordHydrationReceipts(state, beforeById, worldIds, now) {
  const existing = Array.isArray(state.worldHydrationReceipts) ? state.worldHydrationReceipts : [];
  const additions = [];
  for (const worldId of worldIds) {
    const after = state.worlds.find((world) => world.id === worldId);
    const before = beforeById.get(worldId) || { id: worldId, name: after?.name };
    if (!after) continue;
    const receipt = buildHydrationReceipt(before, after, now);
    if ((receipt.summary.added + receipt.summary.changed) === 0) continue;
    additions.push(receipt);
  }
  if (!additions.length) {
    state.worldHydrationReceipts = existing;
    return [];
  }
  state.worldHydrationReceipts = [...existing, ...additions].slice(-WORLD_HYDRATION_RECEIPT_LIMIT);
  return additions;
}

function refreshCompletionReports(state) {
  const next = Object.fromEntries((state.worlds || []).map((world) => [world.id, worldCompletionReport(world)]));
  const changed = JSON.stringify(state.worldCompletionReports || {}) !== JSON.stringify(next);
  state.worldCompletionReports = next;
  return changed;
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
  const beforeKnowledge = cloneWorlds(result.state.worlds);
  const knowledge = enrichAllWorldKnowledge(result.state, now);
  const hydrationReceipts = recordHydrationReceipts(result.state, beforeKnowledge, knowledge.worldsChanged, now);
  const completionChanged = refreshCompletionReports(result.state);
  const changed = Boolean(library.changed || reconciled.changed || result.changed || knowledge.changed || hydrationReceipts.length || completionChanged);

  if (!changed) {
    return {
      ...result,
      changed: false,
      registryRecovered: false,
      houseLibraryRecovered: false,
      houseLibraryMode: library.mode,
      houseLibrarySummary: library.summary,
      knowledgeHydrated: false,
      worldsKnowledgeHydrated: [],
      hydrationReceipts: [],
      completionReportsUpdated: false,
      terraPrimeHistorySchema: TERRA_PRIME_HISTORY_SCHEMA,
    };
  }

  const changedSet = new Set([result.world.id, ...knowledge.worldsChanged]);
  for (const worldId of changedSet) {
    const world = result.state.worlds.find((candidate) => candidate.id === worldId);
    if (world) writeJournalWorld(world, now);
  }

  await saveState(result.state, {
    reason: knowledge.changed
      ? 'terra-prime-deep-history-and-world-applet-hydration'
      : completionChanged ? 'world-completion-report-refresh'
        : library.changed ? 'house-library-and-terra-prime-integrity-sync' : 'terra-prime-waking-world-sync',
    worldId: result.world.id,
    worldBirthReceiptId: result.receipt?.id || null,
    registryRecovered: reconciled.changed,
    houseLibraryRecovered: library.changed,
    houseLibraryMode: library.mode,
    houseLibrarySummary: library.summary,
    knowledgeHydrated: knowledge.changed,
    worldsKnowledgeHydrated: knowledge.worldsChanged,
    hydrationReceiptCount: hydrationReceipts.length,
    completionReportsUpdated: completionChanged,
    terraPrimeHistorySchema: TERRA_PRIME_HISTORY_SCHEMA,
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
      knowledgeHydrated: knowledge.changed,
      worldsKnowledgeHydrated: knowledge.worldsChanged,
      hydrationReceipts,
      completionReportsUpdated: completionChanged,
      terraPrimeHistorySchema: TERRA_PRIME_HISTORY_SCHEMA,
    },
  }));

  return {
    ...result,
    changed: true,
    registryRecovered: reconciled.changed,
    houseLibraryRecovered: library.changed,
    houseLibraryMode: library.mode,
    houseLibrarySummary: library.summary,
    knowledgeHydrated: knowledge.changed,
    worldsKnowledgeHydrated: knowledge.worldsChanged,
    hydrationReceipts,
    completionReportsUpdated: completionChanged,
    terraPrimeHistorySchema: TERRA_PRIME_HISTORY_SCHEMA,
  };
}
