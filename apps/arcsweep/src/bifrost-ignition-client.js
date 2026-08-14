import {
  constellationRuntimeAuthorizationHeaders,
  loadConstellationRuntimeRoutes,
} from './constellation-runtime-adapter.js';

async function jsonRequest(url, options = {}, fetchImpl = fetch) {
  const response = await fetchImpl(url, options);
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

function privilegedHeaders() {
  return {
    'content-type': 'application/json',
    ...constellationRuntimeAuthorizationHeaders(),
  };
}

export async function getBifrostIgnitionStatus(fetchImpl = fetch) {
  const result = await jsonRequest('/api/v1/bifrost/ignition', {}, fetchImpl);
  if (!result.ok) throw new Error(result.data?.detail || result.data?.error || `Ignition status failed (${result.status})`);
  return result.data;
}

export async function startBifrostOllama(fetchImpl = fetch) {
  const result = await jsonRequest('/api/v1/bifrost/ignition/start-ollama', {
    method: 'POST',
    headers: privilegedHeaders(),
    body: JSON.stringify({ confirm: true }),
  }, fetchImpl);
  return { ...result.data, ok: result.ok, httpStatus: result.status };
}

export async function materializeBifrostAlias(profileRef, {
  optIn = false,
  fetchImpl = fetch,
} = {}) {
  if (!profileRef) throw new Error('Alias materialization requires a Bifröst profile or identity reference.');
  const result = await jsonRequest(`/api/v1/bifrost/ignition/profile/${encodeURIComponent(profileRef)}/materialize-alias`, {
    method: 'POST',
    headers: privilegedHeaders(),
    body: JSON.stringify({ confirm: true, opt_in: optIn === true }),
  }, fetchImpl);
  return { ...result.data, ok: result.ok, httpStatus: result.status };
}

export async function igniteBifrostProfile(profileId, {
  startOllama = false,
  allowRemoteProbe = false,
  optIn = false,
  fetchImpl = fetch,
} = {}) {
  if (!profileId) throw new Error('Ignition requires a Bifröst profile id.');
  const result = await jsonRequest(`/api/v1/bifrost/ignition/profile/${encodeURIComponent(profileId)}`, {
    method: 'POST',
    headers: privilegedHeaders(),
    body: JSON.stringify({
      confirm: true,
      start_ollama: startOllama === true,
      allow_remote_probe: allowRemoteProbe === true,
      opt_in: optIn === true,
    }),
  }, fetchImpl);
  return { ...result.data, ok: result.ok, httpStatus: result.status };
}

export async function igniteConstellationVoice(voiceId, options = {}) {
  const registry = await loadConstellationRuntimeRoutes(options.fetchImpl || fetch);
  const voice = String(voiceId || '').trim().toLowerCase();
  const entry = registry.routes?.[voice];
  if (!entry?.profileId) {
    return {
      ok: false,
      state: entry?.status || 'vessel-unselected',
      voiceId: voice,
      profileId: null,
      error: 'No model vessel is selected for this voice.',
    };
  }
  const receipt = await igniteBifrostProfile(entry.profileId, {
    startOllama: options.startOllama === true,
    allowRemoteProbe: options.allowRemoteProbe === true,
    fetchImpl: options.fetchImpl || fetch,
  });
  return { ...receipt, voiceId: voice };
}

export async function materializeConstellationVoiceAlias(voiceId, options = {}) {
  const registry = await loadConstellationRuntimeRoutes(options.fetchImpl || fetch);
  const voice = String(voiceId || '').trim().toLowerCase();
  const entry = registry.routes?.[voice];
  if (!entry?.profileId) {
    return {
      ok: false,
      state: entry?.status || 'vessel-unselected',
      voiceId: voice,
      profileId: null,
      error: 'No model vessel is selected for this voice.',
    };
  }
  const receipt = await materializeBifrostAlias(entry.profileId, {
    fetchImpl: options.fetchImpl || fetch,
  });
  return { ...receipt, voiceId: voice };
}

export async function igniteDeepReasoner(options = {}) {
  const registry = await loadConstellationRuntimeRoutes(options.fetchImpl || fetch);
  const entry = registry.optionalProfiles?.deepReasoner;
  if (!entry?.profileId) throw new Error('Deep reasoner profile is not registered.');
  return igniteBifrostProfile(entry.profileId, {
    startOllama: options.startOllama === true,
    optIn: true,
    fetchImpl: options.fetchImpl || fetch,
  });
}
