'use strict';

const {
  startOllamaServer,
  igniteProfile,
  igniteOptionalProfile,
} = require('./ignition');
const { MODEL_PROFILES } = require('./model-profiles');

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

async function executeIgnitionPolicy(policy, adapters = {}) {
  const startOllama = adapters.startOllamaServer || startOllamaServer;
  const ignite = adapters.igniteProfile || igniteProfile;
  const igniteOptional = adapters.igniteOptionalProfile || igniteOptionalProfile;
  const profiles = adapters.modelProfiles || MODEL_PROFILES;
  const receipts = [];

  if (!policy?.enabled) {
    return {
      contract: 'bifrost.startup-ignition/v1',
      state: 'disabled',
      startedOllama: false,
      receipts,
    };
  }

  let startup = null;
  if (policy.startOllama) startup = await startOllama();

  for (const profileId of policy.profiles || []) {
    const definition = profiles[profileId];
    if (!definition) {
      receipts.push({ profileId, state: 'profile-missing' });
      continue;
    }
    if (definition.opt_in_only && !policy.allowOptIn) {
      receipts.push({ profileId, state: 'opt-in-required' });
      continue;
    }
    if (definition.runtime?.provider !== 'ollama' && !policy.allowRemote) {
      receipts.push({ profileId, state: 'remote-probe-not-authorised' });
      continue;
    }

    const receipt = definition.opt_in_only
      ? await igniteOptional(profileId, { startOllama: false })
      : await ignite(profileId, {
          startOllama: false,
          allowRemoteProbe: policy.allowRemote,
        });
    receipts.push(receipt);
  }

  return {
    contract: 'bifrost.startup-ignition/v1',
    state: receipts.some((item) => item.state === 'runtime-verified') ? 'completed' : 'completed-without-verified-vessels',
    startedOllama: Boolean(startup?.started),
    ollamaAlreadyRunning: Boolean(startup?.alreadyRunning),
    receipts,
    rules: {
      downloadsModels: false,
      missingWeightsDoNotAbortHearthgate: true,
      startupIgnitionRequiresExplicitEnvironmentPolicy: true,
    },
  };
}

module.exports = {
  parseIgnitionPolicy,
  executeIgnitionPolicy,
};
