import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
 SHIP_SENSORY_SCHEMA,SHIP_SENSORY_SOURCE,SHIP_SENSORY_CHANNEL,
 makeSensorySignal,acceptSensorySignal,ShipSensorySpine,
} from '../ship-ui/ship-sensory-spine.js';
import { describeShipSound } from '../ship-ui/ship-sensory-link.js';
const clock=1781360000000;
const instance='sensor-20261013-abcdef12345678';
const eventId='event-20261013-abcdef12345678';
const note=(overrides={})=>makeSensorySignal({
 kind:'note-on',worldId:'terra-aeterna',mode:'chromatic',frequencyHz:220,velocity:95,
 ...overrides,
},{now:clock,sourceInstance:instance,eventId});
const content=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('whole spine accepts only bounded non-authoritative local note observations',()=>{
 const s=note();
 assert.equal(s.schema,SHIP_SENSORY_SCHEMA);
 assert.equal(s.source,SHIP_SENSORY_SOURCE);
 assert.equal(s.canonical_receipt,false);
 assert.equal(s.navigation_command,false);
 assert.equal(s.identity_attested,false);
 assert.deepEqual(acceptSensorySignal(s,{now:clock}),s);
 assert.ok(Object.isFrozen(s));
});
test('transport rejects forged source, false authority, invalid world, hidden payload and replay ages',()=>{
 const s=note();
 for(const patch of [
  {schema:'wayglass.ship.nav-command/v1'},{source:'wayglass.remote.captain'},
  {authority:'kernel-authorised'},{frequency_hz:90000},
  {mode:'other-reality-command'},{velocity:128},{world_id:'../../private'},
  {event_id:'x'}, {source_instance:'y'},{sent_at_ms:clock-9000},
  {sent_at_ms:clock+8000},
 ]){
  assert.equal(acceptSensorySignal({...s,...patch},{now:clock}),null,JSON.stringify(patch));
 }
 const sanitized=acceptSensorySignal({...s,message:'private mission data',secrets:'DO NOT EXPORT'}, {now:clock});
 assert.equal(Object.hasOwn(sanitized,'message'),false);
 assert.equal(Object.hasOwn(sanitized,'secrets'),false);
});
test('feather strictly terminates glass activity without pretending navigation',()=>{
 const feather=makeSensorySignal({kind:'feather',worldId:'terra-aeterna',velocity:0},
  {now:clock,sourceInstance:instance,eventId});
 assert.equal(feather.frequency_hz,null);
 assert.equal(feather.mode,null);
 assert.match(describeShipSound(feather),/Feather Stop/);
 assert.equal(acceptSensorySignal({...feather,frequency_hz:440},{now:clock}),null);
 assert.equal(acceptSensorySignal({...feather,mode:'chromatic'},{now:clock}),null);
});
test('same-origin channel transport is explicit, ephemeral and never creates an audio feedback loop',()=>{
 const outbox=[];
 const source=new ShipSensorySpine({
  channelFactory:name=>{assert.equal(name,SHIP_SENSORY_CHANNEL);return{postMessage:value=>outbox.push(value),close:()=>{}};},
  sourceInstance:instance,now:()=>clock,
 });
 const receiver=new ShipSensorySpine({
  channelFactory:()=>({postMessage:()=>{throw Error('unexpected outbound reply')},close:()=>{}}),
  sourceInstance:'receiver-20261013-abcdefgh',now:()=>clock,
 });
 const received=[];
 const unsubscribe=receiver.subscribe(s=>received.push(s));
 assert.equal(source.available,true);
 assert.equal(source.publish({kind:'note-on',worldId:'terra-aeterna',mode:'chromatic',frequencyHz:220,velocity:95}),true);
 assert.equal(outbox.length,1);
 assert.equal(receiver.receive(outbox[0]),true);
 assert.equal(receiver.receive(outbox[0]),false,'duplicate event id must not replay');
 assert.equal(received.length,1);
 assert.match(describeShipSound(received[0]),/Presentation signal only/);
 assert.equal(source.publish({kind:'feather',worldId:'terra-aeterna',velocity:0}),true);
 assert.equal(receiver.receive(outbox[1]),true);
 assert.equal(received.at(-1).kind,'feather');
 assert.equal(outbox.length,2,'receivers must never echo inbound note events');
 unsubscribe();source.close();receiver.close();
 assert.equal(source.available,false);
 assert.equal(receiver.receive(outbox[0]),false);
 assert.equal(source.publish({kind:'feather',worldId:'terra-aeterna'}),false);
});
test('malformed sounds do not pass event creation or retain privileged fields',()=>{
 assert.throws(()=>makeSensorySignal({kind:'navigate',worldId:'terra-aeterna'},{
  now:clock,sourceInstance:instance,eventId,
 }),TypeError);
 assert.throws(()=>makeSensorySignal({kind:'note-on',worldId:'terra-aeterna',mode:'chromatic',frequencyHz:0},{
  now:clock,sourceInstance:instance,eventId,
 }),TypeError);
 assert.equal(acceptSensorySignal(null,{now:clock}),null);
 assert.equal(acceptSensorySignal([],{now:clock}),null);
});
test('the keyboard publishes only real started notes and Feather, receiving instruments never autoplay',()=>{
 const keyboard=content('../harmonic-keyboard/keyboard-ui.js');
 const pilot=content('../pilot-deck/index.html');
 const loom=content('../code-loom/index.html');
 const skin=content('../ship-ui/wayglass-skin.css');
 assert.match(keyboard,/const sensory=new ShipSensorySpine\(\)/);
 assert.match(keyboard,/if\(armed\)sensory\.publish/);
 assert.match(keyboard,/sensory\.publish\(\{kind:'feather'/);
 for(const html of [pilot,loom]){
  assert.match(html,/id="wayglass-sensory-status"/);
  assert.match(html,/ship-sensory-link\.js/);
 }
 const listener=content('../ship-ui/ship-sensory-link.js');
 assert.doesNotMatch(listener,/AudioContext|\.playSoundfontNote\(|\.sendMidi\(|\.vibrate\(/);
 assert.match(listener,/root\.dataset\.wayglassResonance='active'/);
 assert.match(skin,/data-wayglass-resonance='active'/);
 assert.match(skin,/prefers-reduced-motion/);
});
