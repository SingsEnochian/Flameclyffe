import test from 'node:test';
import assert from 'node:assert/strict';
import {observeNurseryMythogenesis} from '../src/living-observer-model.js';
import {runMythogenesisExperiment,mythogenesisProtocol} from '../src/mythogenesis-experiment.js';
test('legacy composed vocabulary is inherited, recurrence is descriptive, duplicate receipts deduplicated',()=>{
 const event={id:'cell-grounding:1:a:b',source_receipt:{kind:'tissue-signal-accepted'},provenance:{verified_against_before_after:true}};
 const snapshot={generation:2,utterances:[{generation:1,id:'a',phrase:'our orbit',origin:'composed',inherited_vocabulary:false},
 {generation:2,id:'b',phrase:'our orbit',origin:'composed'},{generation:2,id:'b',phrase:'other'}],groundedUtterances:[event,event]};
 const m=observeNurseryMythogenesis(snapshot);
 assert.equal(m.inherited_grammar_events,2);assert.equal(m.unknown_origin_events,1);
 assert.equal(m.distinct_phrases,2);assert.equal(m.cross_speaker_phrases,1);
 assert.equal(m.accepted_signal_receipts_in_retained_window,1);
 assert.equal(m.hypothesis_status,'open');
 assert.throws(()=>observeNurseryMythogenesis({...snapshot,generation:0}),/Invalid/);
});
test('matched native Nursery trials record controls, provenance and no consciousness verdict',async()=>{
 const a=await runMythogenesisExperiment(),b=await runMythogenesisExperiment();
 assert.equal(a.status,'completed');assert.equal(a.runs.length,9);assert.equal(a.comparisons.length,3);
 assert.deepEqual(a,b,'identical protocol and seeds should reproduce the receipts');
 assert.equal(new Set(a.runs.map(r=>r.receipt_digest)).size,9);
 assert.ok(a.runs.every(r=>r.observation.generation===16));
 assert.ok(a.runs.filter(r=>r.condition!=='unexposed').every(r=>r.inscription.source_hash));
 assert.equal(a.hypothesis_status,'open');
 const p=mythogenesisProtocol();p.seeds.push(99);assert.equal(mythogenesisProtocol().seeds.length,3);
});
test('Feather aborts experimental work without promoting partial data',async()=>{
 const controller=new AbortController();controller.abort();
 const result=await runMythogenesisExperiment({signal:controller.signal});
 assert.equal(result.status,'feather-stopped');assert.deepEqual(result.runs,[]);assert.deepEqual(result.comparisons,[]);
});
