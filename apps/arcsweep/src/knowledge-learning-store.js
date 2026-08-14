const DB_NAME = 'arcsweep-neural-learning';
const DB_VERSION = 1;
const STORE = 'cells';
const PROPOSAL_EVENT = 'arcsweep:constellation-learning-proposal';
const SAVED_EVENT = 'arcsweep:constellation-learning-saved';
const CHANGED_EVENT = 'arcsweep:constellation-learning-changed';
const ERROR_EVENT = 'arcsweep:constellation-learning-error';

function indexedDbAvailable() {
  return typeof indexedDB !== 'undefined';
}

function openDb() {
  if (!indexedDbAvailable()) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('subjectId', 'subject.id', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'provenance.createdAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open Arcsweep neural learning store.'));
  });
}

function requestPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Arcsweep neural learning store operation failed.'));
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Arcsweep neural learning transaction failed.'));
    tx.onabort = () => reject(tx.error || new Error('Arcsweep neural learning transaction was aborted.'));
  });
}

function assertCellShape(cell) {
  if (!cell?.id || !cell?.subject?.id || !cell?.subject?.kind) {
    throw new Error('A provenance-bearing knowledge cell with subject kind/id is required.');
  }
}

export async function appendKnowledgeCells(cells = []) {
  const batch = (Array.isArray(cells) ? cells : [cells]).map((cell) => structuredClone(cell));
  if (!batch.length) return { stored: true, cells: [] };
  batch.forEach(assertCellShape);
  const ids = new Set();
  for (const cell of batch) {
    if (ids.has(cell.id)) throw new Error(`Duplicate knowledge cell id in batch: ${cell.id}`);
    ids.add(cell.id);
  }

  const db = await openDb();
  if (!db) return { stored: false, reason: 'indexeddb-unavailable', cells: batch };
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    batch.forEach((cell) => store.add(cell));
    await transactionDone(tx);
    return { stored: true, cells: batch };
  } finally {
    db.close();
  }
}

export async function appendLearnedCell(cell) {
  const result = await appendKnowledgeCells([cell]);
  return { ...result, cell: result.cells?.[0] || cell };
}

export async function listLocalKnowledgeCells({ subjectKind = null, subjectId = null, includeArchived = false } = {}) {
  const id = String(subjectId || '').trim().toLowerCase();
  const kind = String(subjectKind || '').trim().toLowerCase();
  const db = await openDb();
  if (!db) return [];
  try {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const cells = id
      ? await requestPromise(store.index('subjectId').getAll(id))
      : await requestPromise(store.getAll());
    return (cells || [])
      .filter((cell) => !kind || String(cell.subject?.kind || '').toLowerCase() === kind)
      .filter((cell) => includeArchived || cell.status !== 'deprecated')
      .sort((a, b) => String(b.provenance?.createdAt || '').localeCompare(String(a.provenance?.createdAt || '')));
  } finally {
    db.close();
  }
}

export async function listLearnedCellsForVoice(voiceId, { includeArchived = false } = {}) {
  return listLocalKnowledgeCells({ subjectKind: 'constellation_voice', subjectId: voiceId, includeArchived });
}

export async function listAllLearnedCells({ includeArchived = false } = {}) {
  return listLocalKnowledgeCells({ includeArchived });
}

async function changeLearnedCell(cellId, updater) {
  const db = await openDb();
  if (!db) return null;
  try {
    const readTx = db.transaction(STORE, 'readonly');
    const cell = await requestPromise(readTx.objectStore(STORE).get(cellId));
    if (!cell) return null;
    const next = updater(structuredClone(cell));
    const writeTx = db.transaction(STORE, 'readwrite');
    writeTx.objectStore(STORE).put(next);
    await transactionDone(writeTx);
    return next;
  } finally {
    db.close();
  }
}

export async function archiveLearnedCell(cellId) {
  return changeLearnedCell(cellId, (cell) => {
    const now = new Date().toISOString();
    cell.status = 'deprecated';
    cell.temporal = { ...(cell.temporal || {}), validUntil: now };
    return cell;
  });
}

export async function restoreLearnedCell(cellId) {
  return changeLearnedCell(cellId, (cell) => {
    cell.status = cell.authority?.kind === 'self_authored' ? 'active' : 'provisional';
    if (cell.temporal) cell.temporal = { ...cell.temporal, validUntil: null };
    return cell;
  });
}

export function createLearningCellFromMargin(detail = {}) {
  const voiceId = String(detail.voiceId || '').trim().toLowerCase();
  if (!voiceId) throw new Error('Learning proposal requires a voice id.');
  const text = String(detail.text || '').trim();
  if (!text) throw new Error('Learning proposal requires a non-empty observation.');
  const now = new Date().toISOString();
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const context = detail.fieldContext || {};
  const page = context.page || {};
  const field = context.field || {};

  return {
    id: `${voiceId}.learned.${uuid}`,
    cellType: 'model_observation',
    subject: { kind: 'constellation_voice', id: voiceId },
    predicate: 'noted_during_writing',
    value: text,
    status: 'provisional',
    authority: {
      kind: 'model_inference',
      speakerOrAuthor: detail.voiceLabel || voiceId,
      confidence: null,
    },
    source: {
      surface: 'runtime',
      locator: `arcsweep-margin:${field.key || 'unknown'}`,
      ref: detail.requestId || null,
      receiptId: detail.requestId || null,
    },
    scope: {
      worldIds: page.worldId ? [page.worldId, ...(page.worldIdAliases || [])].filter((value, index, array) => array.indexOf(value) === index) : [],
      documentIds: page.documentId ? [page.documentId] : [],
      sceneIds: page.sceneId ? [page.sceneId] : [],
      modes: detail.mode ? [detail.mode] : [],
    },
    mutability: 'append_only',
    privacy: 'source_governed',
    provenance: {
      createdAt: now,
      createdBy: detail.voiceId || null,
      extractionMethod: 'runtime_emit',
      reviewedBy: 'user-kept',
    },
    tags: ['learned', 'margin-note', voiceId],
  };
}

async function handleProposal(event) {
  try {
    const cell = event.detail?.cell || createLearningCellFromMargin(event.detail || {});
    const result = await appendLearnedCell(cell);
    document.dispatchEvent(new CustomEvent(SAVED_EVENT, { detail: result }));
    document.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: { action: 'saved', ...result } }));
  } catch (error) {
    document.dispatchEvent(new CustomEvent(ERROR_EVENT, { detail: { message: error?.message || String(error) } }));
  }
}

export function installKnowledgeLearningStore() {
  if (typeof document === 'undefined') return;
  document.addEventListener(PROPOSAL_EVENT, handleProposal);
}

export const KNOWLEDGE_LEARNING_EVENTS = Object.freeze({
  proposal: PROPOSAL_EVENT,
  saved: SAVED_EVENT,
  changed: CHANGED_EVENT,
  error: ERROR_EVENT,
});

if (typeof document !== 'undefined') installKnowledgeLearningStore();
