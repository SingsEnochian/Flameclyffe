'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sampledText, normalise } = require('../lib/hearthfire-analysis');

test('source analysis normalises provider output without certifying claims', () => {
  const result = normalise({ summary: 'A concise source description.', primary_class: 'speculative theory', notebooks: ['Research', 'Trends'], topics: ['dreaming'], source_claims: ['The source asserts a correspondence.'], epistemic_note: 'The assertion is not independently verified.' }, 'test', 'fixture');
  assert.equal(result.status, 'analysed');
  assert.equal(result.primaryClass, 'speculative theory');
  assert.deepEqual(result.notebooks, ['Research', 'Trends']);
  assert.match(result.boundary, /Source assertions remain distinct/);
});

test('source analysis keeps dates, mathematics, magic, and relationships as located source records', () => {
  const result = normalise({ dates: [{ label: 'Opening', value: 'July 2027', context: 'The worlds open.', source_locator: 'Opening note' }], mathematics: [{ label: 'Orbit', expression: 'T = 55s', variables: 'T', source_locator: 'Tone table' }], magic_and_correspondence: [{ label: 'Fire', system: 'Elements', value: 'gold', source_locator: 'Correspondence list' }], relationships: [{ subject: 'Clarion', relation: 'ascends as', object: 'Sariel', source_locator: 'Character bio' }] }, 'test', 'fixture');
  assert.equal(result.dates[0].value, 'July 2027');
  assert.equal(result.mathematics[0].expression, 'T = 55s');
  assert.equal(result.magicAndCorrespondence[0].source_locator, 'Correspondence list');
  assert.equal(result.relationships[0].object, 'Sariel');
});

test('long sources are sampled across their full span within the analysis budget', () => {
  const text = Array.from({ length: 120000 }, (_, index) => String(index % 10)).join('');
  const sampled = sampledText(text, 12000);
  assert.ok(sampled.length < 13000);
  assert.match(sampled, /sampled interval/);
});
