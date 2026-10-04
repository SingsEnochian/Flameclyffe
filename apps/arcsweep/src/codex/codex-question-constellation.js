export const CODEX_QUESTION_CONSTELLATION_SCHEMA = 'hearthweave.codex-question-constellation/v0.1';

function hash(value) {
  let state = 2166136261;
  for (const character of String(value || '')) {
    state ^= character.codePointAt(0);
    state = Math.imul(state, 16777619);
  }
  return state >>> 0;
}

function refs(question = {}) {
  return Object.freeze({
    belief: Object.freeze([...(question.beliefRefs || [])].map(String).filter(Boolean)),
    evidence: Object.freeze([...(question.evidenceRefs || [])].map(String).filter(Boolean)),
    symbol: Object.freeze([...(question.symbolRefs || [])].map(String).filter(Boolean)),
  });
}

function nodeForQuestion(question = {}, index = 0, total = 1) {
  const id = String(question.questionId || `question-${index}`);
  const seed = hash(id);
  const baseAngle = total <= 1 ? 0 : (Math.PI * 2 * index) / total;
  const jitter = ((seed % 1000) / 1000 - 0.5) * 0.42;
  const radius = question.status === 'open' ? 0.82 : 0.58;
  const angle = baseAngle + jitter;
  return Object.freeze({
    id,
    kind: 'question',
    label: String(question.question || id),
    status: String(question.status || 'open'),
    originWishId: question.originWishId ? String(question.originWishId) : null,
    whyItMatters: question.whyItMatters ? String(question.whyItMatters) : null,
    revisitCount: (question.revisits || []).length,
    resolutionCount: (question.resolutions || []).length,
    refs: refs(question),
    x: Number((0.5 + Math.cos(angle) * radius * 0.45).toFixed(6)),
    y: Number((0.5 + Math.sin(angle) * radius * 0.45).toFixed(6)),
  });
}

function shared(left = [], right = []) {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

function relationReasons(left, right) {
  const reasons = [];
  if (left.originWishId && left.originWishId === right.originWishId) reasons.push('shared-origin-wish');
  if (shared(left.refs.belief, right.refs.belief).length) reasons.push('shared-belief-reference');
  if (shared(left.refs.evidence, right.refs.evidence).length) reasons.push('shared-evidence-reference');
  if (shared(left.refs.symbol, right.refs.symbol).length) reasons.push('shared-symbol-reference');
  return Object.freeze(reasons);
}

export function buildOpenQuestionsConstellation(lineage = {}) {
  const questions = [...(lineage.openQuestions || [])]
    .sort((a, b) => String(a.questionId || '').localeCompare(String(b.questionId || '')));
  const wishes = new Map((lineage.wishes || []).map((wish) => [String(wish.wishId), wish]));
  const nodes = questions.map((question, index) => nodeForQuestion(question, index, Math.max(1, questions.length)));
  const edges = [];

  for (const node of nodes) {
    if (node.originWishId && wishes.has(node.originWishId)) {
      edges.push(Object.freeze({
        id: `wish-question:${node.originWishId}:${node.id}`,
        kind: 'wish-question',
        from: node.originWishId,
        to: node.id,
        reasons: Object.freeze(['origin-wish']),
      }));
    }
    for (const [kind, values] of Object.entries(node.refs)) {
      for (const value of values) {
        edges.push(Object.freeze({
          id: `${kind}:${node.id}:${value}`,
          kind: `${kind}-reference`,
          from: node.id,
          to: value,
          reasons: Object.freeze([`${kind}-reference`]),
        }));
      }
    }
  }

  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex];
      const right = nodes[rightIndex];
      const reasons = relationReasons(left, right);
      if (!reasons.length) continue;
      edges.push(Object.freeze({
        id: `question-question:${left.id}:${right.id}`,
        kind: 'question-question',
        from: left.id,
        to: right.id,
        reasons,
      }));
    }
  }

  edges.sort((a, b) => a.id.localeCompare(b.id));
  return Object.freeze({
    schema: CODEX_QUESTION_CONSTELLATION_SCHEMA,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    openCount: nodes.filter((node) => node.status === 'open').length,
    resolvedCount: nodes.filter((node) => node.status === 'resolved').length,
    doctrine: Object.freeze({
      deterministicLayout: true,
      ranksQuestions: false,
      selectsPriority: false,
      preservesReferenceKinds: true,
      relationEdgesAreDescriptiveOnly: true,
    }),
  });
}
