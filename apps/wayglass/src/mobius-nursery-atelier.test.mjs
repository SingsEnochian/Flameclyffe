import test from 'node:test';import assert from 'node:assert/strict';
import {composeAtelier,ATELIERS} from './mobius-nursery-atelier.mjs';
const bloom={schema:'wayglass.nursery-bloom/v0.1',kind:'word',resonance:0.4,
 filaments:[{x:0.5,y:0.2,z:0.1,scale:0.08},{x:-0.3,y:0.4,z:0.2,scale:0.06}]};
test('all four ateliers produce bounded reproducible studies',()=>{
 for(const mode of ATELIERS){const a=composeAtelier(bloom,mode);assert.deepEqual(a,composeAtelier(bloom,mode));assert.equal(a.points.length,2);assert.equal(a.persisted,false);}
});
test('art styles differ without mutating their source',()=>{
 assert.notDeepEqual(composeAtelier(bloom,'pigment').points,composeAtelier(bloom,'worldseed').points);
 assert.equal(bloom.filaments[0].x,0.5);
});
test('invalid studies fail closed',()=>{
 assert.throws(()=>composeAtelier(bloom,'unknown'));
 assert.throws(()=>composeAtelier({...bloom,filaments:[{x:Infinity,y:0,z:0,scale:0.1}]}));
});
