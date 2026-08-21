import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCSWEEP_RUNTIME_ENVELOPE_SCHEMA,
  appendRuntimeFeedback,
  buildRuntimeIntegrationEnvelope,
  runtimeEnvelopeSummary,
  updateRuntimePresence,
} from '../src/runtime-integration-envelope.js';

test('buildRuntimeIntegrationEnvelope creates one shared session envelope', () => {
  const envelope = buildRuntimeIntegrationEnvelope({
    sessionId: 'session-1',
    world: { identity_anchor: { world_id: 'terra-prime' } },
    premaq: { P: 0.8, Q: { value: 0.7, uncertain: true } },
    activeFlame: 'virelya',
    presence: { virelya: 'ready', larkshine: 'waking' },
    provenance: [{ receipt_id: 'r-1' }],
  });

  assert.equal(envelope.schema, ARCSWEEP_RUNTIME_ENVELOPE_SCHEMA);
  assert.equal(envelope.session_id, 'session-1');
  assert.equal(envelope.world.identity_anchor.world_id, 'terra-prime');
  assert.equal(envelope.presence.virelya, 'ready');
  assert.equal(envelope.premaq.Q.uncertain, true);
});

test('presence updates are immutable and normalize unknown states to error', () => {
  const original = buildRuntimeIntegrationEnvelope({ sessionId: 'session-2', presence: { atlas: 'offline' } });
  const updated = updateRuntimePresence(original, 'atlas', 'thinking');
  const invalid = updateRuntimePresence(updated, 'atlas', 'levitating');

  assert.equal(original.presence.atlas, 'offline');
  assert.equal(updated.presence.atlas, 'thinking');
  assert.equal(invalid.presence.atlas, 'error');
});

test('feedback ledger preserves attribution and do-not-change notes', () => {
  const envelope = buildRuntimeIntegrationEnvelope({ sessionId: 'session-3' });
  const updated = appendRuntimeFeedback(envelope, {
    id: 'fb-1',
    voice_id: 'larkshine',
    kind: 'continuity',
    text: 'Preserve the existing runtime adapter.',
    confidence: 0.93,
    supporting_receipts: ['receipt-7'],
    do_not_change: true,
    created_at: '2026-08-21T16:00:00.000Z',
  });

  assert.equal(updated.feedback.length, 1);
  assert.equal(updated.feedback[0].voice_id, 'larkshine');
  assert.equal(updated.feedback[0].do_not_change, true);
  assert.deepEqual(updated.feedback[0].supporting_receipts, ['receipt-7']);
});

test('runtimeEnvelopeSummary exposes live-read counters without inventing state', () => {
  const envelope = buildRuntimeIntegrationEnvelope({
    sessionId: 'session-4',
    world: { world_id: 'terra-prime' },
    activeFlame: 'virelya',
    presence: { virelya: 'ready', atlas: 'degraded', larkshine: 'error' },
    provenance: [{ id: 'p1' }, { id: 'p2' }],
    feedback: [{ id: 'f1' }],
  });

  assert.deepEqual(runtimeEnvelopeSummary(envelope), {
    sessionId: 'session-4',
    worldId: 'terra-prime',
    activeFlame: 'virelya',
    readyVoices: 1,
    degradedVoices: 2,
    feedbackCount: 1,
    provenanceCount: 2,
  });
});
