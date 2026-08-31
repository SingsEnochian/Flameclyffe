import { authoriseHouseRequest } from './house-session.mjs';

export const HOUSE_OBSERVER_REPORT_INDEX_SCHEMA = 'hearthgate.observer-report-index/v1';
export const HOUSE_OBSERVER_REPORT_DETAIL_SCHEMA = 'hearthgate.observer-report-detail/v1';
export const HOUSE_OBSERVER_QUERY_RECEIPT_SCHEMA = 'hearthgate.observer-query-receipt/v1';

const INDEX_FIELDS = Object.freeze([
  'id',
  'event_key',
  'event_type',
  'source',
  'source_detail',
  'title',
  'summary',
  'occurred_at',
  'logged_at',
  'timezone',
  'tags',
  'entities',
  'confidence_mode',
  'visibility',
  'created_by',
  'updated_at',
]);

const DETAIL_FIELD_MAP = Object.freeze({
  body: 'body_md',
  state: 'state_vector',
  links: 'links',
  raw: 'raw_payload',
  location: 'location_context',
  rendering: 'rendering_hint',
});

const DEFAULT_DETAIL_INCLUDE = Object.freeze(['body', 'state', 'links', 'location', 'rendering']);
const SEARCH_FIELDS = Object.freeze(['event_key', 'event_type', 'source', 'source_detail', 'title', 'summary', 'body_md']);
const TIME_BASES = new Set(['occurred_at', 'logged_at']);
const SIMPLE_TOKEN = /^[A-Za-z0-9._:/-]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  },
});

class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ObserverReportRequestError';
    this.status = status;
  }
}

function clean(value, max = 240) {
  const text = String(value || '').trim();
  return text ? text.slice(0, max) : null;
}

function parseLimit(params) {
  const raw = params.get('limit');
  if (raw == null || raw === '') return 50;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) throw new RequestError('limit must be a positive number.');
  return Math.max(1, Math.min(Math.trunc(value), 200));
}

function parseDateParam(params, name) {
  const text = clean(params.get(name), 80);
  if (!text) return null;
  const timestamp = Date.parse(text);
  if (Number.isNaN(timestamp)) throw new RequestError(`${name} must be a valid date or ISO timestamp.`);
  return new Date(timestamp).toISOString();
}

function parseTimeBasis(params) {
  const value = clean(params.get('time_basis'), 40) || 'occurred_at';
  if (!TIME_BASES.has(value)) throw new RequestError('time_basis must be occurred_at or logged_at.');
  return value;
}

function parseToken(params, name) {
  const value = clean(params.get(name), 120);
  if (!value) return null;
  if (!SIMPLE_TOKEN.test(value)) throw new RequestError(`${name} contains unsupported characters.`);
  return value;
}

function parseQuery(params) {
  const value = clean(params.get('q'), 240);
  if (!value) return null;
  if (/[(),*%]/.test(value)) throw new RequestError('q cannot contain parentheses, commas, or wildcard characters.');
  return value;
}

function parseId(params) {
  const value = clean(params.get('id'), 80);
  if (!value) return null;
  if (!UUID.test(value)) throw new RequestError('id must be a UUID.');
  return value;
}

function parseInclude(params, detailMode) {
  const raw = clean(params.get('include'), 240);
  const requested = raw ? raw.split(',').map((value) => value.trim()).filter(Boolean) : (detailMode ? [...DEFAULT_DETAIL_INCLUDE] : []);
  const unique = [...new Set(requested)];
  for (const value of unique) if (!DETAIL_FIELD_MAP[value]) throw new RequestError(`Unsupported include field: ${value}.`);
  return unique;
}

function encodeCursor(value) {
  const text = JSON.stringify(value);
  const encoded = typeof globalThis.btoa === 'function'
    ? globalThis.btoa(text)
    : globalThis.Buffer.from(text, 'utf8').toString('base64');
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeCursor(value, timeBasis) {
  const cursor = clean(value, 1000);
  if (!cursor) return null;
  try {
    const normal = cursor.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normal + '='.repeat((4 - (normal.length % 4)) % 4);
    const text = typeof globalThis.atob === 'function'
      ? globalThis.atob(padded)
      : globalThis.Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(text);
    if (parsed?.v !== 1 || parsed?.basis !== timeBasis || !parseDateValue(parsed?.time) || !UUID.test(String(parsed?.id || ''))) throw new Error('invalid');
    return { time: new Date(parsed.time).toISOString(), id: parsed.id };
  } catch {
    throw new RequestError('cursor is invalid for this time_basis.');
  }
}

function parseDateValue(value) {
  const timestamp = Date.parse(String(value || ''));
  return Number.isNaN(timestamp) ? null : timestamp;
}

function requestScope(url, clock) {
  const params = new URL(url).searchParams;
  const id = parseId(params);
  const eventType = parseToken(params, 'event_type');
  const tag = parseToken(params, 'tag');
  const q = parseQuery(params);
  const timeBasis = parseTimeBasis(params);
  const from = parseDateParam(params, 'from');
  const to = parseDateParam(params, 'to');
  const asOf = parseDateParam(params, 'as_of') || clock().toISOString();
  const limit = parseLimit(params);
  const include = parseInclude(params, Boolean(id));
  const cursor = decodeCursor(params.get('cursor'), timeBasis);

  if (from && to && Date.parse(from) > Date.parse(to)) throw new RequestError('from must be earlier than or equal to to.');
  if (id && (eventType || tag || q || from || to || cursor)) throw new RequestError('id detail retrieval cannot be combined with archive filters or cursor.');

  return {
    id,
    event_type: eventType,
    tag,
    q,
    time_basis: timeBasis,
    from,
    to,
    as_of: asOf,
    limit: id ? 1 : limit,
    include,
    cursor,
  };
}

function restHeaders(env) {
  const key = env.get('SUPABASE_SERVICE_ROLE_KEY');
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    accept: 'application/json',
  };
}

function selectedColumns(scope) {
  const fields = [...INDEX_FIELDS];
  for (const include of scope.include) fields.push(DETAIL_FIELD_MAP[include]);
  return [...new Set(fields)];
}

function cursorCondition(scope) {
  if (!scope.cursor) return null;
  const basis = scope.time_basis;
  return `${basis}.lt.${scope.cursor.time},and(${basis}.eq.${scope.cursor.time},id.lt.${scope.cursor.id})`;
}

function queryCondition(scope) {
  if (!scope.q) return null;
  return SEARCH_FIELDS.map((field) => `${field}.ilike.*${scope.q}*`).join(',');
}

function observerRestUrl(env, scope) {
  const params = new URLSearchParams();
  params.set('select', selectedColumns(scope).join(','));
  params.set('order', `${scope.time_basis}.desc,id.desc`);
  params.set('limit', String(scope.id ? 1 : scope.limit + 1));

  if (scope.id) params.append('id', `eq.${scope.id}`);
  if (scope.event_type) params.append('event_type', `eq.${scope.event_type}`);
  if (scope.tag) params.append('tags', `cs.{${scope.tag}}`);
  if (scope.from) params.append(scope.time_basis, `gte.${scope.from}`);
  if (scope.to) params.append(scope.time_basis, `lte.${scope.to}`);
  params.append('logged_at', `lte.${scope.as_of}`);

  const q = queryCondition(scope);
  const cursor = cursorCondition(scope);
  if (q && cursor) params.set('and', `(or(${q}),or(${cursor}))`);
  else if (q) params.set('or', `(${q})`);
  else if (cursor) params.set('or', `(${cursor})`);

  return `${env.get('SUPABASE_URL')}/rest/v1/deep_observer_events?${params}`;
}

async function readObserverRows(fetchImpl, env, scope) {
  const response = await fetchImpl(observerRestUrl(env, scope), {
    headers: restHeaders(env),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`deep_observer_events read failed: ${response.status} ${await response.text()}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('deep_observer_events returned a non-array payload.');
  return rows;
}

function normaliseReport(row, include = []) {
  const report = {
    id: row.id,
    event_key: row.event_key || null,
    event_type: row.event_type || 'observation',
    source: row.source || 'manual',
    source_detail: row.source_detail || null,
    title: row.title,
    summary: row.summary || null,
    occurred_at: row.occurred_at,
    logged_at: row.logged_at || null,
    timezone: row.timezone || null,
    entities: Array.isArray(row.entities) ? row.entities : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    confidence_mode: row.confidence_mode || 'unknown',
    visibility: row.visibility || 'private',
    created_by: row.created_by || null,
    updated_at: row.updated_at || null,
  };
  if (include.includes('body')) report.body_md = row.body_md || null;
  if (include.includes('state')) report.state_vector = row.state_vector || {};
  if (include.includes('links')) report.links = row.links || [];
  if (include.includes('raw')) report.raw_payload = row.raw_payload || {};
  if (include.includes('location')) report.location_context = row.location_context || {};
  if (include.includes('rendering')) report.rendering_hint = row.rendering_hint || {};
  return report;
}

function nextCursor(rows, scope) {
  if (rows.length <= scope.limit) return null;
  const row = rows[scope.limit - 1];
  const time = row?.[scope.time_basis];
  if (!time || !row?.id) return null;
  return encodeCursor({ v: 1, basis: scope.time_basis, time, id: row.id });
}

function queryReceipt({ scope, requestedAt, executedAt, rows, reports, next }) {
  return {
    schema: HOUSE_OBSERVER_QUERY_RECEIPT_SCHEMA,
    query_id: `observer-query-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
    requested_at: requestedAt,
    executed_at: executedAt,
    source_table: 'deep_observer_events',
    source_schema: 'public',
    retrieval_mode: scope.id ? 'detail' : 'index',
    exact_filters: {
      id: scope.id,
      event_type: scope.event_type,
      tag: scope.tag,
      q: scope.q,
      from: scope.from,
      to: scope.to,
      time_basis: scope.time_basis,
      as_of: scope.as_of,
      include: scope.include,
    },
    chronology_cutoff: scope.as_of,
    result_refs: reports.map((report) => ({
      id: report.id,
      event_key: report.event_key,
      logged_at: report.logged_at,
      updated_at: report.updated_at,
    })),
    result_count: reports.length,
    page: {
      requested_limit: scope.limit,
      input_cursor: scope.cursor ? { time: scope.cursor.time, id: scope.cursor.id } : null,
      has_more: rows.length > scope.limit,
      next_cursor: next,
    },
  };
}

export function createHouseObserverReportHandler({ env, fetchImpl = fetch, clock = () => new Date() } = {}) {
  return async function handle(request) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    if (request.method !== 'GET') return json(405, { error: 'GET required.' });
    if (!env.get('SUPABASE_URL') || !env.get('SUPABASE_SERVICE_ROLE_KEY')) return json(503, { error: 'Observer report ledger is not configured.' });

    const requestedAt = clock().toISOString();
    try {
      const scope = requestScope(request.url, clock);
      const rows = await readObserverRows(fetchImpl, env, scope);
      const visibleRows = scope.id ? rows.slice(0, 1) : rows.slice(0, scope.limit);
      const reports = visibleRows.map((row) => normaliseReport(row, scope.include));
      const executedAt = clock().toISOString();
      const next = scope.id ? null : nextCursor(rows, scope);
      const receipt = queryReceipt({ scope, requestedAt, executedAt, rows, reports, next });

      if (scope.id) {
        if (!reports[0]) return json(404, { error: 'Observer report not found.', query_receipt: receipt });
        return json(200, {
          schema: HOUSE_OBSERVER_REPORT_DETAIL_SCHEMA,
          generated_at: executedAt,
          source_table: 'deep_observer_events',
          private: true,
          report: reports[0],
          query_receipt: receipt,
        });
      }

      return json(200, {
        schema: HOUSE_OBSERVER_REPORT_INDEX_SCHEMA,
        generated_at: executedAt,
        source_table: 'deep_observer_events',
        private: true,
        filters: receipt.exact_filters,
        count: reports.length,
        has_more: rows.length > scope.limit,
        next_cursor: next,
        reports,
        query_receipt: receipt,
      });
    } catch (error) {
      return json(error.status || 502, { error: error.message || 'Observer report read failed.' });
    }
  };
}
