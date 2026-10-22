export const CODEX_TRANSFER_ATLAS_SCHEMA = 'hearthweave.codex-transfer-atlas/v0.1';

export const TRANSFER_STATUSES = Object.freeze([
  'transferred',
  'partial',
  'failed',
  'unchanged',
  'unexpected',
  'unknown',
]);

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
  const source = Array.isArray(values) ? values : [values];
  return Object.freeze([...new Set(source.map((value) => String(value || '').trim()).filter(Boolean))]);
}

function findBranch(wish, branchId) {
  const id = text(branchId, 'branchId');
  const index = (wish?.possibilityBranches || []).findIndex((row) => row?.branchId === id);
  if (index < 0) throw new Error(`Unknown wish branch: ${id}`);
  return { index, branch: wish.possibilityBranches[index] };
}

function findDelta(branch, deltaId) {
  const id = text(deltaId, 'deltaId');
  const delta = (branch.behaviouralDeltas || []).find((row) => row?.deltaId === id);
  if (!delta) throw new Error(`Unknown behavioural delta: ${id}`);
  return delta;
}

function replaceBranch(wish, index, branch, createdAt = '') {
  const branches = [...wish.possibilityBranches];
  branches[index] = Object.freeze({ ...branch, updatedAt: String(createdAt || branch.updatedAt || branch.createdAt || '') });
  return Object.freeze({ ...wish, possibilityBranches: Object.freeze(branches), updatedAt: String(createdAt || wish.updatedAt || '') });
}

function normaliseObservation(row = {}) {
  const status = text(row.status, 'transfer status');
  if (!TRANSFER_STATUSES.includes(status)) throw new Error(`Unknown transfer status: ${status}`);
  return Object.freeze({
    domain: text(row.domain, 'transfer domain'),
    capability: text(row.capability, 'capability'),
    status,
    confidence: Number.isFinite(Number(row.confidence)) ? Number(row.confidence) : null,
    evidenceRefs: list(row.evidenceRefs),
    caseRefs: list(row.caseRefs),
    notes: optionalText(row.notes),
  });
}

export function recordTransferAtlas(wish, {
  branchId,
  atlasId,
  deltaId,
  trialId = '',
  observations = [],
  recordedBy,
  createdAt = '',
  provenance = [],
} = {}) {
  const { index, branch } = findBranch(wish, branchId);
  const delta = findDelta(branch, deltaId);
  const id = text(atlasId, 'atlasId');
  if ((branch.transferAtlases || []).some((row) => row.atlasId === id)) throw new Error(`Duplicate Transfer Atlas: ${id}`);

  const rows = Object.freeze((Array.isArray(observations) ? observations : []).map(normaliseObservation));
  if (!rows.length) throw new Error('Transfer Atlas requires at least one domain observation.');
  const trial = trialId
    ? (branch.blindLearningTrials || []).find((row) => row?.trialId === String(trialId))
    : null;
  if (trialId && !trial) throw new Error(`Unknown blind learning trial: ${trialId}`);

  const atlas = Object.freeze({
    schema: CODEX_TRANSFER_ATLAS_SCHEMA,
    atlasId: id,
    wishId: wish.wishId,
    branchId: branch.branchId,
    sourceBehaviouralDeltaId: delta.deltaId,
    sourceBlindTrialId: trial?.trialId || null,
    observations: rows,
    recordedBy: text(recordedBy, 'recordedBy'),
    createdAt: String(createdAt || ''),
    provenance: list(provenance),
    descriptiveNotUniversal: true,
    failedTransferRemainsVisible: true,
    unknownIsValidState: true,
    visualCentralityIsNotImportance: true,
    grantsAuthority: false,
    productionEffects: false,
  });

  const ring = Object.freeze({
    schema: 'hearthweave.codex-developmental-memory/v0.1',
    ringId: `developmental:${atlas.atlasId}`,
    memoryClass: 'transfer-atlas',
    wishId: wish.wishId,
    branchId: branch.branchId,
    sourceBehaviouralDeltaId: delta.deltaId,
    sourceTransferAtlasId: atlas.atlasId,
    transferredTo: Object.freeze(rows.filter((row) => row.status === 'transferred').map((row) => `${row.capability} @ ${row.domain}`)),
    partialTransfer: Object.freeze(rows.filter((row) => row.status === 'partial').map((row) => `${row.capability} @ ${row.domain}`)),
    failedToGeneralise: Object.freeze(rows.filter((row) => row.status === 'failed').map((row) => `${row.capability} @ ${row.domain}`)),
    unknownTransfer: Object.freeze(rows.filter((row) => row.status === 'unknown').map((row) => `${row.capability} @ ${row.domain}`)),
    provenance: atlas.provenance,
    explicitDevelopmentalMemoryWrite: true,
    automaticIdentityRewrite: false,
    identityLaw: false,
    canonicalTruth: false,
    grantsAuthority: false,
    productionEffects: false,
    createdAt: atlas.createdAt,
  });

  const nextBranch = Object.freeze({
    ...branch,
    transferAtlases: Object.freeze([...(branch.transferAtlases || []), atlas]),
    developmentalMemory: Object.freeze([...(branch.developmentalMemory || []), ring]),
  });
  return Object.freeze({ wish: replaceBranch(wish, index, nextBranch, createdAt), delta, trial, atlas, developmentalRing: ring });
}

export function transferAtlasSummary(wish = {}) {
  const atlases = (wish.possibilityBranches || []).flatMap((branch) => branch.transferAtlases || []);
  const observations = atlases.flatMap((atlas) => atlas.observations || []);
  return Object.freeze({
    schema: CODEX_TRANSFER_ATLAS_SCHEMA,
    wishId: wish.wishId ? String(wish.wishId) : null,
    atlasCount: atlases.length,
    observationCount: observations.length,
    statusCounts: Object.freeze(Object.fromEntries(TRANSFER_STATUSES.map((status) => [status, observations.filter((row) => row.status === status).length]))),
    doctrine: Object.freeze({
      transferIsEmpiricalNotAssumed: true,
      partialTransferIsNotFailureOrUniversality: true,
      failedTransferRemainsFirstClassEvidence: true,
      unknownIsNotNegativeEvidence: true,
    }),
  });
}
