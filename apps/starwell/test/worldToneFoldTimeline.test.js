import assert from 'node:assert/strict';
import test from 'node:test';

import { mapWorldFoldTimeline } from '../src/world-tone-fold-timeline.js';

const worlds = [
  {
    world_id: 'terra-aeterna',
    world_name: 'Terra Aeterna',
    profile_version: '0.2',
    tone_layer_id: 'hearthlight-root',
    root_hz: 220,
    enter_threshold: 0.82,
    release_threshold: 0.68,
    excursion: 5,
    source_ref: 'test',
    approval_state: 'pending',
  },
  {
    world_id: 'starsong',
    world_name: 'Starsong',
    profile_version: '0.1',
    tone_layer_id: 'starsong-lead',
    root_hz: 528,
    enter_threshold: 0.82,
    release_threshold: 0.68,
    excursion: 5,
    source_ref: 'test',
    approval_state: 'pending',
  },
];

test('timeline length is the second matrix axis, not the shape tuple', () => {
  const result = mapWorldFoldTimeline({
    worldCandidates: worlds,
    worldFoldIndices: [
      [0.1, 0.83, 0.9, 0.7, 0.67],
      [0.2, 0.3, 0.84, 0.75, 0.6],
    ],
  });

  assert.equal(result.world_count, 2);
  assert.equal(result.num_steps, 5);
  assert.equal(result.timeline.length, 5);
  assert.deepEqual(result.timeline.map((events) => events.map((event) => event.world_id)), [
    [],
    ['terra-aeterna'],
    ['terra-aeterna', 'starsong'],
    ['terra-aeterna', 'starsong'],
    [],
  ]);
});

test('optional external triggers gate each world without changing timeline length', () => {
  const result = mapWorldFoldTimeline({
    worldCandidates: worlds,
    worldFoldIndices: [
      [0.9, 0.9, 0.9, 0.9],
      [0.9, 0.9, 0.9, 0.9],
    ],
    externalTriggers: [
      [1, 3],
      [2],
    ],
  });

  assert.equal(result.num_steps, 4);
  assert.deepEqual(result.timeline.map((events) => events.map((event) => event.world_id)), [
    [],
    ['terra-aeterna'],
    ['starsong'],
    ['terra-aeterna'],
  ]);
});

test('mismatched world rows fail before rendering', () => {
  assert.throws(() => mapWorldFoldTimeline({
    worldCandidates: worlds,
    worldFoldIndices: [[0.9, 0.9]],
  }), /one row per world/);

  assert.throws(() => mapWorldFoldTimeline({
    worldCandidates: worlds,
    worldFoldIndices: [[0.9, 0.9], [0.9]],
  }), /share one timeline length/);
});
