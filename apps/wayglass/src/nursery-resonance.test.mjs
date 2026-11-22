import test from 'node:test';import assert from 'node:assert/strict';
import {createResonanceField,RESONANCE_SCHEMA} from './nursery-resonance.mjs';
const cells=[{id:'nursery:one',hz:.3,phase:0},{id:'nursery:two',hz:.35,phase:.8},{id:'nursery:three',hz:.5,phase:-.8}];
const links=[{from:'nursery:one',to:'nursery:two',strength:.7},{from:'nursery:two',to:'nursery:three',strength:.5}];
test('deterministic field and retained independent identity',()=>{
 const a=createResonanceField({cells,links}),b=createResonanceField({cells,links});
 assert.deepEqual(a.step(400),b.step(400));
 assert.deepEqual(a.snapshot().members.map(x=>x.id),cells.map(x=>x.id));
 assert.deepEqual(a.snapshot().members.map(x=>x.naturalHz),cells.map(x=>x.hz));
 assert.equal(a.snapshot().schema,RESONANCE_SCHEMA);
 assert.equal(a.snapshot().source,'declared-simulation');
 assert.deepEqual(a.reset().members.map(x=>x.phase),cells.map(x=>x.phase));
});
test('coupled and uncoupled fields differ, without rewriting natural frequencies',()=>{
 const connected=createResonanceField({cells,links,coupling:1});
 const uncoupled=createResonanceField({cells,links,coupling:0});
 assert.notDeepEqual(connected.step(30).members.map(x=>x.phase),uncoupled.step(30).members.map(x=>x.phase));
 assert.deepEqual(connected.snapshot().members.map(x=>x.naturalHz),cells.map(x=>x.hz));
});
test('refuse duplicate/invalid identities, unsafe parameters, repeated links and unbounded work',()=>{
 assert.throws(()=>createResonanceField({cells:[cells[0],cells[0]]}),/Unique/);
 assert.throws(()=>createResonanceField({cells,links:[links[0],links[0]]}),/Duplicate/);
 assert.throws(()=>createResonanceField({cells,links:[{from:'nursery:one',to:'not-real'}]}),/Invalid/);
 assert.throws(()=>createResonanceField({cells,coupling:100}),/bounds/);
 assert.throws(()=>createResonanceField({cells:[{id:'x',hz:NaN,phase:0},cells[0]]}),/Finite/);
 assert.throws(()=>createResonanceField({cells}).step(2001),/Bounded/);
});
