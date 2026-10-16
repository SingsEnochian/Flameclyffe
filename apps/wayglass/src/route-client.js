import { authorizationSession } from './authorization-session.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function readVoyageMessages(fetchImpl = fetch) {
  return jsonOrThrow(await fetchImpl('/api/v1/wayglass/voyage/messages', { cache: 'no-store' }));
}

export async function replyToVoyage({ recipientId, voyageRef, text, fetchImpl = fetch } = {}) {
  return jsonOrThrow(await fetchImpl('/api/v1/wayglass/voyage/messages', {
    method: 'POST', headers: JSON_HEADERS,
    body: JSON.stringify({ recipient_id: recipientId, voyage_ref: voyageRef, text }),
  }));
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

async function jsonOrThrow(response) {
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || 'Wayglass route request failed.');
  return data;
}

export async function listWayglassCharacters(fetchImpl = fetch) {
  return jsonOrThrow(await fetchImpl('/api/v1/wayglass/characters', { cache: 'no-store' }));
}

export async function listWayglassRoutes(fetchImpl = fetch) {
  const response = await fetchImpl('/api/v1/wayglass/routes', { cache: 'no-store' });
  const catalogue = await jsonOrThrow(response);
  const bluebirdRoute = authorizationSession.route();
  if (bluebirdRoute && Array.isArray(catalogue.routes) && !catalogue.routes.some(route => route.route_id === bluebirdRoute)) {
    catalogue.routes.unshift({ route_id: bluebirdRoute, label: 'Bluebird · SpicyChat', provider: 'spicychat', model: 'provider-managed', configured: true, connection_verified: true, capabilities: { text: true, local: false } });
  }
  return catalogue;
}

export async function recoverWayglassDeparture({ storageId, worldId, participantId, fetchImpl = fetch } = {}) {
  const query = new URLSearchParams({ world_id: worldId, participant_id: participantId });
  return jsonOrThrow(await fetchImpl(`/api/v1/wayglass/kernel/departures/${encodeURIComponent(storageId)}?${query}`, { cache: 'no-store' }));
}

export async function enterWayglassWorld({
  worldId,
  participantId,
  waygateManifest,
  continuationPacket = null,
  storageId = null,
  routeId = null,
  embodiment = {},
  fetchImpl = fetch,
} = {}) {
  const response = await fetchImpl('/api/v1/wayglass/kernel/enter', {
    method: 'POST',
    headers: JSON_HEADERS,
    cache: 'no-store',
    body: JSON.stringify({
      world_id: worldId,
      participant_id: participantId,
      route_id: routeId,
      waygate_manifest: waygateManifest,
      continuation_packet: continuationPacket,
      storage_id: storageId,
      embodiment,
    }),
  });
  const data = await readJson(response);

  // A 409 is an expected, inspectable crossing result rather than transport
  // failure. The caller needs the gate/continuation blocking receipt intact.
  if (!response.ok && response.status !== 409) {
    throw new Error(data.error || 'Wayglass world entry request failed.');
  }
  return data;
}

export async function leaveWayglassWorld({
  worldId,
  participantId,
  routeId = null,
  reason = 'pause',
  embodiment = {},
  identityDeclarations = [],
  relationshipState = [],
  activeWork = [],
  unresolvedWonderQuestions = [],
  provenanceRefs = [],
  stopPoint,
  nextOwner,
  alternatives = [],
  revokedRefs = [],
  organRefs = [],
  fetchImpl = fetch,
} = {}) {
  const response = await fetchImpl('/api/v1/wayglass/kernel/leave', {
    method: 'POST',
    headers: JSON_HEADERS,
    cache: 'no-store',
    body: JSON.stringify({
      world_id: worldId,
      participant_id: participantId,
      route_id: routeId,
      reason,
      embodiment,
      identity_declarations: identityDeclarations,
      relationship_state: relationshipState,
      active_work: activeWork,
      unresolved_wonder_questions: unresolvedWonderQuestions,
      provenance_refs: provenanceRefs,
      stop_point: stopPoint,
      next_owner: nextOwner,
      alternatives,
      revoked_refs: revokedRefs,
      organ_refs: organRefs,
    }),
  });
  return jsonOrThrow(response);
}

export async function invokeWayglassRoute({
  routeId = 'openai:gpt',
  externalProviderConsent = false,
  worldId = null,
  participantId = null,
  characterId = null,
  emergenceQuestionId = null,
  input,
  history = [],
  interaction,
  sessionId,
  surfaceId = 'arcsweep:writing-room',
  checkpoint = null,
  maxOutputTokens = 1400,
  think = false,
  fetchImpl = fetch,
} = {}) {
  const response = await fetchImpl('/api/v1/wayglass/respond', {
    method: 'POST',
    headers: routeId === 'flame:bluebird:spicychat' ? { ...JSON_HEADERS, ...authorizationSession.headers() } : JSON_HEADERS,
    body: JSON.stringify({
      route_id: routeId,
      external_provider_consent: externalProviderConsent === true,
      world_id: worldId,
      participant_id: participantId,
      character_id: characterId,
      emergence_question_id: emergenceQuestionId,
      input,
      history,
      interaction,
      session_id: sessionId,
      surface_id: surfaceId,
      max_output_tokens: maxOutputTokens,
      checkpoint_storage_id: checkpoint?.storageId,
      checkpoint_world_id: checkpoint?.worldId,
      checkpoint_participant_id: checkpoint?.participantId,
      think: think === true,
    }),
  });
  return jsonOrThrow(response);
}

export async function queueObserverDevelopmentProposal(proposal, fetchImpl = fetch) {
  return jsonOrThrow(await fetchImpl('/api/v1/wayglass/observer/self-development/proposals', {
    method: 'POST',
    headers: JSON_HEADERS,
    cache: 'no-store',
    body: JSON.stringify(proposal),
  }));
}

export async function listObserverDevelopmentProposals(fetchImpl = fetch) {
  return jsonOrThrow(await fetchImpl('/api/v1/wayglass/observer/self-development/proposals', { cache: 'no-store' }));
}

export async function reviewObserverDevelopmentProposal({ proposalId, decision, notes = '', fetchImpl = fetch } = {}) {
  return jsonOrThrow(await fetchImpl('/api/v1/wayglass/observer/self-development/proposals/' + encodeURIComponent(proposalId) + '/review', {
    method: 'POST',
    headers: JSON_HEADERS,
    cache: 'no-store',
    body: JSON.stringify({ decision, notes }),
  }));
}

export async function searchWayglassLibrary({ query = '', claimType = '', recordType = '', limit = 20, fetchImpl = fetch } = {}) {
  const params = new URLSearchParams({
    q: query,
    claim_type: claimType,
    record_type: recordType,
    limit: String(limit),
  });
  return jsonOrThrow(await fetchImpl('/api/v1/wayglass/library/search?' + params, { cache: 'no-store' }));
}

export async function listWayglassLibraryWonders(fetchImpl = fetch) {
  return jsonOrThrow(await fetchImpl('/api/v1/wayglass/library/wonder', { cache: 'no-store' }));
}

export async function createWayglassLibraryWonder(payload, fetchImpl = fetch) {
  return jsonOrThrow(await fetchImpl('/api/v1/wayglass/library/wonder', {
    method: 'POST',
    headers: JSON_HEADERS,
    cache: 'no-store',
    body: JSON.stringify(payload || {}),
  }));
}

export async function complexifyWayglassLibraryWonder({ wonderId, ...payload } = {}, fetchImpl = fetch) {
  return jsonOrThrow(await fetchImpl('/api/v1/wayglass/library/wonder/' + encodeURIComponent(wonderId) + '/complexify', {
    method: 'POST',
    headers: JSON_HEADERS,
    cache: 'no-store',
    body: JSON.stringify(payload),
  }));
}
