import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyBluebirdEnvelope,
  applyBluebirdFeedback,
  buildBluebirdVibrationPattern,
  createBluebirdState,
  parseBluebirdEnvelope,
} from '../src/bluebird-embodiment-core.js';

test('parses and clamps a structured Bluebird embodiment envelope', () => {
  const envelope = parseBluebirdEnvelope(JSON.stringify({
    text: 'Come a little closer?',
    state_delta: { intimacy: .9, hesitation: -.9 },
    embodiment: { gesture: 'heartbeat', affect: 'shy', intensity: 1.8, tempo: 200, duration: 40, consent: 'open' },
  }));

  assert.equal(envelope.parsed, true);
  assert.equal(envelope.text, 'Come a little closer?');
  assert.equal(envelope.state_delta.intimacy, .25);
  assert.equal(envelope.state_delta.hesitation, -.25);
  assert.equal(envelope.embodiment.intensity, 1);
  assert.equal(envelope.embodiment.tempo, 160);
  assert.equal(envelope.embodiment.duration, 12);
});

test('plain text fails soft into a consent check with no output intensity', () => {
  const envelope = parseBluebirdEnvelope('Hello from the bird.');
  assert.equal(envelope.parsed, false);
  assert.equal(envelope.text, 'Hello from the bird.');
  assert.equal(envelope.embodiment.consent, 'check');
  assert.equal(envelope.embodiment.intensity, 0);
});

test('model deltas update state without leaving the unit interval', () => {
  const start = createBluebirdState({ intimacy: .95, hesitation: .05 });
  const envelope = parseBluebirdEnvelope({
    text: 'Here.',
    state_delta: { intimacy: .2, hesitation: -.2 },
    embodiment: { gesture: 'hold', affect: 'warm', intensity: .4, tempo: 60, duration: 4, consent: 'open' },
  });
  const next = applyBluebirdEnvelope(start, envelope);
  assert.equal(next.intimacy, 1);
  assert.equal(next.hesitation, 0);
  assert.equal(next.currentIntent.gesture, 'hold');
});

test('Feather pauses the state and zeroes the current gesture', () => {
  const start = createBluebirdState({ currentIntent: { gesture: 'heartbeat', affect: 'tender', intensity: .6, tempo: 62, duration: 5, consent: 'open' } });
  const next = applyBluebirdFeedback(start, 'feather');
  assert.equal(next.consent, 'pause');
  assert.equal(next.currentIntent.consent, 'pause');
  assert.equal(next.currentIntent.intensity, 0);
  assert.deepEqual(buildBluebirdVibrationPattern(next.currentIntent), []);
});

test('More raises intensity in bounded steps and Different rotates the gesture vocabulary', () => {
  const start = createBluebirdState({ currentIntent: { gesture: 'heartbeat', affect: 'playful', intensity: .95, tempo: 70, duration: 4, consent: 'open' } });
  const more = applyBluebirdFeedback(start, 'more');
  assert.equal(more.currentIntent.intensity, 1);
  const different = applyBluebirdFeedback(more, 'different');
  assert.equal(different.currentIntent.gesture, 'flutter');
  assert.ok(buildBluebirdVibrationPattern(different.currentIntent).length > 0);
});
