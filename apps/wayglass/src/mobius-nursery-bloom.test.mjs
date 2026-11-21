import test from 'node:test';
import assert from 'node:assert/strict';
import {composeNurseryBloom} from './mobius-nursery-bloom.mjs';
const proposal={status:'proposal',source:'local:fixture',participants:['a','b'],identity_spins:[0.2,-0.4],
 signal:{value:'hello'},proposed_field:{resonance:0.7,phase:0.6,kind:'wtl'}};
test('bloom is deterministic, bounded, and proposal-only',()=>{
 const a=composeNurseryBloom(proposal);
 assert.deepEqual(a,composeNurseryBloom(proposal));
 assert.ok(a.filaments.length>=6&&a.filaments.length<=24);
 assert.ok(a.filaments.every(p=>Object.values(p).every(Number.isFinite)));
 assert.equal(a.persisted,false);assert.equal(a.canon_adopted,false);
 assert.deepEqual(proposal.identity_spins,[0.2,-0.4]);
});
test('different utterances generate different filaments',()=>{
 assert.notDeepEqual(composeNurseryBloom(proposal).filaments,
 composeNurseryBloom({...proposal,signal:{value:'another thought'}}).filaments);
});
test('unconsented and malformed input fails closed',()=>{
 assert.throws(()=>composeNurseryBloom({...proposal,status:'declined'}));
 assert.throws(()=>composeNurseryBloom({...proposal,proposed_field:{...proposal.proposed_field,resonance:Infinity}}));
});

test('missing, duplicate, or invalid participant attribution fails closed',()=>{
 for(const participants of [undefined,[],['a'],['a','a'],['a',null],['','b']])
  assert.throws(()=>composeNurseryBloom({...proposal,participants}));
 assert.throws(()=>composeNurseryBloom({...proposal,source:''}));
 assert.throws(()=>composeNurseryBloom({...proposal,signal:{value:null}}));
});
