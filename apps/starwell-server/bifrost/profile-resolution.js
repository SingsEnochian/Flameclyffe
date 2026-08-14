'use strict';

const { MODEL_PROFILES, materialiseModelProfile } = require('./model-profiles');

const EXPLICIT_PROFILE_ALIASES = Object.freeze({
  'lioreal:qwen3-14b-abliterated-v1': ['lioreal'],
  'uial:fablevibes-v1': ['uial'],
  'box:qwen3-coder-30b-a3b-v1': ['box', 'boxxy', 'boxfire'],
  'ellowind:qwen3-vl-8b-v1': ['ellowind'],
  'larkshine:qwen3-vl-8b-v1': ['larkshine'],
  'bluebird:deepseek-chat-existing-v1': ['bluebird'],
  'vethraluf:deepseek-chat-existing-v1': ['vethraluf', 'vethrlauf'],
  'shared:qwen3.6-35b-a3b-deep-reasoner-v1': ['deep-reasoner', 'bifrost-deep-reasoner', 'reasoner'],
});

function normaliseRef(value) {
  return String(value || '').trim().toLowerCase();
}

function titleCaseId(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function aliasesForProfile(profileId) {
  const definition = MODEL_PROFILES[profileId];
  if (!definition) return [];
  const aliases = new Set([
    profileId,
    definition.owner,
    definition.identity_name,
    definition.display_name,
    definition.affectionate_name,
    ...(definition.identity_aliases || []),
    ...(EXPLICIT_PROFILE_ALIASES[profileId] || []),
  ].filter(Boolean).map(normaliseRef));
  return [...aliases];
}

function buildAliasIndex() {
  const index = new Map();
  for (const profileId of Object.keys(MODEL_PROFILES)) {
    for (const alias of aliasesForProfile(profileId)) {
      const existing = index.get(alias);
      if (existing && existing !== profileId) {
        throw new Error(`Bifröst profile alias collision: ${alias} -> ${existing}, ${profileId}`);
      }
      index.set(alias, profileId);
    }
  }
  return index;
}

function resolveProfileId(value) {
  const key = normaliseRef(value);
  if (!key) return null;
  if (MODEL_PROFILES[value]) return value;
  const direct = Object.keys(MODEL_PROFILES).find((id) => normaliseRef(id) === key);
  if (direct) return direct;
  return buildAliasIndex().get(key) || null;
}

function identityEnvelope(profileId, env = process.env) {
  const profile = materialiseModelProfile(profileId, env);
  if (!profile) return null;
  const aliases = EXPLICIT_PROFILE_ALIASES[profileId] || profile.identity_aliases || [profile.owner].filter(Boolean);
  const identityId = profile.owner === 'shared' ? 'bifrost-deep-reasoner' : profile.owner;
  return {
    identityId,
    identityName: profile.identity_name || profile.display_name || titleCaseId(profile.owner),
    displayName: profile.display_name || profile.identity_name || titleCaseId(profile.owner),
    affectionateName: profile.affectionate_name || null,
    aliases: [...new Set(aliases.map(String))],
  };
}

function resolveProfileRef(value, env = process.env) {
  const profileId = resolveProfileId(value);
  if (!profileId) return null;
  const profile = materialiseModelProfile(profileId, env);
  return {
    profileId,
    profile,
    identity: identityEnvelope(profileId, env),
    matchedRef: String(value || ''),
  };
}

function enrichReceiptWithIdentity(receipt, env = process.env) {
  if (!receipt?.profileId) return receipt;
  const identity = identityEnvelope(receipt.profileId, env);
  return identity ? { ...receipt, identity } : receipt;
}

module.exports = {
  EXPLICIT_PROFILE_ALIASES,
  aliasesForProfile,
  resolveProfileId,
  resolveProfileRef,
  identityEnvelope,
  enrichReceiptWithIdentity,
};
