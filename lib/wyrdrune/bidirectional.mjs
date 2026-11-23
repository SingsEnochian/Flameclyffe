// Whole Pizza native language bridge: deterministic en-GB <-> canonical WTL.
// The English authoring dialect is deliberately bounded. Unknown prose FAILS
// CLOSED; this module NEVER executes translated code or requests a model.
import { PHASES } from './runtime.mjs';
import { glossProgram, unparseExpr } from './gloss.mjs';

export const TRANSLATION_SCHEMA = 'wyrdrune.translation/v0.1';
const NAME = '[\\p{L}_][\\p{L}\\p{N}_]*';
const ALPHABET = [...'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛋ'];
const PREFIX = 'ᛟᛟ';
if (ALPHABET.length !== 16 || new Set(ALPHABET).size !== 16) {
  throw new Error('The Skýrunor transport alphabet must contain sixteen unique runes.');
}
const quote = value => JSON.stringify(value);
const complex = expression => 'WTL expression ' + quote(unparseExpr(expression));

function simple(expression) {
  if (!expression || typeof expression !== 'object') return false;
  switch (expression.k) {
    case 'literal': return ['string','number','boolean'].includes(typeof expression.v);
    case 'read': return /^[A-Za-z_][A-Za-z0-9_]*$/.test(expression.name) && !/^(plus|minus|times|divided|by|is|at|least|most|more|less|than)$/i.test(expression.name);
    case 'unknown': return true;
    case 'neg':
    case 'not': return simple(expression.v);
    case 'binary':
    case 'compare':
    case 'logic': return simple(expression.a) && simple(expression.b);
    default: return false;
  }
}
const ARITH = {'+':'plus','-':'minus','*':'times','/':'divided by'};
const COMP = {'==':'is','!=':'is not','>':'is more than','>=':'is at least','<':'is less than','<=':'is at most'};

export function expressionInEnglish(e) {
  if (!simple(e)) return complex(e);
  switch (e.k) {
    case 'literal': return unparseExpr(e);
    case 'unknown': return 'unknown';
    case 'read': return e.name;
    case 'neg': return '(minus ' + expressionInEnglish(e.v) + ')';
    case 'not': return '(not ' + expressionInEnglish(e.v) + ')';
    case 'binary': return '(' + expressionInEnglish(e.a) + ' ' + ARITH[e.op] + ' ' + expressionInEnglish(e.b) + ')';
    case 'compare': return '(' + expressionInEnglish(e.a) + ' ' + COMP[e.op] + ' ' + expressionInEnglish(e.b) + ')';
    case 'logic': return '(' + expressionInEnglish(e.a) + ' ' + e.op + ' ' + expressionInEnglish(e.b) + ')';
    default: throw new TypeError('Unsupported expression kind');
  }
}

function expressionInWtl(phrase) {
  const input = String(phrase || '').trim();
  if (!input) throw new SyntaxError('An English expression must not be empty.');
  const explicit = /^WTL expression ("(?:\\.|[^"\\])*")$/s.exec(input);
  if (explicit) {
    const decoded = JSON.parse(explicit[1]);
    if (typeof decoded !== 'string' || decoded.length > 20000) throw new SyntaxError('Invalid explicit WTL expression');
    return decoded;
  }
  const chunks = input.split(/("(?:\\.|[^"\\])*")/g);
  const converted = chunks.map((chunk, i) => {
    if (i % 2) { JSON.parse(chunk); return chunk; }
    return chunk
      .replace(/\bis at least\b/gi,'>=')
      .replace(/\bis at most\b/gi,'<=')
      .replace(/\bis more than\b/gi,'>')
      .replace(/\bis less than\b/gi,'<')
      .replace(/\bis not\b/gi,'!=')
      .replace(/\bdivided by\b/gi,'/')
      .replace(/\bplus\b/gi,'+')
      .replace(/\bminus\b/gi,'-')
      .replace(/\btimes\b/gi,'*')
      .replace(/\bis\b/gi,'==');
  }).join('');
  // Reject unexpected punctuation rather than smuggling statements through translation.
  const unquoted = converted.replace(/"(?:\\.|[^"\\])*"/g,'""');
  if (!/^[\p{L}\p{N}_+\-*/<>=!(). \t"]+$/u.test(unquoted)) {
    throw new SyntaxError('Unsupported English expression: ' + input);
  }
  return converted;
}

function statementInEnglish(s) {
  switch (s.k) {
    case 'let': return 'Let ' + s.name + ' be ' + expressionInEnglish(s.e) + '.';
    case 'set':
      if (s.e?.k === 'binary' && s.e?.op === '+' && s.e.a?.k === 'read' &&
        s.e.a.name === s.name && s.e.b?.k === 'literal' && s.e.b.v === 1)
        return 'Increase ' + s.name + ' by one.';
      return 'Set ' + s.name + ' to ' + expressionInEnglish(s.e) + '.';
    case 'emit': return 'Offer ' + expressionInEnglish(s.e) + '.';
    case 'require': return 'Require ' + expressionInEnglish(s.e) +
      (s.reason == null ? '' : ' or refuse with ' + quote(s.reason)) + '.';
    case 'carry': return 'Carry ' + s.name + ' forward as ' + expressionInEnglish(s.e) + '.';
    case 'withness': return 'Declare Withness as ' + expressionInEnglish(s.e) + '.';
    case 'pause': return 'Pause at ' + expressionInEnglish(s.beat) + ' hertz.';
    default: throw new SyntaxError('Not yet reversible in English: ' + s.k);
  }
}

function statementInWtl(line) {
  let m;
  if ((m = new RegExp('^Let ('+NAME+') be (.+)\\.$','su').exec(line)))
    return 'let ' + m[1] + ' = ' + expressionInWtl(m[2]) + ';';
  if ((m = new RegExp('^Set ('+NAME+') to (.+)\\.$','su').exec(line)))
    return 'set ' + m[1] + ' = ' + expressionInWtl(m[2]) + ';';
  if ((m = new RegExp('^Increase ('+NAME+') by one\\.$','su').exec(line)))
    return 'set ' + m[1] + ' = ' + m[1] + ' + 1;';
  if ((m = /^Offer (.+)\.$/s.exec(line))) return 'emit ' + expressionInWtl(m[1]) + ';';
  if ((m = new RegExp('^Carry ('+NAME+') forward as (.+)\\.$','su').exec(line)))
    return 'carry ' + m[1] + ' = ' + expressionInWtl(m[2]) + ';';
  if ((m = /^Declare Withness as (.+)\.$/s.exec(line)))
    return 'withness ' + expressionInWtl(m[1]) + ';';
  if ((m = /^Pause at (.+) hertz\.$/s.exec(line)))
    return 'pause(' + expressionInWtl(m[1]) + ');';
  if ((m = /^Require (.+?)(?: or refuse with ("(?:\\.|[^"\\])*"))?\.$/s.exec(line)))
    return 'require ' + expressionInWtl(m[1]) + (m[2] == null ? '' : ' else ' + quote(JSON.parse(m[2]))) + ';';
  throw new SyntaxError('Unsupported English instruction: ' + line);
}

export function wtlToEnglish(source, { compile } = {}) {
  if (typeof compile !== 'function') throw new TypeError('Supply the canonical Wyrdrune compiler.');
  const ir = compile(source);
  const gloss = glossProgram(ir);
  const lines = (ir.operators || []).map(o => 'Define operator ' + o.name + '(' + o.params.join(',') + ') as ' + expressionInEnglish(o.body) + '.');
  ir.units.forEach((unit, i) => {
    lines.push('Circuit ' + (i+1) + ' (' + (unit.spiced ? 'spiced' : unit.scope === 'carried' ? 'carried' : 'shared') + '):');
    for (const {phase,body} of unit.phases) {
      lines.push(phase[0].toUpperCase() + phase.slice(1) + ':');
      for (const stmt of body) lines.push('  ' + statementInEnglish(stmt));
      if (!body.length) lines.push('  Nothing to do.');
    }
    lines.push('');
  });
  return Object.freeze({
    schema: TRANSLATION_SCHEMA, language: 'en-GB', source_hash: ir.sourceHash,
    english: lines.join('\n').trim(), gloss: gloss.text, ir, status:'read-only',
    authoring_dialect:'structured-en-GB/v0.1', model_invoked:false, executed:false,
  });
}

export function englishToWtl(english, { compile } = {}) {
  if (typeof compile !== 'function') throw new TypeError('Supply the canonical Wyrdrune compiler.');
  if (typeof english !== 'string' || !english.trim() || english.length > 100000)
    throw new TypeError('Structured English must be non-empty text at most 100 KB.');
  const lines = english.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
  let n = 0, count = 0;
  const wtl = [];
  while (n < lines.length && lines[n].startsWith('Define operator ')) {
    const operator = /^Define operator ([\p{L}_][\p{L}\p{N}_]*)\(([^()]*)\) as (.+)\.$/u.exec(lines[n++]);
    if (!operator || (operator[2] && !operator[2].split(',').every(p => /^[\p{L}_][\p{L}\p{N}_]*$/u.test(p))))
      throw new SyntaxError('Invalid structured operator declaration.');
    wtl.push('operator ' + operator[1] + '(' + operator[2] + ') = ' + expressionInWtl(operator[3]) + ';');
  }
  while (n < lines.length) {
    const header = /^Circuit (\d+) \((carried|shared|spiced)\):$/i.exec(lines[n++]);
    if (!header || Number(header[1]) !== ++count) throw new SyntaxError('Expected numbered Circuit header.');
    wtl.push(header[2].toLowerCase()==='spiced'?'mobius spiced {':header[2].toLowerCase()==='carried'?'mobius scoped {':'mobius {');
    for (const phase of PHASES) {
      if (lines[n++] !== phase[0].toUpperCase()+phase.slice(1)+':')
        throw new SyntaxError('Expected '+phase+' phase in canonical Eightfold order.');
      wtl.push('  ' + phase + ' {');
      let statements = 0;
      while (n < lines.length && !/^Circuit \d+ \(/.test(lines[n]) && !PHASES.some(p=>lines[n]===p[0].toUpperCase()+p.slice(1)+':')) {
        const line=lines[n++];
        if (line === 'Nothing to do.') {
          if (statements) throw new SyntaxError('Stillness may not be mixed with instructions.');
          continue;
        }
        if (++statements > 256) throw new RangeError('Too many instructions in one phase.');
        wtl.push('    ' + statementInWtl(line));
      }
      wtl.push('  }');
    }
    wtl.push('}');
  }
  if (!count) throw new SyntaxError('No circuits found.');
  const source = wtl.join('\n');
  const ir = compile(source); // Validate WTL syntax and phase/capability restrictions; DO NOT execute.
  return Object.freeze({
    schema: TRANSLATION_SCHEMA, language:'wtl', source, ir,
    source_hash: ir.sourceHash, model_invoked:false, executed:false,
    requires_explicit_execution:true,
  });
}

export function roundTripWtl(source, { compile } = {}) {
  const English = wtlToEnglish(source, {compile});
  const Wtl = englishToWtl(English.english, {compile});
  const original = compile(source);
  const withoutHash = ir => ({schema:ir.schema,units:ir.units,operators:ir.operators || []});
  const equivalent = JSON.stringify(withoutHash(original)) === JSON.stringify(withoutHash(Wtl.ir));
  if (!equivalent) throw new Error('Translation changed typed Wyrdrune meaning; execution blocked.');
  return Object.freeze({schema:'wyrdrune.roundtrip/v0.1', equivalent:true,
    english:English.english, source:Wtl.source, original_source_hash:original.sourceHash,
    new_source_hash:Wtl.source_hash, executed:false});
}

// Lossless UTF-8 transport encoding, not an asserted Skýrunor semantic grammar.
// It is intentionally separate from the existing animated, nonreversible rune veil.
export function wtlToGlyphTransport(source) {
  if (typeof source !== 'string' || source.length > 100000) throw new TypeError('WTL transport expects text under 100 KB.');
  const bytes = new TextEncoder().encode(source);
  return PREFIX + Array.from(bytes, b=> ALPHABET[b>>4]+ALPHABET[b&15]).join('');
}
export function glyphTransportToWtl(glyphs) {
  if (typeof glyphs !== 'string' || !glyphs.startsWith(PREFIX))
    throw new SyntaxError('Unrecognised Skýrunor transport header.');
  const runes=Array.from(glyphs.slice(PREFIX.length));
  if (runes.length % 2 || runes.length > 900000) throw new SyntaxError('Invalid rune byte length.');
  const bytes=new Uint8Array(runes.length/2);
  for(let i=0;i<runes.length;i+=2){
    const high=ALPHABET.indexOf(runes[i]), low=ALPHABET.indexOf(runes[i+1]);
    if (high<0 || low<0) throw new SyntaxError('Unknown glyph in transport sequence.');
    bytes[i/2]=(high<<4)|low;
  }
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
