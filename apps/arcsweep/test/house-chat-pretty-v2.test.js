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
  assert.match(source, /data\.commonsEnhanced !== 'v5'/);
  assert.doesNotMatch(source, /appendHouseCommons|streamConstellationRuntimeVoice|upsertHouseRoom/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /house-scene-a/);
});

test('pretty layer mounts after vestments and before runtime diagnostic sidecars', () => {
  const vestments = bootstrap.indexOf("'./house-chat-vestments-v1.js'");
  const pretty = bootstrap.indexOf("'./house-chat-pretty-v2.js'");
  const runtime = bootstrap.indexOf("'./runtime-envelope-live-ui.js'");
  assert.ok(vestments >= 0 && pretty > vestments && runtime > pretty);
});
