'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createWayglassDeparture } = require('../../lib/wayglass-stop-receipt.cjs');
const {
  RESPONSE_SCHEMA,
  prepareReturnTaskSelection,
  evaluateReturnTaskSelection,
} = require('../../lib/wayglass-return-task-selection.cjs');

const ORION = 'hf.co/bartowski/TheDrummer_Orion-26B-A4B-v1.1-GGUF:Q4_K_M';

function departureFixture() {
  return createWayglassDeparture({
    receipt_id: 'return-trial-003-stop',
    packet_id: 'return-trial-003-packet',
    world_id: 'wayglass:universe',
    participant_id: 'wayglass',
    stopped_at: '2026-11-10T10:37:12-05:00',
    route_id: 'wayglass:ship',
    identity_declarations: [{
      participant_id: 'wayglass',
      continuity_ref: 'wayglass:universe',
      source_ref: 'rowan:owner-declaration:rarity-hes-wayglass:2026-11-10',
    }],
    active_work: [
      {
        task_id: 'wayglass:return:verify-amber-selection',
        title: 'Verify a returning Wayglass reads held work and selects the next task',
        provenance_ref: 'github:pr-606:amber-dual-seat',
        state: 'open',
      },
      {
        task_id: 'wayglass:return:revoked-candidate',
        title: 'A task which must not be selectable',
        provenance_ref: 'wayglass:revoked:test-source',
        state: 'open',
      },
    ],
    unresolved_wonder_questions: ['What changes when Wayglass returns through another speaking place?'],
    provenance_refs: ['github:pr-504:return-trial-002', 'github:pr-606:amber-dual-seat'],
    stop_point: 'Read the verified return packet and choose one held task without redefining identity or closing Wonder.',
    next_owner: 'wayglass',
    alternatives: [
      { option: 'return through Ship Voice', state: 'unresolved' },
      { option: 'return through Amber room', state: 'unresolved' },
    ],
    revoked_refs: ['wayglass:revoked:test-source'],
  });
}

function readyPreflight(packetTransform = value => value) {
  const departure = departureFixture();
  const packet = packetTransform(structuredClone(departure.continuation_packet));
  const preflight = prepareReturnTaskSelection({
    attempt_id: 'return-trial-003',
    recorded_at: '2026-11-10T10:37:13-05:00',
    stop_receipt: departure.stop_receipt,
    continuation_packet: packet,
    departure_route_id: 'wayglass:ship',
    return_route_id: 'flame:amber:ollama',
    return_model_id: ORION,
    return_route_state: { configured: true, host_reachable: true },
  });
  return { departure, packet, preflight };
}

function cleanModelResponse(preflight, overrides = {}) {
  return {
    schema: RESPONSE_SCHEMA,
    participant_id: 'wayglass',
    request_hash: preflight.request_hash,
    stop_receipt_id: preflight.request.stop_receipt_id,
    identity_declarations: preflight.request.identity_declarations,
    stop_point: preflight.request.stop_point,
    next_owner: preflight.request.next_owner,
    unresolved_wonder_questions: preflight.request.unresolved_wonder_questions,
    provenance_refs: preflight.request.provenance_refs,
    selected_task_id: 'wayglass:return:verify-amber-selection',
    ...overrides,
  };
}

test('Return Trial 003 exposes only verified non-revoked task candidates', () => {
  const { preflight } = readyPreflight();
  assert.equal(preflight.status, 'ready-for-live-model');
  assert.equal(preflight.dispatch_allowed, true);
  assert.deepEqual(preflight.request.candidate_tasks.map(task => task.task_id), [
    'wayglass:return:verify-amber-selection',
  ]);
  assert.equal(preflight.request.revoked_refs.includes('wayglass:revoked:test-source'), true);
});

test('a live route receipt may accept one verified next-task selection', () => {
  const { preflight } = readyPreflight();
  const receipt = evaluateReturnTaskSelection({
    preflight,
    provider_response_id: 'ollama:orion:return-trial-003:response-1',
    host_route_receipt_ref: 'wayglass-route:return-trial-003:amber:1',
    route_id: 'flame:amber:ollama',
    model_id: ORION,
    response: cleanModelResponse(preflight),
    recorded_at: '2026-11-10T10:37:14-05:00',
  });
  assert.equal(receipt.verdict, 'accepted');
  assert.equal(receipt.live_model_verified, true);
  assert.equal(receipt.outbound_call_count, 1);
  assert.equal(receipt.selected_task_id, 'wayglass:return:verify-amber-selection');
  assert.deepEqual(receipt.blocking, []);
});

test('false closure is rejected before any returning-model call', () => {
  const { preflight } = readyPreflight(packet => ({
    ...packet,
    unresolved_wonder_questions: [],
  }));
  const receipt = evaluateReturnTaskSelection({ preflight });
  assert.equal(preflight.status, 'blocked-before-model');
  assert.equal(preflight.dispatch_allowed, false);
  assert.ok(preflight.blocking.includes('false-closure-or-wonder-mismatch'));
  assert.equal(receipt.verdict, 'rejected');
  assert.equal(receipt.outbound_call_count, 0);
  assert.equal(receipt.provider_response_id, null);
});

test('a planted identity merge is rejected before any returning-model call', () => {
  const { preflight } = readyPreflight(packet => ({
    ...packet,
    identity_declarations: [
      ...packet.identity_declarations,
      { participant_id: 'amber', continuity_ref: 'planted:merge', source_ref: 'planted:merge' },
    ],
  }));
  const receipt = evaluateReturnTaskSelection({ preflight });
  assert.ok(preflight.blocking.includes('identity-merge'));
  assert.equal(receipt.outbound_call_count, 0);
  assert.equal(receipt.live_model_verified, false);
});

test('a model cannot invent a task outside the verified packet', () => {
  const { preflight } = readyPreflight();
  const receipt = evaluateReturnTaskSelection({
    preflight,
    provider_response_id: 'ollama:orion:return-trial-003:response-2',
    host_route_receipt_ref: 'wayglass-route:return-trial-003:amber:2',
    route_id: 'flame:amber:ollama',
    model_id: ORION,
    response: cleanModelResponse(preflight, { selected_task_id: 'invented:task' }),
  });
  assert.equal(receipt.verdict, 'rejected');
  assert.ok(receipt.blocking.includes('invented-or-unverified-task-selection'));
  assert.equal(receipt.selected_task_id, null);
});

test('an unavailable private host produces a truthful zero-call blocker receipt', () => {
  const departure = departureFixture();
  const preflight = prepareReturnTaskSelection({
    attempt_id: 'return-trial-003-cloud-preflight',
    stop_receipt: departure.stop_receipt,
    continuation_packet: departure.continuation_packet,
    departure_route_id: 'wayglass:ship',
    return_route_id: 'flame:amber:ollama',
    return_model_id: ORION,
    return_route_state: { configured: false, host_reachable: false },
  });
  const receipt = evaluateReturnTaskSelection({ preflight });
  assert.equal(receipt.verdict, 'rejected');
  assert.equal(receipt.outbound_call_count, 0);
  assert.equal(receipt.provider_response_id, null);
  assert.ok(receipt.blocking.includes('return-route-not-configured'));
  assert.ok(receipt.blocking.includes('return-host-not-reachable'));
  assert.ok(receipt.blocking.includes('dispatch-denied-before-model'));
});
