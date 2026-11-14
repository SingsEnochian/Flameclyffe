'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');
const { compileTensorIR } = require('./tensor-ir.cjs');
const { executeTensorIR } = require('./tensor-engine.cjs');

const python = process.env.WTL_PYTHON || 'python3';
const script = join(__dirname, 'tensor-python.py');

function pythonRun(program, feeds, maxOperations = 20_000_000) {
  return spawnSync(python, ['-I', script], {
    input: JSON.stringify({ program: compileTensorIR(program), feeds, maxOperations }),
    encoding: 'utf8',
    timeout: 15000,
    maxBuffer: 8 * 1024 * 1024,
  });
}

function compareResults(js, py, tolerance) {
  assert.equal(py.programFingerprint, js.programFingerprint);
  assert.equal(py.feedsDigest, js.feedsDigest);
  assert.equal(py.execution.operationCount, js.execution.operationCount);
  assert.equal(py.execution.estimatedOperations, js.execution.estimatedOperations);
  assert.deepEqual(py.execution.precision, js.execution.precision);
  assert.equal(py.execution.gpuExecuted, false);
  assert.deepEqual(Object.keys(py.outputs), Object.keys(js.outputs));
  for (const id of Object.keys(js.outputs)) {
    assert.deepEqual(py.outputs[id].shape, js.outputs[id].shape, id + ' shape');
    assert.equal(py.outputs[id].dtype, js.outputs[id].dtype, id + ' dtype');
    assert.equal(py.outputs[id].values.length, js.outputs[id].values.length, id + ' length');
    for (let i = 0; i < js.outputs[id].values.length; i++) {
      const expected = js.outputs[id].values[i];
      const actual = py.outputs[id].values[i];
      const allowed = tolerance * Math.max(1, Math.abs(expected));
      assert.ok(Math.abs(actual - expected) <= allowed,
        id + '[' + i + '] differs: JS=' + expected + ' Python=' + actual + ' tolerance=' + allowed);
    }
  }
}

const graph = (inputs, nodes, outputs) => ({
  schema: 'wyrdrune.tensor-ir/v0.1', inputs, nodes, outputs,
});

test('Python tensor reference backend is available', () => {
  const result = spawnSync(python, ['--version'], { encoding: 'utf8' });
  assert.equal(result.status, 0, String(result.stderr || result.error));
});

const fixtures = [
  {
    name: 'f32 broadcast and transcendental pointwise graph',
    program: graph(
      [
        { id: 'matrix', shape: [2, 3], dtype: 'f32' },
        { id: 'row', shape: [3], dtype: 'f32' },
      ],
      [
        { id: 'shifted', op: 'add', args: ['matrix', 'row'] },
        { id: 'wave', op: 'sin', args: ['shifted'] },
        { id: 'score', op: 'mul', args: ['wave', 'shifted'] },
      ],
      ['shifted', 'wave', 'score'],
    ),
    feeds: { matrix: [1, 2, 3, 4, 5, 6], row: [0.25, 0.5, 0.75] },
    tolerance: 2e-6,
  },
  {
    name: 'f64 matmul and reduction',
    program: graph(
      [
        { id: 'a', shape: [2, 3], dtype: 'f64' },
        { id: 'b', shape: [3, 2], dtype: 'f64' },
      ],
      [
        { id: 'product', op: 'matmul', args: ['a', 'b'] },
        { id: 'total', op: 'sum', args: ['product'] },
      ],
      ['product', 'total'],
    ),
    feeds: { a: [1, 2, 3, 4, 5, 6], b: [7, 8, 9, 10, 11, 12] },
    tolerance: 1e-12,
  },
  {
    name: 'affine view, transpose, reshape and axis reduction',
    program: graph(
      [{ id: 'matrix', shape: [2, 3], dtype: 'f64' }],
      [
        { id: 'view', op: 'view', args: ['matrix'], shape: [3, 2], strides: [1, 3], offset: 0 },
        { id: 'rowTotals', op: 'sum', args: ['view'], axis: 1 },
        { id: 'flat', op: 'reshape', args: ['view'], shape: [6] },
        { id: 'transpose', op: 'transpose', args: ['view'], permutation: [1, 0] },
      ],
      ['view', 'rowTotals', 'flat', 'transpose'],
    ),
    feeds: { matrix: [1, 2, 3, 4, 5, 6] },
    tolerance: 0,
  },
  {
    name: 'scalar constant and all unary operations',
    program: graph(
      [{ id: 'x', shape: [3], dtype: 'f64' }],
      [
        { id: 'offset', op: 'const', shape: [], dtype: 'f64', values: [0.75] },
        { id: 'shifted', op: 'add', args: ['x', 'offset'] },
        { id: 'negative', op: 'neg', args: ['shifted'] },
        { id: 'exp', op: 'exp', args: ['negative'] },
        { id: 'log', op: 'log', args: ['exp'] },
        { id: 'cos', op: 'cos', args: ['log'] },
        { id: 'sin', op: 'sin', args: ['cos'] },
        { id: 'sqrt', op: 'sqrt', args: ['exp'] },
        { id: 'loss', op: 'sum', args: ['sqrt'] },
      ],
      ['negative', 'exp', 'log', 'cos', 'sin', 'sqrt', 'loss'],
    ),
    feeds: { x: [0.1, 0.2, 0.3] },
    tolerance: 1e-12,
  },
];

for (const fixture of fixtures) {
  test('JavaScript/Python tensor backend parity: ' + fixture.name, () => {
    const js = executeTensorIR(fixture.program, fixture.feeds);
    const py = pythonRun(fixture.program, fixture.feeds);
    assert.equal(py.status, 0, py.stderr);
    compareResults(js, JSON.parse(py.stdout), fixture.tolerance);
  });
}

test('Python tensor backend rejects altered IR fingerprints and arithmetic faults', () => {
  const program = graph(
    [{ id: 'x', shape: [2], dtype: 'f32' }, { id: 'y', shape: [2], dtype: 'f32' }],
    [{ id: 'quotient', op: 'div', args: ['x', 'y'] }],
    ['quotient'],
  );
  const compiled = compileTensorIR(program);
  const tampered = { ...compiled, fingerprint: 'wce1:' + '0'.repeat(64) };
  const badFingerprint = spawnSync(python, ['-I', script], {
    input: JSON.stringify({ program: tampered, feeds: { x: [1, 2], y: [1, 1] } }),
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.notEqual(badFingerprint.status, 0);
  assert.match(badFingerprint.stderr, /fingerprint mismatch/);

  const divisionByZero = pythonRun(program, { x: [1, 2], y: [1, 0] });
  assert.notEqual(divisionByZero.status, 0);
  assert.match(divisionByZero.stderr, /Division by zero/);
  assert.equal(divisionByZero.stdout, '');
});
