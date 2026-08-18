import { compileWorldseed } from './worldseed.js';
import { replayWorldseed } from './worldseed-replay.js';
import { buildWorldLineageGraph, lineagePath } from './world-lineage.js';

export const WORLDSEED_LIVE_STATE_SCHEMA = 'arcsweep.worldseed-live-state/v1';
export const WORLDSEED_FORK_RECEIPT_SCHEMA = 'arcsweep.worldseed-fork-receipt/v1';

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
  };
  state.worldseedForkReceipts.unshift(receipt);

  return { state, seed, child, receipt };
}

export function receiptWorldseedReplay(state, worldId, expectedFingerprint, replayedAt = new Date().toISOString()) {
  const replay = replayWorldseedForState(state, worldId, expectedFingerprint, replayedAt);
  state.worldseedReplayReceipts = Array.isArray(state.worldseedReplayReceipts) ? state.worldseedReplayReceipts : [];
  state.worldseedReplayReceipts.unshift({ id: `worldseed-replay:${worldId}:${replayedAt}`, ...replay });
  return replay;
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
