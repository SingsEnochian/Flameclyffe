import { createExecutionReceipt, evaluateCapabilityRequest } from './capability-negotiation.js';
import { runPremaqcObserverIgnition } from './premaqc-observer-ignition.js';
import { createTrajectory } from './trajectory-state.js';

export const IGNITION_SANDBOX_SCENARIOS = Object.freeze(['success', 'denied', 'unverified']);

function component(value) {
  return { value, derivative: 0, uncertainty: 0.05, confidence: 0.9, contributors: [], uncertain: false };
}

export async function runIgnitionSandbox(scenario, { now = () => new Date(), idFactory = (prefix) => `${prefix}-${crypto.randomUUID()}` } = {}) {
  if (!IGNITION_SANDBOX_SCENARIOS.includes(scenario)) throw new Error('unknown-ignition-sandbox-scenario');
  const trajectory = createTrajectory({
    id: 'sandbox:trajectory-1', origin: 'sandbox:fixture', state: 'sleeping',
    hypothesis: 'A labelled observation invites a read-only inspection.',
    activationThreshold: 0.55, damping: 0.9,
    signal: { amplitude: 0.2, persistence: 0.1, coherence: 0.6, uncertainty: 0.2 },
  }, { now });
  const observerPayload = {
    schema: 'hearthgate.deep-current/v1', id: 'sandbox:observer-1',
    generated_at: now().toISOString(),
    field: { R: 0.92, C: 0.9 },
    raw_field: { source: 'synthetic-sandbox-fixture' },
    transformation_receipts: [], contradictions: [],
    provenance: { source: 'ArcSweep labelled sandbox fixture', synthetic: true },
  };
  const premaqc = {
    schema_version: '2.0.0', id: 'sandbox:premaqc-1', sequence: 1,
    state: Object.fromEntries(Object.entries({ P: .8, C: .9, R: .85, E: .7, M: .8, A: .75, Q: .25 })
      .map(([key, value]) => [key, component(value)])),
    authority: { qualia_is_firsthand_only: true, qualia_magnitude_inference_allowed: false },
  };
  let executionCount = 0;
  const result = await runPremaqcObserverIgnition({
    trajectory, observerPayload, observerOptions: { relevance: .95, uncertainty: .08 }, premaqc,
    cognition: async () => ({
      capability: scenario === 'denied' ? 'repository.write' : 'repository.inspect',
      requestedAuthority: scenario === 'denied' ? 'write' : 'read-only',
      reason: 'Synthetic sandbox cycle', completeOnAppliedReceipt: true,
    }),
    negotiate: async (request) => evaluateCapabilityRequest(request, {
      allowedCapabilities: ['repository.inspect'], authorityGrants: ['read-only'], route: 'sandbox.fixture',
    }, { now }),
    execute: async ({ request }) => {
      executionCount++;
      if (scenario === 'unverified') return { status: 'applied', evidenceRefs: ['unverified-claim'] };
      return createExecutionReceipt({
        id: idFactory('receipt'), requestId: request.id, status: 'applied',
        evidenceRefs: ['sandbox:synthetic-evidence-1'], changes: [], executor: 'sandbox.fixture',
        result: { synthetic: true, inspected: true },
      }, { now });
    },
    now, idFactory,
  });
  return { scenario, synthetic: true, executionCount, ...result };
}
