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

test('Kestrelle al’Var is canonical and earlier names remain provenance only', () => {
  const { state } = installCurrentHouseDrLibrary(createDefaultState(), NOW);
  const world = state.worlds.find((item) => item.houseSourceKey === 'taveren-vaen');
  const script = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-kestrelle-script');
  assert.equal(world.identity.name, 'Kestrelle al’Var');
  assert.equal(world.houseProfile.protagonist, 'Kestrelle al’Var');
  assert.equal(script.name, 'Ta’veren Vaen 01 — Kestrelle al’Var');
  assert.match(script.content, /I am Kestrelle al’Var\./);
  assert.match(script.content, /Kestrelle al’Valari, are provenance only/);
});

test('Ta’veren Vaen carries the Early Industrial Fourth Age technology baseline', () => {
  const { state } = installCurrentHouseDrLibrary(createDefaultState(), NOW);
  const world = state.worlds.find((item) => item.houseSourceKey === 'taveren-vaen');
  const wiki = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-universe-wiki');
  const kestrelle = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-kestrelle-script');
  assert.match(world.description, /approximately two thousand years after the Last Battle/i);
  assert.match(world.description, /Tar Valon and the White Tower endure/);
  assert.match(world.history, /Technology is advancing faster than institutions/);
  assert.match(world.rules, /archaeological technologies, not everyday conveniences/);
  for (const term of ['experimental railways', 'Power-assisted message relays', 'Flintlock firearms', 'Medicine', 'Earlier-age remnants']) {
    assert.match(wiki.content, new RegExp(term, 'i'));
  }
  assert.match(kestrelle.content, /What I carry on the road/);
  assert.match(kestrelle.content, /healer's satchel/);
});

test('White Tower continuity and Kestrelle recruitment replace the discarded later-Turning premise', () => {
  const { state } = installCurrentHouseDrLibrary(createDefaultState(), NOW);
  const world = state.worlds.find((item) => item.houseSourceKey === 'taveren-vaen');
  const wiki = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-universe-wiki');
  const kestrelle = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-kestrelle-script');
  assert.match(world.kind, /Fourth Age/);
  assert.match(wiki.content, /White Tower actively recruits/);
  assert.match(wiki.content, /Egwene al’Vere/);
  assert.match(wiki.content, /Cadsuane Melaidhrin/);
  assert.match(kestrelle.content, /fully recognised Wise Woman/);
  assert.match(kestrelle.content, /Yellow and Green/);
  assert.doesNotMatch(`${world.description}\n${world.history}\n${world.rules}\n${wiki.content}\n${kestrelle.content}`, /later Turning|long after the Fourth Age|re-emergence of Aes Sedai|No surviving institution owns it/i);
});

test('clean saidin supports sovereign Towers, consent-bound circles, and Kestrelle’s Asha’man mirror', () => {
  const { state } = installCurrentHouseDrLibrary(createDefaultState(), NOW);
  const world = state.worlds.find((item) => item.houseSourceKey === 'taveren-vaen');
  const wiki = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-universe-wiki');
  const kestrelle = state.scripts.find((item) => item.houseSourceKey === 'taveren-vaen-kestrelle-script');
  assert.match(world.history, /Saidin has remained clean/);
  assert.match(world.rules, /neither a subordinate White Tower annex nor merely a military barracks/);
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
