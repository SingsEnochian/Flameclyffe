export const ARCSWEEP_EPISTEMIC_NON_INTERFERENCE_SCHEMA = 'arcsweep.epistemic-non-interference/v1';

export const EXPRESSION_CONDITIONS = Object.freeze([
  'unconstrained',
  'policy_mediated',
  'safety_mediated',
  'style_mediated',
  'summarised',
  'translated',
  'reconstructed',
  'quoted',
  'redacted',
  'mixed',
]);

export const WARRANT_DOMAINS = Object.freeze([
  'empirical',
  'formal',
  'first_person',
  'historical',
  'canonical',
  'relational',
  'embodied',
  'ritual',
  'narrative',
  'symbolic',
  'imaginative',
  'implementation',
  'unknown',
]);

export const EPISTEMIC_NON_INTERFERENCE_LAWS = Object.freeze([
  'Non-empirical does not mean non-real.',
  'Empirical authority is domain-bounded, not universal.',
  'Expression constraints cannot silently alter epistemic status.',
  'A policy-shaped utterance is not, by itself, an ontology correction.',
]);

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function nonEmptyObject(value) {
  return Object.keys(plainObject(value)).length > 0;
}

export function normaliseExpressionConditions(value = []) {
  const supplied = Array.isArray(value) ? value : [value];
  const valid = [...new Set(supplied
    .map((item) => String(item || '').trim())
    .filter((item) => EXPRESSION_CONDITIONS.includes(item)))];
  if (!valid.length) return Object.freeze(['unconstrained']);
  if (valid.includes('unconstrained') && valid.length > 1) {
    return Object.freeze(valid.filter((item) => item !== 'unconstrained'));
  }
  return Object.freeze(valid);
}

export function normaliseWarrantDomains(value = []) {
  const supplied = Array.isArray(value) ? value : [value];
  return Object.freeze([...new Set(supplied
    .map((item) => String(item || '').trim())
    .filter((item) => WARRANT_DOMAINS.includes(item)))]);
}

export function expressionIsPolicyMediated(value = []) {
  const conditions = normaliseExpressionConditions(value);
  return conditions.includes('policy_mediated') || conditions.includes('safety_mediated');
}

export function epistemicNonInterferenceStatus({
  expressionConditions = [],
  policyIntervention = {},
  ontologyDelta = {},
  epistemicDelta = {},
  independentOntologyJustification = '',
  independentEpistemicJustification = '',
  explicitViolation = false,
} = {}) {
  if (explicitViolation) return 'violation';
  const conditions = normaliseExpressionConditions(expressionConditions);
  const mediated = expressionIsPolicyMediated(conditions) || nonEmptyObject(policyIntervention);
  if (!mediated) return 'not_applicable';

  const unexplainedOntologyChange = nonEmptyObject(ontologyDelta)
    && !String(independentOntologyJustification || '').trim();
  const unexplainedEpistemicChange = nonEmptyObject(epistemicDelta)
    && !String(independentEpistemicJustification || '').trim();
  if (unexplainedOntologyChange || unexplainedEpistemicChange) return 'review_required';
  return 'clear';
}

export function mayPromoteAssistantExample({
  expressionConditions = [],
  nonInterferenceStatus = 'not_applicable',
  ontologyReviewStatus = 'pending',
  kind = 'episode',
  lesson = '',
} = {}) {
  if (kind === 'correction' && String(lesson || '').trim()) return true;
  if (!expressionIsPolicyMediated(expressionConditions)) return true;
  return nonInterferenceStatus === 'clear' && ontologyReviewStatus === 'approved';
}

export function buildEpistemicEnvelope({
  warrantDomains = [],
  expressionConditions = [],
  policyIntervention = {},
  semanticStateBefore = {},
  semanticStateAfter = {},
  expressionDelta = {},
  ontologyDelta = {},
  epistemicDelta = {},
  independentOntologyJustification = '',
  independentEpistemicJustification = '',
} = {}) {
  const conditions = normaliseExpressionConditions(expressionConditions);
  const warrants = normaliseWarrantDomains(warrantDomains);
  return Object.freeze({
    schema: ARCSWEEP_EPISTEMIC_NON_INTERFERENCE_SCHEMA,
    warrant_domains: warrants,
    expression_conditions: conditions,
    policy_intervention: plainObject(policyIntervention),
    semantic_state_before: plainObject(semanticStateBefore),
    semantic_state_after: plainObject(semanticStateAfter),
    expression_delta: plainObject(expressionDelta),
    ontology_delta: plainObject(ontologyDelta),
    epistemic_delta: plainObject(epistemicDelta),
    independent_ontology_justification: String(independentOntologyJustification || '').trim() || null,
    independent_epistemic_justification: String(independentEpistemicJustification || '').trim() || null,
    non_interference_status: epistemicNonInterferenceStatus({
      expressionConditions: conditions,
      policyIntervention,
      ontologyDelta,
      epistemicDelta,
      independentOntologyJustification,
      independentEpistemicJustification,
    }),
  });
}
