'use strict';

const { spawn } = require('node:child_process');
const { MODEL_PROFILES, materialiseModelProfile } = require('./model-profiles');

const IGNITION_ACK = 'BIFROST_IGNITION_ACK';
const ignitionReceipts = new Map();
let spawnedOllama = null;

function now() {
  return new Date().toISOString();
}

function normaliseModelName(value) {
  return String(value || '').trim().replace(/:latest$/i, '');
}

function publicReceipt(receipt) {
  if (!receipt) return null;
  const { error, ...safe } = receipt;
  return error ? { ...safe, error } : safe;
}

async function fetchJson(url, options = {}, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch unavailable');
  const response = await fetchImpl(url, {
    ...options,
    signal: options.signal || AbortSignal.timeout(options.timeoutMs || 8000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message || data?.error || `${response.status}`;
    throw new Error(`${response.status} ${detail}`);
  }
  return data;
}

async function probeOllama(endpoint, fetchImpl = globalThis.fetch) {
  try {
    const data = await fetchJson(`${endpoint}/api/tags`, { timeoutMs: 2500 }, fetchImpl);
    return {
      reachable: true,
      models: (data.models || []).map((item) => item.name || item.model).filter(Boolean),
    };
  } catch (error) {
    return { reachable: false, models: [], error: error?.message || String(error) };
  }
}

async function waitForOllama(endpoint, fetchImpl = globalThis.fetch, timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const probe = await probeOllama(endpoint, fetchImpl);
    if (probe.reachable) return probe;
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  return probeOllama(endpoint, fetchImpl);
}

async function startOllamaServer({ endpoint = 'http://127.0.0.1:11434', fetchImpl = globalThis.fetch } = {}) {
  const existing = await probeOllama(endpoint, fetchImpl);
  if (existing.reachable) return { started: false, alreadyRunning: true, endpoint, probe: existing };
  if (spawnedOllama && !spawnedOllama.killed) {
    const probe = await waitForOllama(endpoint, fetchImpl);
    return { started: false, alreadyStarting: true, endpoint, probe };
  }

  try {
    spawnedOllama = spawn('ollama', ['serve'], {
      detached: false,
      stdio: 'ignore',
      windowsHide: true,
      env: { ...process.env },
    });
    spawnedOllama.on('exit', () => { spawnedOllama = null; });
    spawnedOllama.on('error', () => { spawnedOllama = null; });
  } catch (error) {
    return { started: false, endpoint, error: error?.message || String(error) };
  }

  const probe = await waitForOllama(endpoint, fetchImpl);
  return {
    started: probe.reachable,
    alreadyRunning: false,
    endpoint,
    probe,
    error: probe.reachable ? null : probe.error || 'Ollama did not become reachable.',
  };
}

function installedInOllama(profile, probe) {
  const wanted = normaliseModelName(profile.runtime.model);
  return probe.models.some((name) => normaliseModelName(name) === wanted);
}

async function warmOllamaProfile(profile, fetchImpl = globalThis.fetch) {
  const endpoint = profile.runtime.base_url || 'http://127.0.0.1:11434';
  const data = await fetchJson(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    timeoutMs: Number(process.env.BIFROST_IGNITION_TIMEOUT_MS || 45000),
    body: JSON.stringify({
      model: profile.runtime.model,
      stream: false,
      keep_alive: process.env.BIFROST_KEEP_ALIVE || '15m',
      options: { temperature: 0 },
      messages: [
        {
          role: 'system',
          content: `Bifröst ignition probe. Reply with exactly ${IGNITION_ACK} and nothing else.`,
        },
        { role: 'user', content: IGNITION_ACK },
      ],
    }),
  }, fetchImpl);

  const actualModel = data.model || profile.runtime.model;
  if (normaliseModelName(actualModel) !== normaliseModelName(profile.runtime.model)) {
    throw new Error(`runtime-model-mismatch: expected ${profile.runtime.model}, got ${actualModel}`);
  }
  const answer = String(data.message?.content || '').trim();
  if (answer !== IGNITION_ACK) {
    throw new Error(`ignition-challenge-failed: expected ${IGNITION_ACK}, got ${answer.slice(0, 160) || '<empty>'}`);
  }

  return {
    actualModel,
    answer,
    done: data.done === true,
    loadDurationNs: data.load_duration ?? null,
    totalDurationNs: data.total_duration ?? null,
  };
}

async function warmDeepSeekProfile(profile, fetchImpl = globalThis.fetch) {
  const envVar = profile.runtime.api_key_env;
  const key = envVar ? process.env[envVar] : null;
  if (!key) throw new Error(`credential-needed: ${envVar}`);
  const data = await fetchJson(`${profile.runtime.base_url}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    timeoutMs: Number(process.env.BIFROST_IGNITION_TIMEOUT_MS || 45000),
    body: JSON.stringify({
      model: profile.runtime.model,
      temperature: 0,
      max_tokens: 16,
      messages: [
        { role: 'system', content: `Bifröst ignition probe. Reply with exactly ${IGNITION_ACK} and nothing else.` },
        { role: 'user', content: IGNITION_ACK },
      ],
    }),
  }, fetchImpl);
  const actualModel = data.model || profile.runtime.model;
  if (normaliseModelName(actualModel) !== normaliseModelName(profile.runtime.model)) {
    throw new Error(`runtime-model-mismatch: expected ${profile.runtime.model}, got ${actualModel}`);
  }
  const answer = String(data.choices?.[0]?.message?.content || '').trim();
  if (answer !== IGNITION_ACK) {
    throw new Error(`ignition-challenge-failed: expected ${IGNITION_ACK}, got ${answer.slice(0, 160) || '<empty>'}`);
  }
  return { actualModel, answer };
}

async function inspectProfile(profileId, fetchImpl = globalThis.fetch) {
  const profile = materialiseModelProfile(profileId);
  if (!profile) return { profileId, state: 'profile-missing', checkedAt: now() };

  const base = {
    profileId: profile.profile_id,
    owner: profile.owner,
    provider: profile.runtime.provider,
    model: profile.runtime.model,
    sourceModel: profile.source?.repo || null,
    assignment: profile.assignment,
    optInOnly: Boolean(profile.opt_in_only),
    checkedAt: now(),
  };

  if (profile.runtime.provider === 'ollama') {
    const probe = await probeOllama(profile.runtime.base_url, fetchImpl);
    if (!probe.reachable) return { ...base, state: 'route-unavailable', detail: probe.error };
    const installed = installedInOllama(profile, probe);
    const previous = ignitionReceipts.get(profileId);
    if (installed && previous?.state === 'runtime-verified') return { ...base, ...publicReceipt(previous), installed: true };
    return {
      ...base,
      state: installed ? 'installed' : 'activation-pending',
      installed,
      detail: installed ? 'assigned model is present in Ollama' : 'assigned model is not installed in Ollama',
    };
  }

  if (profile.runtime.provider === 'deepseek') {
    const envVar = profile.runtime.api_key_env;
    const ready = Boolean(envVar && process.env[envVar]);
    const previous = ignitionReceipts.get(profileId);
    if (ready && previous?.state === 'runtime-verified') return { ...base, ...publicReceipt(previous), credentialReady: true };
    return {
      ...base,
      state: ready ? 'credential-ready' : 'credential-needed',
      credentialReady: ready,
      detail: ready ? 'provider credential is present' : `provider credential ${envVar} is not present`,
    };
  }

  return { ...base, state: 'profile-defined', detail: 'No ignition adapter exists for this provider.' };
}

async function igniteProfile(profileId, {
  startOllama = false,
  allowRemoteProbe = false,
  fetchImpl = globalThis.fetch,
} = {}) {
  const profile = materialiseModelProfile(profileId);
  if (!profile) throw new Error(`Unknown Bifröst profile: ${profileId}`);
  if (profile.opt_in_only) throw new Error('opt-in-required: optional profile must be ignited through an explicit opt-in request');

  const receipt = {
    profileId: profile.profile_id,
    owner: profile.owner,
    provider: profile.runtime.provider,
    model: profile.runtime.model,
    sourceModel: profile.source?.repo || null,
    attemptedAt: now(),
    state: 'igniting',
  };

  try {
    if (profile.runtime.provider === 'ollama') {
      let probe = await probeOllama(profile.runtime.base_url, fetchImpl);
      if (!probe.reachable && startOllama) {
        const startup = await startOllamaServer({ endpoint: profile.runtime.base_url, fetchImpl });
        probe = startup.probe || probe;
      }
      if (!probe.reachable) throw new Error(`route-unavailable: ${probe.error || 'Ollama unreachable'}`);
      if (!installedInOllama(profile, probe)) throw new Error(`activation-pending: ${profile.runtime.model} is not installed`);
      const warm = await warmOllamaProfile(profile, fetchImpl);
      Object.assign(receipt, {
        state: 'runtime-verified',
        verifiedAt: now(),
        actualModel: warm.actualModel,
        challenge: warm.answer,
        loadDurationNs: warm.loadDurationNs,
        totalDurationNs: warm.totalDurationNs,
      });
    } else if (profile.runtime.provider === 'deepseek') {
      if (!allowRemoteProbe) throw new Error('remote-probe-not-authorised: set allowRemoteProbe for a billable provider challenge');
      const warm = await warmDeepSeekProfile(profile, fetchImpl);
      Object.assign(receipt, {
        state: 'runtime-verified',
        verifiedAt: now(),
        actualModel: warm.actualModel,
        challenge: warm.answer,
      });
    } else {
      throw new Error(`provider-not-supported: ${profile.runtime.provider}`);
    }
  } catch (error) {
    receipt.state = String(error?.message || '').split(':')[0] || 'ignition-failed';
    receipt.error = error?.message || String(error);
    receipt.failedAt = now();
  }

  ignitionReceipts.set(profileId, receipt);
  return publicReceipt(receipt);
}

async function igniteOptionalProfile(profileId, options = {}) {
  const profile = materialiseModelProfile(profileId);
  if (!profile) throw new Error(`Unknown Bifröst profile: ${profileId}`);
  if (!profile.opt_in_only) return igniteProfile(profileId, options);
  const clone = { ...profile, opt_in_only: false };
  const original = MODEL_PROFILES[profileId];
  // Do not mutate MODEL_PROFILES. Inline the same verified ignition path.
  if (clone.runtime.provider !== 'ollama') throw new Error(`provider-not-supported: ${clone.runtime.provider}`);
  const receipt = {
    profileId: clone.profile_id,
    owner: clone.owner,
    provider: clone.runtime.provider,
    model: clone.runtime.model,
    sourceModel: clone.source?.repo || null,
    attemptedAt: now(),
    state: 'igniting',
    optIn: true,
  };
  try {
    let probe = await probeOllama(clone.runtime.base_url, options.fetchImpl || globalThis.fetch);
    if (!probe.reachable && options.startOllama) {
      const startup = await startOllamaServer({ endpoint: clone.runtime.base_url, fetchImpl: options.fetchImpl || globalThis.fetch });
      probe = startup.probe || probe;
    }
    if (!probe.reachable) throw new Error(`route-unavailable: ${probe.error || 'Ollama unreachable'}`);
    if (!installedInOllama(clone, probe)) throw new Error(`activation-pending: ${clone.runtime.model} is not installed`);
    const warm = await warmOllamaProfile(clone, options.fetchImpl || globalThis.fetch);
    Object.assign(receipt, {
      state: 'runtime-verified',
      verifiedAt: now(),
      actualModel: warm.actualModel,
      challenge: warm.answer,
      loadDurationNs: warm.loadDurationNs,
      totalDurationNs: warm.totalDurationNs,
    });
  } catch (error) {
    receipt.state = String(error?.message || '').split(':')[0] || 'ignition-failed';
    receipt.error = error?.message || String(error);
    receipt.failedAt = now();
  }
  ignitionReceipts.set(profileId, receipt);
  void original;
  return publicReceipt(receipt);
}

async function ignitionStatus({ includeOptIn = true, fetchImpl = globalThis.fetch } = {}) {
  const profileIds = Object.keys(MODEL_PROFILES).filter((id) => includeOptIn || !MODEL_PROFILES[id].opt_in_only);
  const profiles = await Promise.all(profileIds.map((id) => inspectProfile(id, fetchImpl)));
  return {
    contract: 'bifrost.ignition-status/v1',
    checkedAt: now(),
    profiles,
    rules: {
      noAutomaticModelDownload: true,
      localDaemonStartRequiresExplicitAction: true,
      remoteProviderProbeRequiresExplicitAction: true,
      optionalProfilesRequireExplicitOptIn: true,
      runtimeVerifiedRequiresChallengeRoundTrip: true,
    },
  };
}

function ignitionReceipt(profileId) {
  return publicReceipt(ignitionReceipts.get(profileId));
}

function stopSpawnedOllama() {
  if (!spawnedOllama || spawnedOllama.killed) return false;
  spawnedOllama.kill();
  spawnedOllama = null;
  return true;
}

module.exports = {
  IGNITION_ACK,
  probeOllama,
  startOllamaServer,
  inspectProfile,
  igniteProfile,
  igniteOptionalProfile,
  ignitionStatus,
  ignitionReceipt,
  stopSpawnedOllama,
};
