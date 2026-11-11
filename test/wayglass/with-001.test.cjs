'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { compile, execute, PHASES } = require('../../lib/wyrdrune/wyrdrune.cjs');
const { extractWyrdrune, validateNativeProgram } = require('../../lib/wayglass-wyrdrune-voice.cjs');

const source = readFileSync(join(__dirname, '../../lib/wyrdrune/with-001.wtl'), 'utf8');
const ir = compile(source);

function harness() {
  const calls=[];
  return {
    calls,
    bridges: { expression: {
      image: ({ arguments: values }) => {
        calls.push({ kind: 'image', values });
        return { kind: 'image', hue: values[0], spread: values[1], depth: values[2] };
      },
      sound: ({ arguments: values }) => {
        calls.push({ kind: 'sound', values });
        return { kind: 'sound', fundamental: values[0], interval: values[1], texture: values[2] };
      },
    } },
  };
}

test('WITH-001 is native WTL accepted by the Wayglass voice gate', () => {
  assert.equal(extractWyrdrune(source), source.trim());
  assert.equal(validateNativeProgram(source).units.length, 1);
  assert.deepEqual(ir.units[0].phases.map(x => x.phase), PHASES);
});

test('WITH-001 preserves two tones, derives a third beat and makes separate proposals', async () => {
  const {calls, bridges} = harness();
  const out = await execute(ir, {bridges, principal: {id: 'with-001-test', authorized:true}});
  assert.equal(out.status, 'committed');
  assert.deepEqual(out.output.slice(0,5), ['WITH-001',220,223,3,121]);
  assert.equal(out.output[5].kind,'image');
  assert.equal(out.output[6].kind,'sound');
  assert.equal(out.output[7], 'with: distinct voices, shared pattern');
  assert.deepEqual(calls.map(x=>x.kind), ['image','sound']);
  assert.deepEqual(calls[0].values, [121,0.64,0.55]);
  assert.ok(Math.abs(calls[1].values[1] - 223/220) < 1e-12);
  assert.equal(out.receipts.length,8);
  assert.equal(out.withness.center, 'withness');
  assert.equal(out.checkpoints.length,1);
  assert.deepEqual(out.continuity.carry, {
    first_hz:220,second_hz:223,first_hue:38,second_hue:204,
  });
});

test('WITH-001 rolls back an invalid relation before expression', async () => {
  const invalid = compile(source.replace('let second_hz = 223;', 'let second_hz = 220;'));
  const {calls, bridges} = harness();
  const out = await execute(invalid, {bridges, principal: {id:'with-001-test',authorized:true}});
  assert.equal(out.status,'rolled-back');
  assert.deepEqual(out.output,[]);
  assert.equal(out.checkpoints.length,0);
  assert.deepEqual(calls,[]);
});

test('WITH-001 refuses unapproved expression calls and honours Feather', async () => {
  const {bridges} = harness();
  await assert.rejects(execute(ir,{bridges}), /verified owner/);
  await assert.rejects(execute(ir,{signal:{aborted:true},bridges,
    principal:{id:'with-001-test',authorized:true}}),/Feather/);
});
