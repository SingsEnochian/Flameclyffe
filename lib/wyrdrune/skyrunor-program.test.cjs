const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {compile}=require('./wyrdrune.cjs'),opts={compile};
test('supported native WTL reverses through semantic operations; typed signatures cannot silently lose meaning',async()=>{
 const s=await import('./skyrunor-program.mjs');
 const files=fs.readdirSync(__dirname).filter(f=>f.endsWith('.wtl'));
 assert.ok(files.length>=17);
 let represented=0,typedNative=0;
 for(const file of files){
  const source=fs.readFileSync(path.join(__dirname,file),'utf8');
  const hasTypes=/(?:^|\n)\s*operator\s+[\p{L}_][\p{L}\p{N}_]*\([^\n)]*:\s*[\p{L}_]/u.test(source)
    ||/(?:^|\n)\s*effect\s+/u.test(source);
  if(hasTypes){
   const checked=compile(source,{typed:true});
   assert.equal(checked.ir.schema,'wyrdrune.ir/v0.1',file);
   assert.throws(()=>s.wtlToSemanticProgram(source,opts),/Typed WTL signatures\/effects/,file);
   typedNative++;continue;
  }
  const r=s.wtlToSemanticProgram(source,opts);
  assert.deepEqual(compile(r.source).units,compile(source).units,file);
  assert.deepEqual(s.semanticProgramToWtl(r.glyphs,opts).ast,r.ast,file);
  assert.equal(s.astToSemanticProgram(r.ast,opts).glyphs,r.glyphs,file);
  assert.equal(r.executed,false);
  represented++;
 }
 assert.ok(represented>=17);
 assert.ok(typedNative>=2);
});
test('operation glyph grammar covers every expression, statement, operator and scope form',async()=>{
 const s=await import('./skyrunor-program.mjs');
 const source=`operator double(α) = α * 2;
 mobius spiced {
 perceive { let α = [1,2]; let result = {value: double(2), other: unknown}; let yes = true; }
 compress { set yes = not false and (2 >= 1 or 1 != 0); }
 release { let n = -(2 + 3) / 2 - 1; }
 verify { require yes == true else "must hold"; }
 integrate { withness {field:"declared"}; }
 choose { pause(2); emit result; }
 return { emit "Held"; }
 transcend { carry result = result; }
 }`;
 const r=s.wtlToSemanticProgram(source,opts);
 assert.match(r.english,/Define operator double/);assert.match(r.english,/spiced/);
 assert.deepEqual(s.semanticProgramToWtl(r.glyphs,opts).ast,r.ast);
 assert.equal(s.astToSemanticProgram(r.ast,opts).glyphs,r.glyphs);
 assert.throws(()=>s.semanticProgramToWtl(r.glyphs.replace('ᛗ','᛿'),opts));
 assert.throws(()=>s.astToSemanticProgram({...r.ast,consent:true},opts));
});
test('literal glyphs, syntax and identifier names remain explicit data, not executable substitutions',async()=>{
 const s=await import('./skyrunor-program.mjs');
 const source='mobius { perceive { let ᛗ = "ᛗ @ \\\" execute"; } compress {} release {} verify {} integrate {} choose { emit ᛗ; } return {} transcend {} }';
 const r=s.wtlToSemanticProgram(source,opts);
 assert.deepEqual(s.semanticProgramToWtl(r.glyphs,opts).ast,r.ast);
 assert.throws(()=>s.semanticProgramToWtl(r.glyphs+' @"extra"',opts));
});
test('general changes preserve all domains, all operation kinds, provenance and consent without execution',async()=>{
 const c=await import('./skyrunor-change.mjs');
 for(const domain of Object.keys(c.CHANGE_DOMAINS))for(const kind of Object.keys(c.CHANGE_KINDS)){
  const input={...c.EXAMPLE_CHANGE,domain,kind,before:{type:'absent'},after:kind==='remove'?{type:'absent'}:{type:'record',value:{a:{type:'list',value:[{type:'number',value:2},{type:'boolean',value:false},{type:'null'},{type:'reference',value:'source:1'}]}}}};
  const r=c.inspectChange(input);
  assert.deepEqual(c.glyphsToChange(r.glyphs),r.ast);
  assert.deepEqual(c.englishToChange(r.english),r.ast);
  assert.equal(r.execution_supported,false);assert.equal(r.executed,false);assert.equal(r.consent_verified,false);
  assert.deepEqual(r.external_effects,[]);
 }
});
test('changes fail closed on lost fields, forged authority, invalid types, unknown versions and contradictory glyphs',async()=>{
 const c=await import('./skyrunor-change.mjs'),valid=c.EXAMPLE_CHANGE;
 for(const bad of [{...valid,schema:'future'},{...valid,domain:'made-up'},{...valid,applied:true},{...valid,after:{type:'number',value:Infinity}},{...valid,consent:{status:'authorised',reference:'yes'}},{...valid,consent:{status:'declared',reference:null}},{...valid,effective_at:'2026-02-31T00:00:00.000Z'},{...valid,kind:'create'},{...valid,kind:'remove'}])assert.throws(()=>c.inspectChange(bad));
 assert.throws(()=>c.glyphsToChange(c.changeToGlyphs(valid).replace('ᛗ/ᛞ','ᚠ/ᛞ')));
 assert.throws(()=>c.englishToChange(c.changeToEnglish(valid).replace('Proposed declare','Proposed observe')));
});

test('English-looking names, Unicode identifiers and exponent-sized decimal literals preserve meaning',async()=>{
 const s=await import('./skyrunor-program.mjs');
 for(const name of ['plus','is','αisα'])for(const value of ['1000000000000000000000','0.0000001']){
  const source='mobius { perceive { let '+name+' = '+value+'; } compress {} release {} verify {} integrate {} choose { emit '+name+'; } return {} transcend {} }';
  const r=s.wtlToSemanticProgram(source,opts);assert.deepEqual(s.semanticProgramToWtl(r.glyphs,opts).ast,r.ast);
 }
});
