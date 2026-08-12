import assert from 'node:assert/strict';
import test from 'node:test';

import { findStorySoundCues, resolveWorldSoundfontMap, resolveWorldTone } from '../src/story-soundscape.js';

test('story language resolves to exact sound actions', () => {
  const text = 'A branch snapped behind her. Thunder rolled, and the bell rang.';
  const cues = findStorySoundCues(text);
  assert.deepEqual(cues.map((cue) => cue.cue_id), ['branch-snap', 'thunder', 'bell']);
  assert.equal(cues[0].text, 'branch snapped');
  assert.deepEqual(cues[0].source_span, undefined);
  assert.equal(text.slice(cues[0].start, cues[0].end), cues[0].text);
});

test('incremental cue search does not replay completed earlier phrases', () => {
  const text = 'A branch snapped. Then the fire crackled.';
  assert.deepEqual(findStorySoundCues(text, { fromIndex: 18 }).map((cue) => cue.cue_id), ['fire']);
});

test('world tone resolver carries established roots into the mixer', () => {
  assert.equal(resolveWorldTone({ id: 'house-world-terra-aeterna', houseSourceKey: 'terra-aeterna', name: 'Terra Aeterna' }).rootHz, 220);
  assert.equal(resolveWorldTone({ id: 'house-world-luna', houseSourceKey: 'luna' }).rootHz, 432);
  assert.equal(resolveWorldTone({ id: 'house-world-taveren-vaen', houseSourceKey: 'taveren-vaen' }).rootHz, 120);
  assert.equal(resolveWorldTone({ id: 'house-world-starsong', houseSourceKey: 'starsong' }).rootHz, 528);
});

test('Ta’veren Vaen maps Tavian, Kestrelle, the Dream, and Resonant Bonding to a reproducible SoundFont programme', () => {
  const map = resolveWorldSoundfontMap({ id: 'house-world-taveren-vaen', houseSourceKey: 'taveren-vaen' });
  assert.equal(map.id, 'taveren-vaen-greyspan-v1');
  assert.equal(map.tuning.rootHz, 120);
  assert.deepEqual(map.voices.map((voice) => voice.id), ['tavian', 'kestrelle', 'dream', 'greyspan', 'resonant-bonding', 'failure']);
  assert.equal(map.voices.find((voice) => voice.id === 'tavian').program, 42);
  assert.equal(map.voices.find((voice) => voice.id === 'kestrelle').program, 15);
  assert.equal(map.voices.find((voice) => voice.id === 'resonant-bonding').program, 48);
  assert.equal(resolveWorldSoundfontMap({ id: 'house-world-luna' }), null);
});
