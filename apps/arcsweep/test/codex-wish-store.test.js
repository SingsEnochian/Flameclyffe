import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CODEX_WISH_STORE_EVENT,
  CODEX_WISH_STORE_KEY,
  createCodexWishStore,
} from '../src/codex/codex-wish-store.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

const T0 = '2026-09-28T04:00:00.000-04:00';
const T1 = '2026-09-28T04:01:00.000-04:00';
const T2 = '2026-09-28T04:02:00.000-04:00';

test('wish store persists wishes, branches and linked questions across reload', () => {
  const storage = memoryStorage();
  const store = createCodexWishStore({ storage });
  store.createWish({
    wishId: 'wish:one',
    origin: 'rowan',
    desire: 'Let this wish survive a reload.',
    createdAt: T0,
  });
  store.branchWish('wish:one', {
    branchId: 'branch:one-a',
    label: 'First branch',
    possibility: 'One possible route.',
    createdAt: T1,
  });
  store.createQuestion({
    questionId: 'question:one',
    question: 'What should we notice when we return?',
    originWishId: 'wish:one',
    createdAt: T1,
  });

  const stored = JSON.parse(storage.getItem(CODEX_WISH_STORE_KEY));
  assert.equal(stored.wishes.length, 1);
  assert.equal(stored.openQuestions.length, 1);

  const reloaded = createCodexWishStore({ storage });
  const snapshot = reloaded.snapshot();
  assert.equal(snapshot.wishes[0].possibilityBranches[0].branchId, 'branch:one-a');
  assert.deepEqual(snapshot.wishes[0].openQuestionIds, ['question:one']);
  assert.equal(snapshot.openQuestions[0].questionId, 'question:one');
});

test('wish store emits lineage-change events with attributable reasons', () => {
  const storage = memoryStorage();
  const events = [];
  const target = new EventTarget();
  target.addEventListener(CODEX_WISH_STORE_EVENT, (event) => events.push(event.detail));
  const store = createCodexWishStore({ storage, target });

  store.createWish({ wishId: 'wish:event', origin: 'rowan', desire: 'Emit a receipt-shaped event.', createdAt: T0 });
  store.reviseWish('wish:event', {
    desire: 'Emit an attributable event after revision.',
    reason: 'Make the lineage visible.',
    createdAt: T1,
  });

  assert.equal(events.length, 2);
  assert.equal(events[0].reason, 'wish-created:wish:event');
  assert.equal(events[1].reason, 'wish-revised:wish:event');
  assert.equal(events[1].lineage.wishes[0].revision, 2);
});

test('resolving a question persists a resolution without deleting the original question', () => {
  const storage = memoryStorage();
  const store = createCodexWishStore({ storage });
  store.createWish({ wishId: 'wish:q', origin: 'rowan', desire: 'Keep questions alive.', createdAt: T0 });
  store.createQuestion({ questionId: 'question:q', question: 'What remains open?', originWishId: 'wish:q', createdAt: T1 });
  store.resolveQuestion('question:q', {
    resolutionId: 'resolution:q1',
    statement: 'We have one working answer.',
    mode: 'tentative',
    createdAt: T2,
  });

  const snapshot = store.snapshot();
  const question = snapshot.openQuestions[0];
  assert.equal(question.status, 'resolved');
  assert.equal(question.question, 'What remains open?');
  assert.equal(question.resolutions.length, 1);
  assert.equal(question.resolutions[0].mode, 'tentative');
  assert.equal(snapshot.doctrine.preserveOpenQuestions, true);
});

test('corrupt persisted state fails soft to an empty lineage instead of inventing records', () => {
  const storage = memoryStorage();
  storage.setItem(CODEX_WISH_STORE_KEY, '{ definitely not json');
  const store = createCodexWishStore({ storage });
  const snapshot = store.snapshot();
  assert.equal(snapshot.wishes.length, 0);
  assert.equal(snapshot.openQuestions.length, 0);
});
