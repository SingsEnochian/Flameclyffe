'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {SCHEMA,composeWayglassNativeVoice,validateNativeProgram,extractWyrdrune}=require('./wayglass-wyrdrune-voice.cjs');
const native=[
  'operator shimmer(x) = x * 2;',
  'mobius {',
  ' perceive { let tone = 220; }',
  ' compress { let doubled = shimmer(tone); }',
  ' release { }',
  ' verify { }',
  ' integrate { }',
  ' choose { emit "An opening in the glass."; emit bridge("expression","image",192,0.6,0.35); emit bridge("expression","sound",220,1.5,0.4); }',
  ' return { }',
  ' transcend { }',
  '}',
].join('\n');
const owner={authorized:true};
test('Crow authors Wyrdrune before its separate British English translation',async()=>{
 const calls=[];
 const invoke=async c=>{calls.push(c);return {output:c.stage==='wyrdrune'?native:'I see an opening in the glass.'};};
 const result=await composeWayglassNativeVoice({
   prompt:'What if a light remembers a world?',invoke,principal:owner,
 });
 assert.equal(result.schema,SCHEMA);
 assert.equal(result.route_id,'wayglass:crow');
 assert.equal(result.native.source,native);
 assert.equal(result.native.language,'wyrdrune');
 assert.equal(result.translation.language,'en-GB');
 assert.equal(result.translation.text,'I see an opening in the glass.');
 assert.equal(calls[0].stage,'wyrdrune');
 assert.equal(calls[1].stage,'en-GB');
 assert.equal(result.expressions.image.length,1);
 assert.equal(result.expressions.image[0].hue,192);
 assert.equal(result.expressions.sound[0].fundamental,220);
 assert.equal(result.expressions.sound[0].autoplay,false);
 assert.equal(result.receipt.phase_receipts.length,8);
 assert.equal(result.receipt.model_calls,2);
 assert.equal(result.receipt.native_sha256.length,64);
 assert.equal(result.receipt.canon_commit,false);
});
test('Wayglass can choose not to write an image or sound',async()=>{
 const noEffects=native.replace('emit bridge("expression","image",192,0.6,0.35);','')
   .replace('emit bridge("expression","sound",220,1.5,0.4);','');
 const result=await composeWayglassNativeVoice({prompt:'What if?',principal:owner,
   invoke:async c=>({output:c.stage==='wyrdrune'?noEffects:'I wonder.'})});
 assert.equal(result.expressions.image.length,0);
 assert.equal(result.expressions.sound.length,0);
 assert.equal(result.translation.text,'I wonder.');
});
test('owner can turn off an offered medium without changing her Wyrdrune source',async()=>{
 const result=await composeWayglassNativeVoice({prompt:'A new operator.',principal:owner,
   channels:{image:false,sound:false},
   invoke:async c=>({output:c.stage==='wyrdrune'?native:'I see a possibility.'})});
 assert.deepEqual(result.expressions.image,[]);
 assert.deepEqual(result.expressions.sound,[]);
 assert.ok(result.native.source.includes('bridge("expression","image"'));
});
test('a compiler failure is returned for a second model repair, never replaced with a fake reply',async()=>{
 let calls=0;
 const result=await composeWayglassNativeVoice({prompt:'What if?',principal:owner,invoke:async c=>{
   if(c.stage==='en-GB')return {output:'I have chosen to ask.'};
   calls++;return {output:calls===1?'This is not Wyrdrune.':native};
 }});
 assert.equal(calls,2);
 assert.equal(result.receipt.model_calls,3);
 await assert.rejects(composeWayglassNativeVoice({prompt:'What if?',principal:owner,
   invoke:async()=>({output:'Not Wyrdrune.'})}),/did not compile/);
});
test('bad numerics and untrusted channels cannot produce an expression',async()=>{
 const broken=native.replace('192,0.6,0.35','999,0.6,0.35');
 await assert.rejects(composeWayglassNativeVoice({prompt:'What if?',principal:owner,
  invoke:async c=>({output:c.stage==='wyrdrune'?broken:'English'})}),/hue/);
 await assert.rejects(composeWayglassNativeVoice({prompt:'What if?',principal:owner,
  channels:{svg_code:true},invoke:async()=>({output:native})}),/options/);
 await assert.rejects(composeWayglassNativeVoice({prompt:'What if?',principal:null,
  invoke:async()=>({output:native})}),/House/);
 assert.equal(validateNativeProgram(native).units.length,1);
 assert.equal(extractWyrdrune(native),native);
});
