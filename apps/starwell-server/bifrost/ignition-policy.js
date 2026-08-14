'use strict';

const {
  startOllamaServer,
  igniteProfile,
  igniteOptionalProfile,
} = require('./ignition');
const { MODEL_PROFILES } = require('./model-profiles');
const {
  resolveProfileRef,
  identityEnvelope,
  enrichReceiptWithIdentity,
} = require('./profile-resolution');

function bool(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function parseProfileList(value) {
  return [...new Set(String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean))];
}

function parseIgnitionPolicy(env = process.env) {
  return {
    enabled: bool(env.BIFROST_IGNITION_ON_START),
    startOllama: bool(env.BIFROST_START_OLLAMA),
    profiles: parseProfileList(env.BIFROST_IGNITE_PROFILES),
    allowRemote: bool(env.BIFROST_ALLOW_REMOTE_IGNITION),
    allowOptIn: bool(env.BIFROST_ALLOW_OPT_IN_IGNITION),
  };
}

function resolvePolicyProfile(ref, profiles) {
  if (profiles[ref]) return { profileId: ref, profile: profiles[ref], identity: identityEnvelope(ref) };
  if (profiles === MODEL_PROFILES) return resolveProfileRef(ref);
  const key = String(ref || '').trim().toLowerCase();
  for (const [profileId, profile] of Object.entries(profiles)) {
    const aliases = [profileId, profile.owner, profile.identity_name, profile.display_name, profile.affectionate_name, ...(profile.identity_aliases || [])]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());
    if (aliases.includes(key)) return { profileId, profile, identity: null };
  }
  return null;
}

async function executeIgnitionPolicy(policy, adapters = {}) {
  const startOllama = adapters.startOllamaServer || startOllamaServer;
  const ignite = adapters.igniteProfile || igniteProfile;
  const igniteOptional = adapters.igniteOptionalProfile || igniteOptionalProfile;
  const profiles = adapters.modelProfiles || MODEL_PROFILES;
  const receipts = [];

  if (!policy?.enabled) {
    return {
      contract: 'bifrost.startup-ignition/v2',
      state: 'disabled',
      startedOllama: false,
      receipts,
    };
  }

  let startup = null;
  if (policy.startOllama) startup = await startOllama();

  for (const requestedRef of policy.profiles || []) {
    const resolved = resolvePolicyProfile(requestedRef, profiles);
    if (!resolved) {
      receipts.push({ requestedRef, profileId: null, identity: null, state: 'profile-missing' });
      continue;
    }
    const { profileId, profile: definition } = resolved;
    const identity = resolved.identity || identityEnvelope(profileId);
    if (definition.opt_in_only && !policy.allowOptIn) {
      receipts.push({ requestedRef, profileId, identity, state: 'opt-in-required' });
      continue;
    }
    if (definition.runtime?.provider !== 'ollama' && !policy.allowRemote) {
      receipts.push({ requestedRef, profileId, identity, state: 'remote-probe-not-authorised' });
      continue;
    }

    const rawReceipt = definition.opt_in_only
      ? await igniteOptional(profileId, { startOllama: false })
      : await ignite(profileId, {
          startOllama: false,
          allowRemoteProbe: policy.allowRemote,
        });
    receipts.push({
      ...enrichReceiptWithIdentity(rawReceipt),
      requestedRef,
      resolvedProfileId: profileId,
    });
  }

  return {
    contract: 'bifrost.startup-ignition/v2',
    state: receipts.some((item) => item.state === 'runtime-verified') ? 'completed' : 'completed-without-verified-vessels',
    startedOllama: Boolean(startup?.started),
    ollamaAlreadyRunning: Boolean(startup?.alreadyRunning),
    receipts,
    rules: {
      downloadsModels: false,
      missingWeightsDoNotAbortHearthgate: true,
      startupIgnitionRequiresExplicitEnvironmentPolicy: true,
      identityAliasesResolveBeforeIgnition: true,
    },
  };
}

module.exports = {
  parseIgnitionPolicy,
  executeIgnitionPolicy,
};
