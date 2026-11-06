const test = require('node:test');
const assert = require('node:assert/strict');
const { CHARACTERS, BOND, PHASES, inspectPsychicCharacter } = require('../wayglass/psychic-bindings.cjs');

test('eightfold host registry has separate Rowan/Crow owners', () => {
  assert.deepEqual(CHARACTERS.map(x=>x.owner_id), ['Rowan','Crow']);
  assert.equal(BOND.identity_merge,false);
  assert.equal(PHASES.length,8);
});
test('host inspector is world scoped and does not grant a write', () => {
  const inspected = inspectPsychicCharacter('psychic:izar-virel-angelou','psychic-universe');
  assert.equal(inspected.character.owner_id,'Crow');
  assert.equal(inspected.response_authorized,false);
  assert.equal(inspected.return_committed,false);
  assert.equal(inspectPsychicCharacter('psychic:izar-virel-angelou','other'),null);
});
