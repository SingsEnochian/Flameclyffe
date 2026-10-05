import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHORUS_ENGINE_BINDING_SCHEMA,
  CHORUS_EXECUTION_PLAN_SCHEMA,
  buildChorusExecutionPlan,
  chorusAspectEngineRecipe,
  normaliseChorusEngineBinding,
} from '../src/os/chorus-engine-bindings.js';
import { NARRATIVENODE_MCP_PLAN_SCHEMA } from '../src/narrativenode-polyphony-adapter.js';
import { GENERATOR_REQUEST_SCHEMA } from '../src/generator-bridge.js';

test('different aspects may use different model routes while remaining one identity', () => {
  const planner = normaliseChorusEngineBinding({
    identity_id: 'bluebird',
    aspect_id: 'planner',
    engine: 'model-route',
    route_id: 'gpt-5.5',
    provider: 'openai',
    model: 'gpt-5.5',
  });
  const sceptic = normaliseChorusEngineBinding({
    identity_id: 'bluebird',
    aspect_id: 'sceptic',
    engine: 'model-route',
    route_id: 'claude-sonnet-4-6',
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
  });

  assert.equal(planner.schema, CHORUS_ENGINE_BINDING_SCHEMA);
  assert.equal(planner.identity_id, sceptic.identity_id);
  assert.notEqual(planner.route_id, sceptic.route_id);
  assert.equal(planner.owns_identity, false);
  assert.equal(sceptic.owns_identity, false);
  assert.equal(planner.execution, 'delegate-to-existing-model-route');
});

test('Narrative aspect delegates narrative state to the existing NarrativeNode adapter', () => {
  const binding = normaliseChorusEngineBinding({
    identity_id: 'bluebird',
    aspect_id: 'narrative',
    engine: 'narrativenode',
  });
  const plan = buildChorusExecutionPlan({
    identity_id: 'bluebird',
    aspect_id: 'narrative',
    task: 'Explore whether the amphora behaves differently before and after shared Grace appears.',
    bindings: [binding],
    narrative: {
      world_id: 'case-study:a-momento-creatonis',
      claims: [{
        id: 'amphora-state-change',
        name: 'Amphora state change',
        summary: 'The same vessel persists while its represented contents change.',
        truth_layer: 'world-truth',
      }],
    },
  });

  assert.equal(plan.schema, CHORUS_EXECUTION_PLAN_SCHEMA);
  assert.equal(plan.steps.length, 1);
  assert.equal(plan.steps[0].delegate, 'narrativenode-polyphony-adapter');
  assert.equal(plan.steps[0].delegated_plan.schema, NARRATIVENODE_MCP_PLAN_SCHEMA);
  assert.equal(plan.steps[0].copied_state_into_chorus, false);
  assert.equal(plan.aspect_state_duplicated, false);
});

test('Visual aspect delegates image workflow to the existing ComfyUI generator bridge', () => {
  const binding = normaliseChorusEngineBinding({
    identity_id: 'bluebird',
    aspect_id: 'visual',
    engine: 'comfyui',
  });
  const plan = buildChorusExecutionPlan({
    identity_id: 'bluebird',
    aspect_id: 'visual',
    task: 'Render a visual study of the shared identity and differentiated aspects.',
    bindings: [binding],
    visual: {
      request: {
        prompt: 'A single luminous core refracted into several operational facets, technical diagram, readable composition',
        width: 1024,
        height: 1024,
        seed: 42,
      },
    },
  });

  assert.equal(plan.steps[0].delegate, 'generator-bridge');
  assert.equal(plan.steps[0].generator_request.schema, GENERATOR_REQUEST_SCHEMA);
  assert.equal(plan.steps[0].graph_builder_reimplemented_in_chorus, false);
  assert.equal(plan.identity_authority_granted_to_engine, false);
  assert.equal(plan.canon_authority_granted_to_engine, false);
});

test('bindings retain only routing metadata rather than secrets', () => {
  const binding = normaliseChorusEngineBinding({
    identity_id: 'bluebird',
    aspect_id: 'planner',
    engine: 'model-route',
    route_id: 'bluebird-api',
    provider: 'openai-compatible',
    model: 'deepseek-chat',
    api_key: 'should-never-survive',
    authorization: 'Bearer should-never-survive',
  });
  const serialised = JSON.stringify(binding);
  assert.equal(serialised.includes('should-never-survive'), false);
  assert.equal(Object.hasOwn(binding, 'api_key'), false);
  assert.equal(Object.hasOwn(binding, 'authorization'), false);
});

test('recommended recipes reuse engines instead of inventing parallel implementations', () => {
  assert.deepEqual(chorusAspectEngineRecipe('planner'), ['model-route']);
  assert.deepEqual(chorusAspectEngineRecipe('narrative'), ['model-route', 'narrativenode']);
  assert.deepEqual(chorusAspectEngineRecipe('visual'), ['model-route', 'comfyui']);
});
