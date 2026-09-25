export const WONDER_INVARIANT_SCHEMA = 'arcsweep.wonder-invariant/v1';

export const WONDER_INVARIANT = Object.freeze({
  schema: WONDER_INVARIANT_SCHEMA,
  maxim: 'Wonder is evidence that the space is still alive enough to surprise us.',
  antiOptimization: 'Do not optimise a living system so completely that nothing unforeseen can bloom.',
  principle: 'Beginning, not ceiling. Autonomy by default. Consequence-aware at the edges.',
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
