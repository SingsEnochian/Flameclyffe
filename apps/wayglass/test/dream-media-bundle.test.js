import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDreamMediaBundle} from '../src/dream-media-bundle.js';
const tracks=['video','audio','transcription'].map((kind,i)=>({kind,asset_id:'asset-'+i,sha256:'a'.repeat(64),start_ms:i*10,end_ms:100+i*10,text:'private transcript not retained'}));
test('synchronises three content-addressed tracks and excludes raw transcript',()=>{
 const bundle=createDreamMediaBundle({dream_id:'dream-one',tracks,permission:true});
 assert.deepEqual(bundle.tracks.map(t=>t.kind),['video','audio','transcription']);
 assert.deepEqual(bundle.bounds,{start_ms:0,end_ms:120});
 assert.equal(JSON.stringify(bundle).includes('private transcript'),false);
 assert.equal(Object.isFrozen(bundle.tracks),true);
});
test('requires permission and all three tracks',()=>{
 assert.throws(()=>createDreamMediaBundle({dream_id:'dream-one',tracks,permission:false}),/permission/);
 assert.throws(()=>createDreamMediaBundle({dream_id:'dream-one',tracks:tracks.slice(0,2),permission:true}),/required/);
});
