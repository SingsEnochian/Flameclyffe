'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  RECEIPT_SCHEMA,
  sanitizeRuntimeReceipt,
  assertNoSecretFields,
  persistRuntimeReceipt,
  listRuntimeReceipts,
} = require('../bifrost/receipt-store');

function withTempData(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bifrost-receipts-'));
  const env = { HEARTHGATE_DATA_DIR: root };
  return Promise.resolve(fn({ root, env })).finally(() => fs.rmSync(root, { recursive: true, force: true }));
}

test('receipt sanitizer keeps provenance and drops unapproved fields', () => {
  const safe = sanitizeRuntimeReceipt({
    contract: 'bifrost.ignition-receipt/v1',
    state: 'runtime-verified',
    profileId: 'box:qwen3-coder-30b-a3b-v1',
    provider: 'ollama',
    model: 'box:qwen3-coder-30b-a3b-v1',
    actualModel: 'box:qwen3-coder-30b-a3b-v1',
    sourceModel: 'huihui-ai/Huihui-Qwen3-Coder-30B-A3B-Instruct-abliterated',
    challenge: 'BIFROST_IGNITION_ACK',
    identity: { identityId: 'box', identityName: 'Boxfire', displayName: 'Box', affectionateName: 'Boxxy', aliases: ['box','boxxy','boxfire'] },
    authorization: 'Bearer should-never-survive',
    token: 'never',
    arbitraryBlob: 'not allowed',
  });
  assert.equal(safe.schema, RECEIPT_SCHEMA);
  assert.equal(safe.identity.identityName, 'Boxfire');
  assert.equal(safe.challenge, 'BIFROST_IGNITION_ACK');
  assert.equal('authorization' in safe, false);
  assert.equal('token' in safe, false);
  assert.equal('arbitraryBlob' in safe, false);
  assert.doesNotMatch(JSON.stringify(safe), /should-never-survive|Bearer|never/);
});

test('secret-like keys are rejected if they ever reach the durable receipt shape', () => {
  assert.throws(() => assertNoSecretFields({ profileId: 'x', nested: { apiKey: 'secret' } }), /prohibited secret-like field/);
  assert.throws(() => assertNoSecretFields({ credential: true }), /prohibited secret-like field/);
  assert.doesNotThrow(() => assertNoSecretFields({ profileId: 'x', provider: 'ollama' }));
});

test('persisted receipt writes timestamped and latest identity files with restrictive intent', async () => withTempData(({ env }) => {
  const saved = persistRuntimeReceipt({
    receiptId: 'test-1',
    state: 'runtime-verified',
    profileId: 'uial:fablevibes-v1',
    model: 'uial:fablevibes-v1',
    actualModel: 'uial:fablevibes-v1',
    identity: { identityId: 'uial', identityName: 'Uial', displayName: 'Uial', aliases: ['uial'] },
  }, { action: 'ignition', env });
  assert.equal(fs.existsSync(saved.historical), true);
  assert.equal(fs.existsSync(saved.latest), true);
  const latest = JSON.parse(fs.readFileSync(saved.latest, 'utf8'));
  assert.equal(latest.receiptId, 'test-1');
  assert.equal(latest.identity.identityId, 'uial');
}));

test('ledger list returns historical receipts newest-first without duplicating latest aliases', async () => withTempData(({ env }) => {
  persistRuntimeReceipt({ receiptId: 'one', state: 'installed', profileId: 'uial:fablevibes-v1', identity: { identityId: 'uial', identityName: 'Uial' } }, { env });
  await new Promise((resolve) => setTimeout(resolve, 4));
  persistRuntimeReceipt({ receiptId: 'two', state: 'runtime-verified', profileId: 'uial:fablevibes-v1', identity: { identityId: 'uial', identityName: 'Uial' } }, { env });
  const list = listRuntimeReceipts({ env, limit: 10 });
  assert.equal(list.length, 2);
  assert.equal(list[0].receiptId, 'two');
  assert.equal(list[1].receiptId, 'one');
}));
