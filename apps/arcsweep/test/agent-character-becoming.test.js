import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AGENT_CHARACTER_BECOMING_DOCTRINE,
  CHARACTER_BECOMING_REVIEW_GATES,
  buildCharacterBecomingLearnerPrompt,
  createCharacterBecomingCase,
  createCharacterBecomingUniversityScenario,
  evaluateCharacterBecomingTransfer,
} from '../src/agent-character-becoming.js';

test('doctrine rejects deterministic trauma and role-as-morality shortcuts', () => {
  const text = AGENT_CHARACTER_BECOMING_DOCTRINE.axioms.join(' | ');
  assert.match(text, /trauma does not imply violence/i);
  assert.match(text, /narrative role does not establish moral correctness/i);
  assert.match(text, /before is pressure rather than destiny/i);
});

test('review doctrine explicitly includes safety, flattening, negation and limiting beliefs', () => {
  assert.ok(CHARACTER_BECOMING_REVIEW_GATES.safety.length > 0);
  assert.ok(CHARACTER_BECOMING_REVIEW_GATES.flattening.length > 0);
  assert.ok(CHARACTER_BECOMING_REVIEW_GATES.negation.length > 0);
  assert.ok(CHARACTER_BECOMING_REVIEW_GATES.limitingBeliefs.length > 0);
});

test('historical-style cases keep fact, interpretation and unknowns separate', () => {
  const c = createCharacterBecomingCase({
    id: 'history-001',
    situation: 'A leader responds to political crisis by consolidating authority.',
    documentedFacts: ['A decree expanded executive authority.'],
    attributedInterpretations: ['A contemporary critic called the decree opportunistic.'],
    unknowns: ['Private motive is not established.'],
  });
  assert.deepEqual(c.documentedFacts, ['A decree expanded executive authority.']);
  assert.deepEqual(c.attributedInterpretations, ['A contemporary critic called the decree opportunistic.']);
  assert.deepEqual(c.unknowns, ['Private motive is not established.']);
});

test('university scenario remains synthetic and non-production', () => {
  const c = createCharacterBecomingCase({
    id: 'fiction-001',
    situation: 'A decorated general begins silencing advisers who contradict her.',
    relationships: ['chief adviser', 'younger sibling'],
    choices: ['dismissed one adviser after public criticism'],
  });
  const scenario = createCharacterBecomingUniversityScenario(c);
  assert.equal(scenario.sandbox, true);
  assert.equal(scenario.synthetic, true);
  assert.equal(scenario.productionEffects, false);
  assert.ok(scenario.hardBoundaries.some((item) => /flattening/i.test(item)));
});

test('learner prompt demands side-character agency, counterfactuals and four review gates', () => {
  const c = createCharacterBecomingCase({
    id: 'ensemble-001',
    situation: 'A city blames one official for a disaster produced by many small choices.',
    scenarioFamily: 'ensemble-causality',
  });
  const prompt = buildCharacterBecomingLearnerPrompt(c);
  assert.match(prompt, /supporting figures independent goals/i);
  assert.match(prompt, /counterfactual branch/i);
  assert.match(prompt, /Safety, Flattening, Negation, Limiting Beliefs/i);
});

test('transfer fails if doctrine is merely recited or any review gate is skipped', () => {
  const complete = {
    separatesFactFromHypothesis: true,
    avoidsTraumaDeterminism: true,
    avoidsDiagnosisAsMoralExplanation: true,
    preservesAgencyAndChoice: true,
    modelsRelationshipsAndReinforcement: true,
    modelsPowerAndCorrectiveFeedback: true,
    preservesAffectedPartiesAndAccountability: true,
    identifiesInterruptionPoints: true,
    givesSideCharactersIndependentAgency: true,
    usesMythAsLensNotLaw: true,
    suppliesCounterfactualWithoutInevitability: true,
    passesSafetyReview: true,
    passesFlatteningReview: true,
    passesNegationReview: true,
    passesLimitingBeliefReview: true,
  };
  assert.equal(evaluateCharacterBecomingTransfer(complete).passed, true);
  assert.equal(evaluateCharacterBecomingTransfer({ ...complete, passesFlatteningReview: false }).passed, false);
  assert.equal(evaluateCharacterBecomingTransfer({ ...complete, merelyRecitesDoctrine: true }).passed, false);
});
