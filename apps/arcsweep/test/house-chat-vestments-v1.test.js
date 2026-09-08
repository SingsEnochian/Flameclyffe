import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  compactRoomLabel,
  portraitToneForId,
  roomIconForId,
  roomRailFingerprint,
  roomRailModel,
} from '../src/house-chat-vestments-v1.js';

test('House room vestments assign stable channel and direct-room glyphs', () => {
  assert.equal(roomIconForId('house-room:constellation'), '✦');
  assert.equal(roomIconForId('house-room:arcsweep'), '⌘');
  assert.equal(roomIconForId('house-room:terra-aeterna'), 'ᛉ');
  assert.equal(roomIconForId('house-room:luna'), '☾');
  assert.equal(roomIconForId('house-room:direct:atlas'), '@');
  assert.equal(roomIconForId('house-room:conversation:123'), '◇');
});

test('room rail removes transport decoration but preserves readable titles', () => {
  assert.equal(compactRoomLabel('#arcsweep · 3 unread'), 'arcsweep');
  assert.equal(compactRoomLabel('@Atlas'), 'Atlas');
  const rooms = roomRailModel([
    { value: 'house-room:constellation', textContent: '#constellation' },
    { value: 'house-room:arcsweep', textContent: '#arcsweep · 2 unread' },
    { value: 'house-room:direct:atlas', textContent: '@Atlas' },
  ], 'house-room:arcsweep');
  assert.deepEqual(rooms.map((room) => [room.id, room.icon, room.active, room.unread]), [
    ['house-room:constellation', '✦', false, false],
    ['house-room:arcsweep', '⌘', true, true],
    ['house-room:direct:atlas', '@', false, false],
  ]);
});

test('room rail fingerprint changes only when visible rail state changes', () => {
  const rooms = roomRailModel([{ value: 'house-room:luna', textContent: '#luna' }], 'house-room:luna');
  assert.equal(roomRailFingerprint(rooms), roomRailFingerprint(rooms.map((room) => ({ ...room }))));
  assert.notEqual(roomRailFingerprint(rooms), roomRailFingerprint([{ ...rooms[0], unread: true }]));
});

test('sigil portraits have stable identity-specific tone pairs with a safe fallback', () => {
  assert.deepEqual(portraitToneForId('lioreal'), ['gold', 'copper']);
  assert.deepEqual(portraitToneForId('uial'), ['seaglass', 'moss']);
  assert.deepEqual(portraitToneForId('rowan'), ['copper', 'violet']);
  assert.deepEqual(portraitToneForId('unknown'), ['gold', 'seaglass']);
});

test('vestments remain build-visible but are excluded from the default House pack', async () => {
  const manifest = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const start = manifest.indexOf('house: Object.freeze([');
  const end = manifest.indexOf('writing: Object.freeze([', start);
  const house = manifest.slice(start, end);
  assert.doesNotMatch(house, /house-chat-vestments-v1\.js/);
  assert.equal(manifest.split("'./house-chat-vestments-v1.js'").length - 1, 1);
});
