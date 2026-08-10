'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');

const { registerObserverRoutes } = require('../routes/observer-intake');
const { createDeepStoryStore } = require('../lib/deep-story-store');
const { createDeepTimeStore } = require('../lib/deep-time-store');
const { createDeepTheoryStore } = require('../lib/deep-theory-store');

function makeStores() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-intake-'));
  return {
    dataDir,
    storyStore: createDeepStoryStore({ dataDir }),
    timeStore: createDeepTimeStore({ dataDir }),
    theoryStore: createDeepTheoryStore({ dataDir }),
  };
}

function makeApp(stores) {
  const app = express();
  app.use(express.json());
  registerObserverRoutes(app, stores);
  return app;
}

function request(app, method, url, body) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const data = body ? JSON.stringify(body) : null;
      const opts = {
        hostname: '127.0.0.1',
        port,
        path: url,
        method,
        headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
      };
      const req = http.request(opts, (res) => {
        let raw = '';
        res.on('data', c => { raw += c; });
        res.on('end', () => {
          server.close();
          try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
          catch (e) { resolve({ status: res.statusCode, body: raw }); }
        });
      });
      req.on('error', err => { server.close(); reject(err); });
      if (data) req.write(data);
      req.end();
    });
  });
}

const VALID_ENVELOPE = {
  schema: 'hearthgate/observation-envelope/v1',
  envelope_id: 'test-env-001',
  received_at: '2026-08-09T10:00:00Z',
  source_id: 'observer:test-1',
  source_kind: 'pattern_analysis',
  evidence_class: 'measured',
  content_kind: 'analysis',
  temporal_extent: { utc_start: '2026-08-09T10:00:00Z' },
  canon_effect: 'none',
  consent_scope: 'open',
  confidence: 0.80,
  payload: { finding: 'test observation' },
};

test('intake rejects missing schema', async () => {
  const stores = makeStores();
  const app = makeApp(stores);
  const { status, body } = await request(app, 'POST', '/api/observer/intake', {
    ...VALID_ENVELOPE,
    schema: 'wrong/schema',
  });
  assert.equal(status, 400);
  assert.ok(body.validation_errors.some(e => /schema/.test(e)));
});

test('intake rejects destination_datasets field', async () => {
  const stores = makeStores();
  const app = makeApp(stores);
  const { status, body } = await request(app, 'POST', '/api/observer/intake', {
    ...VALID_ENVELOPE,
    destination_datasets: ['DEEPStory'],
  });
  assert.equal(status, 400);
  assert.ok(body.validation_errors.some(e => /destination_datasets/.test(e)));
});

test('intake rejects confidence out of range', async () => {
  const stores = makeStores();
  const app = makeApp(stores);
  const { status } = await request(app, 'POST', '/api/observer/intake', {
    ...VALID_ENVELOPE,
    confidence: 1.5,
  });
  assert.equal(status, 400);
});

test('intake routes theory observation and saves to DEEPTheory store', async () => {
  const stores = makeStores();
  const app = makeApp(stores);
  const { status, body } = await request(app, 'POST', '/api/observer/intake', VALID_ENVELOPE);
  assert.equal(status, 200);
  const receipt = body.receipt;
  assert.equal(receipt.result, 'ROUTED');
  assert.ok(receipt.destinations.includes('DEEPTheory'));
  const theoryRecord = receipt.store_records.find(r => r.dataset === 'DEEPTheory');
  assert.ok(theoryRecord, 'DEEPTheory store_record expected');
  assert.match(theoryRecord.record_id, /^th-/);
  // Verify it persisted in the store
  const saved = await stores.theoryStore.get(theoryRecord.record_id);
  assert.equal(saved.envelope_id, 'test-env-001');
});

test('intake routes temporal observation and saves to DEEPTime store', async () => {
  const stores = makeStores();
  const app = makeApp(stores);
  const { status, body } = await request(app, 'POST', '/api/observer/intake', {
    ...VALID_ENVELOPE,
    source_kind: 'temporal_reading',
    content_kind: 'event',
    canon_effect: 'none',
  });
  assert.equal(status, 200);
  const receipt = body.receipt;
  assert.ok(receipt.destinations.includes('DEEPTime'));
  const timeRecord = receipt.store_records.find(r => r.dataset === 'DEEPTime');
  assert.ok(timeRecord, 'DEEPTime store_record expected');
  assert.match(timeRecord.record_id, /^dt-/);
  const saved = await stores.timeStore.get(timeRecord.record_id);
  assert.equal(saved.time.utc, '2026-08-09T10:00:00Z');
});

test('intake routes story observation and saves to DEEPStory store', async () => {
  const stores = makeStores();
  const app = makeApp(stores);
  const { status, body } = await request(app, 'POST', '/api/observer/intake', {
    ...VALID_ENVELOPE,
    source_kind: 'canon_event',
    content_kind: 'event',
    canon_effect: 'additive',
  });
  assert.equal(status, 200);
  const receipt = body.receipt;
  assert.ok(receipt.destinations.includes('DEEPStory'));
  const storyRecord = receipt.store_records.find(r => r.dataset === 'DEEPStory');
  assert.ok(storyRecord, 'DEEPStory store_record expected');
  assert.ok(/^[0-9a-f-]{36}$/.test(storyRecord.record_id), 'DEEPStory id should be a UUID');
  const saved = await stores.storyStore.get(storyRecord.record_id);
  assert.equal(saved.dataset_kind, 'deep_story');
});

test('intake receipt carries envelope_id and routing metadata', async () => {
  const stores = makeStores();
  const app = makeApp(stores);
  const { body } = await request(app, 'POST', '/api/observer/intake', VALID_ENVELOPE);
  const receipt = body.receipt;
  assert.equal(receipt.envelope_id, 'test-env-001');
  assert.equal(receipt.schema, 'hearthgate/routing-receipt/v1');
  assert.ok(receipt.receipt_id, 'receipt_id required');
  assert.ok(receipt.emitted_at, 'emitted_at required');
  assert.equal(receipt.held, false);
  assert.equal(receipt.blocked, false);
});

test('intake blocks excluded consent scope', async () => {
  const stores = makeStores();
  const app = makeApp(stores);
  const { status, body } = await request(app, 'POST', '/api/observer/intake', {
    ...VALID_ENVELOPE,
    consent_scope: 'excluded',
  });
  assert.equal(status, 200);
  assert.equal(body.receipt.result, 'BLOCKED');
  assert.equal(body.receipt.blocked, true);
  assert.deepEqual(body.receipt.store_records, []);
});

test('intake holds review_required consent scope', async () => {
  const stores = makeStores();
  const app = makeApp(stores);
  const { status, body } = await request(app, 'POST', '/api/observer/intake', {
    ...VALID_ENVELOPE,
    consent_scope: 'review_required',
  });
  assert.equal(status, 200);
  assert.equal(body.receipt.result, 'HELD_FOR_REVIEW');
  assert.equal(body.receipt.held, true);
  assert.deepEqual(body.receipt.store_records, []);
});

test('store_records is empty array when result is not ROUTED', async () => {
  const stores = makeStores();
  const app = makeApp(stores);
  const { body } = await request(app, 'POST', '/api/observer/intake', {
    ...VALID_ENVELOPE,
    source_kind: 'news_digest',
  });
  assert.equal(body.receipt.result, 'DECOMPOSE_AND_REROUTE');
  assert.deepEqual(body.receipt.store_records, []);
});
