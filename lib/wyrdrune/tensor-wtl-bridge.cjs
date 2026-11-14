'use strict';

const { compileTensorIR } = require('./tensor-ir.cjs');
const { executeTensorIR } = require('./tensor-engine.cjs');
const { differentiateTensorIR } = require('./tensor-autodiff.cjs');
const { deriveTensorKernel } = require('./tensor-lowering.cjs');
const { divineTensorKernel } = require('./kernel-divination.cjs');
const { assureTensorResult } = require('./tensor-assurance.cjs');

function authorised(context) {
  if (!context || context.principal?.authorized !== true) {
    throw new Error('Tensor bridge requires verified owner authorization');
  }
  if (context.signal?.aborted) throw new Error('Feather: tensor bridge stopped');
  if (!Array.isArray(context.arguments)) throw new TypeError('Tensor bridge arguments must be an array');
  return context.arguments;
}

function createTensorBridge(options = {}) {
  const maxOperations = options.maxOperations === undefined ? 20_000_000 : options.maxOperations;
  const evaluate = context => {
    const args = authorised(context);
    if (args.length < 1 || args.length > 2) throw new TypeError('tensor.evaluate(program[, feeds])');
    return executeTensorIR(args[0], args[1] || {}, { signal: context.signal, maxOperations });
  };
  const derive = context => {
    const args = authorised(context);
    if (args.length !== 2) throw new TypeError('tensor.derive(program, output)');
    return deriveTensorKernel(args[0], args[1]);
  };
  const divine = context => {
    const args = authorised(context);
    if (args.length < 2 || args.length > 3) throw new TypeError('tensor.divine(program, output[, request])');
    return divineTensorKernel(args[0], args[1], args[2] || {}, { signal: context.signal });
  };
  const differentiate = context => {
    const args = authorised(context);
    if (args.length !== 4) throw new TypeError('tensor.differentiate(program, output, wrt, feeds)');
    return differentiateTensorIR(args[0], {
      output: args[1], wrt: args[2], feeds: args[3],
      signal: context.signal, maxOperations,
    });
  };
  const assure = context => {
    const args = authorised(context);
    if (args.length !== 5) {
      throw new TypeError('tensor.assure(program, feeds, output, candidateResult, { absoluteTolerance, relativeTolerance })');
    }
    return assureTensorResult(args[0], args[1], args[2], args[3], {
      ...args[4],
      signal: context.signal,
      maxOperations,
    });
  };
  const inspect = context => {
    const args = authorised(context);
    if (args.length !== 1) throw new TypeError('tensor.inspect(program)');
    const program = compileTensorIR(args[0]);
    return {
      schema: 'wyrdrune.tensor-inspection/v0.1',
      engine: 'wyrdrune-tensor/0.1.0',
      fingerprint: program.fingerprint,
      inputs: program.inputs.map(input => ({ id: input.id, shape: [...input.shape], dtype: input.dtype })),
      nodes: program.nodes.map(node => ({ id: node.id, op: node.op, shape: [...node.shape], dtype: node.dtype })),
      outputs: [...program.outputs],
    };
  };
  return Object.freeze({
    tensor: Object.freeze({ evaluate, derive, divine, differentiate, assure, inspect }),
  });
}

module.exports = { createTensorBridge };
