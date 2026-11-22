export const CODEX_WISH_SCHEMA = 'hearthweave.codex-wish/v0.1';
export const CODEX_OPEN_QUESTION_SCHEMA = 'hearthweave.codex-open-question/v0.1';
export const CODEX_WISH_LINEAGE_SCHEMA = 'hearthweave.codex-wish-lineage/v0.1';

function text(value, label = 'value') {
  const result = String(value || '').trim();
  if (!result) throw new Error(`${label} is required.`);
  return result;
}

function optionalText(value) {
  const result = String(value || '').trim();
  return result || null;
}

function list(values = []) {
  return Object.freeze([...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))]);
}

function freezeRows(rows = []) {
  return Object.freeze((Array.isArray(rows) ? rows : []).map((row) => Object.freeze({ ...row })));
}

function immutableWish(value) {
  return Object.freeze({
    ...value,
    continuityAnchors: list(value.continuityAnchors),
    relationshipsTouched: list(value.relationshipsTouched),
    memoryRefs: list(value.memoryRefs),
    openQuestionIds: list(value.openQuestionIds),
    provenance: list(value.provenance),
    receipts: list(value.receipts),
    possibilityBranches: freezeRows(value.possibilityBranches),
    revisions: freezeRows(value.revisions),
    transformations: freezeRows(value.transformations),
  });
}

function immutableQuestion(value) {
  return Object.freeze({
    ...value,
    provenance: list(value.provenance),
    beliefRefs: list(value.beliefRefs),
    evidenceRefs: list(value.evidenceRefs),
    symbolRefs: list(value.symbolRefs),
    revisits: freezeRows(value.revisits),
    resolutions: freezeRows(value.resolutions),
  });
}

export function createCodexWish({
  wishId,
  origin,
  desire,
  whyItMatters = '',
  worldOrScope = 'unscoped',
  continuityAnchors = [],
  relationshipsTouched = [],
  memoryRefs = [],
  openQuestionIds = [],
  createdAt = '',
  provenance = [],
} = {}) {
  return immutableWish({
    schema: CODEX_WISH_SCHEMA,
    wishId: text(wishId, 'wishId'),
    lineageRootId: text(wishId, 'wishId'),
    origin: text(origin, 'origin'),
    desire: text(desire, 'desire'),
    whyItMatters: optionalText(whyItMatters),
    worldOrScope: String(worldOrScope || 'unscoped'),
    status: 'open',
    revision: 1,
    createdAt: String(createdAt || ''),
    updatedAt: String(createdAt || ''),
    continuityAnchors,
    relationshipsTouched,
    memoryRefs,
    openQuestionIds,
    possibilityBranches: [],
    revisions: [],
    transformations: [],
    provenance,
    receipts: [],
    unlimitedPossibility: true,
    preservesOriginLineage: true,
  });
}

export function branchCodexWish(wish, {
  branchId,
  label,
  possibility,
  createdAt = '',
  provenance = [],
} = {}) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const id = text(branchId, 'branchId');
  if ((wish.possibilityBranches || []).some((branch) => branch.branchId === id)) {
    throw new Error(`Duplicate wish branch: ${id}`);
  }
  const branch = Object.freeze({
    branchId: id,
    parentWishId: wish.wishId,
    lineageRootId: wish.lineageRootId || wish.wishId,
    label: text(label || possibility, 'label'),
    possibility: text(possibility, 'possibility'),
    status: 'open',
    createdAt: String(createdAt || ''),
    provenance: list(provenance),
  });
  return immutableWish({
    ...wish,
    updatedAt: String(createdAt || wish.updatedAt || ''),
    possibilityBranches: [...(wish.possibilityBranches || []), branch],
  });
}

export function reviseCodexWish(wish, {
  desire = null,
  whyItMatters = undefined,
  worldOrScope = undefined,
  reason,
  createdAt = '',
  provenance = [],
} = {}) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const nextDesire = desire == null ? wish.desire : text(desire, 'desire');
  const nextWhy = whyItMatters === undefined ? wish.whyItMatters : optionalText(whyItMatters);
  const nextScope = worldOrScope === undefined ? wish.worldOrScope : String(worldOrScope || 'unscoped');
  const revisionRecord = Object.freeze({
    revision: Number(wish.revision || 1) + 1,
    previous: Object.freeze({ desire: wish.desire, whyItMatters: wish.whyItMatters, worldOrScope: wish.worldOrScope }),
    next: Object.freeze({ desire: nextDesire, whyItMatters: nextWhy, worldOrScope: nextScope }),
    reason: text(reason, 'reason'),
    createdAt: String(createdAt || ''),
    provenance: list(provenance),
  });
  return immutableWish({
    ...wish,
    desire: nextDesire,
    whyItMatters: nextWhy,
    worldOrScope: nextScope,
    revision: revisionRecord.revision,
    updatedAt: String(createdAt || wish.updatedAt || ''),
    revisions: [...(wish.revisions || []), revisionRecord],
    provenance: [...(wish.provenance || []), ...provenance],
  });
}

export function recordWishTransformation(wish, {
  transformationId,
  kind,
  description,
  createdAt = '',
  receiptRefs = [],
  provenance = [],
} = {}) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const record = Object.freeze({
    transformationId: text(transformationId, 'transformationId'),
    kind: text(kind, 'kind'),
    description: text(description, 'description'),
    createdAt: String(createdAt || ''),
    receiptRefs: list(receiptRefs),
    provenance: list(provenance),
  });
  if ((wish.transformations || []).some((row) => row.transformationId === record.transformationId)) {
    throw new Error(`Duplicate wish transformation: ${record.transformationId}`);
  }
  return immutableWish({
    ...wish,
    status: record.kind === 'realised' ? 'realised' : wish.status,
    updatedAt: String(createdAt || wish.updatedAt || ''),
    transformations: [...(wish.transformations || []), record],
    provenance: [...(wish.provenance || []), ...provenance],
    receipts: [...(wish.receipts || []), ...receiptRefs],
  });
}

export function linkWishOpenQuestion(wish, questionId) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  return immutableWish({ ...wish, openQuestionIds: [...(wish.openQuestionIds || []), text(questionId, 'questionId')] });
}

export function createCodexOpenQuestion({
  questionId,
  question,
  originWishId = null,
  originRef = null,
  whyItMatters = '',
  worldOrScope = 'unscoped',
  createdAt = '',
  provenance = [],
  beliefRefs = [],
  evidenceRefs = [],
  symbolRefs = [],
} = {}) {
  return immutableQuestion({
    schema: CODEX_OPEN_QUESTION_SCHEMA,
    questionId: text(questionId, 'questionId'),
    question: text(question, 'question'),
    originWishId: optionalText(originWishId),
    originRef: optionalText(originRef),
    whyItMatters: optionalText(whyItMatters),
    worldOrScope: String(worldOrScope || 'unscoped'),
    status: 'open',
    createdAt: String(createdAt || ''),
    updatedAt: String(createdAt || ''),
    revisitWorthwhile: true,
    preserveBelief: true,
    beliefRefs,
    evidenceRefs,
    symbolRefs,
    revisits: [],
    resolutions: [],
    provenance,
  });
}

export function revisitCodexOpenQuestion(openQuestion, {
  revisitId,
  note,
  createdAt = '',
  evidenceRefs = [],
  beliefRefs = [],
  symbolRefs = [],
  provenance = [],
} = {}) {
  if (!openQuestion?.questionId) throw new Error('An open question is required.');
  const record = Object.freeze({
    revisitId: text(revisitId, 'revisitId'),
    note: text(note, 'note'),
    createdAt: String(createdAt || ''),
    evidenceRefs: list(evidenceRefs),
    beliefRefs: list(beliefRefs),
    symbolRefs: list(symbolRefs),
    provenance: list(provenance),
  });
  if ((openQuestion.revisits || []).some((row) => row.revisitId === record.revisitId)) {
    throw new Error(`Duplicate question revisit: ${record.revisitId}`);
  }
  return immutableQuestion({
    ...openQuestion,
    updatedAt: String(createdAt || openQuestion.updatedAt || ''),
    revisits: [...(openQuestion.revisits || []), record],
    evidenceRefs: [...(openQuestion.evidenceRefs || []), ...evidenceRefs],
    beliefRefs: [...(openQuestion.beliefRefs || []), ...beliefRefs],
    symbolRefs: [...(openQuestion.symbolRefs || []), ...symbolRefs],
    provenance: [...(openQuestion.provenance || []), ...provenance],
  });
}

export function resolveCodexOpenQuestion(openQuestion, {
  resolutionId,
  statement,
  confidence = null,
  mode = 'tentative',
  createdAt = '',
  provenance = [],
} = {}) {
  if (!openQuestion?.questionId) throw new Error('An open question is required.');
  const record = Object.freeze({
    resolutionId: text(resolutionId, 'resolutionId'),
    statement: text(statement, 'statement'),
    confidence: confidence == null ? null : Number(confidence),
    mode: String(mode || 'tentative'),
    createdAt: String(createdAt || ''),
    provenance: list(provenance),
  });
  if ((openQuestion.resolutions || []).some((row) => row.resolutionId === record.resolutionId)) {
    throw new Error(`Duplicate question resolution: ${record.resolutionId}`);
  }
  return immutableQuestion({
    ...openQuestion,
    status: 'resolved',
    updatedAt: String(createdAt || openQuestion.updatedAt || ''),
    resolutions: [...(openQuestion.resolutions || []), record],
    provenance: [...(openQuestion.provenance || []), ...provenance],
  });
}

export function reopenCodexOpenQuestion(openQuestion, {
  revisitId,
  reason,
  createdAt = '',
  provenance = [],
} = {}) {
  const reopened = revisitCodexOpenQuestion(openQuestion, {
    revisitId,
    note: text(reason, 'reason'),
    createdAt,
    provenance,
  });
  return immutableQuestion({ ...reopened, status: 'open' });
}

export function createCodexWishLineage({ wishes = [], openQuestions = [] } = {}) {
  const wishRows = [...(Array.isArray(wishes) ? wishes : [])].sort((a, b) => String(a.wishId || '').localeCompare(String(b.wishId || '')));
  const questionRows = [...(Array.isArray(openQuestions) ? openQuestions : [])].sort((a, b) => String(a.questionId || '').localeCompare(String(b.questionId || '')));
  const wishIds = new Set();
  for (const wish of wishRows) {
    if (!wish?.wishId) throw new Error('Wish lineage contains a wish without wishId.');
    if (wishIds.has(wish.wishId)) throw new Error(`Duplicate wishId in lineage: ${wish.wishId}`);
    wishIds.add(wish.wishId);
  }
  const questionIds = new Set();
  for (const question of questionRows) {
    if (!question?.questionId) throw new Error('Wish lineage contains a question without questionId.');
    if (questionIds.has(question.questionId)) throw new Error(`Duplicate questionId in lineage: ${question.questionId}`);
    questionIds.add(question.questionId);
  }
  const edges = [];
  for (const wish of wishRows) {
    for (const questionId of wish.openQuestionIds || []) {
      edges.push(Object.freeze({ kind: 'wish-question', from: wish.wishId, to: questionId }));
    }
    for (const branch of wish.possibilityBranches || []) {
      edges.push(Object.freeze({ kind: 'wish-branch', from: wish.wishId, to: branch.branchId }));
    }
  }
  for (const question of questionRows) {
    if (question.originWishId) edges.push(Object.freeze({ kind: 'question-origin', from: question.originWishId, to: question.questionId }));
  }
  edges.sort((a, b) => `${a.kind}:${a.from}:${a.to}`.localeCompare(`${b.kind}:${b.from}:${b.to}`));
  return Object.freeze({
    schema: CODEX_WISH_LINEAGE_SCHEMA,
    wishes: Object.freeze(wishRows),
    openQuestions: Object.freeze(questionRows),
    edges: Object.freeze(edges),
    doctrine: Object.freeze({
      unlimitedPossibility: true,
      noArtificialScarcityOfImagination: true,
      preserveOriginLineage: true,
      preserveOpenQuestions: true,
      revisionWithoutErasure: true,
      realisationDoesNotEraseAlternatives: true,
    }),
  });
}
