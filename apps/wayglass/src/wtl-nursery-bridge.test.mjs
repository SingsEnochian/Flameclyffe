import test from 'node:test';import assert from 'node:assert/strict';
import {prepareNurserySignal} from './wtl-nursery-bridge.mjs';
import {encounter} from './mobius-nursery-encounter.mjs';
const consent={'nursery:a':true,'nursery:b':true};
test('WTL reaches reciprocal encounter with attributed source and distinct ordered meaning',()=>{
 const make=wtlSource=>prepareNurserySignal({kind:'wtl',wtlSource,consent});
 const a=make('wonder(tend(worldseed))'),b=make('tend(wonder(worldseed))');
 assert.notEqual(a.compiled.meaning,b.compiled.meaning);
 const result=encounter({left:{id:'nursery:a',spin:0.2,revision:0},right:{id:'nursery:b',spin:-0.4,revision:0},consent,signal:a.signal});
 assert.equal(result.status,'proposal');assert.equal(result.source,'wayglass:wtl-derivation');assert.equal(result.persisted,false);
});
test('no consent never compiles or carries signal',()=>{
 assert.deepEqual(prepareNurserySignal({kind:'wtl',wtlSource:'invalid(',consent:{'nursery:a':true,'nursery:b':false}}),{status:'declined'});
});
test('invalid WTL and long signals fail closed',()=>{
 assert.throws(()=>prepareNurserySignal({kind:'wtl',wtlSource:'erase(worldseed)',consent}));
 assert.throws(()=>prepareNurserySignal({kind:'word',value:'x'.repeat(257),consent}));
});

test('real participant IDs are accepted, invalid IDs and inherited grants fail closed',()=>{
 const participants=['nursery:a','nursery:b'];
 assert.equal(prepareNurserySignal({kind:'touch',value:'seed',participants,consent}).status,'ready');
 assert.throws(()=>prepareNurserySignal({kind:'touch',value:'seed',participants:['nursery:a','bad id'],consent}),/Distinct participants/);
 const inherited=Object.create({'nursery:a':true,'nursery:b':true});
 assert.equal(prepareNurserySignal({kind:'touch',value:'seed',participants,consent:inherited}).status,'declined');
});

test('Nursery transport limits are distinct from WTL vocabulary and consent decisions',()=>{
 assert.throws(()=>prepareNurserySignal({kind:'wtl',wtlSource:'x'.repeat(257),consent}),{name:'RangeError',message:/256-character transport limit/});
 assert.throws(()=>prepareNurserySignal({kind:'wtl',wtlSource:'explore(worldseed)',consent}),{name:'RangeError',message:/Unsupported WTL experimental transformation: explore/});
 assert.throws(()=>prepareNurserySignal({kind:'dream',value:'hello',consent}),{name:'RangeError',message:/Unsupported Nursery signal kind: dream/});
 assert.deepEqual(prepareNurserySignal({kind:'wtl',wtlSource:'x'.repeat(257),consent:{'nursery:a':true,'nursery:b':false}}),{status:'declined'});
});
