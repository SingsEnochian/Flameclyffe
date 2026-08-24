import { validateImportedState } from './core.js';
import { HOUSE_DR_BUNDLE } from './house-dr-bundle.js';
import { applyHouseDrBundle } from './house-dr-library.js';
import { createEmptyRoomCollections, normaliseRoomCollections } from './rooms.js';
import { createWorld, normaliseWorld } from './worlds.js';
import {
  createDefaultHouseglassSettings,
  createDefaultHouseglassState,
  normaliseHouseglassSettings,
  normaliseHouseglassState,
} from './houseglass.js';
import { createDefaultKelyranSchool, normaliseKelyranSchool } from './kelyran-school.js';

const STORAGE_KEY = 'hearthgate.arcsweep.local.v0.1';
export const OBSERVATORY_MIRROR_KEY = 'hearthgate.arcsweep.domain-control-bench.v1';
const desktop = typeof window !== 'undefined' ? (window.arcsweepDesktop ?? window.arcsweep ?? null) : null;
const stateExtensionSnapshots = new Map();

export function setStateExtensionSnapshot(key, value) {
  if (!key || typeof key !== 'string') throw new TypeError('State extension key is required.');
  if (value === undefined) {
    stateExtensionSnapshots.delete(key);
    return null;
  }
  const snapshot = structuredClone(value);
  stateExtensionSnapshots.set(key, snapshot);
  return structuredClone(snapshot);
}

export function clearStateExtensionSnapshot(key) {
  return stateExtensionSnapshots.delete(key);
}

export function applyStateExtensionSnapshots(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new TypeError('Arcsweep state object is required.');
  for (const [key, value] of stateExtensionSnapshots.entries()) state[key] = structuredClone(value);
  return state;
}

function uid(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyObservatoryStore() {
  return {
    version: 1,
    custom_profiles: [],
    sweeps: [],
    theory_candidates: [],
    theory_reviews: [],
    deep_time_records: [],
    deep_time_replays: [],
    advisor_receipts: [],
    domain_mappings: [],
    runa_suggestions: [],
    runa_renderer_candidates: [],
    runa_renderer_reviews: [],
    runa_preview_palettes: [],
    runa_preview_plans: [],
    runa_preview_renders: [],
    runa_preview_evidence_arms: [],
    runa_preview_observation_links: [],
    provenance_exports: [],
    integrity_reports: [],
    active_profile_id: null,
    migration: {
      legacy_local_storage_imported_at: null,
    },
  };
}

export function normaliseObservatoryStore(value) {
  const defaults = createEmptyObservatoryStore();
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const arrayKeys = [
    'custom_profiles',
    'sweeps',
    'theory_candidates',
    'theory_reviews',
    'deep_time_records',
    'deep_time_replays',
    'advisor_receipts',
    'domain_mappings',
    'runa_suggestions',
    'runa_renderer_candidates',
    'runa_renderer_reviews',
    'runa_preview_palettes',
    'runa_preview_plans',
    'runa_preview_renders',
    'runa_preview_evidence_arms',
    'runa_preview_observation_links',
    'provenance_exports',
    'integrity_reports',
  ];
  const result = {
    ...defaults,
    ...input,
    version: 1,
    active_profile_id: typeof input.active_profile_id === 'string' ? input.active_profile_id : null,
    migration: {
      ...defaults.migration,
      ...(input.migration && typeof input.migration === 'object' ? input.migration : {}),
    },
  };
  for (const key of arrayKeys) result[key] = Array.isArray(input[key]) ? structuredClone(input[key]) : [];
  return result;
}

function observatoryHasData(store) {
  const value = normaliseObservatoryStore(store);
  return Boolean(
    value.active_profile_id
    || value.custom_profiles.length
    || value.sweeps.length
    || value.theory_candidates.length
    || value.theory_reviews.length
    || value.deep_time_records.length
    || value.deep_time_replays.length
    || value.advisor_receipts.length
    || value.domain_mappings.length
    || value.runa_suggestions.length
    || value.runa_renderer_candidates.length
    || value.runa_renderer_reviews.length
    || value.runa_preview_palettes.length
    || value.runa_preview_plans.length
    || value.runa_preview_renders.length
    || value.runa_preview_evidence_arms.length
    || value.runa_preview_observation_links.length
    || value.provenance_exports.length
    || value.integrity_reports.length
  );
}

function readLegacyObservatoryMirror() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(OBSERVATORY_MIRROR_KEY) || 'null');
    return parsed?.version === 1 ? normaliseObservatoryStore(parsed) : null;
  } catch {
    return null;
  }
}

function mirrorObservatory(store) {
  try {
    globalThis.localStorage?.setItem(OBSERVATORY_MIRROR_KEY, JSON.stringify(normaliseObservatoryStore(store)));
  } catch {}
}

function migrateLegacyObservatory(state) {
  const current = normaliseObservatoryStore(state.observatory);
  const legacy = readLegacyObservatoryMirror();
  if (observatoryHasData(current) || !legacy || !observatoryHasData(legacy)) {
    state.observatory = current;
    return false;
  }
  state.observatory = {
    ...legacy,
    migration: {
      ...(legacy.migration || {}),
      legacy_local_storage_imported_at: new Date().toISOString(),
    },
  };
  return true;
}

function createEmptyFeedbackQueueState() {
  return {
    schema: 'arcsweep.feedback-cycle-queue/v1',
    version: 1,
    entries: {},
    receipts: [],
    updated_at: null,
  };
}

function normaliseFeedbackQueueState(value) {
  const defaults = createEmptyFeedbackQueueState();
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schema !== defaults.schema) return defaults;
  return {
    ...defaults,
    entries: value.entries && typeof value.entries === 'object' && !Array.isArray(value.entries) ? structuredClone(value.entries) : {},
    receipts: Array.isArray(value.receipts) ? structuredClone(value.receipts) : [],
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : null,
  };
}

export function createEmptyTransformationRequestState() {
  return { version: 1, byWorld: {} };
}

export function normaliseTransformationRequestState(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const byWorld = input.byWorld && typeof input.byWorld === 'object' && !Array.isArray(input.byWorld)
    ? structuredClone(input.byWorld)
    : {};
  for (const [worldId, record] of Object.entries(byWorld)) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      delete byWorld[worldId];
      continue;
    }
    record.requests = Array.isArray(record.requests) ? record.requests : [];
    record.responses = Array.isArray(record.responses) ? record.responses : [];
    record.circuits = Array.isArray(record.circuits) ? record.circuits : [];
  }
  return { version: 1, byWorld };
}

export function createDefaultState() {
  const now = new Date().toISOString();
  const world = createWorld(uid('world'), now);
  const houseglassSettings = createDefaultHouseglassSettings();
  return {
    version: '0.3.0',
    settings: {
      crLabel: 'Waking World',
      drLabel: 'Desired Reality',
      crMinutes: 60,
      drMinutes: 10080,
      returnAnchor: 'Notch',
      reduceMotion: false,
      largeText: false,
      highContrast: false,
      fontScale: 1,
      houseglass: houseglassSettings,
    },
    worlds: [world],
    activeWorldId: world.id,
    session: {
      active: false,
      startedAt: null,
      targetWorldId: null,
      targetWorld: '',
      intention: '',
      wakingMinutes: null,
      worldMinutes: null,
    },
    scripts: [{
      id: uid('script'),
      name: 'First DR Script',
      worldId: world.id,
      world: world.name,
      status: 'Draft I',
      content: 'Identity:\nEmbodiment:\nWorld:\nRelationships:\nArrival:\nReturn:',
      updatedAt: now,
    }],
    continuity: [],
    manifestations: [],
    records: createEmptyRoomCollections(),
    appearance: {
      name: '', form: '', sensorySignature: '', notes: '', updatedAt: now,
    },
    returnHistory: [],
    feedbackCycles: [],
    feedbackQueue: createEmptyFeedbackQueueState(),
    transformationRequests: createEmptyTransformationRequestState(),
    premaqcByWorld: {},
    observatory: createEmptyObservatoryStore(),
    houseglass: createDefaultHouseglassState(houseglassSettings),
    kelyranSchool: createDefaultKelyranSchool(now),
    houseBundles: [],
    provenance: {
      createdAt: now,
      updatedAt: now,
      storage: desktop ? 'desktop-local-store' : 'browser-development-fallback',
    },
  };
}

export function normaliseState(value) {
  const imported = validateImportedState(value);
  const defaults = createDefaultState();
  const fallbackWorldName = imported.session?.targetWorld
    || imported.scripts?.[0]?.world
    || imported.settings?.drLabel
    || defaults.worlds[0].name;

  const worlds = Array.isArray(imported.worlds) && imported.worlds.length
    ? imported.worlds.map((world, index) => normaliseWorld(
      world,
      world?.id || uid(`world-${index + 1}`),
    ))
    : [normaliseWorld({ ...defaults.worlds[0], name: fallbackWorldName }, defaults.worlds[0].id)];

  const requestedActiveId = imported.activeWorldId;
  const activeWorldId = worlds.some((world) => world.id === requestedActiveId)
    ? requestedActiveId
    : worlds[0].id;

  const legacySessionWorld = worlds.find((world) => world.name === imported.session?.targetWorld);
  const session = { ...defaults.session, ...(imported.session || {}) };
  if (!session.targetWorldId && legacySessionWorld) session.targetWorldId = legacySessionWorld.id;

  const scripts = Array.isArray(imported.scripts) ? imported.scripts.map((script) => {
    const linked = worlds.find((world) => world.id === script.worldId || world.name === script.world);
    return { ...script, worldId: linked?.id || activeWorldId, world: linked?.name || script.world || 'Unassigned' };
  }) : defaults.scripts;

  const firstWorld = worlds[0];
  if (imported.appearance && !firstWorld.identity?.name && !firstWorld.identity?.form) {
    firstWorld.identity = { ...firstWorld.identity, ...imported.appearance };
  }

  const settings = {
    ...defaults.settings,
    ...(imported.settings || {}),
    houseglass: normaliseHouseglassSettings(imported.settings?.houseglass),
  };

  return {
    ...defaults,
    ...imported,
    version: '0.3.0',
    settings,
    worlds,
    activeWorldId,
    session,
    scripts,
    continuity: Array.isArray(imported.continuity) ? imported.continuity : [],
    manifestations: Array.isArray(imported.manifestations) ? imported.manifestations : [],
    records: normaliseRoomCollections(imported.records),
    appearance: { ...defaults.appearance, ...(imported.appearance || {}) },
    returnHistory: Array.isArray(imported.returnHistory) ? imported.returnHistory : [],
    feedbackCycles: Array.isArray(imported.feedbackCycles) ? imported.feedbackCycles : [],
    feedbackQueue: normaliseFeedbackQueueState(imported.feedbackQueue),
    transformationRequests: normaliseTransformationRequestState(imported.transformationRequests),
    premaqcByWorld: imported.premaqcByWorld && typeof imported.premaqcByWorld === 'object' ? imported.premaqcByWorld : {},
    observatory: normaliseObservatoryStore(imported.observatory),
    houseglass: normaliseHouseglassState(imported.houseglass, settings.houseglass),
    kelyranSchool: normaliseKelyranSchool(imported.kelyranSchool),
    houseBundles: Array.isArray(imported.houseBundles) ? imported.houseBundles : [],
    provenance: {
      ...defaults.provenance,
      ...(imported.provenance || {}),
      updatedAt: new Date().toISOString(),
      storage: desktop ? 'desktop-local-store' : 'browser-development-fallback',
    },
  };
}

function hasCurrentHouseBundle(state) {
  return state.houseBundles?.some((bundle) => (
    bundle.id === HOUSE_DR_BUNDLE.id && bundle.version === HOUSE_DR_BUNDLE.version
  ));
}

export function installCurrentHouseDrLibrary(state, now = new Date().toISOString()) {
  const normalised = normaliseState(state);
  if (hasCurrentHouseBundle(normalised)) {
    return { state: normalised, changed: false, receipt: null, summary: null };
  }
  const result = applyHouseDrBundle(normalised, HOUSE_DR_BUNDLE, now);
  return { ...result, changed: true };
}

function readBrowserState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normaliseState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function loadState() {
  if (desktop?.loadState) {
    const result = await desktop.loadState();
    const legacy = result?.state ? null : readBrowserState();
    const initial = result?.state || legacy || createDefaultState();
    const installed = installCurrentHouseDrLibrary(initial);
    const observatoryMigrated = migrateLegacyObservatory(installed.state);
    applyStateExtensionSnapshots(installed.state);
    const shouldSave = installed.changed || observatoryMigrated || !result?.state;
    if (shouldSave) {
      if (result?.state && desktop.createBackup && (installed.changed || observatoryMigrated)) {
        await desktop.createBackup(observatoryMigrated ? 'before-observatory-state-migration' : 'before-house-dr-library-update').catch(() => null);
      }
      await desktop.saveState(installed.state, {
        reason: observatoryMigrated
          ? 'observatory-state-migration'
          : installed.changed
            ? (result?.state ? 'house-dr-library-update' : (legacy ? 'browser-migration-house-library' : 'first-run-house-library'))
            : (legacy ? 'browser-migration' : 'first-run'),
        bundleId: installed.receipt?.id ?? null,
        bundleVersion: installed.receipt?.version ?? null,
      });
    }
    mirrorObservatory(installed.state.observatory);
    return installed.state;
  }

  const installed = installCurrentHouseDrLibrary(readBrowserState() || createDefaultState());
  const observatoryMigrated = migrateLegacyObservatory(installed.state);
  applyStateExtensionSnapshots(installed.state);
  if (installed.changed || observatoryMigrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(installed.state));
  mirrorObservatory(installed.state.observatory);
  return installed.state;
}

let saveChain = Promise.resolve();
export function saveState(state, meta = {}) {
  applyStateExtensionSnapshots(state);
  state.provenance = {
    ...(state.provenance || {}),
    updatedAt: new Date().toISOString(),
    storage: desktop ? 'desktop-local-store' : 'browser-development-fallback',
  };
  state.version = '0.3.0';
  state.observatory = normaliseObservatoryStore(state.observatory);
  state.feedbackQueue = normaliseFeedbackQueueState(state.feedbackQueue);
  state.transformationRequests = normaliseTransformationRequestState(state.transformationRequests);
  state.kelyranSchool = normaliseKelyranSchool(state.kelyranSchool);
  const snapshot = JSON.parse(JSON.stringify(state));
  mirrorObservatory(snapshot.observatory);
  if (desktop?.saveState) {
    saveChain = saveChain.catch(() => {}).then(() => desktop.saveState(snapshot, meta));
    return saveChain;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  return Promise.resolve({ ok: true, mode: 'browser-development-fallback' });
}

let observatorySaveChain = Promise.resolve();
export function persistObservatoryStore(store, meta = {}) {
  const snapshot = normaliseObservatoryStore(store);
  mirrorObservatory(snapshot);
  observatorySaveChain = observatorySaveChain.catch(() => {}).then(async () => {
    const state = await loadState();
    state.observatory = snapshot;
    return saveState(state, { reason: 'observatory-store-update', ...meta });
  });
  return observatorySaveChain;
}

export function newId(prefix) {
  return uid(prefix);
}

function browserDownload(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hearthgate-arcsweep-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { ok: true, mode: 'browser', path: link.download };
}

export async function exportState(state) {
  applyStateExtensionSnapshots(state);
  return desktop?.exportState ? desktop.exportState(state) : browserDownload(state);
}

export async function importState(file = null) {
  let imported = null;
  if (desktop?.importState) {
    const result = await desktop.importState();
    imported = result?.state || null;
  } else if (file) {
    const text = await file.text();
    imported = JSON.parse(text);
  }
  const state = imported ? installCurrentHouseDrLibrary(imported).state : null;
  if (state) applyStateExtensionSnapshots(state);
  return state;
}

export async function getStorageInfo() {
  if (desktop?.getStorageInfo) return desktop.getStorageInfo();
  return { mode: 'browser-development-fallback', dataDirectory: 'Browser localStorage', backups: [] };
}

export async function createBackup(reason = 'manual') {
  return desktop?.createBackup ? desktop.createBackup(reason) : { ok: false, unavailable: true };
}

export async function listBackups() {
  return desktop?.listBackups ? desktop.listBackups() : [];
}

export async function restoreBackup(name) {
  if (!desktop?.restoreBackup) return null;
  const result = await desktop.restoreBackup(name);
  const state = result?.state ? installCurrentHouseDrLibrary(result.state).state : null;
  if (state) applyStateExtensionSnapshots(state);
  return state;
}

export async function addAttachments() {
  return desktop?.addAttachments ? desktop.addAttachments() : [];
}

export async function openAttachment(attachment) {
  return desktop?.openAttachment ? desktop.openAttachment(attachment) : null;
}

export async function showDataFolder() {
  return desktop?.showDataFolder ? desktop.showDataFolder() : null;
}

export function isDesktopRuntime() {
  return Boolean(desktop);
}