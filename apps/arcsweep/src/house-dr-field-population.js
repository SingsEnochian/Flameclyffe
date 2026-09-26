import { HOUSE_DR_BUNDLE } from './house-dr-bundle.js';

export const HOUSE_DR_FIELD_POPULATION_SCHEMA = 'arcsweep.dr-field-population/v0.1';

const OPEN = Object.freeze({ status: 'open', value: null, provenance: [] });

function cloneOpen() {
  return { ...OPEN, provenance: [] };
}

function known(value, source, confidence = 'source-supported') {
  const present = value !== undefined && value !== null && value !== '';
  return present
    ? { status: 'known', value, confidence, provenance: [source] }
    : cloneOpen();
}

function sourceRef(world, field) {
  return {
    kind: 'house-world-profile',
    sourceKey: world.sourceKey,
    field,
    bundleId: HOUSE_DR_BUNDLE.id,
    bundleVersion: HOUSE_DR_BUNDLE.version,
  };
}

function matchingDocuments(world) {
  return HOUSE_DR_BUNDLE.documents.filter((document) => document.worldSourceKey === world.sourceKey);
}

function documentRefs(world) {
  return matchingDocuments(world).map((document) => ({
    kind: 'house-document',
    sourceKey: document.sourceKey,
    title: document.title,
    status: document.status || null,
    format: document.formats || [],
    sourceUrl: document.sourceUrl || null,
  }));
}

export function populateHouseDrWorld(world) {
  if (!world?.sourceKey) throw new Error('populateHouseDrWorld requires a House world with sourceKey.');

  const documents = documentRefs(world);
  const identity = {
    name: known(world.protagonist, sourceRef(world, 'protagonist')),
    roles: known(world.roles, sourceRef(world, 'roles')),
    notes: known(world.identityNotes, sourceRef(world, 'identityNotes')),
    age: cloneOpen(),
    birthday: cloneOpen(),
    hometown: cloneOpen(),
    residence: cloneOpen(),
    occupation: cloneOpen(),
    education: cloneOpen(),
    hopesAndDreams: cloneOpen(),
    achievements: cloneOpen(),
  };

  const worldProfile = {
    name: known(world.name, sourceRef(world, 'name')),
    kind: known(world.kind, sourceRef(world, 'kind')),
    description: known(world.description, sourceRef(world, 'description')),
    history: known(world.history, sourceRef(world, 'history')),
    rules: known(world.rules, sourceRef(world, 'rules')),
  };

  return {
    schema: HOUSE_DR_FIELD_POPULATION_SCHEMA,
    sourceKey: world.sourceKey,
    worldName: world.name,
    fieldPacks: [...(world.fieldPacks || [])],
    canonDocuments: documents,
    sections: {
      identity,
      personality: { status: 'open', fields: {} },
      appearance: { status: 'open', fields: {} },
      competencies: { status: 'open', fields: {} },
      relationships: { status: 'open', records: [] },
      home: { status: 'open', fields: {} },
      settlement: { status: 'open', fields: {} },
      belongings: { status: 'open', records: [] },
      school: { status: 'open', fields: {} },
      history: {
        status: world.history ? 'partially-known' : 'open',
        summary: known(world.history, sourceRef(world, 'history')),
        fields: {},
      },
      future: { status: 'open', fields: {} },
      realityRules: {
        status: world.rules ? 'partially-known' : 'open',
        summary: known(world.rules, sourceRef(world, 'rules')),
        timeRatio: cloneOpen(),
        returnAnchor: cloneOpen(),
        alwaysRules: [],
        neverRules: [],
        sensorySigns: [],
        mortality: cloneOpen(),
        ageing: cloneOpen(),
        memory: cloneOpen(),
        longStay: cloneOpen(),
      },
      wakingThread: {
        status: 'open',
        continuityIntentions: [],
        carePriorities: [],
        scheduledResponsibilities: [],
        explicitNonActions: [],
      },
      worldProfile,
    },
    populationPolicy: {
      unsupportedFieldsRemainOpen: true,
      noInferenceWithoutReceipt: true,
      preserveLocalOverrides: true,
      sourceDocumentsAreReferencesNotAutomaticFieldTruth: true,
    },
  };
}

export function populateAllHouseDrWorlds() {
  return HOUSE_DR_BUNDLE.worlds.map(populateHouseDrWorld);
}

export function getHouseDrPopulation(sourceKey) {
  const world = HOUSE_DR_BUNDLE.worlds.find((item) => item.sourceKey === sourceKey);
  return world ? populateHouseDrWorld(world) : null;
}
