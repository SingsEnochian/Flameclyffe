import test from 'node:test';import assert from 'node:assert/strict';
import {createSonicPlanPlayer} from '../src/sonic-plan-player.js';
const plan={type:'sf2-plan',requires_live_synth:true,event_id:'e',participant_id:'wayglass',source_receipt:'wtl',choice_receipt:'choice',intents:[{type:'note-on',channel:0,note:48,velocity:48},{type:'note-off',channel:0,note:48,velocity:0}]};
function fixture(){const sent=[];const tasks=new Map();let id=0;const player=createSonicPlanPlayer({synth:{send:i=>sent.push(i)},schedule:(f,ms)=>{tasks.set(++id,{f,ms});return id;},clearSchedule:id=>tasks.delete(id)});return {player,sent,tasks};}
test('refuses unauthorised sound and plays bounded notes with attributable receipt',()=>{const f=fixture();assert.equal(f.player.play(plan).played,false);const receipt=f.player.play(plan,{authorised:true,durationMs:320});assert.equal(receipt.source_receipt,'wtl');assert.equal(f.sent.at(-1).type,'note-on');assert.equal([...f.tasks.values()][0].ms,320);[...f.tasks.values()][0].f();assert.equal(f.sent.at(-1).type,'note-off');});
test('Feather cancels pending note and latches until explicit owner reset',()=>{const f=fixture();f.player.play(plan,{authorised:true});const pending=[...f.tasks.values()][0].f;f.player.feather();assert.equal(f.tasks.size,0);assert.equal(f.sent.filter(i=>i.type==='all-notes-off').length,32);pending();assert.equal(f.sent.at(-1).type,'all-notes-off');assert.equal(f.player.play(plan,{authorised:true}).played,false);assert.throws(()=>f.player.reset());f.player.reset({ownerAuthorised:true});assert.equal(f.player.play({...plan,event_id:'e-after-reset'},{authorised:true}).played,true);});
test('a second boop interrupts the first, preventing hanging notes',()=>{const f=fixture();f.player.play(plan,{authorised:true});const old=[...f.tasks.values()][0].f;f.player.play({...plan,event_id:'e2'},{authorised:true});old();assert.equal(f.player.snapshot().active,true);assert.equal(f.tasks.size,1);});
test('invalid plan and duration rejected',()=>{const f=fixture();assert.throws(()=>f.player.play(plan,{authorised:true,durationMs:5000}));assert.throws(()=>f.player.play({...plan,intents:[plan.intents[0]]},{authorised:true}));});

test('rejects forged MIDI and missing participant provenance before sending notes',()=>{const f=fixture();assert.throws(()=>f.player.play({...plan,intents:[{...plan.intents[0],note:200},plan.intents[1]]},{authorised:true}));assert.throws(()=>f.player.play({...plan,participant_id:''},{authorised:true}));assert.throws(()=>f.player.play({...plan,intents:[plan.intents[0],{...plan.intents[1],velocity:90}]},{authorised:true}));assert.equal(f.sent.length,0);});

test('rejects duplicate event replay even after note-off',()=>{const f=fixture();assert.equal(f.player.play(plan,{authorised:true}).played,true);[...f.tasks.values()][0].f();const before=f.sent.length;assert.deepEqual(f.player.play(plan,{authorised:true}),{played:false,reason:'replayed-event'});assert.equal(f.sent.length,before);});
test('synth send failure fails closed and does not replay',()=>{const sent=[];const player=createSonicPlanPlayer({synth:{send:i=>{sent.push(i);if(i.type==='note-on')throw Error('transport offline');}},schedule:()=>1,clearSchedule:()=>{}});assert.throws(()=>player.play(plan,{authorised:true}),/transport offline/);assert.equal(player.snapshot().active,false);assert.equal(player.play(plan,{authorised:true}).reason,'replayed-event');});

test('shared Feather stops SF2 and confirmed release never starts sound by itself',()=>{
 const scope=new EventTarget(),sent=[],tasks=new Map();let n=0;
 const player=createSonicPlanPlayer({eventScope:scope,synth:{send:i=>sent.push(i)},schedule:fn=>{tasks.set(++n,fn);return n;},clearSchedule:id=>tasks.delete(id)});
 const emit=(stopped,confirmed=false)=>{const e=new Event('wayglass:feather');Object.defineProperty(e,'detail',{value:{stopped,confirmed}});scope.dispatchEvent(e);};
 player.play(plan,{authorised:true});emit(true);assert.equal(player.snapshot().feather_latched,true);assert.equal(tasks.size,0);
 assert.equal(player.play({...plan,event_id:'blocked'},{authorised:true}).played,false);
 emit(false,true);assert.equal(player.snapshot().feather_latched,false);
 assert.equal(player.snapshot().active,false);
 assert.equal(player.play({...plan,event_id:'allowed'},{authorised:true}).played,true);
 player.dispose();assert.equal(player.snapshot().disposed,true);assert.equal(tasks.size,0);
 assert.equal(player.play({...plan,event_id:'after-dispose'},{authorised:true}).played,false);
 emit(false,true);assert.equal(player.snapshot().disposed,true);
});
