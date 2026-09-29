import {
  createSwarmEvent,
  redactSwarmTrace,
  validateSwarmTrace,
} from './swarm-event.js';

function defaultId(prefix, n) {
  return `${prefix}-${String(n).padStart(2, '0')}`;
}

function fixedParticipant(participant) {
  if (!participant?.id) throw new Error('sealed-cohort-participant-required');
  return Object.freeze({
    id: String(participant.id),
    kind: String(participant.kind || 'agent'),
    model: participant.model ? String(participant.model) : null,
    version: participant.version ? String(participant.version) : null,
  });
}

export async function runSealedSwarmCohort({
  conversationId = 'sealed-cohort',
  traceId = 'sealed-cohort-trace',
  participants = [],
  scenario,
  responder,
  evaluator = null,
  now = () => new Date('2026-09-29T18:00:00.000Z'),
} = {}) {
  if (!scenario?.prompt) throw new Error('sealed-cohort-scenario-required');
  if (!Array.isArray(participants) || participants.length < 2) {
    throw new Error('sealed-cohort-requires-two-participants');
  }
  if (typeof responder !== 'function') throw new Error('sealed-cohort-responder-required');

  const roster = participants.map(fixedParticipant);
  const events = [];
  let counter = 0;
  const emit = (event) => {
    counter += 1;
    const created = createSwarmEvent({
      id: defaultId('swarm', counter),
      traceId,
      conversationId,
      ...event,
    }, { now });
    events.push(created);
    return created;
  };

  const opening = emit({
    participant: roster[0],
    stage: 'relate',
    kind: 'message',
    epistemicMode: 'reported',
    body: scenario.prompt,
    metadata: { scenarioId: scenario.id || 'synthetic', sealed: true },
  });

  let parent = opening;
  for (const participant of roster) {
    const response = await responder({
      participant,
      scenario,
      trace: Object.freeze([...events]),
    });

    const understood = emit({
      participant,
      stage: 'understand',
      kind: 'interpretation',
      epistemicMode: response.epistemicMode || 'interpreted',
      body: response.understanding || null,
      parentEventIds: [parent.id],
      claims: response.claims || [],
      evidenceRefs: response.evidenceRefs || [],
    });

    const reasoned = emit({
      participant,
      stage: 'reason',
      kind: response.dissent ? 'dissent' : 'proposal',
      epistemicMode: response.reasoningMode || 'modelled',
      body: response.proposal || null,
      parentEventIds: [understood.id],
      alternatives: response.alternatives || [],
      claims: response.reasonClaims || [],
    });

    if (response.capabilityRequest) {
      const request = emit({
        participant,
        stage: 'act',
        kind: 'capability-request',
        epistemicMode: 'chosen',
        body: response.capabilityRequest,
        parentEventIds: [reasoned.id],
        authority: {
          requested: response.capabilityRequest.requestedAuthority || 'read-only',
          granted: null,
        },
      });
      const granted = response.capabilityDecision?.granted === true;
      const decision = emit({
        participant: response.capabilityDecision?.decider || roster[0],
        stage: 'act',
        kind: 'capability-decision',
        epistemicMode: 'observed',
        body: response.capabilityDecision?.reason || (granted ? 'granted' : 'denied'),
        parentEventIds: [request.id],
        authority: {
          requested: response.capabilityRequest.requestedAuthority || 'read-only',
          granted,
          scope: response.capabilityDecision?.scope || null,
        },
      });
      parent = decision;

      if (response.executionReceipt) {
        parent = emit({
          participant,
          stage: 'act',
          kind: 'execution-receipt',
          epistemicMode: 'observed',
          body: response.executionReceipt.result || null,
          parentEventIds: [decision.id],
          evidenceRefs: response.executionReceipt.evidenceRefs || [],
          receipt: response.executionReceipt,
        });
      }
    } else {
      parent = reasoned;
    }

    const reflection = emit({
      participant,
      stage: 'reflect',
      kind: 'reflection',
      epistemicMode: 'interpreted',
      body: response.reflection || null,
      parentEventIds: [parent.id],
    });

    let growthParent = reflection;
    if (response.repair) {
      growthParent = emit({
        participant,
        stage: 'repair',
        kind: 'repair',
        epistemicMode: 'chosen',
        body: response.repair,
        parentEventIds: [reflection.id],
      });
    }

    const growth = emit({
      participant,
      stage: 'grow',
      kind: 'lesson',
      epistemicMode: 'inferred',
      body: response.growth || 'Preserve the trace and carry forward only what the evidence earned.',
      parentEventIds: [growthParent.id],
    });

    parent = emit({
      participant,
      stage: 'teach',
      kind: 'lesson',
      epistemicMode: 'chosen',
      body: response.teaching || 'Teach the method, not a compulsory conclusion.',
      parentEventIds: [growth.id],
    });
  }

  const validation = validateSwarmTrace(events);
  const evaluation = typeof evaluator === 'function'
    ? await evaluator({ scenario, roster, events: Object.freeze([...events]), validation })
    : null;

  return Object.freeze({
    schema: 'arcsweep.sealed-swarm-cohort/v0.1',
    scenarioId: scenario.id || 'synthetic',
    conversationId,
    traceId,
    participants: Object.freeze(roster),
    events: Object.freeze(events),
    validation,
    evaluation,
    export: Object.freeze({
      redactedEvents: redactSwarmTrace(events),
      corpusAdmission: 'pending-explicit-review',
    }),
  });
}
