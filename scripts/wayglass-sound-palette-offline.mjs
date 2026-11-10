import {createRequire} from 'node:module';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
import {SOUND_VOICES,DEFAULT_SOUND_PALETTE} from '../lib/wayglass-sound-palette.mjs';
import {createPaletteInstrument} from '../lib/wayglass-palette-instrument.mjs';
import {createSoundSampleBank} from '../lib/wayglass-sound-sample-bank.mjs';
const require=createRequire(import.meta.url);
const {OfflineAudioContext}=require(process.env.WAYGLASS_WEB_AUDIO_ENGINE_MODULE||'web-audio-engine');
const {indexedDB}=require(process.env.WAYGLASS_FAKE_INDEXEDDB_MODULE||'fake-indexeddb');
let rendered=0;
for(const voice of SOUND_VOICES){
 const context=new OfflineAudioContext(1,16000,16000),output=context.createGain();output.gain.value=.04;output.connect(context.destination);
 const instrument=createPaletteInstrument({context,destination:output,palette:{...DEFAULT_SOUND_PALETTE,voice:voice.id,chord:'minor7',rhythm:'eighths',bpm:120}});
 instrument.render({frequency_hz:220},0,1);const pcm=(await context.startRendering()).getChannelData(0);
 assert.ok(pcm.every(Number.isFinite),voice.id+' must render finite samples');
 assert.ok(pcm.some(x=>Math.abs(x)>1e-6),voice.id+' must produce actual PCM');
 assert.ok(Math.max(...pcm.map(Math.abs))<=.041,voice.id+' stays within supplied gain');instrument.dispose();rendered++;
}
// Import a real PCM WAV, persist it through IndexedDB, reopen, and really decode.
const frames=4000,wav=new ArrayBuffer(44+frames*2),view=new DataView(wav);
const ascii=(at,text)=>[...text].forEach((c,i)=>view.setUint8(at+i,c.charCodeAt(0)));
ascii(0,'RIFF');view.setUint32(4,36+frames*2,true);ascii(8,'WAVE');ascii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);ascii(36,'data');view.setUint32(40,frames*2,true);
for(let i=0;i<frames;i++)view.setInt16(44+i*2,Math.round(Math.sin(2*Math.PI*220*i/16000)*10000),true);
const bank=createSoundSampleBank({indexedDB,crypto:webcrypto});const receipt=await bank.importFile({name:'original-A3.wav',type:'audio/wav',size:wav.byteLength,arrayBuffer:async()=>wav.slice(0)},{rootMidi:57,sourceNote:'Generated test recording'});assert.equal(receipt.persisted,true);
const reopened=createSoundSampleBank({indexedDB,crypto:webcrypto});assert.equal((await reopened.load()).loaded,true);
const context=new OfflineAudioContext(1,16000,16000);const decoded=await reopened.decode(context,receipt.id);assert.equal(decoded.numberOfChannels,1);assert.ok(Math.abs(decoded.duration-.25)<.001);
const out=context.createGain();out.gain.value=.04;out.connect(context.destination);
let ready;const prepared=new Promise(r=>ready=r);const instrument=createPaletteInstrument({context,destination:out,palette:{voice:'sample:'+receipt.id,chord:'fifth',rhythm:'quarters',bpm:120},bank:reopened,onReady:ready});
await prepared;instrument.render({frequency_hz:220},0,1);const pcm=(await context.startRendering()).getChannelData(0);assert.ok(pcm.some(x=>Math.abs(x)>1e-6));instrument.dispose();
console.log('PASS: '+rendered+' voices rendered real finite PCM; imported WAV persisted, reopened, decoded and played as a chord/rhythm on an existing offline context. No physical output claimed.');
