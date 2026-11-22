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

test('signal modalities alter shared projection but never carried identity',()=>{
 const a=encounter({left,right,signal:{...signal,kind:'touch'},consent});
 const b=encounter({left,right,signal:{...signal,kind:'sound'},consent});
 assert.equal(a.proposed_field.kind,'touch');
 assert.ok(b.proposed_field.resonance>a.proposed_field.resonance);
 assert.equal(a.proposed_field.phase,b.proposed_field.phase);
 assert.equal(left.revision,2);assert.equal(right.revision,7);
 assert.equal(a.canon_adopted,false);assert.equal(b.persisted,false);
});

test('inherited consent never substitutes for either participant opt-in',()=>{
 const inherited=Object.create({'mote:a':true,'mote:b':true});
 assert.equal(encounter({left,right,signal,consent:inherited}).status,'declined');
 inherited['mote:a']=true;
 assert.equal(encounter({left,right,signal,consent:inherited}).status,'declined');
 inherited['mote:b']=true;
 assert.equal(encounter({left,right,signal,consent:inherited}).status,'proposal');
});
