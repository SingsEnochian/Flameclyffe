'use strict';

const { MODEL_PROFILES, materialiseModelProfile } = require('../bifrost/model-profiles');
const { probeOllama } = require('../bifrost/ignition');
const { identityEnvelope } = require('../bifrost/profile-resolution');

function normaliseModelName(value) {
  return String(value || '').trim().replace(/:latest$/i, '');
}

function installedSet(probe) {
  return new Set((probe.models || []).map(normaliseModelName));
}

function localProfiles() {
  return Object.keys(MODEL_PROFILES)
    .map((profileId) => materialiseModelProfile(profileId))
    .filter(Boolean)
    .filter((profile) => profile.runtime.provider === 'ollama')
    .filter((profile) => !profile.opt_in_only);
}

function groupByArtifact(profiles) {
  const groups = new Map();
  for (const profile of profiles) {
    const artifactKey = profile.artifact?.model || profile.artifact?.repo || profile.source?.repo || profile.profile_id;
    if (!groups.has(artifactKey)) groups.set(artifactKey, []);
    groups.get(artifactKey).push(profile);
  }
  return groups;
}

async function buildPreflight(fetchImpl = globalThis.fetch) {
  const profiles = localProfiles();
  const endpoint = profiles[0]?.runtime?.base_url || process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
  const probe = await probeOllama(endpoint, fetchImpl);
  const installed = installedSet(probe);
  const rows = profiles.map((profile) => {
    const identity = identityEnvelope(profile.profile_id);
    const runtimeInstalled = installed.has(normaliseModelName(profile.runtime.model));
    const artifactModel = profile.artifact?.model || null;
    const artifactInstalled = artifactModel ? installed.has(normaliseModelName(artifactModel)) : false;
    return {
      identity: identity?.identityName || identity?.displayName || profile.owner,
      displayName: identity?.displayName || null,
      aliases: identity?.aliases || [],
      profileId: profile.profile_id,
      runtimeModel: profile.runtime.model,
      runtimeInstalled,
      artifactModel,
      artifactInstalled,
      sourceModel: profile.source?.repo || null,
      state: runtimeInstalled ? 'installed' : artifactInstalled ? 'alias-pending' : 'activation-pending',
      vesselIsolation: profile.vessel_isolation || null,
    };
  });

  const sharedArtifacts = [...groupByArtifact(profiles).entries()]
    .filter(([, members]) => members.length > 1)
    .map(([artifact, members]) => ({
      artifact,
      profiles: members.map((profile) => profile.profile_id),
      identities: members.map((profile) => identityEnvelope(profile.profile_id)?.identityName || profile.owner),
      runtimeAliases: members.map((profile) => profile.runtime.model),
      rule: 'shared base artifact may seed distinct runtime aliases; identities remain separate',
    }));

  return {
    contract: 'bifrost.local-preflight/v1',
    ollama: {
      endpoint,
      reachable: probe.reachable,
      error: probe.error || null,
      installedModels: probe.models || [],
    },
    profiles: rows,
    sharedArtifacts,
    rules: {
      readOnly: true,
      downloadsModels: false,
      startsOllama: false,
      distinctEntitiesRequireDistinctRuntimeAliases: true,
      sharedArtifactDoesNotMergeIdentity: true,
    },
  };
}

(async () => {
  const report = await buildPreflight();
  console.log(JSON.stringify(report, null, 2));
})().catch((error) => {
  console.error(`Bifröst preflight stopped: ${error.message}`);
  process.exitCode = 1;
});

module.exports = { buildPreflight, groupByArtifact };
