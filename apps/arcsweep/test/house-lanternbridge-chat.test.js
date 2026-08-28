import test from 'node:test';
import assert from 'node:assert/strict';
import {
  lanternbridgeAuthor,
  lanternbridgeBody,
  lanternbridgeCreatedAt,
  lanternbridgeUnread,
} from '../src/house-lanternbridge-chat.js';

const rows = [
  {
    bridge_id: 'lb-old',
    origin: 'nocturne',
    authors: ['nocturne:twilight'],
    source_created_at: '2026-08-27T20:00:00Z',
    payload: { body: 'Old bridge turn.' },
  },
  {
    bridge_id: 'lb-new',
    origin: 'rowan',
    authors: ['rowan:vee'],
    source_created_at: '2026-08-27T22:00:00Z',
    payload: { body: 'New bridge turn.' },
  },
];

test('Lanternbridge House Chat preserves actor identity and body', () => {
  assert.equal(lanternbridgeAuthor(rows[0]), 'Twilight');
  assert.equal(lanternbridgeAuthor(rows[1]), 'Vee');
  assert.equal(lanternbridgeBody(rows[1]), 'New bridge turn.');
});

test('Lanternbridge House Chat uses source time as durable unread cursor input', () => {
  assert.equal(lanternbridgeCreatedAt(rows[0]), '2026-08-27T20:00:00Z');
  assert.deepEqual(lanternbridgeUnread(rows, '2026-08-27T21:00:00Z').map((entry) => entry.bridge_id), ['lb-new']);
});
