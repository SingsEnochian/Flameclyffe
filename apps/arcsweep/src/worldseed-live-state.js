import { compileWorldseed } from './worldseed.js';
import { replayWorldseed } from './worldseed-replay.js';
import { buildWorldLineageGraph, lineagePath } from './world-lineage.js';
import { comparePossibleWorlds } from './possible-worlds.js';
import { recordWorldBirth } from './world-registry-operations.js';

export const WORLDSEED_LIVE_STATE_SCHEMA = 'arcsweep.worldseed-live-state/v1';
export const WORLDSEED_FORK_RECEIPT_SCHEMA = 'arcsweep.worldseed-fork-receipt/v1';
export const WORLDSEED_COMPARISON_RECEIPT_SCHEMA = 'arcsweep.possible-worlds-comparison-receipt/v1';

function worldById(state, worldId) {
  return state?.worlds?.find((world) => world.id === worldId) || null;
}

function seedRecords(state) {
  return Array.isArray(state?.records?.seedhouse) ? state.records.seedhouse : [];
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}

function inheritanceSnapshot(seed) {
  return {
    mustSurvive: [...(seed.inheritance?.mustSurvive || [])],
    mayChange: [...(seed.inheritance?.mayChange || [])],
    mayBeLost: [...(seed.inheritance?.mayBeLost || [])],
    descendantsInherit: [...(seed.inheritance?.descendantsInherit || [])],
    transferableSeeds: [...(seed.inheritance?.transferableSeeds || [])],
  };
}

function cloneSeedhouseBaseline(state, sourceWorldId, childWorldId, createdAt) {
  const source = seedRecords(state).filter((record) => record?.worldId === sourceWorldId);
  const inherited = source.map((record, index) => ({
    ...structuredClone(record),
    id: `${childWorldId}:seed:${index + 1}:${String(record.id || 'record')}`,
    worldId: childWorldId,
    lineageRefs: [
      String(record.lineageRefs || '').trim(),
      `inherited-from:${sourceWorldId}:${record.id || index + 1}`,
    ].filter(Boolean).join(' · '),
    createdAt,
    updatedAt: createdAt,
    inheritedFromWorldId: sourceWorldId,
    inheritedFromSeedhouseRecordId: record.id || null,
  }));
  state.records = state.records && typeof state.records === 'object' ? state.records : {};
  state.records.seedhouse = [...inherited, ...seedRecords(state)];
  return inherited;
}

export function compileWorldseedForState(state, worldId, generatedAt = new Date().toISOString()) {
  const world = worldById(state, worldId);
  if (!world) throw new Error(`World ${worldId} is not in the registry.`);
  return compileWorldseed(world, seedRecords(state), generatedAt);
}

export function replayWorldseedForState(state, worldId, expectedFingerprint, replayedAt = new Date().toISOString()) {
  const world = worldById(state, worldId);
  if (!world) throw new Error(`World ${worldId} is not in the registry.`);
  return replayWorldseed({ world, seedhouseRecords: seedRecords(state), expectedFingerprint, replayedAt });
}

export function forkWorldInState(state, {
  worldId,
  childId,
  childName,
  mode = 'descendant',
  branchPoint = '',
  reason = '',
  createdAt = new Date().toISOString(),
} = {}) {
  if (!state || !Array.isArray(state.worlds)) throw new Error('Forking requires an Arcsweep state with worlds.');
  const parent = worldById(state, worldId);
  if (!parent) throw new Error(`Parent world ${worldId} is not in the registry.`);
  if (!childId || state.worlds.some((world) => world.id === childId)) throw new Error('Fork requires a unique child world id.');
  if (!['descendant', 'sibling', 'experimental'].includes(mode)) throw new Error(`Unsupported fork mode: ${mode}`);

  const seed = compileWorldseedForState(state, parent.id, createdAt);
  if (!seed.readiness?.recordCount) throw new Error('Forking requires at least one Seedhouse record for the parent world.');

  const parentId = mode === 'sibling' ? (parent.parentWorldId || parent.id) : parent.id;
  const parentForLink = worldById(state, parentId) || parent;
  const child = structuredClone(parent);
  Object.assign(child, {
    id: childId,
    name: String(childName || '').trim() || `${parent.name || 'World'} · Branch`,
    parentWorldId: parentForLink.id,
    parentSeedFingerprint: seed.fingerprint,
    branchPoint: String(branchPoint || '').trim(),
    lineageLabel: mode,
    worldseedFingerprint: '',
    descendantWorldIds: [],
    forkReason: String(reason || '').trim(),
    worldseedInheritance: inheritanceSnapshot(seed),
    createdAt,
    updatedAt: createdAt,
  });

  const inheritedSeedhouseRecords = cloneSeedhouseBaseline(state, parent.id, child.id, createdAt);
  parentForLink.descendantWorldIds = unique([...(parentForLink.descendantWorldIds || []), child.id]);
  parentForLink.updatedAt = createdAt;
  state.worlds.unshift(child);
  state.activeWorldId = child.id;
  state.worldseedForkReceipts = Array.isArray(state.worldseedForkReceipts) ? state.worldseedForkReceipts : [];

  const receipt = {
    schema: WORLDSEED_FORK_RECEIPT_SCHEMA,
    version: 1,
    id: `worldseed-fork:${child.id}:${createdAt}`,
    createdAt,
    mode,
    sourceWorldId: parent.id,
    parentWorldId: parentForLink.id,
    childWorldId: child.id,
    parentSeedFingerprint: seed.fingerprint,
    branchPoint: child.branchPoint,
    reason: child.forkReason,
    inherited: inheritanceSnapshot(seed),
    inheritedSeedhouseRecordIds: inheritedSeedhouseRecords.map((record) => record.id),
  };
  state.worldseedForkReceipts.unshift(receipt);
  const worldBirthReceipt = recordWorldBirth(state, child, {
    bornAt: createdAt,
    source: 'worldseed-fork',
    sourceRef: receipt.id,
    seedFingerprint: seed.fingerprint,
  });

  return { state, seed, child, receipt, worldBirthReceipt, inheritedSeedhouseRecords };
}

export function receiptWorldseedReplay(state, worldId, expectedFingerprint, replayedAt = new Date().toISOString()) {
  const replay = replayWorldseedForState(state, worldId, expectedFingerprint, replayedAt);
  state.worldseedReplayReceipts = Array.isArray(state.worldseedReplayReceipts) ? state.worldseedReplayReceipts : [];
  state.worldseedReplayReceipts.unshift({ id: `worldseed-replay:${worldId}:${replayedAt}`, ...replay });
  return replay;
}

export function receiptPossibleWorldsComparison(state, leftWorldId, rightWorldId, comparedAt = new Date().toISOString()) {
  if (leftWorldId === rightWorldId) throw new Error('Possible Worlds comparison requires two different worlds.');
  const left = compileWorldseedForState(state, leftWorldId, comparedAt);
  const right = compileWorldseedForState(state, rightWorldId, comparedAt);
  const comparison = comparePossibleWorlds(left, right);
  const receipt = {
    ...comparison,
    schema: WORLDSEED_COMPARISON_RECEIPT_SCHEMA,
    version: 1,
    comparisonSchema: comparison.schema,
    id: `possible-worlds:${leftWorldId}:${rightWorldId}:${comparedAt}`,
    comparedAt,
  };
  state.worldseedComparisonReceipts = Array.isArray(state.worldseedComparisonReceipts) ? state.worldseedComparisonReceipts : [];
  state.worldseedComparisonReceipts.unshift(receipt);
  return receipt;
}

export function worldseedLiveSnapshot(state, worldId) {
  const seed = compileWorldseedForState(state, worldId);
  const graph = buildWorldLineageGraph(state.worlds || []);
  const path = lineagePath(state.worlds || [], worldId);
  const sectionCounts = Object.fromEntries(Object.entries(seed.sections || {}).map(([key, records]) => [key, records.length]));
  const genomeFields = seed.continuityGenome?.fields || {};
  const defined = Object.entries(genomeFields)
    .filter(([, values]) => Array.isArray(values) && values.length)
    .map(([key]) => key);
  return {
    schema: WORLDSEED_LIVE_STATE_SCHEMA,
    seed,
    graph,
    lineagePath: path,
    sectionCounts,
    genomeCoverage: {
      defined,
      count: seed.continuityGenome?.definedFieldCount || defined.length,
      total: Object.keys(genomeFields).length,
    },
  };
}
