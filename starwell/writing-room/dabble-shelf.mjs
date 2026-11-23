// Local source shelf shared by the Dabble Bridge and STARWELL Writing Room.
// IndexedDB belongs to this origin and is not shared with Dabble or any LLM provider.
const DATABASE = 'starwell-writing-room-manuscript-shelf';
const STORE = 'exports';
const VERSION = 1;
export function openManuscriptShelf(factory = globalThis.indexedDB) {
  return new Promise((resolve, reject) => {
    if (!factory || typeof factory.open !== 'function') return reject(new Error('Local manuscript storage is unavailable in this browser'));
    const request = factory.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'sha256' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Manuscript shelf could not open'));
    request.onblocked = () => reject(new Error('Close other Writing Room tabs and try again'));
  });
}
function operation(kind, callback, factory) {
  return openManuscriptShelf(factory).then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, kind);
    const store = tx.objectStore(STORE);
    let output;
    let request;
    try { request = callback(store); } catch (error) { db.close(); reject(error); return; }
    request.onsuccess = () => { output = request.result; };
    request.onerror = () => { /* transaction error reports the failure */ };
    tx.oncomplete = () => { db.close(); resolve(output); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error('Local shelf transaction failed')); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error('Local shelf operation cancelled')); };
  }));
}
export function keepManuscript(record, factory) {
  if (!record || record.schema !== 'wayglass.dabble-export/v1' ||
      typeof record.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(record.sha256) ||
      typeof record.content !== 'string' || record.mode !== 'read-only') {
    return Promise.reject(new Error('Only verified, read-only Dabble export records can be stored'));
  }
  return operation('readwrite', store => store.put(record), factory);
}
export function listManuscripts(factory) {
  return operation('readonly', store => store.getAll(), factory).then(items =>
    items.map(({ content, ...metadata }) => metadata).sort((a,b) => b.importedAt.localeCompare(a.importedAt)));
}
export function readManuscript(sha256, factory) {
  if (!/^[0-9a-f]{64}$/.test(String(sha256))) return Promise.reject(new Error('Invalid manuscript reference'));
  return operation('readonly', store => store.get(sha256), factory);
}
export function forgetManuscript(sha256, factory) {
  if (!/^[0-9a-f]{64}$/.test(String(sha256))) return Promise.reject(new Error('Invalid manuscript reference'));
  return operation('readwrite', store => store.delete(sha256), factory);
}
