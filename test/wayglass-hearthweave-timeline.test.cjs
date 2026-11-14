'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {composeTimeline}=require('../lib/wayglass-hearthweave-timeline.cjs');
const sample={laboratory:'hearthweave:laboratory',events:[{id:'h1',actor:'human',text:'I introduce change.'},{id:'a1',actor:'ai',text:'I offer a harmonic response.'}],introduced_change:{id:'change-001',description:'The laboratory gains an authored timeline score.'},trust:0.7,somatic:{intensity:0.3,consent:false}};
const principal={authorized:true};
test('WTL generates a non-playing 5.5 Hz stereo difference with attributable timeline',async()=>{
 const result=await composeTimeline(sample,{principal});
 assert.equal(result.score.beat_difference_hz,5.5);
 assert.equal(result.score.right_hz-result.score.left_hz,5.5);
 assert.equal(result.score.playback_authorized,false);
 assert.equal(result.audio_started,false);
 assert.equal(result.phase_receipts.length,8);
 assert.equal(result.bridge_to_bluebird.status,'not_attempted');
 assert.equal(result.laboratory_connection.status,'not_attempted');
});
test('explicit consent changes only playback permission, never auto-starts',async()=>{
 const result=await composeTimeline({...sample,somatic:{intensity:0.3,consent:true}},{principal});
 assert.equal(result.score.playback_authorized,true);
 assert.equal(result.audio_started,false);
});
test('unauthorised calls and invalid events fail closed',async()=>{
 await assert.rejects(composeTimeline(sample),/Authenticated owner/);
 await assert.rejects(composeTimeline({...sample,events:[sample.events[0],sample.events[0]]},{principal}),/unique/);
});
