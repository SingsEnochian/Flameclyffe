import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateMythienceExpression} from '../src/mythience-expression.js';
import {normaliseSensoriumFrame} from '../src/sensorium-frame.js';
import {sensoriumWatercolorImpulse} from '../src/sensorium-watercolor.js';
import {colorChannels,createWatercolorFluid} from '../src/watercolor-fluid.js';
const source=readFileSync(new URL('../../../lib/wyrdrune/mythience-instrument.wtl',import.meta.url),'utf8');
test('WTL score drives actual fluid-compatible pigment and virtual terrain momentum',async()=>{
  const a=normaliseSensoriumFrame(await evaluateMythienceExpression({source,controls:{intention:0,twist:0,affinity:0}}));
  const b=normaliseSensoriumFrame(await evaluateMythienceExpression({source,controls:{intention:1,twist:1,affinity:1}}));
  const low=sensoriumWatercolorImpulse(a),high=sensoriumWatercolorImpulse(b);
  for(const impulse of [low,high]){
    assert.match(impulse.color,/^#[0-9a-f]{6}$/);
    assert.equal(colorChannels(impulse.color).length,3);
    assert.equal(impulse.persist,false);
    assert.equal(impulse.provenance,'local-Wyrdrune-simulation');
    const fluid=createWatercolorFluid({width:16,height:16});
    assert.doesNotThrow(()=>fluid.inject(impulse));
    fluid.dispose();
  }
  assert.notEqual(low.color,high.color);
  assert.notEqual(low.x,high.x);
  assert.notEqual(low.dy,high.dy);
});
test('watercolor rejects unvalidated or forged source frames',async()=>{
  const valid=normaliseSensoriumFrame(await evaluateMythienceExpression({source,controls:{intention:.5,twist:.5,affinity:.5}}));
  for(const bad of [{...valid,origin:'remote:unknown'},{...valid,measured:true},
    {...valid,simulated_gravity:Infinity},{...valid,light:5}])
    assert.throws(()=>sensoriumWatercolorImpulse(bad),/local sensorium|Invalid/);
});
