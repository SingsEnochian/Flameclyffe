import test from 'node:test';
import assert from 'node:assert/strict';

import { HOUSE_DR_BUNDLE } from '../src/house-dr-bundle.js';
import { applyHouseDrBundle } from '../src/house-dr-library.js';
import { createDefaultState, installCurrentHouseDrLibrary } from '../src/storage.js';

const NOW = '2026-07-26T23:30:00.000Z';

test('fresh Arcsweep installs the complete Steward-approved House DR bundle', () => {
  const installed = installCurrentHouseDrLibrary(createDefaultState(), NOW);
  const expectedIngestRecords = HOUSE_DR_BUNDLE.documents.filter((item) => item.kind === 'source-ingest').length;

  assert.equal(installed.changed, true);
  assert.equal(installed.state.worlds.length, HOUSE_DR_BUNDLE.worlds.length);
  assert.equal(installed.state.scripts.length, HOUSE_DR_BUNDLE.documents.filter((item) => item.kind !== 'source-ingest').length);
  assert.equal(installed.state.records.ingest.length, expectedIngestRecords);
  assert.equal(installed.state.houseBundles.length, 1);
  assert.equal(installed.state.houseBundles[0].version, HOUSE_DR_BUNDLE.version);
  assert.equal(installed.state.worlds.some((world) => world.name === 'Unassigned World'), false);
  assert.equal(installed.state.scripts.some((script) => script.name === 'First DR Script'), false);
});

test('the bundle preserves Notion status and canon boundaries', () => {
  const { state } = installCurrentHouseDrLibrary(createDefaultState(), NOW);
  const kestrelle = state.scripts.find((script) => script.houseSourceKey === 'taveren-vaen-kestrelle-script');
  const foundation = state.scripts.find((script) => script.houseSourceKey === 'hearthweave-universal-dr-template');
  const sourceIngest = state.records.ingest.find((record) => record.houseSourceKey === 'recreators-canon-source-ingest');

  assert.equal(kestrelle.status, 'In Review');
  assert.equal(foundation.status, 'Canon');
  assert.equal(sourceIngest.canonStatus, 'non-canon');
  assert.equal(sourceIngest.sourceClass, 'notion-source-reference');
  assert.match(sourceIngest.canonBoundary, /No Desired Reality protagonist/i);
});

test('relaunching the current bundle is idempotent', () => {
  const first = installCurrentHouseDrLibrary(createDefaultState(), NOW);
  const second = installCurrentHouseDrLibrary(first.state, '2026-07-26T23:31:00.000Z');

  assert.equal(second.changed, false);
  assert.equal(second.state.worlds.length, first.state.worlds.length);
  assert.equal(second.state.scripts.length, first.state.scripts.length);
  assert.equal(second.state.records.ingest.length, first.state.records.ingest.length);
});

test('a later source bundle updates untouched House fields and scripts', () => {
  const first = installCurrentHouseDrLibrary(createDefaultState(), NOW).state;
  const nextBundle = {
    ...HOUSE_DR_BUNDLE,
    version: '2026.07.27.1',
    worlds: HOUSE_DR_BUNDLE.worlds.map((world) => (
      world.sourceKey === 'terra-aeterna'
        ? { ...world, description: 'Updated from the authored Notion source.' }
        : world
    )),
    documents: HOUSE_DR_BUNDLE.documents.map((document) => (
      document.sourceKey === 'terra-aeterna-hearthlight-sleep-script'
        ? { ...document, content: 'Updated sleep script from Notion.' }
        : document
    )),
  };

  const updated = applyHouseDrBundle(first, nextBundle, '2026-07-27T00:00:00.000Z').state;
  const terra = updated.worlds.find((world) => world.houseSourceKey === 'terra-aeterna');
  const sleep = updated.scripts.find((script) => script.houseSourceKey === 'terra-aeterna-hearthlight-sleep-script');

  assert.equal(terra.description, 'Updated from the authored Notion source.');
  assert.equal(terra.houseProfile.description, 'Updated from the authored Notion source.');
  assert.equal(sleep.content, 'Updated sleep script from Notion.');
  assert.equal(sleep.houseBundleVersion, nextBundle.version);
});

test('a later source bundle preserves independent local world overrides and additions', () => {
  const first = installCurrentHouseDrLibrary(createDefaultState(), NOW).state;
  const terra = first.worlds.find((world) => world.houseSourceKey === 'terra-aeterna');
  terra.description = 'Rowan local field note that must remain.';
  first.worlds.push({ ...first.worlds[0], id: 'local-world', name: 'Private Local World', houseBundleManaged: false });
  first.scripts.push({ id: 'local-script', name: 'Private local script', worldId: 'local-world', world: 'Private Local World', status: 'Draft I', content: 'Local.', updatedAt: NOW });

  const nextBundle = {
    ...HOUSE_DR_BUNDLE,
    version: '2026.07.27.2',
    worlds: HOUSE_DR_BUNDLE.worlds.map((world) => (
      world.sourceKey === 'terra-aeterna'
        ? { ...world, description: 'Later Notion description.' }
        : world
    )),
  };

  const updated = applyHouseDrBundle(first, nextBundle, '2026-07-27T00:05:00.000Z').state;
  const updatedTerra = updated.worlds.find((world) => world.houseSourceKey === 'terra-aeterna');

  assert.equal(updatedTerra.description, 'Rowan local field note that must remain.');
  assert.equal(updatedTerra.houseProfile.description, 'Later Notion description.');
  assert.ok(updated.worlds.some((world) => world.id === 'local-world'));
  assert.ok(updated.scripts.some((script) => script.id === 'local-script'));
});

test('every managed document keeps a Notion source identity', () => {
  const { state } = installCurrentHouseDrLibrary(createDefaultState(), NOW);
  for (const script of state.scripts.filter((item) => item.houseBundleManaged)) {
    assert.ok(script.houseSourceKey);
    assert.match(script.houseSourceUrl, /^https:\/\/app\.notion\.com\//);
  }
  for (const record of state.records.ingest.filter((item) => item.houseBundleManaged)) {
    assert.ok(record.houseSourceKey);
    assert.match(record.houseSourceUrl, /^https:\/\/app\.notion\.com\//);
  }
});