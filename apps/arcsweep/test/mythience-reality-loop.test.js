import assert from 'node:assert/strict';
import test from 'node:test';

import { createExecutionReceipt, evaluateCapabilityRequest } from '../src/architecture/capability-negotiation.js';
import { runMythienceRealityCycle } from '../src/architecture/mythience-reality-loop.js';
import { createRealityDescriptor, compareRealityDescriptors } from '../src/architecture/reality-correspondence.js';
import { createTrajectory } from '../src/architecture/trajectory-state.js';

const fixedNow = () => new Date('2026-09-28T23:20:00.000Z');
let sequence = 0;
const idFactory = (prefix) => `${prefix}-${++sequence}`;

function reality(id, law, uncertainty = 0.05) {
  return createRealityDescriptor({
    id,
    label: id,
    provenanceClass: 'synthetic-test',
    stateDimensions: { x: 'bounded', t: 'forward' },
    invariants: { travellerContinuity: 'preserve' },
    governingRules: { localLaw: law },
    measurableConstants: { c: 1 },
    causalConstraints: { retrocausality: false },
    uncertainty,
  });
}

function trajectory() {
  return createTrajectory({
    id: 'trajectory-mythience-1',
    origin: 'observer:synthetic-a',
    hypothesis: 'A lawful transition may connect two synthetic realities.',
    state: 'sleeping',
    activationThreshold: 0.5,
    damping: 0.9,
    signal: { amplitude: 0.1, persistence: 0, coherence: 0.9, uncertainty: 0.05 },
  }, { now: fixedNow });
}

test('RealityDescriptor comparison preserves invariant conflicts separately from ordinary differences', () => {
  const origin = reality('reality-a', 'rule-a');
  const target = createRealityDescriptor({
    ...reality('reality-b', 'rule-b'),
    id: 'reality-b',
    label: 'reality-b',
    invariants: { travellerContinuity: 'replace' },
  });

  const map = compareRealityDescriptors(origin, target);
  assert.equal(map.transitionCandidate, false);
  assert.equal(map.invariantConflicts.length, 1);
  assert.equal(map.governingRules.differences.length, 1);
});

test('Mythience closes a synthetic reality comparison through bounded execution and receipt feedback', async () => {
  sequence = 0;
  const origin = reality('reality-a', 'rule-a');
  const target = reality('reality-b', 'rule-b');

  const result = await runMythienceRealityCycle({
    trajectory: trajectory(),
    observation: {
      id: 'observation-mythience-1',
      source: 'observer.synthetic',
      relevance: 0.95,
      coherence: 0.92,
      uncertainty: 0.04,
      evidenceClass: 'synthetic-test',
      evidenceRefs: ['fixture:reality-a', 'fixture:reality-b'],
    },
    originReality: origin,
    targetReality: target,
    cognition: async ({ trajectory: current, correspondence }) => {
      assert.equal(current.state, 'active');
      assert.equal(correspondence.transitionCandidate, true);
      assert.equal(correspondence.governingRules.differences.length, 1);
      return {
        capability: 'sandbox.reality-transition.simulate',
        scope: `${correspondence.originId}->${correspondence.targetId}`,
        requestedAuthority: 'sandbox-only',
        reason: 'Test a synthetic correspondence trajectory.',
        completeOnAppliedReceipt: true,
      };
    },
    negotiate: async (request) => evaluateCapabilityRequest(request, {
      allowedCapabilities: ['sandbox.reality-transition.simulate'],
      authorityGrants: ['sandbox-only'],
      route: 'project-zero.sandbox',
    }, { now: fixedNow }),
    execute: async ({ request, correspondence }) => createExecutionReceipt({
      id: 'receipt-mythience-1',
      requestId: request.id,
      status: 'applied',
      evidenceRefs: [`correspondence:${correspondence.id}`, 'sandbox:simulation:1'],
      changes: [],
      executor: 'project-zero.sandbox',
      result: { simulated: true, externalEffects: false },
    }, { now: fixedNow }),
    idFactory,
    now: fixedNow,
  });

  assert.equal(result.status, 'closed-loop');
  assert.equal(result.sensingEvent.sourcePlane, 'sensing');
  assert.equal(result.realityEvent.sourcePlane, 'reality');
  assert.equal(result.ignition.request.requestedAuthority, 'sandbox-only');
  assert.equal(result.ignition.receiptValidation.valid, true);
  assert.equal(result.executionEvent.sourcePlane, 'execution');
  assert.equal(result.executionEvent.evidenceClass, 'evidence-backed-finding');
  assert.equal(result.ignition.feedbackObservation.type, 'execution-receipt');
});

test('Mythience refuses automatic transition when traveller invariants conflict', async () => {
  let executed = false;
  const origin = reality('reality-a', 'rule-a');
  const target = createRealityDescriptor({
    id: 'reality-b',
    label: 'reality-b',
    provenanceClass: 'synthetic-test',
    stateDimensions: { x: 'bounded', t: 'forward' },
    invariants: { travellerContinuity: 'replace' },
    governingRules: { localLaw: 'rule-b' },
    measurableConstants: { c: 1 },
    causalConstraints: { retrocausality: false },
    uncertainty: 0.05,
  });

  const result = await runMythienceRealityCycle({
    trajectory: trajectory(),
    observation: { id: 'observation-mythience-2', relevance: 0.95, coherence: 0.9, uncertainty: 0.05 },
    originReality: origin,
    targetReality: target,
    cognition: async () => ({ capability: 'sandbox.reality-transition.simulate', requestedAuthority: 'sandbox-only' }),
    negotiate: async () => ({ granted: true }),
    execute: async () => {
      executed = true;
      throw new Error('must-not-execute');
    },
    idFactory,
    now: fixedNow,
  });

  assert.equal(result.status, 'held');
  assert.equal(result.correspondence.transitionCandidate, false);
  assert.equal(result.correspondence.invariantConflicts.length, 1);
  assert.equal(executed, false);
});
