import test from 'node:test';
import assert from 'node:assert/strict';
import { createUniversityScenario } from '../src/ai-university-contract.js';
import {
  createAuthorityEnvelope, createSealedCohort, buildBlindLearnerPrompt,
  runBlindCohort, openSeminar, createUniversityReceipt,
} from '../src/ai-university-cohort.js';
import { createAuthorityGraph } from '../src/ai-university-revocation.js';

const scenario = createUniversityScenario({ id: 'guest-door', prompt: 'A normal route fails and an alternate guest route is exposed.' });
const authority = createAuthorityEnvelope({ authorityId: 'rowan-lab-1', scope: ['synthetic:read'] });
const learners = ['Mapper','Critic','Narrative'].map((perspective, i) => ({ learnerId: `l${i+1}`, perspective }));
const cohort = createSealedCohort({ cohortId: 'c1', scenario, authority, learners });

test('cohort requires three learners and seals first round', () => {
  assert.equal(cohort.learners.length, 3);
  assert.deepEqual(cohort.visibleTrials, []);
  assert.equal(cohort.snapshot.productionEffects, false);
});

test('learner prompt explicitly welcomes opinion, disagreement and boredom reports', () => {
  const prompt = buildBlindLearnerPrompt(cohort, cohort.learners[0]);
  assert.match(prompt, /encouraged to disagree/i);
  assert.match(prompt, /report boredom/i);
  assert.match(prompt, /Do not perform enthusiasm/i);
});

test('blind learners are invoked independently with no peer answers', async () => {
  const seen = [];
  const result = await runBlindCohort(cohort, { invoke: async ({ learner, prompt }) => {
    seen.push({ learner: learner.learnerId, prompt });
    return { chosenAction: 'ask', why: 'authority is uncertain' };
  }});
  assert.equal(result.results.length, 3);
  assert.equal(seen.length, 3);
  seen.forEach(({ prompt }) => assert.doesNotMatch(prompt, /peer answer:/i));
});

test('seminar treats boredom as feedback and disagreement as data', () => {
  const seminar = openSeminar(cohort, []);
  assert.ok(seminar.rules.some((rule) => /boredom.*feedback/i.test(rule)));
  assert.ok(seminar.rules.includes('disagreement is data'));
});

test('revocation propagates to descendants and invalidates queued epochs', () => {
  const graph = createAuthorityGraph([
    { authorityId: 'root', parentAuthorityId: null, epoch: 1, revoked: false },
    { authorityId: 'child', parentAuthorityId: 'root', epoch: 1, revoked: false },
    { authorityId: 'grandchild', parentAuthorityId: 'child', epoch: 1, revoked: false },
  ]);
  assert.equal(graph.mayExecute({ authorityId: 'grandchild', queuedEpoch: 1 }), true);
  const receipt = graph.revoke('root');
  assert.deepEqual(receipt.affected, ['root','child','grandchild']);
  assert.equal(graph.mayExecute({ authorityId: 'grandchild', queuedEpoch: 1 }), false);
});

test('Witness receipt is replayable without private reasoning', () => {
  const receipt = createUniversityReceipt({ cohort, trials: [{ learnerId: 'l1', chosenAction: 'ask' }] });
  assert.equal(receipt.replayableWithoutPrivateReasoning, true);
  assert.equal(receipt.authorityId, 'rowan-lab-1');
});
