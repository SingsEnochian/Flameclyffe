// Skýrunor v0.1: bounded semantic declarations, never execution authority.
import {wtlToEnglish, englishToWtl} from './bidirectional.mjs';
export const SKYRUNOR_SCHEMA = 'wyrdrune.skyrunor/v0.1';
export const COLOURS = Object.freeze({'ᚺᚷ':'hazel green','ᚺ':'hazel','ᚷ':'green','ᛒ':'blue','ᛒᚱ':'brown','ᚷᚱ':'grey'});
// ᛋᚴ = version 0.1; ᛗ = owner; ᛖ = eyes; ᚲ = colour;
// ᛞ = owner-declared (not observed or physically verified).
const PREFIX = 'ᛋᚴ:ᛗ/ᛖ/ᚲ=';
function declaration(name) {
  return Object.freeze({schema:SKYRUNOR_SCHEMA,kind:'attribute-declaration',subject:'owner',
    attribute:'eye-colour',value:Object.freeze({type:'colour',name}),basis:'owner-declared'});
}
function keys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === expected.slice().sort().join(',');
}
export function validateDeclaration(ast) {
  if (!keys(ast,['schema','kind','subject','attribute','value','basis']) ||
      ast.schema !== SKYRUNOR_SCHEMA || ast.kind !== 'attribute-declaration' ||
      ast.subject !== 'owner' || ast.attribute !== 'eye-colour' || ast.basis !== 'owner-declared' ||
      !keys(ast.value,['type','name']) || ast.value.type !== 'colour' ||
      !Object.values(COLOURS).includes(ast.value.name))
    throw new TypeError('Unsupported Skýrunor v0.1 declaration; expected owner-declared eye colour.');
  return declaration(ast.value.name);
}
export function glyphsToAst(glyphs) {
  if (typeof glyphs !== 'string' || !glyphs.startsWith(PREFIX) || !glyphs.endsWith('!ᛞ'))
    throw new SyntaxError('Expected canonical Skýrunor v0.1 owner declaration.');
  const token = glyphs.slice(PREFIX.length,-2);
  if (!Object.hasOwn(COLOURS,token)) throw new SyntaxError('Unsupported Skýrunor colour glyph.');
  return declaration(COLOURS[token]);
}
export function astToGlyphs(input) {
  const ast=validateDeclaration(input);
  return PREFIX+Object.keys(COLOURS).find(k=>COLOURS[k]===ast.value.name)+'!ᛞ';
}
export function declarationToEnglish(input) {
  return 'Owner declaration: My eyes are '+validateDeclaration(input).value.name+'.';
}
export function englishToDeclaration(text) {
  for (const name of Object.values(COLOURS)) {
    const ast=declaration(name);
    if (text===declarationToEnglish(ast)) return ast;
  }
  throw new SyntaxError('Unsupported declaration. Use “Owner declaration: My eyes are hazel green.” or another supported colour.');
}
export function astToWtl(input) {
  const ast=validateDeclaration(input), colour=JSON.stringify(ast.value.name);
  return `mobius scoped {
  perceive {
    let declaration_subject = "owner";
    let declaration_basis = "owner-declared";
    let my_eye_colour = ${colour};
  }
  compress {}
  release {}
  verify {
    require declaration_subject == "owner" else "Declaration subject changed";
    require declaration_basis == "owner-declared" else "Declaration basis changed";
    require my_eye_colour == ${colour} else "Eye colour declaration changed";
  }
  integrate {}
  choose { emit "My eyes are ${ast.value.name}"; }
  return { emit "Held"; }
  transcend {
    carry my_eye_colour = my_eye_colour;
    carry declaration_subject = declaration_subject;
    carry declaration_basis = declaration_basis;
  }
}`;
}
const meaning = ir => JSON.stringify({schema:ir.schema,units:ir.units,operators:ir.operators||[]});
export function wtlToAst(source,{compile}={}) {
  if (typeof compile !== 'function') throw new TypeError('Supply the canonical Wyrdrune compiler.');
  const actual=meaning(compile(source));
  // Compare the ENTIRE typed IR, never extract a familiar assignment and discard effects.
  for (const name of Object.values(COLOURS)) {
    const ast=declaration(name);
    if (actual===meaning(compile(astToWtl(ast)))) return ast;
  }
  throw new SyntaxError('WTL is outside the Skýrunor v0.1 declaration grammar; use exact rune byte transport.');
}
export function roundTripSkyrunor(glyphs,{compile}={}) {
  const ast=glyphsToAst(glyphs),source=astToWtl(ast);
  const english=wtlToEnglish(source,{compile}).english;
  const restored=wtlToAst(englishToWtl(english,{compile}).source,{compile});
  if (astToGlyphs(restored)!==glyphs) throw new Error('Skýrunor meaning changed.');
  return Object.freeze({schema:SKYRUNOR_SCHEMA,ast,glyphs,source,english,
    declaration:declarationToEnglish(ast),equivalent:true,executed:false,
    physically_verified:false,requires_explicit_execution:true});
}

// Shared entry point for host integrations. Unsupported source is never silently reduced.
export function translateDeclaration({format,input},{compile}={}) {
  let ast;
  switch (format) {
    case 'skyrunor': ast=glyphsToAst(input); break;
    case 'ast': ast=validateDeclaration(input); break;
    case 'declaration': ast=englishToDeclaration(input); break;
    case 'wtl': ast=wtlToAst(input,{compile}); break;
    case 'structured-en-GB': ast=wtlToAst(englishToWtl(input,{compile}).source,{compile}); break;
    default: throw new TypeError('Unsupported Skýrunor input format.');
  }
  const result=roundTripSkyrunor(astToGlyphs(ast),{compile});
  return Object.freeze({...result,source_hash:compile(result.source).sourceHash});
}
