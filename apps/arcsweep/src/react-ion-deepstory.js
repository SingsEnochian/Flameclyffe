import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const REACTION_DEEPSTORY_SCHEMA = 'deepstory.reaction-event/v1';
export const REACTION_DEEPSTORY_EVENT_TYPES = Object.freeze([
  'reaction.ask.receipted',
  'reaction.route.compiled',
  'reaction.route.vetoed',
  'reaction.response.recorded',
  'reaction.replay.matched',
  'reaction.replay.drifted',
  'reaction.loop.closed',
  'reaction.loop.holonomy',
]);

function invariant(condition, message) {
  if (!condition) throw new Error(`REACT_ION_DEEPSTORY: ${message}`);
}

function text(value, field) {
  const normalised = String(value ?? '').trim();
  invariant(normalised, `${field} is required`);
  return normalised;
}

function uniqueStrings(values = []) {
  return [...new Set((values || []).map(String).map((value) => value.trim()).filter(Boolean))];
}

export async function createReactionDeepStoryEvent({
  helmReceipt,
  eventType = null,
  narrativeContext = null,
  interpretation = null,
  recordedAt = new Date().toISOString(),
} = {}) {
  invariant(helmReceipt?.schema === 'reaction.helm-receipt/v1', 'a React-ion Helm receipt is required');
  invariant(!Number.isNaN(Date.parse(recordedAt)), 'recordedAt must be an ISO-compatible timestamp');
  const resolvedType = eventType || (helmReceipt.route ? 'reaction.route.compiled' : 'reaction.route.vetoed');
  invariant(REACTION_DEEPSTORY_EVENT_TYPES.includes(resolvedType), `eventType must be one of ${REACTION_DEEPSTORY_EVENT_TYPES.join(', ')}`);

  const sourceFingerprints = uniqueStrings([
    helmReceipt.ask?.fingerprint,
    helmReceipt.navigation?.fingerprint,
    helmReceipt.route?.fingerprint,
    helmReceipt.transport?.fingerprint,
    helmReceipt.graph_snapshot?.fingerprint,
    helmReceipt.deep_time?.fingerprint,
  ]);
  const sourceReceiptIds = uniqueStrings([
    helmReceipt.ask?.packet_id,
    helmReceipt.navigation?.request_id,
    helmReceipt.route?.route_id,
    helmReceipt.transport?.traceroute_id,
    helmReceipt.graph_snapshot?.snapshot_id,
    helmReceipt.deep_time?.receipt_id,
  ]);
  const core = {
    dataset: 'DEEPStory',
    schema: REACTION_DEEPSTORY_SCHEMA,
    schema_version: 1,
    recorded_at: new Date(recordedAt).toISOString(),
    event_type: resolvedType,
    world_id: text(helmReceipt.world_id, 'helmReceipt.world_id'),
    event: Object.freeze({
      source_name: helmReceipt.source?.name || null,
      source_address: helmReceipt.source?.address || null,
      target_name: helmReceipt.target?.name || null,
      target_address: helmReceipt.target?.address || null,
      ask: helmReceipt.ask?.intention || null,
      transformation: helmReceipt.ask?.transformation || null,
      route_id: helmReceipt.route?.route_id || null,
      route_error: helmReceipt.route_error || null,
      transport_code: helmReceipt.transport?.final_code || null,
      projection_state: helmReceipt.projection_state?.state || null,
    }),
    narrative_context: String(narrativeContext ?? '').trim() || null,
    declared_interpretation: String(interpretation ?? '').trim() || null,
    provenance: Object.freeze({
      source_receipt_ids: Object.freeze(sourceReceiptIds),
      source_fingerprints: Object.freeze(sourceFingerprints),
      deeptime_receipt_id: helmReceipt.deep_time?.receipt_id || null,
    }),
    authority: Object.freeze({
      records_software_event: true,
      route_compilation_is_not_external_world_success: true,
      narrative_context_does_not_rewrite_source_receipts: true,
      interpretation_is_declared_not_observed_fact: true,
      canon_commit: false,
    }),
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    event_id: `deepstory-reaction-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}

export async function createResponseDeepStoryEvent({
  helmReceipt,
  exchange,
  narrativeContext = null,
  recordedAt = new Date().toISOString(),
} = {}) {
  invariant(exchange?.schema === 'reaction.protocol-exchange/v1', 'a protocol exchange is required');
  const base = await createReactionDeepStoryEvent({
    helmReceipt,
    eventType: 'reaction.response.recorded',
    narrativeContext,
    recordedAt,
  });
  const core = {
    ...base,
    event: Object.freeze({
      ...base.event,
      response_id: exchange.response?.response_id || null,
      semantic_code: exchange.response?.code || null,
      responder: exchange.response?.responder || null,
      response_message: exchange.response?.message || null,
      return_transport_code: exchange.return_receipt?.transport_code || null,
      return_delivered: Boolean(exchange.return_receipt?.delivered),
    }),
    authority: Object.freeze({
      ...base.authority,
      semantic_response_was_explicitly_recorded: true,
      engine_generated_response: false,
    }),
  };
  const fingerprint = await sha256Hex({ ...core, fingerprint: undefined, event_id: undefined });
  return Object.freeze({
    ...core,
    event_id: `deepstory-reaction-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}
