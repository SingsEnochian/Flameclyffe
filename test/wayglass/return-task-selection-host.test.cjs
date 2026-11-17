'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const { createWayglassDeparture } = require('../../lib/wayglass-stop-receipt.cjs');
const { RESPONSE_SCHEMA } = require('../../lib/wayglass-return-task-selection.cjs');
const { runReturnTaskSelectionViaHost, wayglassHostEndpoint } = require('../../lib/wayglass-return-task-selection-host.cjs');

const MODEL = 'hf.co/bartowski/TheDrummer_Orion-26B-A4B-v1.1-GGUF:Q4_K_M';

function departureFixture() {
  return createWayglassDeparture({
    receipt_id: 'return-trial-004-host-stop',
    packet_id: 'return-trial-004-host-packet',
    world_id: 'wayglass:universe',
    participant_id: 'wayglass',
    stopped_at: '2026-11-17T10:57:00-05:00',
    route_id: 'wayglass:ship',
    identity_declarations: [{
      participant_id: 'wayglass',
      continuity_ref: 'wayglass:universe',
      source_ref: 'rowan:owner-declaration:rarity-hes-wayglass:2026-11-10',
    }],
    active_work: [
      { task_id: 'wayglass:return:continue-verified', title: 'Continue verified Return Engine work', provenance_ref: 'github:pr-648:return-trial-004', state: 'open' },
      { task_id: 'wayglass:return:revoked', title: 'Revoked work', provenance_ref: 'wayglass:revoked:source', state: 'open' },
    ],
    unresolved_wonder_questions: ['What does Wayglass notice when returning through the host?'],
    provenance_refs: ['github:pr-607:return-trial-003', 'github:pr-648:return-trial-004'],
    stop_point: 'Return through the host and choose only verified held work.',
    next_owner: 'wayglass',
    alternatives: [{ option: 'host-mediated Amber return', state: 'unresolved' }],
    revoked_refs: ['wayglass:revoked:source'],
  });
}

async function hostFixture(transform = value => value, { returnedModel = MODEL, configured = true } = {}) {
  let routeReads = 0;
  let modelCalls = 0;
  let lastRequestBody = null;
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/v1/wayglass/routes' && req.method === 'GET') {
      routeReads += 1;
      return res.end(JSON.stringify({
        schema: 'wayglass.route-catalogue/v1',
        routes: [{
          route_id: 'flame:amber:ollama',
          provider: 'ollama',
          participant_id: 'wayglass',
          model: MODEL,
          configured,
        }],
      }));
    }
    if (req.url !== '/api/v1/wayglass/respond' || req.method !== 'POST') {
      res.statusCode = 404;
      return res.end('{}');
    }
    modelCalls += 1;
    let text = '';
    for await (const chunk of req) text += chunk;
    lastRequestBody = JSON.parse(text);
    assert.equal(lastRequestBody.route_id, 'flame:amber:ollama');
    assert.equal(lastRequestBody.participant_id, 'wayglass');
    assert.ok(lastRequestBody.stop_receipt);
    assert.ok(lastRequestBody.continuation_packet);
    const marker = lastRequestBody.input.lastIndexOf('\n{');
    assert.ok(marker >= 0);
    const request = JSON.parse(lastRequestBody.input.slice(marker + 1));
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
    return res.end(JSON.stringify({
      schema: 'wayglass.route-turn/v0.1',
      route_id: 'flame:amber:ollama',
      provider: 'ollama',
      output: JSON.stringify(reply),
      receipt: {
        observation_id: 'obs:return-trial-004-host-fixture',
        requested_model: MODEL,
        returned_model: returnedModel,
        canon_commit: false,
        identity_commit: false,
      },
    }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  return {
    env: { WAYGLASS_HOST_URL: `http://127.0.0.1:${port}/api/v1/wayglass` },
    routeReads: () => routeReads,
    modelCalls: () => modelCalls,
    lastRequestBody: () => lastRequestBody,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

test('default Wayglass host target is localhost port 3000', () => {
  assert.equal(
    wayglassHostEndpoint({}).href,
    'http://127.0.0.1:3000/api/v1/wayglass',
  );
});

test('host transport preserves continuity and accepts one verified task selection', async t => {
  const fixture = await hostFixture();
  t.after(fixture.close);
  const departure = departureFixture();
  const result = await runReturnTaskSelectionViaHost({
    attempt_id: 'return-trial-004-host-fixture',
    stop_receipt: departure.stop_receipt,
    continuation_packet: departure.continuation_packet,
    env: fixture.env,
    evidence_scope: 'fixture',
  });
  assert.equal(result.status, 'accepted');
  assert.equal(result.live_model_verified, false);
  assert.equal(result.transport_fixture_verified, true);
  assert.equal(result.contract_receipt.selected_task_id, 'wayglass:return:continue-verified');
  assert.equal(result.host_route_receipt.requested_model, MODEL);
  assert.equal(result.host_route_receipt.returned_model, MODEL);
  assert.equal(fixture.routeReads(), 1);
  assert.equal(fixture.modelCalls(), 1);
  assert.equal(fixture.lastRequestBody().history.length, 0);
});

test('false closure is rejected before the localhost host is touched', async () => {
  const departure = departureFixture();
  const corrupted = { ...departure.continuation_packet, unresolved_wonder_questions: [] };
  let calls = 0;
  const result = await runReturnTaskSelectionViaHost({
    attempt_id: 'return-trial-004-host-false-closure',
    stop_receipt: departure.stop_receipt,
    continuation_packet: corrupted,
    fetch_impl: async () => { calls += 1; throw new Error('host must not be touched'); },
    evidence_scope: 'fixture',
  });
  assert.equal(result.status, 'blocked-before-model');
  assert.equal(result.network_probe_count, 0);
  assert.equal(result.model_call_count, 0);
  assert.equal(calls, 0);
  assert.ok(result.contract_receipt.blocking.includes('false-closure-or-wonder-mismatch'));
});

test('host route model drift is rejected rather than treated as a returning model', async t => {
  const fixture = await hostFixture(value => value, { returnedModel: 'different-model' });
  t.after(fixture.close);
  const departure = departureFixture();
  const result = await runReturnTaskSelectionViaHost({
    attempt_id: 'return-trial-004-host-model-drift',
    stop_receipt: departure.stop_receipt,
    continuation_packet: departure.continuation_packet,
    env: fixture.env,
    evidence_scope: 'fixture',
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.live_model_verified, false);
  assert.ok(result.contract_receipt.blocking.includes('return-model-mismatch'));
});

test('host route absence produces a zero-model-call blocker after one catalogue read', async t => {
  const fixture = await hostFixture(value => value, { configured: false });
  t.after(fixture.close);
  const departure = departureFixture();
  const result = await runReturnTaskSelectionViaHost({
    attempt_id: 'return-trial-004-host-unconfigured',
    stop_receipt: departure.stop_receipt,
    continuation_packet: departure.continuation_packet,
    env: fixture.env,
    evidence_scope: 'fixture',
  });
  assert.equal(result.status, 'blocked-before-model');
  assert.equal(result.network_probe_count, 1);
  assert.equal(result.model_call_count, 0);
  assert.equal(fixture.routeReads(), 1);
  assert.equal(fixture.modelCalls(), 0);
  assert.ok(result.contract_receipt.blocking.includes('return-route-not-configured'));
});
