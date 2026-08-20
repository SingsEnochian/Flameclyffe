import {
  compileWorldseedForState,
  receiptWorldseedReplay,
} from './worldseed-live-state.js';

export const CANON_CARRY_RECEIPT_SCHEMA = 'arcsweep.canon-carry-receipt/v1';
export const CANON_SEED_RECEIPT_SCHEMA = 'arcsweep.canon-seed-receipt/v1';
export const WORLDSEED_BRAID_SCHEMA = 'arcsweep.worldseed-braid/v1';

function worldById(state, worldId) {
  return state?.worlds?.find((world) => world.id === worldId) || null;
}

function recordById(state, recordId) {
  return (Array.isArray(state?.records?.records) ? state.records.records : [])
    .find((record) => record.id === recordId) || null;
}

function scriptById(state, scriptId) {
  return (Array.isArray(state?.scripts) ? state.scripts : [])
    .find((script) => script.id === scriptId) || null;
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function makeId(prefix, worldId, at) {
  return `${prefix}:${worldId}:${String(at).replace(/[^0-9A-Za-z]+/g, '-')}`;
}

export function carryRecordToCanon(state, {
  worldId,
  recordId,
  title = '',
  excerpt = '',
  authority = 'Steward committed',
  committedAt = new Date().toISOString(),
} = {}) {
  if (!state) throw new Error('Canon Carry requires Arcsweep state.');
  const world = worldById(state, worldId);
  if (!world) throw new Error(`World ${worldId} is not in the registry.`);
  const record = recordById(state, recordId);
  if (!record || record.worldId !== worldId) throw new Error(`Record ${recordId} is not in ${world.name || worldId}.`);

  const content = text(excerpt) || text(record.canonExcerpt) || text(record.content);
  if (!content) throw new Error('Canon Carry requires an excerpt or record content.');

  state.scripts = Array.isArray(state.scripts) ? state.scripts : [];
  const canonId = makeId('canon', worldId, committedAt);
  const receiptId = makeId('canon-carry', worldId, committedAt);
  const canon = {
    id: canonId,
    name: text(title) || text(record.title) || 'Canon Carry',
    worldId,
    world: world.name || worldId,
    status: 'Canon',
    content,
    authority,
    sourceRecordId: record.id,
    sourceRecordTitle: text(record.title),
    canonRefs: text(record.canonRefs),
    continuityRefs: text(record.continuityRefs),
    lineageRefs: `records:${record.id}`,
    committedAt,
    updatedAt: committedAt,
    canonCarryReceiptId: receiptId,
  };
  state.scripts.unshift(canon);

  record.canonCarry = 'Carried excerpt to canon';
  record.canonExcerpt = content;
  record.updatedAt = committedAt;

  state.canonCarryReceipts = Array.isArray(state.canonCarryReceipts) ? state.canonCarryReceipts : [];
  const receipt = {
    schema: CANON_CARRY_RECEIPT_SCHEMA,
    version: 1,
    id: receiptId,
    committedAt,
    worldId,
    worldName: world.name || worldId,
    sourceRecordId: record.id,
    canonId,
    authority,
    excerptLength: content.length,
  };
  state.canonCarryReceipts.unshift(receipt);
  return { state, canon, receipt };
}

export function rootCanonInSeedhouse(state, {
  worldId,
  canonId,
  seedType = 'Inheritance Rule',
  title = '',
  mustSurvive = '',
  mayChange = '',
  mayBeLost = '',
  descendantsInherit = '',
  transferableSeed = '',
  rootedAt = new Date().toISOString(),
} = {}) {
  const world = worldById(state, worldId);
  if (!world) throw new Error(`World ${worldId} is not in the registry.`);
  const canon = scriptById(state, canonId);
  if (!canon || canon.worldId !== worldId || canon.status !== 'Canon') {
    throw new Error(`Canon ${canonId} is not committed canon for ${world.name || worldId}.`);
  }

  state.records = state.records && typeof state.records === 'object' ? state.records : {};
  state.records.seedhouse = Array.isArray(state.records.seedhouse) ? state.records.seedhouse : [];
  const seedId = makeId('seed', worldId, rootedAt);
  const sourceRef = `canon-studio:${canon.id}`;
  const seed = {
    id: seedId,
    worldId,
    title: text(title) || canon.name || 'Canon seed',
    seedType,
    status: 'Rooted',
    mustSurvive: text(mustSurvive) || canon.content,
    mayChange: text(mayChange),
    mayBeLost: text(mayBeLost),
    descendantsInherit: text(descendantsInherit),
    transferableSeed: text(transferableSeed),
    lineageRefs: sourceRef,
    sourceRefs: sourceRef,
    notes: `Rooted from Canon Studio at ${rootedAt}.`,
    createdAt: rootedAt,
    updatedAt: rootedAt,
    rootedFromCanonId: canon.id,
  };
  state.records.seedhouse.unshift(seed);

  state.canonSeedReceipts = Array.isArray(state.canonSeedReceipts) ? state.canonSeedReceipts : [];
  const receipt = {
    schema: CANON_SEED_RECEIPT_SCHEMA,
    version: 1,
    id: makeId('canon-seed', worldId, rootedAt),
    rootedAt,
    worldId,
    canonId: canon.id,
    seedhouseRecordId: seed.id,
    seedType,
  };
  state.canonSeedReceipts.unshift(receipt);
  return { state, canon, seed, receipt };
}

export function receiptWorldseedBraidReplay(state, worldId, replayedAt = new Date().toISOString()) {
  const world = worldById(state, worldId);
  if (!world) throw new Error(`World ${worldId} is not in the registry.`);
  const seed = compileWorldseedForState(state, worldId, replayedAt);
  const expected = text(world.worldseedFingerprint) || seed.fingerprint;
  const replay = receiptWorldseedReplay(state, worldId, expected, replayedAt);
  world.worldseedFingerprint = expected;

  state.worldseedBraidReplayReceipts = Array.isArray(state.worldseedBraidReplayReceipts)
    ? state.worldseedBraidReplayReceipts
    : [];
  const braidReceipt = {
    schema: 'arcsweep.worldseed-braid-replay-receipt/v1',
    version: 1,
    id: makeId('braid-replay', worldId, replayedAt),
    replayedAt,
    worldId,
    canonCount: (state.scripts || []).filter((script) => script.worldId === worldId && script.status === 'Canon').length,
    seedhouseRecordCount: seed.readiness.recordCount,
    expectedFingerprint: replay.expectedFingerprint,
    actualFingerprint: replay.actualFingerprint,
    matched: replay.matched,
    result: replay.result,
  };
  state.worldseedBraidReplayReceipts.unshift(braidReceipt);
  return { replay, braidReceipt, seed };
}

export function worldseedBraidSnapshot(state, worldId) {
  const world = worldById(state, worldId);
  if (!world) throw new Error(`World ${worldId} is not in the registry.`);
  const records = (state.records?.records || []).filter((record) => record.worldId === worldId);
  const canonical = (state.scripts || []).filter((script) => script.worldId === worldId && script.status === 'Canon');
  const seedhouse = (state.records?.seedhouse || []).filter((record) => record.worldId === worldId);
  const seed = compileWorldseedForState(state, worldId);
  const latestReplay = (state.worldseedBraidReplayReceipts || []).find((receipt) => receipt.worldId === worldId) || null;
  return {
    schema: WORLDSEED_BRAID_SCHEMA,
    version: 1,
    world: { id: world.id, name: world.name || world.id },
    stages: {
      records: { count: records.length, requestedCanonCarry: records.filter((record) => record.canonCarry === 'Requested for review').length },
      canonStudio: { count: canonical.length },
      seedhouse: { count: seedhouse.length, fingerprint: seed.fingerprint, rooted: seed.readiness.rooted },
      replay: { count: (state.worldseedBraidReplayReceipts || []).filter((receipt) => receipt.worldId === worldId).length, latest: latestReplay },
    },
    path: ['Records Room', 'Canon Studio', 'Seedhouse', 'Replay'],
  };
}
