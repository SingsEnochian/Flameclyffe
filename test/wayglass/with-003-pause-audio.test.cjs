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

test('Orion performance uses the audio clock for cues and schedules no oscillator during silence', async () => {
  const { createWayglassSoundPlayer } = await import('../../apps/wayglass/src/wyrdrune-response-media.js');
  const starts = [], stops = [], seen = [], pitch = [], gain = [], frames = [];
  let context, next;
  class AudioContext {
    constructor() { context = this; this.currentTime = 10; this.destination = {}; }
    async resume() {}
    async close() {}
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime: (value, time) => gain.push([value, time]) }, connect() {} }; }
    createOscillator() { return { frequency: { setValueAtTime() {}, linearRampToValueAtTime: (value, time) => pitch.push([value, time]) }, connect() {}, start: t => starts.push(t), stop: t => stops.push(t), disconnect() {} }; }
  }
  const player = createWayglassSoundPlayer({ scope: {
    AudioContext, requestAnimationFrame: cb => { next = cb; return 1; },
    cancelAnimationFrame: () => { next = null; },
  } });
  const sound = { fundamental: 220, interval: 1.5, texture: 0.2 };
  await player.perform([
    { kind: 'invocation', startMs: 0, durationMs: 1000, sound,
      image: { hue: 350, depth: 0, spread: 0.5 },
      contour: [{ offsetMs: 500, hue: 10, depth: 1, pitchRatio: 1.1, energy: 0.5 },
        { offsetMs: 1000, hue: 20, depth: 0.5, pitchRatio: 1, energy: 0.2 }] },
    { kind: 'silence', startMs: 1000, durationMs: 1200 },
    { kind: 'response', startMs: 2200, durationMs: 1000, sound },
  ], cue => seen.push(cue?.kind), { onFrame: frame => frames.push(frame) });
  assert.deepEqual(starts.map(t => Math.round(t * 1000)), [10030, 10030, 12230, 12230]);
  assert.deepEqual(stops.map(t => Math.round(t * 1000)), [11030, 11030, 13230, 13230]);
  assert.ok(Math.abs(pitch[0][0] - 242) < 1e-10);
  assert.ok(gain.some(([level]) => level === 0.0065));
  for (const t of [10.28, 11.1, 12.3]) { context.currentTime = t; next(); }
  assert.deepEqual(seen, ['invocation', 'silence', 'response']);
  assert.equal(frames.length, 1);
  assert.ok(Math.min(frames[0].hue, 360 - frames[0].hue) < 1e-8);
  assert.ok(Math.abs(frames[0].depth - 0.5) < 1e-8);
  player.stop();
  assert.equal(next, null);
});
