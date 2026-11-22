import test from 'node:test';import assert from 'node:assert/strict';
import {createShipResonance,SHIP_ORGANS} from './ship-resonance.mjs';
test('shipwide organ identities survive event projection',()=>{
 const a=createShipResonance();assert.equal(a.snapshot().members.length,SHIP_ORGANS.length);
 const before=a.snapshot().members.map(x=>[x.id,x.frequency]);
 const after=a.observe({organ:'wayglass:writing',kind:'typed',strength:0.4});
 assert.deepEqual(after.members.map(x=>[x.id,x.frequency]),before);
 assert.equal(after.events[0].organ,'wayglass:writing');
 assert.equal(after.members.find(x=>x.id==='wayglass:observer').revision,0);
});
test('bounded receipts, Feather stop and explicit resume',()=>{
 const a=createShipResonance({capacity:2});
 for(let i=0;i<3;i++)a.observe({organ:'wayglass:codex',kind:'edit'});
 assert.equal(a.snapshot().events.length,2);
 a.feather();const seq=a.snapshot().sequence;a.observe({organ:'wayglass:codex'});
 assert.equal(a.snapshot().sequence,seq);assert.throws(()=>a.resume(),/Explicit/);
 a.resume({authorized:true});assert.equal(a.observe({organ:'wayglass:codex'}).sequence,seq+1);
});
test('refuse unscoped organ events and nonfinite strengths',()=>{
 const a=createShipResonance();assert.throws(()=>a.observe({organ:'evil'}),/Unknown/);
 assert.throws(()=>a.observe({organ:'wayglass:magic',strength:Infinity}),/Invalid/);
 assert.throws(()=>createShipResonance({organs:['x','x']}),/Distinct/);
});
