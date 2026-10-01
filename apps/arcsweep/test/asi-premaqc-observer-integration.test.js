import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createExecutionReceipt,
  evaluateCapabilityRequest,
} from '../src/architecture/capability-negotiation.js';
import { adaptObserverEvent } from '../src/architecture/observer-event-adapter.js';
import {
  createPremaqcPossibilityEvaluator,
  premaqcContextSupport,
} from '../src/architecture/premaqc-possibility-adapter.js';
import { runPremaqcObserverIgnition } from '../src/architecture/premaqc-observer-ignition.js';
import { createTrajectory } from '../src/architecture/trajectory-state.js';

const fixedNow = () => new Date('2026-09-28T02:00:00.000Z');
let sequence = 0;
const idFactory = (prefix) => `${prefix}-${++sequence}`;

function component(value) {
  return { value, derivative: 0, uncertainty: 0.05, confidence: 0.9, contributors: [], uncertain: false };
}

function premaqc(q = 0.25) {
  return {
    schema_version: '2.0.0',
    id: 'premaqc-world-7',
    receipt_id: 'premaqc-receipt-world-7',
    sequence: 7,
    qualia: { present: true, authority: 'firsthand-only', report: { intensity: q } },
    state: {
      P: component(0.80),
      C: component(0.90),
      R: component(0.85),
      E: component(0.70),
      M: component(0.80),
      A: component(0.75),
      Q: component(q),
    },
    authority: {
      qualia_is_firsthand_only: true,
      qualia_magnitude_inference_allowed: false,
    },
  };
}

function sleepingTrajectory() {
  return createTrajectory({
    id: 'trajectory-observer-1',
    origin: 'observer:seed',
    hypothesis: 'External repository evidence may require inspection.',
    state: 'sleeping',
    activationThreshold: 0.55,
    damping: 0.9,
    signal: {
      amplitude: 0.2,
      persistence: 0.1,
      coherence: 0.6,
      uncertainty: 0.2,
    },
  }, { now: fixedNow });
}

function observerPayload({ contradicted = false } = {}) {
  return {
    schema: 'hearthgate.deep-current/v1',
    generated_at: '2026-09-28T02:00:00.000Z',
    field: {
      P: 0.82,
      C: 0.90,
      R: 0.92,
      E: 0.74,
      M: 0.81,
      A: 0.76,
      Q: 0.3,
    },
    raw_field: { source: 'deep-observer', R: 0.92, C: 0.90 },
    transformation_receipts: [
      { field: 'R', operation: 'numeric-coercion', input: '0.92', output: 0.92 },
    ],
    contradictions: contradicted ? [{ ref: 'observer:conflict-1' }] : [],
    provenance: {
      source: 'DEEP Observer shared PREMAQ spine',
      transport: 'same-origin observer bridge',
    },
  };
}

test('Observer adapter preserves raw evidence and transformation receipts', () => {
  const observation = adaptObserverEvent(observerPayload(), {
    id: 'observer:event-1',
    relevance: 0.95,
    uncertainty: 0.08,
  });

  assert.equal(observation.id, 'observer:event-1');
  assert.equal(observation.relevance, 0.95);
  assert.equal(observation.coherence, 0.90);
  assert.equal(observation.uncertainty, 0.08);
  assert.deepEqual(observation.rawField, { source: 'deep-observer', R: 0.92, C: 0.90 });
  assert.equal(observation.transformations.length, 1);
  assert.equal(observation.mapping.rawPreserved, true);
  assert.equal(observation.mapping.measurementClaim, false);
});

test('PREMAQC possibility support excludes Q from activation', async () => {
  const lowQ = premaqc(0.05);
  const highQ = premaqc(0.95);
  const trajectory = sleepingTrajectory();
  const observation = adaptObserverEvent(observerPayload(), {
    id: 'observer:event-q',
    relevance: 0.95,
    uncertainty: 0.08,
  });

  const lowContext = premaqcContextSupport(lowQ);
  const highContext = premaqcContextSupport(highQ);
  assert.equal(lowContext.support, highContext.support);
  assert.equal(lowContext.qualiaUsedForActivation, false);

  const low = await createPremaqcPossibilityEvaluator({ premaqc: lowQ })(trajectory, observation);
  const high = await createPremaqcPossibilityEvaluator({ premaqc: highQ })(trajectory, observation);
  assert.equal(low.pressure, high.pressure);
  assert.equal(low.qualia.usedForActivation, false);
  assert.equal(low.derivation.measurement, false);
});

test('Observer contradiction holds the ignition cycle before cognition executes', async () => {
  let cognitionCalled = false;
  let executionCalled = false;
  const result = await runPremaqcObserverIgnition({
    trajectory: sleepingTrajectory(),
    observerPayload: observerPayload({ contradicted: true }),
    observerOptions: { id: 'observer:event-conflict', relevance: 0.95, uncertainty: 0.08 },
    premaqc: premaqc(),
    cognition: async () => {
      cognitionCalled = true;
      return { capability: 'repository.inspect' };
    },
    negotiate: async () => ({ granted: true }),
    execute: async () => {
      executionCalled = true;
      throw new Error('must-not-execute');
    },
    idFactory,
    now: fixedNow,
  });

  assert.equal(result.cycle.status, 'contradicted');
  assert.equal(cognitionCalled, false);
  assert.equal(executionCalled, false);
  assert.equal(result.feedbackEvidence, null);
});

test('PREMAQC + Observer closes a receipted read-only ignition loop without mutating PREMAQC', async () => {
  sequence = 0;
  const before = structuredClone(premaqc());
  const result = await runPremaqcObserverIgnition({
    trajectory: sleepingTrajectory(),
    observerPayload: observerPayload(),
    observerOptions: {
      id: 'observer:event-live-1',
      relevance: 0.95,
      uncertainty: 0.08,
    },
    premaqc: before,
    cognition: async ({ trajectory, observation, possibility }) => {
      assert.equal(trajectory.state, 'active');
      assert.equal(observation.source, 'observer/deep');
      assert.equal(possibility.activate, true);
      return {
        capability: 'repository.inspect',
        scope: 'SingsEnochian/Flameclyffe',
        requestedAuthority: 'read-only',
        reason: 'Inspect the external condition that excited this trajectory.',
        completeOnAppliedReceipt: true,
      };
    },
    negotiate: async (request) => evaluateCapabilityRequest(request, {
      allowedCapabilities: ['repository.inspect'],
      authorityGrants: ['read-only'],
      route: 'github.read',
    }, { now: fixedNow }),
    execute: async ({ request, decision }) => {
      assert.equal(decision.granted, true);
      return createExecutionReceipt({
        id: 'receipt-observer-ignition-1',
        requestId: request.id,
        status: 'applied',
        evidenceRefs: ['github:commit:verified-1'],
        changes: [],
        executor: decision.route,
        result: { verified: true },
      }, { now: fixedNow });
    },
    idFactory,
    now: fixedNow,
  });

  assert.equal(result.cycle.status, 'closed-loop');
  assert.equal(result.cycle.trajectory.state, 'resolved');
  assert.equal(result.cycle.decision.authority, 'read-only');
  assert.equal(result.feedbackEvidence.execution_receipt_id, 'receipt-observer-ignition-1');
  assert.equal(result.feedbackEvidence.observer_ref, 'observer:event-live-1');
  assert.equal(result.feedbackEvidence.premaqc_ref, 'premaqc-world-7');
  assert.equal(result.feedbackEvidence.provenance.premaqc_mutated_by_adapter, false);
  assert.equal(result.premaqcMutation, 'none');
  assert.deepEqual(before, premaqc());
});
