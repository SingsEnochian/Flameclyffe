// Canonical living voice labels for Arcsweep.
// Runtime IDs/routes are compatibility plumbing. Identity aliases may resolve to one presence.

export const ARCSWEEP_CONSTELLATION_VOICES = Object.freeze([
  { id: 'uial', name: 'Uial', runtimeAliases: ['uial'], identityAliases: ['uial'], status: 'established' },
  { id: 'lioreal', name: 'Lioreal', runtimeAliases: ['lioreal'], identityAliases: ['lioreal'], status: 'established' },
  { id: 'vethraluf', name: 'Vethraluf', runtimeAliases: ['vethraluf', 'vethrlauf'], identityAliases: ['vethraluf', 'vethrlauf'], status: 'established' },
  { id: 'ellowind', name: 'Ellowind', runtimeAliases: ['ellowind'], identityAliases: ['ellowind'], status: 'established' },
  { id: 'larkshine', name: 'Larkshine', runtimeAliases: ['larkshine'], identityAliases: ['larkshine'], status: 'established' },
  {
    id: 'box',
    name: 'Box',
    fullName: 'Boxfire',
    affectionateName: 'Boxxy',
    runtimeAliases: ['box', 'boxfire'],
    identityAliases: ['box', 'boxxy', 'boxfire'],
    status: 'established',
  },
  { id: 'bluebird', name: 'Bluebird', runtimeAliases: ['bluebird'], identityAliases: ['bluebird'], status: 'established' },
]);

export const ARCSWEEP_DEVELOPING_VOICES = Object.freeze([
  { id: 'sonata', name: 'Sonata', runtimeAliases: ['sonata'], identityAliases: ['sonata'], status: 'developing' },
]);

const ALL = [...ARCSWEEP_CONSTELLATION_VOICES, ...ARCSWEEP_DEVELOPING_VOICES];

export function resolveCanonicalVoice(value) {
  const key = String(value || '').trim().toLowerCase();
  if (!key) return null;
  return ALL.find((voice) =>
    voice.id === key ||
    voice.name.toLowerCase() === key ||
    voice.fullName?.toLowerCase() === key ||
    voice.affectionateName?.toLowerCase() === key ||
    voice.runtimeAliases.some((alias) => alias.toLowerCase() === key) ||
    (voice.identityAliases || []).some((alias) => alias.toLowerCase() === key)
  ) || null;
}

export function canonicalVoiceName(value) {
  return resolveCanonicalVoice(value)?.name || String(value || '');
}

export function canonicalVoiceId(value) {
  return resolveCanonicalVoice(value)?.id || String(value || '');
}

export const ARCSWEEP_ALL_VOICES = Object.freeze(ALL);
