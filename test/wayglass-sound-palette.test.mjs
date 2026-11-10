import test from 'node:test';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
import {SOUND_VOICES,SOUND_CHORDS,SOUND_RHYTHMS,DEFAULT_SOUND_PALETTE,validSoundPalette,paletteFrequencies,paletteBeatEvents} from '../lib/wayglass-sound-palette.mjs';
import {createSoundComposition} from '../lib/wayglass-sound-composition.mjs';
import {createSoundSampleBank} from '../lib/wayglass-sound-sample-bank.mjs';
const palette={voice:'bell',chord:'minor',rhythm:'quarters',bpm:120};
test('musical catalogue supplies real chord intervals and tempo-aligned beats',()=>{
 assert.equal(SOUND_VOICES.length,27);assert.equal(Object.keys(SOUND_CHORDS).length,20);assert.equal(Object.keys(SOUND_RHYTHMS).length,12);
 const notes=paletteFrequencies(220,palette);assert.ok(Math.abs(notes[1]-261.625565)<.00001);assert.ok(Math.abs(notes[2]-329.627557)<.00001);
 assert.deepEqual(paletteBeatEvents(palette,{start:0,duration:2}).map(x=>x.at),[0,.5,1,1.5]);
 assert.deepEqual(paletteBeatEvents(palette,{start:1,duration:1,origin:0}).map(x=>x.at),[1,1.5]);
 assert.equal(paletteBeatEvents({...palette,rhythm:'sustained'}).length,0);
 assert.equal(paletteFrequencies(440,{...palette,root_hz:220})[0],220);
 for(const bad of [{...palette,voice:'invented'},{...palette,bpm:Infinity},{...palette,extra:1},{...palette,root_hz:NaN}])assert.equal(validSoundPalette(bad),false);
});
test('orchestration survives composition return and cannot enable playback or generation',()=>{
 const one=createSoundComposition(),two=createSoundComposition();
 try{
  one.setLayer('layer-0',{palette});one.setLayer('layer-0',{gain:.7});
  assert.deepEqual(one.snapshot().layers[0].palette,palette);
  two.restore(one.checkpoint());assert.deepEqual(two.snapshot().layers[0].palette,palette);
  assert.equal(two.snapshot().audio_enabled,false);assert.equal(two.snapshot().generating,false);
  assert.throws(()=>two.setLayer('layer-0',{palette:{...palette,chord:'unknown'}}),/Bounded/);
  assert.deepEqual(two.snapshot().layers[0].palette,palette);
 }finally{one.dispose();two.dispose();}
});
test('sample bank hashes originals, caches decoder results, and reports volatile custody honestly',async()=>{
 const bank=createSoundSampleBank({indexedDB:null,crypto:webcrypto});
 const bytes=new Uint8Array([1,2,3,4]).buffer,file={name:'test.wav',size:4,type:'audio/wav',arrayBuffer:async()=>bytes.slice(0)};
 const receipt=await bank.importFile(file,{rootMidi:57,sourceNote:'Owner recording'});
 assert.equal(receipt.persisted,false);assert.match(receipt.id,/^[a-f0-9]{64}$/);assert.equal(bank.snapshot()[0].decode_status,'not-yet-decoded');
 let calls=0;const context={decodeAudioData:async()=>{calls++;return {duration:1,length:100,numberOfChannels:1};}};
 assert.equal((await bank.decode(context,receipt.id)).duration,1);await bank.decode(context,receipt.id);assert.equal(calls,1);
 assert.equal(bank.metadata(receipt.id).root_midi,57);assert.equal(bank.metadata(receipt.id).decode_status,'ready');
 const badContext={decodeAudioData:async()=>{throw Error('Unsupported codec');}};
 await assert.rejects(bank.decode(badContext,receipt.id),/Unsupported codec/);assert.equal(bank.metadata(receipt.id).decode_status,'failed');
 await assert.rejects(bank.importFile({...file,size:33*1024*1024}),/32 MiB/);
 await assert.rejects(bank.decode(context,'missing'),/unavailable/);
});

test('late sample decoding cannot start audio after the instrument is disposed',async()=>{
 const {createPaletteInstrument}=await import('../lib/wayglass-palette-instrument.mjs');
 let resolve,created=0,ready=0;const pending=new Promise(r=>resolve=r);
 const bank={metadata:()=>({root_midi:60}),decode:()=>pending};
 const context={currentTime:0,createBufferSource(){created++;throw Error('Late allocation');}};
 const instrument=createPaletteInstrument({context,destination:{},palette:{...DEFAULT_SOUND_PALETTE,voice:'sample:'+'a'.repeat(64)},bank,onReady:()=>ready++});
 instrument.dispose();resolve({duration:1});await pending;await new Promise(r=>setImmediate(r));
 assert.equal(created,0);assert.equal(ready,0);
});
