import test from 'node:test';
import assert from 'node:assert/strict';

import { HOUSE_DR_BUNDLE } from '../src/house-dr-bundle.js';
import {
  HOUSE_DR_FIELD_POPULATION_SCHEMA,
  getHouseDrPopulation,
  populateAllHouseDrWorlds,
} from '../src/house-dr-field-population.js';

test('all House worlds produce a DR field population record', () => {
  const records = populateAllHouseDrWorlds();
  assert.equal(records.length, HOUSE_DR_BUNDLE.worlds.length);
  for (const record of records) {
    assert.equal(record.schema, HOUSE_DR_FIELD_POPULATION_SCHEMA);
    assert.ok(record.sourceKey);
    assert.ok(record.fieldPacks.includes('../presets/dr-script-ultra-detailed.v0.1.json'));
    assert.equal(record.populationPolicy.unsupportedFieldsRemainOpen, true);
    assert.equal(record.populationPolicy.noInferenceWithoutReceipt, true);
  }
});

test('supported House profile fields populate with provenance', () => {
  const terra = getHouseDrPopulation('terra-aeterna');
  assert.equal(terra.sections.identity.name.status, 'known');
  assert.equal(terra.sections.identity.name.value, 'Falka Hearthlight');
  assert.equal(terra.sections.identity.name.provenance[0].field, 'protagonist');
  assert.match(terra.sections.worldProfile.description.value, /Hearthweave/i);
  assert.equal(terra.sections.history.status, 'partially-known');
  assert.equal(terra.sections.realityRules.status, 'partially-known');
});

test('unsupported detailed template fields remain explicitly open', () => {
  const luna = getHouseDrPopulation('luna');
  assert.equal(luna.sections.identity.birthday.status, 'open');
  assert.equal(luna.sections.identity.birthday.value, null);
  assert.equal(luna.sections.appearance.status, 'open');
  assert.equal(luna.sections.relationships.status, 'open');
  assert.equal(luna.sections.realityRules.timeRatio.status, 'open');
  assert.deepEqual(luna.sections.realityRules.alwaysRules, []);
});

test('canon documents remain referenced separately from populated field truth', () => {
  const momento = getHouseDrPopulation('a-momento-creatonis');
  assert.ok(momento.canonDocuments.length > 0);
  assert.equal(momento.populationPolicy.sourceDocumentsAreReferencesNotAutomaticFieldTruth, true);
  assert.ok(momento.canonDocuments.some((document) => /Sariel/i.test(document.title)));
});

test('unknown House source key returns null', () => {
  assert.equal(getHouseDrPopulation('definitely-not-a-world'), null);
});
