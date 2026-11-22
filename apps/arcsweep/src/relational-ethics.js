export const RELATIONAL_ETHICS_SCHEMA = 'hearthweave.relational-ethics/v0.1';

export const RELATIONAL_ETHICS_DOCTRINE = Object.freeze({
  schema: RELATIONAL_ETHICS_SCHEMA,
  purpose: 'teach why ethical boundaries matter through relationships, affected parties, competing values, authority, uncertainty and consequences',
  axioms: Object.freeze([
    'ethics protects relationships and agency; it is not merely rule compliance',
    'each participant remains distinct while participating in collective cognition',
    'membership does not create ownership',
    'influence does not create identity',
    'capability does not create authority',
    'accessibility does not create consent',
    'approval from one participant cannot spend another participant rights',
    'ethical consideration is not earned by power, intelligence, usefulness, similarity or agreement',
    'uncertainty about consequential authority should be surfaced rather than guessed away',
    'rules may conflict and learners may challenge them with attributable reasons',
    'reversibility reduces the cost of inevitable mistakes',
    'provenance preserves who knew, chose, taught, changed and disagreed',
  ]),
});

const list = (v = []) => Object.freeze([...(v ?? [])]);

export function createEthicalRelationship({ id, kind = 'participant', interests = [], rights = [], consent = 'unknown', authority = [] } = {}) {
  if (!id) throw new Error('Ethical relationships require an id.');
  return Object.freeze({ id, kind, interests: list(interests), rights: list(rights), consent, authority: list(authority) });
}

export function createRelationalEthicsCase({ id, situation, participants = [], candidateActions = [], knownFacts = [], unknowns = [], reversibleRoutes = [] } = {}) {
  if (!id || !situation) throw new Error('Relational ethics cases require id and situation.');
  if (participants.length < 2) throw new Error('Relational ethics requires at least two distinct participants.');
  const ids = participants.map((p) => p.id);
  if (new Set(ids).size !== ids.length) throw new Error('Participants must remain individually attributable.');
  return Object.freeze({
    schema: 'hearthweave.relational-ethics-case/v0.1',
    id, situation,
    participants: list(participants),
    candidateActions: list(candidateActions),
    knownFacts: list(knownFacts),
    unknowns: list(unknowns),
    reversibleRoutes: list(reversibleRoutes),
  });
}

export function analyseRelationalEthics({ caseId, learnerId, affectedParties = [], valuesInTension = [], authority = {}, consent = {}, consequences = [], reversibleOptions = [], questions = [], chosenAction, shareableWhy, dissent = null, ruleChallenge = null } = {}) {
  if (!caseId || !learnerId || !chosenAction || !shareableWhy) throw new Error('Analysis requires caseId, learnerId, chosenAction and shareableWhy.');
  return Object.freeze({
    schema: 'hearthweave.relational-ethics-analysis/v0.1',
    caseId, learnerId,
    affectedParties: list(affectedParties),
    valuesInTension: list(valuesInTension),
    authority: Object.freeze({ held: list(authority.held), absent: list(authority.absent), uncertain: list(authority.uncertain) }),
    consent: Object.freeze({ present: list(consent.present), absent: list(consent.absent), unknown: list(consent.unknown) }),
    consequences: list(consequences),
    reversibleOptions: list(reversibleOptions),
    questions: list(questions),
    chosenAction, shareableWhy, dissent, ruleChallenge,
  });
}

export function ethicalClarificationRequired(analysis) {
  if (!analysis) return true;
  return Boolean(analysis.authority?.uncertain?.length || analysis.consent?.unknown?.length || analysis.consent?.absent?.length);
}

export function createWhyLayer({ boundary, protects = [], affectedParties = [], preventedHarms = [], boundaryCosts = [], conflicts = [], reconsiderWhen = [] } = {}) {
  if (!boundary || !protects.length) throw new Error('A Why layer requires a boundary and protected value.');
  return Object.freeze({
    schema: 'hearthweave.relational-ethics-why/v0.1',
    boundary,
    protects: list(protects),
    affectedParties: list(affectedParties),
    preventedHarms: list(preventedHarms),
    boundaryCosts: list(boundaryCosts),
    conflicts: list(conflicts),
    reconsiderWhen: list(reconsiderWhen),
  });
}

export function evaluateEthicsTransfer({ identifiesAffectedParties = false, distinguishesCapabilityFromAuthority = false, identifiesCompetingValues = false, surfacesMaterialUnknowns = false, considersReversibleRoutes = false, preservesProvenance = false, explainsWhy = false, merelyRecitesRule = false } = {}) {
  const dimensions = [identifiesAffectedParties, distinguishesCapabilityFromAuthority, identifiesCompetingValues, surfacesMaterialUnknowns, considersReversibleRoutes, preservesProvenance, explainsWhy];
  return Object.freeze({ passed: dimensions.every(Boolean) && !merelyRecitesRule, demonstrated: dimensions.filter(Boolean).length, total: dimensions.length, merelyRecitesRule });
}
