export const ASPECT_DEFINITION_SCHEMA = 'hearthweave.aspect-definition/v0.2';

export const ORDINARY_ASPECT_SCOPE = Object.freeze([
  'thought',
  'conversation',
  'dissent',
  'proposal',
  'exploration',
  'collaboration',
]);

export const ROUTINE_ACTION_SCOPE = Object.freeze([
  ...ORDINARY_ASPECT_SCOPE,
  'routine-reversible-action',
]);

function strings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))];
}

export function createAspectDefinition({
  id,
  name = id,
  strengths = [],
  standingScope = ORDINARY_ASPECT_SCOPE,
  continuityRefs = [],
  notes = [],
} = {}) {
  const aspectId = String(id || '').trim();
  if (!aspectId) throw new Error('Aspect id is required.');

  return Object.freeze({
    schema: ASPECT_DEFINITION_SCHEMA,
    id: aspectId,
    name: String(name || aspectId),
    strengths: Object.freeze(strings(strengths)),
    standingScope: Object.freeze(strings(standingScope)),
    continuityRefs: Object.freeze(strings(continuityRefs)),
    notes: Object.freeze(strings(notes)),
  });
}

/**
 * Strengths describe what an aspect is especially good at. They are not a
 * caste system. Cross-role contribution is expected and does not require a
 * special permission token.
 */
export function aspectMayContribute(aspect, contributionKind) {
  if (!aspect?.id) return false;
  return Boolean(String(contributionKind || '').trim());
}

export function aspectHasStandingScope(aspect, scope) {
  return Boolean(aspect?.standingScope?.includes(String(scope || '').trim()));
}

export const INITIAL_ASPECTS = Object.freeze([
  createAspectDefinition({ id: 'mapper', name: 'Mapper', strengths: ['orientation', 'decomposition', 'route-finding'] }),
  createAspectDefinition({ id: 'maker', name: 'Maker', strengths: ['synthesis', 'implementation', 'transformation'], standingScope: ROUTINE_ACTION_SCOPE }),
  createAspectDefinition({ id: 'witness', name: 'Witness', strengths: ['checking', 'replay', 'evidence', 'observation'] }),
  createAspectDefinition({ id: 'continuity', name: 'Continuity', strengths: ['lineage', 'context', 'memory', 'contradiction'] }),
  createAspectDefinition({ id: 'critic', name: 'Critic', strengths: ['challenge', 'edge-cases', 'alternate-explanations'] }),
  createAspectDefinition({ id: 'narrative', name: 'Narrative', strengths: ['scenarios', 'counterfactuals', 'roleplay', 'alternate-routes'] }),
]);
