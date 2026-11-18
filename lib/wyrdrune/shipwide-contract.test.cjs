'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { digest } = require('./canonical.cjs');
const mobius = require('../wayglass-mobius.cjs');
test('shipwide contract uses the canonical Eightfold phase ordering', async () => {
  const { PHASES, createWyrdruneRuntime } = await import('./runtime.mjs');
  assert.deepEqual(PHASES, ['perceive','compress','release','verify','integrate','choose','return','transcend']);
  assert.equal(typeof mobius.createLineage, 'function');
  assert.equal(typeof digest({ value: 3 }), 'string');
  const source = fs.readFileSync(path.join(__dirname, 'shipwide-cell.wtl'), 'utf8');
  const runtime = createWyrdruneRuntime({hashSource: digest, continuityDigest: digest});
  const ir = runtime.compile(source);
  assert.equal(ir.schema, 'wyrdrune.ir/v0.1');
  assert.equal(ir.units.length, 1);
  assert.deepEqual(ir.units[0].phases.map(p=>p.phase), PHASES);
});
