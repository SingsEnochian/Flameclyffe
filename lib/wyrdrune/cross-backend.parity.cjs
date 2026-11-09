'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { compile, execute } = require('./wyrdrune.cjs');
const { encode, digest } = require('./canonical.cjs');
const python = process.env.WTL_PYTHON || 'python3';
const script = path.join(__dirname, 'pure-backend.py');

function pythonRun(source, limit = 10000, seeds) {
  const result = spawnSync(python, ['-I', script], {
    input: JSON.stringify({ ir: compile(source), maxOperations: limit, ...(seeds === undefined ? {} : { seeds }) }),
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
  ['scoped isolation', scoped('let a = 1;', '', '', '', '', '', '', '') + '\n' + scoped('emit a;', '', '', '', '', '', '', ''), undefined, /Unknown variable a/],
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
