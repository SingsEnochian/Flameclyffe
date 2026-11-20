const storeName = 'entries';

function openArchive(indexedDB) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('wayglass-mobius-nursery-log', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = request.onblocked = () => reject(new Error('Nursery log storage is unavailable'));
  });
}

function transact(db, mode, operation) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    transaction.onabort = () => reject(transaction.error || new Error('Nursery log transaction stopped'));
    const request = operation(transaction.objectStore(storeName));
    transaction.oncomplete = () => resolve(request?.result);
  });
}

export function createNurseryLog({ indexedDB = globalThis.indexedDB, now = () => new Date(), onState = () => {} } = {}) {
  let database;
  let tail = Promise.resolve();
  let scheduled = false;
  let state = 'saving';
  const pending = [];

  function setState(next) {
    if (state === next) return;
    state = next;
    onState(state);
  }

  function serial(operation) {
    const task = tail.then(operation);
    tail = task.catch(() => {});
    return task;
  }

  function db() {
    database ??= openArchive(indexedDB);
    return database;
  }

  function flush() {
    return serial(async () => {
      if (!pending.length || state === 'unsaved') return;
      const batch = pending.slice();
      try {
        await transact(await db(), 'readwrite', store => {
          for (const entry of batch) store.add(entry);
        });
        pending.splice(0, batch.length);
        setState('saved');
      } catch {
        setState('unsaved');
      }
    });
  }

  function beginRun() {
    return globalThis.crypto.randomUUID?.() ?? Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)), part => part.toString(16)).join('-');
  }

  function append(text, cycle, run) {
    pending.push({ at: now().toISOString(), run, cycle, text });
    if (scheduled || state === 'unsaved') return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      void flush();
    });
  }

  async function downloadText() {
    void flush();
    return serial(async () => {
      let archived = [];
      let complete = true;
      try {
        archived = await transact(await db(), 'readonly', store => store.getAll());
      } catch {
        complete = false;
        setState('unsaved');
      }
      const entries = [...archived, ...pending];
      const header = ['Wayglass · Möbius Nursery log', `${entries.length} entries · oldest first`];
      if (!complete) header.push('Saved entries were unavailable. This file contains the entries held in this tab.');
      const lines = [...header];
      let currentRun;
      for (const entry of entries) {
        if (entry.run !== currentRun) lines.push('', `Colony ${entry.run}`);
        currentRun = entry.run;
        lines.push(`${entry.at} · cycle ${entry.cycle} · ${entry.text}`);
      }
      return [...lines, ''].join('\n');
    });
  }

  return { beginRun, append, flush, downloadText };
}
