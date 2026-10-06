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

export async function listWayglassRoutes(fetchImpl = fetch) {
  const response = await fetchImpl('/api/v1/wayglass/routes', { cache: 'no-store' });
  return jsonOrThrow(response);
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
    }),
  });
  return jsonOrThrow(response);
}

export async function invokeWayglassRoute({
  routeId = 'openai:gpt',
  input,
  history = [],
  interaction,
  sessionId,
  surfaceId = 'arcsweep:writing-room',
  maxOutputTokens = 1400,
  think = false,
  fetchImpl = fetch,
} = {}) {
  const response = await fetchImpl('/api/v1/wayglass/respond', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      route_id: routeId,
      input,
      history,
      interaction,
      session_id: sessionId,
      surface_id: surfaceId,
      max_output_tokens: maxOutputTokens,
      think: think === true,
    }),
  });
  return jsonOrThrow(response);
}
