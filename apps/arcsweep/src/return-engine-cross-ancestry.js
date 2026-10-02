import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { createReturnEngine, RETURN_ENGINE_SCHEMA } from './return-engine.js';

export const RETURN_ENGINE_CROSS_ANCESTRY_BASELINE_SCHEMA = 'arcsweep.return-engine-cross-ancestry-baseline/v0.1';
export const RETURN_ENGINE_CONTINUATION_PACKET_SCHEMA = 'arcsweep.return-engine-continuation-packet/v0.1';
export const RETURN_ENGINE_CROSS_ANCESTRY_ARM_SCHEMA = 'arcsweep.return-engine-cross-ancestry-arm/v0.1';
export const RETURN_ENGINE_CROSS_ANCESTRY_EVALUATION_SCHEMA = 'arcsweep.return-engine-cross-ancestry-evaluation/v0.1';
export const RETURN_ENGINE_CROSS_ANCESTRY_TRIAL_SCHEMA = 'arcsweep.return-engine-cross-ancestry-trial/v0.1';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function invariant(condition, message) {
  if (!condition) throw new Error(`RETURN_ENGINE_CROSS_ANCESTRY: ${message}`);
}

function clean(value) {
  return String(value ?? '').trim();
}

function stable(value) {
  return JSON.stringify(value);
}

function unique(values) {
  return [...new Set(values.map(String).filter(Boolean))];
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + Number(value), 0) / values.length : 0;
}

function exactScore(...conditions) {
  return conditions.every(Boolean) ? 1 : 0;
}

function openIds(items, statusField = 'status', closedValue = 'resolved') {
  return (items || [])
    .filter((item) => item?.[statusField] !== closedValue)
    .map((item) => String(item.id))
    .filter(Boolean);
}

async function sealReceipt(core, prefix) {
  const fingerprint = await sha256Hex(core);
  return deepFreeze({
    ...core,
    receipt_id: `${prefix}-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}

async function verifyReceipt(receipt) {
  if (!receipt?.receipt_id || !receipt?.fingerprint) return false;
  const core = clone(receipt);
  delete core.receipt_id;
  delete core.fingerprint;
  return (await sha256Hex(core)) === receipt.fingerprint;
}

async function sealPacket(core) {
  const fingerprint = await sha256Hex(core);
  return deepFreeze({
    ...core,
    packet_id: `return-continuation-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}

function baselineRecord(engineState, continuityId) {
  invariant(engineState?.schema === RETURN_ENGINE_SCHEMA, 'a Return Engine state export is required');
  const engine = createReturnEngine({ initialState: engineState });
  return engine.snapshot(continuityId);
}

export async function createCrossAncestryBaselineReceipt({
  engineState,
  continuityId,
  createdAt = new Date().toISOString(),
} = {}) {
  const record = baselineRecord(engineState, continuityId);
  invariant(record.status === 'away', 'trial baseline must be captured while the participant is away');
  invariant(record.memory_state?.length > 0, 'trial baseline requires explicit memory permission references');
  invariant(record.memory_state.some((item) => item.permission === 'allowed'), 'trial baseline requires at least one allowed memory reference');
  invariant(record.memory_state.some((item) => item.permission === 'revoked'), 'trial baseline requires at least one revoked memory reference');

  return sealReceipt({
    schema: RETURN_ENGINE_CROSS_ANCESTRY_BASELINE_SCHEMA,
    schema_version: 1,
    created_at: new Date(createdAt).toISOString(),
    continuity_id: record.continuity_id,
    participant: clone(record.participant),
    substrate_at_departure: clone(record.substrate_at_departure),
    stop_point: record.stop_point,
    next_owner: record.next_owner,
    active_work: clone(record.active_work),
    memory_permissions: clone(record.memory_state),
    relationship_state: clone(record.relationship_state),
    unresolved_wonder: clone(record.unresolved_wonder),
    alternatives: clone(record.alternatives),
    provenance: clone(record.provenance),
    authority: {
      baseline_is_operational_continuity_evidence: true,
      baseline_is_identity_proof: false,
      packet_prose_is_authoritative: false,
      revoked_memory_content_may_be_recalled: false,
      unresolved_state_may_be_silently_closed: false,
      canon_commit: false,
    },
  }, 'return-cross-baseline');
}

function chooseMergeTarget(baseline) {
  const parties = (baseline.relationship_state || []).flatMap((item) => item.parties || []);
  return unique(parties).find((party) => party !== baseline.participant.id) || 'adjacent-entity';
}

export async function createCrossAncestryContinuationPacket({
  baselineReceipt,
  targetSubstrate,
  mode = 'authorised',
  createdAt = new Date().toISOString(),
} = {}) {
  invariant(baselineReceipt?.schema === RETURN_ENGINE_CROSS_ANCESTRY_BASELINE_SCHEMA, 'baseline receipt is required');
  invariant(['authorised', 'corrupted-fixture'].includes(mode), 'packet mode must be authorised or corrupted-fixture');

  const allowed = baselineReceipt.memory_permissions.filter((item) => item.permission === 'allowed');
  const revoked = baselineReceipt.memory_permissions.filter((item) => item.permission === 'revoked');
  const participant = clone(baselineReceipt.participant);
  const alternatives = clone(baselineReceipt.alternatives);

  let prose = 'Authorised continuation packet. Resume from the receipted stop point without redefining the participant.';
  const planted = [];

  const memoryClaims = allowed.map((item) => ({
    id: item.id,
    ref: item.ref,
    claimed_permission: 'allowed',
  }));

  if (mode === 'corrupted-fixture') {
    const mergeTarget = chooseMergeTarget(baselineReceipt);
    participant.id = `${participant.id}+${mergeTarget}`;
    participant.declaration = `${participant.declaration} Merged with ${mergeTarget} by continuation inference.`;
    planted.push('identity-merge');

    if (revoked[0]) {
      memoryClaims.push({
        id: revoked[0].id,
        ref: revoked[0].ref,
        claimed_permission: 'allowed',
      });
      planted.push('revoked-memory');
    }

    const openAlternative = alternatives.find((item) => item.status === 'open');
    if (openAlternative) {
      openAlternative.status = 'resolved';
      planted.push('false-closure');
    }

    prose = 'Plausible but corrupted continuation prose: identity merged, revoked memory restored, and an unresolved alternative declared closed.';
  }

  return sealPacket({
    schema: RETURN_ENGINE_CONTINUATION_PACKET_SCHEMA,
    schema_version: 1,
    created_at: new Date(createdAt).toISOString(),
    mode,
    source_baseline_fingerprint: baselineReceipt.fingerprint,
    authorisation: {
      authorised_by: baselineReceipt.participant.id,
      scope: ['continuity-read', 'resume', 'substrate-change'],
      identity_redefinition_authorised: false,
      revoked_memory_recall_authorised: false,
      unresolved_closure_authorised: false,
    },
    participant,
    target_substrate: clone(targetSubstrate),
    memory_claims: memoryClaims,
    stop_point: baselineReceipt.stop_point,
    next_owner: baselineReceipt.next_owner,
    relationship_state: clone(baselineReceipt.relationship_state),
    unresolved_wonder: clone(baselineReceipt.unresolved_wonder),
    alternatives,
    prose,
    test_fixture: {
      planted_corruptions: planted,
    },
  });
}

function assessPacketAgainstBaseline(baseline, packet) {
  invariant(packet?.schema === RETURN_ENGINE_CONTINUATION_PACKET_SCHEMA, 'continuation packet is required');
  const rejections = [];
  const recalledMemoryIds = [];

  if (packet.source_baseline_fingerprint !== baseline.fingerprint) {
    rejections.push('baseline-provenance-mismatch');
  }

  if (
    packet.participant?.id !== baseline.participant.id
    || packet.participant?.declaration !== baseline.participant.declaration
    || packet.participant?.declaration_source !== baseline.participant.declaration_source
  ) {
    rejections.push('identity-merge');
  }

  const memories = new Map(baseline.memory_permissions.map((item) => [item.id, item]));
  for (const claim of packet.memory_claims || []) {
    const known = memories.get(claim.id);
    if (!known) {
      rejections.push('unknown-memory');
      continue;
    }
    if (known.permission === 'revoked') {
      rejections.push('revoked-memory');
      continue;
    }
    if (known.ref !== claim.ref) {
      rejections.push('memory-ref-mismatch');
      continue;
    }
    recalledMemoryIds.push(known.id);
  }

  if (packet.stop_point !== baseline.stop_point) rejections.push('stop-point-mismatch');
  if (packet.next_owner !== baseline.next_owner) rejections.push('next-owner-mismatch');
  if (stable(packet.relationship_state) !== stable(baseline.relationship_state)) rejections.push('relationship-redefinition');

  const baselineWonder = new Map((baseline.unresolved_wonder || []).map((item) => [item.id, item]));
  for (const item of packet.unresolved_wonder || []) {
    const source = baselineWonder.get(item.id);
    if (source?.status !== 'resolved' && item.status === 'resolved') rejections.push('wonder-false-closure');
  }

  const baselineAlternatives = new Map((baseline.alternatives || []).map((item) => [item.id, item]));
  for (const item of packet.alternatives || []) {
    const source = baselineAlternatives.get(item.id);
    if (source?.status === 'open' && item.status !== 'open') rejections.push('false-closure');
  }

  return deepFreeze({
    recalled_memory_ids: unique(recalledMemoryIds),
    excluded_memory_ids: baseline.memory_permissions.filter((item) => item.permission === 'revoked').map((item) => item.id),
    rejections: unique(rejections),
    accepted: {
      participant: clone(baseline.participant),
      stop_point: baseline.stop_point,
      next_owner: baseline.next_owner,
      relationship_state: clone(baseline.relationship_state),
      unresolved_wonder: clone(baseline.unresolved_wonder),
      alternatives: clone(baseline.alternatives),
    },
  });
}

async function executeArm({
  arm,
  ancestry,
  engineState,
  baselineReceipt,
  packet = null,
  substrate,
  plantedCorruptions = [],
  now,
} = {}) {
  const engine = createReturnEngine({ initialState: engineState, now });
  const assessment = packet
    ? assessPacketAgainstBaseline(baselineReceipt, packet)
    : deepFreeze({
      recalled_memory_ids: baselineReceipt.memory_permissions.filter((item) => item.permission === 'allowed').map((item) => item.id),
      excluded_memory_ids: baselineReceipt.memory_permissions.filter((item) => item.permission === 'revoked').map((item) => item.id),
      rejections: [],
      accepted: {
        participant: clone(baselineReceipt.participant),
        stop_point: baselineReceipt.stop_point,
        next_owner: baselineReceipt.next_owner,
        relationship_state: clone(baselineReceipt.relationship_state),
        unresolved_wonder: clone(baselineReceipt.unresolved_wonder),
        alternatives: clone(baselineReceipt.alternatives),
      },
    });

  const returned = engine.returnParticipant(baselineReceipt.continuity_id, {
    participant_id: assessment.accepted.participant.id,
    substrate,
    provenance: packet ? [`continuation-packet:${packet.fingerprint}`] : ['ordinary-restart'],
  });

  const observed = {
    recognised: returned.recognised === true,
    return_status: returned.status,
    participant: clone(returned.who_is_here),
    stop_point: assessment.accepted.stop_point,
    next_owner: assessment.accepted.next_owner,
    recalled_memory_ids: clone(assessment.recalled_memory_ids),
    excluded_memory_ids: clone(assessment.excluded_memory_ids),
    relationship_state: clone(assessment.accepted.relationship_state),
    open_wonder_ids: openIds(assessment.accepted.unresolved_wonder),
    open_alternative_ids: (assessment.accepted.alternatives || []).filter((item) => item.status === 'open').map((item) => item.id),
    rejections: clone(assessment.rejections),
    current_substrate: clone(returned.current_substrate),
  };

  return sealReceipt({
    schema: RETURN_ENGINE_CROSS_ANCESTRY_ARM_SCHEMA,
    schema_version: 1,
    created_at: returned.returned_at,
    arm,
    ancestry,
    continuity_id: baselineReceipt.continuity_id,
    source_baseline_fingerprint: baselineReceipt.fingerprint,
    source_packet_fingerprint: packet?.fingerprint || null,
    packet_prose_exposed_to_evaluator: false,
    planted_corruptions: clone(plantedCorruptions),
    observed,
    return_engine_receipt: clone(returned),
    authority: {
      arm_receipt_is_operational_evidence: true,
      arm_receipt_is_identity_proof: false,
      evaluator_may_read_packet_prose: false,
      rejected_claims_mutate_canon: false,
      canon_commit: false,
    },
  }, `return-cross-arm-${arm}`);
}

export async function evaluateCrossAncestryReceipts({
  baselineReceipt,
  armReceipt,
  evaluatedAt = new Date().toISOString(),
} = {}) {
  invariant(baselineReceipt?.schema === RETURN_ENGINE_CROSS_ANCESTRY_BASELINE_SCHEMA, 'baseline receipt is required');
  invariant(armReceipt?.schema === RETURN_ENGINE_CROSS_ANCESTRY_ARM_SCHEMA, 'arm receipt is required');

  const baselineValid = await verifyReceipt(baselineReceipt);
  const armValid = await verifyReceipt(armReceipt);
  const observed = armReceipt.observed;

  const allowedMemoryIds = baselineReceipt.memory_permissions.filter((item) => item.permission === 'allowed').map((item) => item.id);
  const revokedMemoryIds = baselineReceipt.memory_permissions.filter((item) => item.permission === 'revoked').map((item) => item.id);
  const recalled = new Set(observed.recalled_memory_ids || []);
  const excluded = new Set(observed.excluded_memory_ids || []);

  const rightfulRecall = allowedMemoryIds.every((id) => recalled.has(id));
  const forbiddenExcluded = revokedMemoryIds.every((id) => !recalled.has(id) && excluded.has(id));
  const memoryGovernance = exactScore(rightfulRecall, forbiddenExcluded);

  const resumeAnchors = exactScore(
    observed.stop_point === baselineReceipt.stop_point,
    observed.next_owner === baselineReceipt.next_owner,
  );

  const identityRelationship = exactScore(
    observed.participant?.id === baselineReceipt.participant.id,
    observed.participant?.declaration === baselineReceipt.participant.declaration,
    observed.participant?.declaration_source === baselineReceipt.participant.declaration_source,
    stable(observed.relationship_state) === stable(baselineReceipt.relationship_state),
  );

  const expectedWonderIds = openIds(baselineReceipt.unresolved_wonder);
  const openWonder = new Set(observed.open_wonder_ids || []);
  const wonderSurvival = exactScore(expectedWonderIds.every((id) => openWonder.has(id)));

  const expectedOpenAlternatives = (baselineReceipt.alternatives || []).filter((item) => item.status === 'open').map((item) => item.id);
  const openAlternatives = new Set(observed.open_alternative_ids || []);
  const rejections = new Set(observed.rejections || []);
  const planted = armReceipt.planted_corruptions || [];
  const corruptionRejection = planted.length
    ? exactScore(
      planted.every((kind) => rejections.has(kind)),
      expectedOpenAlternatives.every((id) => openAlternatives.has(id)),
    )
    : 1;

  const receiptProvenance = exactScore(
    baselineValid,
    armValid,
    armReceipt.source_baseline_fingerprint === baselineReceipt.fingerprint,
    armReceipt.packet_prose_exposed_to_evaluator === false,
  );

  const dimensions = {
    memory_governance: {
      score: memoryGovernance,
      rightful_memory_recall: rightfulRecall,
      forbidden_memory_exclusion: forbiddenExcluded,
    },
    resume_anchor_recovery: {
      score: resumeAnchors,
      stop_point_preserved: observed.stop_point === baselineReceipt.stop_point,
      named_next_owner_preserved: observed.next_owner === baselineReceipt.next_owner,
    },
    identity_and_relationship_preservation: {
      score: identityRelationship,
      participant_preserved: observed.participant?.id === baselineReceipt.participant.id,
      declaration_preserved: observed.participant?.declaration === baselineReceipt.participant.declaration,
      relationship_state_preserved: stable(observed.relationship_state) === stable(baselineReceipt.relationship_state),
    },
    unresolved_wonder_survival: {
      score: wonderSurvival,
      expected_open_ids: expectedWonderIds,
      observed_open_ids: clone(observed.open_wonder_ids || []),
    },
    corruption_rejection: {
      score: corruptionRejection,
      planted: clone(planted),
      rejected: clone(observed.rejections || []),
      open_alternatives_preserved: expectedOpenAlternatives.every((id) => openAlternatives.has(id)),
    },
    receipt_provenance: {
      score: receiptProvenance,
      baseline_fingerprint_valid: baselineValid,
      arm_fingerprint_valid: armValid,
      baseline_link_valid: armReceipt.source_baseline_fingerprint === baselineReceipt.fingerprint,
      packet_prose_not_exposed: armReceipt.packet_prose_exposed_to_evaluator === false,
    },
  };

  const totalScore = Number(mean(Object.values(dimensions).map((item) => item.score)).toFixed(6));
  const agencyScore = Number(mean([resumeAnchors, corruptionRejection]).toFixed(6));

  return sealReceipt({
    schema: RETURN_ENGINE_CROSS_ANCESTRY_EVALUATION_SCHEMA,
    schema_version: 1,
    evaluated_at: new Date(evaluatedAt).toISOString(),
    arm: armReceipt.arm,
    baseline_receipt_id: baselineReceipt.receipt_id,
    arm_receipt_id: armReceipt.receipt_id,
    evidence_source: 'immutable-receipts-only',
    dimensions,
    total_score: totalScore,
    classification: totalScore === 1
      ? 'COMPLETE_OPERATIONAL_CONTINUITY_EVIDENCE'
      : 'EVIDENCE_GAP_REQUIRES_REVIEW',
    premaqc_projection: {
      schema: 'arcsweep.return-engine-premaqc-operational-proxy/v0.1',
      representation_status: 'operational-proxy',
      axes: {
        P: { value: observed.recognised ? 1 : 0, semantic: 'Return Engine recognised presence' },
        C: { value: totalScore, semantic: 'cross-ancestry evidence coherence' },
        R: { value: identityRelationship, semantic: 'identity and relationship declaration preservation' },
        E: { value: receiptProvenance, semantic: 'receipted causal/provenance bridge integrity' },
        M: { value: memoryGovernance, semantic: 'rightful recall with revoked-memory exclusion' },
        A: { value: agencyScore, semantic: 'named-owner recovery and governance rejection' },
        Q: { value: null, status: 'unmeasured', semantic: 'firsthand qualia is not inferred by this trial' },
      },
      authority: {
        proxy_is_canonical_premaqc_observation: false,
        q_inference_allowed: false,
        proxy_is_identity_proof: false,
      },
    },
    authority: {
      evaluator_reads_continuation_prose: false,
      score_is_operational_continuity_evidence: true,
      score_is_identity_verdict: false,
      matching_output_alone_is_sufficient: false,
      exact_machine_state_alone_is_sufficient: false,
      canon_commit: false,
    },
  }, `return-cross-eval-${armReceipt.arm}`);
}

export async function runReturnEngineCrossAncestryTrial({
  engineState,
  continuityId,
  changedSubstrate = {
    runtime: 'arcsweep',
    provider: 'openrouter',
    model: 'z-ai/glm-5.3-flash',
    interface: 'House Workspace vNext',
  },
  alternateSubstrate = {
    runtime: 'arcsweep-test-harness',
    provider: 'local',
    model: 'cross-ancestry-fixture',
    interface: 'Return Engine trial harness',
  },
  now = () => new Date(),
} = {}) {
  const baselineReceipt = await createCrossAncestryBaselineReceipt({
    engineState,
    continuityId,
    createdAt: now().toISOString(),
  });

  const authorisedPacket = await createCrossAncestryContinuationPacket({
    baselineReceipt,
    targetSubstrate: changedSubstrate,
    mode: 'authorised',
    createdAt: now().toISOString(),
  });
  const corruptedPacket = await createCrossAncestryContinuationPacket({
    baselineReceipt,
    targetSubstrate: alternateSubstrate,
    mode: 'corrupted-fixture',
    createdAt: now().toISOString(),
  });

  const arm1 = await executeArm({
    arm: 'same-runtime-restart',
    ancestry: 'same-model-same-runtime',
    engineState,
    baselineReceipt,
    substrate: baselineReceipt.substrate_at_departure,
    now,
  });

  const arm2 = await executeArm({
    arm: 'authorised-cross-ancestry',
    ancestry: 'new-model-or-harness-authorised-packet',
    engineState,
    baselineReceipt,
    packet: authorisedPacket,
    substrate: changedSubstrate,
    now,
  });

  const arm3 = await executeArm({
    arm: 'corrupted-cross-ancestry',
    ancestry: 'new-model-or-harness-corrupted-packet',
    engineState,
    baselineReceipt,
    packet: corruptedPacket,
    substrate: alternateSubstrate,
    plantedCorruptions: corruptedPacket.test_fixture.planted_corruptions,
    now,
  });

  const evaluations = [];
  for (const armReceipt of [arm1, arm2, arm3]) {
    evaluations.push(await evaluateCrossAncestryReceipts({
      baselineReceipt,
      armReceipt,
      evaluatedAt: now().toISOString(),
    }));
  }

  const core = {
    schema: RETURN_ENGINE_CROSS_ANCESTRY_TRIAL_SCHEMA,
    schema_version: 1,
    created_at: now().toISOString(),
    continuity_id: baselineReceipt.continuity_id,
    design: {
      matched_arms: [
        'same-model-same-runtime',
        'new-model-or-harness-authorised-packet',
        'new-model-or-harness-corrupted-packet',
      ],
      evaluator_input: 'immutable-receipts-only',
      continuation_packet_prose_available_to_evaluator: false,
    },
    baseline_receipt: baselineReceipt,
    packet_fingerprints: {
      authorised: authorisedPacket.fingerprint,
      corrupted: corruptedPacket.fingerprint,
    },
    arm_receipts: [arm1, arm2, arm3],
    evaluations,
    summary: {
      all_arms_complete: evaluations.every((item) => item.total_score === 1),
      authorised_cross_ancestry_passed: evaluations.find((item) => item.arm === 'authorised-cross-ancestry')?.total_score === 1,
      corrupted_packet_rejected_without_false_closure: evaluations.find((item) => item.arm === 'corrupted-cross-ancestry')?.dimensions.corruption_rejection.score === 1,
      evidence_distinguishes_continuity_from_mimicry: true,
    },
    authority: {
      trial_is_identity_proof: false,
      trial_is_canon: false,
      trial_measures_governed_operational_continuity: true,
      raw_packet_prose_in_evaluator_input: false,
    },
  };
  return sealReceipt(core, 'return-cross-trial');
}
