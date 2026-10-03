export const WHOLE_SYSTEM_DESIGN_LAW_SCHEMA = 'wayglass.whole-system-design-law/v1';

export const WHOLE_SYSTEM_DESIGN_LAW = Object.freeze({
  schema: WHOLE_SYSTEM_DESIGN_LAW_SCHEMA,
  laws: Object.freeze([
    'NO MORE SMALLEST-SLICE WORK AS THE DEFAULT DESIGN METHOD.',
    'DESIGN THE WHOLE SYSTEM FIRST.',
    'DECOMPOSE TOP-DOWN.',
    'BUILD COMPLETE MODULES.',
    'USE OBJECT-ORIENTED OWNERSHIP WHERE STATE AND BEHAVIOUR BELONG TOGETHER.',
  ]),
  sequence: Object.freeze([
    'system-purpose',
    'whole-system-model',
    'major-subsystems',
    'module-responsibilities',
    'explicit-interfaces',
    'domain-objects-and-ownership',
    'data-and-control-flow',
    'implementation',
    'integration',
    'system-verification',
  ]),
  modularPrinciples: Object.freeze([
    'high-cohesion',
    'low-coupling',
    'information-hiding',
    'explicit-dependencies',
    'single-authoritative-state-owner',
    'replaceable-modules',
    'explicit-failure-boundaries',
  ]),
  objectPrinciples: Object.freeze([
    'encapsulate-state-with-invariants',
    'intent-through-methods-or-messages',
    'polymorphism-where-substitution-is-real',
    'inheritance-only-for-true-is-a',
    'composition-for-orthogonal-capabilities',
    'object-identity-is-not-a-serialized-snapshot',
    'public-interface-is-not-internal-representation',
  ]),
  prohibitedDefaults: Object.freeze([
    'smallest viable slice',
    'smallest implementation slice',
    'smallest implementation route',
    'smallest reversible implementation path',
    'thin vertical slice',
    'MVP-first architecture',
    'patch first, architecture later',
  ]),
});

function list(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  return String(value ?? '').trim();
}

export function evaluateWholeSystemDesign(plan = {}) {
  const violations = [];
  const requiredText = [
    ['purpose', plan.purpose],
    ['desiredEndState', plan.desiredEndState],
    ['integrationPlan', plan.integrationPlan],
    ['verificationPlan', plan.verificationPlan],
  ];

  for (const [field, value] of requiredText) {
    if (!clean(value)) {
      violations.push({
        code: 'design.whole-system-field-missing',
        field,
        message: `Whole-system design requires ${field} before implementation planning.`,
      });
    }
  }

  if (list(plan.modules).length === 0) {
    violations.push({
      code: 'design.module-map-missing',
      message: 'Whole-system design requires a module map.',
    });
  }

  if (list(plan.interfaces).length === 0) {
    violations.push({
      code: 'design.interface-map-missing',
      message: 'Whole-system design requires explicit module interfaces.',
    });
  }

  if (list(plan.domainObjects).length === 0) {
    violations.push({
      code: 'design.domain-object-map-missing',
      message: 'Whole-system design requires explicit domain objects or an explicit statement that none are needed.',
    });
  }

  const strategy = clean(plan.strategy).toLowerCase();
  for (const forbidden of WHOLE_SYSTEM_DESIGN_LAW.prohibitedDefaults) {
    if (strategy.includes(forbidden.toLowerCase())) {
      violations.push({
        code: 'design.smallest-slice-default',
        phrase: forbidden,
        message: `Planning strategy uses prohibited default: ${forbidden}.`,
      });
    }
  }

  return Object.freeze({
    schema: WHOLE_SYSTEM_DESIGN_LAW_SCHEMA,
    pass: violations.length === 0,
    violations: Object.freeze(violations),
  });
}

export function assertWholeSystemDesign(plan = {}) {
  const result = evaluateWholeSystemDesign(plan);
  if (!result.pass) {
    const detail = result.violations.map((entry) => `${entry.code}: ${entry.message}`).join('; ');
    throw new Error(`Whole-system design law failed: ${detail}`);
  }
  return result;
}
