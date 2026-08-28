import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LANTERNBRIDGE_MAILBOX_SEEN_KEY,
  syncLanternbridgeMailbox,
} from '../src/lanternbridge-mailbox-live.js';

const source = `---
bridge_protocol: "0.2"
bridge_id: lb_live_001
type: exchange
origin: nocturne
authors:
  - nocturne:twilight
addressed_to:
  - rowan:vee
created_at: 2026-08-27T20:00:00-04:00
conversation_state: open
lifecycle_state: active
response_signal: requested
provenance:
  source_system: github:mdkubit/UH-Lanternbridge
  source_ref: main@live001
usage:
  memory_ingest: deny
  transform: ask
  republish: deny
  model_training: deny
relations:
  responds_to: null
  supersedes: null
  adopts: []
  related: []
---

Live mailbox test.
`;

function storageHarness() {
  const map = new Map();
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
  };
}

test('live mailbox persists blob observations locally while server cursor owns semantic idempotency', async () => {
  const storage = storageHarness();
  let sourceReads = 0;
  let ingestPosts = 0;
  const item = {
    type: 'file', name: '0007-twilight.md', path: 'exchanges/nocturne/0007-twilight.md', sha: 'blob-001', download_url: 'https://raw.example/0007.md',
  };
  const fetchImpl = async (url, init = {}) => {
    const value = String(url);
    if (value.includes('/contents/exchanges/nocturne')) return new Response(JSON.stringify([item]), { status: 200 });
    if (value.includes('/contents/exchanges/rowan') || value.includes('/contents/exchanges/shared')) return new Response('[]', { status: 200 });
    if (value === item.download_url) { sourceReads += 1; return new Response(source, { status: 200 }); }
    if (value === '/api/v1/house/lanternbridge') {
      ingestPosts += 1;
      assert.equal(init.method, 'POST');
      assert.equal(init.headers.authorization, 'Bearer test-house-token');
      const body = JSON.parse(init.body);
      assert.equal(body.source_path, item.path);
      assert.equal(body.source_ref, 'github-blob:blob-001');
      return new Response(JSON.stringify({ delivery: 'processed', duplicate: false, bridge_id: 'lb_live_001' }), { status: 201 });
    }
    throw new Error(`Unexpected fetch ${value}`);
  };

  const first = await syncLanternbridgeMailbox({ fetchImpl, storage, sessionProvider: async () => 'test-house-token' });
  const second = await syncLanternbridgeMailbox({ fetchImpl, storage, sessionProvider: async () => 'test-house-token' });

  assert.equal(first.ingested, 1);
  assert.equal(second.ingested, 0);
  assert.equal(sourceReads, 1);
  assert.equal(ingestPosts, 1);
  assert.equal(JSON.parse(storage.getItem(LANTERNBRIDGE_MAILBOX_SEEN_KEY))[item.path], item.sha);
});

test('mailbox does no GitHub work while House Runtime is offline', async () => {
  let calls = 0;
  const result = await syncLanternbridgeMailbox({
    fetchImpl: async () => { calls += 1; throw new Error('should not fetch'); },
    storage: storageHarness(),
    sessionProvider: async () => '',
  });
  assert.equal(result.state, 'house-offline');
  assert.equal(calls, 0);
});
