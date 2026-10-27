import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createShipKernel,SHIP_ROOMS} from '../src/ship-kernel.js';
import {classifyBridgeGesture} from '../src/ship-gestures.js';
import {detectEmbodiedAccess,HARDWARE_BOUNDARY} from '../src/embodiment-guard.js';
import {parseLorebook} from '../src/lorebook-dock.js';
import {runQubitCircuit} from '../src/quantum-sim.js';
import {createShipSoundDesk} from '../src/ship-sound.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('all ArcSweep and Wayglass decks share one recoverable ship kernel',async()=>{
 assert.equal(SHIP_ROOMS.length,8);
 const called=[];const records=[];
 const storage={map:new Map(),getItem(k){return this.map.get(k)},setItem(k,v){this.map.set(k,v)}};
 const kernel=createShipKernel({mount:async id=>{called.push(id);return id},
  storage,fetchImpl:async()=>({ok:true,status:200}),getXR:()=>null,secure:()=>false});
 const off=kernel.subscribe(s=>records.push(s.frame));
 await kernel.navigate('arcsweep:writing-room');
 await kernel.navigate('wayglass:living-observer');
 kernel.route({status:'started',routeId:'local:ollama'});
 kernel.route({status:'completed',routeId:'local:ollama'});
 assert.equal(kernel.state.route_status,'completed');
 assert.equal(kernel.state.deck,'wayglass:living-observer');
 kernel.theme('labradorite');
 assert.equal(storage.map.get('wayglass.ship.theme/v1'),'labradorite');
 const health=await kernel.health();
 assert.equal(health.host,'responding');
 assert.equal(health.xr_ar,false);
 assert.deepEqual(called,['arcsweep:writing-room','wayglass:living-observer']);
 await kernel.navigate('wayglass:living-observer',{recovery:true});
 assert.equal(kernel.state.recovered,true);
 assert.ok(records.includes('moving'));
 off();kernel.destroy();
});
test('unknown room is rejected and failed room does not masquerade as settled',async()=>{
 const kernel=createShipKernel({mount:async id=>{throw Error('sample mount failure')}});
 await assert.rejects(()=>kernel.navigate('external:unknown'),/Unknown Wayglass deck/);
 await assert.rejects(()=>kernel.navigate('wayglass:systems'),/sample mount failure/);
 assert.equal(kernel.state.frame,'fault');
 assert.equal(kernel.state.deck,null);
});
test('deliberate two-touch gesture works without ordinary one-finger scroll',()=>{
 assert.equal(classifyBridgeGesture([[{x:200,y:2},{x:50,y:6}],[{x:195,y:9},{x:43,y:13}]]),'next');
 assert.equal(classifyBridgeGesture([[{x:40,y:2},{x:180,y:6}],[{x:44,y:9},{x:184,y:13}]]),'previous');
 assert.equal(classifyBridgeGesture([[{x:20,y:2},{x:180,y:190}],[{x:44,y:9},{x:184,y:200}]]),null);
 assert.equal(classifyBridgeGesture([[{x:20,y:2},{x:180,y:3}]]),null);
});
test('embedded-device pathways remain outside the ship authority model',()=>{
 const p=detectEmbodiedAccess({navigator:{maxTouchPoints:1,vibrate:()=>true},
  AudioContext:function AudioContext(){}});
 assert.equal(p.audio_playback,true);
 assert.equal(p.output,'operating-system-selected-default-device');
 assert.equal(p.osia_link_verified,false);
 assert.equal(p.implant_access,'unsupported-and-intentionally-not-requested');
 for(const k of ['implant_pairing','bluetooth_scan','gatt_read','gatt_write','neurostimulation_control']){
  assert.equal(HARDWARE_BOUNDARY[k],false);
 }
});
test('local soundscape stays silent until direct start and Feather stops it',()=>{
 const listeners=new Map();
 const events={addEventListener(name,cb){listeners.set(name,cb)},
  removeEventListener(name){listeners.delete(name)}};
 const desk=createShipSoundDesk({AudioContextClass:null,events});
 assert.equal(desk.snapshot().mode,'silence');
 assert.throws(()=>desk.start('rain'),/unavailable/);
 listeners.get('wayglass:feather')({detail:{held:true}});
 assert.equal(desk.snapshot().held,true);
 assert.throws(()=>desk.start('rain'),/Feather held/);
 listeners.get('wayglass:feather')({detail:{held:false}});
 assert.equal(desk.snapshot().held,false);
 desk.destroy();assert.equal(listeners.size,0);
});
test('lorebook is local attributable unreviewed material, never committed by parse',()=>{
 const parsed=parseLorebook(JSON.stringify({source:'my archive',entries:[
  {name:'First Door',content:'An imagined bridge',source_ref:'owner:page-1'}]}));
 assert.equal(parsed.entries[0].source,'owner:page-1');
 assert.equal(parsed.entries[0].canon_commit,false);
 assert.equal(parsed.provider_transfer,false);
 assert.throws(()=>parseLorebook('{"something":1}'),/entries collection/);
 assert.throws(()=>parseLorebook('not json'),/valid JSON/);
});
test('Nikola quantum simulation is normalized, reversible and explicitly not hardware',()=>{
 const initial=runQubitCircuit([]);assert.equal(initial.result.probability_zero,1);
 const h=runQubitCircuit(['H']);
 assert.equal(h.result.probability_zero,.5);
 assert.equal(h.result.probability_one,.5);
 const hh=runQubitCircuit(['H','H']);
 assert.equal(hh.result.probability_zero,1);
 assert.equal(hh.result.probability_one,0);
 const x=runQubitCircuit(['X']);
 assert.equal(x.result.probability_one,1);
 assert.equal(x.hardware,'none');
 assert.equal(x.physical_universe_access,false);
 assert.throws(()=>runQubitCircuit(['NOPE']),/Unknown quantum gate/);
});
test('ship UI is integrated into all live mounts and preserves protected Crew routes',()=>{
 const main=read('../src/main.js');
 const writing=read('../src/surfaces/arcsweep-writing.js');
 const nikola=read('../src/surfaces/nikola-lab.js');
 const hud=read('../src/surfaces/observer-three-hud.js');
 const bridge=read('../src/ship-bridge-console.js');
 const shipDeck=read('../src/ship-deck.js');
 assert.match(main,/createShipKernel/);
 assert.match(main,/installShipDeck/);
 assert.match(main,/mountShipBridgeConsole/);
 assert.match(main,/createShipSoundDesk/);
 assert.match(main,/detectEmbodiedAccess/);
 assert.match(writing,/attachLorebookDock/);
 assert.match(writing,/speakExplicitText/);
 assert.match(writing,/refreshExternalTransfer/);
 assert.match(nikola,/mountQuantumConsole/);
 assert.match(hud,/async function enterXR/);
 assert.match(hud,/xr\.requestSession/);
 assert.match(hud,/function endXR/);
 assert.match(bridge,/Feather · Stop/);
 assert.match(bridge,/Recover deck/);
 assert.match(shipDeck,/prepareWayglassCrewRoom/);
 assert.match(shipDeck,/installShipGestures/);
});

test('global Feather bridges into Observer XR shutdown and unsubscribes safely',()=>{
 const observer=read('../src/surfaces/living-observer.js');
 const hud=read('../src/surfaces/observer-three-hud.js');
 assert.match(observer,/const onShipFeather=event=>/);
 assert.match(observer,/featherButton\.click\(\)/);
 assert.match(observer,/addEventListener\?\.\('wayglass:feather',onShipFeather\)/);
 assert.match(observer,/removeEventListener\?\.\('wayglass:feather',onShipFeather\)/);
 assert.match(observer,/void opticalDeck\?\.endXR\(\)/);
 assert.match(hud,/async function endXR\(\)/);
 assert.match(hud,/renderer\?\.setAnimationLoop\(null\)/);
});

test('voice dictation is browser-permission gated, unsent, and Feather stoppable',()=>{
 const writing=read('../src/surfaces/arcsweep-writing.js');
 const speech=read('../src/ship-dictation.js');
 assert.match(writing,/mountShipDictation\(root\)/);
 assert.match(writing,/disposeDictation\(\)/);
 assert.match(speech,/webkitSpeechRecognition/);
 assert.match(speech,/may process audio through an online service/);
 assert.match(speech,/control\.addEventListener\('click',click\)/);
 assert.match(speech,/wayglass:feather/);
 assert.match(speech,/input\.value\+=/);
 assert.doesNotMatch(speech,/invokeWayglassRoute|replyToVoyage|localStorage|fetch\(/);
});
