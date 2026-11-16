import test from 'node:test';import assert from 'node:assert/strict';
import {planWayglassSonicEvent} from '../src/sonic-event-router.js';
import {createSonicBoopConsent,grantSonicBoops} from '../src/sonic-boop-consent.js';
import {createSf2Catalogue,SF2_SCHEMA} from '../src/sf2-control.js';
const catalogue=createSf2Catalogue([{id:'local',label:'Authorised bank',licence:'Owner supplied',presets:[{bank:0,program:11,label:'Vibes'}]}]);
const sf2Choice={schema:SF2_SCHEMA,participant_id:'wayglass',mode:'instrument',soundfont_id:'local',bank:0,program:11,receipt:'model-receipt-1',reason:'Selected instrument'};
const event=(meaning)=>({id:'evt-1',source_receipt:'wtl-1',participant_id:'wayglass',meaning});
const enabled={catalogue,sf2Choice,boopConsent:grantSonicBoops(createSonicBoopConsent(),{ownerConfirmed:true}),ownerAudioEnabled:true,audioReady:true,bankAuthorised:true};
test('attributed presence can plan bounded SF2 notes, not play them',()=>{const x=planWayglassSonicEvent(event('presence'),enabled);assert.equal(x.type,'sf2-plan');assert.equal(x.requires_live_synth,true);assert.equal(x.source_receipt,'wtl-1');assert.equal(x.choice_receipt,'model-receipt-1');assert.equal(x.intents.length,2);});
test('changed perception and unconfirmed sound remain silent',()=>{assert.equal(planWayglassSonicEvent(event('perception'),enabled).type,'silent');});
test('mute and missing synth authorisation stop spontaneous audio',()=>{assert.equal(planWayglassSonicEvent(event('presence'),{...enabled,muted:true}).type,'silent');assert.equal(planWayglassSonicEvent(event('presence'),{...enabled,bankAuthorised:false}).type,'silent');});
test('Feather yields all-channel stop even with no audio readiness',()=>{const x=planWayglassSonicEvent(event('feather'));assert.equal(x.type,'stop');assert.equal(x.intents.length,16);assert.equal(planWayglassSonicEvent(event('presence'),{...enabled,feather:true}).type,'stop');});
test('no cross-participant instrument inheritance',()=>{assert.throws(()=>planWayglassSonicEvent({...event('presence'),participant_id:'bluebird'},enabled),/another participant/);});

test('default spontaneous permission cannot emit notes',()=>{const x=planWayglassSonicEvent(event('presence'),{...enabled,boopConsent:createSonicBoopConsent()});assert.equal(x.type,'silent');assert.equal(x.reason,'not-authorised');});
