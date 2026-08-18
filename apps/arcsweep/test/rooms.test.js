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

test('Kelyran School is a visible implemented language room', () => {
  const applet = APPLET_CATALOGUE.find((item) => item.id === 'kelyran-school');
  assert.equal(applet?.defaultVisible, true);
  assert.equal(applet?.category, 'language');
  assert.equal(IMPLEMENTED_APPLET_IDS.has('kelyran-school'), true);
});

test('Seedhouse is a visible worldseed room with inheritance and lineage fields', () => {
  const applet = APPLET_CATALOGUE.find((item) => item.id === 'seedhouse');
  const definition = COLLECTION_ROOM_DEFINITIONS.seedhouse;
  assert.equal(applet?.defaultVisible, true);
  assert.equal(applet?.category, 'worldseed');
  assert.equal(definition.attachments, true);
  assert.match(definition.description, /Worldseed Foundry/i);
  for (const field of ['seedType', 'mustSurvive', 'mayChange', 'mayBeLost', 'descendantsInherit', 'transferableSeed', 'lineageRefs', 'sourceRefs']) {
    assert.ok(definition.fields.some(([name]) => name === field), `missing Seedhouse field ${field}`);
  }
  const seedType = definition.fields.find(([name]) => name === 'seedType');
  assert.ok(seedType[4].includes('World Constitution'));
  assert.ok(seedType[4].includes('Continuity Genome'));
  assert.ok(seedType[4].includes('Ark Export'));
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

test('non-canon ingest is visible, attachment-backed, and has no direct canon status', () => {
  const applet = APPLET_CATALOGUE.find((item) => item.id === 'ingest');
  const definition = COLLECTION_ROOM_DEFINITIONS.ingest;
  assert.equal(applet?.defaultVisible, true);
  assert.equal(definition.attachments, true);

  const reviewField = definition.fields.find(([name]) => name === 'reviewStatus');
  const boundaryField = definition.fields.find(([name]) => name === 'canonBoundary');
  assert.ok(reviewField[4].includes('Canon candidate'));
  assert.equal(reviewField[4].includes('Canon'), false);
  assert.deepEqual(boundaryField[4], ['Non-canon source', 'Candidate for Steward review']);
});

test('Records Room archives writing and roleplay without automatic canon carry', () => {
  const applet = APPLET_CATALOGUE.find((item) => item.id === 'records');
  const definition = COLLECTION_ROOM_DEFINITIONS.records;
  assert.equal(applet?.defaultVisible, true);
  assert.equal(definition.attachments, true);
  assert.match(definition.description, /distinct from canon/i);
  for (const field of ['recordType', 'sceneMode', 'content', 'premaqcLineage', 'mathSpinePacket', 'soundReceipts', 'canonCarry', 'canonExcerpt']) {
    assert.ok(definition.fields.some(([name]) => name === field), `missing Records Room field ${field}`);
  }
  const carry = definition.fields.find(([name]) => name === 'canonCarry');
  assert.deepEqual(carry[4], ['Not requested', 'Requested for review', 'Carried excerpt to canon', 'Declined', 'Archived']);
});

test('world section rooms cover identity, safety, recall, companion, and theme', () => {
  for (const id of ['identity', 'safety-weave', 'continuity-recall', 'companion', 'theme']) {
    assert.ok(WORLD_SECTION_DEFINITIONS[id]);
  }
});
