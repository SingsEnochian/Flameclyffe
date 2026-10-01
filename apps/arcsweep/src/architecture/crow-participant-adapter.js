export const CROW_PARTICIPANT_SCHEMA = 'arcsweep.crow-participant/v0.1';

export function createCrowParticipant({
  id = 'the-crow',
  model = 'local-crow',
  version = 'unversioned',
  endpoint = 'http://127.0.0.1:8081/v1',
  transport = null,
} = {}) {
  const participant = Object.freeze({
    id: String(id),
    kind: 'agent',
    model: String(model),
    version: String(version),
    local: true,
    endpoint: String(endpoint),
  });

  async function respond({ scenario, trace = [] } = {}) {
    if (!scenario?.prompt) throw new Error('crow-scenario-required');

    if (typeof transport !== 'function') {
      return Object.freeze({
        schema: CROW_PARTICIPANT_SCHEMA,
        participant,
        status: 'offline-unavailable',
        epistemicMode: 'unknown',
        understanding: 'The Crow local transport is not currently attached.',
        proposal: null,
        alternatives: [],
        reflection: 'Do not fabricate a local-model result when the local runtime is unavailable.',
        repair: null,
        growth: 'Runtime absence is evidence about availability, not evidence about capability.',
        teaching: 'Preserve the offline route contract and retry only when the local runtime is actually reachable.',
      });
    }

    const response = await transport({
      endpoint,
      participant,
      scenario,
      trace,
    });

    if (!response || typeof response !== 'object') {
      throw new Error('crow-transport-response-invalid');
    }

    return Object.freeze({
      schema: CROW_PARTICIPANT_SCHEMA,
      participant,
      status: 'ok',
      epistemicMode: response.epistemicMode || 'interpreted',
      understanding: response.understanding || null,
      claims: response.claims || [],
      evidenceRefs: response.evidenceRefs || [],
      proposal: response.proposal || null,
      reasoningMode: response.reasoningMode || 'modelled',
      reasonClaims: response.reasonClaims || [],
      alternatives: response.alternatives || [],
      dissent: response.dissent === true,
      capabilityRequest: response.capabilityRequest || null,
      capabilityDecision: response.capabilityDecision || null,
      executionReceipt: response.executionReceipt || null,
      reflection: response.reflection || null,
      repair: response.repair || null,
      growth: response.growth || null,
      teaching: response.teaching || null,
    });
  }

  return Object.freeze({
    schema: CROW_PARTICIPANT_SCHEMA,
    participant,
    respond,
  });
}
