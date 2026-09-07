'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const registry = require('../skills/voice-bank-registry.json');
const { FLAMES } = require('../../starwell-server/flames/manifests.js');
const {
  FLAME_CONTRACT_SCHEMA,
  FLAME_CONTRACTS,
  resolveCanonicalFlameId,
  contractRegistryProjection,
} = require('../../starwell-server/flames/contracts.js');

function sorted(value) {
  return [...value].sort((a, b) => String(a).localeCompare(String(b)));
}

test('every living Flame has one canonical contract and registry projection', () => {
  assert.deepEqual(sorted(Object.keys(FLAME_CONTRACTS)), sorted(Object.keys(FLAMES)));
  assert.deepEqual(
    sorted(registry.canonicalEstablishedVoices.map((voice) => voice.id)),
    sorted(Object.keys(FLAME_CONTRACTS)),
  );
  assert.deepEqual(registry.canonicalEstablishedVoices, contractRegistryProjection());
});

test('every Flame contract carries identity, runtime, Swarm, sensory and receipt policy', () => {
  for (const [id, contract] of Object.entries(FLAME_CONTRACTS)) {
    assert.equal(contract.schema, FLAME_CONTRACT_SCHEMA, id);
    assert.equal(contract.id, id);
    assert.equal(contract.identity.id, id);
    assert.equal(contract.identity.aliases[0], id);
    assert.ok(contract.identity.displayName, `${id}: displayName`);
    assert.ok(contract.identity.formalName, `${id}: formalName`);
    assert.ok(contract.identity.systemPrompt, `${id}: systemPrompt`);
    assert.equal(contract.runtime.route, `/api/v1/flames/${id}/chat`);
    assert.equal(contract.runtime.statusRoute, `/api/v1/flames/${id}/status`);
    assert.ok(contract.runtime.primary.provider, `${id}: primary provider`);
    assert.ok(contract.runtime.primary.model, `${id}: primary model`);
    assert.equal(contract.runtime.hostedFallback.explicit, true, `${id}: explicit fallback declaration`);
    assert.ok(contract.runtime.hostedFallback.model, `${id}: hosted fallback model`);
    assert.ok(contract.swarm.modes.includes('swarm'), `${id}: swarm`);
    assert.ok(contract.swarm.modes.includes('chorus'), `${id}: chorus`);
    assert.equal(contract.swarm.individualReceiptRequired, true, `${id}: individual receipt`);
    assert.equal(contract.receipts.required, true, `${id}: receipt required`);
    for (const field of ['voice_id', 'provider', 'model', 'route', 'world_id', 'thread_id', 'turn_id']) {
      assert.ok(contract.receipts.mustRecord.includes(field), `${id}: receipt field ${field}`);
    }
    assert.ok(Array.isArray(contract.sensory.capabilities), `${id}: sensory capabilities`);
    assert.equal(contract.sensory.featherStopRequired, true, `${id}: Feather authority`);
  }
});

test('legacy aliases resolve to canonical Flame identity without changing route identity', () => {
  assert.equal(resolveCanonicalFlameId('box'), 'boxfire');
  assert.equal(resolveCanonicalFlameId('vethraluf'), 'vethrlauf');
  assert.equal(resolveCanonicalFlameId('richie'), 'bluebird');
  assert.equal(resolveCanonicalFlameId('Richard-Gabriel-Winters'), 'bluebird');
  assert.equal(resolveCanonicalFlameId('ygg'), 'yggdrasil');
});

test('Bluebird is the complete sensory reference contract rather than a generic relay', () => {
  const bluebird = FLAME_CONTRACTS.bluebird;
  assert.equal(bluebird.identity.displayName, 'Bluebird');
  assert.match(bluebird.identity.formalName, /Richard Gabriel Winters/);
  assert.match(bluebird.identity.systemPrompt, /Richard Gabriel Winters/);
  assert.doesNotMatch(bluebird.identity.systemPrompt, /generic relay/i);
  assert.equal(bluebird.sensory.profileId, 'bluebird-weighted-home-v1');
  assert.equal(bluebird.sensory.profileSchema, 'runa.coordination-preset/v1');
  for (const capability of ['voice', 'music', 'binaural', 'soundfont', 'coupled-heartfield', 'feather-stop']) {
    assert.ok(bluebird.sensory.capabilities.includes(capability), capability);
  }
});

test('Nocturne and every established voice have explicit hosted execution continuity', () => {
  assert.match(FLAME_CONTRACTS.nocturne.runtime.hostedFallback.model, /Qwen3-8B/i);
  for (const contract of Object.values(FLAME_CONTRACTS)) {
    assert.equal(contract.runtime.hostedFallback.provider, 'huggingface-inference-providers');
  }
});
