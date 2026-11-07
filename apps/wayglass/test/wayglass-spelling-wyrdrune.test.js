import test from 'node:test';
import assert from 'node:assert/strict';
import { applyWayglassSpelling,createWayglassSpellingController } from '../src/spelling-assistance.js';
import { previewWyrdrune,draftWyrdruneDiscussion } from '../src/wyrdrune-client.js';

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

test('WTL preview posts to the House host without provider dispatch',async()=>{
  let seen;
  const record={schema:'wayglass.wyrdrune-ritual-preview/v0.1',status:'preview-only',dispatch:'none',receiptHash:'wce1:abc',phaseReceipts:[{phase:'perceive'}]};
  const preview=await previewWyrdrune('mobius { }',{fetchImpl:async(url,options)=>{
    seen={url,options};
    return {ok:true,json:async()=>record};
  }});
  assert.equal(preview.receiptHash,'wce1:abc');
  assert.equal(seen.url,'/api/v1/wayglass/wyrdrune/preview');
  assert.equal(seen.options.credentials,'same-origin');
  assert.equal(JSON.parse(seen.options.body).source,'mobius { }');
  assert.equal(draftWyrdruneDiscussion('mobius { }',preview).includes('You may agree, disagree'),true);
  await assert.rejects(previewWyrdrune('',{fetchImpl:async()=>{throw Error('called')}}),/Enter Wyrdrune/);
  await assert.rejects(previewWyrdrune('mobius { }',{fetchImpl:async()=>({
    ok:true,json:async()=>({...record,dispatch:'external-model'})
  })}),/Unverified Wyrdrune/);
});
