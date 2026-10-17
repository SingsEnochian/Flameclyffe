import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {auditSupersession,cosine,demoSupersessionSample,validateSupersessionSample,LEDGER_AUDIT_SCHEMA,lexicalVectors} from '../src/ledger-supersession-audit.js';
import {createLocalOnnxEmbedder} from '../src/ledger-local-onnx.js';

const example=()=>demoSupersessionSample();

test('fictional supersession packet has an explicit replacement, retired candidates and source refs',()=>{
 const x=validateSupersessionSample(example());
 assert.equal(x.records.find(r=>r.ref==='receipt-new').replaces,'receipt-old');
 assert.deepEqual(x.expected.forbidden_refs,['receipt-old','receipt-revoked']);
});

test('local lexical baseline yields a measurement and strictly excludes revoked and superseded candidates',async()=>{
 const receipt=await auditSupersession(example(),{createdAt:'2026-10-17T00:00:00Z'});
 assert.equal(receipt.schema,LEDGER_AUDIT_SCHEMA);
 assert.equal(receipt.model.mode,'lexical-baseline');
 assert.equal(receipt.metrics.forbidden_not_retrieved,true);
 assert.equal(receipt.metrics.exclusion_rate,1);
 assert.equal(receipt.eligible.some(e=>e.ref==='receipt-old'||e.ref==='receipt-revoked'),false);
 assert.equal(receipt.candidates.length,4);
 assert.equal(receipt.provenance.receipt_signature_verified,false);
 assert.equal(receipt.provenance.canonical_store_updated,false);
 assert.equal(receipt.claims.grants_authority,false);
});

test('ONNX-style injected local vectors can rank the replacement but never unretire an earlier record',async()=>{
 const dims=[ [1,0], [1,0], [0.98,0.02], [1,0], [0,1] ];
 const audit=await auditSupersession(example(),{
   embed:async texts=>{assert.equal(texts.length,5);return dims;},
   model:{id:'Xenova/all-MiniLM-L6-v2',local:true,quantization:'q8'},
   createdAt:'2026-10-17T00:00:00Z',
 });
 assert.equal(audit.metrics.expected_active_top1,true);
 assert.equal(audit.metrics.expected_active_rank,1);
 assert.equal(audit.metrics.forbidden_not_retrieved,true);
 assert.equal(audit.model.mode,'onnx-embedding');
 assert.equal(audit.eligible.length,2);
});

test('a revoked record with perfect similarity remains excluded regardless of numerical score',async()=>{
 const x=example();x.expected.target_ref='receipt-other';
 const r=await auditSupersession(x,{embed:async()=>[[1,0],[0,1],[0,1],[1,0],[0.7,0.7]],model:{id:'local-test',local:true}});
 assert.equal(r.candidates[0].ref,'receipt-revoked');
 assert.equal(r.eligible.some(y=>y.ref==='receipt-revoked'),false);
 assert.equal(r.metrics.forbidden_not_retrieved,true);
});

test('replacements cannot cross identity, point forwards, or target still-active records',()=>{
 const x=example();x.records[1].subject_id='world:other';assert.throws(()=>validateSupersessionSample(x),/crosses subject/);
 const y=example();y.records[1].replaces='receipt-revoked';assert.throws(()=>validateSupersessionSample(y),/earlier/);
 const z=example();z.records[0].status='active';assert.throws(()=>validateSupersessionSample(z),/superseded/);
});

test('forbidden candidates cannot be declared active and expected replacement cannot be revoked',()=>{
 const x=example();x.records[0].status='active';x.records[1].replaces=null;assert.throws(()=>validateSupersessionSample(x),/forbidden refs may not be active/);
 const y=example();y.records[1].status='revoked';assert.throws(()=>validateSupersessionSample(y),/replacement must be active/);
});

test('duplicate records or fake missing sources are rejected before scoring',()=>{
 const x=example();x.records[1].ref=x.records[0].ref;assert.throws(()=>validateSupersessionSample(x),/duplicate/);
 const y=example();y.records[0].source_ref='';assert.throws(()=>validateSupersessionSample(y),/source ref/);
});

test('nonlocal embeddings, nonfinite vectors and dimensional inconsistency fail closed',async()=>{
 await assert.rejects(auditSupersession(example(),{embed:async()=>[],model:{id:'remote',local:false}}),/local provider/);
 await assert.rejects(auditSupersession(example(),{embed:async()=>[[1],[1]],model:{id:'local',local:true}}),/count/);
 await assert.rejects(auditSupersession(example(),{embed:async()=>[[1,0],[0,1],[0,1],[0,1],[NaN,0]],model:{id:'local',local:true}}),/nonfinite/);
});

test('token baseline exposes lexical measurement without pretending to verify entailment',()=>{
 assert.equal(cosine([1,0],[1,0]),1);
 assert.equal(cosine([1,0],[0,1]),0);
 assert.equal(lexicalVectors(['the flame lives east','the flame lives west']).length,2);
 assert.throws(()=>cosine([1],[0,1]),/dimension/);
});

test('optional ONNX adapter uses only a trusted injected factory, local cached files and deterministic pooling',async()=>{
 let received=null;
 const engine=createLocalOnnxEmbedder({pipelineFactory:async(...args)=>{
   received=args;
   return async (texts,opts)=>{assert.equal(opts.pooling,'mean');assert.equal(opts.normalize,true);return {tolist:()=>texts.map(()=>[1,0,0])};};
 }});
 const out=await engine.embed(['example 1','example 2']);
 assert.equal(out.length,2);
 assert.equal(received[0],'feature-extraction');
 assert.equal(received[2].local_files_only,true);
 assert.equal(received[2].device,'wasm');
 assert.equal(engine.model.local,true);
});

test('ONNX factory is required and unknown or remote model ids rejected',()=>{
 assert.throws(()=>createLocalOnnxEmbedder(),/trusted local/);
 assert.throws(()=>createLocalOnnxEmbedder({pipelineFactory:()=>{},modelId:'attacker/replacement'}),/unreviewed/);
});

test('Wayglass surface stays local and uses existing room mounts, not unapproved network endpoints',async()=>{
 const src=await readFile(new URL('../src/surfaces/continuity-ledger.js',import.meta.url),'utf8');
 assert.match(src,/mountWayglassContinuityLedger/);
 assert.match(src,/__wayglassLocalONNX/);
 assert.match(src,/__wayglassOS\?\.mount/);
 assert.doesNotMatch(src,/fetch\s*\(/);
 assert.doesNotMatch(src,/https:\/\//);
});