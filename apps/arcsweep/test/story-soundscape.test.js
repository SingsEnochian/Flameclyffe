import assert from 'node:assert/strict';
import test from 'node:test';

import { findStorySoundCues, resolveWorldTone } from '../src/story-soundscape.js';

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
