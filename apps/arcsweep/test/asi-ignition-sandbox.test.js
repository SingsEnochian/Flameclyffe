import assert from 'node:assert/strict';
import test from 'node:test';
import { runIgnitionSandbox } from '../src/architecture/ignition-sandbox.js';

const now = () => new Date('2026-09-28T02:00:00.000Z');
const idFactory = (prefix) => `${prefix}-fixture-1`;

test('sandbox entry point exposes a receipted synthetic closed loop', async () => {
  const result = await runIgnitionSandbox('success', { now, idFactory });
  assert.equal(result.cycle.status, 'closed-loop');
  assert.equal(result.cycle.trajectory.state, 'resolved');
  assert.equal(result.cycle.decision.authority, 'read-only');
  assert.equal(result.cycle.receiptValidation.valid, true);
  assert.equal(result.feedbackEvidence.execution_receipt_id, 'receipt-fixture-1');
  assert.equal(result.observation.provenance.synthetic, true);
  assert.equal(result.executionCount, 1);
});

test('sandbox denial never invokes execution', async () => {
  const result = await runIgnitionSandbox('denied', { now, idFactory });
  assert.equal(result.cycle.status, 'waiting');
  assert.equal(result.cycle.decision.granted, false);
  assert.equal(result.executionCount, 0);
  assert.equal(result.feedbackEvidence, null);
});

test('sandbox invalid receipt cannot close the loop', async () => {
  const result = await runIgnitionSandbox('unverified', { now, idFactory });
  assert.equal(result.cycle.status, 'unverified-execution');
  assert.equal(result.cycle.receiptValidation.valid, false);
  assert.equal(result.cycle.feedbackObservation, null);
  assert.equal(result.feedbackEvidence, null);
});
