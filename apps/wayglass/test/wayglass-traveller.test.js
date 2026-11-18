import test from 'node:test';
import assert from 'node:assert/strict';
import {TravellerSession,WORLDS} from '../src/traveller/traveller-session.js';

test('starts still without a counterfeit kernel receipt',()=>{
 const s=new TravellerSession(),v=s.snapshot();
 assert.equal(v.paused,true);assert.equal(v.entered,false);assert.equal(v.kernel_receipt,null);
 assert.equal(v.authority,'ephemeral-browser-view');assert.equal(s.step().z,v.z);
});
test('names and provenance are retained per destination',()=>{
 const s=new TravellerSession();
 for(const world of WORLDS){const v=s.enter(world.id);assert.equal(v.world_id,world.id);assert.ok(v.world.provenance);assert.equal(v.z,5);}
 assert.throws(()=>s.enter('other'),/Unknown Traveller destination/);
});
test('Feather prevents travel and resumes only on command',()=>{
 const s=new TravellerSession();s.enter();assert.ok(s.step().z<5);
 s.feather();const prior=s.snapshot();
 assert.equal(s.step().z,prior.z);assert.equal(s.turn(1).heading,prior.heading);
 assert.equal(s.resume().paused,false);assert.notEqual(s.step().z,prior.z);
});
test('navigation bounds and nonfinite values are safe',()=>{
 const s=new TravellerSession();s.enter();
 assert.equal(s.step(Infinity).z,5);
 for(let i=0;i<100;i++)s.step(1.5);
 assert.equal(s.snapshot().z,-14);
 for(let i=0;i<100;i++)s.step(-1.5);
 assert.equal(s.snapshot().z,14);
 s.turn(NaN);assert.equal(s.snapshot().heading,0);
});
test('a different world resets camera without merging state',()=>{
 const s=new TravellerSession();s.enter();s.turn(.3);s.step();s.feather();
 const next=s.enter('dreaming-grove');assert.equal(next.world_id,'dreaming-grove');
 assert.equal(next.x,0);assert.equal(next.z,5);assert.equal(next.heading,0);
});
