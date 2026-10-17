export const CODEX_POSSIBILITY_TREE_SCHEMA = 'hearthweave.codex-possibility-tree/v0.1';

const BANDS = Object.freeze({
  wish: 0.10,
  branch: 0.34,
  question: 0.58,
  anchor: 0.82,
  reference: 0.94,
});

function hash(value) {
  let state = 2166136261;
  for (const character of String(value || '')) {
    state ^= character.codePointAt(0);
    state = Math.imul(state, 16777619);
  }
  return state >>> 0;
}

function list(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))].sort();
}

function nodeId(kind, value) {
  return `${kind}:${String(value || '')}`;
}

function yFor(id, index, count) {
  if (count <= 1) return 0.5;
  const base = (index + 1) / (count + 1);
  const jitter = (((hash(id) % 1001) / 1000) - 0.5) * Math.min(0.05, 0.28 / count);
  return Number(Math.max(0.05, Math.min(0.95, base + jitter)).toFixed(6));
}

function freezeNode(node) {
  return Object.freeze({ ...node });
}

function freezeEdge(edge) {
  return Object.freeze({ ...edge, reasons: Object.freeze([...(edge.reasons || [])]) });
}

function makeBandNodes(rows, kind, labelFor, extraFor = () => ({})) {
  const sorted = [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return sorted.map((row, index) => freezeNode({
    id: row.id,
    kind,
    label: labelFor(row),
    x: BANDS[kind],
    y: yFor(row.id, index, sorted.length),
    ...extraFor(row),
  }));
}

export function buildCodexPossibilityTree(lineage = {}) {
  const wishes = [...(lineage.wishes || [])];
  const questions = [...(lineage.openQuestions || [])];
  const branchRows = [];
  const anchorRows = new Map();
  const referenceRows = new Map();
  const edges = [];

  for (const wish of wishes) {
    const wishNode = nodeId('wish', wish.wishId);
    for (const branch of wish.possibilityBranches || []) {
      const branchNode = nodeId('branch', branch.branchId);
      branchRows.push({ id: branchNode, wishId: wish.wishId, branch });
      edges.push(freezeEdge({
        id: `edge:${wishNode}->${branchNode}`,
        kind: 'wish-branch',
        from: wishNode,
        to: branchNode,
        reasons: ['explicit-wish-branch'],
      }));
      for (const parentId of branch.parentBranchIds || []) {
        edges.push(freezeEdge({
          id: `edge:${nodeId('branch', parentId)}->${branchNode}`,
          kind: 'branch-branch',
          from: nodeId('branch', parentId),
          to: branchNode,
          reasons: ['explicit-merge-parent'],
        }));
      }
    }

    const anchorGroups = [
      ['continuity', wish.continuityAnchors || []],
      ['relationship', wish.relationshipsTouched || []],
      ['memory', wish.memoryRefs || []],
    ];
    for (const [anchorKind, values] of anchorGroups) {
      for (const value of list(values)) {
        const anchor = nodeId(`anchor-${anchorKind}`, value);
        anchorRows.set(anchor, { id: anchor, anchorKind, value });
        edges.push(freezeEdge({
          id: `edge:${wishNode}->${anchor}`,
          kind: `wish-${anchorKind}-anchor`,
          from: wishNode,
          to: anchor,
          reasons: [`explicit-${anchorKind}-anchor`],
        }));
      }
    }
  }

  for (const question of questions) {
    const questionNode = nodeId('question', question.questionId);
    if (question.originWishId) {
      edges.push(freezeEdge({
        id: `edge:${nodeId('wish', question.originWishId)}->${questionNode}`,
        kind: 'wish-question',
        from: nodeId('wish', question.originWishId),
        to: questionNode,
        reasons: ['explicit-origin-wish'],
      }));
    }
    const refs = [
      ['belief', question.beliefRefs || []],
      ['evidence', question.evidenceRefs || []],
      ['symbol', question.symbolRefs || []],
    ];
    for (const [refKind, values] of refs) {
      for (const value of list(values)) {
        const ref = nodeId(`ref-${refKind}`, value);
        referenceRows.set(ref, { id: ref, refKind, value });
        edges.push(freezeEdge({
          id: `edge:${questionNode}->${ref}`,
          kind: `question-${refKind}-reference`,
          from: questionNode,
          to: ref,
          reasons: [`explicit-${refKind}-reference`],
        }));
      }
    }
  }

  const wishNodes = makeBandNodes(
    wishes.map((wish) => ({ id: nodeId('wish', wish.wishId), wish })),
    'wish',
    (row) => row.wish.desire || row.wish.wishId,
    (row) => ({ refId: row.wish.wishId, status: row.wish.status || 'open' }),
  );
  const branchNodes = makeBandNodes(
    branchRows,
    'branch',
    (row) => row.branch.label || row.branch.branchId,
    (row) => ({
      refId: row.branch.branchId,
      wishId: row.wishId,
      status: row.branch.status || 'open',
      relation: row.branch.relation || 'possibility',
    }),
  );
  const questionNodes = makeBandNodes(
    questions.map((question) => ({ id: nodeId('question', question.questionId), question })),
    'question',
    (row) => row.question.question || row.question.questionId,
    (row) => ({ refId: row.question.questionId, status: row.question.status || 'open' }),
  );
  const anchorNodes = makeBandNodes(
    [...anchorRows.values()],
    'anchor',
    (row) => row.value,
    (row) => ({ refId: row.value, anchorKind: row.anchorKind }),
  );
  const referenceNodes = makeBandNodes(
    [...referenceRows.values()],
    'reference',
    (row) => row.value,
    (row) => ({ refId: row.value, referenceKind: row.refKind }),
  );

  const nodes = [...wishNodes, ...branchNodes, ...questionNodes, ...anchorNodes, ...referenceNodes];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const visibleEdges = edges
    .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
    .sort((a, b) => a.id.localeCompare(b.id));

  return Object.freeze({
    schema: CODEX_POSSIBILITY_TREE_SCHEMA,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(visibleEdges),
    counts: Object.freeze({
      wishes: wishNodes.length,
      branches: branchNodes.length,
      questions: questionNodes.length,
      anchors: anchorNodes.length,
      references: referenceNodes.length,
    }),
    doctrine: Object.freeze({
      deterministicLayout: true,
      positionsEncodeTypeNotImportance: true,
      explicitEdgesOnly: true,
      ranksPossibilities: false,
      selectsWinner: false,
      preservesDistinctKinds: true,
    }),
  });
}
