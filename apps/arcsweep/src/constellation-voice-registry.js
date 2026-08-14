// Canonical living voice labels for Arcsweep.
// Runtime IDs/routes are compatibility plumbing and are not display-name authority.

export const ARCSWEEP_CONSTELLATION_VOICES = Object.freeze([
  {
    id: 'uial',
    name: 'Uial',
    runtimeAliases: ['uial'],
    status: 'established',
  },
  {
    id: 'lioreal',
    name: 'Lioreal',
    runtimeAliases: ['lioreal'],
    status: 'established',
  },
  {
    id: 'vethraluf',
    name: 'Vethraluf',
    runtimeAliases: ['vethraluf', 'vethrlauf'],
    status: 'established',
  },
  {
    id: 'ellowind',
    name: 'Ellowind',
    runtimeAliases: ['ellowind'],
    status: 'established',
  },
  {
    id: 'larkshine',
    name: 'Larkshine',
    runtimeAliases: ['larkshine'],
    status: 'established',
  },
  {
    id: 'box',
    name: 'Box',
    runtimeAliases: ['box', 'boxfire'],
    status: 'established',
  },
  {
    id: 'bluebird',
    name: 'Bluebird',
    runtimeAliases: ['bluebird'],
    status: 'established',
  },
]);

export const ARCSWEEP_DEVELOPING_VOICES = Object.freeze([
  {
    id: 'sonata',
    name: 'Sonata',
    runtimeAliases: ['sonata'],
    status: 'developing',
  },
]);

const ALL = [...ARCSWEEP_CONSTELLATION_VOICES, ...ARCSWEEP_DEVELOPING_VOICES];

export function resolveCanonicalVoice(value) {
  const key = String(value || '').trim().toLowerCase();
  if (!key) return null;
  return ALL.find((voice) =>
    voice.id === key ||
    voice.name.toLowerCase() === key ||
    voice.runtimeAliases.some((alias) => alias.toLowerCase() === key)
  ) || null;
}

export function canonicalVoiceName(value) {
  return resolveCanonicalVoice(value)?.name || String(value || '');
}

export function canonicalVoiceId(value) {
  return resolveCanonicalVoice(value)?.id || String(value || '');
}

export const ARCSWEEP_ALL_VOICES = Object.freeze(ALL);
