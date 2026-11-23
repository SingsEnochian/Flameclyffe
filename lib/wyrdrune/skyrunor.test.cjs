const {test}=require('node:test');
const assert=require('node:assert/strict');
const native=require('./wyrdrune.cjs');
const opts={compile:native.compile};
const glyphs='ᛋᚴ:ᛗ/ᛖ/ᚲ=ᚺᚷ!ᛞ';
test('all declared colours round trip through glyphs, typed AST, WTL and structured British English',async()=>{
 const s=await import('./skyrunor.mjs');
 for(const [token,name] of Object.entries(s.COLOURS)) {
  const text='ᛋᚴ:ᛗ/ᛖ/ᚲ='+token+'!ᛞ',r=s.roundTripSkyrunor(text,opts);
  assert.equal(r.ast.value.name,name);assert.equal(r.ast.basis,'owner-declared');
  assert.equal(r.executed,false);assert.equal(r.physically_verified,false);
  assert.equal(s.astToGlyphs(r.ast),text);
  for(const [format,input] of [['ast',r.ast],['skyrunor',text],['declaration',r.declaration],['wtl',r.source],['structured-en-GB',r.english]])
   assert.deepEqual(s.translateDeclaration({format,input},opts).ast,r.ast);
  const result=await native.execute(native.compile(r.source));
  assert.equal(result.status,'committed');
  assert.deepEqual(result.output,['My eyes are '+name,'Held']);
  assert.deepEqual(result.continuity.carry,{my_eye_colour:name,declaration_subject:'owner',declaration_basis:'owner-declared'});
 }
});
test('canonical glyphs reject byte transport, unknown version, altered provenance and malformed grammar',async()=>{
 const s=await import('./skyrunor.mjs');
 for(const bad of ['',null,'ᛟᛟ',glyphs+' ',glyphs.replace('ᛋᚴ','ᛋᛋ'),glyphs.replace('ᚺᚷ','ᛟ'),glyphs.replace('!ᛞ','!ᛏ'),glyphs+';run'])
  assert.throws(()=>s.glyphsToAst(bad));
 for(const bad of ['My eyes are hazel green.','Owner declaration: Your eyes are hazel green.','Owner declaration: My eyes are purple.','Measured: My eyes are hazel green.'])
  assert.throws(()=>s.englishToDeclaration(bad));
 const ast=s.glyphsToAst(glyphs);
 for(const bad of [{...ast,basis:'physically-verified'},{...ast,subject:'someone-else'},{...ast,attribute:'hair-colour'},{...ast,executed:true},{...ast,value:{type:'text',name:'hazel green'}},{...ast,value:{...ast.value,extra:true}}])
  assert.throws(()=>s.astToGlyphs(bad));
});
test('reverse WTL checks the whole programme including emissions, authority, carry and additional cycles',async()=>{
 const s=await import('./skyrunor.mjs'),source=s.astToWtl(s.glyphsToAst(glyphs));
 for(const bad of [source.replace('owner-declared','physically-verified'),source.replace('emit "Held";','emit "Measured";'),source.replace('compress {}','compress { let extra = 1; }'),source.replace('carry declaration_basis = declaration_basis;',''),source+'\n'+source,source.replace('emit "Held";','emit bridge("os","launch",1);')])
  assert.throws(()=>s.wtlToAst(bad,opts));
 assert.equal(s.astToGlyphs(s.wtlToAst('// harmless formatting\n'+source.replaceAll('  ','    '),opts)),glyphs);
});
test('byte transport remains exact and distinct; Feather stops semantic WTL before commit',async()=>{
 const s=await import('./skyrunor.mjs'),b=await import('./bidirectional.mjs');
 const source=s.astToWtl(s.glyphsToAst(glyphs))+'\n// 🪽 ᛟᛟ';
 assert.equal(b.glyphTransportToWtl(b.wtlToGlyphTransport(source)),source);
 assert.throws(()=>b.glyphTransportToWtl(glyphs));
 const controller=new AbortController();controller.abort();
 await assert.rejects(native.execute(native.compile(source),{signal:controller.signal}),/Feather/);
});
