import test from 'node:test';
import assert from 'node:assert/strict';
import { createSafeDiagnostics } from '../src/os/diagnostics.js';

test('OS diagnostics expose bounded summaries without raw context, errors, outputs, or Steward prose', () => {
  const secret = 'SENTINEL-DO-NOT-LEAK';
  const diagnostics = createSafeDiagnostics({
    manifest: { version: 'test' },
    boot: { state: 'READY' },
    session: {
      schema: 'arcsweep.os-session/v1',
      session_id: 'session:test',
      active_world_id: 'terra-aeterna',
      active_project_id: 'runa-kelyran',
      active_room: 'forge',
      current_goal: secret,
      presence_mode: 'companion',
    },
    activeContext: {
      schema: 'arcsweep.context-capsule/v1',
      capsule_id: 'context:test',
      session_id: 'session:test',
      world_id: 'terra-aeterna',
      current_room: 'forge',
      relevant_objects: [{ value: secret }],
      open_work: [secret],
      authority_boundary: { token: secret },
      receipt_ids: ['receipt:1'],
    },
    contextDepth: 1,
    events: [{ event_id: 'event:1', sequence: 1, name: 'arcsweep:test', payload: { secret }, meta: { source: 'test', secret }, emitted_at: '2026-09-10T00:00:00.000Z' }],
    health: [{ service_id: 'test', status: 'failed', last_error: secret, recoverable: true }],
    services: [{ service_id: 'test', label: 'Test', authority_boundary: { secret }, consumes: [], emits: [] }],
    capabilities: [{ capability_id: 'test.read', service_id: 'test', authority: 'read', input_schema: { secret } }],
    capabilityReceipts: [{ call_id: 'call:1', capability_id: 'test.read', service_id: 'test', status: 'applied', output: { secret } }],
    stewardPending: 1,
    stewardRecent: [{ request_id: 'steward:1', actor_id: 'human', capability_id: 'test.mutate', authority: 'mutate', status: 'pending', summary: secret, evidence_refs: [secret] }],
    repairReceipts: [{ repair_id: 'repair:1', fault_class: 'UI/WIRING', service_id: 'test', repair_level: 'R1', action: 'repair', result: 'committed', validation: [{ detail: secret }] }],
    featherPaused: true,
  });

  const text = JSON.stringify(diagnostics);
  assert.equal(text.includes(secret), false);
  assert.equal(diagnostics.session.has_current_goal, true);
  assert.equal(diagnostics.session.current_goal, undefined);
  assert.equal(diagnostics.active_context.receipt_count, 1);
  assert.equal(diagnostics.active_context.open_work, undefined);
  assert.equal(diagnostics.recent_events[0].payload, undefined);
  assert.equal(diagnostics.services[0].last_error, undefined);
  assert.equal(diagnostics.capability_receipts[0].output, undefined);
  assert.equal(diagnostics.steward_gate.recent[0].summary, undefined);
  assert.equal(diagnostics.repair_receipts[0].validation, undefined);
  assert.equal(diagnostics.feather_paused, true);
});
