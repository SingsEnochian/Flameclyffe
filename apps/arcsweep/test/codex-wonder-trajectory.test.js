import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildWonderTrajectories,
  createWonderTrajectory,
  selectWonderReturnCandidates,
} from '../src/codex/codex-wonder-trajectory.js';
import {
  createCodexOpenQuestion,
  revisitCodexOpenQuestion,
  resolveCodexOpenQuestion,
} from '../src/codex/codex-wish-lineage.js';

const CREATED = '2026-09-01T12:00:00.000Z';
const REVISITED = '2026-09-05T12:00:00.000Z';
const RESOLVED = '2026-09-06T12:00:00.000Z';
const AS_OF = '2026-09-28T12:00:00.000Z';

test('Wonder trajectory preserves creation, revisit and resolution as separate ordered events', () => {
  let question = createCodexOpenQuestion({
    questionId: 'question:old-light',
    question: 'Why did the light seem different?',
    createdAt: CREATED,
  });
  question = revisitCodexOpenQuestion(question, {
    revisitId: 'revisit:one',
    note: 'A second observation made the old question interesting again.',
    createdAt: REVISITED,
  });
  question = resolveCodexOpenQuestion(question, {
    resolutionId: 'resolution:one',
    statement: 'One working explanation now exists.',
    mode: 'tentative',
    createdAt: RESOLVED,
  });

  const trajectory = createWonderTrajectory(question);
  assert.equal(trajectory.eventCount, 3);
  assert.deepEqual(trajectory.events.map((row) => row.kind), [
    'question-created',
    'question-revisited',
    'question-resolution-recorded',
  ]);
  assert.equal(trajectory.question, 'Why did the light seem different?');
  assert.equal(trajectory.preserveBelief, true);
});

test('Wonder trajectories are deterministic regardless of lineage input order', () => {
  const a = createCodexOpenQuestion({ questionId: 'question:a', question: 'A?', createdAt: CREATED });
  const b = createCodexOpenQuestion({ questionId: 'question:b', question: 'B?', createdAt: CREATED });
  assert.deepEqual(
    buildWonderTrajectories({ openQuestions: [b, a] }),
    buildWonderTrajectories({ openQuestions: [a, b] }),
  );
});

test('return candidates use explicit open lineage plus elapsed time rather than invented value scores', () => {
  let old = createCodexOpenQuestion({
    questionId: 'question:old',
    question: 'What deserves another look?',
    originWishId: 'wish:one',
    whyItMatters: 'It connected two unrelated ideas.',
    createdAt: CREATED,
    evidenceRefs: ['evidence://one'],
    symbolRefs: ['symbol://one'],
  });
  old = revisitCodexOpenQuestion(old, {
    revisitId: 'revisit:old',
    note: 'Returned once already.',
    createdAt: REVISITED,
  });
  const recent = createCodexOpenQuestion({
    questionId: 'question:recent',
    question: 'Too recent?',
    createdAt: '2026-09-27T12:00:00.000Z',
  });
  const resolved = resolveCodexOpenQuestion(
    createCodexOpenQuestion({ questionId: 'question:resolved', question: 'Already answered?', createdAt: CREATED }),
    { resolutionId: 'resolution:done', statement: 'Recorded answer.', createdAt: RESOLVED },
  );

  const candidates = selectWonderReturnCandidates(
    { openQuestions: [recent, resolved, old] },
    { asOf: AS_OF, minimumDormantDays: 7 },
  );

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].questionId, 'question:old');
  assert.equal(candidates[0].dormantDays, 23);
  assert.ok(candidates[0].reasons.includes('revisited-before'));
  assert.ok(candidates[0].reasons.includes('wish-rooted'));
  assert.ok(candidates[0].reasons.includes('evidence-bearing'));
  assert.ok(candidates[0].reasons.includes('symbol-bearing'));
  assert.equal('score' in candidates[0], false);
});

test('return selection requires explicit time so replay can be reproduced', () => {
  const question = createCodexOpenQuestion({ questionId: 'question:x', question: 'X?', createdAt: CREATED });
  assert.throws(
    () => selectWonderReturnCandidates({ openQuestions: [question] }),
    /requires a valid asOf timestamp/i,
  );
});
