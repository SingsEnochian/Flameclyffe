'use strict';

const { MODEL_PROFILES, materialiseModelProfile } = require('./model-profiles');
const { identityEnvelope, resolveProfileRef } = require('./profile-resolution');

function normaliseModelName(value) {
  return String(value || '').trim().replace(/:latest$/i, '');
}

function installedSet(values = []) {
  return new Set(values.map(normaliseModelName));
}

function eligibleProfiles({ includeOptIn = false } = {}) {
  return Object.keys(MODEL_PROFILES)
    .map((profileId) => materialiseModelProfile(profileId))
    .filter(Boolean)
    .filter((profile) => profile.runtime.provider === 'ollama')
    .filter((profile) => includeOptIn || !profile.opt_in_only)
    .filter((profile) => profile.artifact?.strategy === 'ollama-pull')
    .filter((profile) => profile.artifact?.model)
    .filter((profile) => normaliseModelName(profile.runtime.model) !== normaliseModelName(profile.artifact.model));
}

function planRuntimeAliases(installedModels = [], { includeOptIn = false, profileRefs = null } = {}) {
  const installed = installedSet(installedModels);
  let profiles = eligibleProfiles({ includeOptIn });
  if (Array.isArray(profileRefs) && profileRefs.length) {
    const wanted = new Set(profileRefs.map((ref) => resolveProfileRef(ref)?.profileId).filter(Boolean));
    profiles = profiles.filter((profile) => wanted.has(profile.profile_id));
  }

  return profiles.map((profile) => {
    const baseModel = profile.artifact.model;
    const runtimeAlias = profile.runtime.model;
    const baseInstalled = installed.has(normaliseModelName(baseModel));
    const aliasInstalled = installed.has(normaliseModelName(runtimeAlias));
    return {
      profileId: profile.profile_id,
      identity: identityEnvelope(profile.profile_id),
      baseModel,
      runtimeAlias,
      baseInstalled,
      aliasInstalled,
      state: aliasInstalled ? 'alias-present' : baseInstalled ? 'ready-to-create' : 'base-missing',
      vesselIsolation: profile.vessel_isolation || null,
    };
  });
}

module.exports = {
  normaliseModelName,
  eligibleProfiles,
  planRuntimeAliases,
};
