import test from 'node:test';
import assert from 'node:assert/strict';
import {createAcousticAudioEngine} from '../src/acoustic-audio-engine.js';

function fixture({defer = false, panner = true, resumeError = false, failAllocation = Infinity} = {}) {
  const contexts = [], nodes = [], resumes = [];
  let allocationCount = 0;
  function allocate(type) {
    allocationCount++;
    if (allocationCount === failAllocation) throw new Error('node allocation failed');
    return new Node(type);
  }
  class Param {
    constructor() { this.value = 0; this.events = []; }
    cancelScheduledValues(t) { this.events.push(['cancel', t]); }
    setValueAtTime(v, t) { this.value = v; this.events.push(['set', v, t]); }
    setTargetAtTime(v, t, c) { this.value = v; this.events.push(['target', v, t, c]); }
    linearRampToValueAtTime(v, t) { this.value = v; this.events.push(['ramp', v, t]); }
  }
  class Node {
    constructor(type) { this.typeName = type; this.connections = []; this.disconnected = false; nodes.push(this); }
    connect(other) { this.connections.push(other); }
    disconnect() { this.disconnected = true; this.connections = []; }
  }
  class Context {
    constructor() { this.currentTime = 1; this.state = 'suspended'; this.destination = {}; contexts.push(this); if (!panner) this.createStereoPanner = undefined; }
    createGain() { const n = allocate('gain'); n.gain = new Param(); return n; }
    createStereoPanner() { const n = allocate('panner'); n.pan = new Param(); return n; }
    createDynamicsCompressor() { const n = allocate('compressor'); for (const k of ['threshold','knee','ratio','attack','release']) n[k] = new Param(); return n; }
    createOscillator() { const n = allocate('oscillator'); n.frequency = new Param(); n.starts = 0; n.stops = []; n.start = () => { n.starts++; }; n.stop = t => { n.stops.push(t); }; return n; }
    resume() { if (resumeError) return Promise.reject(new Error('output unavailable')); return defer ? new Promise(resolve => resumes.push(() => {this.state='running';resolve();})) : Promise.resolve().then(() => {this.state='running';}); }
    close() { this.closed = true; this.state='closed'; return Promise.resolve(); }
  }
  return {Context, contexts, nodes, resumes};
}

test('explicit start builds three independent buses with bounded output and one graph', async () => {
  const f = fixture(), e = createAcousticAudioEngine({AudioContext:f.Context});
  assert.equal(f.contexts.length, 0); assert.equal(e.getState().muted, true);
  await e.start(); await e.start();
  assert.equal(f.contexts.length, 1); assert.equal(f.nodes.filter(n=>n.typeName==='oscillator').length,2);
  const gains=f.nodes.filter(n=>n.typeName==='gain'); assert.equal(gains.length,4);
  assert.equal(gains[0].gain.value,0.35); assert.equal(gains[1].gain.value,0.035); assert.equal(gains[2].gain.value,0);
  assert.equal(f.nodes.find(n=>n.typeName==='compressor').ratio.value,20);
  assert.equal(e.getState().running,true); e.dispose();
});
test('ambience mute preserves navigation and status; mono centres pan without mutating bearing input', async () => {
  const f=fixture(), e=createAcousticAudioEngine({AudioContext:f.Context}); await e.start();
  const bearing={pan:0.8,gain:0.7,distance:1}; e.update({ambience:true,bearing});
  assert.equal(e.getState().buses.ambience,true);
  e.update({ambience:false,mono:true});
  assert.deepEqual(e.getState().buses,{navigation:true,ambience:false,status:true});
  assert.equal(f.nodes.find(n=>n.typeName==='panner').pan.value,0); assert.equal(bearing.pan,0.8);
  assert.equal(e.signal({eventId:'status-1'}).accepted,true); e.dispose();
});
test('Feather stop invalidates pending resume and prevents stale oscillator creation', async () => {
  const f=fixture({defer:true}),e=createAcousticAudioEngine({AudioContext:f.Context});
  const start=e.start(); e.stop(); f.resumes[0](); await start;
  assert.equal(e.getState().running,false); assert.equal(e.getState().muted,true);
  assert.equal(f.nodes.length,0); e.dispose();
});
test('concurrent start calls share one pending resume and mute cancels it', async () => {
  const f=fixture({defer:true}),e=createAcousticAudioEngine({AudioContext:f.Context});
  const first=e.start(),second=e.start(); assert.equal(first,second); assert.equal(f.resumes.length,1);
  e.update({muted:true}); f.resumes[0](); await first;
  assert.equal(e.getState().running,false); assert.equal(f.nodes.length,0);
  e.update({muted:false}); assert.equal(e.getState().running,false); e.dispose();
});
test('browser suspension is visible and explicit start resumes existing graph without duplicate tones', async () => {
  const f=fixture(),e=createAcousticAudioEngine({AudioContext:f.Context}); await e.start();
  f.contexts[0].state='suspended'; assert.equal(e.getState().running,false);
  assert.equal(e.getState().status,'suspended'); assert.equal(e.signal({eventId:'held'}).reason,'inactive');
  await e.start(); assert.equal(e.getState().running,true);
  assert.equal(f.nodes.filter(n=>n.typeName==='oscillator').length,2); e.dispose();
});
test('new explicit start can follow cancelled resume without stale completion replacing it', async () => {
  const f=fixture({defer:true}),e=createAcousticAudioEngine({AudioContext:f.Context});
  const old=e.start(); e.stop(); const fresh=e.start(); f.resumes[0](); await old;
  assert.equal(e.getState().running,false); f.resumes[1](); await fresh;
  assert.equal(e.getState().running,true); assert.equal(f.nodes.filter(n=>n.typeName==='oscillator').length,2); e.dispose();
});
test('status signals deduplicate, enforce voice budget and stop disconnects every active output', async () => {
  const f=fixture(),e=createAcousticAudioEngine({AudioContext:f.Context}); await e.start();
  assert.equal(e.signal({eventId:'a'}).accepted,true); assert.equal(e.signal({eventId:'a'}).reason,'duplicate');
  for (const id of ['b','c','d']) assert.equal(e.signal({eventId:id}).accepted,true);
  assert.equal(e.signal({eventId:'e'}).reason,'capacity');
  e.stop(); assert.equal(e.getState().activeSignals,0);
  assert.ok(f.nodes.every(n=>n.disconnected));
  assert.ok(f.nodes.filter(n=>n.typeName==='oscillator').every(n=>n.stops.length>0));
  assert.equal(e.signal({eventId:'f'}).reason,'inactive'); e.dispose();
});
test('finished status envelopes release voices and retain event deduplication', async () => {
  const f=fixture(),e=createAcousticAudioEngine({AudioContext:f.Context}); await e.start();
  e.signal({eventId:'completed'});
  const osc=f.nodes.filter(n=>n.typeName==='oscillator').at(-1);
  osc.onended(); assert.equal(e.getState().activeSignals,0); assert.equal(osc.disconnected,true);
  assert.equal(e.signal({eventId:'completed'}).reason,'duplicate'); e.dispose();
});
test('dispose during resume is terminal and closes context', async () => {
  const f=fixture({defer:true}),e=createAcousticAudioEngine({AudioContext:f.Context});
  const start=e.start(); e.dispose(); f.resumes[0](); await start; await e.start();
  assert.equal(e.getState().disposed,true); assert.equal(e.getState().status,'disposed');
  assert.equal(f.nodes.length,0); assert.equal(f.contexts[0].closed,true);
});
test('unsupported audio and resume failures expose graceful inspectable state', async () => {
  const unsupported=createAcousticAudioEngine({AudioContext:null}); await unsupported.start();
  assert.equal(unsupported.getState().status,'unsupported');
  const f=fixture({resumeError:true}), e=createAcousticAudioEngine({AudioContext:f.Context}); await e.start();
  assert.equal(e.getState().status,'error'); assert.equal(e.getState().muted,true);
  assert.equal(e.getState().lastError,'output unavailable'); assert.equal(f.nodes.length,0); e.dispose();
});
test('graph allocation failure cleans every partial node and supports an explicit retry', async () => {
  const f=fixture({failAllocation:8}),e=createAcousticAudioEngine({AudioContext:f.Context}); await e.start();
  assert.equal(e.getState().status,'error'); assert.ok(f.nodes.every(n=>n.disconnected));
  await e.start(); assert.equal(e.getState().running,true); e.dispose();
});
test('signal allocation failure cleans partial oscillator without throwing or consuming event ID', async () => {
  const f=fixture({failAllocation:10}),e=createAcousticAudioEngine({AudioContext:f.Context}); await e.start();
  assert.equal(e.signal({eventId:'retryable'}).reason,'adapter-error');
  assert.equal(e.getState().activeSignals,0); assert.equal(e.getState().presentedEvents,0);
  assert.equal(f.nodes.at(-1).disconnected,true);
  assert.equal(e.signal({eventId:'retryable'}).accepted,true); e.dispose();
});
test('no stereo panner still supports mono, clamped control and invalid numeric rejection', async () => {
  const f=fixture({panner:false}),e=createAcousticAudioEngine({AudioContext:f.Context}); await e.start();
  e.update({mono:true,bearing:{pan:50,gain:20,distance:0}});
  assert.equal(f.nodes.filter(n=>n.typeName==='gain')[1].gain.value,0.035);
  assert.throws(()=>e.update({bearing:{pan:NaN}}),TypeError);
  assert.throws(()=>e.signal({eventId:''}),TypeError); e.dispose();
});


test('Wyrdrune score drives two existing voices with smooth frequency changes, without autoplay', async () => {
  const f=fixture(),e=createAcousticAudioEngine({AudioContext:f.Context});
  const score={rootHz:174.4,counterpartHz:229.8,foregroundGain:0.022,atmosphereGain:0.012};
  // A score is inert until the owner explicitly starts the audio graph.
  e.update({score});
  assert.equal(f.nodes.length,0);
  await e.start();
  e.update({muted:false,score,ambience:true,mono:true});
  const oscs=f.nodes.filter(n=>n.typeName==='oscillator');
  assert.equal(oscs.length,2);
  assert.equal(oscs[0].frequency.value,174.4);
  assert.equal(oscs[1].frequency.value,229.8);
  assert.equal(f.nodes.filter(n=>n.typeName==='gain')[1].gain.value,0.022);
  assert.equal(f.nodes.filter(n=>n.typeName==='gain')[2].gain.value,0.012);
  assert.throws(()=>e.update({score:{...score,rootHz:Infinity}}),TypeError);
  assert.throws(()=>e.update({score:{...score,counterpartHz:9001}}),RangeError);
  e.stop();
  assert.equal(e.getState().running,false);
  assert.ok(oscs.every(n=>n.stops.length>0));
  e.dispose();
});
