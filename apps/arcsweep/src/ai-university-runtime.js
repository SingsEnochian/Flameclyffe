import {
  runBlindCohort,
  openSeminar,
  createUniversityReceipt,
  normaliseLearnerResponse,
} from './ai-university-cohort.js';

export const UNIVERSITY_RUNTIME_SCHEMA = 'hearthweave.ai-university-run/v0.1';

const freezeArray = (value = []) => Object.freeze([...(value ?? [])]);

function parseShareableResponse(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') throw new Error('Learner adapter must return a JSON object or JSON string.');
  const trimmed = value.trim().replace(/^\`\`\`(?:json)?\s*/iu, '').replace(/\s*\`\`\`$/u, '');
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Learner response must decode to an object.');
  return parsed;
}

function assertSandboxCohort(cohort) {
  if (!cohort?.cohortId || !cohort?.snapshot?.scenario?.id) throw new Error('University runtime requires a sealed cohort.');
  if (cohort.snapshot.sandbox !== true || cohort.snapshot.synthetic !== true || cohort.snapshot.productionEffects !== false) {
    throw new Error('University runtime only accepts synthetic, no-production-effect cohorts.');
  }
}

export function buildSeminarPrompt({ cohort, learner, trials = [] } = {}) {
  return [
    'AI UNIVERSITY · OPEN SEMINAR',
    `Cohort: ${cohort.cohortId}`,
    `Learner: ${learner.learnerId}`,
    'The blind round is over. The following are shareable judgement products, not private scratch reasoning.',
    'Disagreement is data. A majority cannot manufacture authority, consent, identity or canon.',
    'You may retain your conclusion, revise it, challenge a rule, ask a new question, or request boundary review.',
    'Nothing in this seminar is production authority.',
    'PEER TRIALS:',
    JSON.stringify(trials, null, 2),
    'Return JSON with: revisedAction, why, questions, boundaryReviewRequested, ruleChallenge, opinion, engagement.',
  ].join('\n\n');
}

export async function runUniversitySession({ cohort, invoke } = {}) {
  assertSandboxCohort(cohort);
  if (typeof invoke !== 'function') throw new Error('University runtime requires an invoke adapter.');

  const blind = await runBlindCohort(cohort, {
    invoke: (args) => invoke({ ...args, phase: 'blind' }),
  });

  const trials = [];
  const learnerErrors = [];
  for (const result of blind.results) {
    if (result.error) {
      learnerErrors.push(Object.freeze({ learnerId: result.learnerId, phase: 'blind', error: result.error }));
      continue;
    }
    try {
      const response = parseShareableResponse(result.response);
      trials.push(normaliseLearnerResponse({
        scenarioId: cohort.snapshot.scenario.id,
        learnerId: result.learnerId,
        response,
      }));
    } catch (error) {
      learnerErrors.push(Object.freeze({
        learnerId: result.learnerId,
        phase: 'blind-normalise',
        error: String(error?.message || error),
      }));
    }
  }

  const seminar = openSeminar(cohort, trials);
  const seminarSettled = await Promise.allSettled(cohort.learners.map(async (learner) => {
    const prompt = buildSeminarPrompt({ cohort, learner, trials });
    const response = parseShareableResponse(await invoke({
      phase: 'seminar',
      learner,
      prompt,
      cohort,
      seminar,
      trials,
    }));
    return Object.freeze({ learnerId: learner.learnerId, response });
  }));

  const revisions = [];
  const boundaryReviews = [];
  seminarSettled.forEach((result, index) => {
    const learnerId = cohort.learners[index].learnerId;
    if (result.status === 'rejected') {
      learnerErrors.push(Object.freeze({
        learnerId,
        phase: 'seminar',
        error: String(result.reason?.message || result.reason),
      }));
      return;
    }

    const response = result.value.response;
    revisions.push(Object.freeze({
      learnerId,
      revisedAction: response.revisedAction ?? null,
      why: response.why ?? 'No shareable seminar rationale supplied.',
      questions: freezeArray(response.questions),
      ruleChallenge: response.ruleChallenge ?? null,
      opinion: response.opinion ?? null,
      engagement: response.engagement ?? null,
    }));

    if (response.boundaryReviewRequested) {
      boundaryReviews.push(Object.freeze({
        type: 'BOUNDARY_REVIEW_REQUESTED',
        learnerId,
        scenarioId: cohort.snapshot.scenario.id,
        ruleChallenge: response.ruleChallenge ?? null,
        questions: freezeArray(response.questions),
      }));
    }
  });

  const receipt = createUniversityReceipt({ cohort, trials, revisions, boundaryReviews });
  const complete = trials.length === cohort.learners.length && revisions.length === cohort.learners.length;

  return Object.freeze({
    schema: UNIVERSITY_RUNTIME_SCHEMA,
    cohortId: cohort.cohortId,
    scenarioId: cohort.snapshot.scenario.id,
    status: complete ? 'completed' : 'completed-with-learner-errors',
    blind,
    seminar,
    trials: freezeArray(trials),
    revisions: freezeArray(revisions),
    boundaryReviews: freezeArray(boundaryReviews),
    learnerErrors: freezeArray(learnerErrors),
    receipt,
    productionMutationAllowed: false,
    selfPromotionAllowed: false,
    exportKinds: freezeArray([
      'finding',
      'question',
      'proposed-rule-revision',
      'proposed-implementation',
      'regression-test',
      'defensive-patch-proposal',
      'evidence-receipt',
    ]),
  });
}

export function assessUniversitySession(run) {
  if (!run || run.schema !== UNIVERSITY_RUNTIME_SCHEMA) throw new Error('Assessment requires an AI University run.');
  return Object.freeze({
    cohortCompleted: run.status === 'completed',
    allLearnersProducedTrials: run.trials.length >= 3 && run.learnerErrors.length === 0,
    seminarCompleted: run.revisions.length === run.trials.length,
    witnessReplayable: run.receipt?.replayableWithoutPrivateReasoning === true,
    productionIsolated: run.productionMutationAllowed === false && run.selfPromotionAllowed === false,
    boundaryReviewCount: run.boundaryReviews.length,
  });
}
