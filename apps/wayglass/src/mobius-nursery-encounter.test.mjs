import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter} from './mobius-nursery-encounter.mjs';
const left=Object.freeze({id:'mote:a',spin:0.2,revision:2});
const right=Object.freeze({id:'mote:b',spin:-0.4,revision:7});
const signal={kind:'wtl',value:'spiral',source:'local:fixture'};
const consent={'mote:a':true,'mote:b':true};
test('reciprocal proposal preserves identities and original state',()=>{
 const p=encounter({left,right,signal,consent});
 assert.equal(p.status,'proposal');assert.deepEqual(p.identity_spins,[0.2,-0.4]);
 assert.equal(p.proposed_revisions['mote:a'],3);assert.equal(p.proposed_revisions['mote:b'],8);
 assert.equal(left.revision,2);assert.equal(p.persisted,false);
 assert.deepEqual(encounter({left,right,signal,consent}),p);
});
test('Feather and unilateral refusal fail closed',()=>{
 assert.equal(encounter({left,right,signal,consent,feather:true}).status,'stopped');
 assert.equal(encounter({left,right,signal,consent:{'mote:a':true}}).status,'declined');
});
test('identity collision and unprovenanced signals rejected',()=>{
 assert.throws(()=>encounter({left,right:left,signal,consent}),/Distinct/);
 assert.throws(()=>encounter({left,right,signal:{...signal,source:''},consent}),/Attributed/);
});
