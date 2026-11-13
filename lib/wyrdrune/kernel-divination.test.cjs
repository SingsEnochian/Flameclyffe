'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { divineTensorKernel } = require('./kernel-divination.cjs');
const { createTensorBridge } = require('./tensor-wtl-bridge.cjs');

const graph = (inputs, nodes, outputs) => ({
  schema: 'wyrdrune.tensor-ir/v0.1', inputs, nodes, outputs,
});

const pointwise = () => graph(
  [
    { id: 'matrix', shape: [2, 3], dtype: 'f32' },
    { id: 'row', shape: [3], dtype: 'f32' },
  ],
  [
    { id: 'shifted', op: 'add', args: ['matrix', 'row'] },
    { id: 'wave', op: 'sin', args: ['shifted'] },
    { id: 'score', op: 'mul', args: ['wave', 'shifted'] },
  ],
  ['score'],
);

test('kernel divination perceives, classifies and derives a fused pointwise kernel', () => {
  const result = divineTensorKernel(pointwise(), 'score');
  assert.equal(result.schema, 'wyrdrune.kernel-divination/v0.1');
  assert.equal(result.kind, 'wgsl-compute');
  assert.equal(result.status, 'divined-not-executed');
  assert.equal(result.analysis.topology, 'elementwise');
  assert.deepEqual(result.analysis.families, ['elementwise']);
  assert.deepEqual(result.analysis.operationCounts, { add: 1, mul: 1, sin: 1 });
  assert.deepEqual(result.analysis.fusedNodes, ['shifted', 'wave', 'score']);
  assert.equal(result.decision.selectedBackend, 'webgpu');
  assert.equal(result.decision.selectedStatus, 'derived-not-executed');
  assert.equal(result.selectedPlan.status, 'generated-not-compiled');
  assert.equal(result.withness.executionOccurred, false);
  assert.equal(result.withness.gpuExecuted, false);
  assert.deepEqual(result.phaseTrace.map(item => item.phase), [
    'perceive', 'compress', 'release', 'verify', 'integrate', 'choose', 'return', 'transcend',
  ]);
  assert.match(result.divinationFingerprint, /^wce1:[0-9a-f]{64}$/);
  assert.match(result.analysis.estimateSemantics, /no latency/);
});

test('divination is deterministic and does not change the source program', () => {
  const source = pointwise();
  const before = JSON.stringify(source);
  const a = divineTensorKernel(source, 'score');
  const b = divineTensorKernel(source, 'score');
  assert.equal(a.divinationFingerprint, b.divinationFingerprint);
  assert.equal(JSON.stringify(source), before);
});

test('reference-first policy selects CPU even when WebGPU is confirmed', () => {
  const result = divineTensorKernel(pointwise(), 'score', {
    policy: 'reference-first',
    capabilities: { webgpu: { available: true, source: 'test-adapter' } },
  });
  assert.equal(result.decision.selectedBackend, 'cpu-reference');
  assert.equal(result.selectedPlan.kind, 'cpu-reference');
  assert.equal(result.status, 'divined-not-executed');
});

test('gpu-if-available uses an explicitly confirmed and limit-compatible adapter', () => {
  const eligible = divineTensorKernel(pointwise(), 'score', {
    policy: 'gpu-if-available',
    capabilities: {
      webgpu: {
        available: true,
        source: 'browser-adapter-probe',
        adapterDescription: 'Test adapter',
        maxComputeWorkgroupSizeX: 64,
        maxComputeInvocationsPerWorkgroup: 64,
        maxStorageBufferBindingSize: 1024,
        maxBufferSize: 2048,
        maxUniformBufferBindingSize: 256,
        maxComputeWorkgroupsPerDimension: 65535,
        maxStorageBuffersPerShaderStage: 8,
      },
    },
  });
  assert.equal(eligible.decision.selectedBackend, 'webgpu');
  assert.equal(eligible.decision.webgpuCapability.gate, 'adapter-eligible');
  assert.equal(eligible.decision.webgpuCapability.adapterDescription, 'Test adapter');

  const limited = divineTensorKernel(pointwise(), 'score', {
    policy: 'gpu-if-available',
    capabilities: { webgpu: { available: true, maxComputeWorkgroupSizeX: 32 } },
  });
  assert.equal(limited.decision.selectedBackend, 'cpu-reference');
  assert.equal(limited.candidates[1].status, 'device-limit-mismatch');
});

test('gpu-required refuses to invent an adapter or silently fall back', () => {
  const missing = divineTensorKernel(pointwise(), 'score', { policy: 'gpu-required' });
  assert.equal(missing.status, 'no-eligible-kernel');
  assert.equal(missing.decision.selectedBackend, null);
  assert.equal(missing.selectedPlan, null);

  const unsupported = graph(
    [{ id: 'a', shape: [2, 2], dtype: 'f32' }, { id: 'b', shape: [2, 2], dtype: 'f32' }],
    [{ id: 'product', op: 'matmul', args: ['a', 'b'] }],
    ['product'],
  );
  const noLowering = divineTensorKernel(unsupported, 'product', {
    policy: 'gpu-required',
    capabilities: { webgpu: { available: true } },
  });
  assert.equal(noLowering.status, 'no-eligible-kernel');
  assert.equal(noLowering.decision.selectedBackend, null);
  assert.equal(noLowering.candidates[1].status, 'unsupported');
});

test('reduction and matrix graphs are classified honestly and remain CPU plans', () => {
  const reduction = graph(
    [{ id: 'x', shape: [2, 3], dtype: 'f32' }],
    [{ id: 'loss', op: 'sum', args: ['x'] }],
    ['loss'],
  );
  const reductionResult = divineTensorKernel(reduction, 'loss');
  assert.equal(reductionResult.analysis.topology, 'reduction');
  assert.equal(reductionResult.selectedPlan.kind, 'cpu-reference');

  const matrix = graph(
    [{ id: 'a', shape: [2, 3], dtype: 'f32' }, { id: 'b', shape: [3, 2], dtype: 'f32' }],
    [{ id: 'product', op: 'matmul', args: ['a', 'b'] }],
    ['product'],
  );
  const matrixResult = divineTensorKernel(matrix, 'product');
  assert.equal(matrixResult.analysis.topology, 'matrix');
  assert.equal(matrixResult.selectedPlan.kind, 'cpu-reference');
  assert.equal(matrixResult.analysis.estimatedOperationCount, 24);
});

test('divination reports only the reachable subgraph', () => {
  const source = graph(
    [
      { id: 'x', shape: [2], dtype: 'f32' },
      { id: 'unused', shape: [100], dtype: 'f64' },
    ],
    [
      { id: 'square', op: 'mul', args: ['x', 'x'] },
      { id: 'other', op: 'sin', args: ['unused'] },
    ],
    ['square'],
  );
  const result = divineTensorKernel(source, 'square');
  assert.deepEqual(result.analysis.inventory.map(item => item.id), ['x', 'square']);
  assert.equal(result.analysis.logicalInputBytes, 8);
  assert.equal(result.analysis.logicalOutputBytes, 8);
});

test('divination validates policy, capability claims and target identity', () => {
  assert.throws(() => divineTensorKernel(pointwise(), 'missing'), /Unknown tensor output/);
  assert.throws(() => divineTensorKernel(pointwise(), 'score', { policy: 'guess-the-future' }), /Unsupported kernel divination policy/);
  assert.throws(() => divineTensorKernel(pointwise(), 'score', { capabilities: { webgpu: { available: 'yes' } } }), /availability must be boolean/);
  assert.throws(() => divineTensorKernel(pointwise(), 'score', { capabilities: { webgpu: { maxBufferSize: -1 } } }), /positive safe integer/);
  assert.throws(() => divineTensorKernel(pointwise(), 'score', { unknown: true }), /Unknown kernel divination option/);
});

test('owner-authorised Wyrdrune bridge exposes kernel divination', () => {
  const bridge = createTensorBridge().tensor;
  const args = [pointwise(), 'score'];
  assert.throws(() => bridge.divine({
    arguments: args, principal: { authorized: false },
  }), /owner authorization/);
  const result = bridge.divine({
    arguments: args, principal: { authorized: true },
  });
  assert.equal(result.schema, 'wyrdrune.kernel-divination/v0.1');
  assert.equal(result.selectedPlan.kind, 'wgsl-compute');
  assert.throws(() => bridge.divine({
    arguments: [...args, {}, {}], principal: { authorized: true },
  }), /tensor.divine/);
});


test('GPU policies fail closed when adapter limits are incomplete', () => {
  const result = divineTensorKernel(pointwise(), 'score', {
    policy: 'gpu-if-available',
    capabilities: { webgpu: { available: true, maxComputeWorkgroupSizeX: 64 } },
  });
  assert.equal(result.decision.selectedBackend, 'cpu-reference');
  assert.equal(result.candidates[1].status, 'limits-incomplete');
});

test('Feather can stop kernel divination before a plan receipt is returned', () => {
  assert.throws(
    () => divineTensorKernel(pointwise(), 'score', {}, { signal: { aborted: true } }),
    /Feather: kernel divination stopped/,
  );
});

test('divination receipts are deeply immutable', () => {
  const result = divineTensorKernel(pointwise(), 'score');
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.analysis));
  assert.ok(Object.isFrozen(result.selectedPlan));
  assert.throws(() => { result.analysis.topology = 'fabricated'; }, TypeError);
});
