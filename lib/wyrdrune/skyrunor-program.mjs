// Complete current WTL grammar in a semantic script. Glyphs denote operations,
// phases and scopes, not UTF-8 bytes. Names and text remain explicit payloads.
import {roundTripWtl} from './bidirectional.mjs';
import {unparseExpr} from './gloss.mjs';
export const PROGRAM_PREFIX='ᛋᚴᚹ:';
export const PROGRAM_WORDS=Object.freeze({
 mobius:'ᛗ',scoped:'ᛋ',spiced:'ᛋᛈ',operator:'ᛟ',
 perceive:'ᛈ',compress:'ᚲ',release:'ᚱ',verify:'ᚹ',integrate:'ᛁ',choose:'ᚷ',return:'ᚨ',transcend:'ᛏ',
 let:'ᛚ',set:'ᛊ',emit:'ᛖ',require:'ᚦ',else:'ᛂ',carry:'ᚾ',withness:'ᚹᛁ',WITHNESS:'ᚹᛁᚹ',pause:'ᛈᚨ',
 true:'ᛏᚱ',false:'ᚠ',unknown:'ᚢ',not:'ᚾᛟ',and:'ᚨᚾ',or:'ᛟᚱ',
 '+':'ᚠᚨ','-':'ᚠᚱ','*':'ᚠᛗ','/':'ᚠᛞ','==':'ᛖᛖ','!=':'ᚾᛖ','<':'ᛚᛏ','<=':'ᛚᛖ','>':'ᚷᛏ','>=':'ᚷᛖ',
});
const reverse=Object.fromEntries(Object.entries(PROGRAM_WORDS).map(([k,v])=>[v,k]));
const identifier=/^[\p{L}_][\p{L}\p{N}_]*$/u;
const quoted=/^"(?:\\.|[^"\\])*"/s;
const TYPED_SIGNATURE=/(?:^|\n)\s*operator\s+[\p{L}_][\p{L}\p{N}_]*\([^\n)]*:\s*[\p{L}_]/u;
const TYPED_EFFECT=/(?:^|\n)\s*effect\s+/u;
const shape=ir=>({schema:ir.schema,units:ir.units,...(ir.operators?.length?{operators:ir.operators}:{})});
function serial(value) {const text=JSON.stringify(value);if(!text||text.length>200000)throw new RangeError('Semantic programme exceeds 200 KB.');return text;}
function statement(s) {
 switch(s.k) {
  case 'let': case 'set': case 'carry': return s.k+' '+s.name+' = '+unparseExpr(s.e)+';';
  case 'emit': case 'withness': return s.k+' '+unparseExpr(s.e)+';';
  case 'require': return 'require '+unparseExpr(s.e)+(s.reason===undefined?'':' else '+JSON.stringify(s.reason))+';';
  case 'pause': return 'pause('+unparseExpr(s.beat)+');';
  default: throw new TypeError('Unsupported semantic WTL statement.');
 }
}
export function programAstToWtl(ast,{compile}={}) {
 if(typeof compile!=='function')throw new TypeError('Supply the canonical Wyrdrune compiler.');
 const before=serial(ast);
 if(ast?.schema!=='wyrdrune.ir/v0.1'||!Array.isArray(ast.units))throw new TypeError('Expected a typed WTL programme AST without source hash.');
 const source=[...(ast.operators||[]).map(o=>'operator '+o.name+'('+o.params.join(',')+') = '+unparseExpr(o.body)+';'),
  ...ast.units.map(u=>'mobius'+(u.spiced?' spiced':u.scope==='carried'?' scoped':'')+' {\n'+u.phases.map(p=>p.phase+' {\n'+p.body.map(statement).join('\n')+'\n}').join('\n')+'\n}')].join('\n');
 // Recompilation validates phase restrictions and every expression. Comparing full
 // shape also rejects extra fields, injected identifiers and lossy reconstruction.
 if(serial(shape(compile(source)))!==before)throw new TypeError('Unsupported or noncanonical WTL AST; refusing meaning loss.');
 return source;
}
function encode(source) {
 const tokens=source.match(/"(?:\\.|[^"\\])*"|[\p{L}_][\p{L}\p{N}_]*|\d+(?:\.\d+)?|==|!=|<=|>=|[<>{}()[\]:,;=+*\/-]/gu)||[];
 return PROGRAM_PREFIX+tokens.map(t=>Object.hasOwn(PROGRAM_WORDS,t)?PROGRAM_WORDS[t]:identifier.test(t)?'@'+JSON.stringify(t):t).join(' ');
}
export function wtlToSemanticProgram(source,{compile}={}) {
 if(typeof source==='string'&&(TYPED_SIGNATURE.test(source)||TYPED_EFFECT.test(source))){
  // Native typed operator/effect metadata cannot be erased to claim a
  // Skýrunor v0.1 meaning-equivalent programme. Check native WTL then refuse.
  if(typeof compile!=='function')throw new TypeError('Canonical WTL compiler required.');
  const typed=compile(source,{typed:true});
  if(!typed?.ir||!Array.isArray(typed.signatures)||!Array.isArray(typed.effects))
   throw new SyntaxError('Native typed WTL parse failed.');
  throw new SyntaxError('Typed WTL signatures/effects are not representable in semantic Skýrunor v0.1; preserve native WTL or exact rune transport.');
 }
 const r=roundTripWtl(source,{compile}),ast=shape(compile(r.source));
 return Object.freeze({schema:'wyrdrune.skyrunor-program/v0.1',ast,glyphs:encode(r.source),source:r.source,
  english:r.english,source_hash:compile(r.source).sourceHash,equivalent:true,executed:false,
  requires_explicit_execution:true,execution_support:'host-dependent',
  topology:'WTL mobius is a runtime scope/carry construct; it does not certify a physical surface or infinity.'});
}
export function semanticProgramToWtl(glyphs,{compile}={}) {
 if(typeof glyphs!=='string'||!glyphs.startsWith(PROGRAM_PREFIX)||glyphs.length>300000)
  throw new SyntaxError('Expected Skýrunor WTL programme header.');
 let rest=glyphs.slice(PROGRAM_PREFIX.length),tokens=[];
 while(rest.length) {
  rest=rest.trimStart();if(!rest)break;
  if(rest.startsWith('@')) {
   const m=quoted.exec(rest.slice(1));
   if(!m||!identifier.test(JSON.parse(m[0])))throw new SyntaxError('Invalid semantic identifier.');
   tokens.push(JSON.parse(m[0]));rest=rest.slice(1+m[0].length);continue;
  }
  const q=quoted.exec(rest);
  if(q){JSON.parse(q[0]);tokens.push(q[0]);rest=rest.slice(q[0].length);continue;}
  const m=/^(?:\d+(?:\.\d+)?|[ᚠ-᛿]+|[{}()[\]:,;=])/.exec(rest);
  if(!m)throw new SyntaxError('Unknown semantic programme token.');
  const t=m[0];
  if(/^[ᚠ-᛿]/.test(t)&&!Object.hasOwn(reverse,t))throw new SyntaxError('Unknown semantic operation glyph.');
  tokens.push(reverse[t]??t);rest=rest.slice(t.length);
 }
 const result=wtlToSemanticProgram(tokens.join(' '),{compile});
 if(result.glyphs!==glyphs)throw new SyntaxError('Noncanonical semantic programme; use the canonical encoder.');
 return result;
}
export function astToSemanticProgram(ast,options) {return wtlToSemanticProgram(programAstToWtl(ast,options),options);}
