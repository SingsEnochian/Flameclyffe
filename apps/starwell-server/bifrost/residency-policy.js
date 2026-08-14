'use strict';

const DEFAULT_INTERACTIVE_KEEP_ALIVE = '5m';
const DEFAULT_SCENE_KEEP_ALIVE = '2m';
const DEFAULT_VERIFICATION_KEEP_ALIVE = '0';

function positiveInteger(value, fallback, { min = 1, max = 8 } = {}) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

function localConcurrency(env = process.env) {
  return positiveInteger(env.BIFROST_LOCAL_MODEL_CONCURRENCY, 1, { min: 1, max: 4 });
}

function keepAliveForMode(mode = 'interactive', env = process.env) {
  const normalized = String(mode || 'interactive').trim().toLowerCase();
  if (normalized === 'verification' || normalized === 'ignition') {
    return String(env.BIFROST_VERIFICATION_KEEP_ALIVE || DEFAULT_VERIFICATION_KEEP_ALIVE);
  }
  if (normalized === 'scene' || normalized === 'scene-cognition') {
    return String(env.BIFROST_SCENE_KEEP_ALIVE || DEFAULT_SCENE_KEEP_ALIVE);
  }
  return String(env.BIFROST_KEEP_ALIVE || DEFAULT_INTERACTIVE_KEEP_ALIVE);
}

function residencyPolicy(mode = 'interactive', env = process.env) {
  return {
    contract: 'bifrost.residency-policy/v1',
    mode: String(mode || 'interactive'),
    localConcurrency: localConcurrency(env),
    keepAlive: keepAliveForMode(mode, env),
    rules: {
      identityIndependentFromResidency: true,
      verificationMayUnloadImmediately: true,
      sharedBaseDoesNotMergeIdentity: true,
      localConcurrencyIsCapacityPolicyNotVoicePriority: true,
    },
  };
}

module.exports = {
  DEFAULT_INTERACTIVE_KEEP_ALIVE,
  DEFAULT_SCENE_KEEP_ALIVE,
  DEFAULT_VERIFICATION_KEEP_ALIVE,
  positiveInteger,
  localConcurrency,
  keepAliveForMode,
  residencyPolicy,
};
