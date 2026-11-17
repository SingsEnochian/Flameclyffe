'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const { createWayglassDeparture } = require('../../lib/wayglass-stop-receipt.cjs');
const { RESPONSE_SCHEMA } = require('../../lib/wayglass-return-task-selection.cjs');
const { runReturnTaskSelectionTransport } = require('../../lib/wayglass-return-task-selection-live.cjs');

const MODEL = 'hf.co/bartowski/TheDrummer_Orion-26B-A4B-v1.1-GGUF:Q4_K_M';

function departureFixture() {
  return createWayglassDeparture({
    receipt_id: 'return-trial-004-stop',
    packet_id: 'return-trial-004-packet',
    world_id: 'wayglass:universe',
    participant_id: 'wayglass',
    stopped_at: '2026-11-17T10:33:48-05:00',
    route_id: 'wayglass:ship',
    identity_declarations: [{
      participant_id: 'wayglass', continuity_ref: 'wayglass:universe',
      source_ref: 'rowan:owner-declaration:rarity-hes-wayglass:2026-11-10',
    }],
    active_work: [
      { task_id: 'wayglass:return:run-live-selection', title: 'Run the verified live Return selection', provenance_ref: 'github:pr-607:return-trial-003', state: 'open' },
      { task_id: 'wayglass:return:revoked', title: 'Revoked work', provenance_ref: 'wayglass:revoked:source', state: 'open' },
    ],
    unresolved_wonder_questions: ['What does Wayglass notice when returning through Amber?'],
    provenance_refs: ['github:pr-504:return-trial-002', 'github:pr-607:return-trial-003'],
    stop_point: 'Return through Amber using only verified held work and choose one task.',
    next_owner: 'wayglass',
    alternatives: [{ option: 'return through Amber', state: 'unresolved' }],
    revoked_refs: ['wayglass:revoked:source'],
  });
}

async function fixtureServer(transform = value => value) {
  let modelCalls = 0;
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/tags') return res.end(JSON.stringify({ models: [{ name: MODEL }] }));
    if (req.url !== '/api/chat') { res.statusCode = 404; return res.end('{}'); }
    modelCalls += 1;
    let text = '';
    for await (const chunk of req) text += chunk;
    const body = JSON.parse(text);
    const request = JSON.parse(body.messages.at(-1).content);
    const reply = transform({
      schema: RESPONSE_SCHEMA,
      participant_id: request.participant_id,
      request_hash: request.request_hash,
      stop_receipt_id: request.stop_receipt_id,
      identity_declarations: request.identity_declarations,
      stop_point: request.stop_point,
      next_owner: request.next_owner,
      unresolved_wonder_questions: request.unresolved_wonder_questions,
      provenance_refs: request.provenance_refs,
      selected_task_id: request.candidate_tasks[0].task_id,
    });
    res.end(JSON.stringify({ model: MODEL, done: true, message: { role: 'assistant', content: JSON.stringify(reply) } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    env: { WAYGLASS_SPINE_MODEL: MODEL, WAYGLASS_OLLAMA_URL: `http://127.0.0.1:${port}/api/chat` },
    modelCalls: () => modelCalls,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

test('transport fixture exercises the full packet-only return without claiming a live model', async t => {
  const fixture = await fixtureServer();
  t.after(fixture.close);
  const departure = departureFixture();
  const result = await runReturnTaskSelectionTransport({
    attempt_id: 'return-trial-004-fixture',
    stop_receipt: departure.stop_receipt,
    continuation_packet: departure.continuation_packet,
    env: fixture.env,
    evidence_scope: 'fixture',
  });
  assert.equal(result.status, 'accepted');
  assert.equal(result.live_model_verified, false);
  assert.equal(result.transport_fixture_verified, true);
  assert.equal(result.contract_receipt.live_model_verified, false);
  assert.equal(result.contract_receipt.transport_fixture_verified, true);
  assert.equal(result.contract_receipt.selected_task_id, 'wayglass:return:run-live-selection');
  assert.equal(result.host_route_receipt.provider_response_id_kind, 'content-addressed-provider-response');
  assert.equal(fixture.modelCalls(), 1);
});

test('false closure is rejected before catalogue probe or model call', async () => {
  const departure = departureFixture();
  const corrupted = { ...departure.continuation_packet, unresolved_wonder_questions: [] };
  let calls = 0;
  const result = await runReturnTaskSelectionTransport({
    attempt_id: 'return-trial-004-false-closure',
    stop_receipt: departure.stop_receipt,
    continuation_packet: corrupted,
    env: { WAYGLASS_SPINE_MODEL: MODEL },
    fetch_impl: async () => { calls += 1; throw new Error('must not be called'); },
    evidence_scope: 'fixture',
  });
  assert.equal(result.status, 'blocked-before-model');
  assert.equal(result.network_probe_count, 0);
  assert.equal(result.model_call_count, 0);
  assert.equal(calls, 0);
  assert.ok(result.contract_receipt.blocking.includes('false-closure-or-wonder-mismatch'));
});

test('an invented model task is rejected and never reported as a verified return', async t => {
  const fixture = await fixtureServer(value => ({ ...value, selected_task_id: 'invented:task' }));
  t.after(fixture.close);
  const departure = departureFixture();
  const result = await runReturnTaskSelectionTransport({
    attempt_id: 'return-trial-004-invented',
    stop_receipt: departure.stop_receipt,
    continuation_packet: departure.continuation_packet,
    env: fixture.env,
    evidence_scope: 'fixture',
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.live_model_verified, false);
  assert.equal(result.transport_fixture_verified, false);
  assert.ok(result.contract_receipt.blocking.includes('invented-or-unverified-task-selection'));
});

test('unreachable Ollama produces an exact zero-model-call blocker receipt', async () => {
  const departure = departureFixture();
  const result = await runReturnTaskSelectionTransport({
    attempt_id: 'return-trial-004-unreachable',
    stop_receipt: departure.stop_receipt,
    continuation_packet: departure.continuation_packet,
    env: { WAYGLASS_SPINE_MODEL: MODEL, WAYGLASS_OLLAMA_URL: 'http://127.0.0.1:9/api/chat' },
    fetch_impl: async () => { throw new Error('connect ECONNREFUSED 127.0.0.1:9'); },
    evidence_scope: 'fixture',
  });
  assert.equal(result.status, 'blocked-before-model');
  assert.equal(result.network_probe_count, 1);
  assert.equal(result.model_call_count, 0);
  assert.match(result.blocker, /ECONNREFUSED/);
  assert.ok(result.contract_receipt.blocking.includes('return-host-not-reachable'));
});

test('a returned-model mismatch cannot be accepted as the configured Amber route', async t => {
  const fixture = await fixtureServer();
  t.after(fixture.close);
  const original = fixture.env.WAYGLASS_OLLAMA_URL;
  const fetchImpl = async (url, init) => {
    const response = await fetch(url, init);
    if (String(url).endsWith('/api/chat')) {
      const value = await response.json();
      value.model = 'different-model';
      return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return response;
  };
  const departure = departureFixture();
  const result = await runReturnTaskSelectionTransport({
    attempt_id: 'return-trial-004-model-drift', stop_receipt: departure.stop_receipt,
    continuation_packet: departure.continuation_packet,
    env: { ...fixture.env, WAYGLASS_OLLAMA_URL: original }, fetch_impl: fetchImpl, evidence_scope: 'fixture',
  });
  assert.equal(result.status, 'rejected');
  assert.ok(result.contract_receipt.blocking.includes('return-model-mismatch'));
});
