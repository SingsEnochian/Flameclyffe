'use strict';

const { publicModelProfile } = require('./model-profiles');

function modelReceipt(manifest) {
  const profile = manifest.model_profile_id ? publicModelProfile(manifest.model_profile_id) : null;
  return {
    profile_id: manifest.model_profile_id || null,
    canonical_voice_id: manifest.canonical_voice_id || manifest.flame_id,
    flame_id: manifest.flame_id,
    provider: manifest.platform.provider,
    model: manifest.platform.model,
    source_model: profile?.source?.repo || null,
    capabilities: profile?.capabilities || [],
    assignment: profile?.assignment || 'legacy-runtime-binding',
    opt_in_only: Boolean(profile?.opt_in_only),
  };
}

function expectedProfileMismatch(manifest, metadata = {}) {
  const expected = String(metadata.expected_profile_id || '').trim();
  if (!expected) return null;
  const actual = manifest.model_profile_id || null;
  if (expected === actual) return null;
  return {
    code: 'runtime-profile-mismatch',
    expected_profile_id: expected,
    actual_profile_id: actual,
    flame_id: manifest.flame_id,
  };
}

async function ollamaInstallationState(manifest, fetchImpl = globalThis.fetch) {
  const endpoint = manifest.platform.base_url || process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
  if (typeof fetchImpl !== 'function') {
    return { state: 'route-unavailable', detail: 'fetch-unavailable' };
  }
  try {
    const response = await fetchImpl(`${endpoint}/api/tags`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return { state: 'route-unavailable', detail: `ollama-${response.status}` };
    const data = await response.json();
    const wanted = String(manifest.platform.model || '');
    const installed = (data.models || []).some((entry) => {
      const names = [entry.name, entry.model].filter(Boolean).map(String);
      return names.includes(wanted) || names.includes(`${wanted}:latest`);
    });
    return {
      state: installed ? 'installed' : 'activation-pending',
      detail: installed ? 'assigned model alias is present in Ollama' : 'assigned model alias is not present in Ollama',
    };
  } catch (error) {
    return { state: 'route-unavailable', detail: error?.message || String(error) };
  }
}

async function inspectManifestRuntime(manifest, fetchImpl = globalThis.fetch) {
  const receipt = modelReceipt(manifest);
  if (manifest.platform.provider === 'ollama') {
    const probe = await ollamaInstallationState(manifest, fetchImpl);
    return { ...receipt, runtime_state: probe.state, runtime_detail: probe.detail };
  }

  const envVar = manifest.platform.api_key_env;
  if (envVar) {
    const present = Boolean(process.env[envVar]);
    return {
      ...receipt,
      runtime_state: present ? 'credential-ready' : 'credential-needed',
      runtime_detail: present ? 'provider credential is present' : `provider credential ${envVar} is not present`,
    };
  }

  return { ...receipt, runtime_state: 'profile-defined', runtime_detail: 'runtime profile is defined' };
}

module.exports = {
  modelReceipt,
  expectedProfileMismatch,
  inspectManifestRuntime,
};
