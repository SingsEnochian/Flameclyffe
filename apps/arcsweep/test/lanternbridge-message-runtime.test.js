import assert from 'node:assert/strict';
import test from 'node:test';
import { createLanternbridgeMessageHandler } from '../../../netlify/functions/_shared/lanternbridge-message-runtime.mjs';

function bridgeSource({
  bridgeId,
  sourceRef,
  origin = 'nocturne',
  author = 'nocturne:twilight',
  respondsTo = null,
  supersedes = null,
  body = 'Bridge message.',
}) {
  return `---
bridge_protocol: "0.2"
bridge_id: ${bridgeId}
type: exchange
origin: ${origin}
authors:
  - ${author}
addressed_to:
  - rowan:vee
created_at: 2026-08-27T19:15:00-04:00
conversation_state: open
lifecycle_state: active
response_signal: requested
provenance:
  source_system: github:mdkubit/UH-Lanternbridge
  source_ref: ${sourceRef}
usage:
  memory_ingest: deny
  transform: ask
  republish: deny
  model_training: deny
relations:
  responds_to: ${respondsTo ?? 'null'}
  supersedes: ${supersedes ?? 'null'}
  adopts: []
  related: []
---

${body}
`;
}

function harness() {
  const rows = new Map();
  const commons = new Map();
  const env = { get(key) { return key === 'LANTERNBRIDGE_INGEST_KEY' ? 'test-ingest-key' : ''; } };
  const indexStore = {
    async getByCursor(key) { return rows.get(key) || null; },
    async getByBridgeId(bridgeId) { return [...rows.values()].filter((row) => row.bridge_id === bridgeId).at(-1) || null; },
    async list() { return [...rows.values()]; },
    async insertNew(entry) { if (!rows.has(entry.cursor_key)) rows.set(entry.cursor_key, { ...entry }); return rows.get(entry.cursor_key); },
    async markProcessed(key, { commonsEntryId, threadId }) {
      const row = rows.get(key); Object.assign(row, { status: 'processed', commons_entry_id: commonsEntryId, thread_id: threadId, processed_at: new Date().toISOString() }); return row;
    },
    async markBridgeStatus(bridgeId, status) {
      const changed = [];
      for (const row of rows.values()) if (row.bridge_id === bridgeId) { row.status = status; if (status === 'reply_emitted') row.reply_emitted_at = new Date().toISOString(); changed.push(row); }
      return changed;
    },
  };
  const commonsStore = { async setJSON(key, payload) { commons.set(key, structuredClone(payload)); } };
  const handle = createLanternbridgeMessageHandler({ env, indexStore, commonsStore });
  const ingest = async (rawSource) => handle(new Request('https://house.example/api/v1/house/lanternbridge', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-lanternbridge-ingest-key': 'test-ingest-key' },
    body: JSON.stringify({ action: 'ingest', source_repo: 'mdkubit/UH-Lanternbridge', source_path: 'exchanges/nocturne/message.md', raw_source: rawSource }),
  }));
  return { rows, commons, handle, ingest };
}

test('same bridge_id + source_ref is idempotent across repeated ingest', async () => {
  const h = harness();
  const source = bridgeSource({ bridgeId: 'lb_duplicate', sourceRef: 'main@abc123' });
  const first = await h.ingest(source);
  const firstBody = await first.json();
  const second = await h.ingest(source);
  const secondBody = await second.json();

  assert.equal(first.status, 201);
  assert.equal(firstBody.delivery, 'processed');
  assert.equal(firstBody.resumed, false);
  assert.equal(second.status, 200);
  assert.equal(secondBody.duplicate, true);
  assert.equal(secondBody.resumed, false);
  assert.equal(secondBody.delivery, 'processed');
  assert.equal(h.rows.size, 1);
  assert.equal(h.commons.size, 1);
});

test('status=new cursor resumes deterministically and finishes as processed', async () => {
  const h = harness();
  const source = bridgeSource({ bridgeId: 'lb_resume', sourceRef: 'main@resume001' });
  h.rows.set('lb_resume::main%40resume001', {
    cursor_key: 'lb_resume::main%40resume001',
    bridge_id: 'lb_resume',
    source_ref: 'main@resume001',
    source_system: 'github:mdkubit/UH-Lanternbridge',
    source_repo: 'mdkubit/UH-Lanternbridge',
    source_path: 'exchanges/nocturne/message.md',
    source_commit: null,
    protocol: '0.2',
    origin: 'nocturne',
    authors: ['nocturne:twilight'],
    addressed_to: ['rowan:vee'],
    responds_to: null,
    supersedes: null,
    thread_id: 'lanternbridge:lb_resume',
    commons_entry_id: 'lb-existing-deterministic-id',
    status: 'new',
    source_created_at: '2026-08-27T19:15:00-04:00',
    payload: {},
  });

  const response = await h.ingest(source);
  const receipt = await response.json();
  assert.equal(response.status, 200);
  assert.equal(receipt.delivery, 'processed');
  assert.equal(receipt.duplicate, false);
  assert.equal(receipt.resumed, true);
  assert.equal(receipt.commons_entry_id, 'lb-existing-deterministic-id');
  assert.equal(h.rows.get('lb_resume::main%40resume001').status, 'processed');
  assert.equal(h.commons.size, 1);
});

test('reply_to resolves through bridge identity and inherits the parent thread', async () => {
  const h = harness();
  await h.ingest(bridgeSource({ bridgeId: 'lb_parent', sourceRef: 'main@parent' }));
  const response = await h.ingest(bridgeSource({
    bridgeId: 'lb_reply',
    sourceRef: 'main@reply',
    origin: 'rowan',
    author: 'rowan:vee',
    respondsTo: 'lb_parent',
    body: 'Vee replies.',
  }));
  const receipt = await response.json();
  const parent = [...h.rows.values()].find((row) => row.bridge_id === 'lb_parent');
  const child = [...h.rows.values()].find((row) => row.bridge_id === 'lb_reply');
  const childCommons = [...h.commons.values()].find((entry) => entry.external?.bridge_id === 'lb_reply');

  assert.equal(receipt.thread_id, 'lanternbridge:lb_parent');
  assert.equal(child.thread_id, parent.thread_id);
  assert.equal(childCommons.reply_to, parent.commons_entry_id);
  assert.equal(parent.status, 'reply_emitted');
});

test('supersedes marks the older bridge message without deleting history', async () => {
  const h = harness();
  await h.ingest(bridgeSource({ bridgeId: 'lb_old', sourceRef: 'main@old' }));
  await h.ingest(bridgeSource({ bridgeId: 'lb_new', sourceRef: 'main@new', supersedes: 'lb_old' }));

  const old = [...h.rows.values()].find((row) => row.bridge_id === 'lb_old');
  const replacement = [...h.rows.values()].find((row) => row.bridge_id === 'lb_new');
  assert.equal(old.status, 'superseded');
  assert.equal(replacement.status, 'processed');
  assert.equal(h.commons.size, 2);
});

test('ingest key cannot read the private House index surface', async () => {
  const h = harness();
  const response = await h.handle(new Request('https://house.example/api/v1/house/lanternbridge', {
    headers: { 'x-lanternbridge-ingest-key': 'test-ingest-key' },
  }));
  assert.equal(response.status, 403);
});
