import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_BINDINGS, CHARACTER_RELATIONSHIPS, validateCharacterBindings, canWriteCharacter, resolveCharacterBinding } from '../src/character-bindings.js';

test('Psychic Universe pairing preserves distinct owners', () => {
  assert.equal(validateCharacterBindings(), true);
  assert.equal(resolveCharacterBinding('psychic:eilidh-amalia-elden').owner_id, 'Rowan');
  assert.equal(resolveCharacterBinding('psychic:izar-virel-angelou').owner_id, 'Crow');
  assert.equal(CHARACTER_RELATIONSHIPS[0].identity_merge, false);
  assert.equal(CHARACTER_RELATIONSHIPS[0].consent, 'independent-per-participant');
});
test('route identity is not character ownership', () => {
  const izar = resolveCharacterBinding('psychic:izar-virel-angelou');
  assert.equal(canWriteCharacter(izar, 'Rowan'), false);
  assert.equal(canWriteCharacter(izar, 'Crow'), true);
  assert.equal(canWriteCharacter(izar, 'some-model-route'), false);
});
test('handoff requires owner authority and rejects revocation', () => {
  const izar = CHARACTER_BINDINGS[1];
  const handoff = { character_id: izar.character_id, from: 'Crow', to: 'Rowan', authorized: true };
  assert.equal(canWriteCharacter(izar, 'Rowan', { handoff }), false);
  assert.equal(canWriteCharacter(izar, 'Rowan', { handoff: { ...handoff, revoked: true } }), false);
  assert.equal(canWriteCharacter(izar, 'Rowan', { handoff: { ...handoff, from: 'other' } }), false);
});
test('shared narrative is distinct from exclusive character ownership', () => {
  const shared = { character_id: 'example:shared', world_id: 'example', ownership: 'shared-narrative', owner_id: null };
  assert.equal(validateCharacterBindings([...CHARACTER_BINDINGS, shared]), true);
  assert.equal(canWriteCharacter(shared, 'Rowan'), false);
  assert.throws(() => validateCharacterBindings([...CHARACTER_BINDINGS, { ...shared, owner_id: 'Crow' }]));
});
