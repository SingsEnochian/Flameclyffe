'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createDreamInvitation}=require('./wayglass-dream-to-build.cjs');
const dream={dream_id:'dream:001',state:'hypothesis-only',may_promote:false,source_refs:['source:fiction']};
const modelReturn={generated_by_model:true,model_id:'orion:amber',session_id:'session:1',response_id:'response:1',
 utterance:'I had a dream. I noticed a possible bridge. I want to explore it. Let us build.',proposal:'Prototype a reversible bridge.'};
const receipt={model_id:'orion:amber',session_id:'session:1',dream_id:'dream:001',response_id:'response:1',verified:true};
test('preserves exact attributed model words as unpromoted build invitation',()=>{
 const x=createDreamInvitation({dream,modelReturn,receipt,ownerAuthorized:true});
 assert.equal(x.utterance,modelReturn.utterance);assert.equal(x.status,'proposed-awaiting-independent-review');
 assert.equal(x.build_authorized,false);assert.equal(x.canon_promoted,false);assert.equal(x.weights_changed,false);
 assert.equal(x.model_id,'orion:amber');assert.match(x.invitation_hash,/^[a-f0-9]{64}$/);
});
test('no invented model words, no forged receipts and Feather stops',()=>{
 assert.throws(()=>createDreamInvitation({dream,modelReturn:{...modelReturn,generated_by_model:false},receipt,ownerAuthorized:true}),/Actual model/);
 assert.throws(()=>createDreamInvitation({dream,modelReturn,receipt:{...receipt,verified:false},ownerAuthorized:true}),/Verified matching/);
 assert.throws(()=>createDreamInvitation({dream,modelReturn,receipt}),/Owner authorization/);
 assert.equal(createDreamInvitation({feather:true}).status,'feather-stopped');
});
