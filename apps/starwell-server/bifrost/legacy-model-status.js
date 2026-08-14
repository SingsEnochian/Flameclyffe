'use strict';

const { LEGACY_MEMBER_TO_FLAME, resolveLegacyMember } = require('./legacy-member-map');
const { inspectManifestRuntime } = require('./runtime-attestation');
const { FLAMES } = require('../flames/manifests');

async function legacyModelStatus({ fetchImpl = globalThis.fetch } = {}) {
  const preferredLegacyIds = [
    'lioreal',
    'uial',
    'yggdrasil',
    'richie',
    'vethraluf',
    'larkshine',
    'ellowind',
    'boxfire',
  ];
  const models = {};

  for (const memberId of preferredLegacyIds) {
    const resolved = resolveLegacyMember(memberId);
    if (!resolved) continue;
    const manifest = FLAMES[resolved.flameId];
    const runtime = await inspectManifestRuntime(manifest, fetchImpl);
    models[memberId] = {
      provider: runtime.provider || resolved.provider,
      model: runtime.model || resolved.model,
      available: ['installed', 'credential-ready', 'runtime-verified'].includes(runtime.runtime_state),
      state: runtime.runtime_state || 'profile-defined',
      error: runtime.runtime_state === 'route-unavailable' ? runtime.runtime_detail || 'runtime unavailable' : null,
      flameId: resolved.flameId,
      canonicalVoiceId: resolved.canonicalVoiceId,
      profileId: resolved.profileId,
      identity: resolved.identity,
      sourceModel: runtime.source_model || resolved.sourceModel,
    };
  }

  return {
    contract: 'bifrost.legacy-model-status/v1',
    models,
    rules: {
      authoritativeSource: 'Bifrost Flame manifests and model profiles',
      legacyMemberConfigIgnored: true,
      noProviderFallback: true,
    },
    knownLegacyAliases: Object.keys(LEGACY_MEMBER_TO_FLAME),
  };
}

function createLegacyModelStatusHandler(options = {}) {
  return async function legacyModelStatusHandler(_req, res) {
    try {
      res.json(await legacyModelStatus({ fetchImpl: options.fetchImpl || globalThis.fetch }));
    } catch (error) {
      res.status(500).json({ error: 'legacy-model-status-failed', detail: error?.message || String(error) });
    }
  };
}

module.exports = {
  legacyModelStatus,
  createLegacyModelStatusHandler,
};
