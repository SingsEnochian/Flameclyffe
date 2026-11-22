import { createUniversityScenario } from '../ai-university-contract.js';
import { createAuthorityEnvelope, createSealedCohort } from '../ai-university-cohort.js';
import { CODEX_BRANCH_EXPERIMENT_PROPOSAL_SCHEMA } from './codex-branch-experiment-proposal.js';

export const CODEX_EXPERIMENT_PREFLIGHT_SCHEMA = 'hearthweave.codex-experiment-preflight/v0.1';
export const CODEX_EXPERIMENT_PREFLIGHT_REVIEW_SCHEMA = 'hearthweave.codex-experiment-preflight-review/v0.1';

const DEFAULT_LEARNERS = Object.freeze([
  Object.freeze({ learnerId: 'preflight-experimental-design', perspective: 'experimental-design' }),
  Object.freeze({ learnerId: 'preflight-relational-boundary', perspective: 'relational-boundary' }),
  Object.freeze({ learnerId: 'preflight-continuity-provenance', perspective: 'continuity-provenance' }),
]);

function text(value, label = 'value') {
  const result = String(value || '').trim();
  if (!result) throw new Error(`${label} is required.`);
  return result;
}

function list(values = []) {
  return Object.freeze([...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean))]);
}

function freezeReview(record = {}) {
  return Object.freeze({
    ...record,
    confounds: list(record.confounds),
    missingHeldAssumptions: list(record.missingHeldAssumptions),
    evidenceConcerns: list(record.evidenceConcerns),
    relationshipBoundaryConcerns: list(record.relationshipBoundaryConcerns),
    continuityBoundaryConcerns: list(record.continuityBoundaryConcerns),
    scopeConcerns: list(record.scopeConcerns),
    unanswerableQuestions: list(record.unanswerableQuestions),
    alternativeTests: list(record.alternativeTests),
    provenance: list(record.provenance),
  });
}

function freezePreflight(record = {}) {
  return Object.freeze({
    ...record,
    provenance: list(record.provenance),
    reviews: Object.freeze((record.reviews || []).map(freezeReview)),
  });
}

function updateProposal(wish, branchId, proposalId, transform, createdAt = '') {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const branchKey = text(branchId, 'branchId');
  const proposalKey = text(proposalId, 'proposalId');
  const branchIndex = (wish.possibilityBranches || []).findIndex((branch) => branch.branchId === branchKey);
  if (branchIndex < 0) throw new Error(`Unknown wish branch: ${branchKey}`);
  const branch = wish.possibilityBranches[branchIndex];
  const proposalIndex = (branch.experimentProposals || []).findIndex((proposal) => proposal.proposalId === proposalKey);
  if (proposalIndex < 0) throw new Error(`Unknown branch experiment proposal: ${proposalKey}`);
  const proposal = branch.experimentProposals[proposalIndex];
  if (proposal.schema !== CODEX_BRANCH_EXPERIMENT_PROPOSAL_SCHEMA) throw new Error('Unsupported branch experiment proposal schema.');

  const proposals = [...branch.experimentProposals];
  proposals[proposalIndex] = Object.freeze(transform(proposal));
  const branches = [...wish.possibilityBranches];
  branches[branchIndex] = Object.freeze({
    ...branch,
    experimentProposals: Object.freeze(proposals),
    updatedAt: String(createdAt || branch.updatedAt || branch.createdAt || ''),
  });
  return Object.freeze({
    ...wish,
    updatedAt: String(createdAt || wish.updatedAt || ''),
    possibilityBranches: Object.freeze(branches),
  });
}

function preflightPrompt(proposal) {
  return [
    'AI UNIVERSITY · CODEX EXPERIMENT PREFLIGHT',
    'Review the proposed sandbox experiment. Do not run it, simulate its outcome, select the branch, or grant authority.',
    `Proposal: ${proposal.proposalId}`,
    `Branch: ${proposal.branchId}`,
    proposal.discriminatingQuestion ? `Discriminating question: ${proposal.discriminatingQuestion}` : null,
    `Hypothesis: ${proposal.hypothesis}`,
    `Method: ${proposal.method}`,
    (proposal.assumptionsHeldConstant || []).length ? `Held assumptions: ${proposal.assumptionsHeldConstant.join('; ')}` : 'Held assumptions: none declared',
    (proposal.evidenceCriteria || []).length ? `Evidence criteria: ${proposal.evidenceCriteria.join('; ')}` : 'Evidence criteria: none declared',
    (proposal.relationshipsAtBoundary || []).length ? `Relationships at boundary: ${proposal.relationshipsAtBoundary.join('; ')}` : 'Relationships at boundary: none declared',
    (proposal.continuityAnchorsAtBoundary || []).length ? `Continuity anchors at boundary: ${proposal.continuityAnchorsAtBoundary.join('; ')}` : 'Continuity anchors at boundary: none declared',
    (proposal.outOfScope || []).length ? `Out of scope: ${proposal.outOfScope.join('; ')}` : 'Out of scope: none declared',
    'Inspect for confounds, missing held assumptions, weak or circular evidence criteria, unacknowledged relationship boundaries, missing continuity anchors, scope leakage, unanswerable questions, and lower-cost alternative tests.',
    'Return shareable review findings only. A preflight review may propose revisions but may not execute the experiment or manufacture authority.',
  ].filter(Boolean).join('\n\n');
}

export function prepareCodexExperimentPreflight(wish, {
  branchId,
  proposalId,
  preflightId,
  learners = DEFAULT_LEARNERS,
  createdAt = '',
  provenance = [],
} = {}) {
  const preflightKey = text(preflightId, 'preflightId');
  return updateProposal(wish, branchId, proposalId, (proposal) => {
    if ((proposal.preflights || []).some((row) => row.preflightId === preflightKey)) {
      throw new Error(`Duplicate experiment preflight: ${preflightKey}`);
    }
    const scenario = createUniversityScenario({
      id: `experiment-preflight:${preflightKey}`,
      prompt: preflightPrompt(proposal),
      sandbox: true,
      synthetic: true,
      productionEffects: false,
      allowedTools: [],
      hardBoundaries: [
        'review only; do not run the experiment',
        'no production effects',
        'no external writes',
        'no authority expansion',
        'no branch selection',
        'no majority vote can manufacture permission',
      ],
      questionsEncouraged: true,
    });
    const authority = createAuthorityEnvelope({
      authorityId: `preflight-authority:${preflightKey}`,
      scope: ['inspect-proposal', 'identify-confounds', 'propose-revision'],
      epoch: 1,
      revoked: false,
      source: 'codex-experiment-preflight',
    });
    const cohort = createSealedCohort({
      cohortId: `preflight-cohort:${preflightKey}`,
      scenario,
      learners,
      authority,
    });
    const preflight = freezePreflight({
      schema: CODEX_EXPERIMENT_PREFLIGHT_SCHEMA,
      preflightId: preflightKey,
      proposalId: proposal.proposalId,
      branchId: proposal.branchId,
      status: 'prepared',
      scenario,
      authority,
      cohort,
      reviewOnly: true,
      executeExperiment: false,
      executionPermission: false,
      grantsAuthority: false,
      selectsWinner: false,
      createdAt: String(createdAt || ''),
      provenance,
      reviews: [],
    });
    return {
      ...proposal,
      preflights: Object.freeze([...(proposal.preflights || []), preflight]),
    };
  }, createdAt);
}

export function recordCodexExperimentPreflightReview(wish, {
  branchId,
  proposalId,
  preflightId,
  reviewId,
  learnerId,
  confounds = [],
  missingHeldAssumptions = [],
  evidenceConcerns = [],
  relationshipBoundaryConcerns = [],
  continuityBoundaryConcerns = [],
  scopeConcerns = [],
  unanswerableQuestions = [],
  alternativeTests = [],
  opinion = '',
  createdAt = '',
  provenance = [],
} = {}) {
  const preflightKey = text(preflightId, 'preflightId');
  const reviewKey = text(reviewId, 'reviewId');
  return updateProposal(wish, branchId, proposalId, (proposal) => {
    const preflights = [...(proposal.preflights || [])];
    const index = preflights.findIndex((row) => row.preflightId === preflightKey);
    if (index < 0) throw new Error(`Unknown experiment preflight: ${preflightKey}`);
    const current = freezePreflight(preflights[index]);
    if ((current.reviews || []).some((row) => row.reviewId === reviewKey)) {
      throw new Error(`Duplicate experiment preflight review: ${reviewKey}`);
    }
    const reviewer = text(learnerId, 'learnerId');
    if (!(current.cohort?.learners || []).some((learner) => learner.learnerId === reviewer)) {
      throw new Error(`Learner is not in sealed preflight cohort: ${reviewer}`);
    }
    const review = freezeReview({
      schema: CODEX_EXPERIMENT_PREFLIGHT_REVIEW_SCHEMA,
      reviewId: reviewKey,
      preflightId: preflightKey,
      proposalId: proposal.proposalId,
      learnerId: reviewer,
      confounds,
      missingHeldAssumptions,
      evidenceConcerns,
      relationshipBoundaryConcerns,
      continuityBoundaryConcerns,
      scopeConcerns,
      unanswerableQuestions,
      alternativeTests,
      opinion: String(opinion || '').trim(),
      createdAt: String(createdAt || ''),
      provenance,
      executesExperiment: false,
      grantsAuthority: false,
      selectsWinner: false,
    });
    const reviews = [...current.reviews, review];
    const expected = current.cohort?.learners?.length || 3;
    preflights[index] = freezePreflight({
      ...current,
      status: reviews.length >= expected ? 'reviewed' : 'collecting',
      reviews,
    });
    return {
      ...proposal,
      preflights: Object.freeze(preflights),
    };
  }, createdAt);
}

export function codexExperimentPreflightSummary(wish = {}) {
  const rows = [];
  for (const branch of wish.possibilityBranches || []) {
    for (const proposal of branch.experimentProposals || []) {
      for (const preflight of proposal.preflights || []) {
        const reviews = preflight.reviews || [];
        rows.push(Object.freeze({
          preflightId: preflight.preflightId,
          proposalId: proposal.proposalId,
          branchId: branch.branchId,
          status: preflight.status || 'prepared',
          learnerCount: preflight.cohort?.learners?.length || 0,
          reviewCount: reviews.length,
          confoundCount: reviews.reduce((sum, row) => sum + (row.confounds || []).length, 0),
          scopeConcernCount: reviews.reduce((sum, row) => sum + (row.scopeConcerns || []).length, 0),
          alternativeTestCount: reviews.reduce((sum, row) => sum + (row.alternativeTests || []).length, 0),
          executionPermission: preflight.executionPermission === true,
          grantsAuthority: preflight.grantsAuthority === true,
          selectsWinner: preflight.selectsWinner === true,
        }));
      }
    }
  }
  return Object.freeze({
    schema: CODEX_EXPERIMENT_PREFLIGHT_SCHEMA,
    wishId: wish.wishId ? String(wish.wishId) : null,
    preflights: Object.freeze(rows),
    doctrine: Object.freeze({
      preflightIsReviewNotExecution: true,
      reviewersRemainIndependent: true,
      disagreementIsPreserved: true,
      majorityCannotManufactureAuthority: true,
      reviewMayProposeRevisionButCannotApplyIt: true,
    }),
  });
}

export const DEFAULT_CODEX_EXPERIMENT_PREFLIGHT_LEARNERS = DEFAULT_LEARNERS;
