'use strict';
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const test = require('node:test');
const hash = value => createHash('sha256').update(value).digest('hex');

async function instrument() {
  return import('../../scripts/wayglass-live-return-witness.mjs');
}

function fixture() {
  const content = 'Wayglass authorised return witness: return-demo\n';
  const departure = {
    stop_receipt: {
      receipt_id: 'stop-123',
      next_owner: 'rarity',
      unresolved_wonder_questions: ['How does verified return differ from reconstructed familiarity?'],
      identity_declarations: [{ participant_id: 'rarity', continuity_ref: 'wayglass:crew:rarity' }],
      stop_point: 'Resume from a saved stop',
      alternatives: [{ option: 'quiet arrival', state: 'unresolved' }],
    },
    continuation_packet: { source_refs: ['wayglass:workspace-projects/v0.1'] },
  };
  const ticket = {
    workspace_id: 'builder', project_id: 'return-demo',
    profile_id: 'opaque-authorised-rarity', path: 'live-return-witness.txt',
    file_sha256: hash(content), stop_receipt_id: 'stop-123',
    leave_event_hash: 'event-123', next_owner: 'rarity',
    unresolved_wonder_questions: departure.stop_receipt.unresolved_wonder_questions,
    departure_sha256: hash(JSON.stringify(departure)),
  };
  const returned = {
    participant: { participant_id: 'rarity' },
    recovered_departure: departure,
    entry_receipt: { data: { return_from: 'event-123' } },
    project: { files: [{ path: ticket.path, hash: ticket.file_sha256, content }] },
  };
  return { ticket, profile: { id: ticket.profile_id }, returned };
}

test('live witness accepts exact HTTPS or loopback MCP URLs, no credentials or query', async () => {
  const { safeMcpUrl } = await instrument();
  assert.equal(safeMcpUrl('https://example.test/mcp').pathname, '/mcp');
  assert.equal(safeMcpUrl('http://127.0.0.1:3841/mcp').hostname, '127.0.0.1');
  for (const value of [
    'http://example.test/mcp', 'https://user:pass@example.test/mcp',
    'https://example.test/mcp?secret=x', 'https://example.test/wayglass',
    'https://example.test/mcp#fragment',
  ]) assert.throws(() => safeMcpUrl(value));
});

test('live witness verifies profile, durable departure, event binding and work object', async () => {
  const { verifyReturn } = await instrument();
  const { ticket, profile, returned } = fixture();
  assert.equal(verifyReturn(ticket, profile, returned).accepted, true);
  assert.equal(verifyReturn(ticket, profile, returned).host_restart_independently_verified, false);
});

test('substituted crew identity and changed owner or unanswered question are rejected', async () => {
  const { verifyReturn } = await instrument();
  for (const field of ['identity', 'profile', 'owner', 'wonder', 'stop']) {
    const { ticket, profile, returned } = fixture();
    if (field === 'identity') returned.participant.participant_id = 'codex';
    if (field === 'profile') profile.id = 'wrong-principal';
    if (field === 'owner') returned.recovered_departure.stop_receipt.next_owner = 'codex';
    if (field === 'wonder') returned.recovered_departure.stop_receipt.unresolved_wonder_questions = [];
    if (field === 'stop') returned.recovered_departure.stop_receipt.receipt_id = 'wrong-stop';
    assert.throws(() => verifyReturn(ticket, profile, returned), undefined, field);
  }
});

test('changed alternatives, provenance, event chain and source work fail closed', async () => {
  const { verifyReturn } = await instrument();
  for (const field of ['alternative', 'provenance', 'event', 'file', 'content']) {
    const { ticket, profile, returned } = fixture();
    if (field === 'alternative') returned.recovered_departure.stop_receipt.alternatives = [];
    if (field === 'provenance') returned.recovered_departure.continuation_packet.source_refs = [];
    if (field === 'event') returned.entry_receipt.data.return_from = 'forged-event';
    if (field === 'file') returned.project.files[0].hash = hash('forged');
    if (field === 'content') returned.project.files[0].content = 'forged text';
    assert.throws(() => verifyReturn(ticket, profile, returned), undefined, field);
  }
});
