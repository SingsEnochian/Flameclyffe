'use strict';

const { digest } = require('./canonical.cjs');
const { ENGINE, compileTensorIR, tensorDefinitions, shapeSize } = require('./tensor-ir.cjs');

const FUSIBLE = new Set(['add', 'sub', 'mul', 'div', 'neg', 'exp', 'log', 'sin', 'cos', 'sqrt']);

function product(values) {
  return values.reduce((total, value) => total * value, 1);
}

function floatLiteral(value) {
  if (!Number.isFinite(value)) throw new RangeError('WGSL constants must be finite');
  if (Object.is(value, -0)) value = 0;
  let text = String(value);
  if (/^-?\d+$/.test(text)) text += '.0';
  return text;
}

function reachableNodes(output, definitions) {
  const seen = new Set();
  const visit = name => {
    if (seen.has(name)) return;
    const node = definitions.get(name);
    if (!node) throw new ReferenceError('Unknown tensor value ' + name);
    seen.add(name);
    for (const arg of node.args || []) visit(arg);
  };
  visit(output);
  return seen;
}

function inputIndexExpression(inputShape, outputShape) {
  if (inputShape.length === 0) return '0u';
  const pad = outputShape.length - inputShape.length;
  const terms = [];
  for (let axis = 0; axis < inputShape.length; axis++) {
    if (inputShape[axis] === 1) continue;
    const outputAxis = pad + axis;
    const outputStride = product(outputShape.slice(outputAxis + 1));
    const inputStride = product(inputShape.slice(axis + 1));
    terms.push('((i / ' + outputStride + 'u) % ' + outputShape[outputAxis] + 'u) * ' + inputStride + 'u');
  }
  return terms.length ? terms.join(' + ') : '0u';
}

function unsupported(program, output, reason, operation) {
  const definitions = tensorDefinitions(program);
  const definition = definitions.get(output);
  return {
    schema: 'wyrdrune.tensor-kernel/v0.1',
    engine: ENGINE,
    kind: 'cpu-reference',
    status: 'unsupported-by-wgsl-v0.1',
    output,
    outputShape: [...definition.shape],
    operation: operation || definition.op || 'input',
    reason,
    programFingerprint: program.fingerprint,
    gpuExecuted: false,
  };
}

function deriveTensorKernel(source, output) {
  if (typeof output !== 'string') throw new TypeError('Kernel derivation requires an output id');
  const program = compileTensorIR(source);
  const definitions = tensorDefinitions(program);
  const target = definitions.get(output);
  if (!target) throw new ReferenceError('Unknown tensor output ' + output);
  const reachable = reachableNodes(output, definitions);
  const ordered = [...program.inputs, ...program.nodes].filter(node => reachable.has(node.id));
  const inputNodes = program.inputs.filter(node => reachable.has(node.id));

  if (target.dtype !== 'f32') return unsupported(program, output, 'WGSL v0.1 emits f32 only; f64 remains on the reference backend', target.op);
  for (const node of ordered) {
    if (node.op === 'const' && (node.shape.length !== 0 || node.values.length !== 1)) {
      return unsupported(program, output, 'Only scalar constants are embedded in WGSL v0.1', node.op);
    }
    if (node.op !== 'const' && !program.inputs.some(input => input.id === node.id) && !FUSIBLE.has(node.op)) {
      return unsupported(program, output, 'Operation ' + node.op + ' is not in the elementwise WGSL lowering set', node.op);
    }
    if (node.dtype !== 'f32') return unsupported(program, output, 'Mixed or f64 precision requires the CPU reference backend', node.op);
  }

  const bindings = [];
  const statements = [];
  let binding = 0;
  const inputBinding = new Map();
  for (const input of inputNodes) {
    const name = 'buf_' + input.id;
    const slot = binding++;
    inputBinding.set(input.id, { name, slot });
    bindings.push({ id: input.id, binding: slot, access: 'read', shape: [...input.shape], dtype: input.dtype });
    statements.push('@group(0) @binding(' + slot + ') var<storage, read> ' + name + ': array<f32>;');
  }

  const outputBinding = binding++;
  bindings.push({ id: 'output', binding: outputBinding, access: 'read_write', shape: [...target.shape], dtype: 'f32' });
  statements.push('@group(0) @binding(' + outputBinding + ') var<storage, read_write> out_values: array<f32>;');

  const errorFlagBinding = binding++;
  bindings.push({ id: 'errorFlag', binding: errorFlagBinding, access: 'atomic-u32', initialValue: 0 });
  statements.push('@group(0) @binding(' + errorFlagBinding + ') var<storage, read_write> error_flag: atomic<u32>;');

  const paramsBinding = binding++;
  bindings.push({ id: 'params', binding: paramsBinding, access: 'uniform', fields: ['length:u32'] });
  statements.push('struct Params { length: u32, };');
  statements.push('@group(0) @binding(' + paramsBinding + ') var<uniform> params: Params;');
  statements.push('');
  statements.push('@compute @workgroup_size(64)');
  statements.push('fn main(@builtin(global_invocation_id) gid: vec3<u32>) {');
  statements.push('  let i = gid.x;');
  statements.push('  if (i >= params.length) { return; }');

  for (const node of ordered) {
    const variable = 'v_' + node.id;
    if (inputBinding.has(node.id)) {
      const input = inputBinding.get(node.id);
      const index = inputIndexExpression(node.shape, target.shape);
      statements.push('  let ' + variable + ' = ' + input.name + '[' + index + '];');
      continue;
    }
    if (node.op === 'const') {
      statements.push('  let ' + variable + ' = f32(' + floatLiteral(node.values[0]) + ');');
      continue;
    }
    const args = node.args.map(name => 'v_' + name);
    const expression = node.op === 'neg' ? '(-' + args[0] + ')' :
      node.op === 'add' ? '(' + args[0] + ' + ' + args[1] + ')' :
      node.op === 'sub' ? '(' + args[0] + ' - ' + args[1] + ')' :
      node.op === 'mul' ? '(' + args[0] + ' * ' + args[1] + ')' :
      node.op === 'div' ? '(' + args[0] + ' / ' + args[1] + ')' :
      node.op + '(' + args[0] + ')';
    statements.push('  let ' + variable + ' = ' + expression + ';');
    statements.push('  if (!isFinite(' + variable + ')) { atomicStore(&error_flag, 1u); return; }');
  }
  statements.push('  out_values[i] = v_' + output + ';');
  statements.push('}');
  const wgsl = statements.join('\n');
  const outputElements = shapeSize(target.shape);
  const logicalReadBytes = outputElements * inputNodes.length * 4;
  const logicalWriteBytes = outputElements * 4;
  const programInputs = program.inputs.map(input => ({
    id: input.id, shape: [...input.shape], dtype: input.dtype,
  }));
  const kernelFingerprint = digest({
    programFingerprint: program.fingerprint, output, wgsl, programInputs,
  });

  return {
    schema: 'wyrdrune.tensor-kernel/v0.1',
    engine: ENGINE,
    kind: 'wgsl-compute',
    status: 'generated-not-compiled',
    backend: 'wgsl',
    output,
    outputShape: [...target.shape],
    dtype: 'f32',
    comprehension: {
      domain: [...target.shape],
      iteration: 'row-major',
      body: output,
      reduction: null,
    },
    workgroupSize: 64,
    dispatchWorkgroups: Math.ceil(outputElements / 64),
    bindings,
    errorFlagBinding,
    errorFlagInitialValue: 0,
    requiresErrorFlagCheck: true,
    fusedNodes: ordered.filter(node => !program.inputs.some(input => input.id === node.id)).map(node => node.id),
    fusion: 'single-dispatch-elementwise',
    logicalReadBytes,
    logicalWriteBytes,
    programInputs,
    programFingerprint: program.fingerprint,
    kernelFingerprint,
    wgsl,
    gpuExecuted: false,
  };
}

module.exports = { deriveTensorKernel };
