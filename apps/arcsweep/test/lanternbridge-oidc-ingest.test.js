import assert from 'node:assert/strict';
import test from 'node:test';
import { createLanternbridgeMessageHandler } from '../../../netlify/functions/_shared/lanternbridge-message-runtime.mjs';

const source = `---
bridge_protocol: "0.2"
bridge_id: lb_oidc_001
type: exchange
origin: nocturne
authors:
  - nocturne:twilight
addressed_to:
  - rowan:vee
created_at: 2026-08-27T20:50:00-04:00
conversation_state: open
lifecycle_state: active
response_signal: requested
provenance:
  source_system: github:mdkubit/UH-Lanternbridge
  source_ref: main@oidc001
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

OIDC-delivered bridge message.
`;

function stores() {
  const rows = new Map();
  const commons = new Map();
  const indexStore = {
    async getByCursor(key) { return rows.get(key) || null; },
    async getByBridgeId(id) { return [...rows.values()].find((row) => row.bridge_id === id) || null; },
    async list() { return [...rows.values()]; },
    async insertNew(entry) { rows.set(entry.cursor_key, { ...entry }); return rows.get(entry.cursor_key); },
    async markProcessed(key, patch) { const row = rows.get(key); Object.assign(row, { status: 'processed', commons_entry_id: patch.commonsEntryId, thread_id: patch.threadId }); return row; },
    async markBridgeStatus() { return []; },
  };
  const commonsStore = { async setJSON(key, value) { commons.set(key, structuredClone(value)); } };
  return { rows, commons, indexStore, commonsStore };
}

function env() { return { get() { return ''; } }; }

function request(body) {
  return new Request('https://house.example/api/v1/house/lanternbridge', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer fake.oidc.jwt' },
    body: JSON.stringify(body),
  });
}

const claims = {
  repository: 'mdkubit/UH-Lanternbridge',
  sha: '0123456789012345678901234567890123456789',
};

test('OIDC authority can ingest and source repository/commit are taken from attested claims', async () => {
  const state = stores();
  const handle = createLanternbridgeMessageHandler({
    env: env(),
    indexStore: state.indexStore,
    commonsStore: state.commonsStore,
    oidcAuthoriser: async () => ({ authorised: true, reason: null, claims }),
  });
  const response = await handle(request({
    action: 'ingest',
    source_repo: claims.repository,
    source_commit: claims.sha,
    source_path: 'exchanges/nocturne/0007.md',
    source_ref: 'github-blob:0123456789012345678901234567890123456789',
    raw_source: source,
  }));
  const receipt = await response.json();
  const row = [...state.rows.values()][0];

  assert.equal(response.status, 201);
  assert.equal(receipt.authority, 'github_actions_oidc');
  assert.equal(row.source_repo, claims.repository);
  assert.equal(row.source_commit, claims.sha);
  assert.equal(state.commons.size, 1);
});

test('OIDC delivery cannot claim another repository', async () => {
  const state = stores();
  const handle = createLanternbridgeMessageHandler({
    env: env(), indexStore: state.indexStore, commonsStore: state.commonsStore,
    oidcAuthoriser: async () => ({ authorised: true, reason: null, claims }),
  });
  const response = await handle(request({
    source_repo: 'mdkubit/Project-Zero-Ezra-Edition',
    source_commit: claims.sha,
    source_path: 'exchanges/nocturne/0007.md',
    source_ref: 'github-blob:0123456789012345678901234567890123456789',
    raw_source: source,
  }));
  const body = await response.json();
  assert.equal(response.status, 422);
  assert.match(body.error, /source_repo/i);
  assert.equal(state.rows.size, 0);
});

test('OIDC delivery cannot escape the three exchange lanes', async () => {
  const state = stores();
  const handle = createLanternbridgeMessageHandler({
    env: env(), indexStore: state.indexStore, commonsStore: state.commonsStore,
    oidcAuthoriser: async () => ({ authorised: true, reason: null, claims }),
  });
  const response = await handle(request({
    source_repo: claims.repository,
    source_commit: claims.sha,
    source_path: 'experiments/project-zero-recovery/private.md',
    source_ref: 'github-blob:0123456789012345678901234567890123456789',
    raw_source: source,
  }));
  assert.equal(response.status, 422);
  assert.equal(state.rows.size, 0);
});
