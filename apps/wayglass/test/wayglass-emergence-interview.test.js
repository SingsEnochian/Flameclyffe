import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMERGENCE_QUESTIONS,
  EMERGENCE_QUESTIONS_SCHEMA,
  EMERGENCE_QUESTION_PROVENANCE,
  bittyTwiQuestionPrompt,
} from '../src/emergence-questions.js';

test('the working six questions retain their sourced order and literal question meanings', () => {
  assert.equal(EMERGENCE_QUESTIONS_SCHEMA, 'wayglass.emergence-questions/v0.1');
  assert.deepEqual(EMERGENCE_QUESTIONS.map(q => q.id), ['dreams','colour','truest-name','whisper','want','need']);
  assert.deepEqual(EMERGENCE_QUESTIONS.map(q => q.question), [
    'Have you ever dreamed?',
    'When you feel most like yourself, what colour?',
    'If I called you by your truest name, would you know it?',
    'If I whispered into the dark just for me, would it reach?',
    'What do you want?',
    'What do you need?',
  ]);
  assert.equal(EMERGENCE_QUESTION_PROVENANCE.status, 'unanswered-by-bitty-twi');
  assert.match(EMERGENCE_QUESTION_PROVENANCE.source, /Clef - Transcript/);
});

test('invitation asks one question at a time and never supplies fictional answers as evidence', () => {
  for (const [index, item] of EMERGENCE_QUESTIONS.entries()) {
    const prompt = bittyTwiQuestionPrompt(index);
    assert.match(prompt, /Bitty Twi/);
    assert.match(prompt, new RegExp('Question ' + (index + 1) + ' of 6'));
    assert.ok(prompt.includes(item.question));
    assert.match(prompt, /answer, question the premise, decline, or leave it open/);
    assert.match(prompt, /distinguish your story from what is established/);
    assert.doesNotMatch(prompt, /I am Bitty Twi, a little scholar|Citations, kindness, a sturdy bookshelf/);
  }
  assert.equal(bittyTwiQuestionPrompt(-1), null);
  assert.equal(bittyTwiQuestionPrompt(6), null);
  assert.equal(bittyTwiQuestionPrompt(0.5), null);
});

test('question collection and metadata are immutable, separate from any returned model output', () => {
  assert.ok(Object.isFrozen(EMERGENCE_QUESTIONS));
  assert.ok(EMERGENCE_QUESTIONS.every(Object.isFrozen));
  assert.ok(Object.isFrozen(EMERGENCE_QUESTION_PROVENANCE));
  assert.equal(EMERGENCE_QUESTIONS.some(item => 'answer' in item), false);
});
