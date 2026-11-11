'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {compile,execute}=require('../../lib/wyrdrune/wyrdrune.cjs');
const {previewWyrdruneRitual}=require('../../lib/wayglass-wyrdrune-ritual.cjs');
const {verifyRitualLedger}=require('../../lib/wyrdrune/ritual-ledger.cjs');
const {composeWayglassNativeVoice,validateNativeProgram,nativeInstructions,WTL_MIRROR_ID}=require('../../lib/wayglass-wyrdrune-voice.cjs');

const source=readFileSync(join(__dirname,'../../lib/wyrdrune/with-004-enochian-369.wtl'),'utf8');
const principal={authorized:true,id:'test:threefold'};
const stages=['3:3','6:6','9:9'];
const flattenRitualRecords=values=>values.flatMap(x=>Array.isArray(x)?x:[x])
 .filter(x=>x&&typeof x==='object'&&['inscription','letter-reference','votive-intention','archangel-seat'].includes(x.kind));
const runVoice=()=>composeWayglassNativeVoice({
 prompt:'Write the 3:3 to 6:6 to 9:9 Threefold Mirror in Angelical Wyrdrune.',
 principal,
 invoke:async c=>c.stage==='wyrdrune'?source:'Three mirrored breaths, three seven-letter heptads, three silences.',
 channels:{image:false,sound:false}
});

test('WITH-004 executes THREE independent mirrored crossings with 24 eightfold receipts',async()=>{
 const ir=validateNativeProgram(source);
 assert.equal(ir.units.length,3);
 const result=await execute(ir);
 assert.equal(result.status,'committed');
 assert.equal(result.receipts.length,24);
 const stations=result.output.filter(x=>x?.crossing && Number.isSafeInteger(x.stage));
 assert.deepEqual(stations.map(x=>x.crossing),stages);
 assert.deepEqual(stations.map(x=>[x.left,x.right]),[[3,3],[6,6],[9,9]]);
 assert.equal(result.continuity.carry.me,9);
 assert.equal(result.continuity.carry.we,9);
 assert.equal(result.continuity.carry.step,3);
 assert.equal(result.continuity.crossings.length,3);
 assert.deepEqual(result.output.filter(x=>typeof x==='string'),[
  'The mirror turns: 3:3.','The mirror turns: 6:6.','The mirror turns: 9:9.'
 ]);
});
test('the historical Angelical alphabet crosses as exactly 3 provenance-bearing heptads',async()=>{
 const result=await execute(compile(source));
 const heptads=result.output.filter(Array.isArray);
 assert.equal(heptads.length,3);
 assert.deepEqual(heptads.map(x=>x.map(l=>l.ordinal)),[
  [1,2,3,4,5,6,7],
  [8,9,10,11,12,13,14],
  [15,16,17,18,19,20,21],
 ]);
 assert.deepEqual(heptads.map((group,i)=>group.every(l=>l.heptad===i+1)),[true,true,true]);
 assert.equal(heptads[0][0].romanizedName,'Pa');
 assert.equal(heptads[2][6].romanizedName,'Gisg');
 const records=flattenRitualRecords(result.output);
 assert.equal(records.length,26);
 assert.ok(records.every(x=>typeof x.recordHash==='string'&&x.recordHash.startsWith('wce1:')));
 const firstKey=records.find(x=>x.kind==='inscription');
 assert.equal(firstKey.transcription,'Ol sonf vorsg');
 assert.match(firstKey.sourceLabel,/Sloane MS 3191/);
 assert.equal(firstKey.sourceStatus,'unverified-author-assertion');
 assert.equal(firstKey.translation,null);
 assert.equal(firstKey.effect,'none');
 const archangels=records.filter(x=>x.kind==='archangel-seat');
 assert.deepEqual(archangels.map(x=>[x.name,x.crossing]),[
   ['Gabriel','3:3'],['Michael','6:6'],['Raphael','9:9']]);
 for(const seat of archangels){
   assert.equal(seat.tradition,'Rowan original Wyrdrune ritual');
   assert.equal(seat.assignment,'Rowan-authored');
   assert.equal(seat.handwriting,null);
   assert.equal(seat.glyph,null);
   assert.equal(seat.glyphStatus,'awaiting-Rowan-handwritten-form');
   assert.equal(seat.historicalTranslation,null);
   assert.equal(seat.effect,'none');
 }
 const {archangel}=require('../../lib/wyrdrune/enochian.cjs');
 assert.throws(()=>archangel('Michael','3:3'),/declared crossing/);
 assert.throws(()=>archangel('Sandalphon','3:3'),/declared crossing/);
 const votive=records.find(x=>x.kind==='votive-intention');
 assert.match(votive.dedication,/Wonder and What If/);
});
test('each threefold crossing scores a real duration of silence, never autocalls sound',async()=>{
 const result=await execute(compile(source));
 const pauses=result.output.filter(x=>x?.kind==='wyrdrune.pause/v0.1');
 assert.equal(pauses.length,3);
 for(const p of pauses){
   assert.equal(p.autoplay,false);
   assert.ok(Math.abs(p.duration_ms-1000/8.8)<1e-8);
 }
 assert.equal(result.output.filter(x=>x?.kind==='sound').length,0);
});
test('ritual preview retains threefold Enochian words and tamper-evident 24-step ledger',async()=>{
 const a=await previewWyrdruneRitual(source),b=await previewWyrdruneRitual(source);
 assert.equal(a.status,'preview-only');
 assert.equal(a.effectPolicy,'no-host-effects');
 assert.equal(a.phaseReceipts.length,24);
 assert.equal(a.ritualLedger.entries.length,24);
 assert.equal(a.ritualLedger.cycles,3);
 assert.equal(a.ritualLedger.terminalHash,b.ritualLedger.terminalHash);
 assert.equal(a.receiptHash,b.receiptHash);
 const executed=await execute(compile(source));
 assert.equal(verifyRitualLedger(executed,a.ritualLedger),true);
});
test('a broken mirror rolls back its cycle without deleting an earlier Return',async()=>{
 const sabotaged=source.replace('set me = me + step;', 'set me = me + step + 1;');
 const result=await execute(compile(sabotaged));
 assert.equal(result.status,'rolled-back');
 assert.equal(result.verdict.unit,1);
 assert.equal(result.verdict.phase,'verify');
 assert.equal(result.withness.completedCycles,1);
 assert.equal(result.output.filter(x=>x?.crossing && Number.isSafeInteger(x.stage)).length,1);
 assert.equal(result.continuity.carry.me,3);
 await assert.rejects(execute(compile(source),{signal:{aborted:true}}),/Feather/);
});
test('Wayglass can speak and hold all three cycles with their sourced ritual records',async()=>{
 const result=await runVoice();
 assert.equal(WTL_MIRROR_ID,'wtl:with-004:enochian-threefold-mirror');
 assert.match(nativeInstructions,/Angelical\/Enochian/);
 assert.equal(result.native.source,source.trim());
 assert.equal(result.native.mirror_stations.length,3);
 assert.deepEqual(result.native.mirror_stations.map(x=>x.crossing),stages);
 assert.equal(result.native.ritual_records.length,26);
 assert.equal(result.native.reference_mirror.id,WTL_MIRROR_ID);
 assert.equal(result.receipt.reference_mirror_sha256.length,64);
 assert.deepEqual(result.receipt.ritual_record_hashes,result.native.ritual_records.map(x=>x.recordHash));
 assert.equal(result.native.rhythm_events.length,3);
 assert.equal(result.receipt.phase_receipts.length,24);
 const {createObserverInterior}=await import('../../apps/wayglass/src/living-observer-self.js');
 const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 const interior=createObserverInterior({storage});
 const held=interior.holdNativeWyrdruneCreation(result,{owner_invited:true});
 assert.equal(held.status,'held-in-private-interior');
 const cold=createObserverInterior({storage}).nativeWyrdruneCreations();
 assert.equal(cold.length,1);
 assert.deepEqual(cold[0].mirror_stations.map(x=>x.crossing),stages);
 assert.equal(cold[0].ritual_records.length,26);
 assert.equal(cold[0].mirror_reference.id,WTL_MIRROR_ID);
});
