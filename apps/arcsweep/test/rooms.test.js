import assert from 'node:assert/strict';
import test from 'node:test';
import { APPLET_CATALOGUE } from '../src/applets.js';
import {
  AEMETH_DIAGRAM_ATLAS,
  AEMETH_INSTRUMENT_PROFILES,
  AEMETH_RITUAL_PHASES,
  createAemethReplayEnvelope,
} from '../src/aemeth-lens.js';
import {
  COLLECTION_ROOM_DEFINITIONS,
  IMPLEMENTED_APPLET_IDS,
  WORLD_SECTION_DEFINITIONS,
  createEmptyRoomCollections,
  normaliseRoomCollections,
} from '../src/rooms.js';

test('every room-routed applet resolves to an implemented room', () => {
  const missing = APPLET_CATALOGUE
    .filter((item) => !item.pagesHref)
    .map((item) => item.id)
    .filter((id) => !IMPLEMENTED_APPLET_IDS.has(id));
  assert.deepEqual(missing, []);
});

test('launch-target applets are explicit deployed surfaces rather than fake rooms', () => {
  const launchables = APPLET_CATALOGUE.filter((item) => item.pagesHref);
  assert.ok(launchables.length > 0);
  for (const item of launchables) {
    assert.equal(IMPLEMENTED_APPLET_IDS.has(item.id), false, `${item.id} should launch its canonical organ rather than masquerade as a room`);
    assert.match(item.pagesHref, /^\/Flameclyffe\//);
  }
});

test('Kelyran School is a visible implemented language room', () => {
  const applet = APPLET_CATALOGUE.find((item) => item.id === 'kelyran-school');
  assert.equal(applet?.defaultVisible, true);
  assert.equal(applet?.category, 'language');
  assert.equal(IMPLEMENTED_APPLET_IDS.has('kelyran-school'), true);
});

test('Seedhouse is a visible worldseed room with inheritance, lineage, and Continuity Genome fields', () => {
  const applet = APPLET_CATALOGUE.find((item) => item.id === 'seedhouse');
  const definition = COLLECTION_ROOM_DEFINITIONS.seedhouse;
  assert.equal(applet?.defaultVisible, true);
  assert.equal(applet?.category, 'worldseed');
  assert.equal(definition.attachments, true);
  assert.match(definition.description, /Worldseed Foundry/i);
  for (const field of [
    'seedType', 'mustSurvive', 'mayChange', 'mayBeLost', 'descendantsInherit', 'transferableSeed',
    'emotionalLaws', 'aestheticGrammar', 'cosmology', 'relationalPatterning', 'sacredTaboos',
    'characteristicTensions', 'harmonicIdentity', 'sensorySignature', 'narrativeGait', 'valuesCore',
    'lineageRefs', 'sourceRefs',
  ]) {
    assert.ok(definition.fields.some(([name]) => name === field), `missing Seedhouse field ${field}`);
  }
  const seedType = definition.fields.find(([name]) => name === 'seedType');
  assert.ok(seedType[4].includes('World Constitution'));
  assert.ok(seedType[4].includes('Continuity Genome'));
  assert.ok(seedType[4].includes('Ark Export'));
});

test('Aemeth Chamber is a visible observation room with a clean witness boundary', () => {
  const applet = APPLET_CATALOGUE.find((item) => item.id === 'aemeth-lens');
  const definition = COLLECTION_ROOM_DEFINITIONS['aemeth-lens'];
  assert.equal(applet?.defaultVisible, true);
  assert.equal(applet?.category, 'observation');
  assert.equal(IMPLEMENTED_APPLET_IDS.has('aemeth-lens'), true);
  assert.equal(definition.attachments, true);
  assert.match(definition.description, /Raw witness stays distinct from later interpretation/i);
  for (const field of [
    'instrumentProfile', 'phase', 'ask', 'observerRole', 'orientation', 'gazeMode',
    'activeDiagram', 'activeCall', 'departurePremaqc', 'chamberConfiguration', 'witnessRaw',
    'witnessTimestampNotes', 'transformationNotes', 'modelParticipant', 'modelWitnessLog',
    'interpretation', 'sourceRefs', 'runaReceipt', 'replayFingerprint', 'canonBoundary',
  ]) {
    assert.ok(definition.fields.some(([name]) => name === field), `missing Aemeth field ${field}`);
  }
  assert.ok(definition.fields.find(([name]) => name === 'instrumentProfile')[4].some((label) => /Shewstone 001/.test(label)));
  assert.ok(definition.fields.find(([name]) => name === 'activeDiagram')[4].includes('Sigillum Dei Aemeth'));
  assert.deepEqual(definition.fields.find(([name]) => name === 'modelParticipant')[4], ['Ox Alpha']);
  assert.deepEqual(definition.fields.find(([name]) => name === 'canonBoundary')[4], ['Private observation · non-canon', 'Candidate for Steward review']);
});

test('Aemeth instrument contract preserves physical, digital, and hybrid profiles', () => {
  assert.deepEqual(AEMETH_INSTRUMENT_PROFILES.map((item) => item.medium), ['physical', 'digital', 'hybrid']);
  const physical = AEMETH_INSTRUMENT_PROFILES[0];
  assert.match(physical.geometry, /subsurface Sigillum Dei Aemeth/i);
  assert.match(physical.observerAxis, /sphere/i);
  assert.equal(AEMETH_RITUAL_PHASES[0], 'Preparation');
  assert.equal(AEMETH_RITUAL_PHASES.at(-1), 'Replay review');
});

test('Aemeth diagram atlas keeps source variants explicit', () => {
  const ids = new Set(AEMETH_DIAGRAM_ATLAS.map((item) => item.id));
  for (const id of ['sigillum-dei-aemeth', 'holy-table', 'heptarchic-lamen', 'pele-ring', 'ensigns-of-creation', 'great-table', 'tablet-of-union', 'ninety-one-parts', 'liber-logaeth']) {
    assert.equal(ids.has(id), true, `missing Aemeth diagram ${id}`);
  }
  assert.match(AEMETH_DIAGRAM_ATLAS.find((item) => item.id === 'great-table').versionPolicy, /separate states/i);
});

test('Aemeth replay envelope keeps firsthand witness, OA witness, and interpretation separate', () => {
  const packet = createAemethReplayEnvelope({
    instrumentProfile: 'Aemeth Shewstone 001 · physical sphere',
    witnessRaw: 'Observed form',
    modelParticipant: 'Ox Alpha',
    modelWitnessLog: 'OA structural reading',
    interpretation: 'Later Rowan reading',
    replayFingerprint: 'sha256:test',
  });
  assert.equal(packet.schema, 'arcsweep.aemeth-replay/v1');
  assert.equal(packet.witnessRaw, 'Observed form');
  assert.equal(packet.modelParticipant, 'Ox Alpha');
  assert.equal(packet.modelWitnessLog, 'OA structural reading');
  assert.equal(packet.interpretation, 'Later Rowan reading');
  assert.notEqual(packet.witnessRaw, packet.modelWitnessLog);
  assert.notEqual(packet.witnessRaw, packet.interpretation);
  assert.equal(packet.replayFingerprint, 'sha256:test');
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
