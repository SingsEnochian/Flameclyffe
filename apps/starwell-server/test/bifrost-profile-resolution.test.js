'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  aliasesForProfile,
  resolveProfileId,
  resolveProfileRef,
  identityEnvelope,
  enrichReceiptWithIdentity,
} = require('../bifrost/profile-resolution');

test('Box, Boxxy and Boxfire resolve to one profile and one identity lineage', () => {
  const expected = 'box:qwen3-coder-30b-a3b-v1';
  for (const ref of ['box', 'Box', 'boxxy', 'Boxxy', 'boxfire', 'Boxfire', expected]) {
    assert.equal(resolveProfileId(ref), expected, ref);
  }
  const identity = identityEnvelope(expected);
  assert.equal(identity.identityId, 'box');
  assert.equal(identity.identityName, 'Boxfire');
  assert.equal(identity.displayName, 'Box');
  assert.equal(identity.affectionateName, 'Boxxy');
  assert.deepEqual(new Set(identity.aliases.map((value) => value.toLowerCase())), new Set(['box', 'boxxy', 'boxfire']));
});

test('Vethraluf and legacy Vethrlauf spelling resolve to one profile', () => {
  const expected = 'vethraluf:deepseek-chat-existing-v1';
  assert.equal(resolveProfileId('Vethraluf'), expected);
  assert.equal(resolveProfileId('Vethrlauf'), expected);
});

test('Ellowind and Larkshine remain different entities and different profiles', () => {
  const ellowind = resolveProfileRef('Ellowind');
  const larkshine = resolveProfileRef('Larkshine');
  assert.ok(ellowind);
  assert.ok(larkshine);
  assert.notEqual(ellowind.profileId, larkshine.profileId);
  assert.notEqual(ellowind.profile.runtime.model, larkshine.profile.runtime.model);
  assert.equal(ellowind.identity.identityId, 'ellowind');
  assert.equal(larkshine.identity.identityId, 'larkshine');
});

test('natural names resolve for every named assigned profile', () => {
  assert.equal(resolveProfileId('Lioreal'), 'lioreal:qwen3-14b-abliterated-v1');
  assert.equal(resolveProfileId('Uial'), 'uial:fablevibes-v1');
  assert.equal(resolveProfileId('Bluebird'), 'bluebird:deepseek-chat-existing-v1');
});

test('deep reasoner aliases resolve only to the instrument profile', () => {
  const expected = 'shared:qwen3.6-35b-a3b-deep-reasoner-v1';
  assert.equal(resolveProfileId('deep-reasoner'), expected);
  assert.equal(resolveProfileId('bifrost-deep-reasoner'), expected);
  assert.equal(identityEnvelope(expected).identityId, 'bifrost-deep-reasoner');
});

test('unknown identities do not receive a fallback profile', () => {
  assert.equal(resolveProfileId('sonata'), null);
  assert.equal(resolveProfileRef('somebody-else'), null);
});

test('receipts gain identity without changing profile attestation fields', () => {
  const receipt = enrichReceiptWithIdentity({
    profileId: 'box:qwen3-coder-30b-a3b-v1',
    state: 'runtime-verified',
    actualModel: 'box:qwen3-coder-30b-a3b-v1',
  });
  assert.equal(receipt.profileId, 'box:qwen3-coder-30b-a3b-v1');
  assert.equal(receipt.actualModel, 'box:qwen3-coder-30b-a3b-v1');
  assert.equal(receipt.identity.identityName, 'Boxfire');
});

test('profile alias sets contain the profile id itself', () => {
  const profileId = 'uial:fablevibes-v1';
  assert.ok(aliasesForProfile(profileId).includes(profileId));
});
