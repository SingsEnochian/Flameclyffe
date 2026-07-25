import assert from 'node:assert/strict';
import test from 'node:test';
import { APPLET_CATALOGUE } from '../src/applets.js';
import {
  COLLECTION_ROOM_DEFINITIONS,
  IMPLEMENTED_APPLET_IDS,
  WORLD_SECTION_DEFINITIONS,
  createEmptyRoomCollections,
  normaliseRoomCollections,
} from '../src/rooms.js';

test('every registered applet resolves to an implemented room', () => {
  const missing = APPLET_CATALOGUE.map((item) => item.id).filter((id) => !IMPLEMENTED_APPLET_IDS.has(id));
  assert.deepEqual(missing, []);
});

test('room collections include every collection-backed room', () => {
  const collections = createEmptyRoomCollections();
  assert.deepEqual(Object.keys(collections).sort(), Object.keys(COLLECTION_ROOM_DEFINITIONS).sort());
  assert.ok(Object.values(collections).every(Array.isArray));
});

test('normalisation preserves known room records and repairs malformed rooms', () => {
  const normalised = normaliseRoomCollections({
    timeline: [{ id: 'event-one', title: 'Arrival' }],
    diary: {},
    unknown: [{ id: 'ignored' }],
  });
  assert.equal(normalised.timeline[0].title, 'Arrival');
  assert.deepEqual(normalised.diary, []);
  assert.equal('unknown' in normalised, false);
});

test('world section rooms cover identity, safety, recall, companion, and theme', () => {
  for (const id of ['identity', 'safety-weave', 'continuity-recall', 'companion', 'theme']) {
    assert.ok(WORLD_SECTION_DEFINITIONS[id]);
  }
});
