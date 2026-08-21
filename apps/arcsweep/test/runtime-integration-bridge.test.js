import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRuntimeIntegrationEnvelope,
} from '../src/runtime-integration-envelope.js';
import {
  applyLensReplyToEnvelope,
  applyRuntimeStatusToEnvelope,
  runtimePresenceFromStatus,
} from '../src/runtime-integration-bridge.js';
import {
  parseRuntimeIntegrationEnvelope,
  serialiseRuntimeIntegrationEnvelope,
} from '../src/runtime-integration-store.js';
import {
  buildRuntimeReplayReceipt,
  restoreEnvelopeFromReplay,
  runtimeReplayEquivalent,
} from '../src/runtime-integration-replay.js';

test('runtime status vocabulary maps into canonical presence states', () => {
  assert.equal(runtimePresenceFromStatus('ready'), 'ready');
  assert.equal(runtimePresenceFromStatus('house-offline'), 'offline');
  assert.equal(runtimePresenceFromStatus('model-unavailable'), 'degraded');
  assert.equal(runtimePresenceFromStatus('runtime-mismatch'), 'error');
  assert.equal(runtimePresenceFromStatus('unknown-future-state'), 'degraded');
});

test('runtime status updates preserve the envelope while changing only the addressed voice', () => {
  const envelope = buildRuntimeIntegrationEnvelope({
    sessionId: 'session-a',
    presence: { vee: 'ready', larkshine: 'offline' },
  });
  const next = applyRuntimeStatusToEnvelope(envelope, { voiceId: 'larkshine', state: 'ready' });
  assert.equal(next.presence.vee, 'ready');
  assert.equal(next.presence.larkshine, 'ready');
  assert.equal(envelope.presence.larkshine, 'offline');
});

test('lens replies become attributed feedback without mutating the source envelope', () => {
  const envelope = buildRuntimeIntegrationEnvelope({ sessionId: 'session-b', presence: { atlas: 'thinking' } });
  const next = applyLensReplyToEnvelope(envelope, {
    voiceId: 'atlas',
    kind: 'continuity',
    text: 'Three Ripples lineage is intact.',
    requestId: 'req-7',
    runtimeWorldContextId: 'worldctx-3',
    citedSources: ['receipt-1'],
  });
  assert.equal(next.presence.atlas, 'speaking');
  assert.equal(next.feedback.length, 1);
  assert.equal(next.feedback[0].voice_id, 'atlas');
  assert.deepEqual(next.feedback[0].supporting_receipts, ['worldctx-3', 'receipt-1']);
  assert.equal(envelope.feedback.length, 0);
});

test('runtime integration envelopes survive storage round-trip', () => {
  const envelope = buildRuntimeIntegrationEnvelope({ sessionId: 'session-c', activeFlame: 'vee' });
  const restored = parseRuntimeIntegrationEnvelope(serialiseRuntimeIntegrationEnvelope(envelope));
  assert.deepEqual(restored, envelope);
});

test('runtime replay receipts deterministically restore the functional envelope', () => {
  const envelope = buildRuntimeIntegrationEnvelope({
    sessionId: 'violet-three-ripples',
    world: { world_id: 'three-ripples' },
    activeFlame: 'vee',
    provenance: ['violet-flame'],
  });
  const receipt = buildRuntimeReplayReceipt(envelope, { replayId: 'violet-three-ripples-1', createdAt: '2026-08-21T16:00:00.000Z' });
  const restored = restoreEnvelopeFromReplay(receipt);
  assert.equal(receipt.replay_id, 'violet-three-ripples-1');
  assert.equal(runtimeReplayEquivalent(envelope, restored), true);
});
