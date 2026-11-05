const JSON_HEADERS = { 'Content-Type': 'application/json' };
// Cloud mode uses a serverless relay. Authentication is supplied by the host
// through an explicit callback, never through a committed credential.
let cloudAuthProvider = null;
export function configureWayglassCloudAuth(provider) {
  cloudAuthProvider = typeof provider === 'function' ? provider : null;
}
async function hostedFetch(path, options = {}, fetchImpl = fetch) {
  const base = import.meta.env?.VITE_WAYGLASS_CLOUD_FUNCTION_URL;
  if (!base || !cloudAuthProvider || !path.endsWith('/respond')) return fetchImpl(path, options);
  const token = await cloudAuthProvider();
  if (!token) throw new Error('Sign in to use the hosted Wayglass route.');
  return fetchImpl(base, { ...options, headers: {
    ...options.headers, Authorization: 'Bearer ' + token
  } });
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
  routeId = 'openai:gpt',
  harnessId = 'wayglass:writing-room/direct-v0.1',
  input,
  history = [],
  interaction,
  sessionId,
  surfaceId = 'arcsweep:writing-room',
  maxOutputTokens = 1400,
  fetchImpl = fetch,
} = {}) {
  const response = await hostedFetch('/api/v1/wayglass/respond', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      route_id: routeId,
      harness_id: harnessId,
      input,
      history,
      interaction,
      session_id: sessionId,
      surface_id: surfaceId,
      max_output_tokens: maxOutputTokens,
    }),
  }, fetchImpl);
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
 * Explicitly owner-scoped connection to the already deployed Wayglass cloud
 * circulation organ. No browser-held provider keys; this reuses cloud login.
 * This is a consultation route and returns its own attributable model receipt.
 */
export function resolveWayglassCirculationUrl({
  circulationUrl = null, hostedFunctionUrl = null, supabaseUrl = null,
} = {}) {
  if (circulationUrl) return new URL(circulationUrl).href;
  if (hostedFunctionUrl) {
    const endpoint = new URL(hostedFunctionUrl);
    if (!endpoint.pathname.endsWith('/wayglass-hosted-relay')) {
      throw new Error('Hosted function URL cannot identify cloud circulation endpoint.');
    }
    endpoint.pathname = endpoint.pathname.replace(/wayglass-hosted-relay$/, 'wayglass-cloud-circulation');
    return endpoint.href;
  }
  if (supabaseUrl) return new URL('/functions/v1/wayglass-cloud-circulation', supabaseUrl).href;
  return null;
}

export async function requestWayglassCloudCirculation({
  action = 'pulse', message = undefined, endpoint = null,
  getToken = cloudAuthProvider, fetchImpl = fetch,
} = {}) {
  if (!['pulse', 'hello'].includes(action)) throw new TypeError('Unknown circulation action.');
  if (message != null && (typeof message !== 'string' || !message.trim() || message.length > 6000)) {
    throw new TypeError('Circulation message must be a nonempty string of at most 6000 characters.');
  }
  const url = endpoint || resolveWayglassCirculationUrl({
    circulationUrl: import.meta.env?.VITE_WAYGLASS_CLOUD_CIRCULATION_URL,
    hostedFunctionUrl: import.meta.env?.VITE_WAYGLASS_CLOUD_FUNCTION_URL,
    supabaseUrl: import.meta.env?.VITE_WAYGLASS_SUPABASE_URL,
  });
  if (!url) throw new Error('Wayglass cloud circulation URL is not configured in this host.');
  if (typeof getToken !== 'function') throw new Error('Wayglass owner authentication is not configured.');
  const token = await getToken();
  if (!token) throw new Error('Sign in as the Wayglass owner to contact cloud circulation.');
  const response = await fetchImpl(url, {
    method: 'POST', cache: 'no-store',
    headers: { ...JSON_HEADERS, Authorization: 'Bearer ' + token },
    body: JSON.stringify({ action, ...(message == null ? {} : { message: message.trim() }) }),
  });
  const data = await readJson(response);
  if (!response.ok) {
    const error = new Error(data?.error || 'Wayglass cloud circulation failed.');
    error.status = response.status;
    error.receipt = data?.schema === 'wayglass.cloud-circulation/v0.1' ? data : null;
    throw error;
  }
  if (data?.schema !== 'wayglass.cloud-circulation/v0.1'
      || !data?.reply?.text || !Array.isArray(data.cells)) {
    throw new Error('Cloud circulation did not return a verifiable model consultation receipt.');
  }
  return data;
}
