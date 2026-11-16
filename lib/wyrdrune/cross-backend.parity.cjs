'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { compile, execute } = require('./wyrdrune.cjs');
const { compileTyped } = require('./typed-ir.cjs');
const { encode, digest } = require('./canonical.cjs');
const python = process.env.WTL_PYTHON || 'python3';
const script = path.join(__dirname, 'pure-backend.py');

function pythonRun(source, limit = 10000, seeds) {
  return pythonRunIr(compile(source), limit, seeds);
}

function pythonRunIr(ir, limit = 10000, seeds) {
  const result = spawnSync(python, ['-I', script], {
    input: JSON.stringify({ ir, maxOperations: limit, ...(seeds === undefined ? {} : { seeds }) }),
    encoding: 'utf8',
    timeout: 10000,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return result;
}

const wrap = (a, b, c, d, e, f, g, h) => [
 'mobius {',
 ' perceive { ' + a + ' }',
 ' compress { ' + b + ' }',
 ' release { ' + c + ' }',
 ' verify { ' + d + ' }',
 ' integrate { ' + e + ' }',
 ' choose { ' + f + ' }',
 ' return { ' + g + ' }',
 ' transcend { ' + h + ' }',
 '}',
].join('\n');

// `mobius scoped`: bindings stay inside the unit; only `carry` (Transcend) crosses.
const scoped = (a, b, c, d, e, f, g, h) => wrap(a, b, c, d, e, f, g, h).replace(/^mobius \{/, 'mobius scoped {');

const fixtures = [
  ['arithmetic and bindings',
    wrap('let energy = 2;', 'set energy = energy * 4;', 'set energy = energy + 1;',
      'emit energy;', '', 'set energy = energy - 3;', 'emit energy;', 'emit energy / 2;')],
  ['ritual Enochian, provenance, and second heptad',
    wrap('let hope = votive("Gabriel’s Grace","For the journey");',
      'let letter = angelicLetter(14);',
      'let inscription = enochian("Pa","working name");',
      'emit hope;', 'emit letter;', 'emit inscription;', 'emit 8;', 'emit -2.5;')],
  ['NFC and Unicode Kelyran/rune identifiers',
    wrap('let ᚠehu = 3;', 'let varutóra = ᚠehu + 2;', '',
      'emit varutóra;', '', '', 'emit enochian("é");', '')],
  ['multiple Möbius blocks preserve current v0.1 binding behavior',
    wrap('let a = 1;', '', '', 'emit a;', '', '', '', '') + '\n' +
    wrap('let b = 2;', '', '', 'emit a + b;', '', '', '', '')],
  ['scoped units: only the carry crosses the twist, with continuity receipts',
    scoped('let x = 2;', 'set x = x * 3;', '', 'emit x;', '', '', '', 'carry x = x; carry y = 0.5;') + '\n' +
    scoped('', 'set x = x + y;', '', 'emit x;', '', 'emit y;', '', 'carry x = x; carry y = y * 2;')],
  ['a plain unit and a scoped unit keep separate environments',
    wrap('let a = 1;', '', '', 'emit a;', '', '', '', '') + '\n' +
    scoped('let a = 10;', '', '', 'emit a;', '', '', '', 'carry kept = a + 0.1;')],
  ['a scoped unit that carries nothing passes the register through unchanged',
    scoped('let x = 1;', '', '', 'emit x;', '', '', '', 'carry x = x;') + '\n' +
    scoped('set x = x + 1;', '', '', 'emit x;', '', '', '', '')],
  // Verify that can say no (RFC-0001 L1): staged emits, require, rollback, verdicts, checkpoints.
  ['require passes on true; comparisons and Kleene logic',
    scoped('let e = 9; let open = unknown;', '', '', 'require e >= 9 and not (e < 0); emit e == 9; emit e != 9;', '',
      'emit open or true; emit open and false; emit open and true; emit not open; emit open == 1; emit "a" == "a";', '', '')],
  ['a failed require rolls the whole cycle back, with its reason',
    scoped('emit "seen"; let e = 1;', '', '', 'require e > 5 else "too little energy";', '', 'emit "never";', 'emit "never";', 'emit "never";')],
  ['unknown is not true: require fails without becoming false',
    scoped('let open = unknown;', '', '', 'require open;', '', '', 'emit 1;', '')],
  ['a runtime fault before Return is a verdict, not a crash',
    scoped('let x = 1;', 'set x = x / 0;', '', '', '', '', 'emit x;', '')],
  ['scoped isolation is a rolled-back verdict on both backends',
    scoped('let a = 1;', '', '', '', '', '', 'emit a;', '') + '\n' + scoped('emit a;', '', '', '', '', '', '', '')],
  ['a fault after Return keeps committed work, crosses nothing and halts',
    scoped('let n = 1;', '', '', '', '', '', 'emit n;', 'emit "after";  carry n = n / 0;') + '\n' + scoped('', '', '', '', '', '', 'emit "unreached";', '')],
  ['mid-lineage rollback keeps earlier committed cycles and their checkpoints',
    [1, 2, 3].map(() => scoped('', '', '', 'require n < 3;', '', '', 'emit n;', 'carry n = n + 1;')).join('\n').replace("require n < 3;", "require n < 3;")],
  ['conditional and collection lookup preserve receipts and carried data',
    scoped('let if = true; let record = {pulse: [2, 5], "__proto__": 11};', '', '',
      'require if if then record["pulse"][1] == 5 else false else "wrong pulse";', '',
      'emit if false then 1 / 0 else -record["pulse"][0]; emit if unknown then unseen else unseen;',
      'emit record["__proto__"]; emit record["constructor"]; emit record["pulse"][8]; emit record[unknown];',
      'carry signal = {values: record["pulse"]};') + '\n' +
    scoped('', '', '', '', '', '', 'emit signal["values"][0];', '')],
  ['out-of-range index type rolls back with matching diagnostics',
    scoped('let data = [1];', '', '', 'emit data[1.5];', '', '', '', '')],
  ['named operators with forward references, recursion, and lexical scope',
    'operator classify(xs) = if xs[0] > 0 then sumDown(xs[0]) else 0;\n' +
    'operator sumDown(n) = if n == 0 then 0 else n + sumDown(n - 1);\n' +
    scoped('let n = 99;', '', '', 'require classify([4]) == 10;', '',
      'emit classify([4]); emit classify([0]);', 'emit n;', 'carry result = classify([3]);')],
  ['operator recursion limit rolls back the same way',
    'operator loop(x) = loop(x);\n' + scoped('emit 1;', '', '', 'emit loop(0);', '', '', '', '')],
  ['operator parameters cannot read the outer circuit',
    'operator escape() = secret;\n' + scoped('let secret = 3;', '', '', 'emit escape();', '', '', '', '')],
  ['operator cannot invoke a ritual function',
    'operator invoke() = enochian("Pa");\n' + scoped('', '', '', 'emit invoke();', '', '', '', '')],
  ['operator arity errors preserve the Return checkpoint boundary',
    'operator twice(x) = x * 2;\n' + scoped('', '', '', '', '', '', 'emit twice(2);', 'emit twice();')],
  ['an explicit empty Verify reason survives rollback',
    scoped('', '', '', 'require false else "";', '', '', '', '')],
  ['one tenth and decimal arithmetic',
    wrap('let tiny = 0.1;', 'set tiny = tiny + 0.2;', '',
      'emit tiny;', '', '', 'emit 0.000001;', '')],
];

test('WTL Python backend is actually installed for the build matrix', () => {
  const p = spawnSync(python, ['--version'], { encoding: 'utf8' });
  assert.equal(p.status, 0, String(p.stderr || p.error));
});

for (const [name, source] of fixtures) {
  test('WTL JavaScript/Python v0.1 parity: ' + name, async () => {
    const js = await execute(compile(source));
    const py = pythonRun(source);
    assert.equal(py.status, 0, py.stderr);
    const result = JSON.parse(py.stdout);
    // WTL records in JavaScript have null prototypes. Python receives and emits JSON.
    assert.deepEqual(result, JSON.parse(JSON.stringify(js)));
    assert.equal(encode(result), encode(js), 'WCE-1 output must be identical');
    assert.equal(digest(result), digest(js), 'WCE-1 output digest must be identical');
  });
}

test('WTL JavaScript/Python parity: seeded mid-lineage rollback (cycle 3 fails, cycles 1-2 stand)', async () => {
  const unit = scoped('', '', '', 'require n < 3;', '', '', 'emit n;', 'carry n = n + 1;');
  const source = [unit, unit, unit].join('\n');
  const js = await execute(compile(source), { seeds: { n: 1 } });
  const py = pythonRun(source, 10000, { n: 1 });
  assert.equal(py.status, 0, py.stderr);
  assert.deepEqual(JSON.parse(py.stdout), js);
  assert.deepEqual(js.output, [1, 2]);
  assert.equal(js.status, 'rolled-back');
  assert.deepEqual(js.verdict, { status: 'failed', unit: 2, phase: 'verify', reason: 'require failed', committed_output: false });
  assert.equal(js.checkpoints.length, 2);
  assert.deepEqual(js.checkpoints.map(c => c.face), ['outer', 'inner']);
  assert.equal(js.checkpoints[0].prev, js.lineage.root);
  assert.equal(js.checkpoints[1].prev, digest(js.checkpoints[0]));
  assert.deepEqual(js.continuity.carry, { n: 3 }, 'the carry is the last one that crossed');
});

test('WTL JavaScript/Python parity: seeds continue a lineage from a previous carry', async () => {
  const source = scoped('set energy = energy * 0.85 + 0.12;', '', '', 'emit energy;', '', '', '', 'carry energy = energy; carry seen = seen + 1;');
  const seeds = { energy: 0.6, seen: 3 };
  const js = await execute(compile(source), { seeds });
  const py = pythonRun(source, 10000, seeds);
  assert.equal(py.status, 0, py.stderr);
  const result = JSON.parse(py.stdout);
  assert.deepEqual(result, js);
  assert.equal(digest(result), digest(js));
  assert.equal(js.continuity.seeds_digest, digest(seeds), 'seeds are receipted as given');
  assert.equal(js.continuity.crossings[0].carried_in, digest(seeds));
  assert.equal(js.continuity.carry_digest, digest(js.continuity.carry));
});

for (const [label, source, seeds, pattern] of [
  ['seeds of another shape', scoped('', '', '', '', '', '', '', 'carry x = 1;'), { z: 1 }, /carry must bind exactly the seeds/],
  ['seeds that are not a record', scoped('', '', '', '', '', '', '', 'carry x = 1;'), [1], /seeds must be a record/],
]) {
  test('WTL continuity fails closed on both backends: ' + label, async () => {
    await assert.rejects(execute(compile(source), seeds === undefined ? {} : { seeds }), pattern);
    const py = pythonRun(source, 10000, seeds);
    assert.notEqual(py.status, 0);
    assert.match(py.stderr, pattern);
    assert.equal(py.stdout, '');
  });
}

test('cross-runtime operation budget refuses an oversized ritual before output', async () => {
  const source = wrap('let energy = 2;', 'set energy = energy + 1;', '',
    'emit energy;', '', '', 'emit energy;', '');
  await assert.rejects(execute(compile(source), { maxOperations: 5 }), /budget/);
  const py = pythonRun(source, 5);
  assert.notEqual(py.status, 0);
  assert.match(py.stderr, /operation budget exceeded/);
  assert.equal(py.stdout, '');
});

for (const [label, text, pattern] of [
  ['foreign bridge', 'emit bridge("python","eval",1);', /Bridge capability unavailable/],
  ['invalid letter', 'emit angelicLetter(22);', /integer from 1 to 21/],
  ['wrong ritual argument', 'emit votive(1,"journey");', /votive name must be text/],
  ['zero denominator', 'emit 1 / 0;', /Division by zero/],
  ['unknown binding', 'emit unseen;', /Unknown variable unseen/],
  ['non-truth condition', 'emit if 0 then 1 else 2;', /if requires a truth value/],
  ['invalid record key', 'emit {x: 1}[0];', /WTL record key requires text/],
  ['non-collection target', 'emit "text"[0];', /WTL access requires a record or list/],
  ['duplicate record field', 'emit {x: 1, x: 2}["x"];', /Duplicate WTL record field x/],
]) {
  test('WTL backend equivalence fails closed: ' + label, async () => {
    const source = wrap(text, '', '', '', '', '', '', '');
    await assert.rejects(execute(compile(source)), pattern);
    const py = pythonRun(source);
    assert.notEqual(py.status, 0);
    assert.match(py.stderr, pattern);
    assert.equal(py.stdout, '');
  });
}

test('recursive operator calls consume the shared operation budget before Return', async () => {
  const source = 'operator loop(x) = loop(x);\n' +
    scoped('', '', '', 'emit loop(0);', '', '', '', '');
  await assert.rejects(execute(compile(source), { maxOperations: 12 }), /WTL operation budget exceeded/);
  const py = pythonRun(source, 12);
  assert.notEqual(py.status, 0);
  assert.match(py.stderr, /WTL operation budget exceeded/);
  assert.equal(py.stdout, '');
});

test('Python explicitly rejects seeded spiced circuits before reporting output', () => {
  const source = scoped('emit 1;', '', '', '', '', '', '', '').replace('scoped', 'spiced');
  const py = pythonRun(source);
  assert.notEqual(py.status, 0);
  assert.match(py.stderr, /mobius spiced is not supported/);
  assert.equal(py.stdout, '');
});

test('geometry does not silently claim Python trigonometric parity', () => {
  const source = wrap('emit star(8);', '', '', '', '', '', '', '');
  const py = pythonRun(source);
  assert.notEqual(py.status, 0);
  assert.match(py.stderr, /not yet parity-certified/);
});

test('one typed source lowers to executable IR with identical JavaScript and Python receipts', async () => {
  const source = 'operator sum(n: number): number = if n == 0 then 0 else n + sum(n - 1);\n' +
    scoped('let n = sum(4);', '', '', 'require n == 10;', '', '', 'emit n;', 'carry n = n;');
  const { executable } = compileTyped(source);
  const js = await execute(executable);
  const py = pythonRunIr(executable);
  assert.equal(py.status, 0, py.stderr);
  const result = JSON.parse(py.stdout);
  assert.deepEqual(result, js);
  assert.equal(digest(result), digest(js));
  assert.deepEqual(js.output, [10]);
});

test('Bell state and open Wonder return the same evidence across both runtimes', async () => {
  const source = readFileSync(path.join(__dirname, 'bell-wonder.wtl'), 'utf8');
  const { executable, effects } = compileTyped(source);
  assert.deepEqual(effects.required, []);
  const js = await execute(executable);
  const py = pythonRunIr(executable);
  assert.equal(py.status, 0, py.stderr);
  assert.equal(digest(JSON.parse(py.stdout)), digest(js));
  assert.equal(js.status, 'committed');
  const [measurement, question] = js.output;
  assert.deepEqual(measurement.basis, ['00', '01', '10', '11']);
  const [p00, p01, p10, p11] = measurement.probabilities;
  assert.ok(Math.abs(p00 - 0.5) < 1e-12 && Math.abs(p11 - 0.5) < 1e-12);
  assert.deepEqual([p01, p10], [0, 0]);
  assert.equal(question.status, 'open');
  assert.deepEqual(question.evidence, [measurement]);
  assert.deepEqual(js.continuity.carry.lastDistribution, measurement.probabilities);
  const { previewWyrdruneRitual } = require('../wayglass-kernel.cjs');
  const preview = await previewWyrdruneRitual(source, { typed: true, checkOperators: true });
  assert.deepEqual(preview.values, js.output);
  assert.equal(preview.ritualLedger.entries.length, 8);
});

for (const [label, expression, pattern] of [
  ['non-unitary gate', 'quantumApply([[1,0],[0,0]], [[[1,0],[0,0]],[[1,0],[0,0]]])', /gate must be unitary/],
  ['non-Hermitian observable', 'quantumExpectation([[1,0],[0,0]], [[[1,0],[0,1]],[[0,1],[1,0]]])', /observable must be Hermitian/],
  ['unnormalised state', 'quantumProbabilities([[1,0],[1,0]])', /state must have unit norm/],
  ['invalid index', 'quantumProbability([[1,0],[0,0]], 0.5)', /outside the basis/],
  ['empty interpretation', 'wonder("What is the state?", [""], [])', /requires a question/],
]) {
  test('quantum and Wonder backend diagnostics: ' + label, async () => {
    const source = wrap('emit ' + expression + ';', '', '', '', '', '', '', '');
    await assert.rejects(execute(compile(source)), pattern);
    const py = pythonRun(source);
    assert.notEqual(py.status, 0);
    assert.match(py.stderr, pattern);
    assert.equal(py.stdout, '');
  });
}

test('complex phase changes interference after a Hadamard readout', async () => {
  const source = 'operator readout(v: list, h: number): list = ' +
    'quantumProbabilities(quantumApply(v, [[[h,0],[h,0]],[[h,0],[-h,0]]]));\n' +
    wrap('let h = 0.7071067811865476; let u = [[h,0],[h,0]]; let phase = [[[1,0],[0,0]],[[0,0],[0,1]]];',
      'let rotated = quantumApply(u, phase); emit readout(u, h); emit readout(rotated, h); ' +
      'emit quantumExpectation(rotated, [[[0,0],[0,-1]],[[0,1],[0,0]]]);', '', '', '', '', '', '');
  const ir = compileTyped(source).executable;
  const js = await execute(ir);
  const py = pythonRunIr(ir);
  assert.equal(py.status, 0, py.stderr);
  assert.equal(digest(JSON.parse(py.stdout)), digest(js));
  assert.ok(Math.abs(js.output[0][0] - 1) < 1e-12);
  assert.equal(js.output[0][1], 0);
  assert.ok(Math.abs(js.output[2] - 1) < 1e-12);
  assert.ok(js.output[1].every(probability => Math.abs(probability - 0.5) < 1e-12));
});

test('engine projections have matching JS and Python execution digests', async () => {
  const scenarios = [
    ['double-mobius-orientation.wtl', {}, {}],
    ['observer-compression.wtl',
      { a: 'observed', b: 'empty', c: 'error', d: 'unavailable', e: 'observed', f: 'empty' },
      { a: 'text', b: 'text', c: 'text', d: 'text', e: 'text', f: 'text' }],
  ];
  for (const [file, seeds, seedTypes] of scenarios) {
    const source = readFileSync(path.join(__dirname, file), 'utf8');
    const { executable } = compileTyped(source, { seedTypes });
    const js = await execute(executable, { seeds });
    const py = pythonRunIr(executable, 10000, seeds);
    assert.equal(py.status, 0, py.stderr);
    assert.equal(js.status, 'committed');
    assert.equal(digest(JSON.parse(py.stdout)), digest(js));
  }
});

test('Observer phase feedback and compression refusal match across runtimes', async () => {
  const source = readFileSync(path.join(__dirname, 'observer-feedback.wtl'), 'utf8');
  const seeds = {
    a: 'observed', b: 'empty', c: 'unavailable', d: 'error', e: 'empty', f: 'observed',
    pa: 'empty', pb: 'empty', pc: 'unavailable', pd: 'error', pe: 'empty', pf: 'observed',
    source: 'current', previousSource: 'previous', expectedObserved: 2, expectedEmpty: 2, expectedMissing: 2,
  };
  const seedTypes = Object.fromEntries(Object.entries(seeds).map(([key, value]) => [key, typeof value === 'string' ? 'text' : 'number']));
  const { executable } = compileTyped(source, { seedTypes });
  for (const expectedObserved of [2, 1]) {
    const input = { ...seeds, expectedObserved };
    const js = await execute(executable, { seeds: input });
    const py = pythonRunIr(executable, 10000, input);
    assert.equal(py.status, 0, py.stderr);
    assert.equal(digest(JSON.parse(py.stdout)), digest(js));
    assert.equal(js.status, expectedObserved === 2 ? 'committed' : 'rolled-back');
    if (expectedObserved === 1) assert.deepEqual(js.output, []);
  }
});
