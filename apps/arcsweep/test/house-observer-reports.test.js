import test from 'node:test';
import assert from 'node:assert/strict';
import { createHouseObserverReportHandler } from '../../../netlify/functions/_shared/house-observer-reports.mjs';

const runtime = (values) => ({ get: (name) => values[name] });
const env = runtime({
  ARCSWEEP_RUNTIME_TOKEN: 'secret',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'role',
});
const fixedClock = () => new Date('2026-08-28T16:30:00.000Z');
const authorised = (url) => new Request(url, { headers: { authorization: 'Bearer secret' } });

const rows = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    event_key: 'old-threshold-bell',
    event_type: 'auditory-anomaly',
    source: 'manual',
    source_detail: 'observer-report',
    title: 'Old threshold bell',
    summary: 'Three bright bells at a threshold.',
    body_md: 'Full witness body.',
    occurred_at: '2025-01-02T12:00:00.000Z',
    logged_at: '2025-01-02T12:05:00.000Z',
    timezone: 'America/New_York',
    tags: ['weird-shit', 'threshold'],
    entities: ['bell'],
    confidence_mode: 'witnessed',
    visibility: 'private',
    created_by: 'Rowan',
    updated_at: '2025-01-02T12:06:00.000Z',
    state_vector: { P: 0.5 },
    links: [{ type: 'note' }],
    raw_payload: { private: true },
    location_context: { label: 'St. Augustine' },
    rendering_hint: { glyph: 'bell' },
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    event_key: 'newer-threshold-bell',
    event_type: 'auditory-anomaly',
    source: 'manual',
    source_detail: 'observer-report',
    title: 'Newer threshold bell',
    summary: 'Another bell.',
    body_md: 'Second body.',
    occurred_at: '2026-08-28T15:00:00.000Z',
    logged_at: '2026-08-28T15:05:00.000Z',
    timezone: 'America/New_York',
    tags: ['weird-shit', 'threshold'],
    entities: ['bell'],
    confidence_mode: 'witnessed',
    visibility: 'private',
    created_by: 'Rowan',
    updated_at: '2026-08-28T15:06:00.000Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    event_key: 'pagination-sentinel',
    event_type: 'field-note',
    source: 'manual',
    title: 'Pagination sentinel',
    summary: 'Used only to prove another page exists.',
    occurred_at: '2024-05-01T10:00:00.000Z',
    logged_at: '2024-05-01T10:05:00.000Z',
    tags: ['field-note'],
    entities: [],
    confidence_mode: 'witnessed',
    visibility: 'private',
    updated_at: '2024-05-01T10:06:00.000Z',
  },
];

function jsonRows(value, inspect = () => {}) {
  return async (url) => {
    inspect(new URL(url));
    return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
  };
}

test('sealed Observer archive refuses unauthorised reads', async () => {
  const handler = createHouseObserverReportHandler({ env, fetchImpl: jsonRows([]), clock: fixedClock });
  const response = await handler(new Request('https://house.example/api/v1/house/observer-reports'));
  assert.equal(response.status, 401);
});

test('invalid chronology filters fail closed before database access', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return new Response('[]'); };
  const handler = createHouseObserverReportHandler({ env, fetchImpl, clock: fixedClock });

  const malformed = await handler(authorised('https://house.example/api/v1/house/observer-reports?from=not-a-date'));
  assert.equal(malformed.status, 400);

  const reversed = await handler(authorised('https://house.example/api/v1/house/observer-reports?from=2026-08-29&to=2026-08-28'));
  assert.equal(reversed.status, 400);
  assert.equal(calls, 0);
});

test('archive filters are pushed into PostgREST rather than applied to a newest-200 slice', async () => {
  let query;
  const handler = createHouseObserverReportHandler({
    env,
    clock: fixedClock,
    fetchImpl: jsonRows([rows[0]], (url) => { query = url.searchParams; }),
  });
  const response = await handler(authorised('https://house.example/api/v1/house/observer-reports?tag=weird-shit&event_type=auditory-anomaly&from=2025-01-01&to=2025-01-03&limit=2&as_of=2025-01-04'));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(query.get('tags'), 'cs.{weird-shit}');
  assert.equal(query.get('event_type'), 'eq.auditory-anomaly');
  assert.equal(query.getAll('occurred_at')[0], 'gte.2025-01-01T00:00:00.000Z');
  assert.equal(query.getAll('occurred_at')[1], 'lte.2025-01-03T00:00:00.000Z');
  assert.equal(query.get('logged_at'), 'lte.2025-01-04T00:00:00.000Z');
  assert.equal(query.get('limit'), '3');
  assert.equal(body.reports[0].event_key, 'old-threshold-bell');
  assert.equal(body.query_receipt.exact_filters.time_basis, 'occurred_at');
  assert.equal(body.query_receipt.chronology_cutoff, '2025-01-04T00:00:00.000Z');
});

test('free-text search is corpus-side and receipted exactly', async () => {
  let query;
  const handler = createHouseObserverReportHandler({
    env,
    clock: fixedClock,
    fetchImpl: jsonRows([rows[0]], (url) => { query = url.searchParams; }),
  });
  const response = await handler(authorised('https://house.example/api/v1/house/observer-reports?q=bright%20bells&as_of=2026-08-28T16:00:00Z'));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.match(query.get('or'), /summary\.ilike\.\*bright bells\*/);
  assert.equal(body.query_receipt.exact_filters.q, 'bright bells');
  assert.equal(body.query_receipt.exact_filters.as_of, '2026-08-28T16:00:00.000Z');
});

test('index projection withholds full and raw evidence by default', async () => {
  let select;
  const handler = createHouseObserverReportHandler({
    env,
    clock: fixedClock,
    fetchImpl: jsonRows([rows[0]], (url) => { select = url.searchParams.get('select'); }),
  });
  const response = await handler(authorised('https://house.example/api/v1/house/observer-reports'));
  const body = await response.json();
  const report = body.reports[0];

  assert.equal(response.status, 200);
  assert.ok(!select.includes('raw_payload'));
  assert.ok(!select.includes('body_md'));
  assert.equal('raw_payload' in report, false);
  assert.equal('body_md' in report, false);
  assert.equal('state_vector' in report, false);
});

test('detail retrieval expands selected evidence and keeps raw explicit', async () => {
  let firstSelect;
  const handler = createHouseObserverReportHandler({
    env,
    clock: fixedClock,
    fetchImpl: jsonRows([rows[0]], (url) => { firstSelect = url.searchParams.get('select'); }),
  });
  const id = rows[0].id;
  const response = await handler(authorised(`https://house.example/api/v1/house/observer-reports?id=${id}`));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(firstSelect.includes('body_md'));
  assert.ok(firstSelect.includes('state_vector'));
  assert.ok(!firstSelect.includes('raw_payload'));
  assert.equal(body.report.body_md, 'Full witness body.');
  assert.equal('raw_payload' in body.report, false);

  let rawSelect;
  const rawHandler = createHouseObserverReportHandler({
    env,
    clock: fixedClock,
    fetchImpl: jsonRows([rows[0]], (url) => { rawSelect = url.searchParams.get('select'); }),
  });
  const rawResponse = await rawHandler(authorised(`https://house.example/api/v1/house/observer-reports?id=${id}&include=raw`));
  const rawBody = await rawResponse.json();
  assert.ok(rawSelect.includes('raw_payload'));
  assert.deepEqual(rawBody.report.raw_payload, { private: true });
});

test('cursor pagination is stable on time plus id and preserves chronology cutoff', async () => {
  let firstQuery;
  const firstHandler = createHouseObserverReportHandler({
    env,
    clock: fixedClock,
    fetchImpl: jsonRows(rows, (url) => { firstQuery = url.searchParams; }),
  });
  const first = await firstHandler(authorised('https://house.example/api/v1/house/observer-reports?limit=2&as_of=2026-08-28T16:00:00Z'));
  const firstBody = await first.json();

  assert.equal(firstBody.count, 2);
  assert.equal(firstBody.has_more, true);
  assert.ok(firstBody.next_cursor);
  assert.equal(firstQuery.get('order'), 'occurred_at.desc,id.desc');

  let secondQuery;
  const secondHandler = createHouseObserverReportHandler({
    env,
    clock: fixedClock,
    fetchImpl: jsonRows([rows[2]], (url) => { secondQuery = url.searchParams; }),
  });
  const second = await secondHandler(authorised(`https://house.example/api/v1/house/observer-reports?limit=2&as_of=2026-08-28T16:00:00Z&cursor=${encodeURIComponent(firstBody.next_cursor)}`));
  assert.equal(second.status, 200);
  assert.match(secondQuery.get('or'), /occurred_at\.lt\.2026-08-28T15:00:00\.000Z/);
  assert.match(secondQuery.get('or'), /id\.lt\.22222222-2222-4222-8222-222222222222/);
  assert.equal(secondQuery.get('logged_at'), 'lte.2026-08-28T16:00:00.000Z');
});

test('logged_at time basis is explicit and future knowledge stays outside the query', async () => {
  let query;
  const handler = createHouseObserverReportHandler({
    env,
    clock: fixedClock,
    fetchImpl: jsonRows([], (url) => { query = url.searchParams; }),
  });
  const response = await handler(authorised('https://house.example/api/v1/house/observer-reports?time_basis=logged_at&from=2025-01-01&to=2025-02-01&as_of=2025-01-15'));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(query.get('order'), 'logged_at.desc,id.desc');
  assert.deepEqual(query.getAll('logged_at'), [
    'gte.2025-01-01T00:00:00.000Z',
    'lte.2025-02-01T00:00:00.000Z',
    'lte.2025-01-15T00:00:00.000Z',
  ]);
  assert.equal(body.query_receipt.exact_filters.time_basis, 'logged_at');
  assert.equal(body.query_receipt.chronology_cutoff, '2025-01-15T00:00:00.000Z');
});
