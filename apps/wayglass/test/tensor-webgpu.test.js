import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { divineWayglassTensorKernel, dispatchWyrdruneTensorKernel } from '../src/tensor-webgpu.js';

const require = createRequire(import.meta.url);
const { deriveTensorKernel } = require('../../../lib/wyrdrune/tensor-lowering.cjs');
const { executeTensorIR } = require('../../../lib/wyrdrune/tensor-engine.cjs');

const program = {
  schema: 'wyrdrune.tensor-ir/v0.1',
  inputs: [{ id: 'x', shape: [2], dtype: 'f32' }],
  nodes: [{ id: 'square', op: 'mul', args: ['x', 'x'] }],
  outputs: ['square'],
};
const plan = deriveTensorKernel(program, 'square');

function mockWebGpu(expectedValues, errorFlag = 0, shaderMessages = [], targetPlan = plan) {
  const usage = { STORAGE: 1, COPY_DST: 2, COPY_SRC: 4, UNIFORM: 8, MAP_READ: 16 };
  const mapMode = { READ: 1 };
  let dispatchCount = 0;
  const buffers = [];

  const device = {
    createBuffer({ size, usage: flags }) {
      const buffer = {
        data: new ArrayBuffer(size),
        usage: flags,
        mapped: false,
        destroyed: false,
        async mapAsync() { this.mapped = true; },
        getMappedRange() { return this.data; },
        unmap() { this.mapped = false; },
        destroy() { this.destroyed = true; },
      };
      buffers.push(buffer);
      return buffer;
    },
    createShaderModule({ code }) {
      return { code, async getCompilationInfo() { return { messages: shaderMessages }; } };
    },
    async createComputePipelineAsync() {
      return { getBindGroupLayout() { return { group: 0 }; } };
    },
    createBindGroup({ entries }) {
      return { entries };
    },
    createCommandEncoder() {
      const copies = [];
      let bindEntries = [];
      return {
        beginComputePass() {
          return {
            setPipeline() {},
            setBindGroup(_index, bindGroup) { bindEntries = bindGroup.entries; },
            dispatchWorkgroups(count) { dispatchCount = count; },
            end() {},
          };
        },
        copyBufferToBuffer(source, sourceOffset, destination, destinationOffset, size) {
          copies.push({ source, sourceOffset, destination, destinationOffset, size });
        },
        finish() { return { copies, bindEntries, dispatchCount }; },
      };
    },
    queue: {
      writeBuffer(buffer, offset, data) {
        const bytes = data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        new Uint8Array(buffer.data).set(bytes, offset);
      },
      submit(commands) {
        const command = commands[0];
        const outputBinding = targetPlan.bindings.find(item => item.id === 'output').binding;
        const statusBinding = targetPlan.bindings.find(item => item.id === 'errorFlag').binding;
        const outputBuffer = command.bindEntries.find(item => item.binding === outputBinding).resource.buffer;
        const statusBuffer = command.bindEntries.find(item => item.binding === statusBinding).resource.buffer;
        new Float32Array(outputBuffer.data).set(expectedValues);
        new Uint32Array(statusBuffer.data)[0] = errorFlag;
        for (const copy of command.copies) {
          const source = new Uint8Array(copy.source.data, copy.sourceOffset, copy.size);
          new Uint8Array(copy.destination.data).set(source, copy.destinationOffset);
        }
      },
    },
    destroy() { this.destroyed = true; },
  };

  const adapter = {
    info: { description: 'Wyrdrune test adapter' },
    async requestDevice() { return device; },
  };
  const gpu = { async requestAdapter() { return adapter; } };
  return { gpu, adapter, device, buffers, usage, mapMode, get dispatchCount() { return dispatchCount; } };
}

test('WebGPU adapter validates and explicitly dispatches a derived Wyrdrune kernel', async () => {
  const mock = mockWebGpu([4, 9]);
  const result = await dispatchWyrdruneTensorKernel(plan, { x: [2, 3] }, {
    gpu: mock.gpu,
    bufferUsage: mock.usage,
    mapMode: mock.mapMode,
  });
  assert.equal(result.schema, 'wyrdrune.tensor-device-result/v0.1');
  assert.equal(result.status, 'executed');
  assert.equal(result.backend, 'webgpu');
  assert.equal(result.execution.gpuExecuted, true);
  assert.deepEqual(result.output.values, [4, 9]);
  assert.deepEqual(result.output.shape, [2]);
  assert.equal(result.execution.adapter, 'Wyrdrune test adapter');
  assert.equal(mock.dispatchCount, 1);
  assert.equal(mock.device.destroyed, true);
  assert.ok(mock.buffers.every(buffer => buffer.destroyed));
});

test('WebGPU adapter discards the whole result when the shader error flag is set', async () => {
  const mock = mockWebGpu([4, 0], 1);
  await assert.rejects(
    dispatchWyrdruneTensorKernel(plan, { x: [2, 3] }, {
      gpu: mock.gpu, bufferUsage: mock.usage, mapMode: mock.mapMode,
    }),
    /non-finite result; discard the entire output/,
  );
  assert.equal(mock.device.destroyed, true);
});


test('WebGPU feed provenance binds unused and non-GPU program inputs too', async () => {
  const extendedProgram = {
    schema: 'wyrdrune.tensor-ir/v0.1',
    inputs: [
      { id: 'x', shape: [2], dtype: 'f32' },
      { id: 'unused', shape: [1], dtype: 'f64' },
    ],
    nodes: [{ id: 'square', op: 'mul', args: ['x', 'x'] }],
    outputs: ['square'],
  };
  const extendedPlan = deriveTensorKernel(extendedProgram, 'square');
  const extendedFeeds = { x: [2, 3], unused: [Math.PI] };
  const mock = mockWebGpu([4, 9], 0, [], extendedPlan);
  const deviceResult = await dispatchWyrdruneTensorKernel(extendedPlan, extendedFeeds, {
    gpu: mock.gpu, bufferUsage: mock.usage, mapMode: mock.mapMode,
  });
  const referenceResult = executeTensorIR(extendedProgram, extendedFeeds);
  assert.equal(deviceResult.feedsDigest, referenceResult.feedsDigest);
  assert.equal(deviceResult.outputId, 'square');
  assert.deepEqual(deviceResult.output.values, [4, 9]);
});

test('WebGPU absence is explicit and never silently invokes the CPU backend', async () => {
  const result = await dispatchWyrdruneTensorKernel(plan, { x: [2, 3] }, {
    gpu: {}, bufferUsage: { STORAGE: 1 }, mapMode: { READ: 1 },
  });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.gpuExecuted, false);
  assert.match(result.reason, /not available/);
});

test('WebGPU shader compilation errors are returned as failures, not successful kernels', async () => {
  const mock = mockWebGpu([4, 9], 0, [{ type: 'error', message: 'synthetic WGSL error' }]);
  await assert.rejects(
    dispatchWyrdruneTensorKernel(plan, { x: [2, 3] }, {
      gpu: mock.gpu, bufferUsage: mock.usage, mapMode: mock.mapMode,
    }),
    /WGSL compilation failed: synthetic WGSL error/,
  );
  assert.equal(mock.device.destroyed, true);
});

test('Feather stop and malformed feeds prevent WebGPU dispatch', async () => {
  const mock = mockWebGpu([4, 9]);
  await assert.rejects(
    dispatchWyrdruneTensorKernel(plan, { x: [2, 3] }, {
      gpu: mock.gpu, bufferUsage: mock.usage, mapMode: mock.mapMode,
      signal: { aborted: true },
    }),
    /Feather/,
  );
  assert.equal(mock.dispatchCount, 0);
  await assert.rejects(dispatchWyrdruneTensorKernel(plan, { x: [2] }, {
    gpu: mock.gpu, bufferUsage: mock.usage, mapMode: mock.mapMode,
  }), /expected 2/);
});


test('Wayglass kernel divination probes WebGPU only when a GPU policy requests it', async () => {
  let probes = 0;
  const gpu = {
    async requestAdapter() {
      probes += 1;
      return {
        info: { description: 'Divination test adapter' },
        limits: {
          maxComputeWorkgroupSizeX: 64,
          maxComputeInvocationsPerWorkgroup: 64,
          maxStorageBufferBindingSize: 4096,
          maxBufferSize: 8192,
          maxUniformBufferBindingSize: 256,
          maxComputeWorkgroupsPerDimension: 65535,
          maxStorageBuffersPerShaderStage: 8,
        },
      };
    },
  };
  const ordinary = await divineWayglassTensorKernel(program, 'square', {}, { gpu });
  assert.equal(probes, 0);
  assert.equal(ordinary.decision.selectedBackend, 'webgpu');
  assert.equal(ordinary.decision.webgpuCapability.available, false);

  const selected = await divineWayglassTensorKernel(
    program, 'square', { policy: 'gpu-if-available' }, { gpu },
  );
  assert.equal(probes, 1);
  assert.equal(selected.decision.selectedBackend, 'webgpu');
  assert.equal(selected.decision.webgpuCapability.source, 'browser-adapter-probe');
  assert.equal(selected.decision.webgpuCapability.adapterDescription, 'Divination test adapter');
  assert.equal(selected.withness.executionOccurred, false);
});

test('Wayglass GPU-required divination returns no plan when no adapter exists', async () => {
  let probes = 0;
  const result = await divineWayglassTensorKernel(
    program, 'square', { policy: 'gpu-required' }, {
      gpu: { async requestAdapter() { probes += 1; return null; } },
    },
  );
  assert.equal(probes, 1);
  assert.equal(result.status, 'no-eligible-kernel');
  assert.equal(result.selectedPlan, null);
  assert.equal(result.withness.gpuExecuted, false);
});

test('caller-supplied WebGPU availability is respected without a second probe', async () => {
  let probes = 0;
  const result = await divineWayglassTensorKernel(
    program, 'square',
    { policy: 'gpu-if-available', capabilities: { webgpu: { available: false } } },
    { gpu: { async requestAdapter() { probes += 1; return {}; } } },
  );
  assert.equal(probes, 0);
  assert.equal(result.decision.selectedBackend, 'cpu-reference');
});
