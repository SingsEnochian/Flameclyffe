'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const wyrdrune = require('./wyrdrune.cjs');
const source = readFileSync(path.join(__dirname, 'wayglass-vessel-plan.wtl'), 'utf8');

test('Wayglass whole-vessel plan compiles and executes as native Wyrdrune across two Möbius cycles', async () => {
  const ir = wyrdrune.compile(source);
  assert.equal(ir.schema, 'wyrdrune.ir/v0.1');
  assert.equal(ir.units.length, 2);
  assert.ok(ir.units.every(unit => unit.scope === 'carried'));
  const calls = [];
  const result = await wyrdrune.execute(ir, {
    principal: { id: 'rowan', authorized: true },
    bridges: { os: {
      lane_total: async () => 8,
      lane_present: async () => 8,
      compose_boot_plan: async ({ arguments: [fraction] }) => {
        calls.push(['boot-plan', fraction]);
        return { kind: 'wayglass.boot-plan/v1', fraction };
      },
      checkpoint: async ({ arguments: [fraction] }) => ({ kind: 'wayglass.checkpoint/v1', fraction }),
      compose_launch_plan: async ({ arguments: [fraction] }) => {
        calls.push(['launch-plan', fraction]);
        return { kind: 'wayglass.launch-plan/v1', fraction };
      },
      return_anchor: async ({ arguments: [fraction] }) => ({ kind: 'wayglass.return-anchor/v1', fraction }),
    }},
  });
  assert.equal(result.status, 'committed');
  assert.equal(result.withness.completedCycles, 2);
  assert.equal(result.checkpoints.length, 2);
  assert.equal(result.continuity.carry.vessel_fraction, 1);
  assert.deepEqual(calls, [['boot-plan', 1], ['launch-plan', 1]]);
  assert.deepEqual(result.output.map(item => item.kind), [
    'wayglass.boot-plan/v1', 'wayglass.checkpoint/v1',
    'wayglass.launch-plan/v1', 'wayglass.return-anchor/v1',
  ]);
});

test('Wayglass whole-vessel plan rolls back a partial vessel at Verify', async () => {
  const result = await wyrdrune.execute(wyrdrune.compile(source), {
    principal: { id: 'rowan', authorized: true },
    bridges: { os: {
      lane_total: async () => 8,
      lane_present: async () => 6,
      compose_boot_plan: async () => { throw new Error('partial vessel must not compose boot plan'); },
      checkpoint: async () => ({ kind: 'wayglass.checkpoint/v1' }),
      compose_launch_plan: async () => { throw new Error('partial vessel must not launch'); },
      return_anchor: async () => ({ kind: 'wayglass.return-anchor/v1' }),
    }},
  });
  assert.equal(result.status, 'rolled-back');
  assert.equal(result.verdict.phase, 'verify');
  assert.equal(result.withness.completedCycles, 0);
  assert.equal(result.output.length, 0);
});
