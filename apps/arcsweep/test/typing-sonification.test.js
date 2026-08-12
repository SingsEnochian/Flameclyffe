import assert from 'node:assert/strict';
import test from 'node:test';

import { completedWordsFromInsertion, keystrokeTone, typingDelta, wordTone } from '../src/typing-sonification.js';

test('typing delta isolates an insertion without replaying unchanged text', () => {
  assert.deepEqual(typingDelta('bone', 'bones'), { start: 4, inserted: 's', deleted: '' });
  assert.deepEqual(typingDelta('bones', 'bone'), { start: 4, inserted: '', deleted: 's' });
});

test('each printable key resolves deterministically against the world root', () => {
  const first = keystrokeTone('V', 220);
  const second = keystrokeTone('V', 220);
  assert.deepEqual(first, second);
  assert.equal(first.role, 'printable-key');
  assert.ok(first.frequency_hz >= 110 && first.frequency_hz <= 880);
  assert.notEqual(keystrokeTone('V', 432).frequency_hz, first.frequency_hz);
});

test('space and punctuation remain audible cadence keys', () => {
  assert.equal(keystrokeTone(' ', 220).role, 'space-cadence');
  assert.equal(keystrokeTone('?', 220).role, 'punctuation-cadence');
  assert.equal(keystrokeTone('', 220).role, 'delete');
});

test('a completed word resolves from the tones of its actual keystrokes', () => {
  const tone = wordTone('bones', 220);
  assert.equal(tone.word, 'bones');
  assert.equal(tone.key_frequencies_hz.length, 5);
  assert.equal(tone.first_key_hz, keystrokeTone('b', 220).frequency_hz);
  assert.equal(tone.last_key_hz, keystrokeTone('s', 220).frequency_hz);
  assert.equal(tone.algorithm, 'weighted-log-key-composition/v1');
  assert.deepEqual(wordTone('bones', 220), wordTone('bones', 220));
  assert.notEqual(wordTone('bones', 220).frequency_hz, wordTone('senob', 220).frequency_hz);
});

test('word completion fires only when the inserted edit crosses a boundary', () => {
  assert.deepEqual(completedWordsFromInsertion('bone', 'bones'), []);
  assert.deepEqual(completedWordsFromInsertion('bones', 'bones '), ['bones']);
  assert.deepEqual(completedWordsFromInsertion('bones ', 'bones ash '), ['ash']);
  assert.deepEqual(completedWordsFromInsertion('', 'bones, ash.'), ['bones', 'ash']);
});
