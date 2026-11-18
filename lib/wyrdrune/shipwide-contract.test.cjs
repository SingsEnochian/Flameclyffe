'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { digest } = require('./canonical.cjs');
const mobius = require('../wayglass-mobius.cjs');

async function cell() {
  const { PHASES, createWyrdruneRuntime } = await import('./runtime.mjs');
  const source = fs.readFileSync(path.join(__dirname, 'shipwide-cell.wtl'), 'utf8');
  const runtime = createWyrdruneRuntime({hashSource: digest, continuityDigest: digest});
  return { PHASES, runtime, source, ir: runtime.compile(source) };
}

test('shipwide cell compiles against the canonical Eightfold phases and WCE-1', async () => {
  const { PHASES, ir } = await cell();
  assert.deepEqual(PHASES, ['perceive','compress','release','verify','integrate','choose','return','transcend']);
  assert.equal(typeof mobius.createLineage, 'function');
  assert.match(digest({ value: 3 }), /^wce1:[a-f0-9]{64}$/);
  assert.equal(ir.schema, 'wyrdrune.ir/v0.1');
  assert.equal(ir.units.length, 1);
  assert.deepEqual(ir.units[0].phases.map(p => p.phase), PHASES);
});

test('shipwide WTL cell executes a real carried crossing with Return receipt', async () => {
  const { runtime, ir } = await cell();
  const result = await runtime.execute(ir, { seeds: { value: 0 } });
  assert.equal(result.status, 'completed');
  assert.deepEqual(result.output, [3]);
  assert.equal(result.continuity.carry.value, 3);
  assert.equal(result.continuity.carry_digest, digest({ value: 3 }));
  assert.equal(result.checkpoints.length, 1);
  assert.equal(result.checkpoints[0].face, 'outer');
  assert.equal(result.withness.completedCycles, 1);
  assert.equal(result.receipts.some(r => r.phase === 'return'), true);
});

test('Feather stops a WTL cell before execution without producing a Return receipt', async () => {
  const { runtime, ir } = await cell();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(runtime.execute(ir, { seeds: { value: 0 }, signal: controller.signal }), /Feather/);
});

test('a failed Verify cannot publish staged WTL output', async () => {
  const { runtime, source } = await cell();
  const denied = source.replace('expanded == 3', 'expanded == 999');
  const result = await runtime.execute(runtime.compile(denied), { seeds: { value: 0 } });
  assert.equal(result.status, 'rolled-back');
  assert.deepEqual(result.output, []);
  assert.equal(result.receipts.some(r => r.phase === 'return'), false);
  assert.equal(result.continuity.carry.value, 0);
});
