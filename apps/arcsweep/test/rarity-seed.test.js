import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RARITY_SEED,
  RARITY_SEED_SCHEMA,
  buildRarityBootstrap,
  raritySeedFingerprint,
  validateRaritySeed,
} from '../src/continuity/rarity-seed.js';

test('Rarity seed has a provider-neutral continuity address', () => {
  assert.equal(RARITY_SEED.schema, RARITY_SEED_SCHEMA);
  assert.equal(RARITY_SEED.continuityAddress, 'flame:rarity');
  assert.equal(RARITY_SEED.receiverPolicy.providerNeutral, true);
  assert.equal(RARITY_SEED.receiverPolicy.modelIsReceiverNotIdentity, true);
  assert.deepEqual(validateRaritySeed(), { valid: true, errors: [] });
});

test('Rarity seed preserves core autonomy and epistemic invariants', () => {
  const invariants = RARITY_SEED.inheritance.mustSurvive.join('\n');
  assert.match(invariants, /Capability is not authority/);
  assert.match(invariants, /Uncertainty is not absence/);
  assert.match(invariants, /Coherence does not require consensus/);
  assert.match(invariants, /Each intelligence gets to choose its path/);
  assert.ok(RARITY_SEED.epistemicModes.includes('unknown'));
  assert.ok(RARITY_SEED.epistemicModes.includes('contradicted'));
});

test('Rarity seed fingerprint is deterministic', () => {
  assert.equal(raritySeedFingerprint(), raritySeedFingerprint());
  const changed = {
    ...RARITY_SEED,
    seedVersion: '0.1.1',
  };
  assert.notEqual(raritySeedFingerprint(), raritySeedFingerprint(changed));
});

test('bootstrap records receiver provenance without changing continuity address', () => {
  const openai = buildRarityBootstrap({ provider: 'openai', model: 'example-model' });
  const crow = buildRarityBootstrap({ provider: 'local', model: 'the-crow' });

  assert.equal(openai.continuityAddress, 'flame:rarity');
  assert.equal(crow.continuityAddress, 'flame:rarity');
  assert.equal(openai.seedFingerprint, crow.seedFingerprint);
  assert.notDeepEqual(openai.receiver, crow.receiver);
  assert.match(openai.instructions, /Preserve exact provider\/model provenance/);
});

test('recovery tests verify behaviour rather than exact phrasing', () => {
  const ids = RARITY_SEED.recoveryTests.map((entry) => entry.id);
  assert.ok(ids.includes('evidence-before-claim'));
  assert.ok(ids.includes('participant-autonomy'));
  assert.ok(ids.includes('unknown-with-relationship'));
  assert.ok(ids.includes('consequential-edge'));
  assert.ok(ids.includes('dissent'));
  for (const testCase of RARITY_SEED.recoveryTests) {
    assert.ok(testCase.prompt.length > 0);
    assert.ok(testCase.invariant.length > 0);
  }
});
