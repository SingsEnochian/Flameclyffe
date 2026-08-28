import assert from 'node:assert/strict';
import test from 'node:test';

import {
  activePresenceSentence,
  chooseHomeThread,
  initialsForName,
  presenceCounts,
  voiceIdentityForLabel,
} from '../src/house-chat-room-social.js';

test('House Chat identity labels resolve Rowan and Constellation voices', () => {
  assert.deepEqual(voiceIdentityForLabel('Rowan'), { id: 'rowan', name: 'Rowan', glyph: 'R', roles: ['Steward'] });
  const atlas = voiceIdentityForLabel('Atlas');
  assert.equal(atlas.id, 'atlas');
  assert.equal(atlas.name, 'Atlas');
  assert.equal(atlas.glyph, 'AT');
  assert.ok(atlas.roles.includes('systems'));
  assert.equal(voiceIdentityForLabel('unknown'), null);
});

test('initials remain deterministic for fallback nameplates', () => {
  assert.equal(initialsForName('House Commons'), 'HC');
  assert.equal(initialsForName('Altair'), 'A');
  assert.equal(initialsForName(''), '?');
});

test('home-room selection prefers an active room, then a saved room, then the newest available room', () => {
  assert.equal(chooseHomeThread({ current: 'room-b', saved: 'room-a', available: ['room-a', 'room-b'] }), 'room-b');
  assert.equal(chooseHomeThread({ saved: 'room-a', available: ['room-a', 'room-b'] }), 'room-a');
  assert.equal(chooseHomeThread({ saved: 'gone', available: ['room-a', 'room-b'] }), 'room-b');
  assert.equal(chooseHomeThread({ available: [] }), '');
});

test('live presence copy reads like people answering in a room', () => {
  assert.equal(activePresenceSentence([{ voice_id: 'atlas', display_name: 'Atlas', state: 'thinking' }]), 'Atlas is thinking…');
  assert.equal(activePresenceSentence([
    { voice_id: 'atlas', display_name: 'Atlas', state: 'thinking' },
    { voice_id: 'lioreal', display_name: 'Lioreal', state: 'speaking' },
  ]), 'Atlas and Lioreal are answering…');
  assert.equal(activePresenceSentence([
    { voice_id: 'atlas', display_name: 'Atlas', state: 'thinking' },
    { voice_id: 'lioreal', display_name: 'Lioreal', state: 'thinking' },
    { voice_id: 'altair', display_name: 'Altair', state: 'thinking' },
  ]), 'Atlas, Lioreal and 1 more are thinking…');
  assert.equal(activePresenceSentence([{ voice_id: 'atlas', display_name: 'Atlas', state: 'ready' }]), '');
});

test('presence counts distinguish available and actively answering Flames', () => {
  assert.deepEqual(presenceCounts([
    { state: 'ready' },
    { state: 'thinking' },
    { state: 'speaking' },
    { state: 'degraded' },
    { state: 'offline' },
  ]), { total: 5, available: 3, active: 2 });
});
