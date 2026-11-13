'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');
const { compileTensorIR } = require('./tensor-ir.cjs');
const { executeTensorIR } = require('./tensor-engine.cjs');
const { assureTensorResult, verifyTensorAssurance } = require('./tensor-assurance.cjs');
const { createTensorBridge } = require('./tensor-wtl-bridge.cjs');

const python = process.env.WTL_PYTHON || 'python3';
const script = join(__dirname, 'tensor-python.py');
const program = {
  schema: 'wyrdrune.tensor-ir/v0.1',
  inputs: [{ id: 'x', shape: [3], dtype: 'f64' }],
  nodes: [
    { id: 'square', op: 'mul', args: ['x', 'x'] },
    { id: 'wave', op: 'sin', args: ['x'] },
    { id: 'score', op: 'add', args: ['square', 'wave'] },
  ],
  outputs: ['score'],
};
const feeds = { x: [0.2, 0.5, 1.0] };

function pythonResult() {
  const compiled = compileTensorIR(program);
  const result = spawnSync(python, ['-I', script], {
    input: JSON.stringify({ program: compiled, feeds, maxOperations: 20_000_000 }),
    encoding: 'utf8',
    timeout: 15000,
    maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('assurance envelope binds a real independent Python result to the JS reference', () => {
  const candidate = pythonResult();
  const envelope = assureTensorResult(program, feeds, 'score', candidate, {
    absoluteTolerance: 1e-12,
    relativeTolerance: 1e-12,
  });
  assert.equal(envelope.schema, 'wyrdrune.tensor-assurance/v0.1');
  assert.equal(envelope.status, 'matched-within-tolerance');
  assert.equal(envelope.subject.programFingerprint, compileTensorIR(program).fingerprint);
  assert.equal(envelope.subject.feedsDigest, candidate.feedsDigest);
  assert.equal(envelope.backends.reference.name, 'cpu-reference');
  assert.equal(envelope.backends.candidate.name, 'python-reference');
  assert.equal(envelope.backends.independence, 'distinct-backend-labels-only');
  assert.equal(envelope.backends.identityAttestation, 'not-provided');
  assert.equal(envelope.comparison.mismatchCount, 0);
  assert.equal(envelope.claims.find(item => item.id === 'numerical-comparison').status, 'matched-within-tolerance');
  assert.equal(envelope.claims.find(item => item.id === 'backend-independence').status, 'declared-not-attested');
  assert.equal(verifyTensorAssurance(envelope), true);
});

test('numerical divergence is retained as a failed comparison rather than hidden', () => {
  const candidate = pythonResult();
  candidate.outputs.score.values[1] += 0.01;
  const envelope = assureTensorResult(program, feeds, 'score', candidate, {
    absoluteTolerance: 1e-12,
    relativeTolerance: 1e-12,
  });
  assert.equal(envelope.status, 'divergent');
  assert.equal(envelope.comparison.mismatchCount, 1);
  assert.equal(envelope.comparison.mismatchSamples[0].index, 1);
  assert.equal(verifyTensorAssurance(envelope), true);
});

test('same backend label cannot establish independent comparison', () => {
  const candidate = executeTensorIR(program, feeds);
  const envelope = assureTensorResult(program, feeds, 'score', candidate, {
    absoluteTolerance: 0,
    relativeTolerance: 0,
  });
  assert.equal(envelope.status, 'not-independent');
  assert.equal(envelope.backends.independence, 'same-backend-label');
});

test('program and feed substitution are rejected before numerical comparison', () => {
  const candidate = pythonResult();
  assert.throws(() => assureTensorResult(program, { x: [0.2, 0.5, 1.1] }, 'score', candidate, {
    absoluteTolerance: 1e-12, relativeTolerance: 1e-12,
  }), /feed digest does not match/);
  const changed = { ...candidate, programFingerprint: 'wce1:' + '0'.repeat(64) };
  assert.throws(() => assureTensorResult(program, feeds, 'score', changed, {
    absoluteTolerance: 1e-12, relativeTolerance: 1e-12,
  }), /program fingerprint does not match/);
});

test('device result comparison requires an executed WebGPU result and exact feed custody', () => {
  const reference = executeTensorIR(program, feeds);
  const output = reference.outputs.score;
  const device = {
    schema: 'wyrdrune.tensor-device-result/v0.1',
    status: 'executed',
    backend: 'webgpu',
    outputId: 'score',
    feedsDigest: reference.feedsDigest,
    programFingerprint: reference.programFingerprint,
    output: { shape: output.shape, dtype: output.dtype, values: [...output.values] },
    execution: { gpuExecuted: true },
  };
  const envelope = assureTensorResult(program, feeds, 'score', device, {
    absoluteTolerance: 0,
    relativeTolerance: 0,
  });
  assert.equal(envelope.status, 'matched-within-tolerance');
  assert.equal(envelope.backends.candidate.name, 'webgpu');
  assert.equal(envelope.claims.find(item => item.id === 'physical-execution').status, 'executor-reported');
  const unavailable = { ...device, status: 'unavailable' };
  assert.throws(() => assureTensorResult(program, feeds, 'score', unavailable, {
    absoluteTolerance: 0, relativeTolerance: 0,
  }), /was not executed/);
});

test('assurance envelope fingerprint detects later alteration', () => {
  const candidate = pythonResult();
  const envelope = assureTensorResult(program, feeds, 'score', candidate, {
    absoluteTolerance: 1e-12,
    relativeTolerance: 1e-12,
  });
  const altered = { ...envelope, comparison: { ...envelope.comparison, mismatchCount: 99 } };
  assert.equal(verifyTensorAssurance(altered), false);
  assert.equal(verifyTensorAssurance({ schema: 'other', fingerprint: 'wce1:bad' }), false);
});

test('assurance options require explicit, finite tolerances and Feather stops the reference run', () => {
  const candidate = pythonResult();
  assert.throws(() => assureTensorResult(program, feeds, 'score', candidate, {}), /absoluteTolerance/);
  assert.throws(() => assureTensorResult(program, feeds, 'score', candidate, {
    absoluteTolerance: -1, relativeTolerance: 0,
  }), /non-negative/);
  assert.throws(() => assureTensorResult(program, feeds, 'score', candidate, {
    absoluteTolerance: 0, relativeTolerance: 0, signal: { aborted: true },
  }), /Feather/);
});

test('owner-authorised WTL bridge exposes tensor.assure and rejects unauthorised use', () => {
  const candidate = pythonResult();
  const tensor = createTensorBridge().tensor;
  const args = [program, feeds, 'score', candidate, { absoluteTolerance: 1e-12, relativeTolerance: 1e-12 }];
  assert.throws(() => tensor.assure({
    arguments: args, principal: { authorized: false },
  }), /owner authorization/);
  const result = tensor.assure({
    arguments: args, principal: { authorized: true },
  });
  assert.equal(result.status, 'matched-within-tolerance');
  assert.equal(verifyTensorAssurance(result), true);
});
