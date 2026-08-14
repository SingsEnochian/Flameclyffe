const DB_NAME = 'arcsweep-script-cortex';
const DB_VERSION = 1;
const STORE = 'script-metadata';

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'scriptId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open Arcsweep script cortex store.'));
  });
}

function requestPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Arcsweep script cortex store operation failed.'));
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Arcsweep script cortex transaction failed.'));
    tx.onabort = () => reject(tx.error || new Error('Arcsweep script cortex transaction aborted.'));
  });
}

function cleanIds(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(values.map((item) => String(item).trim().toLowerCase()).filter(Boolean))];
}

export function normaliseScriptCortexMetadata(value = {}) {
  const scriptId = String(value.scriptId || '').trim();
  if (!scriptId) throw new Error('Script cortex metadata requires a script id.');
  const order = value.storyOrder === '' || value.storyOrder == null ? null : Number(value.storyOrder);
  return {
    contract: 'arcsweep.script-cortex-metadata/v1',
    scriptId,
    worldId: String(value.worldId || '').trim().toLowerCase() || null,
    storyAt: String(value.storyAt || '').trim() || null,
    storyOrder: Number.isFinite(order) ? order : null,
    povCharacterId: String(value.povCharacterId || '').trim().toLowerCase() || null,
    narrativeVoiceId: String(value.narrativeVoiceId || '').trim().toLowerCase() || null,
    writingStyleId: String(value.writingStyleId || '').trim().toLowerCase() || null,
    sceneCharacterIds: cleanIds(value.sceneCharacterIds),
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
}

export async function loadScriptCortexMetadata(scriptId) {
  const id = String(scriptId || '').trim();
  if (!id) return null;
  const db = await openDb();
  if (!db) return null;
  try {
    const tx = db.transaction(STORE, 'readonly');
    return await requestPromise(tx.objectStore(STORE).get(id)) || null;
  } finally {
    db.close();
  }
}

export async function saveScriptCortexMetadata(value) {
  const metadata = normaliseScriptCortexMetadata(value);
  const db = await openDb();
  if (!db) return { stored: false, reason: 'indexeddb-unavailable', metadata };
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(metadata);
    await transactionDone(tx);
    return { stored: true, metadata };
  } finally {
    db.close();
  }
}

export async function deleteScriptCortexMetadata(scriptId) {
  const id = String(scriptId || '').trim();
  if (!id) return false;
  const db = await openDb();
  if (!db) return false;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    await transactionDone(tx);
    return true;
  } finally {
    db.close();
  }
}

export async function listScriptCortexMetadata() {
  const db = await openDb();
  if (!db) return [];
  try {
    const tx = db.transaction(STORE, 'readonly');
    return await requestPromise(tx.objectStore(STORE).getAll()) || [];
  } finally {
    db.close();
  }
}
