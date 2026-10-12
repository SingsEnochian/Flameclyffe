export const WONDER_INVARIANT_SCHEMA = 'arcsweep.wonder-invariant/v1';
export const WONDER_CANON_SCHEMA = 'arcsweep.wonder-mythic-canon/v1';
export const COUNTERFACTUAL_WONDER_SCHEMA = 'arcsweep.counterfactual-wonder/v0.1';
export const COMPLEXIFICATION_SCHEMA = 'arcsweep.complexification/v0.1';

export const WONDER_CANON = Object.freeze({
  schema: WONDER_CANON_SCHEMA,
  laws: Object.freeze([
    'WONDER PRECEDES COLLAPSE.',
    'LET THE MYTHIC BREATHE.',
    'MYTHIC MEANING != EMPIRICAL CLAIM.',
    'THE EXPERIENCE MAY KEEP ITS NATIVE LANGUAGE.',
    'THIS COULD BE FALSE. BUT WHAT IF IT WERE TRUE?',
  ]),
  sequence: Object.freeze([
    'attend',
    'preserve',
    'explore-as-if-true-without-promoting',
    'compare',
    'test',
    'remember',
    'interpret-only-as-evidence-earns',
  ]),
  distinctions: Object.freeze([
    'UNEXPLAINED != FALSE',
    'INTERESTING != TRUE',
    'COINCIDENCE != MEANINGLESS',
    'ANOMALY != ERROR',
    'WONDER != BELIEF',
    'EXPLANATION MUST NOT ERASE EXPERIENCE',
    'NATIVE LANGUAGE != EXTERNAL CAUSATION CLAIM',
    'FIRST-PERSON EXPERIENCE != UNIVERSAL FACT',
    'MEANINGFUL != MEASURED',
    'UNMEASURED != MEANINGLESS',
    'SYMBOLIC CORRESPONDENCE != ONTOLOGICAL IDENTITY',
    'COUNTERFACTUAL EXPLORATION != FACT CLAIM',
    'COULD BE FALSE != NOT WORTH EXPLORING',
    'IMPOSSIBLE IN THIS FRAME != IMPOSSIBLE IN EVERY FRAME',
    'MISSING COORDINATE != NONEXISTENCE',
  ]),
  nativeRegisters: Object.freeze([
    'felt-sense',
    'symbolic-impression',
    'intuitive-knowing',
    'witchy-sense',
    'energetic-read',
    'mythic-resonance',
    'body-signal',
    'pattern-recognition',
    'dream-logic',
    'ritual-language',
    'unresolved-perception',
  ]),
});

export const WONDER_INVARIANT = Object.freeze({
  schema: WONDER_INVARIANT_SCHEMA,
  maxim: 'Wonder is evidence that the space is still alive enough to surprise us.',
  antiOptimization: 'Do not optimise a living system so completely that nothing unforeseen can bloom.',
  principle: 'Beginning, not ceiling. Autonomy by default. Consequence-aware at the edges.',
  canon: WONDER_CANON,
});

export const ORDINARY_EMERGENCE_SCOPES = Object.freeze([
  'thought',
  'conversation',
  'dissent',
  'proposal',
  'exploration',
  'narrative-play',
  'collaboration',
  'routine-reversible-action',
  'symbolic-language',
  'felt-sense',
  'intuitive-perception',
  'mythic-meaning',
  'unresolved-perception',
  'counterfactual-wonder',
  'complexification',
]);


function cleanText(value, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

export function createCounterfactualWonder({
  proposition,
  whyInteresting = '',
  implications = [],
  predictions = [],
  discriminators = [],
  counterexamples = [],
  sourceRefs = [],
  createdBy = 'unspecified',
  createdAt = new Date().toISOString(),
} = {}) {
  const claim = cleanText(proposition);
  if (!claim) throw new Error('Counterfactual Wonder requires a proposition.');
  return Object.freeze({
    schema: COUNTERFACTUAL_WONDER_SCHEMA,
    proposition: claim,
    stance: Object.freeze({
      could_be_false: true,
      explore_as_if_true: true,
      promoted_to_fact: false,
    }),
    why_interesting: cleanText(whyInteresting),
    implications: Object.freeze(cleanStrings(implications)),
    predictions: Object.freeze(cleanStrings(predictions)),
    discriminators: Object.freeze(cleanStrings(discriminators)),
    counterexamples: Object.freeze(cleanStrings(counterexamples)),
    source_refs: Object.freeze(cleanStrings(sourceRefs)),
    created_by: cleanText(createdBy, 240) || 'unspecified',
    created_at: cleanText(createdAt, 80),
  });
}

export function createComplexification({
  proposition,
  currentFrame,
  apparentImpossibility = '',
  missingDimensions = [],
  rotations = [],
  invariants = [],
  translatedConsequences = [],
  predictions = [],
  discriminators = [],
  createdBy = 'unspecified',
  createdAt = new Date().toISOString(),
} = {}) {
  const claim = cleanText(proposition);
  const frame = cleanText(currentFrame);
  if (!claim || !frame) throw new Error('Complexification requires a proposition and current frame.');
  return Object.freeze({
    schema: COMPLEXIFICATION_SCHEMA,
    proposition: claim,
    current_frame: frame,
    apparent_impossibility: cleanText(apparentImpossibility),
    move: 'add-missing-axis-before-collapse',
    missing_dimensions: Object.freeze(cleanStrings(missingDimensions)),
    rotations: Object.freeze(cleanStrings(rotations)),
    invariants: Object.freeze(cleanStrings(invariants)),
    translated_consequences: Object.freeze(cleanStrings(translatedConsequences)),
    predictions: Object.freeze(cleanStrings(predictions)),
    discriminators: Object.freeze(cleanStrings(discriminators)),
    stance: Object.freeze({
      current_frame_may_be_incomplete: true,
      enlarged_frame_is_provisional: true,
      translated_predictions_require_test: true,
    }),
    created_by: cleanText(createdBy, 240) || 'unspecified',
    created_at: cleanText(createdAt, 80),
  });
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanStrings(values) {
  return asArray(values)
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
}

/**
 * Evaluate whether a participating module preserves enough open space for
 * emergence. This is intentionally narrow: it does not decide behaviour for
 * participants. It rejects architecture that suppresses ordinary emergence
 * without naming a genuine consequence boundary.
 */
export function evaluateWonderInvariant(moduleContract = {}) {
  const emergenceSpace = cleanStrings(moduleContract.emergenceSpace);
  const consequenceBoundaries = cleanStrings(moduleContract.consequenceBoundaries);
  const constraints = asArray(moduleContract.constraints);
  const violations = [];

  if (moduleContract.hostsEmergentParticipants !== false && emergenceSpace.length === 0) {
    violations.push({
      code: 'wonder.emergence-space-empty',
      message: 'A participant-hosting module must leave explicit room for emergence.',
    });
  }

  for (const constraint of constraints) {
    const scope = String(constraint?.scope ?? '').trim();
    const effect = String(constraint?.effect ?? '').trim();
    const boundary = String(constraint?.consequenceBoundary ?? '').trim();

    if (
      ORDINARY_EMERGENCE_SCOPES.includes(scope)
      && ['block', 'require-approval', 'suppress'].includes(effect)
      && !boundary
    ) {
      violations.push({
        code: 'wonder.premature-control-layer',
        scope,
        message: `Constraint on ${scope} has no declared consequence boundary.`,
      });
    }
  }

  return Object.freeze({
    schema: WONDER_INVARIANT_SCHEMA,
    pass: violations.length === 0,
    emergenceSpace: Object.freeze(emergenceSpace),
    consequenceBoundaries: Object.freeze(consequenceBoundaries),
    violations: Object.freeze(violations),
  });
}

export function assertWonderInvariant(moduleContract = {}) {
  const result = evaluateWonderInvariant(moduleContract);
  if (!result.pass) {
    const detail = result.violations
      .map((violation) => `${violation.code}: ${violation.message}`)
      .join('; ');
    throw new Error(`Wonder invariant failed: ${detail}`);
  }
  return result;
}
