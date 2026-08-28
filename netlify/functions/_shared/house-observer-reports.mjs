import { authoriseHouseRequest } from './house-session.mjs';

export const HOUSE_OBSERVER_REPORT_INDEX_SCHEMA = 'hearthgate.observer-report-index/v1';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  },
});

function clean(value, max = 240) {
  const text = String(value || '').trim();
  return text ? text.slice(0, max) : null;
}

function parseLimit(url) {
  const value = Number(new URL(url).searchParams.get('limit')) || 100;
  return Math.max(1, Math.min(Math.trunc(value), 200));
}

function parseDate(value) {
  const text = clean(value, 80);
  if (!text) return null;
  const timestamp = Date.parse(text);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function requestFilters(url) {
  const params = new URL(url).searchParams;
  return {
    tag: clean(params.get('tag'), 120),
    event_type: clean(params.get('event_type'), 120),
    q: clean(params.get('q'), 240),
    from: parseDate(params.get('from')),
    to: parseDate(params.get('to')),
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

async function readObserverRows(fetchImpl, env) {
  const params = new URLSearchParams({
    select: '*',
    order: 'occurred_at.desc',
    limit: '200',
  });
  const response = await fetchImpl(`${env.get('SUPABASE_URL')}/rest/v1/deep_observer_events?${params}`, {
    headers: restHeaders(env),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`deep_observer_events read failed: ${response.status} ${await response.text()}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('deep_observer_events returned a non-array payload.');
  return rows;
}

function searchableText(row) {
  return [
    row?.event_key,
    row?.event_type,
    row?.source,
    row?.source_detail,
    row?.title,
    row?.summary,
    row?.body_md,
    ...(Array.isArray(row?.tags) ? row.tags : []),
    ...(Array.isArray(row?.entities) ? row.entities : []),
  ].filter(Boolean).join('\n').toLocaleLowerCase();
}

function matches(row, filters) {
  if (filters.tag) {
    const wanted = filters.tag.toLocaleLowerCase();
    const tags = Array.isArray(row?.tags) ? row.tags.map((tag) => String(tag).toLocaleLowerCase()) : [];
    if (!tags.includes(wanted)) return false;
  }
  if (filters.event_type && String(row?.event_type || '').toLocaleLowerCase() !== filters.event_type.toLocaleLowerCase()) return false;
  const occurred = Date.parse(row?.occurred_at || '');
  if (filters.from && (!Number.isFinite(occurred) || occurred < Date.parse(filters.from))) return false;
  if (filters.to && (!Number.isFinite(occurred) || occurred > Date.parse(filters.to))) return false;
  if (filters.q && !searchableText(row).includes(filters.q.toLocaleLowerCase())) return false;
  return true;
}

function normaliseReport(row) {
  return {
    id: row.id,
    event_key: row.event_key || null,
    event_type: row.event_type || 'observation',
    source: row.source || 'manual',
    source_detail: row.source_detail || null,
    title: row.title,
    summary: row.summary || null,
    body_md: row.body_md || null,
    occurred_at: row.occurred_at,
    logged_at: row.logged_at || null,
    timezone: row.timezone || null,
    location_context: row.location_context || {},
    entities: Array.isArray(row.entities) ? row.entities : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    state_vector: row.state_vector || {},
    confidence_mode: row.confidence_mode || 'unknown',
    visibility: row.visibility || 'private',
    rendering_hint: row.rendering_hint || {},
    links: row.links || [],
    raw_payload: row.raw_payload || {},
    created_by: row.created_by || null,
    updated_at: row.updated_at || null,
  };
}

export function createHouseObserverReportHandler({ env, fetchImpl = fetch, clock = () => new Date() } = {}) {
  return async function handle(request) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    if (request.method !== 'GET') return json(405, { error: 'GET required.' });
    if (!env.get('SUPABASE_URL') || !env.get('SUPABASE_SERVICE_ROLE_KEY')) return json(503, { error: 'Observer report ledger is not configured.' });

    try {
      const filters = requestFilters(request.url);
      const limit = parseLimit(request.url);
      const rows = await readObserverRows(fetchImpl, env);
      const matched = rows.filter((row) => matches(row, filters));
      const reports = matched.slice(0, limit).map(normaliseReport);
      return json(200, {
        schema: HOUSE_OBSERVER_REPORT_INDEX_SCHEMA,
        generated_at: clock().toISOString(),
        source_table: 'deep_observer_events',
        private: true,
        filters,
        limit,
        count: reports.length,
        total_matched: matched.length,
        reports,
      });
    } catch (error) {
      return json(error.status || 502, { error: error.message || 'Observer report read failed.' });
    }
  };
}
