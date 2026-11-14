'use strict';

const { digest } = require('./canonical.cjs');

const SCHEMA = 'wyrdrune.tensor-ir/v0.1';
const ENGINE = 'wyrdrune-tensor/0.1.0';
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_RANK = 8;
const MAX_ELEMENTS = 1_000_000;
const MAX_INPUTS = 64;
const MAX_NODES = 512;
const COMPILED = new WeakSet();
const DEFINITIONS = new WeakMap();

function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new TypeError(label + ' must be a plain record');
  }
  return value;
}

function id(value, label) {
  if (typeof value !== 'string' || !IDENT.test(value)) throw new TypeError(label + ' must be an ASCII identifier');
  return value;
}

function dtype(value) {
  const result = value === undefined ? 'f32' : value;
  if (result !== 'f32' && result !== 'f64') throw new TypeError('Tensor dtype must be f32 or f64');
  return result;
}

function shape(value, label) {
  if (!Array.isArray(value) || value.length > MAX_RANK) throw new TypeError(label + ' must be an array of at most ' + MAX_RANK + ' dimensions');
  const result = value.map((dim, index) => {
    if (!Number.isSafeInteger(dim) || dim < 1) throw new RangeError(label + '[' + index + '] must be a positive safe integer');
    return dim;
  });
  shapeSize(result);
  return result;
}

function shapeSize(value) {
  let size = 1;
  for (const dim of value) {
    size *= dim;
    if (!Number.isSafeInteger(size) || size > MAX_ELEMENTS) throw new RangeError('Tensor exceeds the ' + MAX_ELEMENTS + ' element limit');
  }
  return size;
}

function stridesFor(value) {
  const strides = new Array(value.length);
  let stride = 1;
  for (let i = value.length - 1; i >= 0; i--) {
    strides[i] = stride;
    stride *= value[i];
  }
  return strides;
}

function broadcastShape(a, b) {
  const rank = Math.max(a.length, b.length);
  const out = new Array(rank);
  for (let i = 0; i < rank; i++) {
    const da = a[a.length - rank + i] ?? 1;
    const db = b[b.length - rank + i] ?? 1;
    if (da !== db && da !== 1 && db !== 1) {
      throw new RangeError('Incompatible broadcast dimensions ' + da + ' and ' + db);
    }
    out[i] = Math.max(da, db);
  }
  shapeSize(out);
  return out;
}

function promote(a, b) {
  return a === 'f64' || b === 'f64' ? 'f64' : 'f32';
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

function compileTensorIR(source) {
  if (source && typeof source === 'object' && COMPILED.has(source)) return source;
  record(source, 'Tensor IR');
  if (source.schema !== SCHEMA) throw new TypeError('Unsupported tensor IR schema');
  if (!Array.isArray(source.inputs) || source.inputs.length > MAX_INPUTS) throw new TypeError('Tensor IR inputs must be an array of at most ' + MAX_INPUTS);
  if (!Array.isArray(source.nodes) || source.nodes.length > MAX_NODES) throw new TypeError('Tensor IR nodes must be an array of at most ' + MAX_NODES);
  if (!Array.isArray(source.outputs) || source.outputs.length < 1 || source.outputs.length > 64) throw new TypeError('Tensor IR requires 1–64 outputs');

  const definitions = new Map();
  const inputs = [];
  for (const [index, raw] of source.inputs.entries()) {
    record(raw, 'Tensor input ' + index);
    const name = id(raw.id, 'Tensor input id');
    if (definitions.has(name)) throw new TypeError('Duplicate tensor id ' + name);
    const normalized = { id: name, shape: shape(raw.shape, 'Input shape'), dtype: dtype(raw.dtype) };
    inputs.push(normalized);
    definitions.set(name, normalized);
  }

  const nodes = [];
  for (const [index, raw] of source.nodes.entries()) {
    record(raw, 'Tensor node ' + index);
    const name = id(raw.id, 'Tensor node id');
    if (definitions.has(name)) throw new TypeError('Duplicate tensor id ' + name);
    if (typeof raw.op !== 'string') throw new TypeError('Tensor node ' + name + ' requires an operation');
    const op = raw.op;
    const args = raw.args === undefined ? [] : raw.args;
    if (!Array.isArray(args) || args.some(item => typeof item !== 'string')) throw new TypeError('Tensor node ' + name + ' args must be an array of ids');
    for (const ref of args) {
      if (!definitions.has(ref)) throw new ReferenceError('Tensor node ' + name + ' refers to unknown or forward value ' + ref);
    }
    const values = args.map(ref => definitions.get(ref));
    let normalized;

    if (op === 'const') {
      if (args.length !== 0) throw new TypeError('const takes no arguments');
      const outShape = shape(raw.shape, 'Constant shape');
      const outDtype = dtype(raw.dtype);
      if (!Array.isArray(raw.values) || raw.values.length !== shapeSize(outShape)) throw new RangeError('Constant values must match its shape');
      const data = raw.values.map((item, i) => {
        if (typeof item !== 'number' || !Number.isFinite(item)) throw new TypeError('Constant value ' + i + ' must be finite');
        if (outDtype === 'f32' && !Number.isFinite(Math.fround(item))) throw new RangeError('Constant value exceeds f32 range');
        return outDtype === 'f32' ? Math.fround(item) : item;
      });
      normalized = { id: name, op, args: [], shape: outShape, dtype: outDtype, values: data };
    } else if (['neg', 'exp', 'log', 'sin', 'cos', 'sqrt'].includes(op)) {
      if (args.length !== 1) throw new TypeError(op + ' takes one argument');
      normalized = { id: name, op, args, shape: [...values[0].shape], dtype: values[0].dtype };
    } else if (['add', 'sub', 'mul', 'div'].includes(op)) {
      if (args.length !== 2) throw new TypeError(op + ' takes two arguments');
      normalized = { id: name, op, args, shape: broadcastShape(values[0].shape, values[1].shape), dtype: promote(values[0].dtype, values[1].dtype) };
    } else if (op === 'sum') {
      if (args.length !== 1) throw new TypeError('sum takes one argument');
      const input = values[0];
      const monoid = raw.monoid === undefined ? 'sum' : raw.monoid;
      if (monoid !== 'sum') throw new TypeError('tensor-ir/v0.1 currently defines the sum monoid only');
      let axis = raw.axis === undefined || raw.axis === null ? null : raw.axis;
      if (axis !== null) {
        if (!Number.isSafeInteger(axis)) throw new TypeError('sum axis must be an integer or omitted');
        if (axis < 0) axis += input.shape.length;
        if (axis < 0 || axis >= input.shape.length) throw new RangeError('sum axis is outside the input rank');
      }
      const outShape = axis === null ? [] : input.shape.filter((_, i) => i !== axis);
      normalized = {
        id: name, op, args, shape: outShape, dtype: input.dtype, axis,
        monoid: { name: 'sum', identity: 0, combine: 'add' },
      };
    } else if (op === 'matmul') {
      if (args.length !== 2) throw new TypeError('matmul takes two arguments');
      const [a, b] = values;
      if (a.shape.length !== 2 || b.shape.length !== 2 || a.shape[1] !== b.shape[0]) {
        throw new RangeError('matmul requires [m,k] × [k,n] rank-two tensors');
      }
      normalized = { id: name, op, args, shape: [a.shape[0], b.shape[1]], dtype: promote(a.dtype, b.dtype) };
    } else if (op === 'transpose') {
      if (args.length !== 1) throw new TypeError('transpose takes one argument');
      const input = values[0];
      const permutation = raw.permutation === undefined
        ? input.shape.map((_, i) => input.shape.length - 1 - i)
        : raw.permutation;
      if (!Array.isArray(permutation) || permutation.length !== input.shape.length ||
          new Set(permutation).size !== permutation.length ||
          permutation.some(i => !Number.isSafeInteger(i) || i < 0 || i >= input.shape.length)) {
        throw new TypeError('transpose permutation must be a complete axis permutation');
      }
      normalized = { id: name, op, args, shape: permutation.map(i => input.shape[i]), dtype: input.dtype, permutation: [...permutation] };
    } else if (op === 'reshape') {
      if (args.length !== 1) throw new TypeError('reshape takes one argument');
      const outShape = shape(raw.shape, 'Reshape shape');
      if (shapeSize(outShape) !== shapeSize(values[0].shape)) throw new RangeError('reshape must preserve element count');
      normalized = { id: name, op, args, shape: outShape, dtype: values[0].dtype };
    } else if (op === 'view') {
      if (args.length !== 1) throw new TypeError('view takes one argument');
      const input = values[0];
      const outShape = shape(raw.shape, 'View shape');
      if (!Array.isArray(raw.strides) || raw.strides.length !== outShape.length ||
          raw.strides.some(s => !Number.isSafeInteger(s) || s < 0)) {
        throw new TypeError('view strides must be nonnegative integers matching its rank');
      }
      const offset = raw.offset === undefined ? 0 : raw.offset;
      if (!Number.isSafeInteger(offset) || offset < 0) throw new RangeError('view offset must be a nonnegative integer');
      const maxIndex = offset + outShape.reduce((total, dim, i) => total + (dim - 1) * raw.strides[i], 0);
      if (maxIndex >= shapeSize(input.shape)) throw new RangeError('view addresses storage outside its input');
      normalized = { id: name, op, args, shape: outShape, dtype: input.dtype, strides: [...raw.strides], offset };
    } else {
      throw new TypeError('Unsupported tensor operation ' + op);
    }

    normalized.args = [...normalized.args];
    nodes.push(normalized);
    definitions.set(name, normalized);
  }

  const outputs = source.outputs.map((item, index) => {
    const name = id(item, 'Tensor output ' + index);
    if (!definitions.has(name)) throw new ReferenceError('Unknown tensor output ' + name);
    return name;
  });
  const payload = { schema: SCHEMA, inputs, nodes, outputs };
  const program = deepFreeze({ ...payload, fingerprint: digest(payload) });
  COMPILED.add(program);
  DEFINITIONS.set(program, definitions);
  return program;
}

function tensorDefinitions(program) {
  const compiled = compileTensorIR(program);
  return new Map(DEFINITIONS.get(compiled));
}

module.exports = {
  SCHEMA,
  ENGINE,
  MAX_ELEMENTS,
  compileTensorIR,
  tensorDefinitions,
  shapeSize,
  stridesFor,
  broadcastShape,
  promote,
};
