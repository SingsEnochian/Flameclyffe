'use strict';

const { digest } = require('./canonical.cjs');
const { ENGINE, compileTensorIR, tensorDefinitions, shapeSize, stridesFor } = require('./tensor-ir.cjs');

function flatten(value, out = []) {
  if (typeof value === 'number') out.push(value);
  else if (Array.isArray(value) || ArrayBuffer.isView(value)) {
    for (const item of value) flatten(item, out);
  } else {
    throw new TypeError('Tensor feeds must contain only finite numbers');
  }
  return out;
}

function typed(values, dtype) {
  const result = dtype === 'f64' ? new Float64Array(values.length) : new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Tensor values must be finite numbers');
    result[i] = value;
    if (!Number.isFinite(result[i])) throw new RangeError('Tensor value exceeds ' + dtype + ' range');
  }
  return result;
}

function emptyTyped(length, dtype) {
  return dtype === 'f64' ? new Float64Array(length) : new Float32Array(length);
}

function broadcastOffset(index, outputShape, inputShape) {
  const outStrides = stridesFor(outputShape);
  const inStrides = stridesFor(inputShape);
  const pad = outputShape.length - inputShape.length;
  let offset = 0;
  for (let axis = 0; axis < inputShape.length; axis++) {
    const outAxis = pad + axis;
    if (inputShape[axis] !== 1) {
      const coordinate = Math.floor(index / outStrides[outAxis]) % outputShape[outAxis];
      offset += coordinate * inStrides[axis];
    }
  }
  return offset;
}

function coordsFromIndex(index, dimensions) {
  const strides = stridesFor(dimensions);
  return dimensions.map((dim, axis) => Math.floor(index / strides[axis]) % dim);
}

function indexFromCoords(coords, dimensions) {
  const strides = stridesFor(dimensions);
  return coords.reduce((total, coordinate, axis) => total + coordinate * strides[axis], 0);
}

function estimateOperations(program, definitions) {
  let total = 0;
  for (const node of program.nodes) {
    let cost = shapeSize(node.shape);
    if (node.op === 'sum') cost = shapeSize(definitions.get(node.args[0]).shape);
    else if (node.op === 'matmul') cost *= 2 * definitions.get(node.args[0]).shape[1];
    total += cost;
    if (!Number.isSafeInteger(total)) throw new RangeError('Tensor operation estimate overflow');
  }
  return total;
}

function evaluateTensorIRValues(source, feeds = {}, options = {}) {
  const program = compileTensorIR(source);
  if (!feeds || typeof feeds !== 'object' || Array.isArray(feeds)) throw new TypeError('Tensor feeds must be a record');
  const definitions = tensorDefinitions(program);
  const allowed = new Set(program.inputs.map(input => input.id));
  for (const key of Object.keys(feeds)) if (!allowed.has(key)) throw new TypeError('Unexpected tensor feed ' + key);

  const maxOperations = options.maxOperations === undefined ? 20_000_000 : options.maxOperations;
  if (!Number.isSafeInteger(maxOperations) || maxOperations < 1 || maxOperations > 100_000_000) {
    throw new RangeError('Tensor maxOperations must be between 1 and 100000000');
  }
  const estimate = estimateOperations(program, definitions);
  if (estimate > maxOperations) throw new RangeError('Tensor operation budget exceeded: ' + estimate + ' > ' + maxOperations);
  const signal = options.signal;
  const checkStop = () => {
    if (signal?.aborted) throw new Error('Feather: tensor execution stopped');
  };

  const values = new Map();
  const normalizedFeeds = Object.create(null);
  for (const input of program.inputs) {
    checkStop();
    if (!Object.hasOwn(feeds, input.id)) throw new ReferenceError('Missing tensor feed ' + input.id);
    const flat = flatten(feeds[input.id]);
    if (flat.length !== shapeSize(input.shape)) throw new RangeError('Feed ' + input.id + ' has ' + flat.length + ' values; expected ' + shapeSize(input.shape));
    const data = typed(flat, input.dtype);
    values.set(input.id, data);
    normalizedFeeds[input.id] = Array.from(data);
  }

  let operationCount = 0;
  for (const node of program.nodes) {
    checkStop();
    const args = node.args.map(name => values.get(name));
    const defs = node.args.map(name => definitions.get(name));
    const size = shapeSize(node.shape);
    let result;

    if (node.op === 'const') {
      result = typed(node.values, node.dtype);
    } else if (node.op === 'neg' || node.op === 'exp' || node.op === 'log' ||
               node.op === 'sin' || node.op === 'cos' || node.op === 'sqrt') {
      result = emptyTyped(size, node.dtype);
      for (let i = 0; i < size; i++) {
        if ((i & 4095) === 0) checkStop();
        const x = args[0][i];
        const y = node.op === 'neg' ? -x :
          node.op === 'exp' ? Math.exp(x) :
          node.op === 'log' ? Math.log(x) :
          node.op === 'sin' ? Math.sin(x) :
          node.op === 'cos' ? Math.cos(x) : Math.sqrt(x);
        result[i] = y;
        operationCount++;
      }
    } else if (node.op === 'add' || node.op === 'sub' || node.op === 'mul' || node.op === 'div') {
      result = emptyTyped(size, node.dtype);
      for (let i = 0; i < size; i++) {
        if ((i & 4095) === 0) checkStop();
        const a = args[0][broadcastOffset(i, node.shape, defs[0].shape)];
        const b = args[1][broadcastOffset(i, node.shape, defs[1].shape)];
        if (node.op === 'div' && b === 0) throw new RangeError('Division by zero in tensor node ' + node.id);
        result[i] = node.op === 'add' ? a + b : node.op === 'sub' ? a - b :
          node.op === 'mul' ? a * b : a / b;
        operationCount++;
      }
    } else if (node.op === 'sum') {
      result = emptyTyped(size, node.dtype);
      if (node.axis === null) {
        let total = 0;
        for (let i = 0; i < args[0].length; i++) {
          if ((i & 4095) === 0) checkStop();
          total += args[0][i];
        }
        result[0] = total;
        operationCount += args[0].length;
      } else {
        const inputShape = defs[0].shape;
        for (let i = 0; i < args[0].length; i++) {
          if ((i & 4095) === 0) checkStop();
          const coords = coordsFromIndex(i, inputShape);
          coords.splice(node.axis, 1);
          const outIndex = indexFromCoords(coords, node.shape);
          result[outIndex] += args[0][i];
          operationCount++;
        }
      }
    } else if (node.op === 'matmul') {
      const [m, k] = defs[0].shape;
      const n = defs[1].shape[1];
      result = emptyTyped(size, node.dtype);
      for (let row = 0; row < m; row++) {
        checkStop();
        for (let col = 0; col < n; col++) {
          let total = 0;
          for (let inner = 0; inner < k; inner++) {
            total += args[0][row * k + inner] * args[1][inner * n + col];
            operationCount += 2;
          }
          result[row * n + col] = total;
        }
      }
    } else if (node.op === 'transpose') {
      result = emptyTyped(size, node.dtype);
      for (let i = 0; i < size; i++) {
        if ((i & 4095) === 0) checkStop();
        const outCoords = coordsFromIndex(i, node.shape);
        const inCoords = new Array(defs[0].shape.length);
        node.permutation.forEach((inputAxis, outputAxis) => { inCoords[inputAxis] = outCoords[outputAxis]; });
        result[i] = args[0][indexFromCoords(inCoords, defs[0].shape)];
        operationCount++;
      }
    } else if (node.op === 'reshape') {
      result = args[0].slice();
      operationCount += size;
    } else if (node.op === 'view') {
      result = emptyTyped(size, node.dtype);
      for (let i = 0; i < size; i++) {
        if ((i & 4095) === 0) checkStop();
        const coords = coordsFromIndex(i, node.shape);
        const sourceIndex = node.offset + coords.reduce((total, coordinate, axis) => total + coordinate * node.strides[axis], 0);
        result[i] = args[0][sourceIndex];
        operationCount++;
      }
    } else {
      throw new TypeError('No tensor interpreter for ' + node.op);
    }

    for (const value of result) {
      if (!Number.isFinite(value)) throw new RangeError('Non-finite or out-of-range result in tensor node ' + node.id);
    }
    values.set(node.id, result);
  }

  return {
    program, definitions, values, normalizedFeeds,
    operationCount, estimatedOperations: estimate,
    feedsDigest: digest(normalizedFeeds),
  };
}

function executeTensorIR(source, feeds = {}, options = {}) {
  const evaluated = evaluateTensorIRValues(source, feeds, options);
  const outputs = Object.create(null);
  for (const outputId of evaluated.program.outputs) {
    const definition = evaluated.definitions.get(outputId);
    outputs[outputId] = {
      shape: [...definition.shape],
      dtype: definition.dtype,
      values: Array.from(evaluated.values.get(outputId)),
    };
  }
  return {
    schema: 'wyrdrune.tensor-result/v0.1',
    engine: ENGINE,
    programFingerprint: evaluated.program.fingerprint,
    feedsDigest: evaluated.feedsDigest,
    outputs,
    execution: {
      backend: 'cpu-reference',
      operationCount: evaluated.operationCount,
      estimatedOperations: evaluated.estimatedOperations,
      precision: [...new Set(evaluated.program.inputs.map(input => input.dtype)
        .concat(evaluated.program.nodes.map(node => node.dtype)))].sort(),
      gpuExecuted: false,
    },
  };
}

module.exports = {
  executeTensorIR,
  evaluateTensorIRValues,
  broadcastOffset,
  coordsFromIndex,
  indexFromCoords,
  flattenTensorValues: flatten,
};
