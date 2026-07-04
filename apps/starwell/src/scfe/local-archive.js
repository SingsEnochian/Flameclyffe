export const SCFE_LOCAL_ARCHIVE_KEY = 'starwell.scfe.localArchive.v0.2';

export function createArchiveEntry(snapshot) {
  return {
    id: snapshot.snapshot_id,
    saved_at: new Date().toISOString(),
    target_timestamp: snapshot.target_timestamp,
    field_label: snapshot.deep?.field_label || 'field_observation',
    world_mood: snapshot.terra_aeterna?.world_mood || 'watchful_observatory',
    safety_mode: snapshot.somatic?.interface_safety_mode || 'unknown',
    cyclic_index: snapshot.barbault?.cyclic_index ?? null,
    primary_form: snapshot.sacred_geometry?.primary_form || null,
    snapshot,
  };
}

export function readLocalArchive(storage = globalThis.localStorage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SCFE_LOCAL_ARCHIVE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalArchive(entries, storage = globalThis.localStorage) {
  if (!storage) return [];
  const safeEntries = Array.isArray(entries) ? entries.slice(0, 30) : [];
  storage.setItem(SCFE_LOCAL_ARCHIVE_KEY, JSON.stringify(safeEntries));
  return safeEntries;
}

export function saveSnapshotToLocalArchive(snapshot, storage = globalThis.localStorage) {
  const current = readLocalArchive(storage);
  const entry = createArchiveEntry(snapshot);
  const next = [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, 30);
  return writeLocalArchive(next, storage);
}

export function removeLocalArchiveEntry(entryId, storage = globalThis.localStorage) {
  const current = readLocalArchive(storage);
  const next = entryId ? current.filter((entry) => entry.id !== entryId) : current;
  return writeLocalArchive(next, storage);
}

export function clearLocalArchive(storage = globalThis.localStorage) {
  if (!storage) return [];
  storage.removeItem(SCFE_LOCAL_ARCHIVE_KEY);
  return [];
}
