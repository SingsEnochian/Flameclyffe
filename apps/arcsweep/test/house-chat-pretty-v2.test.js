import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { prettyRoomScene } from '../src/house-chat-pretty-v2.js';

const source = readFileSync(fileURLToPath(new URL('../src/house-chat-pretty-v2.js', import.meta.url)), 'utf8');
const bootstrap = readFileSync(fileURLToPath(new URL('../src/sidecar-bootstrap.js', import.meta.url)), 'utf8');

test('pretty room scenes preserve distinct built-in room identities', () => {
  assert.deepEqual(prettyRoomScene('house-room:constellation'), ['gold', 'violet', '✦']);
  assert.deepEqual(prettyRoomScene('house-room:arcsweep'), ['seaglass', 'copper', '⌘']);
  assert.deepEqual(prettyRoomScene('house-room:terra-aeterna'), ['moss', 'gold', 'ᛉ']);
  assert.deepEqual(prettyRoomScene('house-room:luna'), ['violet', 'sky', '☾']);
  assert.deepEqual(prettyRoomScene('house-room:direct:lioreal'), ['gold', 'seaglass', '@']);
});

test('pretty layer remains a visual decorator rather than chat state owner', () => {
  assert.match(source, /MutationObserver/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /dataset\.commonsEnhanced !== 'v5'/);
  assert.doesNotMatch(source, /appendHouseCommons|streamConstellationRuntimeVoice|upsertHouseRoom/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /house-scene-a/);
});

test('pretty v2 remains build-visible but is excluded from the default House pack', () => {
  const start = bootstrap.indexOf('house: Object.freeze([');
  const end = bootstrap.indexOf('writing: Object.freeze([', start);
  const house = bootstrap.slice(start, end);
  assert.doesNotMatch(house, /house-chat-pretty-v2\.js/);
  assert.equal(bootstrap.split("'./house-chat-pretty-v2.js'").length - 1, 1);
});
