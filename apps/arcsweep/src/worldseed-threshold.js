import { compileWorldseed } from './worldseed.js';

export const WORLDSEED_THRESHOLD_PROPOSAL_SCHEMA = 'arcsweep.worldseed-threshold-proposal/v1';

function worldById(state, worldId) {
  return state?.worlds?.find((world) => world.id === worldId) || null;
}

function seedhouseForWorld(state, worldId) {
  return (Array.isArray(state?.records?.seedhouse) ? state.records.seedhouse : [])
    .filter((record) => record?.worldId === worldId);
}

function latestCycleForWorld(state, worldId) {
  return (Array.isArray(state?.feedbackCycles) ? state.feedbackCycles : [])
    .find((cycle) => cycle?.world?.id === worldId || cycle?.worldId === worldId) || null;
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function detectWorldseedThreshold({ world, seed, cycle = null, observedAt = new Date().toISOString() } = {}) {
  if (!world?.id) throw new Error('Worldseed Threshold Detector requires a world.');
  if (!seed?.fingerprint) throw new Error('Worldseed Threshold Detector requires a compiled Worldseed.');

  const packet = cycle?.math_spine_packet || null;
  const projection = packet?.projection || {};
  const fold = projection.fold || {};
  const jacobian = projection.jacobian || {};
  const foldActive = Boolean(fold.active);
  const foldIndex = finite(jacobian.fold_index ?? fold.index);
  const replayMatched = cycle?.replay_receipt?.matched;
  const beforeSequence = cycle?.premaqc_before?.sequence ?? null;
  const afterSequence = cycle?.premaqc_after?.sequence ?? null;
  const thresholdRules = (seed.sections?.thresholds || []).map((record) => ({
    id: record.id,
    title: record.title,
    status: record.status,
    mustSurvive: record.mustSurvive,
    mayChange: record.mayChange,
    notes: record.notes,
  }));
  const branchCandidate = Boolean(cycle && foldActive);
  const cycleLabel = beforeSequence !== null || afterSequence !== null
    ? `PREMAQC ${beforeSequence ?? '?'}→${afterSequence ?? '?'}`
    : cycle?.cycle_id || 'observed threshold';
  const foldLabel = foldIndex === null ? 'fold active' : `fold index ${foldIndex.toFixed(4)}`;

  return {
    schema: WORLDSEED_THRESHOLD_PROPOSAL_SCHEMA,
    version: 1,
    id: `worldseed-threshold:${world.id}:${observedAt}`,
    observedAt,
    world: { id: world.id, name: world.name || world.id },
    worldseedFingerprint: seed.fingerprint,
    status: !cycle ? 'awaiting-observation' : branchCandidate ? 'branch-candidate' : 'threshold-clear',
    branchCandidate,
    detector: {
      cycleId: cycle?.cycle_id || null,
      mathSpinePacketId: packet?.packet_id || null,
      foldActive,
      foldIndex,
      replayMatched: replayMatched ?? null,
      beforeSequence,
      afterSequence,
    },
    thresholdRules,
    branchDraft: branchCandidate ? {
      mode: 'experimental',
      childName: `${world.name || world.id} · Threshold Branch`,
      branchPoint: `${cycleLabel} · ${foldLabel}`,
      reason: `Explore the possible world opened by ${cycleLabel} while preserving ${seed.fingerprint} as the parent seed.`,
      parentSeedFingerprint: seed.fingerprint,
    } : null,
    authority: {
      automaticBranching: false,
      branchCreation: 'steward-action-only',
    },
  };
}

export function readWorldseedThreshold(state, worldId, observedAt = new Date().toISOString()) {
  const world = worldById(state, worldId);
  if (!world) throw new Error(`World ${worldId} is not in the registry.`);
  const records = seedhouseForWorld(state, worldId);
  const seed = compileWorldseed(world, records, observedAt);
  const cycle = latestCycleForWorld(state, worldId);
  return detectWorldseedThreshold({ world, seed, cycle, observedAt });
}

export function receiptWorldseedThreshold(state, worldId, observedAt = new Date().toISOString()) {
  const proposal = readWorldseedThreshold(state, worldId, observedAt);
  state.worldseedThresholdProposals = Array.isArray(state.worldseedThresholdProposals) ? state.worldseedThresholdProposals : [];
  state.worldseedThresholdProposals.unshift(proposal);
  return proposal;
}
