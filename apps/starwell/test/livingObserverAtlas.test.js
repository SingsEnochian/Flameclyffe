import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OBSERVER_ATLAS_SCHEMA,NOAA_SOURCES,CODATA_REFERENCE,
  parseNoaaTime,parseNoaaProduct,fetchNoaaAtlas,
  deriveCosmicClock,digitSum,numericRoot,deriveNumerology,geometrySVG,
} from '../../../starwell/deep-observer/living-observer-atlas.js';

test('NOAA 2026 object-array records are parsed, sorted and source labelled',()=>{
 const now=new Date('2026-10-26T21:40:00Z');
 const r=parseNoaaProduct('kp',[
   {time_tag:'2026-10-26T18:00:00',Kp:2.33},
   {time_tag:'2026-10-26T21:00:00',Kp:1.67},
 ],now);
 assert.equal(r.value,1.67);
 assert.equal(r.freshness,'fresh');
 assert.equal(r.observed_at,'2026-10-26T21:00:00.000Z');
 assert.equal(r.unit,'index');
 assert.equal(r.source,'NOAA Space Weather Prediction Center');
 assert.equal(r.url,NOAA_SOURCES.kp);
});

test('NOAA 2026 summary arrays accept numerical solar inputs with Z timestamps',()=>{
 const now=new Date('2026-10-26T21:00:00Z');
 const bz=parseNoaaProduct('bz',[{bt:8,bz_gsm:-2,time_tag:'2026-10-26T20:59:00Z'}],now);
 const v=parseNoaaProduct('speed',[{proton_speed:510,time_tag:'2026-10-26T20:58:00Z'}],now);
 const f=parseNoaaProduct('flux',[{flux:94,time_tag:'2026-10-26T20:00:00'}],now);
 assert.equal(bz.value,-2);assert.equal(v.value,510);assert.equal(f.value,94);
 assert.equal(v.unit,'km/s');assert.equal(bz.unit,'nT');assert.equal(f.unit,'sfu');
});

test('stale or out-of-range readings cannot be promoted into live geometry inputs',()=>{
 const now=new Date('2026-10-26T21:00:00Z');
 const stale=parseNoaaProduct('kp',[{Kp:2.3,time_tag:'2026-10-25T14:00:00'}],now);
 assert.equal(stale.freshness,'stale');assert.equal(stale.usable_for_display,false);
 assert.throws(()=>parseNoaaProduct('kp',[{Kp:99,time_tag:'2026-10-26T20:00:00'}],now),/no valid/);
 assert.throws(()=>parseNoaaProduct('kp',[['time_tag','Kp'],['2026-10-26T20:00:00','2']],now),/no valid/);
 assert.throws(()=>parseNoaaTime('not-a-date'),/bad NOAA timestamp/);
});

test('per-feed network failure never creates synthetic zero or hides independent success',async()=>{
 const expected=Object.values(NOAA_SOURCES);
 const now=new Date('2026-10-26T21:00:00Z');
 const mock=async(url)=>{
   if(url===NOAA_SOURCES.speed) throw new Error('network off');
   const kind=Object.entries(NOAA_SOURCES).find(([,value])=>value===url)[0];
   const record=kind==='kp'?{Kp:3}:kind==='bz'?{bz_gsm:-5}:{flux:125};
   return {ok:true,json:async()=>[{...record,time_tag:'2026-10-26T20:56:00Z'}]};
 };
 const result=await fetchNoaaAtlas({fetchImpl:mock,now});
 assert.equal(result.schema,OBSERVER_ATLAS_SCHEMA);
 assert.equal(Object.keys(result.readings).length,expected.length);
 assert.equal(result.readings.speed.status,'unavailable');
 assert.equal(result.readings.speed.reading,null);
 assert.equal(result.readings.kp.reading.value,3);
 assert.equal(result.readings.bz.reading.value,-5);
});

test('Julian Date exact reference and moon are independently labelled approximations',()=>{
 const jd=deriveCosmicClock(new Date('2000-01-01T12:00:00Z'));
 assert.equal(jd.julian_day,2451545);
 assert.match(jd.accuracy_note,/NOT a live JPL ephemeris/);
 const lunation=deriveCosmicClock(new Date(CODATA_REFERENCE.new_moon_reference_utc));
 assert.ok(lunation.illumination_fraction<.000001);
 assert.ok(Math.abs(jd.scale.light_seconds_per_au-499)<1);
});

test('numerology shows every digit and does not claim cosmic cause',()=>{
 assert.deepEqual(digitSum('2026-10-26').digits,[2,0,2,6,1,0,2,6]);
 const r=deriveNumerology({dateISO:'2026-10-26',word:'Rarity'});
 assert.equal(r.date_digit_sum,19);
 assert.deepEqual(r.date_reduction_path,[19,10,1]);
 assert.equal(r.date_root,1);
 assert.equal(r.full_digital_root,1);
 assert.equal(r.word_length,6);
 assert.equal(r.privacy.includes('never sent'),true);
 assert.match(r.validity,/Symbolic/);
 assert.equal(numericRoot(11,{preserveMasters:true}).value,11);
 assert.deepEqual(numericRoot(27).path,[27,9]);
 assert.throws(()=>deriveNumerology({dateISO:'2026-02-30'}),/invalid calendar day/);
});

test('sacred forms construct 19 circles, 13 nodes and two complete tetrahedra',()=>{
 const flower=geometrySVG('flower');
 const meta=geometrySVG('metatron');
 const stella=geometrySVG('merkaba');
 assert.equal((flower.match(/<circle /g)||[]).length,19);
 assert.equal((meta.match(/<circle /g)||[]).length,13);
 assert.equal((meta.match(/<line /g)||[]).length,78);
 assert.equal((stella.match(/<line /g)||[]).length,12);
 assert.doesNotMatch(flower,/<script|onload=/i);
 assert.throws(()=>geometrySVG('unknown'),/unknown geometric form/);
});
