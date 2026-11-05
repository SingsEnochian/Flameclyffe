const JSON_HEADERS = { 'Content-Type': 'application/json' };

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

export async function enterWayglassWorld({
  worldId,
  participantId,
  waygateManifest,
  continuationPacket = null,
  stopReceipt = null,
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
      stop_receipt: stopReceipt,
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
  thoughtVibrationReceipts = [],
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
      thought_vibration_receipts: thoughtVibrationReceipts,
    }),
  });
  return jsonOrThrow(response);
}

export async function invokeWayglassRoute({
  routeId = 'local:ollama',
  harnessId = 'wayglass:writing-room/direct-v0.1',
  input,
  history = [],
  interaction,
  sessionId,
  surfaceId = 'arcsweep:writing-room',
  worldId = 'wayglass:home',
  participantId = null,
  waygateManifest = null,
  continuationPacket = null,
  stopReceipt = null,
  embodiment = {},
  maxOutputTokens = 1400,
  fetchImpl = fetch,
} = {}) {
  const response = await fetchImpl('/api/v1/wayglass/respond', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      route_id: routeId,
      world_id: worldId,
      participant_id: participantId,
      waygate_manifest: waygateManifest,
      continuation_packet: continuationPacket,
      stop_receipt: stopReceipt,
      embodiment,
      harness_id: harnessId,
      input,
      history,
      interaction,
      session_id: sessionId,
      surface_id: surfaceId,
      max_output_tokens: maxOutputTokens,
    }),
  });
  return jsonOrThrow(response);
}


export async function getThoughtVibrationOperator(fetchImpl = fetch) {
  const response = await fetchImpl('/api/v1/wayglass/thought-vibration', {
    cache: 'no-store',
  });
  return jsonOrThrow(response);
}

export async function inspectThoughtVibrationReceipt(receipt, fetchImpl = fetch) {
  const response = await fetchImpl('/api/v1/wayglass/thought-vibration/receipt/inspect', {
    method: 'POST',
    headers: JSON_HEADERS,
    cache: 'no-store',
    body: JSON.stringify({ receipt }),
  });
  const data = await readJson(response);
  if (!response.ok && response.status !== 409) {
    throw new Error(data.error || 'Thought Vibration receipt inspection failed.');
  }
  return data;
}

export async function renderThoughtVibrationSession({
  session,
  includeWave = true,
  signal = undefined,
  fetchImpl = fetch,
} = {}) {
  const response = await fetchImpl('/api/v1/wayglass/thought-vibration/render', {
    method: 'POST',
    headers: JSON_HEADERS,
    cache: 'no-store',
    signal,
    body: JSON.stringify({
      session,
      include_wave: includeWave,
    }),
  });
  return jsonOrThrow(response);
}

export async function simulateThoughtVibrationQuantum({
  operation,
  args = {},
  fetchImpl = fetch,
} = {}) {
  const response = await fetchImpl('/api/v1/wayglass/thought-vibration/quantum', {
    method: 'POST',
    headers: JSON_HEADERS,
    cache: 'no-store',
    body: JSON.stringify({ operation, args }),
  });
  return jsonOrThrow(response);
}

/**
 * Read-only kernel contract probe. It does not establish a Waygate session,
 * identify the owner, or replace an integrity-verified /kernel/enter crossing.
 */
export async function inspectWayglassKernel({
  routeId = 'local:ollama',
  worldId = 'wayglass:home',
  embodiment = {},
  fetchImpl = fetch,
} = {}) {
  const params = new URLSearchParams({
    route: routeId,
    world: worldId,
    body: embodiment.body_id || 'browser-host',
    body_class: embodiment.body_class || 'host-os',
    keyboard: embodiment.keyboard === false ? '0' : '1',
    touch: embodiment.touch ? '1' : '0',
    ar: embodiment.ar ? '1' : '0',
    haptics: embodiment.haptics ? '1' : '0',
  });
  const response = await fetchImpl('/api/v1/wayglass/kernel?' + params.toString(), {
    cache: 'no-store',
  });
  const data = await jsonOrThrow(response);
  if (data?.schema !== 'wayglass.kernel/v0.1' || data.status !== 'boot-contract') {
    throw new Error('Kernel returned an unavailable or blocked boot contract.');
  }
  // A route snapshot is only metadata. The response endpoint separately
  // verifies that the same registered route survives kernel preflight.
  if (data.cognition?.route_id !== routeId) {
    throw new Error('Kernel route differs from requested cognitive route.');
  }
  return data;
}
