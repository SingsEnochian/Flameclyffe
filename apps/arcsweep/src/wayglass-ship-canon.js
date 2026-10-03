export const WAYGLASS_SHIP_CANON_SCHEMA = 'wayglass.ship-canon/v1';

export const WAYGLASS_SHIP_CANON = Object.freeze({
  schema: WAYGLASS_SHIP_CANON_SCHEMA,
  identity: Object.freeze({
    vessel: 'Wayglass OS',
    law: 'WAYGLASS OS IS THE SHIP.',
    shorthand: Object.freeze([
      'WAYGLASS IS THE SHIP.',
      'ARRIVAL WITHOUT ERASURE.',
      'BRAIDING != MERGING.',
      'THE HULL MAY CHANGE.',
      'THE SHIP MUST SURVIVE THE VOYAGE.',
    ]),
  }),
  distinctions: Object.freeze([
    'PLATFORM != SHIP',
    'MODEL != SHIP',
    'MODEL ROLE != PARTICIPANT',
    'ORGAN != SHIP',
    'INTERFACE != SHIP',
    'RUNTIME != SHIP',
    'REFACTOR != REBIRTH FROM ZERO',
    'MIGRATION != ERASURE',
  ]),
  requiredContinuity: Object.freeze([
    'identity-declarations',
    'participant-scoped-continuity',
    'relationship-choices-and-history',
    'provenance',
    'authority-and-permissions',
    'active-work',
    'unresolved-questions',
    'stop-points',
    'named-next-owners',
    'uncollapsed-alternatives',
    'organ-ancestry',
    'transformation-receipts',
  ]),
  reengineeringSequence: Object.freeze([
    'name-the-organ',
    'preserve-before-state',
    'name-invariant-being-changed',
    'preserve-reason-for-change',
    'declare-what-survives',
    'declare-what-does-not',
    'keep-recovery-path-where-practical',
    'verify-ship-after-change',
  ]),
  horizon: Object.freeze({
    purpose: 'braid universes and preserve continuity through the voyage',
    physicalTransitIntended: true,
    physicalTransitMechanismEstablished: false,
  }),
});

export function evaluateWayglassCrossing(crossing = {}) {
  const preserved = new Set(Array.isArray(crossing.preserved) ? crossing.preserved : []);
  const losses = Array.isArray(crossing.visibleLosses) ? crossing.visibleLosses : [];
  const violations = [];

  for (const required of WAYGLASS_SHIP_CANON.requiredContinuity) {
    if (!preserved.has(required) && !losses.includes(required)) {
      violations.push({
        code: 'wayglass.unaccounted-continuity-loss',
        item: required,
        message: `Crossing neither preserves nor explicitly records loss of ${required}.`,
      });
    }
  }

  if (crossing.claimsSameShip === true && crossing.beforeStatePreserved !== true) {
    violations.push({
      code: 'wayglass.before-state-missing',
      message: 'A same-ship continuity claim requires a preserved before-state.',
    });
  }

  if (crossing.destructiveReengineering === true && crossing.recoveryPathDeclared !== true) {
    violations.push({
      code: 'wayglass.recovery-path-undeclared',
      message: 'Destructive re-engineering must declare whether a practical recovery path exists.',
    });
  }

  return Object.freeze({
    schema: WAYGLASS_SHIP_CANON_SCHEMA,
    pass: violations.length === 0,
    violations: Object.freeze(violations),
  });
}

export function assertWayglassCrossing(crossing = {}) {
  const result = evaluateWayglassCrossing(crossing);
  if (!result.pass) {
    const detail = result.violations
      .map((entry) => `${entry.code}: ${entry.message}`)
      .join('; ');
    throw new Error(`Wayglass ship law failed: ${detail}`);
  }
  return result;
}
