import test from 'node:test';
import assert from 'node:assert/strict';
import { applyWayglassSpelling,createWayglassSpellingController } from '../src/spelling-assistance.js';
import { previewWyrdrune,draftWyrdruneDiscussion } from '../src/wyrdrune-client.js';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import { encodeWce1,digestWce1,verifyWyrdrunePreview } from '../src/wyrdrune-proof.js';
const require=createRequire(import.meta.url);
const { previewWyrdruneRitual }=require('../../../lib/wayglass-wyrdrune-ritual.cjs');
const canonical=require('../../../lib/wyrdrune/canonical.cjs');
const vectors=require('../../../lib/wyrdrune/conformance/wce1-vectors.json');

function fakeField(code=false) {
  const attrs=new Map(code?[['data-wtl-code','true']]:[]);
  return {
    spellcheck:null,
    hasAttribute:key=>attrs.has(key),
    closest:()=>null,
    setAttribute:(key,value)=>attrs.set(key,value),
    getAttribute:key=>attrs.get(key)||null,
    attrs,
  };
}
test('spelling uses native local suggestions, honors code opt-out and owner toggle',()=>{
  const ordinary=fakeField(),wtl=fakeField(true);
  const root={querySelectorAll:()=>[ordinary,wtl]};
  assert.equal(applyWayglassSpelling(root),1);
  assert.equal(ordinary.spellcheck,true);
  assert.equal(ordinary.attrs.get('lang'),'en');
  assert.equal(wtl.spellcheck,false,'Enochian and WTL code never get rewritten by English suggestions');
  const controller=createWayglassSpellingController({document:root});
  assert.equal(controller.enabled,true);
  const values=[];const unlisten=controller.onChange(v=>values.push(v));
  controller.setEnabled(false);
  assert.equal(ordinary.spellcheck,false);
  assert.equal(wtl.spellcheck,false);
  controller.setEnabled(true);
  assert.equal(ordinary.spellcheck,true);
  assert.deepEqual(values,[false,true]);
  unlisten();controller.destroy();
});


const SOURCE=[
  'mobius {',
  ' perceive { let light = votive("Lantern","A carried flame"); }',
  ' compress { let letter = angelicLetter(1); }',
  ' release { let inscription = enochian("Pa","name"); }',
  ' verify { emit light; }',
  ' integrate { emit letter; }',
  ' choose { emit inscription; }',
  ' return { emit 8; }',
  ' transcend { emit 1; }',
  '}',
].join('\n');

async function receipt() {
  return { ...await previewWyrdruneRitual(SOURCE),dispatch:'none',model_turn:false,canon_commit:false };
}

test('browser WCE-1 reproduces every JavaScript and Python reference vector',async()=>{
  for(const v of vectors.vectors){
    assert.equal(encodeWce1(v.value),v.expect,v.name);
    assert.equal(await digestWce1(v.value,webcrypto),canonical.digest(v.value),v.name);
  }
  for(const bad of [undefined,()=>0,NaN,Infinity,'\uD800',new Date(0)]){
    assert.throws(()=>encodeWce1(bad));
  }
});

test('WTL preview posts to House and independently verifies all eight linked phases',async()=>{
  const record=await receipt();
  let seen;
  const preview=await previewWyrdrune(SOURCE,{
    cryptoImpl:webcrypto,
    fetchImpl:async(url,options)=>{
      seen={url,options};
      return {ok:true,json:async()=>record};
    }
  });
  assert.equal(preview.receiptHash,record.receiptHash);
  assert.equal(preview.verification.verified,true);
  assert.equal(preview.verification.phases,8);
  assert.equal(preview.verification.terminalHash,record.ritualLedger.terminalHash);
  assert.equal(seen.url,'/api/v1/wayglass/wyrdrune/preview');
  assert.equal(seen.options.credentials,'same-origin');
  assert.equal(JSON.parse(seen.options.body).source,SOURCE);
  assert.equal(draftWyrdruneDiscussion(SOURCE,preview).includes('You may agree, disagree'),true);
  await assert.rejects(previewWyrdrune('',{fetchImpl:async()=>{throw Error('called')}}),/Enter Wyrdrune/);
  await assert.rejects(previewWyrdrune(SOURCE,{cryptoImpl:webcrypto,fetchImpl:async()=>({
    ok:true,json:async()=>({...record,dispatch:'external-model'})
  })}),/Unverified Wyrdrune/);
});

test('browser rejects source substitution, emitted value tampering, phase breaks and fake receipt',async()=>{
  const original=await receipt();
  assert.deepEqual((await verifyWyrdrunePreview(SOURCE,original,webcrypto)).verified,true);
  const invalid=[
    [SOURCE+' ',original],
    [SOURCE,{...original,receiptHash:'wce1:'+ 'f'.repeat(64)}],
    [SOURCE,{...original,values:original.values.map((v,i)=>i===0?{...v,name:'Impersonated'}:v)}],
    [SOURCE,{...original,ritualLedger:{...original.ritualLedger,entries:original.ritualLedger.entries.map((v,i)=>i===2?{...v,previousHash:original.ritualLedger.root}:v)}}],
    [SOURCE,{...original,model_turn:true}],
    [SOURCE,{...original,dispatch:'provider'}],
  ];
  for(const [source,payload] of invalid){
    await assert.rejects(verifyWyrdrunePreview(source,payload,webcrypto),/integrity verification failed/);
  }
  assert.throws(()=>draftWyrdruneDiscussion(SOURCE,original),/owner-reviewed Wyrdrune preview/);
});
