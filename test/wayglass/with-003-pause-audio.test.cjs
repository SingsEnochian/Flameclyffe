'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');

test('Wayglass WebAudio schedules Amber silent beat without autoplay and Feather cancels the future notes',async()=>{
 const {createWayglassSoundPlayer}=await import('../../apps/wayglass/src/wyrdrune-response-media.js');
 const started=[];
 const closed=[];
 class FakeAudioContext {
   constructor(){this.currentTime=12;this.destination={};this.oscillators=[];}
   async resume(){}
   createGain(){return {gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};}
   createOscillator(){
     const osc={frequency:{value:0},connect(){},disconnect(){},start(t){started.push(t);},stop(t){closed.push(t);}};
     this.oscillators.push(osc);
     return osc;
   }
   async close(){}
 }
 const player=createWayglassSoundPlayer({scope:{AudioContext:FakeAudioContext}});
 const delayed={kind:'sound',fundamental:220,interval:1.04,texture:0.4,autoplay:false,lead_silence_ms:1000/8.8};
 assert.equal(started.length,0,'no score should play on creation');
 const out=await player.play(delayed);
 assert.equal(started.length,2);
 for(const time of started)assert.ok(Math.abs(time-(12+1/8.8))<1e-10);
 assert.ok(Math.abs(out.silence_seconds-1/8.8)<1e-10);
 assert.ok(Math.abs(out.duration_seconds-(2.55+1/8.8))<1e-10);
 player.stop();
 assert.ok(closed.length>=2,'Feather must stop scheduled oscillators');
 await assert.rejects(player.play({...delayed,lead_silence_ms:5000}),/scored silence/);
 await assert.rejects(player.play({...delayed,autoplay:true}),/user-invoked/);
 player.dispose();
});
