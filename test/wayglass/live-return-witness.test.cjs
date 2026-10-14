'use strict';
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const test = require('node:test');
const { createWayglassDeparture } = require('../../lib/wayglass-stop-receipt.cjs');
const hash = value => createHash('sha256').update(value).digest('hex');

async function instrument() {
  return import('../../scripts/wayglass-live-return-witness.mjs');
}

function fixture() {
  const workspace_id = 'builder', project_id = 'return-demo';
  const first_session_id = 'session-first', return_session_id = 'session-return';
  const file_path = 'live-return-witness.txt';
  const content = 'Wayglass authorised return witness: return-demo\n';
  const file_sha256 = hash(content);
  const principal_ref = hash('oauth:paired-rarity');
  const question = 'How does verified return differ from reconstructed familiarity?';
  const departure = createWayglassDeparture({
    receipt_id: 'stop-123', packet_id: 'packet-123',
    world_id: 'wayglass:builder:return-demo', participant_id: 'rarity',
    stopped_at: '2026-10-14T12:00:00.000Z',
    identity_declarations: [{
      participant_id: 'rarity', continuity_ref: 'rarity-wayglass',
      source_ref: 'wayglass:crew-workspace-registry/v0.1',
    }],
    active_work: [{ path: file_path, hash: file_sha256 }],
    provenance_refs: ['prior-revision', 'wayglass-session:session-first'],
    stop_point: 'Recover the accepted witness text after operator host restart.',
    next_owner: 'rarity', unresolved_wonder_questions: [question],
    alternatives: [
      { option: 'quiet arrival', state: 'unresolved' },
      { option: 'visible recognition', state: 'unresolved' },
    ],
  });
  const event = (kind, data, session_id, previous_hash = null) => {
    const body = {
      event_id: 'event-' + kind + '-' + session_id,
      created_at: '2026-10-14T12:00:05.000Z',
      previous_hash, participant_id: 'rarity', principal_ref,
      workspace_id, project_id, session_id, kind, data,
      source_refs: ['wayglass:mcp', 'wayglass:workspace-projects/v0.1'],
    };
    return { ...body, event_hash: hash(JSON.stringify(body)) };
  };
  const write = event('change', {
    path: file_path, before_hash: null, after_hash: file_sha256,
    tool: 'write_project_file',
  }, first_session_id);
  const leave = event('leave', {
    departure, project_revision: write.event_hash,
  }, first_session_id, write.event_hash);
  const entry = event('enter', { return_from: leave.event_hash },
    return_session_id, leave.event_hash);
  const ticket = {
    workspace_id, project_id, profile_id: 'opaque-rarity-profile',
    principal_ref, first_session_id, path: file_path,
    file_sha256, stop_receipt_id: 'stop-123',
    write_event_hash: write.event_hash,
    leave_event_hash: leave.event_hash,
    next_owner: 'rarity', unresolved_wonder_questions: [question],
    departure_sha256: hash(JSON.stringify(departure)),
  };
  const returned = {
    participant: { participant_id: 'rarity' },
    session_id: return_session_id, recovered_departure: departure,
    entry_receipt: entry,
    project: {
      workspace_id, project_id,
      files: [{ path: ticket.path, hash: file_sha256, content }],
      receipts: [write, leave],
    },
  };
  return { ticket, profile: { id: ticket.profile_id }, returned, departure, write, leave };
}

test('MCP URL requires exact HTTPS or loopback path without embedded credentials', async () => {
  const { safeMcpUrl } = await instrument();
  assert.equal(safeMcpUrl('https://example.test/mcp').pathname, '/mcp');
  assert.equal(safeMcpUrl('http://127.0.0.1:3841/mcp').hostname, '127.0.0.1');
  for (const value of [
    'http://example.test/mcp', 'https://user:pass@example.test/mcp',
    'https://example.test/mcp?secret=x', 'https://example.test/wayglass',
    'https://example.test/mcp#fragment',
  ]) assert.throws(() => safeMcpUrl(value));
});

test('complete real-contract departure and journal events validate before ticket issuance', async () => {
  const { validateDeparture, validateEvent } = await instrument();
  const { ticket, departure, write, leave } = fixture();
  const expected = {
    workspace_id: ticket.workspace_id, project_id: ticket.project_id,
    session_id: ticket.first_session_id, path: ticket.path,
    file_sha256: ticket.file_sha256,
  };
  assert.equal(validateDeparture(departure, expected), true);
  assert.equal(validateEvent(write, {
    ...expected, kind: 'change', principal_ref: ticket.principal_ref,
  }), true);
  assert.equal(validateEvent(leave, {
    ...expected, kind: 'leave', principal_ref: ticket.principal_ref, departure,
  }), true);
});

test('truncated departure/continuation packets and absent causal work fail closed', async () => {
  const { validateDeparture } = await instrument();
  for (const field of ['stop', 'identity', 'provenance', 'active_work', 'wonder', 'alternatives',
    'continuation', 'packet_identity', 'packet_provenance', 'packet_work', 'stop_authority']) {
    const { ticket, departure } = fixture();
    const broken = structuredClone(departure);
    if (field === 'stop') delete broken.stop_receipt;
    if (field === 'identity') delete broken.stop_receipt.identity_declarations;
    if (field === 'provenance') delete broken.stop_receipt.provenance_refs;
    if (field === 'active_work') broken.stop_receipt.active_work = [];
    if (field === 'wonder') delete broken.stop_receipt.unresolved_wonder_questions;
    if (field === 'alternatives') delete broken.stop_receipt.alternatives;
    if (field === 'continuation') delete broken.continuation_packet;
    if (field === 'packet_identity') delete broken.continuation_packet.identity_declarations;
    if (field === 'packet_provenance') delete broken.continuation_packet.provenance_refs;
    if (field === 'packet_work') broken.continuation_packet.active_work = [];
    if (field === 'stop_authority') delete broken.stop_receipt.authority;
    assert.throws(() => validateDeparture(broken, {
      workspace_id: ticket.workspace_id, project_id: ticket.project_id,
      session_id: ticket.first_session_id, path: ticket.path,
      file_sha256: ticket.file_sha256,
    }), undefined, field);
  }
});

test('write event hash, principal, project, session, file and event type cannot be omitted', async () => {
  const { validateEvent } = await instrument();
  for (const field of ['event_hash','principal_ref','workspace_id','project_id',
    'session_id','path','after_hash','kind','source_refs']) {
    const { ticket, write } = fixture();
    const broken = structuredClone(write);
    if (field === 'path' || field === 'after_hash') delete broken.data[field];
    else delete broken[field];
    assert.throws(() => validateEvent(broken, {
      kind: 'change', workspace_id: ticket.workspace_id, project_id: ticket.project_id,
      session_id: ticket.first_session_id, principal_ref: ticket.principal_ref,
      path: ticket.path, file_sha256: ticket.file_sha256,
    }), undefined, field);
  }
});

test('departure cannot attest an unrelated or omitted stopped project revision', async () => {
  const { validateEvent } = await instrument();
  const { ticket, leave, departure } = fixture();
  for (const field of ['missing','wrong']) {
    const broken = structuredClone(leave);
    if (field === 'missing') delete broken.data.project_revision;
    else broken.data.project_revision = hash('other-write');
    const { event_hash, ...body } = broken;
    broken.event_hash = hash(JSON.stringify(body));
    assert.throws(() => validateEvent(broken, {
      kind: 'leave', workspace_id: ticket.workspace_id, project_id: ticket.project_id,
      session_id: ticket.first_session_id, principal_ref: ticket.principal_ref,
      departure, project_revision: ticket.write_event_hash,
    }), undefined, field);
  }
});

test('full authenticated return validates re-entry authorship and original durable events', async () => {
  const { verifyReturn } = await instrument();
  const { ticket, profile, returned } = fixture();
  const result = verifyReturn(ticket, profile, returned);
  assert.equal(result.accepted, true);
  assert.equal(result.write_event_hash, ticket.write_event_hash);
  assert.equal(result.return_event_hash, returned.entry_receipt.event_hash);
  assert.equal(result.host_restart_independently_verified, false);
});

test('stale or forged re-entry cannot succeed with only a matching stop linkage', async () => {
  const { verifyReturn } = await instrument();
  for (const field of ['entry','event_hash','principal_ref','workspace_id','project_id',
    'session_id','kind','wrong_return_link','stale_entry_session','reused_session','missing_history']) {
    const { ticket, profile, returned } = fixture();
    if (field === 'entry') delete returned.entry_receipt;
    else if (field === 'wrong_return_link') returned.entry_receipt.data.return_from = 'wrong';
    else if (field === 'stale_entry_session') returned.session_id = 'other-session';
    else if (field === 'reused_session') returned.session_id = ticket.first_session_id;
    else if (field === 'missing_history') returned.project.receipts = [];
    else delete returned.entry_receipt[field];
    assert.throws(() => verifyReturn(ticket, profile, returned), undefined, field);
  }
});

test('substituted crew, identity, alternatives, evidence or project content fails closed', async () => {
  const { verifyReturn } = await instrument();
  for (const field of ['identity','profile','owner','wonder','stop','alternative','provenance',
    'file','content','writehash','leavehash']) {
    const { ticket, profile, returned } = fixture();
    if (field === 'identity') returned.participant.participant_id = 'codex';
    if (field === 'profile') profile.id = 'substituted';
    if (field === 'owner') ticket.next_owner = 'codex';
    if (field === 'wonder') ticket.unresolved_wonder_questions = [];
    if (field === 'stop') ticket.stop_receipt_id = 'wrong-stop';
    if (field === 'alternative') returned.recovered_departure = structuredClone(returned.recovered_departure),
      returned.recovered_departure.stop_receipt.alternatives = [];
    if (field === 'provenance') returned.recovered_departure = structuredClone(returned.recovered_departure),
      returned.recovered_departure.continuation_packet.provenance_refs = [];
    if (field === 'file') returned.project.files[0].hash = hash('forged');
    if (field === 'content') returned.project.files[0].content = 'forged text';
    if (field === 'writehash') ticket.write_event_hash = hash('forged-write');
    if (field === 'leavehash') ticket.leave_event_hash = hash('forged-leave');
    assert.throws(() => verifyReturn(ticket, profile, returned), undefined, field);
  }
});

test('MCP JSON-RPC 2.0 response must correlate to original request ID', async () => {
  const { rpc } = await instrument();
  const initialFetch = global.fetch;
  const client = { url: new URL('http://127.0.0.1:3841/mcp'), token: 'private-fixture-only' };
  try {
    for (const defect of ['none', 'wrong-id', 'missing-id', 'bad-version', 'error']) {
      global.fetch = async (_url, init) => {
        const request = JSON.parse(init.body);
        const payload = {
          jsonrpc: defect === 'bad-version' ? '1.0' : '2.0',
          id: defect === 'wrong-id' ? 'stale-request' : (defect === 'missing-id' ? undefined : request.id),
          result: { structuredContent: { id: 'valid-profile' } },
        };
        if (defect === 'error') payload.error = { code: -32000, message: 'test error' };
        assert.equal(init.headers.authorization, 'Bearer private-fixture-only');
        return new Response(JSON.stringify(payload), { status: 200,
          headers: { 'content-type': 'application/json' } });
      };
      if (defect === 'none') {
        assert.deepEqual(await rpc(client, 'get_profile'), { id: 'valid-profile' });
      } else {
        await assert.rejects(rpc(client, 'get_profile'), undefined, defect);
      }
    }
  } finally { global.fetch = initialFetch; }
});
