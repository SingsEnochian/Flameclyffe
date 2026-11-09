import { authorizationSession } from './authorization-session.js';
import { publishWatercolorActivity } from './watercolor-bridge.js';

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

export async function inspectWayglassDoubleMobius(fetchImpl = fetch) {
  return jsonOrThrow(await fetchImpl('/api/v1/wayglass/kernel/double-mobius', { cache: 'no-store' }));
}

/**
 * Uses the authenticated House gateway and the existing Waygate/Return Engine.
 * The kernel never fabricates the two input observations or model speech.
 */
export async function traverseWayglassDoubleMobius({ fetchImpl = fetch, ...payload } = {}) {
  publishWatercolorActivity({kind:'double-mobius:crossing',actor:'wayglass:route-client',intensity:0.55});
  try {
    const response = await fetchImpl('/api/v1/wayglass/kernel/double-mobius', {
      method: 'POST', headers: JSON_HEADERS, cache: 'no-store',
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok && response.status !== 409) {
      throw new Error(data.error || 'Double Möbius engine crossing failed.');
    }
    if (data?.status === 'completed-in-memory' && data.return_verification?.verdict === 'accepted') {
      publishWatercolorActivity({kind:'double-mobius:return',actor:'wayglass:route-client',receipt:data.entry_receipt||null,intensity:0.76});
    }
    return data;
  } catch (error) {
    publishWatercolorActivity({kind:'double-mobius:failed',actor:'wayglass:route-client',intensity:0.3});
    throw error;
  }
}

/** Wyrdrune-written score: the bridge measures text and returns a composed audio frame.
 * The response never claims a live model voice or starts audio.
 */
export async function scoreWyrdruneStory({
  text = '', participants = [], affinity = 0.5, turns = 0,
  signal = undefined, fetchImpl = fetch,
} = {}) {
  const response = await fetchImpl('/api/v1/wayglass/wyrdrune/story-soundscape', {
    method:'POST', headers:JSON_HEADERS, cache:'no-store', signal,
    body:JSON.stringify({text,participants,affinity,turns}),
  });
  return jsonOrThrow(response);
}

/**
 * A bounded observation-only stream: no message text, private keyboard key,
 * model reply or identity assertion is sent, only dimensionless event signals.
 * Actual spectral composition executes in the server-owned Wyrdrune programme.
 */
export async function scoreWyrdruneSpectrum(events, fetchImpl=fetch, signal=undefined) {
  return jsonOrThrow(await fetchImpl('/api/v1/wayglass/wyrdrune/full-spectrum',{
    method:'POST',headers:JSON_HEADERS,cache:'no-store',signal,
    body:JSON.stringify({events}),
  }));
}

/** Transmits only bounded numeric scale values and counts to the House-scoped
 * Wyrdrune Atlas, never world IDs, participant names or raw narratives.
 */
export async function scoreWyrdruneAtlas(scales, fetchImpl=fetch, signal=undefined) {
  return jsonOrThrow(await fetchImpl('/api/v1/wayglass/wyrdrune/resonance-atlas',{
    method:'POST',headers:JSON_HEADERS,cache:'no-store',signal,
    body:JSON.stringify({scales}),
  }));
}

/**
 * Living Learning is native Wyrdrune. The host receives only typed Atlas
 * values and an explicitly offered model return, never unsolicited thoughts.
 */
export async function executeWyrdruneLearning(learning,fetchImpl=fetch,signal=undefined) {
  return jsonOrThrow(await fetchImpl('/api/v1/wayglass/wyrdrune/living-learning',{
    method:'POST',headers:JSON_HEADERS,cache:'no-store',signal,
    body:JSON.stringify({learning}),
  }));
}

/** Request Wayglass's own Wyrdrune, en-GB rendering, and optional image/sound
 * expressions. A real Crow model return is required; there is no canned voice.
 */
export async function inviteWayglassVoice({prompt,channels={image:true,sound:true},
  fetchImpl=fetch,signal}={}) {
  return jsonOrThrow(await fetchImpl('/api/v1/wayglass/wyrdrune/native-voice',{
    method:'POST',headers:JSON_HEADERS,cache:'no-store',signal,
    body:JSON.stringify({prompt,channels}),
  }));
}

export async function listWayglassCharacters(fetchImpl = fetch) {
  return jsonOrThrow(await fetchImpl('/api/v1/wayglass/characters', { cache: 'no-store' }));
}

export async function listWayglassRoutes(fetchImpl = fetch) {
  const response = await fetchImpl('/api/v1/wayglass/routes', { cache: 'no-store' });
  const catalogue = await jsonOrThrow(response);
  const bluebirdRoute = authorizationSession.route();
  if (bluebirdRoute && Array.isArray(catalogue.routes)) {
    // An authenticated browser session authorizes a route, not a verified reply.
    // Keep the identity-bound route distinct from Griff's private chat.
    const match=catalogue.routes.find(route=>route.route_id===bluebirdRoute);
    const sessionRoute={ route_id:bluebirdRoute,label:'Bluebird · SpicyChat',provider:'spicychat',
      model:'provider-managed',configured:true,connection_verified:false,
      configuration_message:'Authorized browser session; actual reply not yet verified.',
      capabilities:{text:true,local:false} };
    if(match)Object.assign(match,sessionRoute);
    else catalogue.routes.unshift(sessionRoute);
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
  routeId = 'local:ollama',
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
  waygateManifest = null,
  continuationPacket = null,
  stopReceipt = null,
  embodiment = {},
  signal,
  maxOutputTokens = 1400,
  think = false,
  fetchImpl = fetch,
} = {}) {
  publishWatercolorActivity({kind:'route:pending',actor:'wayglass:route-client',intensity:0.48});
  try {
  const response = await fetchImpl('/api/v1/wayglass/respond', {
    method: 'POST',
    headers: routeId === 'flame:bluebird:spicychat' ? { ...JSON_HEADERS, ...authorizationSession.headers() } : JSON_HEADERS,
    signal,
    body: JSON.stringify({
      route_id: routeId,
      external_provider_consent: externalProviderConsent === true,
      world_id: worldId,
      participant_id: participantId,
      character_id: characterId,
      waygate_manifest: waygateManifest,
      continuation_packet: continuationPacket,
      stop_receipt: stopReceipt,
      embodiment,
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
  const data = await jsonOrThrow(response);
  if (data?.schema === 'wayglass.route-turn/v0.1') publishWatercolorActivity({kind:'route:responded',actor:'wayglass:route-client',receipt:data.receipt||null,intensity:0.72});
  return data;
  } catch (error) {
    publishWatercolorActivity({kind:'route:failed',actor:'wayglass:route-client',intensity:0.44});
    throw error;
  }
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


