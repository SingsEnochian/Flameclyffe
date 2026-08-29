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

function findScript(state, document) {
  const id = stableId('house-script', document.sourceKey);
  return state.scripts.find((script) => script.houseSourceKey === document.sourceKey || script.id === id) || null;
}

function findIngestRecord(state, document) {
  const id = stableId('house-ingest', document.sourceKey);
  return state.records?.ingest?.find((record) => record.houseSourceKey === document.sourceKey || record.id === id) || null;
}

function sourceProfile(entry) {
  return {
    name: entry.name || '',
    kind: entry.kind || 'Desired Reality',
    description: entry.description || '',
    history: entry.history || '',
    rules: entry.rules || '',
    protagonist: entry.protagonist || '',
    roles: entry.roles || '',
    identityNotes: entry.identityNotes || '',
    revisedAt: entry.revisedAt || null,
  };
}

function seedWorld(entry, now) {
  const world = createWorld(stableId('house-world', entry.sourceKey), now);
  const profile = sourceProfile(entry);
  world.name = profile.name;
  world.kind = profile.kind;
  world.description = profile.description;
  world.history = profile.history;
  world.rules = profile.rules;
  world.identity.name = profile.protagonist;
  world.identity.roles = profile.roles;
  world.identity.notes = profile.identityNotes;
  world.houseSourceKey = entry.sourceKey;
  world.houseSourceUrls = [...(entry.sourceUrls || [])];
  world.houseProfile = profile;
  world.houseBundleManaged = true;
  world.updatedAt = now;
  return world;
}

function managedValue(current, previous, next, placeholders = []) {
  if (current === undefined || current === null || current === '') return next;
  if (previous !== undefined && current === previous) return next;
  if (placeholders.includes(current)) return next;
  return current;
}

function upsertWorld(state, entry, now) {
  let world = findWorld(state, entry);
  if (!world) {
    world = seedWorld(entry, now);
    state.worlds.push(world);
    return { world, created: true };
  }

  const previous = world.houseProfile || {};
  const next = sourceProfile(entry);
  if (!world.identity || typeof world.identity !== 'object') world.identity = {};

  world.name = managedValue(world.name, previous.name, next.name, ['Unassigned World', 'Untitled World']);
  world.kind = managedValue(world.kind, previous.kind, next.kind, ['Desired Reality']);
  world.description = managedValue(world.description, previous.description, next.description);
  world.history = managedValue(world.history, previous.history, next.history);
  world.rules = managedValue(world.rules, previous.rules, next.rules);
  world.identity.name = managedValue(world.identity.name, previous.protagonist, next.protagonist);
  world.identity.roles = managedValue(world.identity.roles, previous.roles, next.roles);
  world.identity.notes = managedValue(world.identity.notes, previous.identityNotes, next.identityNotes);

  world.houseSourceKey = entry.sourceKey;
  world.houseSourceUrls = [...(entry.sourceUrls || [])];
  world.houseProfile = next;
  world.houseBundleManaged = true;
  world.updatedAt = now;
  return { world, created: false };
}

function adoptWorldProvenance(world, entry) {
  let changed = false;
  if (world.houseSourceKey !== entry.sourceKey) {
    world.houseSourceKey = entry.sourceKey;
    changed = true;
  }
  if (!world.houseBundleManaged) {
    world.houseBundleManaged = true;
    changed = true;
  }
  if (!world.houseProfile) {
    world.houseProfile = sourceProfile(entry);
    changed = true;
  }
  if (!Array.isArray(world.houseSourceUrls) || !world.houseSourceUrls.length) {
    world.houseSourceUrls = [...(entry.sourceUrls || [])];
    changed = true;
  }
  return changed;
}

function upsertScript(state, world, document, bundle, now) {
  const id = stableId('house-script', document.sourceKey);
  const existing = findScript(state, document);
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
  const existing = findIngestRecord(state, document);
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
    attachments: existing?.attachments || [],
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

function ensureStateShape(state) {
  if (!Array.isArray(state.worlds)) state.worlds = [];
  if (!Array.isArray(state.scripts)) state.scripts = [];
  if (!state.records || typeof state.records !== 'object') state.records = {};
  if (!Array.isArray(state.records.ingest)) state.records.ingest = [];
  if (!Array.isArray(state.houseBundles)) state.houseBundles = [];
}

export function inspectHouseDrBundleIntegrity(inputState, bundle) {
  const state = inputState && typeof inputState === 'object' ? inputState : {};
  const worlds = Array.isArray(state.worlds) ? state.worlds : [];
  const scripts = Array.isArray(state.scripts) ? state.scripts : [];
  const ingests = Array.isArray(state.records?.ingest) ? state.records.ingest : [];
  const receipts = Array.isArray(state.houseBundles) ? state.houseBundles : [];
  const currentReceipt = receipts.find((item) => item?.id === bundle.id && item?.version === bundle.version) || null;

  const worldBySource = new Map();
  const missingWorlds = [];
  const unprovenancedWorlds = [];
  for (const entry of bundle.worlds) {
    const world = worlds.find((item) => item?.houseSourceKey === entry.sourceKey)
      || worlds.find((item) => item?.name === entry.name)
      || null;
    if (!world) missingWorlds.push(entry.sourceKey);
    else {
      worldBySource.set(entry.sourceKey, world);
      if (world.houseSourceKey !== entry.sourceKey || !world.houseBundleManaged) unprovenancedWorlds.push(entry.sourceKey);
    }
  }

  const missingScripts = [];
  const mislinkedScripts = [];
  const missingIngests = [];
  const mislinkedIngests = [];
  for (const document of bundle.documents) {
    const world = worldBySource.get(document.worldSourceKey) || null;
    if (document.kind === 'source-ingest') {
      const id = stableId('house-ingest', document.sourceKey);
      const record = ingests.find((item) => item?.houseSourceKey === document.sourceKey || item?.id === id) || null;
      if (!record) missingIngests.push(document.sourceKey);
      else if (world && record.worldId !== world.id) mislinkedIngests.push(document.sourceKey);
    } else {
      const id = stableId('house-script', document.sourceKey);
      const script = scripts.find((item) => item?.houseSourceKey === document.sourceKey || item?.id === id) || null;
      if (!script) missingScripts.push(document.sourceKey);
      else if (world && (script.worldId !== world.id || script.world !== world.name)) mislinkedScripts.push(document.sourceKey);
    }
  }

  const complete = Boolean(currentReceipt)
    && missingWorlds.length === 0
    && unprovenancedWorlds.length === 0
    && missingScripts.length === 0
    && mislinkedScripts.length === 0
    && missingIngests.length === 0
    && mislinkedIngests.length === 0;

  return {
    complete,
    currentReceipt,
    missingWorlds,
    unprovenancedWorlds,
    missingScripts,
    mislinkedScripts,
    missingIngests,
    mislinkedIngests,
  };
}

export function repairHouseDrBundle(inputState, bundle, now = new Date().toISOString()) {
  const state = deepClone(inputState);
  ensureStateShape(state);
  removePristineFirstRunWorld(state);

  let worldsCreated = 0;
  let worldsAdopted = 0;
  let scriptsCreated = 0;
  let scriptsRelinked = 0;
  let ingestCreated = 0;
  let ingestRelinked = 0;
  const worldMap = new Map();

  for (const entry of bundle.worlds) {
    let world = findWorld(state, entry);
    if (!world) {
      world = seedWorld(entry, now);
      state.worlds.push(world);
      worldsCreated += 1;
    } else if (adoptWorldProvenance(world, entry)) {
      worldsAdopted += 1;
    }
    worldMap.set(entry.sourceKey, world);
  }

  for (const document of bundle.documents) {
    const world = worldMap.get(document.worldSourceKey);
    if (!world) throw new Error(`House DR document ${document.sourceKey} references missing world ${document.worldSourceKey}.`);

    if (document.kind === 'source-ingest') {
      const record = findIngestRecord(state, document);
      if (!record) {
        upsertIngestRecord(state, world, document, bundle, now);
        ingestCreated += 1;
      } else if (record.worldId !== world.id) {
        record.worldId = world.id;
        record.updatedAt = now;
        ingestRelinked += 1;
      }
      continue;
    }

    const script = findScript(state, document);
    if (!script) {
      upsertScript(state, world, document, bundle, now);
      scriptsCreated += 1;
    } else if (script.worldId !== world.id || script.world !== world.name) {
      script.worldId = world.id;
      script.world = world.name;
      script.updatedAt = now;
      scriptsRelinked += 1;
    }
  }

  const changed = worldsCreated + worldsAdopted + scriptsCreated + scriptsRelinked + ingestCreated + ingestRelinked > 0;
  if (changed) {
    state.provenance = {
      ...(state.provenance || {}),
      updatedAt: now,
      houseDrLibraryRepair: {
        bundleId: bundle.id,
        bundleVersion: bundle.version,
        repairedAt: now,
        additiveOnly: true,
        worldsCreated,
        worldsAdopted,
        scriptsCreated,
        scriptsRelinked,
        ingestCreated,
        ingestRelinked,
      },
    };
  }

  if (!state.activeWorldId || !state.worlds.some((world) => world.id === state.activeWorldId)) {
    state.activeWorldId = worldMap.get(bundle.defaultWorldSourceKey)?.id || state.worlds[0]?.id || null;
  }

  return {
    state,
    changed,
    receipt: state.houseBundles.find((item) => item?.id === bundle.id && item?.version === bundle.version) || null,
    summary: {
      worldsCreated,
      worldsAdopted,
      scriptsCreated,
      scriptsRelinked,
      ingestCreated,
      ingestRelinked,
    },
  };
}

export function applyHouseDrBundle(inputState, bundle, now = new Date().toISOString()) {
  const state = deepClone(inputState);
  ensureStateShape(state);

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
