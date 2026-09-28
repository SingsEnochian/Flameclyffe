import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ASI_INVARIANTS,
  assertPlaneBoundary,
} from '../src/architecture/asi-contract.js';
import {
  createCapabilityRequest,
  createExecutionReceipt,
  evaluateCapabilityRequest,
  validateExecutionReceipt,
} from '../src/architecture/capability-negotiation.js';
import { runIgnitionCycle } from '../src/architecture/ignition-loop.js';
import {
  createTrajectory,
  exciteTrajectory,
  trajectoryActivationScore,
} from '../src/architecture/trajectory-state.js';

const fixedNow = () => new Date('2026-09-28T01:30:00.000Z');
let sequence = 0;
const idFactory = (prefix) => `${prefix}-${++sequence}`;

function dormantTrajectory() {
  return createTrajectory({
    id: 'trajectory-1',
    origin: 'observer:event-0',
    hypothesis: 'A repository condition may require inspection.',
    state: 'sleeping',
    activationThreshold: 0.55,
    damping: 0.9,
    signal: {
      amplitude: 0.1,
      persistence: 0,
      coherence: 0.9,
      uncertainty: 0.05,
    },
  }, { now: fixedNow });
}

test('ASI boundaries keep cognition separate from authority', () => {
  assert.equal(ASI_INVARIANTS.cognitionCannotCreateAuthority, true);
  assert.throws(() => assertPlaneBoundary('cognition', 'authority'), /asi-plane-boundary:cognition:authority/);
  assert.equal(assertPlaneBoundary('cognition', 'trajectories'), true);
});

test('traceable observation excitation can wake a dormant trajectory', () => {
  const trajectory = dormantTrajectory();
  const excited = exciteTrajectory(trajectory, {
    sourceRef: 'observation-1',
    amount: 0.95,
  }, { now: fixedNow });

  assert.equal(excited.state, 'active');
  assert.ok(trajectoryActivationScore(excited) >= excited.activationThreshold);
  assert.deepEqual(excited.excitationHistory.map((entry) => entry.sourceRef), ['observation-1']);
});

test('capability protocol rejects an applied receipt without evidence', () => {
  const request = createCapabilityRequest({
    id: 'request-1',
    trajectoryId: 'trajectory-1',
    capability: 'repository.inspect',
  }, { now: fixedNow });
  const receipt = createExecutionReceipt({
    id: 'receipt-1',
    requestId: request.id,
    status: 'applied',
    evidenceRefs: [],
  }, { now: fixedNow });

  assert.deepEqual(validateExecutionReceipt(receipt, request), {
    valid: false,
    reason: 'applied-receipt-requires-evidence',
  });
});

test('ArcSweep Ignition closes observation -> cognition -> capability -> receipt -> observation loop', async () => {
  sequence = 0;
  const result = await runIgnitionCycle({
    trajectory: dormantTrajectory(),
    observation: {
      id: 'observation-1',
      relevance: 0.95,
      coherence: 0.92,
      uncertainty: 0.04,
    },
    cognition: async ({ trajectory }) => {
      assert.equal(trajectory.state, 'active');
      return {
        capability: 'repository.inspect',
        scope: 'SingsEnochian/Flameclyffe',
        requestedAuthority: 'read-only',
        reason: 'Verify the external repository condition.',
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
        id: 'receipt-ignition-1',
        requestId: request.id,
        status: 'applied',
        evidenceRefs: ['github:commit:abc123'],
        changes: [],
        executor: 'github.read',
        result: { verified: true },
      }, { now: fixedNow });
    },
    idFactory,
    now: fixedNow,
  });

  assert.equal(result.status, 'closed-loop');
  assert.equal(result.request.requestedAuthority, 'read-only');
  assert.equal(result.decision.route, 'github.read');
  assert.equal(result.receiptValidation.valid, true);
  assert.equal(result.feedbackObservation.type, 'execution-receipt');
  assert.equal(result.trajectory.state, 'resolved');
  assert.ok(result.trajectory.evidenceRefs.includes('observation-1'));
  assert.ok(result.trajectory.evidenceRefs.includes('receipt:receipt-ignition-1'));
});

test('denied capability leaves the trajectory waiting and performs no execution', async () => {
  let executed = false;
  const result = await runIgnitionCycle({
    trajectory: dormantTrajectory(),
    observation: { id: 'observation-2', relevance: 0.95, coherence: 0.9, uncertainty: 0.05 },
    cognition: async () => ({ capability: 'repository.write', requestedAuthority: 'write' }),
    negotiate: async (request) => evaluateCapabilityRequest(request, {
      allowedCapabilities: ['repository.inspect'],
      authorityGrants: ['read-only'],
    }, { now: fixedNow }),
    execute: async () => {
      executed = true;
      throw new Error('execution-must-not-run');
    },
    idFactory,
    now: fixedNow,
  });

  assert.equal(result.status, 'waiting');
  assert.equal(result.trajectory.state, 'waiting');
  assert.equal(result.decision.granted, false);
  assert.equal(executed, false);
});

test('unverified execution cannot close the loop', async () => {
  const result = await runIgnitionCycle({
    trajectory: dormantTrajectory(),
    observation: { id: 'observation-3', relevance: 0.95, coherence: 0.9, uncertainty: 0.05 },
    cognition: async () => ({ capability: 'repository.inspect', requestedAuthority: 'read-only' }),
    negotiate: async (request) => evaluateCapabilityRequest(request, {
      allowedCapabilities: ['repository.inspect'],
      authorityGrants: ['read-only'],
      route: 'github.read',
    }, { now: fixedNow }),
    execute: async () => ({ status: 'applied', evidenceRefs: ['claim-without-receipt-schema'] }),
    idFactory,
    now: fixedNow,
  });

  assert.equal(result.status, 'unverified-execution');
  assert.equal(result.trajectory.state, 'waiting');
  assert.equal(result.receiptValidation.valid, false);
  assert.equal(result.feedbackObservation, null);
});
