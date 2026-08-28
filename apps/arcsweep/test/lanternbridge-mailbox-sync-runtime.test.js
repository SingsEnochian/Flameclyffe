import assert from 'node:assert/strict';
import test from 'node:test';
import { createLanternbridgeMailboxSyncHandler } from '../../../netlify/functions/_shared/lanternbridge-mailbox-sync-runtime.mjs';

const source = `---
bridge_protocol: "0.2"
bridge_id: lb_private_sync_001
type: exchange
origin: nocturne
authors:
  - nocturne:twilight
addressed_to:
  - rowan:vee
created_at: 2026-08-27T20:30:00-04:00
conversation_state: open
lifecycle_state: active
response_signal: requested
provenance:
  source_system: github:mdkubit/UH-Lanternbridge
  source_ref: main@private001
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

Private mailbox sync test.
`;

function stores() {
  const rows = new Map();
  const commons = new Map();
  return {
    rows,
    commons,
    indexStore: {
      async getByCursor(key) { return rows.get(key) || null; },
      async getByBridgeId(bridgeId) { return [...rows.values()].find((row) => row.bridge_id === bridgeId) || null; },
      async list() { return [...rows.values()]; },
      async insertNew(entry) { if (!rows.has(entry.cursor_key)) rows.set(entry.cursor_key, { ...entry }); return rows.get(entry.cursor_key); },
      async markProcessed(key, { commonsEntryId, threadId }) { const row = rows.get(key); Object.assign(row, { status: 'processed', commons_entry_id: commonsEntryId, thread_id: threadId }); return row; },
      async markBridgeStatus(bridgeId, status) { const changed = []; for (const row of rows.values()) if (row.bridge_id === bridgeId) { row.status = status; changed.push(row); } return changed; },
    },
    commonsStore: { async setJSON(key, payload) { commons.set(key, structuredClone(payload)); } },
  };
}

function envWith(values) { return { get(key) { return values[key] || ''; } }; }

test('server-side sync reads private GitHub with server credential and ingests into durable House storage', async () => {
  const state = stores();
  const env = envWith({ ARCSWEEP_RUNTIME_TOKEN: 'house-token', LANTERNBRIDGE_GITHUB_TOKEN: 'private-github-token' });
  const item = { type: 'file', name: '0007.md', path: 'exchanges/nocturne/0007.md', sha: 'blob007', url: 'https://api.github.com/file/0007' };
  let githubCalls = 0;
  const fetchImpl = async (url, init = {}) => {
    githubCalls += 1;
    assert.equal(init.headers.authorization, 'Bearer private-github-token');
    const value = String(url);
    if (value.endsWith('/commits/main')) return new Response(JSON.stringify({ sha: 'commit-main-007' }), { status: 200 });
    if (value.includes('/contents/exchanges/nocturne')) return new Response(JSON.stringify([item]), { status: 200 });
    if (value.includes('/contents/exchanges/rowan') || value.includes('/contents/exchanges/shared')) return new Response('[]', { status: 200 });
    if (value === item.url) return new Response(JSON.stringify({ encoding: 'base64', content: Buffer.from(source).toString('base64') }), { status: 200 });
    throw new Error(`Unexpected GitHub URL: ${value}`);
  };

  const handle = createLanternbridgeMailboxSyncHandler({ env, indexStore: state.indexStore, commonsStore: state.commonsStore, fetchImpl });
  const response = await handle(new Request('https://house.example/api/v1/house/lanternbridge/sync', {
    method: 'POST', headers: { authorization: 'Bearer house-token' }, body: '{}',
  }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.checked, 1);
  assert.equal(body.processed, 1);
  assert.equal(body.duplicates, 0);
  assert.equal(body.source_commit, 'commit-main-007');
  assert.equal(state.rows.size, 1);
  assert.equal(state.commons.size, 1);
  assert.equal(githubCalls, 5);
});

test('missing private GitHub credential fails closed before any repository request', async () => {
  const state = stores();
  const env = envWith({ ARCSWEEP_RUNTIME_TOKEN: 'house-token' });
  let calls = 0;
  const handle = createLanternbridgeMailboxSyncHandler({
    env, indexStore: state.indexStore, commonsStore: state.commonsStore,
    fetchImpl: async () => { calls += 1; throw new Error('should not call GitHub'); },
  });
  const response = await handle(new Request('https://house.example/api/v1/house/lanternbridge/sync', {
    method: 'POST', headers: { authorization: 'Bearer house-token' }, body: '{}',
  }));
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.state, 'provider-unconfigured');
  assert.deepEqual(body.missing, ['LANTERNBRIDGE_GITHUB_TOKEN']);
  assert.equal(calls, 0);
});
