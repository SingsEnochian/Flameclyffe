import { loadState, saveState } from './storage.js';
import {
  RELATIONAL_FIELD_SCHEMA,
  createRelationalField,
  applyRelationalFieldEvent,
} from './relational-field.js';

export const RELATIONAL_FIELD_STORE_SCHEMA = 'arcsweep.relational-field-store/v0.1';
export const RELATIONAL_FIELD_STORE_RECEIPT_SCHEMA = 'arcsweep.relational-field-store-receipt/v0.1';
const STORE_KEY = 'relationalFields';
const MAX_RECEIPTS = 200;

const clone = (value) => value == null ? value : structuredClone(value);
const text = (value) => String(value ?? '').trim();

export function createEmptyRelationalFieldStore() {
  return {
    schema: RELATIONAL_FIELD_STORE_SCHEMA,
    version: 1,
    relations: {},
    receipts: [],
    updated_at: null,
  };
}

function validRelation(field) {
  return Boolean(
    field
    && field.schema === RELATIONAL_FIELD_SCHEMA
    && text(field.relation_id)
    && Array.isArray(field.participant_ids)
    && field.participant_ids.length >= 2
    && !field.participant_ids.includes(field.relation_id)
  );
}

export function normaliseRelationalFieldStore(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const relations = {};
  for (const [id, field] of Object.entries(source.relations || {})) {
    if (!validRelation(field) || field.relation_id !== id) continue;
    relations[id] = clone(field);
  }
  return {
    schema: RELATIONAL_FIELD_STORE_SCHEMA,
    version: 1,
    relations,
    receipts: Array.isArray(source.receipts) ? source.receipts.slice(-MAX_RECEIPTS).map(clone) : [],
    updated_at: typeof source.updated_at === 'string' ? source.updated_at : null,
  };
}

function storeReceipt({ action, relationId, revision = null, at = new Date().toISOString(), eventId = null }) {
  return Object.freeze({
    schema: RELATIONAL_FIELD_STORE_RECEIPT_SCHEMA,
    action,
    relation_id: relationId,
    revision,
    event_id: eventId,
    at,
    identity_law: 'A != B != R',
    canon_promoted: false,
  });
}

async function readStore() {
  const state = await loadState();
  return { state, store: normaliseRelationalFieldStore(state?.[STORE_KEY]) };
}

async function persist(state, store, meta = {}) {
  const snapshot = normaliseRelationalFieldStore(store);
  state[STORE_KEY] = snapshot;
  await saveState(state, { reason: 'relational-field-store-update', ...meta });
  return snapshot;
}

export async function getRelationalFieldStore() {
  const { store } = await readStore();
  return Object.freeze(clone(store));
}

export async function listRelationalFields() {
  const store = await getRelationalFieldStore();
  return Object.freeze(Object.values(store.relations).map((field) => Object.freeze(clone(field))));
}

export async function getRelationalField(relationId) {
  const id = text(relationId);
  if (!id) throw new TypeError('relationId is required.');
  const store = await getRelationalFieldStore();
  return store.relations[id] ? Object.freeze(clone(store.relations[id])) : null;
}

export async function createStoredRelationalField(input = {}, { now = () => new Date() } = {}) {
  const { state, store } = await readStore();
  const id = text(input.relationId ?? input.relation_id);
  if (store.relations[id]) throw new Error(`Relational field already exists: ${id}`);
  const timestamp = input.createdAt ?? input.created_at ?? now().toISOString();
  const field = createRelationalField({
    relationId: id,
    participantIds: input.participantIds ?? input.participant_ids,
    environmentId: input.environmentId ?? input.environment_id,
    kind: input.kind,
    state: input.state,
    historyRefs: input.historyRefs ?? input.history_refs,
    provenance: input.provenance,
    createdAt: timestamp,
  });
  store.relations[id] = clone(field);
  const receipt = storeReceipt({ action: 'create', relationId: id, revision: field.revision, at: timestamp });
  store.receipts.push(receipt);
  store.receipts = store.receipts.slice(-MAX_RECEIPTS);
  store.updated_at = timestamp;
  await persist(state, store, { relationId: id, action: 'create' });
  return Object.freeze({ field: clone(field), receipt });
}

export async function applyStoredRelationalFieldEvent(relationId, event = {}, { now = () => new Date() } = {}) {
  const id = text(relationId);
  if (!id) throw new TypeError('relationId is required.');
  const { state, store } = await readStore();
  const current = store.relations[id];
  if (!current) throw new Error(`Unknown relational field: ${id}`);
  const timestamp = event.timestamp ?? now().toISOString();
  const next = applyRelationalFieldEvent(current, { ...event, timestamp });
  store.relations[id] = clone(next);
  const receipt = storeReceipt({
    action: 'apply-event',
    relationId: id,
    revision: next.revision,
    at: timestamp,
    eventId: next.last_event?.event_id || null,
  });
  store.receipts.push(receipt);
  store.receipts = store.receipts.slice(-MAX_RECEIPTS);
  store.updated_at = timestamp;
  await persist(state, store, { relationId: id, action: 'apply-event', eventId: receipt.event_id });
  return Object.freeze({ field: clone(next), receipt });
}

export async function relationalFieldStoreStatus() {
  const store = await getRelationalFieldStore();
  return Object.freeze({
    schema: 'arcsweep.relational-field-store-status/v0.1',
    relation_count: Object.keys(store.relations).length,
    receipt_count: store.receipts.length,
    updated_at: store.updated_at,
    persistence: 'arcsweep-state',
    identity_law: 'A != B != R',
  });
}
