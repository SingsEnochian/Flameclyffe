const LEDGER_SCHEMA = 'arcsweep.temporal-witness-ledger/v1';
const RECORD_SCHEMA = 'arcsweep.temporal-record/v1';
const EVENT_SCHEMA = 'arcsweep.temporal-witness-event/v1';
const DEFAULT_STORAGE_KEY = 'arcsweep:temporal-witness:v1';
const DEFAULT_MAX_RECORDS = 2048;

export const TEMPORAL_RECORD_TYPES = Object.freeze([
  'real-world-event',
  'personal-event',
  'dream',
  'synchronicity',
  'prediction-intuition',
  'memory-divergence',
  'social-climate',
  'system-note',
]);

export const TEMPORAL_EPISTEMIC_STATUS = Object.freeze([
  'observed',
  'reported',
  'remembered',
  'dreamed',
  'inferred',
  'speculative',
]);

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function nowIso(now) {
  return now().toISOString();
}

function text(value, max = 4000) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function uniqueStrings(values, maxItems = 16, maxLength = 240) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => text(value, maxLength))
    .filter(Boolean))].slice(0, maxItems);
}

function isoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function recordId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `temporal:${uuid || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
}

function timezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}

function stablePayload(record) {
  return JSON.stringify({
    schema: record.schema,
    record_id: record.record_id,
    record_type: record.record_type,
    title: record.title,
    description: record.description,
    observed_at: record.observed_at,
    occurred_at: record.occurred_at,
    recorded_at: record.recorded_at,
    source_refs: record.source_refs,
    witness_refs: record.witness_refs,
    related_record_ids: record.related_record_ids,
    tags: record.tags,
    epistemic_status: record.epistemic_status,
    confidence: record.confidence,
    visibility: record.visibility,
    context: record.context,
  });
}

async function sha256(value) {
  try {
    if (!globalThis.crypto?.subtle || typeof TextEncoder === 'undefined') return null;
    const bytes = new TextEncoder().encode(value);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

function normaliseConfidence(value) {
  if (value === '' || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(1, number));
}

function defaultEpistemicStatus(recordType) {
  if (recordType === 'dream') return 'dreamed';
  if (recordType === 'memory-divergence') return 'remembered';
  if (recordType === 'prediction-intuition') return 'speculative';
  if (recordType === 'social-climate') return 'observed';
  return 'observed';
}

function compactContext(input = {}) {
  return {
    world_id: input.active_world_id || input.world_id || null,
    project_id: input.active_project_id || input.project_id || null,
    scene_id: input.active_scene_id || input.scene_id || null,
    document_id: input.active_document_id || input.document_id || null,
    room: input.active_room || input.room || null,
    context_id: input.active_context_id || input.context_id || null,
  };
}

function header(record = {}) {
  return Object.freeze({
    schema: 'arcsweep.temporal-record-header/v1',
    record_id: record.record_id || null,
    record_type: record.record_type || null,
    title: record.title || null,
    observed_at: record.observed_at || null,
    occurred_at: record.occurred_at || null,
    recorded_at: record.recorded_at || null,
    epistemic_status: record.epistemic_status || null,
    source_count: Array.isArray(record.source_refs) ? record.source_refs.length : 0,
    witness_count: Array.isArray(record.witness_refs) ? record.witness_refs.length : 0,
    relation_count: Array.isArray(record.related_record_ids) ? record.related_record_ids.length : 0,
    tag_count: Array.isArray(record.tags) ? record.tags.length : 0,
  });
}

export function createTemporalWitnessStore({
  storage = null,
  storageKey = DEFAULT_STORAGE_KEY,
  maxRecords = DEFAULT_MAX_RECORDS,
  now = () => new Date(),
  contextProvider = () => ({}),
} = {}) {
  function readLedger() {
    if (!storage?.getItem) return { schema: LEDGER_SCHEMA, records: [] };
    try {
      const raw = storage.getItem(storageKey);
      if (!raw) return { schema: LEDGER_SCHEMA, records: [] };
      const parsed = JSON.parse(raw);
      if (parsed?.schema !== LEDGER_SCHEMA || !Array.isArray(parsed.records)) return { schema: LEDGER_SCHEMA, records: [] };
      return { schema: LEDGER_SCHEMA, records: parsed.records.filter((item) => item?.schema === RECORD_SCHEMA).slice(-maxRecords) };
    } catch {
      return { schema: LEDGER_SCHEMA, records: [] };
    }
  }

  function writeLedger(records) {
    if (!storage?.setItem) throw new Error('Temporal Witness local storage is unavailable.');
    const ledger = {
      schema: LEDGER_SCHEMA,
      updated_at: nowIso(now),
      records: records.slice(-maxRecords),
    };
    storage.setItem(storageKey, JSON.stringify(ledger));
    return ledger.records.length;
  }

  async function add(input = {}) {
    const recordType = text(input.record_type, 80);
    if (!TEMPORAL_RECORD_TYPES.includes(recordType)) throw new Error(`Unknown temporal record type: ${recordType || 'missing'}`);
    const title = text(input.title, 180);
    const description = text(input.description, 12000);
    if (!title && !description) throw new Error('Temporal record requires a title or description.');

    const observedAt = isoOrNull(input.observed_at) || nowIso(now);
    const occurredAt = isoOrNull(input.occurred_at) || observedAt;
    const epistemicStatus = TEMPORAL_EPISTEMIC_STATUS.includes(input.epistemic_status)
      ? input.epistemic_status
      : defaultEpistemicStatus(recordType);

    const record = {
      schema: RECORD_SCHEMA,
      record_id: recordId(),
      record_type: recordType,
      title: title || description.slice(0, 120),
      description,
      observed_at: observedAt,
      occurred_at: occurredAt,
      recorded_at: nowIso(now),
      timezone: text(input.timezone, 80) || timezone(),
      epistemic_status: epistemicStatus,
      confidence: normaliseConfidence(input.confidence),
      source_refs: uniqueStrings(input.source_refs, 16, 500),
      witness_refs: uniqueStrings(input.witness_refs, 16, 240),
      related_record_ids: uniqueStrings(input.related_record_ids, 24, 160),
      tags: uniqueStrings(input.tags, 20, 80),
      visibility: input.visibility === 'local-shared' ? 'local-shared' : 'local-private',
      context: compactContext(contextProvider?.() || {}),
      content_sha256: null,
    };
    record.content_sha256 = await sha256(stablePayload(record));
    const ledger = readLedger();
    ledger.records.push(record);
    writeLedger(ledger.records);
    return clone(record);
  }

  function list({ record_type = null, limit = 50, since = null } = {}) {
    const sinceIso = isoOrNull(since);
    const sinceTime = sinceIso ? new Date(sinceIso).getTime() : null;
    const boundedLimit = Math.max(1, Math.min(200, Number(limit) || 50));
    return readLedger().records
      .filter((record) => !record_type || record.record_type === record_type)
      .filter((record) => sinceTime == null || new Date(record.occurred_at || record.recorded_at).getTime() >= sinceTime)
      .slice(-boundedLimit)
      .map(clone);
  }

  function recentHeaders(limit = 12) {
    const boundedLimit = Math.max(1, Math.min(64, Number(limit) || 12));
    return list({ limit: boundedLimit }).map(header);
  }

  function summary() {
    const records = readLedger().records;
    const nowTime = now().getTime();
    const cutoff24h = nowTime - 24 * 60 * 60 * 1000;
    const cutoff7d = nowTime - 7 * 24 * 60 * 60 * 1000;
    const byType = Object.fromEntries(TEMPORAL_RECORD_TYPES.map((type) => [type, 0]));
    const tagCounts = new Map();
    let last24h = 0;
    let last7d = 0;
    let sourced = 0;
    let witnessed = 0;
    let linked = 0;

    for (const record of records) {
      if (record.record_type in byType) byType[record.record_type] += 1;
      const time = new Date(record.occurred_at || record.recorded_at).getTime();
      if (Number.isFinite(time) && time >= cutoff24h) last24h += 1;
      if (Number.isFinite(time) && time >= cutoff7d) last7d += 1;
      if (record.source_refs?.length) sourced += 1;
      if (record.witness_refs?.length) witnessed += 1;
      if (record.related_record_ids?.length) linked += 1;
      for (const tag of record.tags || []) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }

    const threads = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));
    const pulse = last24h === 0 ? 'quiet' : last24h <= 2 ? 'stirring' : last24h <= 6 ? 'braided' : 'dense';

    return Object.freeze({
      schema: 'arcsweep.temporal-witness-summary/v1',
      total_records: records.length,
      last_24h: last24h,
      last_7d: last7d,
      source_linked_records: sourced,
      witnessed_records: witnessed,
      related_records: linked,
      source_density: records.length ? sourced / records.length : 0,
      witness_density: records.length ? witnessed / records.length : 0,
      relation_density: records.length ? linked / records.length : 0,
      by_type: byType,
      threads,
      temporal_weather: pulse,
      latest: records.length ? header(records[records.length - 1]) : null,
    });
  }

  function status() {
    const ledger = readLedger();
    return Object.freeze({
      schema: 'arcsweep.temporal-witness-status/v1',
      available: Boolean(storage?.getItem && storage?.setItem),
      storage: 'local-only',
      storage_key: storageKey,
      record_count: ledger.records.length,
      max_records: maxRecords,
      full_text_on_os_event_bus: false,
    });
  }

  function clear() {
    storage?.removeItem?.(storageKey);
    return true;
  }

  return Object.freeze({ storageKey, add, list, recentHeaders, summary, status, clear });
}

export function registerTemporalWitnessService(registry, {
  bus = null,
  storage = null,
  contextProvider = () => ({}),
  now = () => new Date(),
  maxRecords = DEFAULT_MAX_RECORDS,
} = {}) {
  if (!registry?.registerService || !registry?.registerCapability) throw new Error('Temporal Witness requires the ArcSweep capability registry.');

  if (bus?.define && bus?.eventNames) {
    const known = new Set(bus.eventNames());
    if (!known.has('arcsweep:temporal-witness-recorded')) {
      bus.define('arcsweep:temporal-witness-recorded', (payload) => payload?.schema === EVENT_SCHEMA && Boolean(payload?.record_id));
    }
  }

  const store = createTemporalWitnessStore({ storage, contextProvider, now, maxRecords });

  registry.registerService({
    service_id: 'temporal-witness',
    label: 'Temporal Witness / Anchor Ledger',
    authority_boundary: {
      persistence: 'browser-local-only',
      human_authored_recording: true,
      autonomous_interpretation: false,
      canon_promotion: false,
      external_upload: false,
      full_text_on_event_bus: false,
    },
    consumes: [],
    emits: ['arcsweep:temporal-witness-recorded'],
  });

  registry.registerCapability({
    capability_id: 'witness.status',
    service_id: 'temporal-witness',
    description: 'Read Temporal Witness storage status and anchor count.',
    authority: 'read',
    execute: () => store.status(),
  });

  registry.registerCapability({
    capability_id: 'witness.summary',
    service_id: 'temporal-witness',
    description: 'Read aggregate Temporal Weather, anchor density, record-type counts, and active threads.',
    authority: 'read',
    execute: () => store.summary(),
  });

  registry.registerCapability({
    capability_id: 'witness.recent',
    service_id: 'temporal-witness',
    description: 'Read bounded Temporal Witness record headers without private descriptions.',
    authority: 'read',
    input_schema: { optional: ['limit'] },
    validate: (input) => input?.limit == null || (Number.isFinite(Number(input.limit)) && Number(input.limit) > 0),
    execute: (input = {}) => ({ schema: 'arcsweep.temporal-witness-recent/v1', records: store.recentHeaders(input.limit || 12) }),
  });

  registry.registerCapability({
    capability_id: 'witness.list-local',
    service_id: 'temporal-witness',
    description: 'Read full locally stored Temporal Witness records for the human Chronicle surface.',
    authority: 'read',
    input_schema: { optional: ['record_type', 'limit', 'since'] },
    validate: (input) => (!input?.record_type || TEMPORAL_RECORD_TYPES.includes(input.record_type)),
    execute: (input = {}) => ({ schema: 'arcsweep.temporal-witness-record-list/v1', records: store.list(input) }),
  });

  registry.registerCapability({
    capability_id: 'witness.record',
    service_id: 'temporal-witness',
    description: 'Create one explicit human-authored local Temporal Witness anchor.',
    authority: 'operate',
    requires_confirmation: true,
    input_schema: { required: ['record_type'], optional: ['title', 'description', 'observed_at', 'occurred_at', 'epistemic_status', 'confidence', 'source_refs', 'witness_refs', 'related_record_ids', 'tags', 'visibility'] },
    validate: (input) => TEMPORAL_RECORD_TYPES.includes(input?.record_type) && Boolean(text(input?.title, 180) || text(input?.description, 12000)),
    execute: async (input) => {
      const record = await store.add(input);
      bus?.publish?.('arcsweep:temporal-witness-recorded', {
        schema: EVENT_SCHEMA,
        record_id: record.record_id,
        record_type: record.record_type,
        observed_at: record.observed_at,
        occurred_at: record.occurred_at,
        recorded_at: record.recorded_at,
      }, { source: 'temporal-witness' });
      return record;
    },
  });

  return Object.freeze({
    service_id: 'temporal-witness',
    store,
    capabilities: ['witness.status', 'witness.summary', 'witness.recent', 'witness.list-local', 'witness.record'],
  });
}
