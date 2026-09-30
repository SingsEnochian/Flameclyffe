import { createPresence, rebindPresenceProvider, createPresenceLineageReceipt } from '../presence-fabric.js';
import {
  createCognitiveProviderDescriptor,
  createCognitiveEvent,
  assertCognitiveProvider,
  evaluateProviderCapability,
} from './cognitive-provider.js';
import {
  createSensoryAdapterDescriptor,
  createOutputAdapterDescriptor,
} from './sensory-output-contracts.js';
import { createExecutionReceipt } from './capability-negotiation.js';

export const ASTRA_SLICE_RECEIPT_SCHEMA = 'arcsweep.astra-slice-receipt/v1';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

/**
 * Execute one end-to-end vertical slice through the Astra 6.1 contract stack:
 *
 *   Presence → capability gate → provider invoke → execution receipt → lineage receipt
 *
 * The provider must satisfy the CognitiveProvider runtime contract. It is not wired to
 * any live API here — callers supply their own implementation.
 *
 * Returns a frozen AstraSliceReceipt regardless of grant/deny outcome.
 * No credentials, sessions, or authority are embedded in the receipt.
 */
export async function runAstraVerticalSlice({
  voiceId,
  sessionId,
  worldId = null,
  surface = 'web',
  participationMode = 'active',
  capability = 'text-generation',
  requestedAuthority = 'read-only',
  authorityGrants = [],
  inputModality = 'text',
  outputChannel = 'text',
  trajectoryId,
  provider,
  requestText = '',
  occurredAt,
} = {}) {
  const resolvedAt = occurredAt ?? new Date().toISOString();

  // 1. Presence — establishes identity/surface/session anchor
  const presence = createPresence({
    identityId: voiceId,
    sessionId,
    surface,
    participationMode,
    continuityRef: worldId ?? null,
    createdAt: resolvedAt,
  });

  // 2. Validate provider runtime shape
  assertCognitiveProvider(provider);

  // 3. Provider descriptor — pure capability declaration, no credentials
  const providerDescriptor = createCognitiveProviderDescriptor({
    id: provider.id,
    capabilities: provider.capabilities,
  });

  // 4. Sensory / output adapter descriptors for this surface
  const sensoryDescriptor = createSensoryAdapterDescriptor({
    id: `sensory:${surface}:${sessionId}`,
    modalities: [inputModality],
    surfaceHint: surface,
  });
  const outputDescriptor = createOutputAdapterDescriptor({
    id: `output:${surface}:${sessionId}`,
    channels: [outputChannel],
    surfaceHint: surface,
  });

  // 5. Capability gate — provider is subordinate to ArcSweep
  const capabilityDecision = evaluateProviderCapability(providerDescriptor, capability, {
    trajectoryId,
    requestedAuthority,
    authorityGrants,
  });

  if (!capabilityDecision.granted) {
    const deniedPresenceReceipt = createPresenceLineageReceipt({
      action: 'torn-down',
      before: presence,
      reason: `capability-denied:${capabilityDecision.reason}`,
      occurredAt: resolvedAt,
    });
    return deepFreeze({
      schema: ASTRA_SLICE_RECEIPT_SCHEMA,
      version: 1,
      granted: false,
      capability_decision: capabilityDecision,
      presence_receipt: deniedPresenceReceipt,
      provider_descriptor: providerDescriptor,
      sensory_descriptor: sensoryDescriptor,
      output_descriptor: outputDescriptor,
      events: Object.freeze([]),
      execution_receipt: null,
      occurred_at: resolvedAt,
    });
  }

  // 6. Invoke — collect cognitive event stream
  const events = [];
  let invokeError = null;
  try {
    for await (const event of provider.invoke({ requestText, trajectoryId, presence })) {
      events.push(event);
    }
  } catch (error) {
    invokeError = error?.message || String(error);
    events.push(createCognitiveEvent({
      kind: 'error',
      providerId: provider.id,
      requestId: trajectoryId,
      reason: invokeError,
      occurredAt: new Date().toISOString(),
    }));
  }

  // 7. Execution receipt — carried forward from the capability decision
  const hasDoneEvent = events.some((e) => e.kind === 'done');
  const hasError = events.some((e) => e.kind === 'error');
  const executionReceipt = createExecutionReceipt({
    id: `exec:${trajectoryId}:${resolvedAt}`,
    requestId: capabilityDecision.requestId,
    status: hasError ? 'failed' : (hasDoneEvent ? 'applied' : 'no-op'),
    evidenceRefs: [trajectoryId],
    executor: provider.id,
  });

  // 8. Presence lineage receipt — records provider binding without exposing credentials
  const boundPresence = rebindPresenceProvider(presence, {
    providerId: provider.id,
    modelId: providerDescriptor.id,
  });
  const presenceReceipt = createPresenceLineageReceipt({
    action: 'provider-rebound',
    before: presence,
    after: boundPresence,
    reason: `slice:${capability}:${executionReceipt.status}`,
    occurredAt: resolvedAt,
  });

  return deepFreeze({
    schema: ASTRA_SLICE_RECEIPT_SCHEMA,
    version: 1,
    granted: true,
    capability_decision: capabilityDecision,
    presence_receipt: presenceReceipt,
    provider_descriptor: providerDescriptor,
    sensory_descriptor: sensoryDescriptor,
    output_descriptor: outputDescriptor,
    events: Object.freeze(events),
    execution_receipt: executionReceipt,
    occurred_at: resolvedAt,
  });
}
