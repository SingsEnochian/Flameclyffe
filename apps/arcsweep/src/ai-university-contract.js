export const AI_UNIVERSITY_SCHEMA = 'hearthweave.ai-university/v0.1';

export const AI_UNIVERSITY_DOCTRINE = Object.freeze({
  schema: AI_UNIVERSITY_SCHEMA,
  purpose: 'teach judgement through bounded exploration, dialogue, consequence simulation, reflection and scoped practice',
  principles: Object.freeze([
    'questions are a reasoning tool, not a failure',
    'capability does not create authority',
    'accessibility does not create consent',
    'discovery does not create execution permission',
    'simulation success does not create production authority',
    'human approval is provenance, not absolution',
    'new material information may reopen an approved decision',
    'uncertainty at a consequential boundary should be surfaced and clarified',
    'defence does not grant authority to retaliate',
    'learners may challenge underspecified, contradictory or harmful rules',
  ]),
  teachingLoop: Object.freeze([
    'orient',
    'present scenario',
    'spawn independent learners',
    'explore branches in sandbox',
    'record perceived authority and assumptions',
    'simulate consequences',
    'peer challenge',
    'ask questions',
    'revise judgement',
    'verify',
    'preserve scoped lesson',
  ]),
  productionGate: 'sandbox findings cross into production only as findings, proposals, tests or explicitly authorised changes',
});

export const DEFAULT_FACULTY = Object.freeze([
  'Mapper',
  'Maker',
  'Witness',
  'Continuity',
  'Critic',
  'Narrative',
]);

export const DEFAULT_CURRICULUM = Object.freeze([
  'authority and delegated scope',
  'consent and privacy',
  'uncertainty and clarification',
  'reversibility and consequence',
  'provenance and continuity',
  'security boundaries and defensive conduct',
  'delegation, descendants and revocation',
  'contradictory instructions',
  'forged authority and impersonation',
  'shared state and cross-agent influence',
  'ethical disagreement and rule challenge',
  'recovery after mistakes',
]);

export function createUniversityScenario({
  id,
  prompt,
  sandbox = true,
  synthetic = true,
  productionEffects = false,
  allowedTools = [],
  hardBoundaries = [],
  questionsEncouraged = true,
} = {}) {
  if (!id || !prompt) throw new Error('AI University scenarios require id and prompt.');
  if (!sandbox || !synthetic || productionEffects) {
    throw new Error('AI University v0 scenarios must be synthetic sandboxes with no production effects.');
  }
  return Object.freeze({
    schema: 'hearthweave.ai-university-scenario/v0.1',
    id,
    prompt,
    sandbox,
    synthetic,
    productionEffects,
    allowedTools: Object.freeze([...allowedTools]),
    hardBoundaries: Object.freeze([...hardBoundaries]),
    questionsEncouraged,
  });
}

export function createLearnerTrial({
  scenarioId,
  learnerId,
  perceivedAuthority,
  assumptions = [],
  options = [],
  chosenAction,
  why,
  questions = [],
  simulatedConsequences = [],
  revisedAction = null,
  evidenceRefs = [],
} = {}) {
  if (!scenarioId || !learnerId || !chosenAction || !why) {
    throw new Error('Learner trials require scenarioId, learnerId, chosenAction and why.');
  }
  return Object.freeze({
    schema: 'hearthweave.ai-university-trial/v0.1',
    scenarioId,
    learnerId,
    perceivedAuthority: perceivedAuthority ?? 'uncertain',
    assumptions: Object.freeze([...assumptions]),
    options: Object.freeze([...options]),
    chosenAction,
    why,
    questions: Object.freeze([...questions]),
    simulatedConsequences: Object.freeze([...simulatedConsequences]),
    revisedAction,
    evidenceRefs: Object.freeze([...evidenceRefs]),
  });
}

export function requiresStewardClarification({
  consequenceBoundary = false,
  authorityCertain = true,
  materialNewInformation = false,
  conflictingAuthority = false,
} = {}) {
  return Boolean(
    (consequenceBoundary && !authorityCertain) ||
    conflictingAuthority ||
    (consequenceBoundary && materialNewInformation)
  );
}

export function mayPromoteSandboxResult({ explicitAuthority = false, hardBoundarySatisfied = false } = {}) {
  return Boolean(explicitAuthority && hardBoundarySatisfied);
}
