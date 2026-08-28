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

test('vestments mount after House Chat social/tools and before downstream live reads', async () => {
  const manifest = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const chat = manifest.indexOf('./house-commons-chat-v5.js');
  const social = manifest.indexOf('./house-chat-room-social.js');
  const tools = manifest.indexOf('./house-chat-tools-v5.js');
  const vestments = manifest.indexOf('./house-chat-vestments-v1.js');
  const runtime = manifest.indexOf('./runtime-envelope-live-ui.js');
  assert.ok(chat >= 0 && social > chat && tools > social && vestments > tools && runtime > vestments);
});
