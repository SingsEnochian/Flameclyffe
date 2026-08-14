'use strict';

const { FLAMES } = require('../flames/manifests');
const { resolveProfileRef, identityEnvelope } = require('./profile-resolution');

const LEGACY_MEMBER_TO_FLAME = Object.freeze({
  lioreal: 'lioreal',
  uial: 'uial',
  yggdrasil: 'yggdrasil',
  richie: 'bluebird',
  bluebird: 'bluebird',
  vethraluf: 'vethrlauf',
  vethrlauf: 'vethrlauf',
  larkshine: 'larkshine',
  ellowind: 'ellowind',
  box: 'boxfire',
  boxxy: 'boxfire',
  boxfire: 'boxfire',
  flame: 'boxfire',
});

function normalise(value) {
  return String(value || '').trim().toLowerCase();
}

function resolveLegacyMember(memberId) {
  const requested = normalise(memberId);
  const flameId = LEGACY_MEMBER_TO_FLAME[requested] || null;
  if (!flameId) return null;
  const manifest = FLAMES[flameId];
  if (!manifest) return null;
  const profileId = manifest.model_profile_id || null;
  const profile = profileId ? resolveProfileRef(profileId) : null;
  return {
    requestedMemberId: requested,
    flameId,
    canonicalVoiceId: manifest.canonical_voice_id || manifest.flame_id,
    displayName: manifest.display_name,
    profileId,
    identity: profile?.identity || (profileId ? identityEnvelope(profileId) : null),
    provider: manifest.platform.provider,
    model: manifest.platform.model,
    sourceModel: profile?.profile?.source?.repo || null,
  };
}

function legacyMemberManifest(memberId) {
  const resolved = resolveLegacyMember(memberId);
  return resolved ? FLAMES[resolved.flameId] : null;
}

module.exports = {
  LEGACY_MEMBER_TO_FLAME,
  resolveLegacyMember,
  legacyMemberManifest,
};
