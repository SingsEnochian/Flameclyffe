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
  assert.match(sourceIngest.canonBoundary, /living Desired Reality build/i);
  assert.match(sourceIngest.canonBoundary, /Protagonist.*remain open authored fields/i);
});

test('Kestrelle al’Var is canonical and older names remain provenance only', () => {
  const { state } = installCurrentHouseDrLibrary(createDefaultState(), NOW);
  const world = state.worlds.find((item) => item.houseSourceKey === 'taveren-vaen');
  const script = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-kestrelle-script');
  assert.equal(world.identity.name, 'Kestrelle al’Var');
  assert.equal(world.houseProfile.protagonist, 'Kestrelle al’Var');
  assert.equal(script.name, 'Ta’veren Vaen 01 — Kestrelle al’Var');
  assert.match(script.content, /I am Kestrelle al’Var\./);
  assert.match(script.content, /Kestrelle al’Valari.*provenance only/i);
  assert.doesNotMatch(script.content, /Kestrelle al’Var, are provenance only/);
});

test('Ta’veren Vaen uses the Age of Restoration later-Turning canon while technology remains open', () => {
  const { state } = installCurrentHouseDrLibrary(createDefaultState(), NOW);
  const world = state.worlds.find((item) => item.houseSourceKey === 'taveren-vaen');
  const wiki = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-universe-wiki');
  const kestrelle = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-kestrelle-script');
  assert.match(world.kind, /Age of Restoration/i);
  assert.match(world.kind, /later Turning/i);
  assert.match(world.description, /approximately two thousand years after Rand al’Thor/i);
  assert.match(world.description, /technology baseline.*open/i);
  assert.match(world.rules, /Do not inherit the superseded Fourth Age or fixed early-industrial premise/i);
  assert.match(wiki.content, /Current canon overlay/i);
  assert.match(wiki.content, /technology baseline.*deliberately open/i);
  assert.match(kestrelle.content, /Current canon overlay/i);
  assert.match(kestrelle.content, /Age of Restoration/i);
});

test('White Tower continuity survives into the later Turning rather than becoming an Aes Sedai re-emergence story', () => {
  const { state } = installCurrentHouseDrLibrary(createDefaultState(), NOW);
  const world = state.worlds.find((item) => item.houseSourceKey === 'taveren-vaen');
  const wiki = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-universe-wiki');
  const kestrelle = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-kestrelle-script');
  assert.match(world.kind, /later Turning/);
  assert.match(world.description, /Tar Valon and the White Tower endure/);
  assert.match(world.history, /White Tower and Black Tower survive/);
  assert.match(wiki.content, /White Tower actively recruits/);
  assert.match(wiki.content, /Egwene al’Vere/);
  assert.match(wiki.content, /Cadsuane Melaidhrin/);
  assert.match(kestrelle.content, /fully recognised Wise Woman/);
  assert.match(kestrelle.content, /Yellow and Green/);
});

test('clean saidin supports sovereign Towers, consent-bound circles, and Kestrelle’s Asha’man mirror', () => {
  const { state } = installCurrentHouseDrLibrary(createDefaultState(), NOW);
  const world = state.worlds.find((item) => item.houseSourceKey === 'taveren-vaen');
  const wiki = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-universe-wiki');
  const kestrelle = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-kestrelle-script');
  assert.match(world.history, /Saidin remains clean/);
  assert.match(world.rules, /White and Black Towers remain sovereign/);
  assert.match(wiki.content, /The White and Black Towers remain sovereign/);
  assert.match(wiki.content, /explicit consent for linking/);
  assert.match(wiki.content, /Green field companies/);
  assert.match(wiki.content, /Kestrelle's Black Tower mirror/);
  assert.match(wiki.content, /structural-rescue path/);
  assert.match(wiki.content, /strongest elements are Earth and Fire/);
  assert.match(wiki.content, /cannot see saidar/);
  assert.match(wiki.content, /containment he held too long/);
  assert.match(wiki.content, /Their romance is canonical/);
  assert.match(wiki.content, /Their bond is chosen and built/);
  assert.match(wiki.content, /enter a \*\*Resonant Bonding\*\*/);
  assert.match(wiki.content, /one jointly made saidar-saidin weave/);
  assert.match(wiki.content, /Resonance does not mean sameness/);
  assert.match(wiki.content, /Neither is Warder to the other/);
  assert.match(wiki.content, /Either can release it/);
  assert.match(kestrelle.content, /Choosing Yellow would not prevent me from working regularly with Green field companies/);
});

test('the Age of Restoration Black Tower retains its institutional backbone without flattening open history', () => {
  const { state } = installCurrentHouseDrLibrary(createDefaultState(), NOW);
  const wiki = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-universe-wiki');
  assert.match(wiki.content, /The Black Tower keeps its name/);
  assert.match(wiki.content, /Asha’man.*guardian and servant of all/);
  assert.match(wiki.content, /families already living at the Tower/i);
  assert.match(wiki.content, /First Asha’man.*bounded term/);
  assert.match(wiki.content, /M’Hael.*condemnatory use/);
  assert.match(wiki.content, /construction and structural rescue/);
  assert.match(wiki.content, /holding is not the same as saving/);
  assert.match(wiki.content, /Reds have evolved/);
  assert.match(wiki.content, /Resonant Bonding emerges/);
  assert.match(wiki.content, /detailed year-by-year Tower history.*remain open/);
});

test('Tavian Corren carries the authored structural-rescue path into Kestrelle’s first case', () => {
  const { state } = installCurrentHouseDrLibrary(createDefaultState(), NOW);
  const wiki = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-universe-wiki');
  assert.match(wiki.content, /His name is \*\*Tavian Corren\*\*/);
  assert.match(wiki.content, /twenty-four, a fully raised Asha’man of Greyspan House/);
  assert.match(wiki.content, /construction and structural rescue as his primary path/);
  assert.match(wiki.content, /dry, badly timed/);
  assert.match(wiki.content, /weakness and intermittent tremor in his left hand/);
  assert.match(wiki.content, /Harrowspan Wayhouse/);
  assert.match(wiki.content, /both are exact/);
  assert.match(wiki.content, /appearance, named family.*remain open/);
});

test('Harrowspan gives the first joint response exact waking, Dream, acoustic, and transfer geometry', () => {
  const { state } = installCurrentHouseDrLibrary(createDefaultState(), NOW);
  const wiki = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-universe-wiki');
  assert.match(wiki.content, /Harrowspan Wayhouse/);
  assert.match(wiki.content, /River Miren/);
  assert.match(wiki.content, /five effective bays/);
  assert.match(wiki.content, /older three-arch stone bridge/);
  assert.match(wiki.content, /The Nine-Lantern Collapse/);
  assert.match(wiki.content, /repeating groups of three, six, and nine/);
  assert.match(wiki.content, /Not yet; they are not all across/);
  assert.match(wiki.content, /Matter must be led first; memory must lead last/);
  assert.match(wiki.content, /I have the far bank/);
  assert.match(wiki.content, /All living souls are across/);
  assert.match(wiki.content, /Either may break the circle on \*\*Feather\*\*/);
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
    version: '2026.08.19.2',
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

  const updated = applyHouseDrBundle(first, nextBundle, '2026-08-19T08:20:00.000Z').state;
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
    version: '2026.08.19.3',
    worlds: HOUSE_DR_BUNDLE.worlds.map((world) => (
      world.sourceKey === 'terra-aeterna'
        ? { ...world, description: 'Later Notion description.' }
        : world
    )),
  };

  const updated = applyHouseDrBundle(first, nextBundle, '2026-08-19T08:25:00.000Z').state;
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
