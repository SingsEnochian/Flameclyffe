import test from 'node:test';
import assert from 'node:assert/strict';
import { EIGHTFOLD_PHASES, traverseEightfoldMobius, listEightfoldCharacters } from '../src/eightfold-mobius.js';

test('paired psychics traverse all eight folds without merging identity', () => {
  for (const id of ['psychic:eilidh-amalia-elden','psychic:izar-virel-angelou']) {
    const result = traverseEightfoldMobius({ character_id:id, world_id:'psychic-universe', prompt:'Hello' });
    assert.deepEqual(result.trace.map(t=>t.phase), EIGHTFOLD_PHASES);
    assert.equal(result.relationships[0].identity_merge, false);
    assert.equal(result.response.kind,'response-proposal');
    assert.equal(result.trace[2].character_write,false);
    assert.equal(result.trace[5].generated_speech,false);
    assert.equal(result.trace[7].continuity_committed,false);
  }
  assert.equal(listEightfoldCharacters('psychic-universe').length,2);
});
test('wrong world or missing character never leaks context or speech', () => {
  const result = traverseEightfoldMobius({ character_id:'psychic:izar-virel-angelou',world_id:'other',route_id:'openai:gpt' });
  assert.equal(result.character,null);
  assert.equal(result.response,null);
  assert.deepEqual(result.relationships,[]);
  assert.equal(result.trace[4].route_verified,false);
});
