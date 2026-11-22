'use strict';

const { compile } = require('./wyrdrune.cjs');
const { pureOperation } = require('./quantum.mjs');
const { digest } = require('./canonical.cjs');

const SCHEMA = 'wyrdrune.typed-ir/v0.1';
const NUMBER = 1;
const TEXT = 2;
const TRUTH = 4;
const UNKNOWN = 8;
const LIST = 16;
const RECORD = 32;
const NULL = 64;
const SCALAR = NUMBER | TEXT | TRUTH;
const DATA = SCALAR | UNKNOWN | LIST | RECORD | NULL;
const TYPES = new Map([
  ['number', NUMBER], ['text', TEXT], ['truth', TRUTH], ['unknown', UNKNOWN],
  ['list', LIST], ['record', RECORD], ['null', NULL], ['data', DATA],
]);
const BUILTINS = new Map([
  ['star', { parameters: [NUMBER], result: RECORD }],
  ['enochian', { parameters: [TEXT, TEXT], minimum: 1, result: RECORD }],
  ['angelicLetter', { parameters: [NUMBER], result: RECORD }],
  ['votive', { parameters: [TEXT, TEXT], result: RECORD }],
  ['archangel', { parameters: [TEXT, TEXT], result: RECORD }],
  ['whisper', { parameters: [NUMBER, NUMBER], result: NUMBER }],
  ['wonder', { parameters: [TEXT], result: RECORD }],
  ['known', { parameters: [DATA], result: TRUTH }],
]);

function typeNames(mask) {
  return [...TYPES].filter(([name, bit]) => name !== 'data' && (mask & bit)).map(([name]) => name);
}

function keyOf({ provider, operation }) {
  return JSON.stringify([provider, operation]);
}

function validEffectName(name) {
  return typeof name === 'string' && name.trim().length > 0 && name.length <= 120;
}

function freezeTree(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeTree(child);
    Object.freeze(value);
  }
  return value;
}

function compileTyped(source, { seedTypes = {} } = {}) {
  const { ir, signatures, effects } = compile(source, { typed: true });
  const diagnostics = [];
  const declared = new Map();
  const required = new Map();
  const operators = new Map();
  const expressions = [];
  const report = (code, path, data = {}) => diagnostics.push({ code, path, ...data });

  function parseType(name, path) {
    if (TYPES.has(name)) return TYPES.get(name);
    report('unknown-type', path, { name });
    return 0;
  }
  function expect(actual, expected, path) {
    if (actual & ~expected) {
      report('type-mismatch', path, { expected: typeNames(expected), actual: typeNames(actual) });
    }
  }

  for (const [index, target] of effects.entries()) {
    const path = 'effects.' + index;
    if (!validEffectName(target.provider) || !validEffectName(target.operation)) {
      report('invalid-effect-target', path);
    } else if (declared.has(keyOf(target))) {
      report('duplicate-effect', path, target);
    } else {
      declared.set(keyOf(target), target);
    }
  }
  for (const [index, signature] of signatures.entries()) {
    const path = 'operators.' + index;
    operators.set(signature.name, {
      parameters: signature.parameterTypes.map((name, i) => parseType(name, path + '.params.' + i)),
      result: parseType(signature.resultType, path + '.result'),
    });
  }

  function inspectCall(node, args, path, context) {
    if (node.name === 'bridge') {
      const [provider, operation] = node.args;
      if (context.operator) report('operator-effect', path, { name: node.name });
      if (provider?.k !== 'literal' || operation?.k !== 'literal' ||
          !validEffectName(provider.v) || !validEffectName(operation.v)) {
        report('unresolved-effect-target', path);
        return 0;
      }
      const target = { provider: provider.v, operation: operation.v };
      const key = keyOf(target);
      if (!required.has(key)) required.set(key, { ...target, sites: [] });
      required.get(key).sites.push(path);
      if (!declared.has(key)) report('undeclared-effect', path, target);
      return DATA;
    }
    const named = operators.get(node.name);
    const pure = pureOperation(node.name);
    const signature = named ?? (pure && {
      parameters: pure.parameters.map(name => TYPES.get(name)), result: TYPES.get(pure.result),
    }) ?? BUILTINS.get(node.name);
    if (!signature) {
      report('unknown-call', path, { name: node.name });
      return 0;
    }
    if (context.operator && !named && !pure && node.name !== 'wonder') report('operator-effect', path, { name: node.name });
    if (node.name === 'whisper' && !context.spiced) report('spice-required', path);
    const { parameters, minimum = parameters.length, result } = signature;
    if (args.length < minimum || args.length > parameters.length) {
      report('call-arity', path, { name: node.name, minimum, maximum: parameters.length, actual: args.length });
    }
    for (let i = 0; i < Math.min(args.length, parameters.length); i++) {
      expect(args[i], parameters[i], path + '.args.' + i);
    }
    return result;
  }

  function infer(node, path, context, depth = 0) {
    if (depth > 128) throw new RangeError('WTL typed expression nesting exceeds 128');
    const child = (value, suffix) => infer(value, path + '.' + suffix, context, depth + 1);
    let type;
    switch (node.k) {
      case 'literal':
        if (typeof node.v === 'number' && !Number.isFinite(node.v)) report('nonfinite-literal', path);
        type = node.v === null ? NULL : typeof node.v === 'number' ? NUMBER : typeof node.v === 'string' ? TEXT : TRUTH;
        break;
      case 'unknown': type = UNKNOWN; break;
      case 'read':
        if (!context.bindings.has(node.name)) report('unbound-name', path, { name: node.name });
        type = context.bindings.get(node.name) ?? 0;
        break;
      case 'neg':
      case 'not': {
        const expected = node.k === 'neg' ? NUMBER : TRUTH | UNKNOWN;
        const operand = child(node.v, 'v');
        expect(operand, expected, path + '.v');
        type = node.k === 'neg' ? NUMBER : operand & expected;
        break;
      }
      case 'compare':
      case 'logic':
      case 'binary': {
        const a = child(node.a, 'a'), b = child(node.b, 'b');
        const equality = node.op === '==' || node.op === '!=';
        const expected = node.k === 'logic' ? TRUTH | UNKNOWN
          : node.k === 'binary' ? NUMBER : (equality ? SCALAR : NUMBER) | UNKNOWN;
        expect(a, expected, path + '.a');
        expect(b, expected, path + '.b');
        type = node.k === 'binary' ? NUMBER : TRUTH | ((a | b) & UNKNOWN);
        break;
      }
      case 'match-unknown': {
        child(node.subject, 'subject');
        const whenUnknown=child(node.whenUnknown, 'whenUnknown');
        const otherwise=child(node.otherwise, 'otherwise');
        type=whenUnknown | otherwise;
        break;
      }
      case 'conditional': {
        const condition = child(node.condition, 'condition');
        expect(condition, TRUTH | UNKNOWN, path + '.condition');
        const yes = child(node.yes, 'yes'), no = child(node.no, 'no');
        type = yes | no | (condition & UNKNOWN);
        break;
      }
      case 'list':
        node.items.forEach((item, i) => child(item, 'items.' + i));
        type = LIST;
        break;
      case 'record': {
        const keys = new Set();
        let taggedUnknown = 0;
        node.fields.forEach(({ key, value }, i) => {
          if (keys.has(key)) report('duplicate-field', path + '.fields.' + i, { name: key });
          keys.add(key);
          const fieldType = child(value, 'fields.' + i + '.value');
          // The legacy value codec represents Unknown as the single-field record below.
          if (node.fields.length === 1 && key === 'wtl' && (fieldType & TEXT)) {
            taggedUnknown = value.k === 'literal' ? (value.v === 'unknown' ? UNKNOWN : 0) : UNKNOWN | RECORD;
          }
        });
        type = taggedUnknown || RECORD;
        break;
      }
      case 'access': {
        const target = child(node.target, 'target'), key = child(node.key, 'key');
        expect(target, LIST | RECORD | UNKNOWN, path + '.target');
        if (target & LIST) expect(key, NUMBER | UNKNOWN, path + '.key');
        if (target & RECORD) expect(key, TEXT | UNKNOWN, path + '.key');
        const index = node.key.k === 'neg' && node.key.v.k === 'literal' &&
          typeof node.key.v.v === 'number' ? -node.key.v.v : node.key.v;
        if ((target & LIST) && typeof index === 'number' &&
            (!Number.isSafeInteger(index) || index < 0)) report('invalid-list-index', path + '.key');
        type = target === UNKNOWN || key === UNKNOWN ? UNKNOWN : DATA;
        break;
      }
      case 'call':
        type = inspectCall(node, node.args.map((arg, i) => child(arg, 'args.' + i)), path, context);
        break;
      default: throw new TypeError('Invalid WTL expression kind ' + node.k);
    }
    expressions.push({ path, types: typeNames(type) });
    return type;
  }

  for (const [index, operator] of (ir.operators ?? []).entries()) {
    const signature = operators.get(operator.name);
    const path = 'operators.' + index + '.body';
    const bindings = new Map(operator.params.map((param, i) => [param, signature.parameters[i]]));
    expect(infer(operator.body, path, { bindings, operator: true }), signature.result, path);
  }

  const shared = new Map();
  let carried = new Map(Object.entries(seedTypes).map(([name, type]) =>
    [name, parseType(type, 'seeds.' + name)]));
  ir.units.forEach((unit, unitIndex) => {
    const scoped = unit.scope === 'carried';
    const bindings = scoped ? new Map(carried) : shared;
    const next = new Map();
    const context = { bindings, spiced: unit.spiced === true };
    unit.phases.forEach(({ body }, phaseIndex) => {
      body.forEach((statement, i) => {
        const path = ['units', unitIndex, 'phases', phaseIndex, 'body', i].join('.');
        const field = statement.k === 'pause' ? 'beat' : 'e';
        const type = infer(statement[field], path + '.' + field, context);
        switch (statement.k) {
          case 'let':
            if (bindings.has(statement.name)) report('duplicate-binding', path, { name: statement.name });
            else bindings.set(statement.name, type);
            break;
          case 'set':
            if (!bindings.has(statement.name)) report('unbound-name', path, { name: statement.name });
            else bindings.set(statement.name, type);
            break;
          case 'withness':
            expect(type, RECORD, path + '.e');
            if (bindings.has('withness')) report('duplicate-binding', path, { name: 'withness' });
            else bindings.set('withness', RECORD);
            break;
          case 'carry': next.set(statement.name, type); break;
          case 'require': expect(type, TRUTH | UNKNOWN, path + '.e'); break;
          case 'pause': expect(type, NUMBER, path + '.beat'); break;
          case 'emit': break;
          default: throw new TypeError('Invalid WTL statement kind ' + statement.k);
        }
      });
    });
    if (next.size) carried = next;
  });

  const effectSummary = { declared: [...declared.values()], required: [...required.values()] };
  if (diagnostics.length) {
    const error = new SyntaxError('WTL typed compilation failed');
    error.diagnostics = freezeTree(diagnostics);
    error.effects = freezeTree(effectSummary);
    throw error;
  }
  const artifact = {
    schema: SCHEMA,
    sourceHash: ir.sourceHash,
    executable: ir,
    signatures,
    ...(Object.keys(seedTypes).length ? { seedTypes: { ...seedTypes } } : {}),
    expressions,
    effects: effectSummary,
  };
  return freezeTree({ ...artifact, digest: digest(artifact) });
}

module.exports = { compileTyped };
