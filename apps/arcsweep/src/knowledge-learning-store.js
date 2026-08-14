const DB_NAME = 'arcsweep-neural-learning';
const DB_VERSION = 1;
const STORE = 'cells';
const PROPOSAL_EVENT = 'arcsweep:constellation-learning-proposal';
const SAVED_EVENT = 'arcsweep:constellation-learning-saved';
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

function txPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Arcsweep neural learning store operation failed.'));
  });
}

export async function appendLearnedCell(cell) {
  if (!cell?.id || !cell?.subject?.id) throw new Error('A provenance-bearing knowledge cell is required.');
  const db = await openDb();
  if (!db) return { stored: false, reason: 'indexeddb-unavailable', cell };
  try {
    const tx = db.transaction(STORE, 'readwrite');
    await txPromise(tx.objectStore(STORE).add(structuredClone(cell)));
    return { stored: true, cell };
  } finally {
    db.close();
  }
}

export async function listLearnedCellsForVoice(voiceId, { includeArchived = false } = {}) {
  const id = String(voiceId || '').trim().toLowerCase();
  if (!id) return [];
  const db = await openDb();
  if (!db) return [];
  try {
    const tx = db.transaction(STORE, 'readonly');
    const index = tx.objectStore(STORE).index('subjectId');
    const cells = await txPromise(index.getAll(id));
    return (cells || []).filter((cell) => includeArchived || cell.status !== 'deprecated');
  } finally {
    db.close();
  }
}

export async function listAllLearnedCells({ includeArchived = false } = {}) {
  const db = await openDb();
  if (!db) return [];
  try {
    const tx = db.transaction(STORE, 'readonly');
    const cells = await txPromise(tx.objectStore(STORE).getAll());
    return (cells || []).filter((cell) => includeArchived || cell.status !== 'deprecated');
  } finally {
    db.close();
  }
}

export async function archiveLearnedCell(cellId) {
  const db = await openDb();
  if (!db) return false;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const cell = await txPromise(store.get(cellId));
    if (!cell) return false;
    cell.status = 'deprecated';
    cell.provenance = { ...(cell.provenance || {}), archivedAt: new Date().toISOString() };
    await txPromise(store.put(cell));
    return true;
  } finally {
    db.close();
  }
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
      surface: 'user_input',
      locator: `arcsweep-field:${field.key || 'unknown'}`,
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
  error: ERROR_EVENT,
});

if (typeof document !== 'undefined') installKnowledgeLearningStore();
