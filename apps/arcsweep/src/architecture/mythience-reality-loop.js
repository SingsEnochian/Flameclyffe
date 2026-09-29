import { runIgnitionCycle } from './ignition-loop.js';
import { createMythienceEvent } from './mythience-event-contract.js';
import { compareRealityDescriptors } from './reality-correspondence.js';

export const MYTHIENCE_CYCLE_SCHEMA = 'arcsweep.mythience-cycle/v0.1';

export async function runMythienceRealityCycle({
  trajectory,
  observation,
  originReality,
  targetReality,
  cognition,
  negotiate,
  execute,
  possibilityEvaluator,
  idFactory,
  now = () => new Date(),
} = {}) {
  if (!originReality) throw new Error('mythience-origin-reality-required');
  if (!targetReality) throw new Error('mythience-target-reality-required');
  if (typeof cognition !== 'function') throw new Error('mythience-cognition-required');

  const correspondence = compareRealityDescriptors(originReality, targetReality);

  const sensingEvent = createMythienceEvent({
    id: `mythience:${observation?.id || 'unknown'}:sensing`,
    type: 'observation-received',
    sourcePlane: 'sensing',
    sourceRuntime: observation?.source || 'observer',
    subject: observation?.id || 'unknown-observation',
    occurredAt: observation?.occurredAt || now().toISOString(),
    evidenceRefs: observation?.evidenceRefs || [],
    provenance: observation?.provenance || {},
    uncertainty: observation?.uncertainty ?? 1,
    evidenceClass: observation?.evidenceClass || 'synthetic-test',
    payload: { originRealityId: originReality.id, targetRealityId: targetReality.id },
  });

  let evaluatedPossibility = null;
  const wrappedPossibility = async (currentTrajectory, currentObservation) => {
    evaluatedPossibility = possibilityEvaluator
      ? await possibilityEvaluator(currentTrajectory, currentObservation, correspondence)
      : Object.freeze({
          schema: 'arcsweep.mythience-possibility/v0.1',
          pressure: Math.max(0, 1 - correspondence.correspondence),
          relevance: Number(currentObservation.relevance || 0),
          contradiction: currentObservation.contradicted === true ? 1 : 0,
          activate: currentTrajectory.state === 'active' && correspondence.transitionCandidate,
        });
    return evaluatedPossibility;
  };

  const ignition = await runIgnitionCycle({
    trajectory,
    observation,
    possibilityEvaluator: wrappedPossibility,
    cognition: async (context) => cognition({ ...context, correspondence, sensingEvent }),
    negotiate,
    execute: async (context) => execute({ ...context, correspondence, sensingEvent }),
    idFactory,
    now,
  });

  const realityEvent = createMythienceEvent({
    id: `mythience:${observation.id}:reality`,
    type: 'reality-correspondence-evaluated',
    sourcePlane: 'reality',
    sourceRuntime: 'universal-codex',
    subject: correspondence.id,
    occurredAt: now().toISOString(),
    evidenceRefs: [sensingEvent.id],
    provenance: correspondence.provenance,
    uncertainty: correspondence.uncertainty,
    evidenceClass: observation?.evidenceClass || 'synthetic-test',
    payload: {
      correspondence: correspondence.correspondence,
      transitionCandidate: correspondence.transitionCandidate,
      invariantConflicts: correspondence.invariantConflicts,
    },
  });

  const executionEvent = ignition.receipt ? createMythienceEvent({
    id: `mythience:${ignition.receipt.id}:execution`,
    type: 'execution-observed',
    sourcePlane: 'execution',
    sourceRuntime: ignition.receipt.executor || 'hearthweave',
    subject: ignition.receipt.id,
    occurredAt: ignition.receipt.observedAt || now().toISOString(),
    stateAfter: ignition.receipt.status,
    evidenceRefs: ignition.receipt.evidenceRefs || [],
    provenance: { requestId: ignition.request?.id || null },
    uncertainty: ignition.receiptValidation?.valid ? 0 : 1,
    authorityUsed: ignition.request?.requestedAuthority || 'none',
    receiptParent: ignition.request?.id || null,
    evidenceClass: 'evidence-backed-finding',
    payload: { status: ignition.receipt.status },
  }) : null;

  return Object.freeze({
    schema: MYTHIENCE_CYCLE_SCHEMA,
    status: ignition.status,
    sensingEvent,
    possibility: evaluatedPossibility,
    correspondence,
    realityEvent,
    ignition,
    executionEvent,
  });
}
