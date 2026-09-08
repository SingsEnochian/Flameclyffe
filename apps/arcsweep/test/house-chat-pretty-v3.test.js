import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { clusterKinds } from '../src/house-chat-pretty-v3.js';

const source = readFileSync(fileURLToPath(new URL('../src/house-chat-pretty-v3.js', import.meta.url)), 'utf8');
const bootstrap = readFileSync(fileURLToPath(new URL('../src/sidecar-bootstrap.js', import.meta.url)), 'utf8');

test('message rhythm clusters consecutive authors without merging identities', () => {
  assert.deepEqual(clusterKinds(['lioreal']), ['single']);
  assert.deepEqual(clusterKinds(['lioreal', 'lioreal']), ['first', 'last']);
  assert.deepEqual(clusterKinds(['lioreal', 'lioreal', 'lioreal']), ['first', 'middle', 'last']);
  assert.deepEqual(clusterKinds(['lioreal', 'rowan', 'lioreal']), ['single', 'single', 'single']);
  assert.deepEqual(clusterKinds(['rowan', 'rowan', 'lioreal', 'lioreal']), ['first', 'last', 'first', 'last']);
});

test('pretty v3 stays a visual decorator with v5 guard and reduced-motion treatment', () => {
  assert.match(source, /form\?\.dataset\.commonsEnhanced !== 'v5'/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /houseVisualCluster/);
  assert.match(source, /house-entry-order/);
  assert.doesNotMatch(source, /appendHouseCommons|streamConstellationRuntimeVoice|upsertHouseRoom|markHouseRoomRead|uploadHouseAttachment/);
});

test('pretty v3 remains build-visible but is excluded from the default House pack', () => {
  const start = bootstrap.indexOf('house: Object.freeze([');
  const end = bootstrap.indexOf('writing: Object.freeze([', start);
  const house = bootstrap.slice(start, end);
  assert.doesNotMatch(house, /house-chat-pretty-v3\.js/);
  assert.equal(bootstrap.split("'./house-chat-pretty-v3.js'").length - 1, 1);
});
