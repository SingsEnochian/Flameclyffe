import { createAspectEnvelope } from '../aspects/aspect-message-bus.js';

export const CODEX_IGNITION_OBSERVER_SCHEMA = 'arcsweep.codex-ignition-observer/v0.1';

export function createCodexIgnitionObserver({
  codex,
  aspectId = 'witness',
  invocationId = 'ignition-loop',
  exploratoryIntention = true,
} = {}) {
  if (!codex?.ingestEnvelope) throw new Error('Codex living state is required.');

  return async function observeIgnition(event) {
    const phase = event?.phase;
    if (!phase) return null;

    const envelope = createAspectEnvelope({
      traceId: event.trajectory?.id || event.observation?.id,
      sender: { aspectId, invocationId },
      recipients: [],
      kind: phase === 'capability-decision' ? 'verification' : phase === 'execution-result' ? 'result' : 'thought',
      body: {
        phase,
        intention: event.intention || null,
        requestId: event.request?.id || null,
        decision: event.decision || null,
        receiptId: event.receipt?.id || null,
        observationId: event.observation?.id || null,
      },
      evidenceRefs: [event.receipt?.id, ...(event.receipt?.evidenceRefs || [])].filter(Boolean),
      stateRefs: [event.trajectory?.id].filter(Boolean),
    });

    return codex.ingestEnvelope(envelope, {
      exploratory: phase === 'intention' && exploratoryIntention,
    });
  };
}
