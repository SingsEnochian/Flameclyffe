import {
  createCapabilityRequest,
  validateExecutionReceipt,
} from './capability-negotiation.js';
import {
  exciteTrajectory,
  integrateTrajectoryEvidence,
  markTrajectoryWaiting,
  resolveTrajectory,
  trajectoryActivationScore,
} from './trajectory-state.js';

export const IGNITION_CYCLE_SCHEMA = 'arcsweep.ignition-cycle/v0.1';

function defaultIdFactory(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function defaultPossibility(trajectory, observation) {
  const score = trajectoryActivationScore(trajectory);
  return Object.freeze({
    schema: 'arcsweep.possibility-field/v0.1',
    pressure: score,
    relevance: Number(observation.relevance || 0),
    contradiction: observation.contradicted === true ? 1 : 0,
    activate: score >= trajectory.activationThreshold,
  });
}

export async function runIgnitionCycle({
  trajectory,
  observation,
  possibilityEvaluator = defaultPossibility,
  cognition,
  negotiate,
  execute,
  idFactory = defaultIdFactory,
  now = () => new Date(),
} = {}) {
  if (!trajectory) throw new Error('ignition-trajectory-required');
  if (!observation?.id) throw new Error('ignition-observation-required');
  if (typeof cognition !== 'function') throw new Error('ignition-cognition-required');
  if (typeof negotiate !== 'function') throw new Error('ignition-negotiate-required');
  if (typeof execute !== 'function') throw new Error('ignition-execute-required');

  const excited = exciteTrajectory(trajectory, {
    sourceRef: observation.id,
    amount: observation.relevance ?? 0,
  }, { now });

  const evidenced = integrateTrajectoryEvidence(excited, {
    evidenceRef: observation.id,
    relevance: 0,
    coherence: observation.coherence,
    uncertainty: observation.uncertainty,
    contradicted: observation.contradicted === true,
  }, { now });

  const possibility = await possibilityEvaluator(evidenced, observation);
  if (!possibility?.activate || evidenced.state === 'contradicted') {
    return Object.freeze({
      schema: IGNITION_CYCLE_SCHEMA,
      status: evidenced.state === 'contradicted' ? 'contradicted' : 'held',
      trajectory: evidenced,
      possibility,
      intention: null,
      request: null,
      decision: null,
      receipt: null,
      feedbackObservation: null,
    });
  }

  const intention = await cognition({ trajectory: evidenced, observation, possibility });
  if (!intention?.capability) {
    return Object.freeze({
      schema: IGNITION_CYCLE_SCHEMA,
      status: 'active-no-action',
      trajectory: evidenced,
      possibility,
      intention: intention || null,
      request: null,
      decision: null,
      receipt: null,
      feedbackObservation: null,
    });
  }

  const request = createCapabilityRequest({
    id: idFactory('capability'),
    trajectoryId: evidenced.id,
    capability: intention.capability,
    scope: intention.scope ?? null,
    constraints: intention.constraints ?? {},
    requestedAuthority: intention.requestedAuthority || 'read-only',
    reason: intention.reason || '',
  }, { now });

  const decision = await negotiate(request);
  if (!decision?.granted) {
    return Object.freeze({
      schema: IGNITION_CYCLE_SCHEMA,
      status: 'waiting',
      trajectory: markTrajectoryWaiting(evidenced, { now }),
      possibility,
      intention,
      request,
      decision: decision || null,
      receipt: null,
      feedbackObservation: null,
    });
  }

  const receipt = await execute({ request, decision, trajectory: evidenced, observation });
  const validation = validateExecutionReceipt(receipt, request);
  if (!validation.valid) {
    return Object.freeze({
      schema: IGNITION_CYCLE_SCHEMA,
      status: 'unverified-execution',
      trajectory: markTrajectoryWaiting(evidenced, { now }),
      possibility,
      intention,
      request,
      decision,
      receipt: receipt || null,
      receiptValidation: validation,
      feedbackObservation: null,
    });
  }

  const feedbackObservation = Object.freeze({
    id: `receipt:${receipt.id}`,
    type: 'execution-receipt',
    source: 'hearthweave',
    requestId: request.id,
    receiptId: receipt.id,
    status: receipt.status,
    evidenceRefs: receipt.evidenceRefs,
    occurredAt: receipt.observedAt,
  });

  let updated = integrateTrajectoryEvidence(evidenced, {
    evidenceRef: feedbackObservation.id,
    relevance: receipt.status === 'applied' ? 0.25 : 0.05,
    coherence: receipt.status === 'applied' ? Math.max(evidenced.signal.coherence, 0.75) : evidenced.signal.coherence,
    uncertainty: receipt.status === 'applied' ? Math.min(evidenced.signal.uncertainty, 0.25) : evidenced.signal.uncertainty,
  }, { now });

  if (receipt.status === 'applied' && intention.completeOnAppliedReceipt === true) {
    updated = resolveTrajectory(updated, { evidenceRef: feedbackObservation.id }, { now });
  } else if (receipt.status === 'failed' || receipt.status === 'denied') {
    updated = markTrajectoryWaiting(updated, { now });
  }

  return Object.freeze({
    schema: IGNITION_CYCLE_SCHEMA,
    status: receipt.status === 'applied' ? 'closed-loop' : 'observed-result',
    trajectory: updated,
    possibility,
    intention,
    request,
    decision,
    receipt,
    receiptValidation: validation,
    feedbackObservation,
  });
}
