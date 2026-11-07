'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { compile, execute } = require('./wyrdrune.cjs');
const { encode, digest } = require('./canonical.cjs');
const python = process.env.WTL_PYTHON || 'python3';
const script = path.join(__dirname, 'pure-backend.py');

function pythonRun(source, limit = 10000) {
  const result = spawnSync(python, ['-I', script], {
    input: JSON.stringify({ ir: compile(source), maxOperations: limit }),
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
    assert.deepEqual(result, js);
    assert.equal(encode(result), encode(js), 'WCE-1 output must be identical');
    assert.equal(digest(result), digest(js), 'WCE-1 output digest must be identical');
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

test('geometry does not silently claim Python trigonometric parity', () => {
  const source = wrap('emit star(8);', '', '', '', '', '', '', '');
  const py = pythonRun(source);
  assert.notEqual(py.status, 0);
  assert.match(py.stderr, /not yet parity-certified/);
});
