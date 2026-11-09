// Wyrdrune → English (en-GB) gloss. Deterministic: every sentence is generated from the
// compiled programme (IR), so the English says exactly what the code does. No model, no
// host, no execution. Portable (Node and browser).
//
// The gloss reads the programme; it does not interpret intention, ritual meaning or what
// a bridge's answer will be. Those stay with the author and the host.
export const GLOSS_SCHEMA = 'wyrdrune.gloss/v0.1';

export const PHASE_MEANING = Object.freeze({
  perceive: 'what is noticed',
  compress: 'what is distilled',
  release: 'what is set moving',
  verify: 'what must hold true',
  integrate: 'what is woven together',
  choose: 'what is chosen',
  return: 'what comes home',
  transcend: 'what crosses the twist',
});

const ARITH = { '+': 'plus', '-': 'minus', '*': 'times', '/': 'divided by' };
const COMPARE = { '==': 'is', '!=': 'is not', '<': 'is less than', '<=': 'is at most', '>': 'is more than', '>=': 'is at least' };
const PREC = { or: 1, and: 2, not: 3, compare: 4, '+': 5, '-': 5, '*': 6, '/': 6 };
const quote = s => '“' + String(s) + '”';
const name = n => n.replace(/_/g, ' ');
const num = v => (Number.isInteger(v) ? String(v) : String(v));

function precedence(x) {
  if (x.k === 'binary') return PREC[x.op];
  if (x.k === 'compare') return PREC.compare;
  if (x.k === 'logic') return PREC[x.op];
  if (x.k === 'not') return PREC.not;
  return 9;
}

/** English for an expression. Parentheses only where the grouping would otherwise be lost. */
export function glossExpr(x, parent = 0) {
  const wrap = (text, p) => (p < parent ? '(' + text + ')' : text);
  switch (x?.k) {
    case 'literal':
      if (typeof x.v === 'number') return num(x.v);
      if (typeof x.v === 'boolean') return x.v ? 'true' : 'false';
      return quote(x.v);
    case 'unknown': return 'the unknown';
    case 'read': return name(x.name);
    case 'neg': return 'minus ' + glossExpr(x.v, 9);
    case 'binary': { const p = PREC[x.op]; return wrap(glossExpr(x.a, p) + ' ' + ARITH[x.op] + ' ' + glossExpr(x.b, p + 1), p); }
    case 'compare': { const p = PREC.compare; return wrap(glossExpr(x.a, p + 1) + ' ' + COMPARE[x.op] + ' ' + glossExpr(x.b, p + 1), p); }
    case 'logic': { const p = PREC[x.op]; return wrap(glossExpr(x.a, p) + ' ' + x.op + ' ' + glossExpr(x.b, p + 1), p); }
    case 'not': return wrap((['compare', 'logic', 'not'].includes(x.v?.k) ? 'it is not so that ' : 'not ') + glossExpr(x.v, PREC.not), PREC.not);
    case 'call': return glossCall(x);
    default: return '(unreadable expression)';
  }
}

function glossCall(x) {
  const args = x.args || [];
  const lit = i => (args[i]?.k === 'literal' ? args[i].v : null);
  const list = xs => xs.map(a => glossExpr(a)).join(', ');
  if (x.name === 'bridge') {
    const [provider, operation] = [lit(0), lit(1)];
    if (typeof provider === 'string' && typeof operation === 'string') {
      const rest = args.slice(2);
      return 'what the ' + name(provider) + ' bridge gives for ' + quote(operation) + (rest.length ? ' (given ' + list(rest) + ')' : '');
    }
    return 'a host bridge call (' + list(args) + ')';
  }
  if (x.name === 'enochian') return 'an Enochian inscription of ' + list(args.slice(0, 1)) + (args[1] ? ', labelled ' + glossExpr(args[1]) : '');
  if (x.name === 'angelicLetter') return 'the Angelical letter numbered ' + list(args);
  if (x.name === 'votive') return 'a votive intention named ' + glossExpr(args[0]) + ', dedicated ' + glossExpr(args[1]);
  if (x.name === 'star') return 'the eightfold star of radius ' + list(args);
  return 'the operator ' + name(x.name) + ' of ' + list(args);
}

/** Canonical Wyrdrune text for an expression (the "before" side of the cypher). */
export function unparseExpr(x, parent = 0) {
  const wrap = (text, p) => (p < parent ? '(' + text + ')' : text);
  switch (x?.k) {
    case 'literal': return typeof x.v === 'string' ? JSON.stringify(x.v) : String(x.v);
    case 'unknown': return 'unknown';
    case 'read': return x.name;
    case 'neg': return '-' + unparseExpr(x.v, 9);
    case 'binary': { const p = PREC[x.op]; return wrap(unparseExpr(x.a, p) + ' ' + x.op + ' ' + unparseExpr(x.b, p + 1), p); }
    case 'compare': { const p = PREC.compare; return wrap(unparseExpr(x.a, p + 1) + ' ' + x.op + ' ' + unparseExpr(x.b, p + 1), p); }
    case 'logic': { const p = PREC[x.op]; return wrap(unparseExpr(x.a, p) + ' ' + x.op + ' ' + unparseExpr(x.b, p + 1), p); }
    case 'not': return wrap('not ' + unparseExpr(x.v, PREC.not), PREC.not);
    case 'call': return x.name + '(' + (x.args || []).map(a => unparseExpr(a)).join(',') + ')';
    default: return '?';
  }
}

// In a scoped circuit, emits before Return are held and commit at Return; after Return
// (Transcend) they go straight out. Plain circuits offer immediately.
function offer(scoped, phase) {
  if (!scoped || phase === 'transcend') return 'Offer ';
  if (phase === 'return') return 'Offer, as the cycle comes home, ';
  return 'Hold ready to offer when the cycle comes home: ';
}

export function glossStatement(s, { scoped = false, phase = null } = {}) {
  switch (s?.k) {
    case 'let': return { wtl: 'let ' + s.name + ' = ' + unparseExpr(s.e) + ';', english: 'Let ' + name(s.name) + ' be ' + glossExpr(s.e) + '.' };
    case 'set': return { wtl: 'set ' + s.name + ' = ' + unparseExpr(s.e) + ';', english: name(s.name)[0].toUpperCase() + name(s.name).slice(1) + ' becomes ' + glossExpr(s.e) + '.' };
    case 'emit': return { wtl: 'emit ' + unparseExpr(s.e) + ';', english: offer(scoped, phase) + glossExpr(s.e) + '.' };
    case 'require': return { wtl: 'require ' + unparseExpr(s.e) + (s.reason != null ? ' else ' + JSON.stringify(s.reason) : '') + ';',
      english: 'Verify insists that ' + glossExpr(s.e) + '. If not' + (s.reason != null ? ' (' + quote(s.reason) + ')' : '') + ', the whole cycle is undone and nothing of it is kept.' };
    case 'carry': return { wtl: 'carry ' + s.name + ' = ' + unparseExpr(s.e) + ';', english: 'Carry ' + name(s.name) + ' across the twist as ' + glossExpr(s.e) + '.' };
    default: return { wtl: '?', english: '(unreadable statement)' };
  }
}

/** The whole programme in English, phase by phase, with the canonical WTL beside each line. */
export function glossProgram(ir) {
  if (ir?.schema !== 'wyrdrune.ir/v0.1' || !Array.isArray(ir.units)) throw new TypeError('A compiled Wyrdrune programme is required.');
  const operators = (ir.operators || []).map(o => ({ wtl: 'operator ' + o.name + '(' + o.params.join(',') + ') = ' + unparseExpr(o.body) + ';',
    english: 'Name a pure operator, ' + name(o.name) + ', which takes ' + (o.params.length ? o.params.map(name).join(', ') : 'nothing') + ' and gives ' + glossExpr(o.body) + '.' }));
  const units = ir.units.map((unit, index) => {
    const scoped = unit.scope === 'carried';
    return {
      index, scoped,
      title: 'Circuit ' + (index + 1) + (scoped ? ' · a lineage of its own: what it holds stays inside, only its carry crosses'
        : ' · shares what earlier circuits bound'),
      phases: unit.phases.map(({ phase, body }) => ({
        phase, meaning: PHASE_MEANING[phase],
        lines: body.length ? body.map(s => glossStatement(s, { scoped, phase })) : [{ wtl: '', english: 'Nothing here; this phase passes in stillness.', still: true }],
      })),
    };
  });
  const text = [
    ...operators.map(o => o.english),
    ...units.flatMap(u => [u.title + '.', ...u.phases.flatMap(p => [p.phase[0].toUpperCase() + p.phase.slice(1) + ', ' + p.meaning + ':', ...p.lines.map(l => '  ' + l.english)])]),
  ].join('\n');
  return Object.freeze({ schema: GLOSS_SCHEMA, language: 'en-GB', source_hash: ir.sourceHash, operators, units, text,
    deterministic: true, model_invoked: false, interpretation: 'what the code does; intention and ritual meaning remain the author’s' });
}
