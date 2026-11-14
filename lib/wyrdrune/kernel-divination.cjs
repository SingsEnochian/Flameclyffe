'use strict';

const { digest } = require('./canonical.cjs');
const { ENGINE, compileTensorIR, tensorDefinitions, shapeSize } = require('./tensor-ir.cjs');
const { deriveTensorKernel } = require('./tensor-lowering.cjs');

const SCHEMA = 'wyrdrune.kernel-divination/v0.1';
const ELEMENTWISE = new Set(['add', 'sub', 'mul', 'div', 'neg', 'exp', 'log', 'sin', 'cos', 'sqrt', 'const']);
const REDUCTIONS = new Set(['sum']);
const MATRICES = new Set(['matmul']);
const LAYOUTS = new Set(['transpose', 'reshape', 'view']);
const POLICIES = new Set(['best-derivable', 'reference-first', 'gpu-if-available', 'gpu-required']);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

function plainRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new TypeError(label + ' must be a plain record');
  }
  return value;
}

function reachableFrom(output, definitions, checkStop) {
  const seen = new Set();
  const visit = id => {
    checkStop();
    if (seen.has(id)) return;
    const node = definitions.get(id);
    if (!node) throw new ReferenceError('Unknown tensor value ' + id);
    seen.add(id);
    for (const input of node.args || []) visit(input);
  };
  visit(output);
  return seen;
}

function dtypeBytes(dtype) {
  return dtype === 'f64' ? 8 : 4;
}

function estimateOperations(nodes, definitions, checkStop) {
  let total = 0;
  for (const node of nodes) {
    checkStop();
    let cost = 0;
    if (ELEMENTWISE.has(node.op) && node.op !== 'const') cost = shapeSize(node.shape);
    else if (node.op === 'sum') cost = shapeSize(definitions.get(node.args[0]).shape);
    else if (node.op === 'matmul') {
      const [m, k] = definitions.get(node.args[0]).shape;
      const n = definitions.get(node.args[1]).shape[1];
      cost = 2 * m * k * n;
    } else if (LAYOUTS.has(node.op)) cost = shapeSize(node.shape);
    total += cost;
    if (!Number.isSafeInteger(total)) throw new RangeError('Kernel divination operation estimate overflow');
  }
  return total;
}

function classify(nodes, checkStop) {
  const families = new Set();
  const counts = Object.create(null);
  for (const node of nodes) {
    checkStop();
    counts[node.op] = (counts[node.op] || 0) + 1;
    if (ELEMENTWISE.has(node.op)) families.add('elementwise');
    else if (REDUCTIONS.has(node.op)) families.add('reduction');
    else if (MATRICES.has(node.op)) families.add('matrix');
    else if (LAYOUTS.has(node.op)) families.add('layout');
    else families.add('other');
  }
  const orderedFamilies = [...families].sort();
  const topology = orderedFamilies.length === 0 ? 'identity' :
    orderedFamilies.length === 1 ? orderedFamilies[0] : 'mixed';
  return {
    topology,
    families: orderedFamilies,
    operationCounts: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))),
  };
}

function normalizeRequest(request = {}) {
  plainRecord(request, 'Kernel divination request');
  for (const key of Object.keys(request)) {
    if (!['policy', 'capabilities'].includes(key)) throw new TypeError('Unknown kernel divination option ' + key);
  }
  const policy = request.policy === undefined ? 'best-derivable' : request.policy;
  if (!POLICIES.has(policy)) throw new TypeError('Unsupported kernel divination policy ' + policy);
  const capabilities = request.capabilities === undefined ? {} : plainRecord(request.capabilities, 'Kernel capabilities');
  for (const key of Object.keys(capabilities)) {
    if (!['cpu', 'webgpu'].includes(key)) throw new TypeError('Unknown kernel capability ' + key);
  }
  const cpu = capabilities.cpu === undefined ? {} : plainRecord(capabilities.cpu, 'CPU capabilities');
  const webgpu = capabilities.webgpu === undefined ? {} : plainRecord(capabilities.webgpu, 'WebGPU capabilities');
  if (cpu.available !== undefined && typeof cpu.available !== 'boolean') throw new TypeError('CPU availability must be boolean');
  if (webgpu.available !== undefined && typeof webgpu.available !== 'boolean') throw new TypeError('WebGPU availability must be boolean');

  const limits = {};
  for (const key of [
    'maxComputeWorkgroupSizeX',
    'maxComputeInvocationsPerWorkgroup',
    'maxStorageBufferBindingSize',
    'maxBufferSize',
    'maxUniformBufferBindingSize',
    'maxComputeWorkgroupsPerDimension',
    'maxStorageBuffersPerShaderStage',
  ]) {
    const value = webgpu[key];
    if (value !== undefined) {
      if (!Number.isSafeInteger(value) || value < 1) throw new RangeError('WebGPU ' + key + ' must be a positive safe integer');
      limits[key] = value;
    }
  }
  for (const key of ['adapterDescription', 'source']) {
    if (webgpu[key] !== undefined && webgpu[key] !== null && typeof webgpu[key] !== 'string') {
      throw new TypeError('WebGPU ' + key + ' must be a string');
    }
  }
  return {
    policy,
    cpuAvailable: cpu.available !== false,
    webgpu: {
      available: webgpu.available,
      source: webgpu.source || (webgpu.available === undefined ? 'not-probed' : 'caller-declared'),
      adapterDescription: webgpu.adapterDescription || null,
      limits,
    },
  };
}

function checkWebGpuLimits(plan, webgpu) {
  if (webgpu.available !== true) return { eligible: false, status: 'device-not-confirmed', reasons: ['A WebGPU adapter has not been confirmed available'] };
  const requiredLimits = ['maxComputeWorkgroupSizeX', 'maxComputeInvocationsPerWorkgroup', 'maxStorageBufferBindingSize', 'maxBufferSize', 'maxUniformBufferBindingSize', 'maxComputeWorkgroupsPerDimension', 'maxStorageBuffersPerShaderStage'];
  const missing = requiredLimits.filter(key => webgpu.limits[key] === undefined);
  if (missing.length) return { eligible: false, status: 'limits-incomplete', reasons: ['Adapter did not report required limits: ' + missing.join(', ')] };
  const failures = [];
  const limits = webgpu.limits;
  if (limits.maxComputeWorkgroupSizeX !== undefined && limits.maxComputeWorkgroupSizeX < plan.workgroupSize) {
    failures.push('Adapter maxComputeWorkgroupSizeX is below the derived workgroup size');
  }
  if (limits.maxComputeInvocationsPerWorkgroup !== undefined &&
      limits.maxComputeInvocationsPerWorkgroup < plan.workgroupSize) {
    failures.push('Adapter maxComputeInvocationsPerWorkgroup is below the derived workgroup size');
  }
  const storageBytes = plan.bindings
    .filter(binding => binding.access === 'read' || binding.access === 'read_write')
    .map(binding => shapeSize(binding.shape) * dtypeBytes(binding.dtype));
  if (limits.maxStorageBufferBindingSize !== undefined &&
      storageBytes.some(bytes => bytes > limits.maxStorageBufferBindingSize)) {
    failures.push('A derived storage binding exceeds maxStorageBufferBindingSize');
  }
  if (limits.maxBufferSize !== undefined && storageBytes.some(bytes => bytes > limits.maxBufferSize)) {
    failures.push('A derived storage buffer exceeds maxBufferSize');
  }
  if (limits.maxUniformBufferBindingSize < 16) failures.push('Adapter uniform-buffer limit is below the 16-byte parameter block');
  if (limits.maxComputeWorkgroupsPerDimension < plan.dispatchWorkgroups) failures.push('Derived dispatch exceeds maxComputeWorkgroupsPerDimension');
  const storageBindingCount = plan.bindings.filter(binding => binding.access === 'read' || binding.access === 'read_write' || binding.access === 'atomic-u32').length;
  if (limits.maxStorageBuffersPerShaderStage < storageBindingCount) failures.push('Derived shader storage-buffer count exceeds maxStorageBuffersPerShaderStage');
  return failures.length
    ? { eligible: false, status: 'device-limit-mismatch', reasons: failures }
    : { eligible: true, status: 'adapter-eligible', reasons: ['Declared adapter availability and supplied limits satisfy this derived plan'] };
}

function referencePlan(program, target) {
  return {
    schema: 'wyrdrune.tensor-kernel/v0.1',
    engine: ENGINE,
    kind: 'cpu-reference',
    status: 'selected-not-executed',
    backend: 'cpu-reference',
    output: target.id,
    outputShape: [...target.shape],
    dtype: target.dtype,
    programFingerprint: program.fingerprint,
    gpuExecuted: false,
    reason: 'Deterministic CPU reference is the selected execution route; no computation has been run by divination',
  };
}

/**
 * Kernel divination is deterministic graph analysis and rule-based plan selection.
 * It does not predict performance, execute kernels, or make metaphysical claims.
 */
function divineTensorKernel(source, output, request = {}, control = {}) {
  if (typeof output !== 'string') throw new TypeError('Kernel divination requires an output id');
  const signal = control.signal;
  const checkStop = () => { if (signal?.aborted) throw new Error('Feather: kernel divination stopped'); };
  checkStop();
  const program = compileTensorIR(source);
  const definitions = tensorDefinitions(program);
  const target = definitions.get(output);
  if (!target) throw new ReferenceError('Unknown tensor output ' + output);
  const normalized = normalizeRequest(request);
  const reachable = reachableFrom(output, definitions, checkStop);
  const inputs = program.inputs.filter(input => reachable.has(input.id));
  const nodes = program.nodes.filter(node => reachable.has(node.id));
  const inventory = [
    ...inputs.map(node => ({ id: node.id, role: 'input', shape: [...node.shape], dtype: node.dtype, elements: shapeSize(node.shape) })),
    ...nodes.map(node => ({ id: node.id, role: 'operation', op: node.op, shape: [...node.shape], dtype: node.dtype, elements: shapeSize(node.shape) })),
  ];
  const topology = classify(nodes, checkStop);
  const estimatedOperationCount = estimateOperations(nodes, definitions, checkStop);
  const logicalInputBytes = inputs.reduce((sum, input) => sum + shapeSize(input.shape) * dtypeBytes(input.dtype), 0);
  const logicalOutputBytes = shapeSize(target.shape) * dtypeBytes(target.dtype);
  const derived = deriveTensorKernel(program, output);
  const wgslSupported = derived.kind === 'wgsl-compute' && derived.status === 'generated-not-compiled';
  const webgpuGate = wgslSupported ? checkWebGpuLimits(derived, normalized.webgpu) :
    { eligible: false, status: 'lowering-unsupported', reasons: [derived.reason || 'No WGSL lowering exists for this graph'] };

  const candidates = [
    {
      id: 'cpu-reference',
      backend: 'cpu-reference',
      status: normalized.cpuAvailable ? 'available' : 'unavailable',
      rationale: normalized.cpuAvailable
        ? 'The deterministic reference interpreter supports the validated Tensor IR operations'
        : 'The caller declared the CPU reference backend unavailable',
    },
    {
      id: 'wgsl-elementwise',
      backend: 'webgpu',
      status: !wgslSupported ? 'unsupported' :
        webgpuGate.eligible ? 'adapter-eligible' :
        webgpuGate.status === 'device-not-confirmed' ? 'derivable-not-device-confirmed' :
        webgpuGate.status,
      rationale: wgslSupported
        ? webgpuGate.reasons.join('; ')
        : derived.reason || 'The graph is outside the current WGSL lowering set',
      kernelFingerprint: wgslSupported ? derived.kernelFingerprint : null,
    },
  ];

  let selectedBackend = null;
  let selectedPlan = null;
  let selectionReason = '';
  if (normalized.policy === 'best-derivable') {
    if (wgslSupported) {
      selectedBackend = 'webgpu';
      selectedPlan = derived;
      selectionReason = 'The graph has a supported fused WGSL derivation; this selects generated source, not device execution';
    } else if (normalized.cpuAvailable) {
      selectedBackend = 'cpu-reference';
      selectedPlan = referencePlan(program, target);
      selectionReason = 'WGSL lowering is unavailable for this graph, so the CPU reference path is selected';
    }
  } else if (normalized.policy === 'reference-first') {
    if (normalized.cpuAvailable) {
      selectedBackend = 'cpu-reference';
      selectedPlan = referencePlan(program, target);
      selectionReason = 'The request explicitly prioritises the CPU reference path';
    }
  } else if (normalized.policy === 'gpu-if-available') {
    if (webgpuGate.eligible) {
      selectedBackend = 'webgpu';
      selectedPlan = derived;
      selectionReason = 'A confirmed WebGPU adapter satisfies the derived kernel requirements';
    } else if (normalized.cpuAvailable) {
      selectedBackend = 'cpu-reference';
      selectedPlan = referencePlan(program, target);
      selectionReason = 'WebGPU is unavailable or ineligible; the CPU reference path is selected without attempting dispatch';
    }
  } else if (normalized.policy === 'gpu-required' && webgpuGate.eligible) {
    selectedBackend = 'webgpu';
    selectedPlan = derived;
    selectionReason = 'The required WebGPU adapter satisfies the derived kernel requirements';
  }

  const selectedStatus = !selectedPlan ? 'no-eligible-kernel' :
    selectedBackend === 'webgpu' ? 'derived-not-executed' : 'reference-selected-not-executed';
  const phaseTrace = [
    { phase: 'perceive', result: { inputCount: inputs.length, nodeCount: nodes.length, output, outputShape: [...target.shape], dtype: target.dtype } },
    { phase: 'compress', result: { topology: topology.topology, families: topology.families, operationCounts: topology.operationCounts } },
    { phase: 'release', result: { candidates: candidates.map(candidate => candidate.backend) } },
    { phase: 'verify', result: { tensorIr: 'validated', wgslLowering: wgslSupported ? 'supported' : 'unsupported', webgpuGate: webgpuGate.status } },
    { phase: 'integrate', result: { estimatedOperationCount, logicalInputBytes, logicalOutputBytes } },
    { phase: 'choose', result: { policy: normalized.policy, selectedBackend, reason: selectionReason } },
    { phase: 'return', result: { programFingerprint: program.fingerprint, kernelFingerprint: selectedPlan?.kernelFingerprint || null } },
    { phase: 'transcend', result: { execution: 'not-executed', gpuExecuted: false } },
  ];
  checkStop();
  const payload = {
    schema: SCHEMA,
    engine: ENGINE,
    kind: selectedPlan?.kind || 'unselected',
    status: selectedPlan ? 'divined-not-executed' : 'no-eligible-kernel',
    programFingerprint: program.fingerprint,
    output,
    analysis: {
      topology: topology.topology,
      families: topology.families,
      operationCounts: topology.operationCounts,
      inventory,
      estimatedOperationCount,
      logicalInputBytes,
      logicalOutputBytes,
      estimateSemantics: 'Static logical counts only; no latency, throughput or device-performance prediction',
      fusedNodes: wgslSupported ? [...derived.fusedNodes] : [],
    },
    candidates,
    decision: {
      policy: normalized.policy,
      selectedBackend,
      selectedStatus,
      reason: selectionReason || 'No backend satisfies the requested policy and declared capabilities',
      webgpuCapability: {
        available: normalized.webgpu.available === true,
        source: normalized.webgpu.source,
        adapterDescription: normalized.webgpu.adapterDescription,
        gate: webgpuGate.status,
      },
    },
    selectedPlan,
    phaseTrace,
    withness: {
      anchor: { programFingerprint: program.fingerprint, output },
      executionOccurred: false,
      gpuExecuted: false,
      principle: 'The derivation receipt remains distinct from execution and verified result receipts',
    },
    interpretation: 'Deterministic tensor-graph analysis and rule-based kernel-plan selection; no performance prediction or execution claim',
  };
  return deepFreeze({
    ...payload,
    divinationFingerprint: digest(payload),
  });
}

module.exports = { divineTensorKernel };
