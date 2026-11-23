'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const native=require('./wyrdrune.cjs'),canonical=require('./canonical.cjs');
const source=fs.readFileSync(path.join(__dirname,'first-lantern.wtl'),'utf8');
test('iPad SHA-256 matches Node for Unicode and 64-byte boundaries',async()=>{
 const {sha256Hex}=await import('./browser-canonical.mjs');
 for(const s of ['','abc','ᚹ 🪽','x'.repeat(63),'x'.repeat(64),'x'.repeat(65),'x'.repeat(2000),source])
  assert.equal(sha256Hex(s),crypto.createHash('sha256').update(s).digest('hex'));
});
test('iPad canonical digest exactly matches WCE-1',async()=>{
 const {canonicalEncode,canonicalDigest}=await import('./browser-canonical.mjs');
 for(const v of [null,true,false,-0,0.25,'ᚹ',[1,2,{x:3}],{b:'B',a:[0,5]}]){
  assert.equal(canonicalEncode(v),canonical.encode(v));assert.equal(canonicalDigest(v),canonical.digest(v));
 }
});
test('the actual shared WTL runtime executes First Lantern in the browser host',async()=>{
 const {createWyrdruneRuntime}=await import('./runtime.mjs');
 const {sha256Hex,canonicalDigest}=await import('./browser-canonical.mjs');
 const browser=createWyrdruneRuntime({hashSource:sha256Hex,continuityDigest:canonicalDigest});
 const ir=browser.compile(source),out=await browser.execute(ir,{principal:{id:'ipad-local',authorized:false},bridges:{},maxOperations:5000});
 assert.deepEqual(ir,native.compile(source));assert.equal(out.status,'committed');
 assert.deepEqual(out.output,[9,'Held']);assert.equal(out.withness.completedCycles,1);
 assert.equal(out.checkpoints.length,1);assert.equal(out.continuity.carry.lantern,9);
});
test('English and rune transport make a verified First Lantern round trip',async()=>{
 const {roundTripWtl,wtlToGlyphTransport,glyphTransportToWtl}=await import('./bidirectional.mjs');
 assert.equal(roundTripWtl(source,{compile:native.compile}).equivalent,true);
 assert.equal(glyphTransportToWtl(wtlToGlyphTransport(source)),source);
});
test('no browser host capabilities means a bridged WTL instruction fails closed',async()=>{
 const {createWyrdruneRuntime}=await import('./runtime.mjs');
 const {sha256Hex,canonicalDigest}=await import('./browser-canonical.mjs');
 const browser=createWyrdruneRuntime({hashSource:sha256Hex,continuityDigest:canonicalDigest});
 const altered=source.replace('emit lantern;','emit bridge("os","launch",lantern);');
 const out=await browser.execute(browser.compile(altered),{principal:{id:'ipad-local',authorized:false},bridges:{}});
 assert.notEqual(out.status,'committed');assert.equal(out.output.length,0);
});
