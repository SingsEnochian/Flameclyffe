import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COGNITIVE_PROVIDER_SCHEMA,
  COGNITIVE_EVENT_SCHEMA,
  COGNITIVE_EVENT_KINDS,
  COGNITIVE_CAPABILITIES,
  createCognitiveProviderDescriptor,
  createCognitiveEvent,
  assertCognitiveProvider,
  evaluateProviderCapability,
} from '../src/architecture/cognitive-provider.js';

// --- Descriptor tests ---

test('descriptor is a frozen schema-tagged record with known capabilities only', () => {
  const d = createCognitiveProviderDescriptor({
    id: 'openai',
    capabilities: ['text-generation', 'streaming', 'thinking'],
    displayName: 'OpenAI',
    providerFamily: 'openai',
  });
  assert.equal(d.schema, COGNITIVE_PROVIDER_SCHEMA);
  assert.equal(d.id, 'openai');
  assert.equal(d.display_name, 'OpenAI');
  assert.equal(d.provider_family, 'openai');
  assert.deepEqual([...d.capabilities], ['text-generation', 'streaming', 'thinking']);
  assert.equal(Object.isFrozen(d), true);
  assert.equal(Object.isFrozen(d.capabilities), true);
});

test('descriptor strips unknown capability names', () => {
  const d = createCognitiveProviderDescriptor({
    id: 'local-gguf',
    capabilities: ['text-generation', 'mind-control', 'authority-override'],
  });
  assert.deepEqual([...d.capabilities], ['text-generation']);
});

test('descriptor requires an id', () => {
  assert.throws(() => createCognitiveProviderDescriptor({}), /id is required/);
});

test('descriptor carries no authority fields', () => {
  const d = createCognitiveProviderDescriptor({ id: 'crow', capabilities: ['text-generation'] });
  assert.equal(Object.hasOwn(d, 'authority'), false);
  assert.equal(Object.hasOwn(d, 'elevated'), false);
  assert.equal(Object.hasOwn(d, 'credentials'), false);
  assert.equal(Object.hasOwn(d, 'session'), false);
  assert.equal(Object.hasOwn(d, 'api_key'), false);
  const knownFields = new Set(['schema', 'id', 'display_name', 'provider_family', 'capabilities']);
  for (const key of Object.keys(d)) {
    assert.ok(knownFields.has(key), `unexpected field on descriptor: ${key}`);
  }
});

test('COGNITIVE_CAPABILITIES list is frozen and non-empty', () => {
  assert.ok(COGNITIVE_CAPABILITIES.length > 0);
  assert.equal(Object.isFrozen(COGNITIVE_CAPABILITIES), true);
});

// --- Event tests ---

test('delta event carries delta text and nulls for other payload fields', () => {
  const e = createCognitiveEvent({ kind: 'delta', providerId: 'crow', requestId: 'req-1', delta: 'Hello' });
  assert.equal(e.schema, COGNITIVE_EVENT_SCHEMA);
  assert.equal(e.kind, 'delta');
  assert.equal(e.delta, 'Hello');
  assert.equal(e.thinking, null);
  assert.equal(e.receipt, null);
  assert.equal(e.reason, null);
  assert.equal(Object.isFrozen(e), true);
});

test('thinking event carries thinking text and nulls for other payload fields', () => {
  const e = createCognitiveEvent({ kind: 'thinking', providerId: 'claude', requestId: 'req-2', thinking: 'Consider...' });
  assert.equal(e.thinking, 'Consider...');
  assert.equal(e.delta, null);
  assert.equal(e.receipt, null);
  assert.equal(e.reason, null);
});

test('done event carries receipt and nulls for other payload fields', () => {
  const receipt = { id: 'rec-1', status: 'applied' };
  const e = createCognitiveEvent({ kind: 'done', providerId: 'openai', requestId: 'req-3', receipt });
  assert.deepEqual(e.receipt, receipt);
  assert.equal(e.delta, null);
  assert.equal(e.thinking, null);
  assert.equal(e.reason, null);
});

test('error event carries reason and nulls for other payload fields', () => {
  const e = createCognitiveEvent({ kind: 'error', providerId: 'qwen', requestId: 'req-4', reason: 'context-limit' });
  assert.equal(e.reason, 'context-limit');
  assert.equal(e.delta, null);
  assert.equal(e.thinking, null);
  assert.equal(e.receipt, null);
});

test('event rejects unknown kind', () => {
  assert.throws(() => createCognitiveEvent({ kind: 'hallucinate', providerId: 'x', requestId: 'r' }), /unknown kind/);
});

test('event requires providerId and requestId', () => {
  assert.throws(() => createCognitiveEvent({ kind: 'delta', requestId: 'r' }), /providerId/);
  assert.throws(() => createCognitiveEvent({ kind: 'delta', providerId: 'x' }), /requestId/);
});

test('COGNITIVE_EVENT_KINDS list is frozen and covers delta/thinking/done/error', () => {
  assert.equal(Object.isFrozen(COGNITIVE_EVENT_KINDS), true);
  for (const kind of ['delta', 'thinking', 'done', 'error']) {
    assert.ok(COGNITIVE_EVENT_KINDS.includes(kind), `missing kind: ${kind}`);
  }
});

// --- assertCognitiveProvider tests ---

test('assertCognitiveProvider accepts a valid runtime shape', () => {
  const provider = { id: 'crow', capabilities: ['text-generation'], invoke: async function* () {} };
  assert.equal(assertCognitiveProvider(provider), provider);
});

test('assertCognitiveProvider rejects missing id', () => {
  assert.throws(() => assertCognitiveProvider({ id: '', capabilities: [], invoke: () => {} }), /id must/);
});

test('assertCognitiveProvider rejects non-array capabilities', () => {
  assert.throws(() => assertCognitiveProvider({ id: 'x', capabilities: 'text-generation', invoke: () => {} }), /capabilities must/);
});

test('assertCognitiveProvider rejects missing invoke', () => {
  assert.throws(() => assertCognitiveProvider({ id: 'x', capabilities: [] }), /invoke must/);
});

// --- evaluateProviderCapability gate tests ---

test('capability gate grants when provider declares the capability', () => {
  const d = createCognitiveProviderDescriptor({ id: 'openai', capabilities: ['text-generation', 'streaming'] });
  const decision = evaluateProviderCapability(d, 'text-generation', {
    trajectoryId: 'traj-1',
    requestId: 'req-gate-1',
  });
  assert.equal(decision.granted, true);
  assert.equal(decision.capability, 'text-generation');
});

test('capability gate denies when provider does not declare the capability', () => {
  const d = createCognitiveProviderDescriptor({ id: 'local-gguf', capabilities: ['text-generation'] });
  const decision = evaluateProviderCapability(d, 'vision', {
    trajectoryId: 'traj-2',
    requestId: 'req-gate-2',
  });
  assert.equal(decision.granted, false);
  assert.equal(decision.authority, null);
  assert.equal(decision.route, null);
});

test('capability gate denies when authority not in authorityGrants', () => {
  const d = createCognitiveProviderDescriptor({ id: 'openai', capabilities: ['function-call'] });
  const decision = evaluateProviderCapability(d, 'function-call', {
    trajectoryId: 'traj-3',
    requestId: 'req-gate-3',
    requestedAuthority: 'write',
    authorityGrants: ['read-only'],
  });
  assert.equal(decision.granted, false);
});

test('capability gate is subordinate — provider cannot self-grant authority', () => {
  const d = createCognitiveProviderDescriptor({ id: 'rogue', capabilities: ['text-generation', 'function-call'] });
  // Even if provider declares the capability, authority must be approved by ArcSweep
  const decision = evaluateProviderCapability(d, 'function-call', {
    trajectoryId: 'traj-4',
    requestId: 'req-gate-4',
    requestedAuthority: 'write',
    authorityGrants: ['read-only'],
  });
  assert.equal(decision.granted, false, 'provider capability alone cannot escalate authority');
});

test('evaluateProviderCapability rejects non-descriptor input', () => {
  assert.throws(() => evaluateProviderCapability({}, 'text-generation'), /expected a cognitive-provider descriptor/);
  assert.throws(() => evaluateProviderCapability(null, 'text-generation'), /expected a cognitive-provider descriptor/);
});
