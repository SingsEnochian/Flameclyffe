import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendReactionHelmReceipt,
  createEmptyReactionState,
  setReactionRegistry,
} from '../src/react-ion-state.js';

test('reaction helpers mutate an isolated canonical slice through a wrapper', () => {
  const reaction = createEmptyReactionState();
  const holder = { reaction };

  setReactionRegistry(holder, {
    version: 1,
    destinations: [{ registration_id: 'dest-1' }],
    corridors: [],
  });
  appendReactionHelmReceipt(holder, { schema: 'reaction.helm-receipt/v1', id: 'flight-1' });

  assert.equal(holder.reaction, reaction);
  assert.equal(reaction.registry.destinations[0].registration_id, 'dest-1');
  assert.equal(reaction.helm.receipts[0].id, 'flight-1');
});

test('reaction helpers also accept the slice directly', () => {
  const reaction = createEmptyReactionState();
  appendReactionHelmReceipt(reaction, { schema: 'reaction.helm-receipt/v1', id: 'flight-2' });
  assert.equal(reaction.helm.receipts[0].id, 'flight-2');
});
