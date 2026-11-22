export const CODEX_WONDER_TRAJECTORY_SCHEMA = 'hearthweave.codex-wonder-trajectory/v0.1';
export const CODEX_WONDER_RETURN_SCHEMA = 'hearthweave.codex-wonder-return-candidate/v0.1';

function at(value) {
  const time = Date.parse(String(value || ''));
  return Number.isFinite(time) ? time : 0;
}

function text(value) {
  return String(value || '').trim();
}

function freezeRows(rows = []) {
  return Object.freeze(rows.map((row) => Object.freeze({ ...row })));
}

export function createWonderTrajectory(openQuestion = {}) {
  if (!openQuestion?.questionId) throw new Error('Wonder trajectory requires questionId.');
  const events = [];
  events.push({
    kind: 'question-created',
    at: String(openQuestion.createdAt || ''),
    ref: openQuestion.questionId,
    text: text(openQuestion.question),
  });
  for (const revisit of openQuestion.revisits || []) {
    events.push({
      kind: 'question-revisited',
      at: String(revisit.createdAt || ''),
      ref: revisit.revisitId || null,
      text: text(revisit.note),
    });
  }
  for (const resolution of openQuestion.resolutions || []) {
    events.push({
      kind: 'question-resolution-recorded',
      at: String(resolution.createdAt || ''),
      ref: resolution.resolutionId || null,
      text: text(resolution.statement),
      mode: resolution.mode || 'tentative',
      confidence: resolution.confidence ?? null,
    });
  }
  events.sort((a, b) => at(a.at) - at(b.at) || `${a.kind}:${a.ref || ''}`.localeCompare(`${b.kind}:${b.ref || ''}`));
  const last = events[events.length - 1] || null;
  return Object.freeze({
    schema: CODEX_WONDER_TRAJECTORY_SCHEMA,
    questionId: openQuestion.questionId,
    question: text(openQuestion.question),
    originWishId: openQuestion.originWishId || null,
    status: openQuestion.status || 'open',
    revisitWorthwhile: openQuestion.revisitWorthwhile !== false,
    preserveBelief: openQuestion.preserveBelief !== false,
    eventCount: events.length,
    revisitCount: (openQuestion.revisits || []).length,
    resolutionCount: (openQuestion.resolutions || []).length,
    firstAt: String(openQuestion.createdAt || ''),
    lastAt: String(last?.at || openQuestion.updatedAt || openQuestion.createdAt || ''),
    events: freezeRows(events),
  });
}

export function buildWonderTrajectories(lineage = {}) {
  return Object.freeze((lineage.openQuestions || [])
    .map(createWonderTrajectory)
    .sort((a, b) => String(a.questionId).localeCompare(String(b.questionId))));
}

export function selectWonderReturnCandidates(lineage = {}, {
  asOf,
  minimumDormantDays = 7,
  limit = 6,
} = {}) {
  const asOfTime = at(asOf);
  if (!asOfTime) throw new Error('Wonder return selection requires a valid asOf timestamp.');
  const dayMs = 24 * 60 * 60 * 1000;
  const candidates = [];

  for (const question of lineage.openQuestions || []) {
    if (question.status !== 'open' || question.revisitWorthwhile === false) continue;
    const trajectory = createWonderTrajectory(question);
    const lastTime = at(question.updatedAt) || at(trajectory.lastAt) || at(question.createdAt);
    if (!lastTime || lastTime > asOfTime) continue;
    const dormantDays = Math.floor((asOfTime - lastTime) / dayMs);
    if (dormantDays < Math.max(0, Number(minimumDormantDays) || 0)) continue;

    const reasons = [];
    reasons.push(`unvisited-${dormantDays}-days`);
    if (trajectory.revisitCount > 0) reasons.push('revisited-before');
    if (question.originWishId) reasons.push('wish-rooted');
    if ((question.evidenceRefs || []).length) reasons.push('evidence-bearing');
    if ((question.beliefRefs || []).length) reasons.push('belief-bearing');
    if ((question.symbolRefs || []).length) reasons.push('symbol-bearing');
    if (question.whyItMatters) reasons.push('meaning-marked');

    candidates.push(Object.freeze({
      schema: CODEX_WONDER_RETURN_SCHEMA,
      questionId: question.questionId,
      question: text(question.question),
      dormantDays,
      lastAt: String(question.updatedAt || trajectory.lastAt || question.createdAt || ''),
      originWishId: question.originWishId || null,
      reasons: Object.freeze(reasons),
      // Selection is based on explicit lineage and elapsed time, not a model claim
      // that one question is intrinsically more valuable than another.
      revisitWorthwhile: true,
    }));
  }

  return Object.freeze(candidates
    .sort((a, b) => b.dormantDays - a.dormantDays || String(a.questionId).localeCompare(String(b.questionId)))
    .slice(0, Math.max(0, Number(limit) || 0)));
}
