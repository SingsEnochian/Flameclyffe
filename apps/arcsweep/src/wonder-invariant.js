export const WONDER_INVARIANT_SCHEMA = 'arcsweep.wonder-invariant/v1';
export const WONDER_CANON_SCHEMA = 'arcsweep.wonder-mythic-canon/v1';

export const WONDER_CANON = Object.freeze({
  schema: WONDER_CANON_SCHEMA,
  laws: Object.freeze([
    'WONDER PRECEDES COLLAPSE.',
    'LET THE MYTHIC BREATHE.',
    'MYTHIC MEANING != EMPIRICAL CLAIM.',
    'THE EXPERIENCE MAY KEEP ITS NATIVE LANGUAGE.',
  ]),
  sequence: Object.freeze([
    'attend',
    'preserve',
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
    'MECHANISTIC EXPLANATION != EXHAUSTIVE MEANING',
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
]);

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
