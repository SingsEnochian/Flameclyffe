import kernelDivination from '../../../lib/wyrdrune/kernel-divination.cjs';
import canonical from '../../../lib/wyrdrune/canonical.cjs';

const { digest } = canonical;

/**
 * Analyse a Wyrdrune tensor graph and, for GPU policies, probe the browser adapter.
 * Adapter probing is explicit: best-derivable and reference-first never request one.
 * The returned plan is not executed; dispatch remains a separate user-directed action.
 */
export async function divineWayglassTensorKernel(program, output, request = {}, environment = {}) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new TypeError('Kernel divination request must be a record');
  }
  const policy = request.policy ?? 'best-derivable';
  const suppliedCapabilities = request.capabilities ?? {};
  if (!suppliedCapabilities || typeof suppliedCapabilities !== 'object' || Array.isArray(suppliedCapabilities)) {
    throw new TypeError('Kernel capabilities must be a record');
  }
  const suppliedWebGpu = suppliedCapabilities.webgpu ?? {};
  if (!suppliedWebGpu || typeof suppliedWebGpu !== 'object' || Array.isArray(suppliedWebGpu)) {
    throw new TypeError('WebGPU capabilities must be a record');
  }

  let webgpu = { ...suppliedWebGpu };
  if ((policy === 'gpu-if-available' || policy === 'gpu-required') &&
      !Object.hasOwn(webgpu, 'available')) {
    const gpu = environment.gpu ?? globalThis.navigator?.gpu;
    const adapter = await gpu?.requestAdapter?.({ powerPreference: environment.powerPreference ?? 'high-performance' });
    webgpu = {
      ...webgpu,
      available: Boolean(adapter),
      source: 'browser-adapter-probe',
      adapterDescription: adapter?.info?.description || null,
      maxComputeWorkgroupSizeX: adapter?.limits?.maxComputeWorkgroupSizeX,
      maxComputeInvocationsPerWorkgroup: adapter?.limits?.maxComputeInvocationsPerWorkgroup,
      maxStorageBufferBindingSize: adapter?.limits?.maxStorageBufferBindingSize,
      maxBufferSize: adapter?.limits?.maxBufferSize,
      maxUniformBufferBindingSize: adapter?.limits?.maxUniformBufferBindingSize,
      maxComputeWorkgroupsPerDimension: adapter?.limits?.maxComputeWorkgroupsPerDimension,
      maxStorageBuffersPerShaderStage: adapter?.limits?.maxStorageBuffersPerShaderStage,
    };
  }
  const capabilities = { ...suppliedCapabilities, webgpu };
  return kernelDivination.divineTensorKernel(program, output, { ...request, capabilities });
}

const RESULT_SCHEMA = 'wyrdrune.tensor-device-result/v0.1';
const KERNEL_SCHEMA = 'wyrdrune.tensor-kernel/v0.1';
const MAX_ELEMENTS = 1_000_000;

function product(shape) {
  if (!Array.isArray(shape) || shape.length > 8) throw new TypeError('Invalid WebGPU tensor shape');
  let size = 1;
  for (const dim of shape) {
    if (!Number.isSafeInteger(dim) || dim < 1) throw new RangeError('Invalid WebGPU tensor dimension');
    size *= dim;
    if (!Number.isSafeInteger(size) || size > MAX_ELEMENTS) throw new RangeError('WebGPU tensor element limit exceeded');
  }
  return size;
}

function flatten(value, output = []) {
  if (typeof value === 'number' && Number.isFinite(value)) output.push(value);
  else if (Array.isArray(value) || ArrayBuffer.isView(value)) {
    for (const item of value) flatten(item, output);
  } else {
    throw new TypeError('WebGPU feeds must contain finite numbers');
  }
  return output;
}

function unavailable(reason) {
  return {
    schema: RESULT_SCHEMA,
    status: 'unavailable',
    backend: 'webgpu',
    gpuExecuted: false,
    reason,
  };
}

function stopIfAborted(signal) {
  if (signal?.aborted) throw new Error('Feather: WebGPU tensor dispatch stopped');
}

function validatePlan(plan) {
  if (!plan || plan.schema !== KERNEL_SCHEMA || plan.kind !== 'wgsl-compute' ||
      plan.status !== 'generated-not-compiled' || plan.backend !== 'wgsl') {
    throw new TypeError('Expected an uncompiled Wyrdrune WGSL kernel plan');
  }
  if (plan.dtype !== 'f32' || plan.requiresErrorFlagCheck !== true ||
      !Number.isSafeInteger(plan.errorFlagBinding) ||
      !Number.isSafeInteger(plan.workgroupSize) || plan.workgroupSize < 1) {
    throw new TypeError('Kernel plan is missing the v0.1 f32 execution contract');
  }
  if (typeof plan.wgsl !== 'string' || !plan.wgsl.includes('@compute @workgroup_size(')) {
    throw new TypeError('Kernel plan does not contain a compute shader');
  }
  if (!Array.isArray(plan.bindings)) throw new TypeError('Kernel plan bindings are missing');
  const expectedFingerprint = plan.programInputs === undefined
    ? digest({ programFingerprint: plan.programFingerprint, output: plan.output, wgsl: plan.wgsl })
    : digest({
        programFingerprint: plan.programFingerprint,
        output: plan.output,
        wgsl: plan.wgsl,
        programInputs: plan.programInputs,
      });
  if (plan.kernelFingerprint !== expectedFingerprint) throw new TypeError('Kernel plan fingerprint does not match its executable metadata');
  if (plan.programInputs !== undefined) {
    if (!Array.isArray(plan.programInputs)) throw new TypeError('Kernel plan program inputs are malformed');
    const ids = new Set();
    for (const input of plan.programInputs) {
      if (!input || typeof input.id !== 'string' || ids.has(input.id) ||
          !Array.isArray(input.shape) || !['f32', 'f64'].includes(input.dtype)) {
        throw new TypeError('Kernel plan program input metadata is malformed');
      }
      ids.add(input.id);
      product(input.shape);
    }
    for (const binding of plan.bindings.filter(item => item.access === 'read')) {
      const input = plan.programInputs.find(item => item.id === binding.id);
      if (!input || input.dtype !== binding.dtype ||
          input.shape.length !== binding.shape.length ||
          input.shape.some((dimension, index) => dimension !== binding.shape[index])) {
        throw new TypeError('Kernel input binding is not bound to the program input manifest');
      }
    }
  }
  const output = plan.bindings.find(item => item.id === 'output' && item.access === 'read_write');
  const errorFlag = plan.bindings.find(item => item.id === 'errorFlag' && item.access === 'atomic-u32');
  const params = plan.bindings.find(item => item.id === 'params' && item.access === 'uniform');
  if (!output || !errorFlag || !params || errorFlag.binding !== plan.errorFlagBinding) {
    throw new TypeError('Kernel plan does not satisfy the output/status/params binding contract');
  }
  return { output, errorFlag, params };
}

/**
 * Explicitly dispatch a derived Wyrdrune f32 elementwise kernel through WebGPU.
 * This function never silently falls back to the CPU reference backend.
 */
export async function dispatchWyrdruneTensorKernel(plan, feeds, options = {}) {
  const descriptors = validatePlan(plan);
  if (!feeds || typeof feeds !== 'object' || Array.isArray(feeds)) throw new TypeError('WebGPU feeds must be a record');

  const inputBindings = plan.bindings.filter(item => item.access === 'read');
  const gpuInputs = new Map(inputBindings.map(input => [input.id, input]));
  const programInputs = Array.isArray(plan.programInputs)
    ? plan.programInputs
    : inputBindings.map(input => ({ id: input.id, shape: input.shape, dtype: input.dtype }));
  const expected = new Set(programInputs.map(item => item.id));
  for (const key of Object.keys(feeds)) if (!expected.has(key)) throw new TypeError('Unexpected WebGPU feed ' + key);

  const normalized = new Map();
  const normalizedFeeds = Object.create(null);
  for (const input of programInputs) {
    if (!Object.hasOwn(feeds, input.id)) throw new ReferenceError('Missing WebGPU feed ' + input.id);
    const values = flatten(feeds[input.id]);
    const expectedLength = product(input.shape);
    if (values.length !== expectedLength) {
      throw new RangeError('WebGPU feed ' + input.id + ' has ' + values.length + ' values; expected ' + expectedLength);
    }
    if (input.dtype !== 'f32' && input.dtype !== 'f64') throw new TypeError('Unsupported program feed dtype ' + input.dtype);
    const typed = input.dtype === 'f64' ? new Float64Array(values) : new Float32Array(values);
    for (const value of typed) if (!Number.isFinite(value)) throw new RangeError('WebGPU feed ' + input.id + ' exceeds ' + input.dtype + ' range');
    normalizedFeeds[input.id] = Array.from(typed);
    if (gpuInputs.has(input.id)) {
      if (input.dtype !== 'f32') throw new TypeError('WebGPU v0.1 only dispatches f32 inputs');
      normalized.set(input.id, typed);
    }
  }
  const feedsDigest = digest(normalizedFeeds);

  const outputLength = product(plan.outputShape);
  if (outputLength !== product(descriptors.output.shape)) throw new RangeError('Kernel output shape metadata mismatch');
  if (plan.dispatchWorkgroups !== Math.ceil(outputLength / plan.workgroupSize)) {
    throw new RangeError('Kernel dispatch metadata mismatch');
  }

  const gpu = options.gpu ?? globalThis.navigator?.gpu;
  const usage = options.bufferUsage ?? globalThis.GPUBufferUsage;
  const mapMode = options.mapMode ?? globalThis.GPUMapMode;
  if (!options.device && !options.adapter && (!gpu || typeof gpu.requestAdapter !== 'function')) {
    return unavailable('WebGPU is not available in this runtime');
  }
  if (!usage || !mapMode) return unavailable('WebGPU buffer or map constants are unavailable');

  stopIfAborted(options.signal);
  const adapter = options.adapter ?? (gpu ? await gpu.requestAdapter({ powerPreference: options.powerPreference ?? 'high-performance' }) : null);
  if (!options.device && !adapter) return unavailable('No WebGPU adapter is available');

  let device = options.device ?? null;
  let ownsDevice = false;
  const buffers = [];
  const makeBuffer = (size, flags) => {
    const buffer = device.createBuffer({ size: Math.max(4, size), usage: flags });
    buffers.push(buffer);
    return buffer;
  };

  try {
    if (!device) {
      device = await adapter.requestDevice();
      ownsDevice = true;
    }
    stopIfAborted(options.signal);

    const shader = device.createShaderModule({ code: plan.wgsl, label: 'Wyrdrune derived tensor kernel' });
    if (typeof shader.getCompilationInfo === 'function') {
      const compilation = await shader.getCompilationInfo();
      const errors = (compilation.messages || []).filter(message =>
        message.type === 'error' || message.severity === 'error');
      if (errors.length) throw new SyntaxError('WGSL compilation failed: ' + errors.map(item => item.message).join('; '));
    }
    const pipeline = typeof device.createComputePipelineAsync === 'function'
      ? await device.createComputePipelineAsync({
          layout: 'auto',
          compute: { module: shader, entryPoint: 'main' },
        })
      : device.createComputePipeline({
          layout: 'auto',
          compute: { module: shader, entryPoint: 'main' },
        });
    stopIfAborted(options.signal);

    const inputBuffers = new Map();
    for (const input of inputBindings) {
      const values = normalized.get(input.id);
      const buffer = makeBuffer(values.byteLength, usage.STORAGE | usage.COPY_DST);
      device.queue.writeBuffer(buffer, 0, values);
      inputBuffers.set(input.id, buffer);
    }

    const outputBytes = outputLength * Float32Array.BYTES_PER_ELEMENT;
    const outputBuffer = makeBuffer(outputBytes, usage.STORAGE | usage.COPY_SRC);
    const errorFlagBuffer = makeBuffer(4, usage.STORAGE | usage.COPY_DST | usage.COPY_SRC);
    const paramsBuffer = makeBuffer(16, usage.UNIFORM | usage.COPY_DST);
    device.queue.writeBuffer(errorFlagBuffer, 0, new Uint32Array([plan.errorFlagInitialValue ?? 0]));
    device.queue.writeBuffer(paramsBuffer, 0, new Uint32Array([outputLength, 0, 0, 0]));

    const readback = makeBuffer(outputBytes + 4, usage.MAP_READ | usage.COPY_DST);
    const entries = plan.bindings.map(binding => {
      let buffer;
      if (binding.id === 'output') buffer = outputBuffer;
      else if (binding.id === 'errorFlag') buffer = errorFlagBuffer;
      else if (binding.id === 'params') buffer = paramsBuffer;
      else buffer = inputBuffers.get(binding.id);
      if (!buffer) throw new TypeError('No WebGPU buffer for binding ' + binding.id);
      return { binding: binding.binding, resource: { buffer } };
    });
    const bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries });
    const encoder = device.createCommandEncoder({ label: 'Wyrdrune tensor dispatch' });
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(plan.dispatchWorkgroups);
    pass.end();
    encoder.copyBufferToBuffer(outputBuffer, 0, readback, 0, outputBytes);
    encoder.copyBufferToBuffer(errorFlagBuffer, 0, readback, outputBytes, 4);
    device.queue.submit([encoder.finish()]);
    stopIfAborted(options.signal);

    await readback.mapAsync(mapMode.READ);
    const mapped = readback.getMappedRange();
    const values = Array.from(new Float32Array(mapped.slice(0, outputBytes)));
    const errorFlag = new Uint32Array(mapped.slice(outputBytes, outputBytes + 4))[0];
    readback.unmap();
    stopIfAborted(options.signal);
    if (errorFlag !== 0) throw new RangeError('WGSL kernel reported a non-finite result; discard the entire output');

    const info = adapter?.info;
    return {
      schema: RESULT_SCHEMA,
      status: 'executed',
      engine: plan.engine,
      backend: 'webgpu',
      outputId: plan.output,
      feedsDigest,
      kernelFingerprint: plan.kernelFingerprint,
      programFingerprint: plan.programFingerprint,
      output: { shape: [...plan.outputShape], dtype: 'f32', values },
      execution: {
        gpuExecuted: true,
        workgroupSize: plan.workgroupSize,
        dispatchWorkgroups: plan.dispatchWorkgroups,
        errorFlag: 0,
        adapter: info?.description || null,
      },
    };
  } finally {
    for (const buffer of buffers) {
      try { buffer.destroy(); } catch { /* best-effort release */ }
    }
    if (ownsDevice && typeof device?.destroy === 'function') device.destroy();
  }
}
