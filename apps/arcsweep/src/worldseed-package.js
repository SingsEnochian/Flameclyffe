import { compileWorldseed } from './worldseed.js';
import { buildWorldseedArkManifest } from './worldseed-ark.js';

export const WORLDSEED_PACKAGE_SCHEMA = 'arcsweep.worldseed-package/v1';
export const WORLDSEED_IMPORT_RECEIPT_SCHEMA = 'arcsweep.worldseed-import-receipt/v1';
export const WORLDSEED_MIME = 'application/vnd.arcsweep.worldseed+json';

function clone(value) {
  return structuredClone(value);
}

function worldById(state, worldId) {
  return state?.worlds?.find((world) => world.id === worldId) || null;
}

function worldRecords(state, worldId, roomId) {
  return (Array.isArray(state?.records?.[roomId]) ? state.records[roomId] : [])
    .filter((record) => record?.worldId === worldId)
    .map(clone);
}

function worldScripts(state, worldId, status = null) {
  return (Array.isArray(state?.scripts) ? state.scripts : [])
    .filter((script) => script?.worldId === worldId && (!status || script.status === status))
    .map(clone);
}

function attachmentIds(groups) {
  return [...new Set(groups
    .flatMap((records) => Array.isArray(records) ? records : [])
    .flatMap((record) => Array.isArray(record?.attachments) ? record.attachments : [])
    .map((attachment) => attachment?.id || attachment?.path || attachment?.relativePath || attachment?.name)
    .filter(Boolean))];
}

function worldReceipts(state, key, predicate) {
  return (Array.isArray(state?.[key]) ? state[key] : []).filter(predicate).map(clone);
}

export function buildWorldseedPackage(state, worldId, packagedAt = new Date().toISOString()) {
  const world = worldById(state, worldId);
  if (!world) throw new Error(`World ${worldId} is not in the registry.`);

  const seedhouseRecords = worldRecords(state, worldId, 'seedhouse');
  const worldseed = compileWorldseed(world, seedhouseRecords, packagedAt);
  const canon = worldScripts(state, worldId, 'Canon');
  const timeline = worldRecords(state, worldId, 'timeline');
  const rooms = Object.fromEntries(
    Object.keys(state?.records || {})
      .filter((roomId) => !['seedhouse', 'timeline'].includes(roomId))
      .sort()
      .map((roomId) => [roomId, worldRecords(state, worldId, roomId)])
      .filter(([, records]) => records.length),
  );
  const replayReceipts = worldReceipts(state, 'worldseedReplayReceipts', (receipt) => receipt?.worldId === worldId);
  const braidReplayReceipts = worldReceipts(state, 'worldseedBraidReplayReceipts', (receipt) => receipt?.worldId === worldId);
  const forkReceipts = worldReceipts(state, 'worldseedForkReceipts', (receipt) => (
    [receipt?.sourceWorldId, receipt?.parentWorldId, receipt?.childWorldId].includes(worldId)
  ));
  const comparisonReceipts = worldReceipts(state, 'worldseedComparisonReceipts', (receipt) => (
    [receipt?.left?.world?.id, receipt?.right?.world?.id].includes(worldId)
  ));
  const canonCarryReceipts = worldReceipts(state, 'canonCarryReceipts', (receipt) => receipt?.worldId === worldId);
  const canonSeedReceipts = worldReceipts(state, 'canonSeedReceipts', (receipt) => receipt?.worldId === worldId);
  const thresholdProposals = worldReceipts(state, 'worldseedThresholdProposals', (proposal) => proposal?.world?.id === worldId);
  const seedLibraryEntries = worldReceipts(state, 'worldseedSeedLibrary', (entry) => entry?.sourceWorld?.id === worldId);
  const plantReceipts = worldReceipts(state, 'worldseedPlantReceipts', (receipt) => (
    receipt?.sourceWorldId === worldId || receipt?.targetWorldId === worldId
  ));

  const runaRefs = seedhouseRecords
    .filter((record) => record.seedType === 'Embodied / Runa Seed')
    .map((record) => record.id)
    .filter(Boolean);
  const worldmindRefs = seedhouseRecords
    .filter((record) => record.seedType === 'Worldmind Role')
    .map((record) => record.id)
    .filter(Boolean);
  const roomRecordIds = Object.values(rooms).flat().map((record) => record.id).filter(Boolean);
  const allAssetIds = attachmentIds([seedhouseRecords, canon, timeline, ...Object.values(rooms)]);

  const manifest = buildWorldseedArkManifest(worldseed, {
    canonRefs: canon.map((script) => script.id).filter(Boolean),
    timelineRefs: timeline.map((record) => record.id).filter(Boolean),
    recordRefs: roomRecordIds,
    runaRefs,
    worldmindRefs,
    provenanceRefs: [
      ...(worldseed.provenance?.sourceRefs || []),
      ...(worldseed.provenance?.lineageRefs || []),
      ...canonCarryReceipts.map((receipt) => receipt.id).filter(Boolean),
      ...canonSeedReceipts.map((receipt) => receipt.id).filter(Boolean),
      ...plantReceipts.map((receipt) => receipt.id).filter(Boolean),
    ],
    attachmentRefs: allAssetIds,
    replayRefs: [
      ...replayReceipts.map((receipt) => receipt.id).filter(Boolean),
      ...braidReplayReceipts.map((receipt) => receipt.id).filter(Boolean),
    ],
  }, packagedAt);

  return {
    schema: WORLDSEED_PACKAGE_SCHEMA,
    version: 1,
    extension: '.worldseed',
    mime: WORLDSEED_MIME,
    packagedAt,
    manifest,
    world: clone(world),
    worldseed,
    seedhouseRecords,
    content: {
      canon,
      timeline,
      rooms,
      replayReceipts,
      braidReplayReceipts,
      forkReceipts,
      comparisonReceipts,
      canonCarryReceipts,
      canonSeedReceipts,
      thresholdProposals,
      seedLibraryEntries,
      plantReceipts,
    },
    reconstruction: {
      expectedWorldseedFingerprint: worldseed.fingerprint,
      sourceWorldId: world.id,
      sourceSeedhouseRecordIds: seedhouseRecords.map((record) => record.id).filter(Boolean),
    },
  };
}

export function serializeWorldseedPackage(worldseedPackage) {
  const verification = verifyWorldseedPackage(worldseedPackage);
  if (!verification.matched) throw new Error('Worldseed package cannot serialize with a fingerprint mismatch.');
  return `${JSON.stringify(worldseedPackage, null, 2)}\n`;
}

export function parseWorldseedPackage(text) {
  let parsed;
  try {
    parsed = JSON.parse(String(text || ''));
  } catch (error) {
    throw new Error(`Worldseed package is not valid JSON: ${error.message}`);
  }
  if (parsed?.schema !== WORLDSEED_PACKAGE_SCHEMA) {
    throw new Error(`Worldseed package must use ${WORLDSEED_PACKAGE_SCHEMA}.`);
  }
  return parsed;
}

export function verifyWorldseedPackage(worldseedPackage, verifiedAt = new Date().toISOString()) {
  if (!worldseedPackage || worldseedPackage.schema !== WORLDSEED_PACKAGE_SCHEMA) {
    throw new Error(`Verification requires ${WORLDSEED_PACKAGE_SCHEMA}.`);
  }
  if (!worldseedPackage.world?.id) throw new Error('Worldseed package is missing its source world.');
  if (!Array.isArray(worldseedPackage.seedhouseRecords)) throw new Error('Worldseed package is missing Seedhouse records.');
  if (!worldseedPackage.worldseed?.fingerprint) throw new Error('Worldseed package is missing the compiled Worldseed fingerprint.');

  const rebuilt = compileWorldseed(
    worldseedPackage.world,
    worldseedPackage.seedhouseRecords,
    verifiedAt,
  );
  const expected = worldseedPackage.worldseed.fingerprint;
  const manifestExpected = worldseedPackage.manifest?.reconstruction?.expectedWorldseedFingerprint
    || worldseedPackage.manifest?.worldseedFingerprint
    || expected;
  const matched = rebuilt.fingerprint === expected && expected === manifestExpected;

  return {
    schema: 'arcsweep.worldseed-package-verification/v1',
    version: 1,
    verifiedAt,
    worldId: worldseedPackage.world.id,
    expectedFingerprint: expected,
    manifestExpectedFingerprint: manifestExpected,
    actualFingerprint: rebuilt.fingerprint,
    matched,
    result: matched ? 'exact-match' : 'fingerprint-mismatch',
  };
}

function ensureNoIdCollision(existing, incoming, label) {
  const ids = new Set((Array.isArray(existing) ? existing : []).map((item) => item?.id).filter(Boolean));
  const collisions = (Array.isArray(incoming) ? incoming : []).map((item) => item?.id).filter((id) => id && ids.has(id));
  if (collisions.length) throw new Error(`${label} id collision: ${collisions.join(', ')}`);
}

function mergeReceipts(state, key, incoming) {
  state[key] = [
    ...(Array.isArray(incoming) ? incoming : []).map(clone),
    ...(Array.isArray(state[key]) ? state[key] : []),
  ];
}

export function importWorldseedPackage(state, worldseedPackage, importedAt = new Date().toISOString()) {
  if (!state || !Array.isArray(state.worlds)) throw new Error('Worldseed import requires an Arcsweep state.');
  const verification = verifyWorldseedPackage(worldseedPackage, importedAt);
  if (!verification.matched) throw new Error('Worldseed import stopped: package fingerprint does not reconstruct exactly.');
  const world = clone(worldseedPackage.world);
  if (state.worlds.some((item) => item.id === world.id)) {
    throw new Error(`World ${world.id} already exists. Exact import never overwrites an existing world.`);
  }

  const seedhouseRecords = clone(worldseedPackage.seedhouseRecords || []);
  const canon = clone(worldseedPackage.content?.canon || []);
  const timeline = clone(worldseedPackage.content?.timeline || []);
  const rooms = clone(worldseedPackage.content?.rooms || {});

  ensureNoIdCollision(state.records?.seedhouse, seedhouseRecords, 'Seedhouse');
  ensureNoIdCollision(state.scripts, canon, 'Canon');
  ensureNoIdCollision(state.records?.timeline, timeline, 'Timeline');
  for (const [roomId, records] of Object.entries(rooms)) {
    ensureNoIdCollision(state.records?.[roomId], records, roomId);
  }

  world.worldseedFingerprint = worldseedPackage.worldseed.fingerprint;
  world.updatedAt = importedAt;
  state.worlds.unshift(world);
  state.activeWorldId = world.id;
  state.records = state.records && typeof state.records === 'object' ? state.records : {};
  state.records.seedhouse = [...seedhouseRecords, ...(state.records.seedhouse || [])];
  state.records.timeline = [...timeline, ...(state.records.timeline || [])];
  for (const [roomId, records] of Object.entries(rooms)) {
    state.records[roomId] = [...records, ...(state.records[roomId] || [])];
  }
  state.scripts = [...canon, ...(state.scripts || [])];
  mergeReceipts(state, 'worldseedReplayReceipts', worldseedPackage.content?.replayReceipts);
  mergeReceipts(state, 'worldseedBraidReplayReceipts', worldseedPackage.content?.braidReplayReceipts);
  mergeReceipts(state, 'worldseedForkReceipts', worldseedPackage.content?.forkReceipts);
  mergeReceipts(state, 'worldseedComparisonReceipts', worldseedPackage.content?.comparisonReceipts);
  mergeReceipts(state, 'canonCarryReceipts', worldseedPackage.content?.canonCarryReceipts);
  mergeReceipts(state, 'canonSeedReceipts', worldseedPackage.content?.canonSeedReceipts);
  mergeReceipts(state, 'worldseedThresholdProposals', worldseedPackage.content?.thresholdProposals);
  mergeReceipts(state, 'worldseedSeedLibrary', worldseedPackage.content?.seedLibraryEntries);
  mergeReceipts(state, 'worldseedPlantReceipts', worldseedPackage.content?.plantReceipts);
  state.worldseedImportReceipts = Array.isArray(state.worldseedImportReceipts) ? state.worldseedImportReceipts : [];

  const receipt = {
    schema: WORLDSEED_IMPORT_RECEIPT_SCHEMA,
    version: 1,
    id: `worldseed-import:${world.id}:${importedAt}`,
    importedAt,
    worldId: world.id,
    worldName: world.name || world.id,
    fingerprint: worldseedPackage.worldseed.fingerprint,
    seedhouseRecordCount: seedhouseRecords.length,
    canonCount: canon.length,
    timelineCount: timeline.length,
    roomRecordCount: Object.values(rooms).reduce((sum, records) => sum + records.length, 0),
    seedLibraryEntryCount: worldseedPackage.content?.seedLibraryEntries?.length || 0,
    plantReceiptCount: worldseedPackage.content?.plantReceipts?.length || 0,
    verification,
  };
  state.worldseedImportReceipts.unshift(receipt);

  return { state, world, receipt, verification };
}
