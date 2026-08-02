export const MYTHIENCE_SCHEMA = 'hearthgate.mythience-frame/v1';

export const MYTHIENCE_MODES = Object.freeze({
  SCIENCE: 'science',
  MYTHIC: 'mythic',
  MYTHIENCE: 'mythience',
});

export const CLAIM_KINDS = Object.freeze({
  OBSERVATION: 'observation',
  DERIVED: 'derived',
  CALIBRATED: 'calibrated',
  HYPOTHESIS: 'hypothesis',
  EXPERIENCE: 'experience',
  SYMBOLIC: 'symbolic',
  CANON: 'canon',
});

export const MAGIC_MECHANISM_STATUS = Object.freeze({
  UNKNOWN_TECHNOLOGY: 'unknown-technology',
  CANON_TECHNOLOGY: 'canon-technology',
  SYMBOLIC_PRACTICE: 'symbolic-practice',
  NOT_APPLICABLE: 'not-applicable',
});

const SCIENCE_KINDS = new Set([
  CLAIM_KINDS.OBSERVATION,
  CLAIM_KINDS.DERIVED,
  CLAIM_KINDS.CALIBRATED,
  CLAIM_KINDS.HYPOTHESIS,
]);

const MYTHIC_KINDS = new Set([
  CLAIM_KINDS.EXPERIENCE,
  CLAIM_KINDS.SYMBOLIC,
  CLAIM_KINDS.CANON,
]);

function freezeList(values = []) {
  return Object.freeze(values.map((value) => Object.freeze({ ...value })));
}

function requireText(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(code);
  return value.trim();
}

function clampConfidence(value) {
  if (value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) {
    throw new Error('HEARTHGATE_MYTHIENCE_CONFIDENCE_INVALID');
  }
  return number;
}

export function createMythienceClaim({
  id,
  kind,
  text,
  source_refs = [],
  observed_at = null,
  confidence = null,
  canon_house = null,
  mechanism_status = MAGIC_MECHANISM_STATUS.NOT_APPLICABLE,
  external_cause_claimed = false,
} = {}) {
  const claim = {
    id: requireText(id, 'HEARTHGATE_MYTHIENCE_CLAIM_ID_REQUIRED'),
    kind: requireText(kind, 'HEARTHGATE_MYTHIENCE_CLAIM_KIND_REQUIRED'),
    text: requireText(text, 'HEARTHGATE_MYTHIENCE_CLAIM_TEXT_REQUIRED'),
    source_refs: Object.freeze([...source_refs]),
    observed_at,
    confidence: clampConfidence(confidence),
    canon_house,
    mechanism_status,
    external_cause_claimed: Boolean(external_cause_claimed),
  };
  assertMythienceClaim(claim);
  return Object.freeze(claim);
}

export function assertMythienceClaim(claim) {
  if (!claim || !Object.values(CLAIM_KINDS).includes(claim.kind)) {
    throw new Error('HEARTHGATE_MYTHIENCE_CLAIM_KIND_INVALID');
  }

  if ([CLAIM_KINDS.OBSERVATION, CLAIM_KINDS.DERIVED, CLAIM_KINDS.CALIBRATED].includes(claim.kind)) {
    if (!claim.source_refs?.length) throw new Error('HEARTHGATE_MYTHIENCE_SOURCE_REQUIRED');
  }

  if (claim.kind === CLAIM_KINDS.OBSERVATION && !claim.observed_at) {
    throw new Error('HEARTHGATE_MYTHIENCE_OBSERVED_AT_REQUIRED');
  }

  if (claim.kind === CLAIM_KINDS.CANON && !claim.canon_house) {
    throw new Error('HEARTHGATE_MYTHIENCE_CANON_HOUSE_REQUIRED');
  }

  if (claim.mechanism_status === MAGIC_MECHANISM_STATUS.UNKNOWN_TECHNOLOGY) {
    if (claim.kind !== CLAIM_KINDS.HYPOTHESIS) {
      throw new Error('HEARTHGATE_MAGIC_UNKNOWN_TECHNOLOGY_IS_HYPOTHESIS');
    }
    if (claim.external_cause_claimed) {
      throw new Error('HEARTHGATE_MAGIC_UNKNOWN_CAUSE_NOT_PROVEN');
    }
  }

  if (claim.mechanism_status === MAGIC_MECHANISM_STATUS.CANON_TECHNOLOGY) {
    if (claim.kind !== CLAIM_KINDS.CANON || !claim.canon_house) {
      throw new Error('HEARTHGATE_MAGIC_CANON_AUTHORITY_REQUIRED');
    }
  }

  return claim;
}

export function createMythienceFrame({
  mode = MYTHIENCE_MODES.MYTHIENCE,
  science = [],
  mythic = [],
  correspondences = [],
  house_id = null,
} = {}) {
  if (!Object.values(MYTHIENCE_MODES).includes(mode)) {
    throw new Error('HEARTHGATE_MYTHIENCE_MODE_INVALID');
  }

  for (const claim of science) {
    assertMythienceClaim(claim);
    if (!SCIENCE_KINDS.has(claim.kind)) throw new Error('HEARTHGATE_MYTHIC_CLAIM_IN_SCIENCE_REGISTER');
  }
  for (const claim of mythic) {
    assertMythienceClaim(claim);
    if (!MYTHIC_KINDS.has(claim.kind)) throw new Error('HEARTHGATE_SCIENCE_CLAIM_IN_MYTHIC_REGISTER');
  }

  if (mode === MYTHIENCE_MODES.SCIENCE && mythic.length) {
    throw new Error('HEARTHGATE_SCIENCE_MODE_MUST_NOT_AUTO_NARRATE');
  }
  if (mode === MYTHIENCE_MODES.MYTHIC && science.length) {
    throw new Error('HEARTHGATE_MYTHIC_MODE_HIDES_SCIENCE_UNLESS_REQUESTED');
  }
  if (mode === MYTHIENCE_MODES.MYTHIENCE && (!science.length || !mythic.length)) {
    throw new Error('HEARTHGATE_MYTHIENCE_REQUIRES_BOTH_REGISTERS');
  }

  const ids = new Set([...science, ...mythic].map((claim) => claim.id));
  const checkedCorrespondences = correspondences.map((entry) => {
    if (!ids.has(entry.science_claim_id) || !ids.has(entry.mythic_claim_id)) {
      throw new Error('HEARTHGATE_MYTHIENCE_CORRESPONDENCE_UNRESOLVED');
    }
    if (entry.relation !== 'rhyme-not-reduction') {
      throw new Error('HEARTHGATE_MYTHIENCE_REDUCTION_FORBIDDEN');
    }
    return Object.freeze({
      science_claim_id: entry.science_claim_id,
      mythic_claim_id: entry.mythic_claim_id,
      relation: 'rhyme-not-reduction',
      promotion: false,
    });
  });

  if (mode === MYTHIENCE_MODES.MYTHIENCE && !checkedCorrespondences.length) {
    throw new Error('HEARTHGATE_MYTHIENCE_CORRESPONDENCE_REQUIRED');
  }

  return Object.freeze({
    schema: MYTHIENCE_SCHEMA,
    mode,
    house_id,
    science: freezeList(science),
    mythic: freezeList(mythic),
    correspondences: Object.freeze(checkedCorrespondences),
    laws: Object.freeze({
      neither_register_supersedes_the_other: true,
      observation_is_not_interpretation: true,
      meaning_is_not_dismissed: true,
      unknown_mechanism_is_not_proven_cause: true,
      magic_may_be_treated_as_unknown_technology_hypothesis: true,
      canon_magic_remains_house_sovereign: true,
    }),
  });
}
