import { compileWorldseedForState } from './worldseed-live-state.js';

export const WORLDSEED_LIBRARY_ENTRY_SCHEMA = 'arcsweep.worldseed-library-entry/v1';
export const WORLDSEED_PLANT_RECEIPT_SCHEMA = 'arcsweep.worldseed-plant-receipt/v1';

const CARRIED_FIELDS = Object.freeze([
  'mustSurvive',
  'mayChange',
  'mayBeLost',
  'descendantsInherit',
  'transferableSeed',
  'emotionalLaws',
  'aestheticGrammar',
  'cosmology',
  'relationalPatterning',
  'sacredTaboos',
  'characteristicTensions',
  'harmonicIdentity',
  'sensorySignature',
  'narrativeGait',
  'valuesCore',
]);

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function worldById(state, worldId) {
  return state?.worlds?.find((world) => world.id === worldId) || null;
}

function seedhouseRecordById(state, recordId) {
  return (Array.isArray(state?.records?.seedhouse) ? state.records.seedhouse : [])
    .find((record) => record.id === recordId) || null;
}

function makeId(prefix, source, at) {
  return `${prefix}:${source}:${String(at).replace(/[^0-9A-Za-z]+/g, '-')}`;
}

function carriedSnapshot(record) {
  return Object.fromEntries(CARRIED_FIELDS.map((field) => [field, text(record?.[field])]).filter(([, value]) => value));
}

export function publishSeedToLibrary(state, {
  sourceWorldId,
  seedhouseRecordId,
  title = '',
  publishedAt = new Date().toISOString(),
} = {}) {
  const world = worldById(state, sourceWorldId);
  if (!world) throw new Error(`Source world ${sourceWorldId} is not in the registry.`);
  const record = seedhouseRecordById(state, seedhouseRecordId);
  if (!record || record.worldId !== sourceWorldId) throw new Error(`Seedhouse record ${seedhouseRecordId} does not belong to ${world.name || sourceWorldId}.`);
  const carried = carriedSnapshot(record);
  if (!text(record.transferableSeed) && !text(record.descendantsInherit)) {
    throw new Error('Seed Library publication requires a transferable seed or descendant inheritance statement.');
  }

  const sourceSeed = compileWorldseedForState(state, sourceWorldId, publishedAt);
  state.worldseedSeedLibrary = Array.isArray(state.worldseedSeedLibrary) ? state.worldseedSeedLibrary : [];
  const entry = {
    schema: WORLDSEED_LIBRARY_ENTRY_SCHEMA,
    version: 1,
    id: makeId('seed-library', sourceWorldId, publishedAt),
    publishedAt,
    title: text(title) || text(record.title) || 'Transferable seed',
    seedType: text(record.seedType) || 'Inheritance Rule',
    sourceWorld: { id: world.id, name: world.name || world.id },
    sourceWorldseedFingerprint: sourceSeed.fingerprint,
    sourceSeedhouseRecordId: record.id,
    sourceStatus: text(record.status),
    carried,
    sourceRefs: text(record.sourceRefs),
    lineageRefs: text(record.lineageRefs),
  };
  state.worldseedSeedLibrary.unshift(entry);
  return entry;
}

export function plantSeedFromLibrary(state, {
  librarySeedId,
  targetWorldId,
  title = '',
  plantedAt = new Date().toISOString(),
} = {}) {
  const target = worldById(state, targetWorldId);
  if (!target) throw new Error(`Target world ${targetWorldId} is not in the registry.`);
  const entry = (Array.isArray(state.worldseedSeedLibrary) ? state.worldseedSeedLibrary : [])
    .find((item) => item.id === librarySeedId);
  if (!entry || entry.schema !== WORLDSEED_LIBRARY_ENTRY_SCHEMA) throw new Error(`Seed Library entry ${librarySeedId} is unavailable.`);

  state.records = state.records && typeof state.records === 'object' ? state.records : {};
  state.records.seedhouse = Array.isArray(state.records.seedhouse) ? state.records.seedhouse : [];
  const sourceLineage = `seed-library:${entry.id} · carried-from:${entry.sourceWorld.id}:${entry.sourceWorldseedFingerprint}`;
  const record = {
    id: makeId('planted-seed', targetWorldId, plantedAt),
    worldId: targetWorldId,
    title: text(title) || entry.title,
    seedType: entry.seedType || 'Inheritance Rule',
    status: 'Germinating',
    ...structuredClone(entry.carried || {}),
    sourceRefs: [text(entry.sourceRefs), `seed-library:${entry.id}`].filter(Boolean).join(' · '),
    lineageRefs: [text(entry.lineageRefs), sourceLineage].filter(Boolean).join(' · '),
    notes: `Planted from ${entry.sourceWorld.name} without overwriting ${target.name || target.id}. Review and root here before treating it as this world's inheritance.`,
    inheritedFromWorldId: entry.sourceWorld.id,
    inheritedFromWorldseedFingerprint: entry.sourceWorldseedFingerprint,
    inheritedFromSeedLibraryId: entry.id,
    createdAt: plantedAt,
    updatedAt: plantedAt,
  };
  state.records.seedhouse.unshift(record);

  state.worldseedPlantReceipts = Array.isArray(state.worldseedPlantReceipts) ? state.worldseedPlantReceipts : [];
  const receipt = {
    schema: WORLDSEED_PLANT_RECEIPT_SCHEMA,
    version: 1,
    id: makeId('seed-plant', targetWorldId, plantedAt),
    plantedAt,
    librarySeedId: entry.id,
    sourceWorldId: entry.sourceWorld.id,
    sourceWorldseedFingerprint: entry.sourceWorldseedFingerprint,
    targetWorldId,
    targetSeedhouseRecordId: record.id,
    status: 'germinating',
  };
  state.worldseedPlantReceipts.unshift(receipt);
  return { entry, record, receipt };
}

export function seedLibrarySnapshot(state, worldId) {
  const world = worldById(state, worldId);
  if (!world) throw new Error(`World ${worldId} is not in the registry.`);
  const sourceCandidates = (state.records?.seedhouse || []).filter((record) => (
    record.worldId === worldId && (text(record.transferableSeed) || text(record.descendantsInherit))
  ));
  const library = Array.isArray(state.worldseedSeedLibrary) ? state.worldseedSeedLibrary : [];
  const publishedRecordIds = new Set(library.filter((entry) => entry.sourceWorld?.id === worldId).map((entry) => entry.sourceSeedhouseRecordId));
  return {
    world: { id: world.id, name: world.name || world.id },
    candidates: sourceCandidates.map((record) => ({
      id: record.id,
      title: text(record.title) || record.id,
      seedType: text(record.seedType),
      transferableSeed: text(record.transferableSeed),
      descendantsInherit: text(record.descendantsInherit),
      published: publishedRecordIds.has(record.id),
    })),
    availableToPlant: library.filter((entry) => entry.sourceWorld?.id !== worldId),
    publishedByWorld: library.filter((entry) => entry.sourceWorld?.id === worldId),
    plantReceipts: (state.worldseedPlantReceipts || []).filter((receipt) => receipt.targetWorldId === worldId),
  };
}
