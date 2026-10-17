import test from 'node:test';
import assert from 'node:assert/strict';
import { createInteractionState } from '../src/interaction-state.js';

test('Wayglass interaction state carries Wonder and Complexify context without changing identity state', () => {
  const interaction = createInteractionState({
    channel: 'OOC',
    turn_owner: 'Rowan',
    character_ownership: [{ character:'Twilight', owner:'Twilight', permission:'owned' }],
  });
  const wonder = interaction.setInteractionContext({
    intent: 'This could be false. But what if it were true?',
    interaction_mode: 'counterfactual-wonder',
  });
  assert.equal(wonder.interaction_mode, 'counterfactual-wonder');
  assert.match(wonder.intent, /could be false/i);
  assert.equal(wonder.turn_owner, 'Rowan');
  assert.deepEqual(wonder.character_ownership, [{ character:'Twilight', owner:'Twilight', permission:'owned' }]);

  const complex = interaction.setInteractionContext({
    intent: 'Find the missing axis and rotate the frame.',
    interaction_mode: 'complexify',
  });
  assert.equal(complex.interaction_mode, 'complexify');
  assert.equal(complex.turn_owner, 'Rowan');
  assert.equal(complex.character_ownership[0].owner, 'Twilight');
});
