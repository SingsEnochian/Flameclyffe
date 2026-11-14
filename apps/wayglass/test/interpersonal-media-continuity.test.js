import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createInterpersonalMediaContinuity} from '../src/interpersonal-media-continuity.js';
const ref='sha256:'+'a'.repeat(64);
const participants=[{id:'human',opt_in:true},{id:'ai-seat',opt_in:true}];
const make=(authorise=async()=>true)=>createInterpersonalMediaContinuity({owner_id:'owner',authorise});
test('eight decks share attributable modality events without raw media',async()=>{
 const bus=make();await bus.begin({encounter_id:'voyage',participants});
 await bus.emit({encounter_id:'voyage',participant_id:'human',deck:'voice',kind:'audio',ref,at_ms:12,consent_token:'grant1'});
 await bus.emit({encounter_id:'voyage',participant_id:'ai-seat',deck:'video',kind:'video',ref,at_ms:13,consent_token:'grant2'});
 const observer=await bus.project({encounter_id:'voyage',deck:'observer'});
 assert.equal(observer.events.length,2);
 assert.deepEqual(observer.events.map(e=>e.participant_id),['human','ai-seat']);
 assert.equal(observer.events[0].disposition,'proposal-not-persisted');
 assert.equal((await bus.project({encounter_id:'voyage',deck:'codex'})).events.length,0);
 assert.equal(bus.decks.length,8);
});
test('distinct opt-in and content addressing are mandatory',async()=>{
 const bus=make();
 await assert.rejects(bus.begin({encounter_id:'bad',participants:[participants[0],{id:'ai-seat',opt_in:false}]}),/opt in/);
 await bus.begin({encounter_id:'ok',participants});
 await assert.rejects(bus.emit({encounter_id:'ok',participant_id:'human',deck:'voice',kind:'audio',ref:'https://example.com/private',at_ms:1,consent_token:'grant'}),/Content-addressed/);
 await assert.rejects(bus.emit({encounter_id:'ok',participant_id:'outsider',deck:'voice',kind:'audio',ref,at_ms:1,consent_token:'grant'}),/Unknown participant/);
});
test('Feather blocks late asynchronous emit and read',async()=>{
 let release,entered;const gate=new Promise(r=>release=r);const waiting=new Promise(r=>entered=r);let delay=false;
 const bus=make(async()=>{if(delay){entered();await gate;}return true;});
 await bus.begin({encounter_id:'voyage',participants});
 delay=true;
 const pending=bus.emit({encounter_id:'voyage',participant_id:'human',deck:'voice',kind:'audio',ref,at_ms:1,consent_token:'grant'});
 await waiting;bus.feather();release();
 await assert.rejects(pending,/Feather/);
 await assert.rejects(bus.project({encounter_id:'voyage',deck:'observer'}),/Feather/);
});
test('revocation prevents projection and new media',async()=>{
 let allowed=true;const bus=make(async()=>allowed);
 await bus.begin({encounter_id:'voyage',participants});
 allowed=false;
 await assert.rejects(bus.project({encounter_id:'voyage',deck:'observer'}),/revoked/);
 await assert.rejects(bus.emit({encounter_id:'voyage',participant_id:'human',deck:'voice',kind:'audio',ref,at_ms:1,consent_token:'grant'}),/revoked/);
});
