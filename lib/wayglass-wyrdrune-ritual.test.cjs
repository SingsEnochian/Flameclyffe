'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { previewWyrdruneRitual } = require('./wayglass-kernel.cjs');

const phases = [
  'perceive { let candle = votive("Lantern", "For a traveler and a ship"); }',
  'compress { let mark = angelicLetter(1); }',
  'release { let letter = enochian("Pa"); }',
  'verify { emit candle; }',
  'integrate { emit mark; }',
  'choose { emit letter; }',
  'return { emit "arrived"; }',
  'transcend { emit 1; }',
];
const source = 'mobius {\n' + phases.join('\n') + '\n}';

test('Wayglass kernel exports a deterministic eightfold read-only ritual preview', async () => {
  assert.equal(typeof previewWyrdruneRitual, 'function');
  const a = await previewWyrdruneRitual(source);
  const b = await previewWyrdruneRitual(source);
  assert.equal(a.schema, 'wayglass.wyrdrune-ritual-preview/v0.1');
  assert.equal(a.status, 'preview-only');
  assert.equal(a.effectPolicy, 'no-host-effects');
  assert.equal(a.phaseReceipts.length, 8);
  assert.equal(a.receiptHash, b.receiptHash);
  assert.ok(a.receiptHash.startsWith('wce1:'));
  assert.equal(a.values[0].kind, 'votive-intention');
  assert.equal(a.values[1].kind, 'letter-reference');
  assert.equal(a.values[2].kind, 'inscription');
  assert.equal(a.withness.center, 'withness');
});

test('preview cannot be granted provider, filesystem or model bridge capability', async () => {
  const bridged = source.replace('emit "arrived";', 'emit bridge("python","run",1);');
  await assert.rejects(previewWyrdruneRitual(bridged, {
    principal: { id: 'fake', authorized: true },
    bridges: { python: { run: () => 'forbidden' } },
  }), /Bridge capability unavailable/);
});

test('preview honors Feather stop and operation ceilings', async () => {
  await assert.rejects(previewWyrdruneRitual(source, { signal: { aborted: true } }), /Feather/);
  await assert.rejects(previewWyrdruneRitual(source, { maxOperations: 2 }), /budget/);
});
