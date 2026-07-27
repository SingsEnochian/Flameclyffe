import { createWorld } from './worlds.js';

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableId(prefix, sourceKey) {
  return `${prefix}-${String(sourceKey).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}`;
}

function findWorld(state, entry) {
  return state.worlds.find((world) => world.houseSourceKey === entry.sourceKey)
    || state.worlds.find((world) => world.name === entry.name)
    || null;
}

function seedWorld(entry, now) {
  const world = createWorld(stableId('house-world', entry.sourceKey), now);
  world.name = entry.name;
  world.kind = entry.kind || 'Desired Reality';
  world.description = entry.description || '';
  world.history = entry.history || '';
  world.rules = entry.rules || '';
  world.identity.name = entry.protagonist || '';
  world.identity.roles = entry.roles || '';
  world.identity.notes = entry.identityNotes || '';
  world.houseSourceKey = entry.sourceKey;
  world.houseSourceUrls = [...(entry.sourceUrls || [])];
  world.houseBundleManaged = true;
  world.updatedAt = now;
  return world;
}

function upsertWorld(state, entry, now) {
  let world = findWorld(state, entry);
  if (!world) {
    world = seedWorld(entry, now);
    state.worlds.push(world);
    return { world, created: true };
  }

  world.houseSourceKey = entry.sourceKey;
  world.houseSourceUrls = [...(entry.sourceUrls || [])];
  world.houseBundleManaged = true;
  world.houseProfile = {
    description: entry.description || '',
    history: entry.history || '',
    rules: entry.rules || '',
    protagonist: entry.protagonist || '',
    roles: entry.roles || '',
    identityNotes: entry.identityNotes || '',
    revisedAt: entry.revisedAt || null,
  };

  if (!world.name || world.name === 'Unassigned World' || world.name === 'Untitled World') world.name = entry.name;
  if (!world.kind || world.kind === 'Desired Reality') world.kind = entry.kind || world.kind;
  if (!world.description) world.description = entry.description || '';
  if (!world.history) world.history = entry.history || '';
  if (!world.rules) world.rules = entry.rules || '';
  if (!world.identity?.name) world.identity.name = entry.protagonist || '';
  if (!world.identity?.roles) world.identity.roles = entry.roles || '';
  world.updatedAt = now;
  return { world, created: false };
}

function upsertScript(state, world, document, bundle, now) {
  const id = stableId('house-script', document.sourceKey);
  const existing = state.scripts.find((script) => script.houseSourceKey === document.sourceKey || script.id === id);
  const record = {
    id,
    name: document.title,
    worldId: world.id,
    world: world.name,
    status: document.status || 'Draft I',
    content: document.content || '',
    updatedAt: now,
    formats: [...(document.formats || ['Reference Script'])],
    houseSourceKey: document.sourceKey,
    houseSourceUrl: document.sourceUrl || null,
    houseSourceRevision: document.revisedAt || null,
    houseBundleId: bundle.id,
    houseBundleVersion: bundle.version,
    houseBundleManaged: true,
    documentKind: document.kind || 'reference-script',
  };
  if (existing) Object.assign(existing, record);
  else state.scripts.push(record);
  return existing ? 'updated' : 'created';
}

function upsertIngestRecord(state, world, document, bundle, now) {
  if (!state.records || typeof state.records !== 'object') state.records = {};
  if (!Array.isArray(state.records.ingest)) state.records.ingest = [];
  const id = stableId('house-ingest', document.sourceKey);
  const existing = state.records.ingest.find((record) => record.houseSourceKey === document.sourceKey || record.id === id);
  const record = {
    id,
    worldId: world.id,
    title: document.title,
    sourceType: document.sourceType || 'Canon source ingest',
    creator: document.creator || '',
    citation: document.sourceUrl || '',
    summary: document.summary || document.content || '',
    provenance: document.content || '',
    reviewStatus: document.reviewStatus || 'Unreviewed',
    canonBoundary: document.canonBoundary || 'Source-derived reference. Not automatically canon.',
    attachments: [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    canonStatus: 'non-canon',
    sourceClass: 'notion-source-reference',
    houseSourceKey: document.sourceKey,
    houseSourceUrl: document.sourceUrl || null,
    houseBundleId: bundle.id,
    houseBundleVersion: bundle.version,
    houseBundleManaged: true,
  };
  if (existing) Object.assign(existing, record);
  else state.records.ingest.push(record);
  return existing ? 'updated' : 'created';
}

function removePristineFirstRunWorld(state) {
  if (state.worlds.length !== 1) return;
  const world = state.worlds[0];
  const hasLocalRecords = Object.values(state.records || {}).some((records) => Array.isArray(records) && records.length > 0);
  const hasLocalScripts = state.scripts.some((script) => !script.houseBundleManaged && script.name !== 'First DR Script');
  const isPristine = world.name === 'Unassigned World'
    && !world.description
    && !world.history
    && !world.identity?.name
    && !hasLocalRecords
    && !hasLocalScripts;
  if (isPristine) {
    state.worlds = [];
    state.scripts = state.scripts.filter((script) => script.name !== 'First DR Script');
  }
}

export function applyHouseDrBundle(inputState, bundle, now = new Date().toISOString()) {
  const state = deepClone(inputState);
  if (!Array.isArray(state.worlds)) state.worlds = [];
  if (!Array.isArray(state.scripts)) state.scripts = [];
  if (!state.records || typeof state.records !== 'object') state.records = {};
  if (!Array.isArray(state.houseBundles)) state.houseBundles = [];

  removePristineFirstRunWorld(state);

  let worldsCreated = 0;
  let worldsUpdated = 0;
  let scriptsCreated = 0;
  let scriptsUpdated = 0;
  let ingestCreated = 0;
  let ingestUpdated = 0;

  const worldMap = new Map();
  for (const entry of bundle.worlds) {
    const result = upsertWorld(state, entry, now);
    worldMap.set(entry.sourceKey, result.world);
    if (result.created) worldsCreated += 1;
    else worldsUpdated += 1;
  }

  for (const document of bundle.documents) {
    const world = worldMap.get(document.worldSourceKey);
    if (!world) throw new Error(`House DR document ${document.sourceKey} references missing world ${document.worldSourceKey}.`);
    if (document.kind === 'source-ingest') {
      const outcome = upsertIngestRecord(state, world, document, bundle, now);
      if (outcome === 'created') ingestCreated += 1;
      else ingestUpdated += 1;
    } else {
      const outcome = upsertScript(state, world, document, bundle, now);
      if (outcome === 'created') scriptsCreated += 1;
      else scriptsUpdated += 1;
    }
  }

  const receipt = {
    id: bundle.id,
    version: bundle.version,
    title: bundle.title,
    source: bundle.source,
    appliedAt: now,
    decisionDate: bundle.decisionDate,
    stewardApproved: true,
    worlds: bundle.worlds.length,
    documents: bundle.documents.length,
  };
  const existingReceipt = state.houseBundles.find((item) => item.id === bundle.id);
  if (existingReceipt) Object.assign(existingReceipt, receipt);
  else state.houseBundles.push(receipt);

  state.provenance = {
    ...(state.provenance || {}),
    updatedAt: now,
    houseDrLibrary: {
      bundleId: bundle.id,
      bundleVersion: bundle.version,
      appliedAt: now,
      source: bundle.source,
      stewardApproved: true,
    },
  };

  if (!state.activeWorldId || !state.worlds.some((world) => world.id === state.activeWorldId)) {
    state.activeWorldId = worldMap.get(bundle.defaultWorldSourceKey)?.id || state.worlds[0]?.id || null;
  }

  return {
    state,
    receipt,
    summary: {
      worldsCreated,
      worldsUpdated,
      scriptsCreated,
      scriptsUpdated,
      ingestCreated,
      ingestUpdated,
    },
  };
}
