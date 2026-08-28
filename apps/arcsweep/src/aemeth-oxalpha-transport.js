import {
  buildAemethParticipantPacket,
  buildAemethParticipantPrompt,
  invokeAemethParticipant,
} from './aemeth-lens.js';
import { getKelyranSupabase } from './kelyran-supabase.js';

export const OXALPHA_EDGE_URL = 'https://rufrmjyusalnifpegllj.supabase.co/functions/v1/oxalpha';
export const OXALPHA_EDGE_EXECUTION_PATH = 'supabase-edge-to-huggingface-router';

async function signedInSupabaseAccessToken() {
  try {
    const client = await getKelyranSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) return '';
    return String(data.session?.access_token || '').trim();
  } catch {
    return '';
  }
}

function isIdentityFailure(error) {
  return /identity mismatch/i.test(String(error?.message || error || ''));
}

function compactFailure(error) {
  return String(error?.message || error || 'unknown route failure').replace(/\s+/g, ' ').trim();
}

export async function readOxAlphaEdgeStatus({ fetchImpl = fetch } = {}) {
  const response = await fetchImpl(OXALPHA_EDGE_URL, { method: 'GET', cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Ox Alpha edge status failed (${response.status}).`);
  if (data.flame_id !== 'oxalpha') throw new Error(`Ox Alpha edge identity mismatch: received ${data.flame_id || 'unknown'}.`);
  return Object.freeze({
    configured: data.configured === true,
    provider: data.provider || 'huggingface-inference-providers',
    model: data.model || 'zai-org/GLM-5.3-Flash',
    executionPath: data.execution_path || OXALPHA_EDGE_EXECUTION_PATH,
    hostDependency: data.host_dependency || 'none',
  });
}

export function describeOxAlphaRouteStatus({
  houseSession = false,
  edgeReachable = false,
  edgeConfigured = false,
  edgeError = '',
  provider = 'huggingface-inference-providers',
  model = 'zai-org/GLM-5.3-Flash',
  executionPath = OXALPHA_EDGE_EXECUTION_PATH,
} = {}) {
  const house = Object.freeze({
    state: houseSession ? 'session-present' : 'absent',
    available: houseSession === true,
    detail: houseSession
      ? 'House Runtime session is present; model route health is proved only by invocation.'
      : 'No House Runtime session is currently present.',
  });
  const relay = Object.freeze({
    state: edgeReachable ? 'reachable' : 'unreachable',
    reachable: edgeReachable === true,
    detail: edgeReachable
      ? 'Supabase Ox Alpha relay answered its status probe.'
      : `Supabase Ox Alpha relay did not answer${edgeError ? `: ${edgeError}` : '.'}`,
  });
  const inferenceState = !edgeReachable ? 'unknown' : edgeConfigured ? 'ready' : 'credential-missing';
  const inference = Object.freeze({
    state: inferenceState,
    ready: inferenceState === 'ready',
    detail: inferenceState === 'ready'
      ? 'Hugging Face inference credential is configured on the relay.'
      : inferenceState === 'credential-missing'
        ? 'Relay is alive, but its Hugging Face inference credential is not configured.'
        : 'Inference readiness is unknown because the relay is unreachable.',
  });
  const overall = inference.ready
    ? 'hf-ready'
    : house.available
      ? 'house-session-present'
      : relay.reachable
        ? 'relay-unarmed'
        : 'unavailable';

  return Object.freeze({
    schema: 'arcsweep.oxalpha-route-status/v1',
    overall,
    house,
    relay,
    inference,
    provider,
    model,
    executionPath,
    hostDependency: 'none',
  });
}

export async function readOxAlphaPortableStatus({ houseToken = '', fetchImpl = fetch } = {}) {
  const houseSession = Boolean(String(houseToken || '').trim());
  try {
    const edge = await readOxAlphaEdgeStatus({ fetchImpl });
    return describeOxAlphaRouteStatus({
      houseSession,
      edgeReachable: true,
      edgeConfigured: edge.configured,
      provider: edge.provider,
      model: edge.model,
      executionPath: edge.executionPath,
    });
  } catch (error) {
    if (isIdentityFailure(error)) throw error;
    return describeOxAlphaRouteStatus({
      houseSession,
      edgeReachable: false,
      edgeConfigured: false,
      edgeError: compactFailure(error),
    });
  }
}

export async function invokeOxAlphaViaSupabase({
  record = {},
  accessToken = '',
  accessTokenProvider = signedInSupabaseAccessToken,
  fetchImpl = fetch,
} = {}) {
  const token = String(accessToken || await accessTokenProvider() || '').trim();
  if (!token) throw new Error('Ox Alpha portable relay requires a signed-in Flameclyffe Supabase session.');

  const packet = buildAemethParticipantPacket(record, 'oxalpha');
  const prompt = buildAemethParticipantPrompt(packet);
  const response = await fetchImpl(OXALPHA_EDGE_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      message: prompt,
      session_id: `aemeth-${record.id || 'unsaved'}-${record.replayFingerprint || 'live'}`,
      context: [],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail ? ` · ${String(data.detail).slice(0, 300)}` : '';
    throw new Error(`${data.error || `Ox Alpha relay failed (${response.status})`}${detail}`);
  }
  if (data.flame_id !== packet.participant.id) {
    throw new Error(`Ox Alpha edge identity mismatch: expected ${packet.participant.id}, received ${data.flame_id || 'unknown'}.`);
  }
  const text = String(data.message || '').trim();
  if (!text) throw new Error('Ox Alpha portable relay returned an empty Aemeth witness.');

  return Object.freeze({
    schema: 'arcsweep.aemeth-model-witness/v1',
    participantId: packet.participant.id,
    displayName: data.display_name || packet.participant.displayName,
    route: packet.participant.route,
    provider: data.provider || packet.participant.provider,
    model: data.model || packet.participant.model,
    inferenceModel: data.inference_model || null,
    executionPath: data.execution_path || OXALPHA_EDGE_EXECUTION_PATH,
    status: text.startsWith('[REFUSAL]') ? 'refused' : 'replied',
    text,
    citedSources: data.cited_sources || [],
    chamberPacket: packet,
    authority: packet.authority,
    createdAt: new Date().toISOString(),
  });
}

export async function invokeOxAlphaPortable({
  record = {},
  houseToken = '',
  accessToken = '',
  accessTokenProvider = signedInSupabaseAccessToken,
  houseFetchImpl = fetch,
  edgeFetchImpl = fetch,
} = {}) {
  let houseFailure = null;
  const token = String(houseToken || '').trim();

  if (token) {
    try {
      const receipt = await invokeAemethParticipant({ record, participantId: 'oxalpha', token, fetchImpl: houseFetchImpl });
      return Object.freeze({ ...receipt, executionPath: 'house-flame-route' });
    } catch (error) {
      if (isIdentityFailure(error)) throw error;
      houseFailure = error;
    }
  }

  try {
    return await invokeOxAlphaViaSupabase({ record, accessToken, accessTokenProvider, fetchImpl: edgeFetchImpl });
  } catch (edgeError) {
    if (isIdentityFailure(edgeError)) throw edgeError;
    const reasons = [
      houseFailure ? `House: ${compactFailure(houseFailure)}` : 'House: unavailable',
      `Supabase relay: ${compactFailure(edgeError)}`,
    ];
    throw new Error(`Ox Alpha is unavailable on every configured Aemeth route. ${reasons.join(' | ')}`);
  }
}
