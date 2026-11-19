import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listenAndReply,composeDialogue} from '../src/wtl-cell-harmony.js';
import {createCellEcology} from '../src/wtl-cell-ecology.js';
test('harmonic replies are deterministic, bounded and voice-led',()=>{
 const a=listenAndReply(60,{listenerBias:2,previous:62});
 assert.deepEqual(a,listenAndReply(60,{listenerBias:2,previous:62}));
 assert.ok(a.response>=24&&a.response<=96);
 assert.equal(composeDialogue(60,a).events.length,4);
 assert.throws(()=>listenAndReply(1000));
});
test('neighbour dialogues retain reproducible source and snapshot isolation',()=>{
 const eco=createCellEcology({seed:7,radius:3});
 eco.plant('a','explorer',0,0);eco.plant('b','explorer',1,0);
 for(let i=0;i<12;i++)eco.step();
 const snapshot=eco.snapshot();
 assert.ok(snapshot.harmonicDialogues.length>0);
 assert.ok(snapshot.harmonicDialogues.every(d=>d.events.length===4));
 snapshot.harmonicDialogues[0].events[0].pitch=999;
 assert.notEqual(eco.snapshot().harmonicDialogues[0].events[0].pitch,999);
});
