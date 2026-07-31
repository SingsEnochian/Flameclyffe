import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ARCSWEEP_SESSION_CONTEXT_KEY,
  ARCSWEEP_SESSION_PROMPT_SCHEMA,
  buildSessionPromptEnvelope,
  readActiveSessionContext,
  readActiveSessionEnvelope,
  sessionPromptEnvelopeToMarkdown,
} from '../src/arcsweep-continuity/session-context-client.js';

function context() {
  return {
    schema: 'arcsweep.session-context/v0.1',
    session_context_id: 'arcsweep-context-1',
    context_signature: 'terra-aeterna|routes:*|registers:*|items:item-1',
    resolved_at: '2026-07-31T05:31:00.000Z',
    resolved_by: 'Rowan',
    world_slug: 'terra-aeterna',
    mode: 'supplemental-continuity',
    lifetime: 'browser-session',
    authority: {
      state: 'human-reviewed-continuity',
      scope: 'session-context-only',
      canon_commit: false,
    },
    selection: {
      routes: [],
      registers: [],
      max_items: 24,
      available_count: 1,
      selected_count: 1,
      truncated: false,
    },
    source: {
      packet_ids: ['packet-1'],
      review_ids: ['review-1'],
      source_session_ids: ['source-session-1'],
      source_fingerprints: ['a'.repeat(64)],
      continuity_item_ids: ['item-1'],
    },
    items: [{
      continuity_item_id: 'item-1',
      source_item_id: 'source-item-1',
      text: 'Hearthside and Targetside anchors remained separate.',
      world_slug: 'terra-aeterna',
      layer: 'remained_true',
      route: 'system-continuity',
      epistemic_register: 'system-state',
      source_packet_ids: ['0001', '0002'],
      packet_id: 'packet-1',
      source_session_id: 'source-session-1',
      review_id: 'review-1',
      reviewer: 'Rowan',
      source_fingerprint: 'a'.repeat(64),
      authority_scope: 'reviewed-continuity',
      canon_commit: false,
    }],
    instructions: [
      'Treat every item as reviewed continuity, not canon.',
      'Preserve each item’s epistemic register and continuity route.',
      'Target-world narrative must not be presented as external evidence.',
      'Do not promote, rewrite, or persist this session context without a separate explicit act.',
    ],
  };
}

function memoryStorage(value) {
  return {
    getItem(key) {
      return key === ARCSWEEP_SESSION_CONTEXT_KEY ? value : null;
    },
  };
}

test('reads a valid active session envelope from session storage', () => {
  const envelope = { context: context(), load_receipt: { action: 'load' } };
  const storage = memoryStorage(JSON.stringify(envelope));
  assert.equal(readActiveSessionEnvelope(storage).context.world_slug, 'terra-aeterna');
  assert.equal(readActiveSessionContext(storage).items.length, 1);
});

test('returns null for absent or malformed session storage', () => {
  assert.equal(readActiveSessionEnvelope(memoryStorage(null)), null);
  assert.equal(readActiveSessionContext(memoryStorage('{broken')), null);
});

test('builds a prompt envelope that preserves authority and provenance', () => {
  const envelope = buildSessionPromptEnvelope(context());
  assert.equal(envelope.schema, ARCSWEEP_SESSION_PROMPT_SCHEMA);
  assert.equal(envelope.role, 'supplemental-reviewed-continuity');
  assert.equal(envelope.authority.canon_commit, false);
  assert.equal(envelope.authority.external_evidence_upgrade, false);
  assert.equal(envelope.persistence.durable, false);
  assert.equal(envelope.persistence.save_to_canon, false);
  assert.equal(envelope.continuity_items[0].epistemic_register, 'system-state');
  assert.deepEqual(envelope.provenance.packet_ids, ['packet-1']);
});

test('renders a portable markdown session packet without changing authority', () => {
  const markdown = sessionPromptEnvelopeToMarkdown(buildSessionPromptEnvelope(context()));
  assert.match(markdown, /Arcsweep Session Context: terra-aeterna/);
  assert.match(markdown, /canon commit false/i);
  assert.match(markdown, /system-continuity · system-state · remained_true/);
  assert.match(markdown, /Hearthside and Targetside anchors remained separate/);
});
