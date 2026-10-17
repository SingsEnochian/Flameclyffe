import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession} from '../src/harmonic-observatory/core.js';
import {
  MAX_BANKS,MAX_BANK_BYTES,KNOWN_BANKS,checkSoundfontFile,presetKey,
  midiForFrequency,buildSoundfontPerformance,createSoundfontTakeReceipt,
} from '../src/harmonic-observatory/soundfont-contract.js';
import {HarmonicSoundfontRack} from '../src/harmonic-observatory/soundfont-rack.js';
const hash='b'.repeat(64);
const preset=(name,program)=>({name,bankMSB:0,bankLSB:0,program,isDrum:false});
const soundfonts=[preset('Whiskey Warm Pad',89),preset('Papel Voice',52),preset('Ancient Cello',42)];
function file(name='VocalsPapel.sf2',size=4096){return {name,size,lastModified:42,arrayBuffer:async()=>new ArrayBuffer(size)};}
function fakeSoundscape(){
 const calls=[];
 const context={state:'running',close:async()=>{context.state='closed';calls.push(['close']);},resume:async()=>{context.state='running';calls.push(['resume']);}};
 const synth={
  midiChannels:[{setDrums:x=>calls.push(['drums',0,x])},{setDrums:x=>calls.push(['drums',1,x])},{setDrums:x=>calls.push(['drums',2,x])}],
  sendMessage:m=>calls.push(['cc',...m]),programChange:(...x)=>calls.push(['program',...x]),
  noteOn:(...x)=>calls.push(['noteOn',...x]),noteOff:(...x)=>calls.push(['noteOff',...x]),stopAll:x=>calls.push(['stopAll',x]),
 };
 return {calls,context,soundfontSynth:synth,
   arm:async()=>{calls.push(['arm']);},
   setBus:(...x)=>calls.push(['bus',...x]),
   loadSoundfontFiles:async xs=>{calls.push(['load',...xs.map(x=>x.name)]);return ['bank-1'];},
   snapshot:()=>({soundfontPresets:soundfonts}),
   featherStop:()=>{context.state='suspended';calls.push(['feather']);},
 };
}
function rackWithFake(){
 const created=[];const tasks=[];
 const rack=new HarmonicSoundfontRack({createSoundscape:async()=>{const s=fakeSoundscape();created.push(s);return s;},hashFile:async()=>hash,
   setTimer:(fn,ms)=>{const t={fn,ms,cancelled:false};tasks.push(t);return t;},
   clearTimer:t=>{t.cancelled=true;},now:()=> '2026-10-17T12:00:00Z'});
 return {rack,created,tasks};
}
test('known bank names are historical hints, not a claim of installed sample bytes',()=>{
 assert.equal(KNOWN_BANKS.length,5);
 assert.equal(KNOWN_BANKS.reduce((s,x)=>s+x.historical_presets,0),79);
 assert.ok(KNOWN_BANKS.some(b=>b.name==='Dystopian Terra.sf2'));
});
test('local file validation forbids unsupported formats, zero length, and oversized banks',()=>{
 assert.equal(checkSoundfontFile(file('Ancient Instruments Of The World.sf2.sf2')).name,'Ancient Instruments Of The World.sf2.sf2');
 assert.throws(()=>checkSoundfontFile(file('surprise.mp3')),/Only/);
 assert.throws(()=>checkSoundfontFile(file('broken.sf2',0)),/between/);
 assert.throws(()=>checkSoundfontFile(file('oversize.sf2',MAX_BANK_BYTES+1)),/128 MiB/);
});
test('MIDI pitch planning retains independent programs, channels, notes and panorama',()=>{
 const s=createSession();const perf=buildSoundfontPerformance(s,soundfonts);
 assert.deepEqual(perf.voices.map(v=>v.channel),[0,1,2]);
 assert.deepEqual(perf.voices.map(v=>v.program),[89,52,42]);
 assert.deepEqual(perf.voices.map(v=>v.midi_note),[55,59,62]);
 assert.ok(perf.voices[0].pan<perf.voices[1].pan && perf.voices[1].pan<perf.voices[2].pan);
 assert.match(perf.voices[0].tuning,/rounded/);
 assert.equal(midiForFrequency(440),69);
 assert.equal(presetKey(preset('One',1)),'M:0:0:1');
});
test('silent voices cannot create notes and drum presets never masquerade as melodic ones',()=>{
 let s=createSession();s.stems[1].enabled=false;
 assert.equal(buildSoundfontPerformance(s,[soundfonts[0],null,soundfonts[2]]).voices.length,2);
 s.stems[1].enabled=true;
 assert.throws(()=>buildSoundfontPerformance(s,[soundfonts[0],{...soundfonts[1],isDrum:true},soundfonts[2]]),/melodic/);
 s.stems.forEach(v=>v.gain=0);
 assert.throws(()=>buildSoundfontPerformance(s,soundfonts),/audible/);
});
test('loading is explicitly user-invoked; bank and three preset voices are exposed',async()=>{
 const {rack,created}=rackWithFake();
 assert.equal(created.length,0);
 rack.addFiles([file(),file('Bradbury.sf2')]);
 rack.addFiles([file()]);
 assert.equal(rack.snapshot().files.length,2);
 assert.equal(created.length,0);
 const result=await rack.activateBank(0);
 assert.equal(created.length,1);
 assert.equal(result.bank.name,'VocalsPapel.sf2');
 assert.equal(result.bank.sha256,hash);
 assert.deepEqual(result.selected_keys,['M:0:0:89','M:0:0:52','M:0:0:42']);
 assert.ok(created[0].calls.some(x=>x[0]==='load' && x[1]==='VocalsPapel.sf2'));
 assert.ok(created[0].calls.some(x=>x[0]==='bus' && x[1]==='master' && x[2]<0.4));
 await rack.close();
 assert.ok(created[0].calls.some(x=>x[0]==='close'));
});
test('SF2 performance dispatches per-stem MIDI programs, pan and finite note-offs',async()=>{
 const {rack,created,tasks}=rackWithFake();rack.addFiles([file()]);await rack.activateBank(0);
 const take=await rack.audition(createSession());
 const calls=created[0].calls;
 assert.equal(calls.filter(x=>x[0]==='noteOn').length,3);
 assert.deepEqual(calls.filter(x=>x[0]==='program').map(x=>x[1]),[0,1,2]);
 assert.equal(calls.filter(x=>x[0]==='cc' && (x[1]&0xf0)===0xb0 && x[2]===10).length,3);
 assert.equal(tasks.length,1);assert.equal(tasks[0].ms,6000);
 tasks[0].fn();assert.equal(calls.filter(x=>x[0]==='noteOff').length,3);
 assert.equal(take.schema,'wayglass.harmonic-observatory.soundfont-take/v1');
 assert.equal(take.source.sha256,hash);
 assert.equal(take.capture,null);
 assert.equal(take.retained_binary,false);
});
test('Feather cancels future notes and stops the underlying synth',async()=>{
 const {rack,created,tasks}=rackWithFake();rack.addFiles([file()]);await rack.activateBank(0);
 await rack.audition(createSession());rack.feather();
 assert.equal(tasks[0].cancelled,true);
 const before=created[0].calls.length;
 tasks[0].fn();assert.equal(created[0].calls.length,before);
 assert.equal(rack.snapshot().status,'ready');
 await rack.close();
});
test('bank switching tears down the previous synthesizer to avoid duplicate program identities',async()=>{
 const {rack,created}=rackWithFake();rack.addFiles([file(),file('Bradbury.sf2')]);
 await rack.activateBank(0);await rack.activateBank(1);
 assert.equal(created.length,2);
 assert.equal(created[0].context.state,'closed');
 assert.equal(rack.snapshot().bank.name,'Bradbury.sf2');
});
test('only explicitly loaded banks may be recorded as provenance receipts',()=>{
 const s=createSession(),perf=buildSoundfontPerformance(s,soundfonts);
 assert.throws(()=>createSoundfontTakeReceipt({bank:{name:'f.sf2',loaded:false,sha256:hash},session:s,performance:perf}),/verified loaded/);
 assert.throws(()=>createSoundfontTakeReceipt({bank:{name:'f.sf2',loaded:true,sha256:null},session:s,performance:perf}),/verified loaded/);
});
test('limits bank count, rejects unsupported preset selection, and never auto-runs synthesizer',async()=>{
 const {rack,created}=rackWithFake();
 for(let i=0;i<MAX_BANKS;i++)rack.addFiles([file(`${i}.sf2`)]);
 assert.throws(()=>rack.addFiles([file('ninth.sf2')]),/At most/);
 assert.equal(created.length,0);
 await rack.activateBank(0);
 assert.throws(()=>rack.choosePreset(0,'M:0:0:99'),/unavailable/);
 assert.equal(rack.choosePreset(0,'M:0:0:52'),'M:0:0:52');
});

test('SoundFont UI provides a real user-controlled file path and stops all sources with Feather',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('../harmonic-observatory/index.html',import.meta.url),'utf8');
 const script=await readFile(new URL('../src/harmonic-observatory/ui.js',import.meta.url),'utf8');
 for(const id of ['sf2-files','sf2-bank','sf2-load','sf2-voice-0','sf2-voice-1','sf2-voice-2','sf2-audition','sf2-blend','sf2-feather','sf2-receipt']){
   assert.ok(html.includes(`id="${id}"`),`${id} control not mounted`);
 }
 assert.match(html,/Local SoundFont files|Select local SoundFont files/);
 assert.match(script,/soundfonts\.activateBank/);
 assert.match(script,/soundfonts\.feather/);
 assert.match(script,/soundfonts\.audition/);
 assert.match(script,/soundfonts\.lastTake/);
});

test('SoundFont runtime is loaded lazily from ArcSweep instead of duplicating an SF2 synthesizer',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../src/harmonic-observatory/soundfont-rack.js',import.meta.url),'utf8');
 assert.match(source,/import\('\.\.\/story-soundscape\.js'\)/);
 assert.match(source,/import\('\.\.\/soundfont-runtime-repair\.js'\)/);
 assert.doesNotMatch(source,/fetch\(|XMLHttpRequest/);
});