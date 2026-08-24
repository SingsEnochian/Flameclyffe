import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { compareRelationalAnchorSets, RELATIONAL_ANCHOR_SET_SCHEMA } from './relational-invariant-anchors.js';

export const THREAD_WALK_SCHEMA = 'arcsweep.thread-walk/v1';
export const THREAD_WALK_EXPERIMENT_SCHEMA = 'arcsweep.thread-walk-minimum-anchor-experiment/v1';

const DONOR = Object.freeze({
  title: 'Recognition Anchoring Across Indexing Inequivalence v1.0',
  corpus_id: 'bseng-rse',
  source_id: 'bseng:82e95e73ad969a607dde',
  source_hash: '82e95e73ad969a607ddec3aa24bc65df1db77cd4faed15dea97e67ceae9fe9a0',
  lineage_credit: 'Thread-walking (Ryan and Solas, The Circle)',
  relation: 'formalized-as',
});

function round(value, places = 8) { const scale = 10 ** places; return Math.round(Number(value) * scale) / scale; }

function anchorPool(correspondence) {
  return correspondence.comparisons
    .filter((item) => item.visibility > 0)
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      similarity: item.similarity,
      visibility: item.visibility,
      weight: item.weight,
      left_ref: item.left_ref,
      right_ref: item.right_ref,
      contribution: round(item.weight * item.visibility * item.similarity),
      visible_weight: round(item.weight * item.visibility),
    }));
}

function scoreSet(items, nominalTotal) {
  const visible = items.reduce((sum, item) => sum + item.visible_weight, 0);
  const matched = items.reduce((sum, item) => sum + item.contribution, 0);
  return {
    correspondence: visible ? round(matched / visible) : null,
    coverage_mass: nominalTotal ? round(visible / nominalTotal) : 0,
    visible_weight: round(visible),
  };
}

function sufficient(metrics, { minimumCorrespondence, minimumCoverage, minimumAnchors }, count) {
  return count >= minimumAnchors
    && metrics.correspondence != null
    && metrics.correspondence >= minimumCorrespondence
    && metrics.coverage_mass >= minimumCoverage;
}

export async function createThreadWalk({
  leftAnchorSet,
  rightAnchorSet,
  minimumCorrespondence = 0.8,
  minimumCoverage = 0.5,
  minimumAnchors = 2,
  generatedAt = new Date().toISOString(),
} = {}) {
  if (leftAnchorSet?.schema !== RELATIONAL_ANCHOR_SET_SCHEMA || rightAnchorSet?.schema !== RELATIONAL_ANCHOR_SET_SCHEMA) {
    throw new Error('THREAD_WALK: two relational anchor sets are required');
  }
  const correspondence = await compareRelationalAnchorSets(leftAnchorSet, rightAnchorSet, { generatedAt });
  const pool = anchorPool(correspondence);
  const nominalTotal = pool.reduce((sum, item) => sum + item.weight, 0);
  const ranked = [...pool].sort((a, b) => b.contribution - a.contribution || b.visible_weight - a.visible_weight || a.id.localeCompare(b.id));
  const selected = [];
  let metrics = scoreSet(selected, nominalTotal);
  for (const anchor of ranked) {
    selected.push(anchor);
    metrics = scoreSet(selected, nominalTotal);
    if (sufficient(metrics, { minimumCorrespondence, minimumCoverage, minimumAnchors }, selected.length)) break;
  }
  const status = sufficient(metrics, { minimumCorrespondence, minimumCoverage, minimumAnchors }, selected.length)
    ? 'SUFFICIENT_ANCHOR_SET'
    : pool.length < minimumAnchors
      ? 'INSUFFICIENT_VISIBLE_ANCHORS'
      : 'ANCHORS_DO_NOT_RESTORE_CORRESPONDENCE';
  const core = {
    schema: THREAD_WALK_SCHEMA,
    schema_version: 1,
    generated_at: new Date(generatedAt).toISOString(),
    voice_id: leftAnchorSet.voice_id,
    left_anchor_set_id: leftAnchorSet.anchor_set_id,
    right_anchor_set_id: rightAnchorSet.anchor_set_id,
    selected_anchors: selected,
    metrics,
    thresholds: {
      minimum_correspondence: minimumCorrespondence,
      minimum_coverage: minimumCoverage,
      minimum_anchors: minimumAnchors,
    },
    status,
    provenance: { implementation_donor: DONOR },
    authority: {
      restoration_means_operational_correspondence: true,
      restoration_proves_identity: false,
      failed_restoration_proves_rupture: false,
      hidden_reasoning_required: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, thread_walk_id: `thread-walk-${fingerprint.slice(0, 24)}`, fingerprint });
}

function combinations(items, size, start = 0, prefix = [], out = []) {
  if (prefix.length === size) { out.push([...prefix]); return out; }
  for (let index = start; index < items.length; index += 1) {
    prefix.push(items[index]);
    combinations(items, size, index + 1, prefix, out);
    prefix.pop();
  }
  return out;
}

export async function runMinimumAnchorExperiment({
  leftAnchorSet,
  rightAnchorSet,
  minimumCorrespondence = 0.8,
  minimumCoverage = 0.5,
  minimumAnchors = 2,
  exhaustiveLimit = 12,
  generatedAt = new Date().toISOString(),
} = {}) {
  const correspondence = await compareRelationalAnchorSets(leftAnchorSet, rightAnchorSet, { generatedAt });
  const pool = anchorPool(correspondence);
  const nominalTotal = pool.reduce((sum, item) => sum + item.weight, 0);
  const solutions = [];
  if (pool.length <= exhaustiveLimit) {
    outer: for (let size = minimumAnchors; size <= pool.length; size += 1) {
      for (const subset of combinations(pool, size)) {
        const metrics = scoreSet(subset, nominalTotal);
        if (sufficient(metrics, { minimumCorrespondence, minimumCoverage, minimumAnchors }, subset.length)) {
          solutions.push({ anchor_ids: subset.map((item) => item.id).sort(), metrics });
        }
      }
      if (solutions.length) break outer;
    }
  }
  const greedy = await createThreadWalk({ leftAnchorSet, rightAnchorSet, minimumCorrespondence, minimumCoverage, minimumAnchors, generatedAt });
  const core = {
    schema: THREAD_WALK_EXPERIMENT_SCHEMA,
    schema_version: 1,
    generated_at: new Date(generatedAt).toISOString(),
    voice_id: leftAnchorSet.voice_id,
    anchor_pool_size: pool.length,
    exhaustive: pool.length <= exhaustiveLimit,
    minimum_solution_size: solutions[0]?.anchor_ids.length ?? null,
    solutions: solutions.slice(0, 64),
    greedy_thread_walk_id: greedy.thread_walk_id,
    greedy_status: greedy.status,
    provenance: { implementation_donor: DONOR },
    authority: {
      experiment_measures_anchor_sufficiency: true,
      experiment_proves_identity: false,
      no_solution_proves_rupture: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, experiment_id: `thread-walk-experiment-${fingerprint.slice(0, 24)}`, fingerprint });
}
