import { validateImportedState } from './core.js';
import { HOUSE_DR_BUNDLE } from './house-dr-bundle.js';
import { applyHouseDrBundle } from './house-dr-library.js';
import { createEmptyRoomCollections, normaliseRoomCollections } from './rooms.js';
import { createWorld, normaliseWorld } from './worlds.js';

const STORAGE_KEY = 'hearthgate.arcsweep.local.v0.1';
const desktop = typeof window !== 'undefined' ? window.arcsweepDesktop : null;

function uid(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultState() {
  const now = new Date().toISOString();
  const world = createWorld(uid('world'), now);
  return {
    version: '0.2.1',
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

  return {
    ...defaults,
    ...imported,
    version: '0.2.1',
    settings: { ...defaults.settings, ...(imported.settings || {}) },
    worlds,
    activeWorldId,
    session,
    scripts,
    continuity: Array.isArray(imported.continuity) ? imported.continuity : [],
    manifestations: Array.isArray(imported.manifestations) ? imported.manifestations : [],
    records: normaliseRoomCollections(imported.records),
    appearance: { ...defaults.appearance, ...(imported.appearance || {}) },
    returnHistory: Array.isArray(imported.returnHistory) ? imported.returnHistory : [],
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
    if (installed.changed) {
      if (result?.state && desktop.createBackup) {
        await desktop.createBackup('before-house-dr-library-update').catch(() => null);
      }
      await desktop.saveState(installed.state, {
        reason: result?.state ? 'house-dr-library-update' : (legacy ? 'browser-migration-house-library' : 'first-run-house-library'),
        bundleId: installed.receipt.id,
        bundleVersion: installed.receipt.version,
      });
    } else if (!result?.state) {
      await desktop.saveState(installed.state, { reason: legacy ? 'browser-migration' : 'first-run' });
    }
    return installed.state;
  }

  const installed = installCurrentHouseDrLibrary(readBrowserState() || createDefaultState());
  if (installed.changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(installed.state));
  return installed.state;
}

let saveChain = Promise.resolve();
export function saveState(state, meta = {}) {
  state.provenance = {
    ...(state.provenance || {}),
    updatedAt: new Date().toISOString(),
    storage: desktop ? 'desktop-local-store' : 'browser-development-fallback',
  };
  const snapshot = JSON.parse(JSON.stringify(state));
  if (desktop?.saveState) {
    saveChain = saveChain.then(() => desktop.saveState(snapshot, meta));
    return saveChain;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  return Promise.resolve({ ok: true, mode: 'browser-development-fallback' });
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
  return imported ? installCurrentHouseDrLibrary(imported).state : null;
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
  return result?.state ? installCurrentHouseDrLibrary(result.state).state : null;
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
