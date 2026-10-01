import test from 'node:test';
import assert from 'node:assert/strict';
import { ASTRA_SLICE_RECEIPT_SCHEMA, runAstraVerticalSlice } from '../src/architecture/astra-vertical-slice.js';
import { PRESENCE_SCHEMA } from '../src/presence-fabric.js';
import { COGNITIVE_EVENT_SCHEMA } from '../src/architecture/cognitive-provider.js';
import { EXECUTION_RECEIPT_SCHEMA } from '../src/architecture/capability-negotiation.js';
import { SENSORY_ADAPTER_SCHEMA, OUTPUT_ADAPTER_SCHEMA } from '../src/architecture/sensory-output-contracts.js';

// Stub provider — satisfies CognitiveProvider runtime contract
function makeProvider({ id = 'crow', capabilities = ['text-generation'], events = null } = {}) {
  return {
    id,
    capabilities,
    async *invoke({ requestText }) {
      if (events) {
        for (const e of events) yield e;
        return;
      }
      yield { schema: COGNITIVE_EVENT_SCHEMA, kind: 'delta', provider_id: id, request_id: 'traj-test', delta: `echo:${requestText}`, thinking: null, receipt: null, reason: null, occurred_at: new Date().toISOString() };
      yield { schema: COGNITIVE_EVENT_SCHEMA, kind: 'done', provider_id: id, request_id: 'traj-test', delta: null, thinking: null, receipt: null, reason: null, occurred_at: new Date().toISOString() };
    },
  };
}

test('vertical slice: granted — full receipt with all contract layers', async () => {
  const receipt = await runAstraVerticalSlice({
    voiceId: 'lioreal',
    sessionId: 'sess-001',
    worldId: 'terra-prime',
    surface: 'web',
    participationMode: 'active',
    capability: 'text-generation',
    requestedAuthority: 'read-only',
    authorityGrants: ['read-only'],
    trajectoryId: 'traj-test',
    provider: makeProvider(),
    requestText: 'hello',
    occurredAt: '2026-09-30T00:00:00.000Z',
  });

  // Receipt is frozen and schema-tagged
  assert.equal(receipt.schema, ASTRA_SLICE_RECEIPT_SCHEMA);
  assert.equal(receipt.version, 1);
  assert.equal(receipt.granted, true);
  assert.equal(Object.isFrozen(receipt), true);
  assert.equal(receipt.occurred_at, '2026-09-30T00:00:00.000Z');

  // Capability decision
  assert.equal(receipt.capability_decision.granted, true);
  assert.equal(receipt.capability_decision.capability, 'text-generation');

  // Presence receipt (provider-rebound action)
  assert.equal(receipt.presence_receipt.action, 'provider-rebound');
  assert.equal(receipt.presence_receipt.before.identity_id, 'lioreal');
  assert.equal(receipt.presence_receipt.after.identity_id, 'lioreal');
  assert.equal(receipt.presence_receipt.authority_grants.length, 0);
  assert.equal(Object.hasOwn(receipt.presence_receipt, 'api_key'), false);

  // Provider descriptor
  assert.equal(receipt.provider_descriptor.id, 'crow');

  // Sensory and output descriptors
  assert.equal(receipt.sensory_descriptor.schema, SENSORY_ADAPTER_SCHEMA);
  assert.ok(receipt.sensory_descriptor.modalities.includes('text'));
  assert.equal(receipt.output_descriptor.schema, OUTPUT_ADAPTER_SCHEMA);
  assert.ok(receipt.output_descriptor.channels.includes('text'));

  // Cognitive events
  assert.ok(receipt.events.length >= 2);
  assert.equal(receipt.events[0].kind, 'delta');
  assert.equal(receipt.events[0].delta, 'echo:hello');
  assert.equal(receipt.events[1].kind, 'done');
  assert.equal(Object.isFrozen(receipt.events), true);

  // Execution receipt
  assert.equal(receipt.execution_receipt.schema, EXECUTION_RECEIPT_SCHEMA);
  assert.equal(receipt.execution_receipt.status, 'no-op');
  assert.deepEqual([...receipt.execution_receipt.evidenceRefs], []);
  assert.equal(receipt.execution_receipt.executor, 'crow');
});

test('vertical slice: denied — receipt reflects capability gate refusal', async () => {
  const receipt = await runAstraVerticalSlice({
    voiceId: 'atlas',
    sessionId: 'sess-002',
    surface: 'tui',
    capability: 'vision',
    trajectoryId: 'traj-deny',
    provider: makeProvider({ capabilities: ['text-generation'] }), // no vision
    requestText: 'describe image',
    occurredAt: '2026-09-30T00:01:00.000Z',
  });

  assert.equal(receipt.granted, false);
  assert.equal(receipt.capability_decision.granted, false);
  assert.equal(receipt.events.length, 0);
  assert.equal(receipt.execution_receipt, null);

  // Presence is torn down on denial
  assert.equal(receipt.presence_receipt.action, 'torn-down');
  assert.equal(receipt.presence_receipt.before.identity_id, 'atlas');
  assert.equal(receipt.presence_receipt.after, null);
  assert.equal(receipt.presence_receipt.authority_grants.length, 0);

  // Receipt is still frozen and complete
  assert.equal(Object.isFrozen(receipt), true);
  assert.equal(receipt.schema, ASTRA_SLICE_RECEIPT_SCHEMA);
});

test('vertical slice: authority gate denies even when capability is declared', async () => {
  const receipt = await runAstraVerticalSlice({
    voiceId: 'vesper',
    sessionId: 'sess-003',
    surface: 'api',
    capability: 'function-call',
    requestedAuthority: 'write',
    authorityGrants: ['read-only'], // ArcSweep only grants read-only
    trajectoryId: 'traj-auth',
    provider: makeProvider({ capabilities: ['text-generation', 'function-call'] }),
    requestText: 'run tool',
    occurredAt: '2026-09-30T00:02:00.000Z',
  });

  assert.equal(receipt.granted, false, 'authority elevation must be denied by gate');
  assert.equal(receipt.capability_decision.authority, null);
});

test('vertical slice: provider invoke error is captured in events and execution receipt', async () => {
  const errorProvider = {
    id: 'unstable',
    capabilities: ['text-generation'],
    async *invoke() {
      yield { schema: COGNITIVE_EVENT_SCHEMA, kind: 'delta', provider_id: 'unstable', request_id: 'traj-err', delta: 'partial', thinking: null, receipt: null, reason: null, occurred_at: new Date().toISOString() };
      throw new Error('provider-connection-lost');
    },
  };

  const receipt = await runAstraVerticalSlice({
    voiceId: 'solara',
    sessionId: 'sess-004',
    surface: 'discord',
    capability: 'text-generation',
    authorityGrants: ['read-only'],
    trajectoryId: 'traj-err',
    provider: errorProvider,
    requestText: 'query',
    occurredAt: '2026-09-30T00:03:00.000Z',
  });

  assert.equal(receipt.granted, true);
  const lastEvent = receipt.events[receipt.events.length - 1];
  assert.equal(lastEvent.kind, 'error');
  assert.ok(lastEvent.reason.includes('provider-connection-lost'));
  assert.equal(receipt.execution_receipt.status, 'failed');
});

test('vertical slice: identity never changes across provider rebind in receipt', async () => {
  const receipt = await runAstraVerticalSlice({
    voiceId: 'cosmo',
    sessionId: 'sess-005',
    surface: 'house-commons',
    capability: 'text-generation',
    authorityGrants: ['read-only'],
    trajectoryId: 'traj-rebind',
    provider: makeProvider({ id: 'openai', capabilities: ['text-generation', 'streaming'] }),
    requestText: 'test rebind',
    occurredAt: '2026-09-30T00:04:00.000Z',
  });

  assert.equal(receipt.granted, true);
  // identity_id is 'cosmo' in both before and after
  assert.equal(receipt.presence_receipt.before.identity_id, 'cosmo');
  assert.equal(receipt.presence_receipt.after.identity_id, 'cosmo');
  // provider_id is 'openai' in after binding
  assert.equal(receipt.presence_receipt.after.provider_binding.provider_id, 'openai');
  // provider does not become identity
  assert.notEqual(receipt.presence_receipt.after.identity_id, 'openai');
});

test('vertical slice: receipt carries no credentials, tokens, or authority grants', async () => {
  const receipt = await runAstraVerticalSlice({
    voiceId: 'lioreal',
    sessionId: 'sess-006',
    surface: 'web',
    capability: 'text-generation',
    authorityGrants: ['read-only'],
    trajectoryId: 'traj-clean',
    provider: makeProvider(),
    requestText: 'test',
    occurredAt: '2026-09-30T00:05:00.000Z',
  });

  const forbidden = ['api_key', 'token', 'credentials', 'secret', 'authority_grants_elevated'];
  const receiptStr = JSON.stringify(receipt);
  for (const field of forbidden) {
    assert.ok(!receiptStr.includes(`"${field}":`), `receipt must not contain: ${field}`);
  }
  assert.equal(receipt.presence_receipt.authority_grants.length, 0);
});

test('vertical slice: surface does not become identity in receipt', async () => {
  const receipt = await runAstraVerticalSlice({
    voiceId: 'atlas',
    sessionId: 'sess-007',
    surface: 'discord',
    capability: 'text-generation',
    authorityGrants: ['read-only'],
    trajectoryId: 'traj-surface',
    provider: makeProvider(),
    requestText: 'test',
    occurredAt: '2026-09-30T00:06:00.000Z',
  });

  // The presence's identity is 'atlas', not 'discord'
  assert.equal(receipt.presence_receipt.before.identity_id, 'atlas');
  assert.equal(receipt.presence_receipt.before.surface, 'discord');
  assert.notEqual(receipt.presence_receipt.before.identity_id, receipt.presence_receipt.before.surface);
});

test('fail-closed: omitting authorityGrants in vertical slice denies and tears down presence', async () => {
  const receipt = await runAstraVerticalSlice({
    voiceId: 'failclosed-voice',
    sessionId: 'sess-fc',
    surface: 'web',
    capability: 'text-generation',
    // authorityGrants deliberately omitted — must deny
    trajectoryId: 'traj-failclosed',
    provider: makeProvider(),
    requestText: 'should not execute',
    occurredAt: '2026-09-30T00:07:00.000Z',
  });

  assert.equal(receipt.granted, false, 'omitted authorityGrants must deny — fail-closed not fail-open');
  assert.equal(receipt.execution_receipt, null, 'no execution receipt when denied');
  assert.equal(receipt.events.length, 0, 'no events when denied');
  assert.equal(receipt.presence_receipt.action, 'torn-down', 'presence must be torn down on denial');
});


test('vertical slice: provider metadata is normalised out of credential-free receipts', async () => {
  const provider = makeProvider({
    events: [{
      schema: COGNITIVE_EVENT_SCHEMA,
      kind: 'done',
      provider_id: 'spoofed-provider',
      request_id: 'spoofed-request',
      receipt: { token: 'secret-token', status: 'applied' },
      token: 'secret-token',
      credentials: { api_key: 'secret-key' },
      occurred_at: '2026-09-30T00:08:00.000Z',
    }],
  });

  const receipt = await runAstraVerticalSlice({
    voiceId: 'sanitizer',
    sessionId: 'sess-sanitize',
    capability: 'text-generation',
    authorityGrants: ['read-only'],
    trajectoryId: 'traj-sanitize',
    provider,
    occurredAt: '2026-09-30T00:08:00.000Z',
  });

  assert.equal(receipt.events.length, 1);
  assert.equal(receipt.events[0].provider_id, 'crow');
  assert.equal(receipt.events[0].request_id, 'traj-sanitize');
  assert.equal(receipt.events[0].receipt, null);
  assert.equal(Object.hasOwn(receipt.events[0], 'token'), false);
  assert.equal(Object.hasOwn(receipt.events[0], 'credentials'), false);
  assert.ok(!JSON.stringify(receipt).includes('secret-token'));
  assert.ok(!JSON.stringify(receipt).includes('secret-key'));
  assert.equal(receipt.execution_receipt.status, 'no-op');
  assert.deepEqual([...receipt.execution_receipt.evidenceRefs], []);
});
