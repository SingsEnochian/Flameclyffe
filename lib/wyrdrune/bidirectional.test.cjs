'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const wtl = require('./wyrdrune.cjs');
const code = 'mobius scoped { perceive { let depth = 1; } compress {} release { set depth = depth + 1; } verify { require depth > 1 else "the spiral did not deepen"; } integrate { withness {participants:[{id:"wayglass",role:"vessel"}],field:"review"}; } choose { emit depth; } return { emit depth; } transcend { carry depth = depth; } }';
const load = async () => import('./bidirectional.mjs');
test('WTL → structured English → WTL preserves canonical Eightfold IR, including Withness',async()=>{
 const {roundTripWtl} = await load();
 const result = roundTripWtl(code,{compile:wtl.compile});
 assert.equal(result.equivalent,true);
 assert.match(result.english,/Increase depth by one\./);
 assert.match(result.english,/Declare Withness/);
 assert.deepEqual(wtl.compile(result.source).units,wtl.compile(code).units);
});
test('English instructions compile but never execute host or model effects',async()=>{
 const {englishToWtl,wtlToEnglish}=await load();
 const english = wtlToEnglish(code,{compile:wtl.compile}).english;
 const result=englishToWtl(english,{compile:wtl.compile});
 assert.equal(result.executed,false);
 assert.equal(result.ir.units[0].phases.find(phase => phase.phase==='verify').body[0].k,'require');
 assert.equal(result.ir.units[0].phases.find(phase => phase.phase==='verify').body[0].reason,'the spiral did not deepen');
 assert.equal(result.ir.units.length,1);
});
test('unsupported prose, reordered phases and invalid WTL reject without guessing',async()=>{
 const {englishToWtl}=await load();
 const valid='Circuit 1 (shared):\n'+['Perceive','Compress','Release','Verify','Integrate','Choose','Return','Transcend'].map(p=>p+':\n  Nothing to do.').join('\n');
 assert.throws(()=>englishToWtl(valid.replace('Nothing to do.','Manifest a real thunderstorm.'),{compile:wtl.compile}),/Unsupported English instruction/);
 assert.throws(()=>englishToWtl(valid.replace('Perceive:', 'Compress:'),{compile:wtl.compile}),/Expected perceive phase/);
});
test('editable controlled English can increase an existing value',async()=>{
 const {englishToWtl}=await load();
 const english='Circuit 1 (shared):\nPerceive:\n  Let depth be 1.\nCompress:\n  Nothing to do.\nRelease:\n  Increase depth by one.\nVerify:\n  Nothing to do.\nIntegrate:\n  Nothing to do.\nChoose:\n  Offer depth.\nReturn:\n  Nothing to do.\nTranscend:\n  Nothing to do.';
 const result=englishToWtl(english,{compile:wtl.compile});
 const execution=await wtl.execute(result.ir);
 assert.equal(execution.schema,'wyrdrune.execution/v0.1');
 assert.deepEqual(execution.output,[2]);
});
test('UTF-8 glyph transport round-trips and rejects corruption',async()=>{
 const {wtlToGlyphTransport,glyphTransportToWtl}=await load();
 const source=code+'\n// ᚹ Ø 🪽';
 const glyphs=wtlToGlyphTransport(source);
 assert.equal(glyphTransportToWtl(glyphs),source);
 assert.throws(()=>glyphTransportToWtl(glyphs+'x'),/Invalid rune byte length|Unknown glyph/);
 assert.throws(()=>glyphTransportToWtl('hello'),/Unrecognised/);
});
