'use strict';

const {
  evaluateTensorIRValues, broadcastOffset, coordsFromIndex, indexFromCoords,
} = require('./tensor-engine.cjs');
const { shapeSize } = require('./tensor-ir.cjs');

function unbroadcast(values, outputShape, inputShape) {
  const result = new Float64Array(shapeSize(inputShape));
  for (let i = 0; i < values.length; i++) result[broadcastOffset(i, outputShape, inputShape)] += values[i];
  return result;
}

function differentiateTensorIR(source, options = {}) {
  const { output, wrt, feeds = {}, signal, maxOperations } = options;
  if (typeof output !== 'string' || typeof wrt !== 'string') throw new TypeError('differentiate requires output and wrt ids');
  const evaluated = evaluateTensorIRValues(source, feeds, { signal, maxOperations });
  const definitions = evaluated.definitions;
  const outputDef = definitions.get(output);
  const wrtDef = evaluated.program.inputs.find(input => input.id === wrt);
  if (!outputDef) throw new ReferenceError('Unknown differentiation output ' + output);
  if (!wrtDef) throw new ReferenceError('Differentiation target must be an input: ' + wrt);
  if (shapeSize(outputDef.shape) !== 1) throw new RangeError('Reverse-mode differentiation currently requires a scalar output');

  const adjoints = new Map();
  adjoints.set(output, new Float64Array([1]));
  const add = (name, contribution) => {
    const definition = definitions.get(name);
    const size = shapeSize(definition.shape);
    if (contribution.length !== size) throw new RangeError('Adjoint shape mismatch at ' + name);
    let current = adjoints.get(name);
    if (!current) { current = new Float64Array(size); adjoints.set(name, current); }
    for (let i = 0; i < size; i++) current[i] += contribution[i];
  };
  const signalCheck = () => {
    if (signal?.aborted) throw new Error('Feather: differentiation stopped');
  };

  for (let index = evaluated.program.nodes.length - 1; index >= 0; index--) {
    signalCheck();
    const node = evaluated.program.nodes[index];
    const upstream = adjoints.get(node.id);
    if (!upstream) continue;
    const args = node.args;
    const defs = args.map(name => definitions.get(name));
    const data = args.map(name => evaluated.values.get(name));
    const outputData = evaluated.values.get(node.id);
    let left;
    let right;

    if (node.op === 'const') continue;
    if (node.op === 'add' || node.op === 'sub' || node.op === 'mul' || node.op === 'div') {
      left = new Float64Array(upstream.length);
      right = new Float64Array(upstream.length);
      for (let i = 0; i < upstream.length; i++) {
        const aIndex = broadcastOffset(i, node.shape, defs[0].shape);
        const bIndex = broadcastOffset(i, node.shape, defs[1].shape);
        const a = data[0][aIndex];
        const b = data[1][bIndex];
        if (node.op === 'add') { left[i] = upstream[i]; right[i] = upstream[i]; }
        else if (node.op === 'sub') { left[i] = upstream[i]; right[i] = -upstream[i]; }
        else if (node.op === 'mul') { left[i] = upstream[i] * b; right[i] = upstream[i] * a; }
        else {
          if (b === 0) throw new RangeError('Cannot differentiate division by zero at ' + node.id);
          left[i] = upstream[i] / b;
          right[i] = -upstream[i] * a / (b * b);
        }
      }
      add(args[0], unbroadcast(left, node.shape, defs[0].shape));
      add(args[1], unbroadcast(right, node.shape, defs[1].shape));
    } else if (node.op === 'neg' || node.op === 'exp' || node.op === 'log' ||
               node.op === 'sin' || node.op === 'cos' || node.op === 'sqrt') {
      const contribution = new Float64Array(upstream.length);
      for (let i = 0; i < upstream.length; i++) {
        const x = data[0][i];
        const y = outputData[i];
        const derivative = node.op === 'neg' ? -1 :
          node.op === 'exp' ? y :
          node.op === 'log' ? 1 / x :
          node.op === 'sin' ? Math.cos(x) :
          node.op === 'cos' ? -Math.sin(x) :
          0.5 / y;
        contribution[i] = upstream[i] * derivative;
      }
      add(args[0], contribution);
    } else if (node.op === 'sum') {
      const contribution = new Float64Array(shapeSize(defs[0].shape));
      if (node.axis === null) contribution.fill(upstream[0]);
      else {
        for (let i = 0; i < contribution.length; i++) {
          const coords = coordsFromIndex(i, defs[0].shape);
          coords.splice(node.axis, 1);
          contribution[i] = upstream[indexFromCoords(coords, node.shape)];
        }
      }
      add(args[0], contribution);
    } else if (node.op === 'matmul') {
      const [m, k] = defs[0].shape;
      const n = defs[1].shape[1];
      const gradA = new Float64Array(m * k);
      const gradB = new Float64Array(k * n);
      for (let row = 0; row < m; row++) {
        for (let inner = 0; inner < k; inner++) {
          let total = 0;
          for (let col = 0; col < n; col++) total += upstream[row * n + col] * data[1][inner * n + col];
          gradA[row * k + inner] = total;
        }
      }
      for (let inner = 0; inner < k; inner++) {
        for (let col = 0; col < n; col++) {
          let total = 0;
          for (let row = 0; row < m; row++) total += data[0][row * k + inner] * upstream[row * n + col];
          gradB[inner * n + col] = total;
        }
      }
      add(args[0], gradA);
      add(args[1], gradB);
    } else if (node.op === 'transpose') {
      const contribution = new Float64Array(shapeSize(defs[0].shape));
      for (let inputIndex = 0; inputIndex < contribution.length; inputIndex++) {
        const inputCoords = coordsFromIndex(inputIndex, defs[0].shape);
        const outputCoords = node.permutation.map(axis => inputCoords[axis]);
        contribution[inputIndex] = upstream[indexFromCoords(outputCoords, node.shape)];
      }
      add(args[0], contribution);
    } else if (node.op === 'reshape') {
      add(args[0], upstream.slice());
    } else if (node.op === 'view') {
      const contribution = new Float64Array(shapeSize(defs[0].shape));
      for (let i = 0; i < upstream.length; i++) {
        const coords = coordsFromIndex(i, node.shape);
        const inputIndex = node.offset + coords.reduce((total, coordinate, axis) => total + coordinate * node.strides[axis], 0);
        contribution[inputIndex] += upstream[i];
      }
      add(args[0], contribution);
    } else {
      throw new TypeError('No differentiation rule for ' + node.op);
    }
  }

  const gradient = adjoints.get(wrt) || new Float64Array(shapeSize(wrtDef.shape));
  const scalar = evaluated.values.get(output)[0];
  if (![...gradient].every(Number.isFinite)) throw new RangeError('Non-finite gradient for ' + wrt);
  return {
    schema: 'wyrdrune.tensor-gradient/v0.1',
    engine: 'wyrdrune-tensor/0.1.0',
    output,
    wrt,
    value: scalar,
    gradient: {
      shape: [...wrtDef.shape],
      dtype: 'f64',
      values: Array.from(gradient),
    },
    provenance: {
      programFingerprint: evaluated.program.fingerprint,
      feedsDigest: evaluated.feedsDigest,
      method: 'reverse-mode',
      backend: 'cpu-reference',
      gpuExecuted: false,
    },
  };
}

module.exports = { differentiateTensorIR };
