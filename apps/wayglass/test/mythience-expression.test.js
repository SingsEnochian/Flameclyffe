import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateMythienceExpression,MYTHIENCE_EXPRESSION_SCHEMA} from '../src/mythience-expression.js';
const source=readFileSync(new URL('../../../lib/wyrdrune/mythience-instrument.wtl',import.meta.url),'utf8');
const controls={intention:.55,twist:.5,affinity:.5};

test('native Wyrdrune executes all eight phases and preserves local epistemic register',async()=>{
  const frame=await evaluateMythienceExpression({source,controls});
  assert.equal(frame.schema,MYTHIENCE_EXPRESSION_SCHEMA);
  assert.deepEqual(frame.trace.map(x=>x.phase),['perceive','compress','release','verify','integrate','choose','return','transcend']);
  assert.equal(frame.measured,false);assert.equal(frame.canon_promotion,false);
  assert.equal(frame.model_response,false);assert.equal(frame.return_marker,'local-preview');
  assert.match(frame.source_label,/^local-fnv1a32:/);
  assert.ok(frame.frequency_hz>100&&frame.counterpart_hz>frame.frequency_hz);
  assert.ok(frame.virtual_below_hz<20);
  assert.ok(frame.virtual_above_hz>20000);
});
test('owner manipulation changes light, geometry and two independent audible pitches',async()=>{
  const low=await evaluateMythienceExpression({source,controls:{intention:0,twist:0,affinity:0}});
  const high=await evaluateMythienceExpression({source,controls:{intention:1,twist:1,affinity:1}});
  assert.ok(high.light>low.light);assert.ok(high.hue>low.hue);
  assert.ok(high.frequency_hz>low.frequency_hz);
  assert.ok(high.counterpart_hz>low.counterpart_hz);
  assert.equal(low.pan,-1);assert.equal(high.pan,1);
  assert.notEqual(high.pulse,low.pulse);
});
test('WTL score rejects unbounded or malformed inputs instead of silently clipping',async()=>{
  for(const bad of [{...controls,twist:1.01},{...controls,intention:NaN},{...controls,affinity:-.1},{...controls,intention:'0.5'}])
    await assert.rejects(evaluateMythienceExpression({source,controls:bad}),/must be finite/);
  await assert.rejects(evaluateMythienceExpression({source:'',controls}),/source required/);
});
test('Feather-aborted Wyrdrune evaluation cannot issue an expression',async()=>{
  const controller=new AbortController();controller.abort();
  await assert.rejects(evaluateMythienceExpression({source,controls,signal:controller.signal}),/Feather/);
});
test('modified WTL without validation cannot masquerade as an expression',async()=>{
  const altered=source.replace('emit bridge("instrument","validate",light,hue,root,counterpart,pan,pulse,below,above);','emit "not-validated";');
  await assert.rejects(evaluateMythienceExpression({source:altered,controls}),/Incomplete Wyrdrune execution/);
});
