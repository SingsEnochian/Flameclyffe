import test from 'node:test';import assert from 'node:assert/strict';
import {createMiniMindGloss,MINIMIND_MODEL} from './mobius-nursery-minimind.mjs';
const endpoint='http://127.0.0.1:8000/v1/chat/completions';
const participant={id:'mote:a'},consent={'mote:a':true};
test('local attributed inference yields proposal, never canon',async()=>{
 let seen;const gloss=createMiniMindGloss({endpoint,fetchImpl:async(url,options)=>{seen={url,options};return {ok:true,json:async()=>({choices:[{message:{content:'Perhaps a spiralling greeting.'}}]})};}});
 const r=await gloss({phrase:'Solsolyu',participant,consent});
 assert.equal(r.status,'proposal');assert.equal(r.canon_adopted,false);assert.equal(r.persisted,false);assert.equal(r.model,MINIMIND_MODEL);
 assert.equal(seen.url,endpoint);assert.equal(JSON.parse(seen.options.body).messages[1].role,'user');
});
test('no consent and Feather never invoke model',async()=>{
 let calls=0;const gloss=createMiniMindGloss({endpoint,fetchImpl:async()=>{calls++;throw Error('must not call');}});
 assert.equal((await gloss({phrase:'Yu',participant,consent:{}})).status,'declined');
 assert.equal((await gloss({phrase:'Yu',participant,consent,feather:true})).status,'stopped');
 assert.equal(calls,0);
});
test('rejects remote endpoints, missing attribution and invalid responses',async()=>{
 assert.throws(()=>createMiniMindGloss({endpoint:'https://remote.example/v1/chat/completions'}));
 const gloss=createMiniMindGloss({endpoint,fetchImpl:async()=>({ok:true,json:async()=>({choices:[]})})});
 await assert.rejects(gloss({phrase:'Yu',participant,consent}));
 await assert.rejects(gloss({phrase:'Yu',participant:{id:'bad id'},consent}));
});

test('cloud route is same-origin proxy only and requires owner-authorised client context',async()=>{
 const path='/api/v1/wayglass/models/minimind/gloss';
 assert.throws(()=>createMiniMindGloss({route:'cloud',endpoint:path}));
 assert.throws(()=>createMiniMindGloss({route:'cloud',ownerAuthorised:true,endpoint:'https://provider.example/v1/chat/completions'}));
 let called=0;
 const gloss=createMiniMindGloss({route:'cloud',ownerAuthorised:true,endpoint:path,fetchImpl:async(url)=>{called++;assert.equal(url,path);return {ok:true,json:async()=>({choices:[{message:{content:'Possible meaning'}}]})};}});
 const result=await gloss({phrase:'Solsolyu',participant,consent});
 assert.equal(result.endpoint_kind,'owner-cloud-proxy');
 assert.equal(result.persisted,false);
 assert.equal(called,1);
});
