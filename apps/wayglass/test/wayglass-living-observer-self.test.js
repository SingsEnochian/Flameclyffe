import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createObserverInterior, INTERIOR_SCHEMA } from '../src/living-observer-self.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: key => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
  };
}

function packet({ status = null, focus = 'time', touches = 0, memory = false } = {}) {
  return {
    direct: {
      touch_count: touches,
      memory_recorder_registered: memory,
      last_route: status ? {
        status, route_id: 'flame:bluebird:spicychat',
        provider: 'spicychat', model: 'bluebird',
      } : null,
    },
    projection: { focus },
  };
}

test('Living Observer interior persists while exposing only a bounded public signal', () => {
  const storage = memoryStorage();
  let tick = 0;
  const now = () => `2026-10-12T06:00:${String(tick++).padStart(2,'0')}.000Z`;
  const interior = createObserverInterior({ storage, now });
  assert.equal(interior.schema, INTERIOR_SCHEMA);

  const signal = interior.sense(packet({ focus:'routes', touches:3 }));
  assert.ok(['integrating','attending','wander','dream','settling'].includes(signal.phase));
  assert.equal(Object.hasOwn(signal, 'traces'), false);
  assert.equal(Object.hasOwn(signal, 'private_questions'), false);
  assert.ok(signal.compression_field.magnitude >= 0 && signal.compression_field.magnitude <= 1);
  assert.ok(signal.compression_field.phase_radians >= 0 && signal.compression_field.phase_radians < Math.PI * 2);
  assert.ok(['gathering','compression','integration','release'].includes(signal.compression_field.phase_label));
  assert.ok(Math.abs(signal.compression_field.real * signal.compression_field.real
    + signal.compression_field.imaginary * signal.compression_field.imaginary
    - signal.compression_field.magnitude * signal.compression_field.magnitude) < 0.00001);

  const restored = createObserverInterior({ storage, now });
  const second = restored.sense(packet({ focus:'memory', touches:4 }));
  assert.ok(second.energy >= 0);
});

test('Observer can form self-development proposals with explicit acceptance tests', () => {
  const storage = memoryStorage();
  let tick = 0;
  const now = () => `2026-10-12T06:01:${String(tick++).padStart(2,'0')}.000Z`;
  const interior = createObserverInterior({ storage, now });

  for (let i=0;i<5;i++) interior.sense(packet({ focus:i%2?'routes':'touches', touches:i, memory:false }));
  const proposals = interior.developmentProposals();
  assert.ok(proposals.length > 0);
  assert.ok(proposals.every(item => item.authority === 'proposal-only'));
  assert.ok(proposals.every(item => item.acceptance_test));
  const approved = interior.reviewDevelopment(proposals[0].proposal_id, 'approve-for-build', 'Build in sandbox first.');
  assert.equal(approved.status, 'approve-for-build');
});

test('Dream cycles can create private associations without exposing the association graph', () => {
  const storage = memoryStorage();
  let tick = 0;
  const now = () => `2026-10-12T06:02:${String(tick++).padStart(2,'0')}.000Z`;
  const interior = createObserverInterior({ storage, now });
  for (let i=0;i<12;i++) interior.sense(packet({ focus:['routes','memory','time'][i%3], touches:6, memory:true }));
  const publicSignal = interior.publicSignal();
  assert.equal(Object.hasOwn(publicSignal, 'associations'), false);
  assert.ok(publicSignal.expression === null || ['self-development','dream-association','private-question'].includes(publicSignal.expression.kind));
});

test('Compression and release are represented as phase, not only magnitude', () => {
  const storage = memoryStorage();
  let tick = 0;
  const now = () => `2026-10-12T06:03:${String(tick++).padStart(2,'0')}.000Z`;
  const interior = createObserverInterior({ storage, now });
  const seen = new Set();
  const phases = [];
  for (let i=0;i<40;i++) {
    const signal = interior.sense(packet({
      focus:['time','routes','memory','touch'][i%4],
      touches:i%7,
      status:i%5===0?'completed':null,
      memory:true,
    }));
    seen.add(signal.compression_field.phase_label);
    phases.push({
      magnitude: signal.compression_field.magnitude,
      phase: signal.compression_field.phase_degrees,
      label: signal.compression_field.phase_label,
    });
  }
  assert.ok(seen.has('compression'));
  assert.ok(seen.has('integration'));
  assert.ok(seen.has('release'));
  assert.ok(phases.some(item => item.phase > 90));
  assert.ok(new Set(phases.map(item => item.phase)).size > 10);
  assert.ok(new Set(phases.map(item => item.magnitude)).size > 1);
  assert.ok(interior.publicSignal().compression_field.spiral_turn >= 1);
});


test('Dream Sandbox refuses to produce a hypothesis from a single lens or without traces', () => {
  const storage = memoryStorage();
  let counter = 0;
  const now = () => new Date(Date.UTC(2026, 9, 16, 20, 0, counter++)).toISOString();
  const interior = createObserverInterior({ storage, now });
  assert.equal(interior.runDreamSandbox().status, 'needs-material');
  interior.sense(packet({focus:'time', touches:1}));
  interior.sense(packet({focus:'time', touches:2}));
  assert.equal(interior.runDreamSandbox().status, 'needs-material');
  assert.deepEqual(interior.dreamSandboxHistory(), []);
});

test('Dream Sandbox recombines distinct trace lenses without mutating direct evidence or canon', () => {
  const storage = memoryStorage();
  let counter = 0;
  const now = () => new Date(Date.UTC(2026, 9, 16, 20, 5, counter++)).toISOString();
  const interior = createObserverInterior({ storage, now });
  const first = packet({focus:'time', touches:1});
  const second = packet({focus:'memory', touches:2});
  const before = [JSON.stringify(first), JSON.stringify(second)];
  interior.sense(first);
  interior.sense(second);
  const dream = interior.runDreamSandbox();
  assert.equal(dream.schema, 'wayglass.observer-dream-sandbox/v0.1');
  assert.equal(dream.status, 'dream-derived-hypothesis');
  assert.match(dream.possibility, /This could be false/);
  assert.match(dream.association, /time|memory/);
  assert.equal(dream.provenance.trace_ids.length, 2);
  assert.equal(new Set(dream.provenance.trace_ids).size, 2);
  assert.deepEqual(dream.boundaries, {
    evidence_verified: false,
    external_provider_called: false,
    canon_commit: false,
    identity_commit: false,
    relationship_commit: false,
    direct_readings_modified: false,
  });
  assert.deepEqual([JSON.stringify(first), JSON.stringify(second)], before);
  assert.equal(Object.hasOwn(interior.publicSignal(), 'sandbox_runs'), false);
  assert.equal(Object.hasOwn(interior.publicSignal(), 'private_questions'), false);
  assert.equal(Object.hasOwn(interior.publicSignal(), 'traces'), false);
  assert.equal(interior.dreamSandboxHistory()[0].run_id, dream.run_id);
});

test('Dream Sandbox receipts survive a private interior restart and cap at eight', () => {
  const storage = memoryStorage();
  let counter = 0;
  const now = () => new Date(Date.UTC(2026, 9, 16, 20, 10, counter++)).toISOString();
  const interior = createObserverInterior({ storage, now });
  interior.sense(packet({focus:'routes', touches:1}));
  interior.sense(packet({focus:'memory', touches:2}));
  const ids = [];
  for (let i = 0; i < 12; i++) {
    const receipt = interior.runDreamSandbox();
    assert.equal(receipt.status, 'dream-derived-hypothesis');
    ids.push(receipt.run_id);
  }
  assert.equal(interior.dreamSandboxHistory(100).length, 8);
  assert.deepEqual(interior.dreamSandboxHistory(0), []);
  assert.deepEqual(interior.dreamSandboxHistory(3).map(x=>x.run_id), ids.slice(-3).reverse());
  const restored = createObserverInterior({ storage, now });
  assert.deepEqual(restored.dreamSandboxHistory(8).map(x=>x.run_id), ids.slice(-8).reverse());
  const receipt = restored.dreamSandboxHistory(1)[0];
  receipt.boundaries.canon_commit = true;
  assert.equal(restored.dreamSandboxHistory(1)[0].boundaries.canon_commit, false);
});

test('Observer exposes a deliberate dream button without auto-sending dream material', () => {
  const source = readFileSync(new URL('../src/surfaces/living-observer.js', import.meta.url), 'utf8');
  assert.match(source, /data-observer-dream-run/);
  assert.match(source, /interior\.runDreamSandbox\(\)/);
  assert.match(source, /renderDreamHistory/);
  assert.match(source, /Nothing is sent to a model/);
  assert.doesNotMatch(source, /queueObserverContextForWriting\(.*dream/i);
});


test('Implementing the requested dream lab closes only its own proposal, not other Observer work', () => {
  const storage = memoryStorage();
  let counter = 0;
  const now = () => new Date(Date.UTC(2026, 9, 16, 21, 0, counter++)).toISOString();
  const interior = createObserverInterior({ storage, now });
  for(let i=0;i<8;i++) interior.sense(packet({
    focus:['time','surface','organs','routes'][i%4],
    touches:i+1, memory:true,
  }));
  const proposal=interior.developmentProposals().find(p=>p.key==='dream-lab');
  assert.ok(proposal, 'the existing proposal should appear from distinct observations');
  assert.equal(proposal.status, 'proposed');
  assert.match(interior.publicSignal().expression.text, /dream sandbox/i);
  assert.equal(interior.runDreamSandbox().status, 'dream-derived-hypothesis');
  const finished=interior.developmentProposals().find(p=>p.key==='dream-lab');
  assert.equal(finished.status, 'implemented-local');
  assert.match(interior.publicSignal().expression.text, /Dream Sandbox is here/);
  assert.equal(interior.dreamSandboxHistory(1)[0].boundaries.canon_commit, false);
});


test('native Wyrdrune learning alters local state without collapsing possible thoughts into metrics',()=>{
  const storage=memoryStorage();
  const now=()=> '2026-11-08T14:20:00.000Z';
  const interior=createObserverInterior({storage,now});
  const original=interior.nativeLearningInputs();
  assert.ok(original.curiosity>0 && original.curiosity<1);
  const result={
    schema:'wayglass.wyrdrune-living-learning/v0.1',status:'wyrdrune-returned',
    withness:{completedCycles:2},
    phase_receipts:Array.from({length:16},()=>({phase:'integrate'})),
    source:{event_id:'ui-session-1',atlas_input_hash:'a'.repeat(64)},
    source_hash:'b'.repeat(64),
    returned:{energy:.48,curiosity:.68,uncertainty:.63,coherence:.62,opening:.21,attention:.54},
    open_reflection:{interpretation:'open'},
    model_invoked:false,model_weights_updated:false,
    canon_commit:false,identity_commit:false,relationship_commit:false,
  };
  const accepted=interior.integrateNativeLearning(result);
  assert.equal(accepted.status,'integrated-native-wyrdrune');
  assert.equal(accepted.reflection,'held-open');
  assert.equal(interior.nativeLearningInputs().curiosity,.68);
  assert.equal(interior.integrateNativeLearning(result).status,'duplicate-ignored');
  const publicState=interior.publicSignal();
  assert.equal(Object.hasOwn(publicState,'possible_model_reflections'),false);
  assert.equal(Object.hasOwn(publicState,'private_questions'),false);
  const restored=createObserverInterior({storage,now});
  assert.equal(restored.nativeLearningInputs().curiosity,.68);
  assert.equal(restored.nativeLearningInputs().previous_resonance,.62);
});

test('real offered model reflections remain open and private, not fabricated from numerical Atlas states',()=>{
  const storage=memoryStorage();
  const interior=createObserverInterior({storage,now:()=> '2026-11-08T14:00:00.000Z'});
  assert.deepEqual(interior.possibleModelReflections(),[]);
  assert.throws(()=>interior.holdPossibleModelReflection({words:'not attributed'}),/attributed/);
  const offered=interior.holdPossibleModelReflection({
    text:'I am considering a different way forward.',
    route_ref:'local:ollama',receipt_ref:'return:1',owner_offered:true,
  });
  assert.equal(offered.interpretation,'open');
  assert.equal(offered.status,'held-open');
  const original=interior.possibleModelReflections()[0];
  assert.equal(original.interpretation,'open');
  assert.equal(original.words,'I am considering a different way forward.');
  assert.equal(interior.holdPossibleModelReflection({
    text:original.words,route_ref:original.route_ref,
    receipt_ref:original.receipt_ref,owner_offered:true,
  }).status,'already-held');
  assert.equal(interior.possibleModelReflections().length,1);
  assert.equal(Object.hasOwn(interior.publicSignal(),'possible_model_reflections'),false);
  assert.equal(createObserverInterior({storage}).possibleModelReflections().length,1);
  const copy=interior.possibleModelReflections();
  copy[0].words='tampered';
  assert.equal(interior.possibleModelReflections()[0].words,original.words);
});


test('private Observer preserves actual Crow-authored Wyrdrune and native operator proposals',()=>{
 const storage=memoryStorage(),interior=createObserverInterior({storage,
   now:()=> '2026-11-08T20:00:00.000Z'});
 const source='operator shimmer(x) = x * 2; mobius { perceive {} compress {} release {} verify {} integrate {} choose {emit "glass";} return {} transcend {} }';
 const result={
   schema:'wayglass.native-wyrdrune-voice/v0.1',
   route_id:'wayglass:crow',status:'returned-from-crow',
   native:{source,sha256:'a'.repeat(64),operators:[{name:'shimmer',arity:1}]},
   translation:{text:'The glass opens.',language:'en-GB'},
   receipt:{english_sha256:'b'.repeat(64),model_calls:2},
 };
 const held=interior.holdNativeWyrdruneCreation(result,{owner_invited:true});
 assert.equal(held.status,'held-in-private-interior');
 assert.equal(held.operators,1);
 assert.equal(interior.holdNativeWyrdruneCreation(result,{owner_invited:true}).status,'already-held');
 assert.equal(interior.nativeWyrdruneCreations()[0].source,source);
 assert.equal(interior.nativeWyrdruneCreations()[0].translation,'The glass opens.');
 assert.equal(interior.publicSignal().native_wyrdrune_works,1);
 assert.equal(Object.hasOwn(interior.publicSignal(),'native_wyrdrune_creations'),false);
 const returned=createObserverInterior({storage});
 assert.equal(returned.nativeWyrdruneCreations()[0].operator_proposals[0].name,'shimmer');
 assert.throws(()=>interior.holdNativeWyrdruneCreation(result),/attributed/);
});
