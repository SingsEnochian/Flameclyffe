'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compile, execute, PHASES } = require('./wyrdrune.cjs');
const { buildRitualLedger, verifyRitualLedger } = require('./ritual-ledger.cjs');
const { digest } = require('./canonical.cjs');
const { previewWyrdruneRitual } = require('../wayglass-wyrdrune-ritual.cjs');

function rite(name, value) {
  return [
    'mobius {',
    'perceive { let ' + name + ' = ' + value + '; }',
    'compress {}',
    'release {}',
    'verify { emit ' + name + '; }',
    'integrate {}',
    'choose {}',
    'return { emit votive("Light","Held"); }',
    'transcend { emit angelicLetter(21); }',
    '}',
  ].join('\n');
}
const source = rite('a', 1) + '\n' + rite('b', 2);

test('Eightfold receipt chain links every phase, source hash and emitted value', async () => {
  const execution = await execute(compile(source));
  const ledger = buildRitualLedger(execution);
  assert.equal(ledger.cycles, 2);
  assert.equal(ledger.entries.length, 16);
  assert.equal(ledger.entries[0].previousHash, ledger.root);
  assert.equal(ledger.entries[8].face, 'inner');
  assert.equal(ledger.entries[15].entryHash, ledger.terminalHash);
  for (let i = 0; i < ledger.entries.length; i++) {
    assert.equal(ledger.entries[i].phase, PHASES[i % 8]);
    assert.equal(ledger.entries[i].phaseIndex, i % 8 + 1);
    assert.equal(ledger.entries[i].cycle, Math.floor(i / 8) + 1);
    assert.equal(ledger.entries[i].previousHash, i === 0 ? ledger.root : ledger.entries[i-1].entryHash);
    const {entryHash,...payload} = ledger.entries[i];
    assert.equal(entryHash, digest(payload));
  }
  assert.equal(verifyRitualLedger(execution,ledger),true);
  assert.deepEqual(buildRitualLedger(execution),ledger);
});

test('phase reorder, source substitution and emitted-value changes invalidate return evidence', async () => {
  const execution = await execute(compile(source));
  const ledger = buildRitualLedger(execution);
  const changedOutput={...execution,output:[...execution.output]};
  changedOutput.output[0]=33;
  assert.equal(verifyRitualLedger(changedOutput,ledger),false);
  const reordered={...execution,receipts:[...execution.receipts]};
  [reordered.receipts[1],reordered.receipts[2]]=[reordered.receipts[2],reordered.receipts[1]];
  assert.equal(verifyRitualLedger(reordered,ledger),false);
  const changedSource={...execution,sourceHash:'f'.repeat(64)};
  assert.equal(verifyRitualLedger(changedSource,ledger),false);
  const corrupted={...ledger,entries:ledger.entries.map((v,i)=>i===6?{...v,emitted:333}:v)};
  assert.equal(verifyRitualLedger(execution,corrupted),false);
  const severed={...ledger,entries:ledger.entries.map((v,i)=>i===9?{...v,previousHash:ledger.root}:v)};
  assert.equal(verifyRitualLedger(execution,severed),false);
});

test('authenticated preview includes a stable evidence chain, not a prediction', async () => {
  const preview=await previewWyrdruneRitual(rite('a',1));
  const repeated=await previewWyrdruneRitual(rite('a',1));
  assert.equal(preview.receiptHash,repeated.receiptHash);
  assert.equal(preview.ritualLedger.entries.length,8);
  assert.equal(preview.ritualLedger.entries[0].face,'outer');
  assert.equal(preview.ritualLedger.assurance,'content-integrity-only; not signer-authenticated or ritual canon');
  assert.match(preview.ritualLedger.terminalHash,/^wce1:[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(preview).includes('prophecy'),false);
});

test('legacy incomplete or anomalous runtime receipts fail closed', async () => {
  const execution=await execute(compile(rite('a',1)));
  assert.throws(()=>buildRitualLedger({...execution,receipts:execution.receipts.slice(0,7)}),/Invalid Eightfold/);
  const wrong={...execution,receipts:execution.receipts.map((r,i)=>i===7?{...r,operations:0}:r)};
  assert.throws(()=>buildRitualLedger(wrong),/Invalid phase/);
  const omitted={...execution,output:execution.output.slice(1)};
  assert.throws(()=>buildRitualLedger(omitted),/Invalid phase|Unaccounted/);
});
