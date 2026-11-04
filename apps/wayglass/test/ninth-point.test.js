import test from 'node:test';
import assert from 'node:assert/strict';
import {observePossibilities,executeNinePoint} from '../src/ninth-point.js';
const packet={schema:'wayglass.possibility/v1',id:'test:1',branches:[{id:'a',probability:0.8},{id:'b',probability:0.2}]};
test('observer weights change the chosen branch with recorded probabilities',()=>{
 const a=observePossibilities({packet,observer:'Rarity'});
 const b=observePossibilities({packet,observer:'Noct',weights:[1,10]});
 assert.deepEqual(a.selected,['a']);assert.deepEqual(b.selected,['b']);
 assert.equal(b.physicalMeasurement,false);
});
test('ninth point binds all four engines to an attributable observation',()=>{
 const result=executeNinePoint({id:'inquiry:1',intention:'Explore the ninth point',observer:'Rarity',branches:packet.branches});
 assert.equal(result.engines.schema,'wayglass.quad-engine/v0.1');
 assert.equal(result.continuity.sourcePacket,'inquiry:1');
 assert.equal(result.authorityGrant,false);
});
test('invalid probabilities and observer weights are rejected',()=>{
 assert.throws(()=>observePossibilities({packet:{...packet,branches:[{id:'a',probability:-1}]},observer:'Rarity'}));
 assert.throws(()=>observePossibilities({packet,observer:'Rarity',weights:[0,0]}));
});
