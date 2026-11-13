'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const { digest } = require('./canonical.cjs');
const { compileTensorIR } = require('./tensor-ir.cjs');
const { executeTensorIR } = require('./tensor-engine.cjs');
const { differentiateTensorIR } = require('./tensor-autodiff.cjs');
const { deriveTensorKernel } = require('./tensor-lowering.cjs');
const { createTensorBridge } = require('./tensor-wtl-bridge.cjs');

const graph = (inputs, nodes, outputs) => ({
  schema: 'wyrdrune.tensor-ir/v0.1', inputs, nodes, outputs,
});

test('typed tensor IR validates topological references, shapes and stable fingerprints', () => {
  const source = graph(
    [{ id: 'x', shape: [2, 3], dtype: 'f32' }],
    [{ id: 'twice', op: 'mul', args: ['x', 'x'] }],
    ['twice'],
  );
  const a = compileTensorIR(source);
  const b = compileTensorIR(source);
  assert.equal(a.fingerprint, b.fingerprint);
  assert.match(a.fingerprint, /^wce1:[0-9a-f]{64}$/);
  assert.throws(() => compileTensorIR(graph(
    [{ id: 'x', shape: [2], dtype: 'f32' }],
    [{ id: 'bad', op: 'add', args: ['later', 'x'] }],
    ['bad'],
  )), /unknown or forward value/);
  assert.throws(() => compileTensorIR(graph(
    [{ id: 'x', shape: [2, 3], dtype: 'f32' }, { id: 'y', shape: [4], dtype: 'f32' }],
    [{ id: 'bad', op: 'add', args: ['x', 'y'] }],
    ['bad'],
  )), /Incompatible broadcast/);
});

test('CPU reference executes fused pointwise math with NumPy-style broadcasting', () => {
  const program = graph(
    [
      { id: 'matrix', shape: [2, 3], dtype: 'f32' },
      { id: 'row', shape: [3], dtype: 'f32' },
    ],
    [
      { id: 'sum', op: 'add', args: ['matrix', 'row'] },
      { id: 'wave', op: 'sin', args: ['sum'] },
    ],
    ['sum', 'wave'],
  );
  const result = executeTensorIR(program, {
    matrix: [1, 2, 3, 4, 5, 6],
    row: [10, 20, 30],
  });
  assert.deepEqual(result.outputs.sum.values, [11, 22, 33, 14, 25, 36]);
  assert.equal(result.outputs.wave.values.length, 6);
  assert.equal(result.execution.backend, 'cpu-reference');
  assert.equal(result.execution.gpuExecuted, false);
  assert.equal(result.programFingerprint, compileTensorIR(program).fingerprint);
});

test('views, transpose, reshape and monoidal sum preserve tensor indexing', () => {
  const program = graph(
    [{ id: 'matrix', shape: [2, 3], dtype: 'f64' }],
    [
      { id: 'turned', op: 'view', args: ['matrix'], shape: [3, 2], strides: [1, 3], offset: 0 },
      { id: 'rowTotals', op: 'sum', args: ['turned'], axis: 1 },
      { id: 'flat', op: 'reshape', args: ['turned'], shape: [6] },
      { id: 'again', op: 'transpose', args: ['turned'], permutation: [1, 0] },
      { id: 'total', op: 'sum', args: ['matrix'] },
    ],
    ['turned', 'rowTotals', 'flat', 'again', 'total'],
  );
  const compiled = compileTensorIR(program);
  assert.deepEqual(compiled.nodes.find(node => node.id === 'total').monoid, {
    name: 'sum', identity: 0, combine: 'add',
  });
  const result = executeTensorIR(program, { matrix: [1, 2, 3, 4, 5, 6] });
  assert.deepEqual(result.outputs.turned.values, [1, 4, 2, 5, 3, 6]);
  assert.deepEqual(result.outputs.rowTotals.values, [5, 7, 9]);
  assert.deepEqual(result.outputs.flat.values, [1, 4, 2, 5, 3, 6]);
  assert.deepEqual(result.outputs.again.values, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(result.outputs.total.values, [21]);
});

test('matrix multiplication is evaluated by the deterministic reference backend', () => {
  const program = graph(
    [
      { id: 'a', shape: [2, 3], dtype: 'f64' },
      { id: 'b', shape: [3, 2], dtype: 'f64' },
    ],
    [{ id: 'product', op: 'matmul', args: ['a', 'b'] }],
    ['product'],
  );
  const result = executeTensorIR(program, {
    a: [1, 2, 3, 4, 5, 6],
    b: [7, 8, 9, 10, 11, 12],
  });
  assert.deepEqual(result.outputs.product.values, [58, 64, 139, 154]);
});

test('reverse-mode automatic differentiation matches the analytic and finite-difference gradient', () => {
  const program = graph(
    [{ id: 'x', shape: [3], dtype: 'f64' }],
    [
      { id: 'square', op: 'mul', args: ['x', 'x'] },
      { id: 'wave', op: 'sin', args: ['x'] },
      { id: 'score', op: 'add', args: ['square', 'wave'] },
      { id: 'loss', op: 'sum', args: ['score'] },
    ],
    ['loss'],
  );
  const feeds = { x: [0.2, 0.5, 1.0] };
  const result = differentiateTensorIR(program, { output: 'loss', wrt: 'x', feeds });
  const expected = feeds.x.map(x => 2 * x + Math.cos(x));
  result.gradient.values.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-12));
  const epsilon = 1e-5;
  const finiteDifference = feeds.x.map((_, index) => {
    const plus = [...feeds.x];
    const minus = [...feeds.x];
    plus[index] += epsilon;
    minus[index] -= epsilon;
    const fPlus = executeTensorIR(program, { x: plus }).outputs.loss.values[0];
    const fMinus = executeTensorIR(program, { x: minus }).outputs.loss.values[0];
    return (fPlus - fMinus) / (2 * epsilon);
  });
  result.gradient.values.forEach((value, index) => assert.ok(Math.abs(value - finiteDifference[index]) < 1e-8));
  assert.equal(result.provenance.method, 'reverse-mode');
  assert.equal(result.provenance.gpuExecuted, false);
});

test('reverse-mode differentiates reductions, broadcasted operands and matrix products', () => {
  const broadcastProgram = graph(
    [
      { id: 'x', shape: [2, 3], dtype: 'f64' },
      { id: 'bias', shape: [3], dtype: 'f64' },
    ],
    [
      { id: 'shifted', op: 'add', args: ['x', 'bias'] },
      { id: 'loss', op: 'sum', args: ['shifted'] },
    ],
    ['loss'],
  );
  const broadcastGradient = differentiateTensorIR(broadcastProgram, {
    output: 'loss', wrt: 'bias', feeds: { x: [1, 2, 3, 4, 5, 6], bias: [0, 0, 0] },
  });
  assert.deepEqual(broadcastGradient.gradient.values, [2, 2, 2]);

  const matrixProgram = graph(
    [
      { id: 'a', shape: [2, 2], dtype: 'f64' },
      { id: 'b', shape: [2, 2], dtype: 'f64' },
    ],
    [
      { id: 'product', op: 'matmul', args: ['a', 'b'] },
      { id: 'loss', op: 'sum', args: ['product'] },
    ],
    ['loss'],
  );
  const matrixGradient = differentiateTensorIR(matrixProgram, {
    output: 'loss', wrt: 'a', feeds: { a: [1, 2, 3, 4], b: [5, 6, 7, 8] },
  });
  assert.deepEqual(matrixGradient.gradient.values, [11, 15, 11, 15]);
});

test('affine view gradients scatter back to the original storage', () => {
  const program = graph(
    [{ id: 'x', shape: [2, 3], dtype: 'f64' }],
    [
      { id: 'view', op: 'view', args: ['x'], shape: [3, 2], strides: [1, 3], offset: 0 },
      { id: 'loss', op: 'sum', args: ['view'] },
    ],
    ['loss'],
  );
  const result = differentiateTensorIR(program, {
    output: 'loss', wrt: 'x', feeds: { x: [1, 2, 3, 4, 5, 6] },
  });
  assert.deepEqual(result.gradient.values, [1, 1, 1, 1, 1, 1]);
});

test('elementwise kernel derivation fuses a pointwise graph into WGSL', () => {
  const program = graph(
    [
      { id: 'matrix', shape: [2, 3], dtype: 'f32' },
      { id: 'row', shape: [3], dtype: 'f32' },
    ],
    [
      { id: 'shifted', op: 'add', args: ['matrix', 'row'] },
      { id: 'wave', op: 'sin', args: ['shifted'] },
      { id: 'scaled', op: 'mul', args: ['wave', 'shifted'] },
    ],
    ['scaled'],
  );
  const plan = deriveTensorKernel(program, 'scaled');
  assert.equal(plan.kind, 'wgsl-compute');
  assert.equal(plan.status, 'generated-not-compiled');
  assert.equal(plan.workgroupSize, 64);
  assert.equal(plan.dispatchWorkgroups, 1);
  assert.deepEqual(plan.fusedNodes, ['shifted', 'wave', 'scaled']);
  assert.deepEqual(plan.comprehension, {
    domain: [2, 3], iteration: 'row-major', body: 'scaled', reduction: null,
  });
  assert.match(plan.wgsl, /@compute @workgroup_size\(64\)/);
  assert.match(plan.wgsl, /atomicStore\(&error_flag, 1u\)/);
  assert.equal(plan.requiresErrorFlagCheck, true);
  assert.equal(plan.errorFlagInitialValue, 0);
  assert.match(plan.wgsl, /buf_row\[\(\(i \/ 1u\) % 3u\) \* 1u\]/);
  assert.match(plan.wgsl, /out_values\[i\] = v_scaled/);
  assert.equal(plan.gpuExecuted, false);
  assert.deepEqual(plan.programInputs, [
    { id: 'matrix', shape: [2, 3], dtype: 'f32' },
    { id: 'row', shape: [3], dtype: 'f32' },
  ]);
  assert.equal(plan.kernelFingerprint, digest({
    programFingerprint: plan.programFingerprint,
    output: 'scaled',
    wgsl: plan.wgsl,
    programInputs: plan.programInputs,
  }));
});

test('unsupported numerical kernels remain explicit CPU fallbacks', () => {
  const program = graph(
    [
      { id: 'a', shape: [2, 2], dtype: 'f32' },
      { id: 'b', shape: [2, 2], dtype: 'f32' },
    ],
    [{ id: 'product', op: 'matmul', args: ['a', 'b'] }],
    ['product'],
  );
  const plan = deriveTensorKernel(program, 'product');
  assert.equal(plan.kind, 'cpu-reference');
  assert.equal(plan.status, 'unsupported-by-wgsl-v0.1');
  assert.match(plan.reason, /not in the elementwise/);
  assert.equal(plan.gpuExecuted, false);
});

test('f64 and vector constants do not silently enter the f32 WGSL backend', () => {
  const f64 = graph([{ id: 'x', shape: [2], dtype: 'f64' }], [], ['x']);
  assert.match(deriveTensorKernel(f64, 'x').reason, /f64 remains/);
  const withConstant = graph(
    [{ id: 'x', shape: [2], dtype: 'f32' }],
    [{ id: 'bias', op: 'const', shape: [2], dtype: 'f32', values: [1, 2] },
     { id: 'out', op: 'add', args: ['x', 'bias'] }],
    ['out'],
  );
  assert.match(deriveTensorKernel(withConstant, 'out').reason, /scalar constants/);
});

test('execution rejects malformed feeds, non-finite results, budget excess and Feather stop', () => {
  const program = graph(
    [{ id: 'x', shape: [2], dtype: 'f32' }],
    [{ id: 'twice', op: 'mul', args: ['x', 'x'] }],
    ['twice'],
  );
  assert.throws(() => executeTensorIR(program, { x: [1] }), /expected 2/);
  assert.throws(() => executeTensorIR(program, { x: [1, Infinity] }), /finite numbers/);
  assert.throws(() => executeTensorIR(program, { x: [1, 2] }, { maxOperations: 1 }), /budget exceeded/);
  assert.throws(() => executeTensorIR(program, { x: [1, 2] }, { signal: { aborted: true } }), /Feather/);
  const overflow = graph(
    [{ id: 'x', shape: [1], dtype: 'f32' }],
    [{ id: 'square', op: 'mul', args: ['x', 'x'] }],
    ['square'],
  );
  assert.throws(() => executeTensorIR(overflow, { x: [1e20] }), /Non-finite or out-of-range/);
});

test('the owner-authorised bridge exposes inspect, evaluate, derive and differentiation', () => {
  const program = graph(
    [{ id: 'x', shape: [2], dtype: 'f32' }],
    [{ id: 'square', op: 'mul', args: ['x', 'x'] }, { id: 'loss', op: 'sum', args: ['square'] }],
    ['loss'],
  );
  const bridge = createTensorBridge().tensor;
  assert.throws(() => bridge.evaluate({ arguments: [program, { x: [2, 3] }], principal: { authorized: false } }), /owner authorization/);
  assert.deepEqual(bridge.evaluate({ arguments: [program, { x: [2, 3] }], principal: { authorized: true } }).outputs.loss.values, [13]);
  assert.equal(bridge.derive({ arguments: [program, 'loss'], principal: { authorized: true } }).kind, 'cpu-reference');
  assert.deepEqual(bridge.differentiate({
    arguments: [program, 'loss', 'x', { x: [2, 3] }], principal: { authorized: true },
  }).gradient.values, [4, 6]);
  assert.equal(bridge.inspect({ arguments: [program], principal: { authorized: true } }).engine, 'wyrdrune-tensor/0.1.0');
});

test('native Wyrdrune executes the tensor bridge and carries its result through the twist', async () => {
  const { createWyrdruneRuntime } = await import('./runtime.mjs');
  const runtime = createWyrdruneRuntime({
    hashSource: source => createHash('sha256').update(source).digest('hex'),
    continuityDigest: digest,
  });
  const source = readFileSync(join(__dirname, 'tensor-engine.wtl'), 'utf8');
  const ir = runtime.compile(source);
  const result = await runtime.execute(ir, {
    bridges: createTensorBridge(),
    principal: { id: 'rowan', authorized: true },
  });
  assert.equal(result.status, 'committed');
  assert.equal(result.receipts.length, 8);
  assert.equal(result.output.length, 4);
  assert.equal(result.output[0].schema, 'wyrdrune.tensor-result/v0.1');
  assert.equal(result.output[1].schema, 'wyrdrune.kernel-divination/v0.1');
  assert.equal(result.output[1].kind, 'wgsl-compute');
  assert.equal(result.output[1].selectedPlan.status, 'generated-not-compiled');
  assert.equal(result.output[1].withness.executionOccurred, false);
  assert.equal(result.output[2].schema, 'wyrdrune.tensor-gradient/v0.1');
  assert.deepEqual(result.continuity.carry.result, result.output[0]);
  assert.equal(result.output[2].gradient.values.length, 4);
});


test('Feather is polled inside long tensor loops, not only between graph nodes', () => {
  const program = graph(
    [{ id: 'x', shape: [5000], dtype: 'f32' }],
    [{ id: 'square', op: 'mul', args: ['x', 'x'] }],
    ['square'],
  );
  let reads = 0;
  const signal = { get aborted() { reads += 1; return reads >= 3; } };
  assert.throws(
    () => executeTensorIR(program, { x: new Array(5000).fill(2) }, { signal }),
    /Feather/,
  );
  assert.equal(reads, 3);
});

test('reverse-mode differentiation budgets forward and backward work together', () => {
  const program = graph(
    [{ id: 'x', shape: [2], dtype: 'f64' }],
    [
      { id: 'square', op: 'mul', args: ['x', 'x'] },
      { id: 'loss', op: 'sum', args: ['square'] },
    ],
    ['loss'],
  );
  assert.throws(
    () => differentiateTensorIR(program, {
      output: 'loss', wrt: 'x', feeds: { x: [2, 3] }, maxOperations: 20,
    }),
    /differentiation operation budget exceeded/,
  );
});
