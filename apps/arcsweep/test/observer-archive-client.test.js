import test from 'node:test';
import assert from 'node:assert/strict';
import {
  observerArchiveQueryString,
  readObserverArchive,
  readObserverArchiveDetail,
  readObserverArchiveRaw,
} from '../src/observer-archive-client.js';
import { HOUSE_COOKIE_SESSION } from '../src/house-runtime.js';

test('Observer archive query builder preserves explicit retrieval scope', () => {
  const query = new URLSearchParams(observerArchiveQueryString({
    q: 'bright bells',
    tag: 'weird-shit',
    event_type: 'auditory-anomaly',
    time_basis: 'occurred_at',
    from: '2026-08-01T00:00:00.000Z',
    to: '2026-08-28T00:00:00.000Z',
    as_of: '2026-08-28T16:00:00.000Z',
    cursor: 'opaque-cursor',
    limit: 25,
  }));
  assert.equal(query.get('q'), 'bright bells');
  assert.equal(query.get('tag'), 'weird-shit');
  assert.equal(query.get('event_type'), 'auditory-anomaly');
  assert.equal(query.get('time_basis'), 'occurred_at');
  assert.equal(query.get('from'), '2026-08-01T00:00:00.000Z');
  assert.equal(query.get('to'), '2026-08-28T00:00:00.000Z');
  assert.equal(query.get('as_of'), '2026-08-28T16:00:00.000Z');
  assert.equal(query.get('cursor'), 'opaque-cursor');
  assert.equal(query.get('limit'), '25');
});

test('Observer archive client uses House bearer session without exposing credentials in query', async () => {
  let seen;
  const fetchImpl = async (url, options) => {
    seen = { url, options };
    return new Response(JSON.stringify({ schema: 'hearthgate.observer-report-index/v1', reports: [] }), { status: 200 });
  };
  const data = await readObserverArchive({ tag: 'threshold' }, { token: 'secret', fetchImpl });
  assert.equal(data.schema, 'hearthgate.observer-report-index/v1');
  assert.equal(seen.options.headers.authorization, 'Bearer secret');
  assert.equal(seen.options.credentials, 'same-origin');
  assert.match(seen.url, /tag=threshold/);
  assert.doesNotMatch(seen.url, /secret/);
});

test('cookie-backed House session sends no bearer header', async () => {
  let headers;
  const fetchImpl = async (_url, options) => {
    headers = options.headers;
    return new Response(JSON.stringify({ reports: [] }), { status: 200 });
  };
  await readObserverArchive({}, { token: HOUSE_COOKIE_SESSION, fetchImpl });
  assert.equal(headers.authorization, undefined);
});

test('selected evidence detail expands normal evidence but not raw payload by default', async () => {
  let query;
  const fetchImpl = async (url) => {
    query = new URL(url, 'https://house.example').searchParams;
    return new Response(JSON.stringify({ report: { id: 'event-1' } }), { status: 200 });
  };
  await readObserverArchiveDetail('11111111-1111-4111-8111-111111111111', { as_of: '2026-08-28T16:00:00.000Z' }, { token: 'secret', fetchImpl });
  assert.equal(query.get('include'), 'body,state,links,location,rendering');
  assert.equal(query.get('as_of'), '2026-08-28T16:00:00.000Z');
  assert.equal(query.get('include').includes('raw'), false);
});

test('raw payload requires the dedicated explicit retrieval call', async () => {
  let query;
  const fetchImpl = async (url) => {
    query = new URL(url, 'https://house.example').searchParams;
    return new Response(JSON.stringify({ report: { raw_payload: {} } }), { status: 200 });
  };
  await readObserverArchiveRaw('11111111-1111-4111-8111-111111111111', {}, { token: 'secret', fetchImpl });
  assert.equal(query.get('include'), 'raw');
});
