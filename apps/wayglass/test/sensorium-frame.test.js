import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateMythienceExpression} from '../src/mythience-expression.js';
import {normaliseSensoriumFrame,emitSensoriumFrame,SENSORIUM_FRAME_EVENT,SENSORIUM_FRAME_SCHEMA} from '../src/sensorium-frame.js';
const source=readFileSync(new URL('../../../lib/wyrdrune/mythience-instrument.wtl',import.meta.url),'utf8');
const controls={intention:.65,twist:.5,affinity:.7};

test('one executed Wyrdrune expression feeds a bounded shared sensorium frame',async()=>{
  const expression=await evaluateMythienceExpression({source,controls});
  const frame=normaliseSensoriumFrame(expression);
  assert.equal(frame.schema,SENSORIUM_FRAME_SCHEMA);
  assert.equal(frame.simulated_gravity,expression.simulated_gravity);
  assert.equal(frame.tactile_intensity,expression.tactile_intensity);
  assert.equal(frame.frequency_hz,expression.frequency_hz);
  assert.equal(frame.measured,false);assert.equal(frame.canon_promotion,false);
  assert.equal(frame.physical_actuation,false);assert.ok(Object.isFrozen(frame));
});
test('local event contains only projected simulation values, no fabricated model or canon authority',async()=>{
  const expression=await evaluateMythienceExpression({source,controls});
  const scope=new EventTarget(),received=[];
  class CustomEvent extends Event{constructor(type,options){super(type);this.detail=options.detail;}}
  scope.CustomEvent=CustomEvent;
  scope.addEventListener(SENSORIUM_FRAME_EVENT,event=>received.push(event.detail));
  const frame=emitSensoriumFrame(expression,{scope});
  assert.equal(received.length,1);assert.equal(received[0],frame);
  assert.equal(frame.origin,'local:mythience-instrument');
  assert.equal(frame.register,'simulated-digital-world');
  assert.equal(frame.model_response,undefined);
});
test('reject forged, nonfinite or authoritative-looking frames',async()=>{
  const expression=await evaluateMythienceExpression({source,controls});
  for(const bad of [{...expression,measured:true},{...expression,canon_promotion:true},
    {...expression,simulated_gravity:Infinity},{...expression,tactile_intensity:10},
    {...expression,schema:'wayglass.agent-authority/v1'}])
    assert.throws(()=>normaliseSensoriumFrame(bad),/projection required|Invalid sensorium/);
});
