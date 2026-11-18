import test from 'node:test';
import assert from 'node:assert/strict';
import {atelierRuntimeSnapshot} from '../src/surfaces/wtl-interface-atelier.js';
const mount=()=>{};
test('Atelier lists only actual registered, mountable rooms',()=>{
 const snap=atelierRuntimeSnapshot({surfaces:[{surface_id:'wayglass:toybox',label:'Toybox',mount},{surface_id:'invented:agent',label:'Fake'},{surface_id:'',mount}],route:null,sound:{}});
 assert.deepEqual(snap.rooms,[{id:'wayglass:toybox',label:'Toybox'}]);
 assert.equal(snap.source,'local-registered-runtime');
 assert.equal(snap.route,null);
});
test('Atelier reports observed provider and model only from supplied receipt',()=>{
 const snap=atelierRuntimeSnapshot({surfaces:[],route:{status:'completed',route_id:'bluebird',provider:'test-provider',model:'test-model',sequence:3},sound:{audio_enabled:true}});
 assert.equal(snap.route.model,'test-model');
 assert.equal(snap.route.sequence,3);
 assert.equal(snap.sound.audio_enabled,true);
 assert.equal(snap.sound.haptics_enabled,false);
});
test('Atelier sound is silent by default and Feather is reflected',()=>{
 const snap=atelierRuntimeSnapshot({surfaces:[],route:null,sound:{feather_stopped:true}});
 assert.deepEqual(snap.sound,{audio_enabled:false,haptics_enabled:false,feather_stopped:true});
 assert.equal(Object.isFrozen(snap.rooms),true);
});
