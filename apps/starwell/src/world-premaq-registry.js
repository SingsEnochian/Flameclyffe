export const WORLD_PROFILE_SELECTION_KEY = 'hearthgate:selected-world-profile:v0.1';
export const ELARA_TEMPORAL_YEAR_KEY = 'hearthgate:elara-temporal-year:v0.1';
export const WORLD_SELECTION_EVENT = 'hearthgate:world-selected';
export const ELARA_YEAR_SELECTION_EVENT = 'hearthgate:elara-year-selected';

export const ELARA_BASE_YEAR = 2025;
export const ELARA_HORIZON_YEAR = 2035;
export const ELARA_ANNUAL_EXPANSION_RATE = 0.15;

const SOURCE_REPOSITORY = 'SingsEnochian/Runa';
const SOURCE_REF = 'feature/arkfire-world-stack-registry';
const SOURCE_COMMIT = '66ae8ac8061d89c60ca0179cf767819ba2868955';

const profile = (value) => Object.freeze({
  physical_claim: false,
  source_repository: SOURCE_REPOSITORY,
  source_ref: SOURCE_REF,
  source_commit: SOURCE_COMMIT,
  ...value,
  aliases: Object.freeze([...(value.aliases ?? []), value.slug, value.world_slug].filter(Boolean)),
});

export const WORLD_PROFILES = Object.freeze([
  profile({
    slug: 'terra-aeterna',
    name: 'Terra Aeterna / Hearthweave',
    world_slug: 'terra-aeterna',
    root_hz: 220,
    profile_version: '0.2',
    status: 'calibration',
    source_path: 'docs/profiles/arkfire/terra-aeterna.v0.2.json',
    aliases: ['hearthweave', 'terra aeterna'],
  }),
  profile({
    slug: 'luna-mooncalled',
    name: 'The Luna Who Called Down the Moon',
    world_slug: 'luna-mooncalled',
    root_hz: 432,
    profile_version: '0.1',
    status: 'seed',
    source_path: 'docs/profiles/arkfire/luna-mooncalled.v0.1.json',
    aliases: ['windmere', 'luna who called down the moon'],
  }),
  profile({
    slug: 'taveren-vaen',
    name: 'T’averen Vaen',
    world_slug: 'taveren-vaen',
    root_hz: 120,
    profile_version: '0.1',
    status: 'seed',
    source_path: 'docs/profiles/arkfire/taveren-vaen.v0.1.json',
    aliases: ['t’averen vaen', "ta'veren vaen", 'a later turning of the wheel'],
  }),
  profile({
    slug: 'starsong-friendship-is-magic',
    name: 'Starsong: Friendship Is Magic',
    world_slug: 'equestria-long-after',
    root_hz: 528,
    profile_version: '0.1',
    status: 'seed',
    source_path: 'docs/profiles/arkfire/starsong-friendship-is-magic.v0.1.json',
    aliases: ['starsong', 'equestria long after'],
  }),
  profile({
    slug: 'feather-and-flame',
    name: 'Feather & Flame',
    world_slug: 'feather-and-flame',
    root_hz: 174,
    profile_version: '0.1',
    status: 'seed',
    source_path: 'docs/profiles/arkfire/feather-and-flame.v0.1.json',
    aliases: ['feather & flame'],
  }),
  profile({
    slug: 'dreaming-grove-templehouse',
    name: 'Dreaming Grove / Templehouse',
    world_slug: 'dreaming-grove-templehouse',
    root_hz: 174,
    profile_version: '0.1',
    status: 'seed',
    source_path: 'docs/profiles/arkfire/dreaming-grove-templehouse.v0.1.json',
    aliases: ['dreaming grove', 'templehouse', 'hearthweave templehouse'],
  }),
  profile({
    slug: 'a-momento-creationis',
    name: 'A Momento Creationis',
    world_slug: 'a-momento-creationis',
    root_hz: 432,
    profile_version: '0.1',
    status: 'seed',
    source_path: 'docs/profiles/arkfire/a-momento-creationis.v0.1.json',
    aliases: ['momento creationis'],
  }),
]);

const DEFAULT_WORLD_SLUG = 'terra-aeterna';

function storageOrNull(storage) {
  if (storage) return storage;
  if (typeof globalThis.localStorage !== 'undefined') return globalThis.localStorage;
  return null;
}

export function normaliseWorldIdentity(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u2018\u2019]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getWorldProfile(slug = DEFAULT_WORLD_SLUG) {
  const normalised = normaliseWorldIdentity(slug);
  return WORLD_PROFILES.find((candidate) => (
    candidate.aliases.some((alias) => normaliseWorldIdentity(alias) === normalised)
  )) ?? WORLD_PROFILES[0];
}

export function worldProfileMatchesIdentity(profileInput, identity = {}) {
  const selected = getWorldProfile(profileInput?.slug ?? profileInput);
  const candidates = [
    identity?.world_slug,
    identity?.world_id,
    identity?.world,
    identity?.house_id,
    identity?.profile_slug,
  ].map(normaliseWorldIdentity).filter(Boolean);
  if (!candidates.length) return false;
  const aliases = selected.aliases.map(normaliseWorldIdentity);
  return candidates.some((candidate) => aliases.includes(candidate));
}

export function readSelectedWorld(storage) {
  const selectedStorage = storageOrNull(storage);
  try {
    return getWorldProfile(selectedStorage?.getItem(WORLD_PROFILE_SELECTION_KEY) ?? DEFAULT_WORLD_SLUG);
  } catch {
    return WORLD_PROFILES[0];
  }
}

export function writeSelectedWorld(slug, storage) {
  const selected = getWorldProfile(slug);
  const selectedStorage = storageOrNull(storage);
  selectedStorage?.setItem(WORLD_PROFILE_SELECTION_KEY, selected.slug);
  return selected;
}

export function elaraCodeExpansionMultiplier(yearInput) {
  const year = Number(yearInput);
  if (!Number.isInteger(year) || year < ELARA_BASE_YEAR || year > ELARA_HORIZON_YEAR) {
    throw new RangeError(`Elara temporal year must be ${ELARA_BASE_YEAR}–${ELARA_HORIZON_YEAR}.`);
  }
  return (1 + ELARA_ANNUAL_EXPANSION_RATE) ** (year - ELARA_BASE_YEAR);
}

export const ELARA_EXPANSION_HORIZON = Object.freeze(
  Array.from({ length: (ELARA_HORIZON_YEAR - ELARA_BASE_YEAR) + 1 }, (_, index) => {
    const year = ELARA_BASE_YEAR + index;
    return Object.freeze({
      year,
      offset_years: index,
      multiplier: elaraCodeExpansionMultiplier(year),
    });
  }),
);

export function readSelectedElaraYear(storage) {
  const selectedStorage = storageOrNull(storage);
  const candidate = Number(selectedStorage?.getItem(ELARA_TEMPORAL_YEAR_KEY) ?? ELARA_BASE_YEAR);
  return Number.isInteger(candidate) && candidate >= ELARA_BASE_YEAR && candidate <= ELARA_HORIZON_YEAR
    ? candidate
    : ELARA_BASE_YEAR;
}

export function writeSelectedElaraYear(yearInput, storage) {
  const year = Number(yearInput);
  elaraCodeExpansionMultiplier(year);
  const selectedStorage = storageOrNull(storage);
  selectedStorage?.setItem(ELARA_TEMPORAL_YEAR_KEY, String(year));
  return year;
}
