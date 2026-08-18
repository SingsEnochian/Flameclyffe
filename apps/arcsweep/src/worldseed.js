export const WORLDSEED_SCHEMA = 'arcsweep.worldseed/v1';

export const WORLDSEED_TYPES = Object.freeze([
  'World Constitution',
  'Continuity Genome',
  'Inheritance Rule',
  'Culture Seed',
  'Material World Seed',
  'Relationship Seed',
  'Embodied / Runa Seed',
  'Worldmind Role',
  'Threshold Rule',
  'Fork / Lineage',
  'Ark Export',
]);

const SECTION_BY_TYPE = Object.freeze({
  'World Constitution': 'constitution',
  'Continuity Genome': 'continuityGenome',
  'Inheritance Rule': 'inheritance',
  'Culture Seed': 'culture',
  'Material World Seed': 'materialWorld',
  'Relationship Seed': 'relationships',
  'Embodied / Runa Seed': 'embodiment',
  'Worldmind Role': 'worldmind',
  'Threshold Rule': 'thresholds',
  'Fork / Lineage': 'lineage',
  'Ark Export': 'ark',
});

const SECTION_KEYS = Object.freeze([...new Set(Object.values(SECTION_BY_TYPE))]);

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortDeep(value[key])]),
  );
}

function stableStringify(value) {
  return JSON.stringify(sortDeep(value));
}

function fnv1a32(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function normaliseWorldseedRecord(record = {}) {
  const seedType = WORLDSEED_TYPES.includes(record.seedType) ? record.seedType : 'Inheritance Rule';
  return {
    id: text(record.id),
    title: text(record.title) || 'Untitled seed',
    seedType,
    status: text(record.status) || 'Germinating',
    mustSurvive: text(record.mustSurvive),
    mayChange: text(record.mayChange),
    mayBeLost: text(record.mayBeLost),
    descendantsInherit: text(record.descendantsInherit),
    transferableSeed: text(record.transferableSeed),
    lineageRefs: text(record.lineageRefs),
    sourceRefs: text(record.sourceRefs),
    notes: text(record.notes),
    createdAt: text(record.createdAt),
    updatedAt: text(record.updatedAt),
  };
}

function recordSortKey(record) {
  return [record.seedType, record.title, record.id].join('\u0000');
}

function nonEmpty(values) {
  return values.map(text).filter(Boolean);
}

export function worldseedFingerprint(payload) {
  const copy = structuredClone(payload);
  delete copy.generatedAt;
  delete copy.fingerprint;
  return `ws-${fnv1a32(stableStringify(copy))}`;
}

export function compileWorldseed(world, seedhouseRecords = [], generatedAt = new Date().toISOString()) {
  if (!world?.id) throw new Error('Worldseed compilation requires a world id.');

  const records = seedhouseRecords
    .filter((record) => record?.worldId === world.id)
    .map(normaliseWorldseedRecord)
    .sort((left, right) => recordSortKey(left).localeCompare(recordSortKey(right)));

  const sections = Object.fromEntries(SECTION_KEYS.map((key) => [key, []]));
  for (const record of records) sections[SECTION_BY_TYPE[record.seedType]].push(record);

  const payload = {
    schema: WORLDSEED_SCHEMA,
    version: 1,
    seedId: `worldseed:${world.id}`,
    world: {
      id: world.id,
      name: text(world.name) || 'Unassigned World',
      kind: text(world.kind),
    },
    generatedAt,
    sections,
    inheritance: {
      mustSurvive: nonEmpty(records.map((record) => record.mustSurvive)),
      mayChange: nonEmpty(records.map((record) => record.mayChange)),
      mayBeLost: nonEmpty(records.map((record) => record.mayBeLost)),
      descendantsInherit: nonEmpty(records.map((record) => record.descendantsInherit)),
      transferableSeeds: nonEmpty(records.map((record) => record.transferableSeed)),
    },
    provenance: {
      seedhouseRecordIds: records.map((record) => record.id).filter(Boolean),
      sourceRefs: nonEmpty(records.map((record) => record.sourceRefs)),
      lineageRefs: nonEmpty(records.map((record) => record.lineageRefs)),
    },
    readiness: {
      rooted: records.some((record) => ['Rooted', 'Canonical', 'Export-ready'].includes(record.status)),
      exportReady: records.some((record) => record.seedType === 'Ark Export' && record.status === 'Export-ready'),
      recordCount: records.length,
    },
  };

  payload.fingerprint = worldseedFingerprint(payload);
  return payload;
}
