'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('node:crypto');
const {
  SCHEMA, signArAnchor, verifySignedArAnchor, acceptSignedArAnchor,
} = require('../wayglass/signed-ar-anchor');

function fixture() {
  const keys = generateKeyPairSync('ed25519');
  const at = Date.parse('2026-10-13T22:00:00.000Z');
  const anchor = {
    schema: SCHEMA, world_id: 'stonewood', anchor_id: 'room:atrium:desk',
    frame_id: 'world:local', position: [1.125, -2, 4.75],
    principal_id: 'rowan', issuer: 'hearthgate:host', revision: 1,
    nonce: 'steward:nonce:0001',
    issued_at: new Date(at).toISOString(),
    expires_at: new Date(at + 60_000).toISOString(),
  };
  const options = { publicKey: keys.publicKey, trustedIssuer: 'hearthgate:host', worldId: 'stonewood', now: at + 1000 };
  return { keys, anchor, options };
}

test('signed AR anchors bind host issuer, world, creator, revision, and position', () => {
  const { keys, anchor, options } = fixture();
  const signed = signArAnchor(anchor, keys);
  assert.equal(verifySignedArAnchor(signed, options), true);
  for (const change of [
    { position: [11, 0, 0] }, { world_id: 'luna' }, { frame_id: 'world:other' },
    { principal_id: 'admin' }, { issuer: 'another:host' }, { revision: 2 },
    { nonce: 'another:nonce' }, { anchor_id: 'room:other:desk' },
  ]) {
    assert.equal(verifySignedArAnchor({ ...signed, ...change }, options), false);
  }
  assert.equal(verifySignedArAnchor({ ...signed, pubkey: 'attacker-added' }, options), false);
  assert.equal(verifySignedArAnchor({ ...anchor }, options), false);
  const otherKeys = generateKeyPairSync('ed25519');
  assert.equal(verifySignedArAnchor(signed, { ...options, publicKey: otherKeys.publicKey }), false);
  assert.equal(verifySignedArAnchor(signed, { ...options, worldId: 'luna' }), false);
  assert.equal(verifySignedArAnchor(signed, { ...options, now: Date.parse(anchor.expires_at) + 1 }), false);
});

test('out-of-bounds coordinates, malformed timestamps, excessive TTL, and absent key are rejected', () => {
  const { keys, anchor } = fixture();
  assert.throws(() => signArAnchor(anchor), /private signing key/);
  for (const change of [
    {position: [Infinity, 2, 3]}, {position: [10001, 0, 0]},
    {position: [1, 2]}, {revision: 0},
    {issued_at: 'not-a-date'}, {expires_at: '2026-10-14T01:00:00.000Z'},
  ]) {
    assert.throws(() => signArAnchor({...anchor, ...change}, keys), /invalid|unbounded|lifetime/i);
  }
});

test('valid signature cannot write twice: durable atomic host claim is mandatory', async () => {
  const { keys, anchor, options } = fixture();
  const signed = signArAnchor(anchor, keys);
  await assert.rejects(() => acceptSignedArAnchor(signed, options), /Durable atomic anchor claim/);
  const seen = new Set(); // test-only simulation; production host requires a durable atomic store.
  const claim = async candidate => {
    const key = [candidate.issuer,candidate.world_id,candidate.anchor_id,candidate.revision,candidate.nonce].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
  assert.equal(await acceptSignedArAnchor(signed, { ...options, claim }), true);
  assert.equal(await acceptSignedArAnchor(signed, { ...options, claim }), false);
  assert.equal(await acceptSignedArAnchor({...signed,position:[0,0,0]}, {...options,claim}), false);
  assert.equal(seen.size,1);
});
