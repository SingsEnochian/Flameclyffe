import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRecordedDreamVoyage} from '../src/recorded-dream-voyage.js';
test('all horizons produce Withness receipts and three synced media references',async()=>{
 const store=new Map();
 const args={dream_id:'voyage-001',universe_id:'wayglass',origin:'unchanged',change:'new signal',permission:true,
  propose:async({horizon})=>[{summary:`possibility ${horizon}`,assumptions:['unverified']}],
  read:async id=>structuredClone(store.get(id)||[]),
  write:async(id,events)=>store.set(id,structuredClone(events))};
 const voyage=createRecordedDreamVoyage(args);
 const first=await voyage.explore();
 assert.deepEqual(Object.keys(first.result.horizons),['one','multiple','long']);
 assert.equal(first.manifest.events.length,3);
 const tracks=['video','audio','transcription'].map((kind,i)=>({kind,asset_id:`asset-${i}`,sha256:'a'.repeat(64),start_ms:0,end_ms:100,raw:'never persist'}));
 const recorded=await voyage.saveMedia(tracks);
 assert.equal(recorded.manifest.asset_count,3);
 assert.equal(recorded.manifest.events.length,6);
 assert.equal(JSON.stringify(recorded.manifest).includes('never persist'),false);
 assert.equal(recorded.bundle.clock,'dream-monotonic-ms');
 const cold=createRecordedDreamVoyage(args);
 assert.equal((await cold.manifest()).events.length,6);
 await voyage.feather();
 await assert.rejects(voyage.saveMedia(tracks),/interrupted/);
});
test('recording requires explicit consent before simulation',()=>{
 assert.throws(()=>createRecordedDreamVoyage({dream_id:'d',universe_id:'u',origin:'o',change:'c',permission:false,propose:async()=>[],write:async()=>{},read:async()=>[]}),/permission/);
});
