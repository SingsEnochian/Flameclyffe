'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { probeOllama } = require('./ignition');
const { planRuntimeAliases } = require('./alias-materializer');
const { resolveProfileRef } = require('./profile-resolution');

function safeSegment(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function defaultRunner(alias, baseModel, modelfile) {
  const result = spawnSync('ollama', ['create', alias, '-f', modelfile], {
    stdio: 'pipe',
    encoding: 'utf8',
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').trim();
    throw new Error(`ollama-create-failed: ${detail || `exit ${result.status}`}`);
  }
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

async function materializeRuntimeAlias(profileRef, {
  fetchImpl = globalThis.fetch,
  runner = defaultRunner,
  cacheRoot = path.resolve(process.env.BIFROST_MODEL_CACHE || path.join(__dirname, '..', 'data', 'bifrost-models')),
  includeOptIn = false,
} = {}) {
  const resolved = resolveProfileRef(profileRef);
  if (!resolved) {
    return { contract: 'bifrost.alias-materialization-receipt/v1', state: 'profile-missing', requestedRef: profileRef };
  }
  const { profileId, profile, identity } = resolved;
  if (profile.opt_in_only && !includeOptIn) {
    return { contract: 'bifrost.alias-materialization-receipt/v1', state: 'opt-in-required', requestedRef: profileRef, profileId, identity };
  }
  if (profile.runtime.provider !== 'ollama') {
    return { contract: 'bifrost.alias-materialization-receipt/v1', state: 'not-local-ollama-profile', requestedRef: profileRef, profileId, identity };
  }

  const endpoint = profile.runtime.base_url || process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
  const probe = await probeOllama(endpoint, fetchImpl);
  if (!probe.reachable) {
    return {
      contract: 'bifrost.alias-materialization-receipt/v1',
      state: 'route-unavailable',
      requestedRef: profileRef,
      profileId,
      identity,
      error: probe.error || 'Ollama unreachable',
    };
  }

  const [entry] = planRuntimeAliases(probe.models || [], {
    includeOptIn,
    profileRefs: [profileId],
  });
  if (!entry) {
    return {
      contract: 'bifrost.alias-materialization-receipt/v1',
      state: profile.runtime.model === profile.artifact?.model ? 'alias-not-required' : 'alias-not-plannable',
      requestedRef: profileRef,
      profileId,
      identity,
    };
  }
  if (entry.state === 'alias-present') {
    return { contract: 'bifrost.alias-materialization-receipt/v1', state: 'alias-present', requestedRef: profileRef, ...entry };
  }
  if (entry.state !== 'ready-to-create') {
    return { contract: 'bifrost.alias-materialization-receipt/v1', state: entry.state, requestedRef: profileRef, ...entry };
  }

  const dir = path.join(cacheRoot, safeSegment(profileId));
  fs.mkdirSync(dir, { recursive: true });
  const modelfile = path.join(dir, 'Alias.Modelfile');
  fs.writeFileSync(modelfile, `FROM ${entry.baseModel}\n`, 'utf8');

  try {
    runner(entry.runtimeAlias, entry.baseModel, modelfile);
  } catch (error) {
    return {
      contract: 'bifrost.alias-materialization-receipt/v1',
      state: 'alias-create-failed',
      requestedRef: profileRef,
      ...entry,
      error: error?.message || String(error),
    };
  }

  const after = await probeOllama(endpoint, fetchImpl);
  const verified = (after.models || []).some((name) => String(name).replace(/:latest$/i, '') === String(entry.runtimeAlias).replace(/:latest$/i, ''));
  return {
    contract: 'bifrost.alias-materialization-receipt/v1',
    state: verified ? 'alias-created' : 'alias-create-unverified',
    requestedRef: profileRef,
    ...entry,
    aliasInstalled: verified,
    rules: {
      downloadsModels: false,
      remoteCalls: false,
      selectedProfileOnly: true,
      baseMustAlreadyExist: true,
      distinctEntitiesRemainDistinct: true,
    },
  };
}

module.exports = {
  defaultRunner,
  materializeRuntimeAlias,
};
