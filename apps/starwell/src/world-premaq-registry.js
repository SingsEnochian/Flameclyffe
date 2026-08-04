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

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const round4 = (value) => Number(value.toFixed(4));

function calibratePremaq(features) {
  const presence = clamp01(
    0.45
    + (0.06 * Math.min(features.layer_count, 6))
    + (0.04 * (Math.min(features.phase_count, 5) / 5))
    + (0.05 * Number(features.has_return)),
  );
  const coherence = clamp01(
    0.50
    + (0.18 * features.phase_continuous_ratio)
    + (0.08 * features.sync_weight)
    + (0.04 * Math.min(features.harmonic_links, 4)),
  );
  const resonance = clamp01(
    0.42
    + (0.07 * Math.min(features.tonal_layer_count, 6))
    + (0.06 * Math.min(features.harmonic_links, 4))
    + (0.05 * Number(features.has_protected_binaural)),
  );
  const entropy = clamp01(
    0.12
    + (0.06 * features.noise_layer_count)
    + (0.035 * Math.min(features.modulated_layer_count, 6))
    + (0.03 * Math.min(features.spatial_layer_count, 6)),
  );
  const memory = clamp01(
    0.48
    + (0.16 * Number(features.has_return))
    + (0.12 * features.phase_continuous_ratio)
    + (0.0015 * Math.min(features.macro_cycle_seconds, 120)),
  );
  const agency = clamp01(
    0.58
    + (0.12 * Number(!features.automatic_start_allowed))
    + (0.12 * Number(features.approval_required))
    + (0.025 * Math.min(features.variant_count, 6)),
  );
  const qualia = clamp01(
    0.44
    + (0.03 * Math.min(features.palette_count, 8))
    + (0.04 * Math.min(features.distinct_role_count, 8))
    + (0.04 * Number(features.world_specific_signature)),
  );

  return Object.freeze({
    P: round4(presence),
    C: round4(coherence),
    R: round4(resonance),
    E: round4(entropy),
    M: round4(memory),
    A: round4(agency),
    Q: round4(qualia),
  });
}

const profile = (value) => {
  const calibrationFeatures = Object.freeze({ ...value.calibration_features });
  const premaq = calibratePremaq(calibrationFeatures);
  return Object.freeze({
    physical_claim: false,
    source_repository: SOURCE_REPOSITORY,
    source_ref: SOURCE_REF,
    source_commit: SOURCE_COMMIT,
    ...value,
    calibration_features: calibrationFeatures,
    premaq,
    aliases: Object.freeze([...(value.aliases ?? []), value.slug, value.world_slug].filter(Boolean)),
  });
};

export const TARGET_PREMAQ_CALIBRATION_FORMULA = Object.freeze({
  schema: 'hearthgate.target-world-premaq-calibration/v0.1',
  physical_claim: false,
  basis: 'Deterministic projection from the accepted Arkfire world-profile structure.',
  equations: Object.freeze({
    P: 'clamp01(0.45 + 0.06·min(layer_count,6) + 0.04·min(phase_count,5)/5 + 0.05·has_return)',
    C: 'clamp01(0.50 + 0.18·phase_continuous_ratio + 0.08·sync_weight + 0.04·min(harmonic_links,4))',
    R: 'clamp01(0.42 + 0.07·min(tonal_layer_count,6) + 0.06·min(harmonic_links,4) + 0.05·has_protected_binaural)',
    E: 'clamp01(0.12 + 0.06·noise_layer_count + 0.035·min(modulated_layer_count,6) + 0.03·min(spatial_layer_count,6))',
    M: 'clamp01(0.48 + 0.16·has_return + 0.12·phase_continuous_ratio + 0.0015·min(macro_cycle_seconds,120))',
    A: 'clamp01(0.58 + 0.12·¬automatic_start_allowed + 0.12·approval_required + 0.025·min(variant_count,6))',
    Q: 'clamp01(0.44 + 0.03·min(palette_count,8) + 0.04·min(distinct_role_count,8) + 0.04·world_specific_signature)',
  }),
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
    calibration_features: {
      layer_count: 8,
      tonal_layer_count: 7,
      modulated_layer_count: 3,
      spatial_layer_count: 4,
      noise_layer_count: 1,
      phase_count: 5,
      variant_count: 3,
      macro_cycle_seconds: 55,
      has_return: true,
      automatic_start_allowed: false,
      approval_required: true,
      phase_continuous_ratio: 1,
      harmonic_links: 4,
      has_protected_binaural: true,
      palette_count: 6,
      distinct_role_count: 8,
      world_specific_signature: true,
      sync_weight: 0.75,
    },
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
    calibration_features: {
      layer_count: 4,
      tonal_layer_count: 3,
      modulated_layer_count: 2,
      spatial_layer_count: 1,
      noise_layer_count: 1,
      phase_count: 5,
      variant_count: 2,
      macro_cycle_seconds: 72,
      has_return: true,
      automatic_start_allowed: false,
      approval_required: true,
      phase_continuous_ratio: 1,
      harmonic_links: 0,
      has_protected_binaural: false,
      palette_count: 6,
      distinct_role_count: 4,
      world_specific_signature: true,
      sync_weight: 0.5,
    },
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
    calibration_features: {
      layer_count: 4,
      tonal_layer_count: 3,
      modulated_layer_count: 2,
      spatial_layer_count: 1,
      noise_layer_count: 1,
      phase_count: 5,
      variant_count: 2,
      macro_cycle_seconds: 96,
      has_return: true,
      automatic_start_allowed: false,
      approval_required: true,
      phase_continuous_ratio: 1,
      harmonic_links: 2,
      has_protected_binaural: false,
      palette_count: 5,
      distinct_role_count: 4,
      world_specific_signature: true,
      sync_weight: 0.5,
    },
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
    calibration_features: {
      layer_count: 5,
      tonal_layer_count: 4,
      modulated_layer_count: 2,
      spatial_layer_count: 1,
      noise_layer_count: 1,
      phase_count: 5,
      variant_count: 2,
      macro_cycle_seconds: 48,
      has_return: true,
      automatic_start_allowed: false,
      approval_required: true,
      phase_continuous_ratio: 1,
      harmonic_links: 1,
      has_protected_binaural: false,
      palette_count: 5,
      distinct_role_count: 5,
      world_specific_signature: true,
      sync_weight: 0.5,
    },
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
    calibration_features: {
      layer_count: 4,
      tonal_layer_count: 3,
      modulated_layer_count: 2,
      spatial_layer_count: 1,
      noise_layer_count: 1,
      phase_count: 5,
      variant_count: 2,
      macro_cycle_seconds: 64,
      has_return: true,
      automatic_start_allowed: false,
      approval_required: true,
      phase_continuous_ratio: 1,
      harmonic_links: 1,
      has_protected_binaural: false,
      palette_count: 5,
      distinct_role_count: 4,
      world_specific_signature: true,
      sync_weight: 1,
    },
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
    calibration_features: {
      layer_count: 4,
      tonal_layer_count: 3,
      modulated_layer_count: 2,
      spatial_layer_count: 1,
      noise_layer_count: 1,
      phase_count: 5,
      variant_count: 2,
      macro_cycle_seconds: 80,
      has_return: true,
      automatic_start_allowed: false,
      approval_required: true,
      phase_continuous_ratio: 1,
      harmonic_links: 0,
      has_protected_binaural: false,
      palette_count: 5,
      distinct_role_count: 4,
      world_specific_signature: true,
      sync_weight: 0.25,
    },
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
    calibration_features: {
      layer_count: 5,
      tonal_layer_count: 4,
      modulated_layer_count: 2,
      spatial_layer_count: 1,
      noise_layer_count: 1,
      phase_count: 5,
      variant_count: 3,
      macro_cycle_seconds: 60,
      has_return: true,
      automatic_start_allowed: false,
      approval_required: true,
      phase_continuous_ratio: 1,
      harmonic_links: 2,
      has_protected_binaural: false,
      palette_count: 5,
      distinct_role_count: 5,
      world_specific_signature: true,
      sync_weight: 0.5,
    },
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

export function targetWorldPremaq(slug = DEFAULT_WORLD_SLUG) {
  return getWorldProfile(slug).premaq;
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
