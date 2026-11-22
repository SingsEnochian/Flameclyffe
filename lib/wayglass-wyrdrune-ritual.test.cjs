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
  assert.equal(a.ritualLedger.entries.length,8);
  assert.equal(a.ritualLedger.terminalHash,b.ritualLedger.terminalHash);
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
  }), error => {
    assert.match(error.message, /Bridge capability unavailable/);
    assert.equal(error.reason, 'capability_unavailable');
    return true;
  });
});

test('preview honors Feather stop and operation ceilings', async () => {
  await assert.rejects(previewWyrdruneRitual(source, { signal: { aborted: true } }), error => {
    assert.match(error.message, /Feather/);
    assert.equal(error.reason, 'participant_stop');
    return true;
  });
  await assert.rejects(previewWyrdruneRitual(source, { maxOperations: 2 }), error => {
    assert.match(error.message, /budget/);
    assert.equal(error.reason, 'resource_limit');
    return true;
  });
});

test('kernel returns deterministic receipts for conditional collection lookup', async () => {
  const programme = source.replace('emit "arrived";',
    'emit if true then {notes: [3]}["notes"][0] else bridge("python","run"); ' +
    'emit if unknown then unseen else unseen;');
  const first = await previewWyrdruneRitual(programme);
  const second = await previewWyrdruneRitual(programme);
  assert.deepEqual(first.values.slice(3), [3, { wtl: 'unknown' }, 1]);
  assert.equal(first.phaseReceipts.length, 8);
  assert.equal(first.receiptHash, second.receiptHash);
});

test('kernel can require portable operator references before executing a preview', async () => {
  const checked = 'operator twice(n) = n * 2;\n' + source.replace('emit 1;', 'emit twice(2);');
  assert.deepEqual(await previewWyrdruneRitual(checked, { checkOperators: true }),
    await previewWyrdruneRitual(checked));
  const invalid = 'operator twice(n) = if true then n * 2 else bridge("python","run");\n' +
    source.replace('emit 1;', 'emit twice(2);');
  assert.equal((await previewWyrdruneRitual(invalid)).values.at(-1), 4);
  await assert.rejects(previewWyrdruneRitual(invalid, { checkOperators: true }), error => {
    assert.equal(error.reason, 'invalid_or_unsupported_wtl');
    assert.deepEqual(error.diagnostics, [{ operator: 'twice', code: 'nonportable-call', name: 'bridge' }]);
    return true;
  });
});

test('spiced WTL preview reports missing explicit seed as a technical requirement', async () => {
  const spiced = source.replace('mobius {', 'mobius spiced {');
  await assert.rejects(previewWyrdruneRitual(spiced), error => {
    assert.equal(error.reason, 'invalid_or_unsupported_wtl');
    assert.match(error.message, /spiceSeed/);
    return true;
  });
});

test('Feather prevents preview compilation before any ritual receipt is created', async () => {
  await assert.rejects(previewWyrdruneRitual('not valid WTL', {
    signal: { aborted: true },
  }), error => {
    assert.equal(error.reason, 'participant_stop');
    assert.match(error.message, /Feather/);
    return true;
  });
});

test('wonder preserves an unanswered question as a pure open value with a deterministic receipt', async () => {
  const programme = source.replace('emit "arrived";', 'emit wonder("What might become possible?");');
  const first = await previewWyrdruneRitual(programme);
  const second = await previewWyrdruneRitual(programme);
  assert.deepEqual(first.values[3], {
    kind: 'wyrdrune.wonder/v0.1',
    question: 'What might become possible?',
    answer: { wtl: 'unknown' },
    status: 'open',
  });
  assert.equal(first.receiptHash, second.receiptHash);
});

test('wonder requires a meaningful question without judging its subject', async () => {
  const programme = source.replace('emit "arrived";', 'emit wonder("");');
  await assert.rejects(previewWyrdruneRitual(programme), /wonder\(question\) requires nonempty text/);
});

test('Wonder crosses typed preview and pure operator preflight without being classified as an effect', async () => {
  const programme = source.replace('emit "arrived";', 'emit wonder("What else could be true?");');
  const typed = await previewWyrdruneRitual(programme, { typed: true });
  assert.equal(typed.values[3].kind, 'wyrdrune.wonder/v0.1');
  assert.equal(typed.values[3].status, 'open');
  const checked = await previewWyrdruneRitual(programme, { checkOperators: true });
  assert.equal(checked.values[3].question, 'What else could be true?');
});

test('Wonder accepts Unicode and speculative questions without changing open status', async () => {
  const question = '¿Y si la geometría pudiera cantar? ✧';
  const programme = source.replace('emit "arrived";', 'emit wonder(' + JSON.stringify(question) + ');');
  const result = await previewWyrdruneRitual(programme);
  assert.equal(result.values[3].question, question);
  assert.equal(result.values[3].status, 'open');
  assert.deepEqual(result.values[3].answer, { wtl: 'unknown' });
});

test('Wonder enforces the bounded question size without subject-matter filtering', async () => {
  const question = 'x'.repeat(1025);
  const programme = source.replace('emit "arrived";', 'emit wonder(' + JSON.stringify(question) + ');');
  await assert.rejects(previewWyrdruneRitual(programme), /at most 1024 characters/);
});
