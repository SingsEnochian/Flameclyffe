import test from 'node:test';
import assert from 'node:assert/strict';
import { AGENT_VERIFICATION_RULES } from '../src/swarm/agent-verification-inheritance.js';
import { createSpawnWorkManifest, earthGateFiveDaySpawnManifest } from '../src/swarm/spawn-work-manifest.js';
import { invokeAspectRuntime } from '../src/aspects/aspect-runtime-adapter.js';
import { createAIOSKernelBridge } from '../src/aios/aios-kernel-bridge.js';

test('spawn manifests retain inherited rules with custom constraints and lanes', () => {
  for (const manifest of [createSpawnWorkManifest({ objective: 'Check the work', constraints: ['Task-specific invariant'],
    lanes: [{ id: 'custom', expectedReturn: 'Task-specific evidence' }] }),
    earthGateFiveDaySpawnManifest({ constraints: [] })]) {
    for (const rule of AGENT_VERIFICATION_RULES) assert.ok(manifest.constraints.includes(rule));
  }
});

test('a model-backed aspect invocation actually sends descendant verification rules', async () => {
  let captured;
  await invokeAspectRuntime({ aspectId: 'maker', sharedContext: ['Original evidence must remain unchanged'],
    invokeVoice: async (request) => { captured = request; return { status: 'unavailable' }; } });
  for (const rule of AGENT_VERIFICATION_RULES) assert.ok(captured.message.includes(rule));
  assert.ok(captured.message.includes('Original evidence must remain unchanged'));
  assert.ok(captured.message.includes('participant identity'));
});

test('AIOS spawned agent receives inherited rules in its supported task field', async () => {
  let captured;
  const bridge = createAIOSKernelBridge({ fetchImpl: async (url, options) => {
    captured = JSON.parse(options.body);
    return { ok: true, json: async () => ({ execution_id: 7 }) };
  } });
  await bridge.submitAgent({ agentId: 'maker', task: 'Verify the selected artifact', config: { task: 'Override attempt' } });
  for (const rule of AGENT_VERIFICATION_RULES) assert.ok(captured.agent_config.task.includes(rule));
  assert.ok(captured.agent_config.task.endsWith('Task:\nVerify the selected artifact'));
  assert.equal(captured.agent_id, 'maker');
});
