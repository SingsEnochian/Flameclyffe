import test from 'node:test';
import assert from 'node:assert/strict';
import { ROTH_FOLD_LAYERS, rothFoldEnvelope, verifyRothFoldChain } from '../src/roth-fold.js';
test('all system layers use one eightfold contract and retain universe scope',()=>{
  let parent=null;const chain=[];
  for(const layer of ROTH_FOLD_LAYERS){
    const e=rothFoldEnvelope({layer,subject_id:layer,world_id:'psychic-universe',parent});
    chain.push(e);parent=e;
    assert.equal(e.phases.length,8);
    assert.equal(e.authority.route_dispatch,false);
  }
  assert.equal(verifyRothFoldChain(chain),true);
});
test('different universe parent is rejected',()=>{
 const p=rothFoldEnvelope({layer:'world',subject_id:'a'});
 assert.throws(()=>rothFoldEnvelope({layer:'memory',subject_id:'b',universe_id:'other',parent:p}));
});
test('no user-controlled input grants execution or persistence',()=>{
 const e=rothFoldEnvelope({layer:'model-route',subject_id:'openai:gpt',provenance:['proposal']});
 assert.equal(e.authority.verified,false);
 assert.equal(e.authority.character_write,false);
 assert.equal(e.continuity.persisted,false);
});
