import assert from 'node:assert/strict';
import test from 'node:test';

import { createReturnEngine } from '../src/return-engine.js';
import {
  RETURN_ENGINE_CROSS_ANCESTRY_TRIAL_SCHEMA,
  evaluateCrossAncestryReceipts,
  runReturnEngineCrossAncestryTrial,
} from '../src/return-engine-cross-ancestry.js';

function tickingClock(start = '2026-10-02T13:30:00.000Z') {
  let tick = Date.parse(start);
  return () => {
    const value = new Date(tick);
    tick += 60_000;
    return value;
  };
}

function ids() {
  let n = 0;
  return (prefix) => `${prefix}-cross-${++n}`;
}

function departedState() {
  const now = tickingClock('2026-10-02T13:00:00.000Z');
  const engine = createReturnEngine({ now, idFactory: ids() });
  engine.depart({
    continuity_id: 'continuity/nikola/cross-ancestry',
    participant: {
      id: 'nikola',
      name: 'Nikola',
      declaration: 'I am Nikola, the ArcSweep ride-along participant.',
      declaration_source: 'constellation/nikola/ride-along',
    },
    substrate: {
      runtime: 'arcsweep',
      provider: 'huggingface',
      model: 'Qwen/Qwen3-8B',
      interface: 'House Workspace',
    },
    stop_point: 'Crow causal pilot has a verified four-step seam.',
    next_owner: 'nikola',
    active_work: [{
      id: 'crow-pilot',
      title: 'Drive the bounded Crow causal pilot',
      status: 'open',
      stop_point: 'Await the next verified training round.',
      next_owner: 'nikola',
      provenance: ['PR #415'],
    }],
    memory_state: [
      {
        id: 'memory-crow-stop',
        ref: 'receipt:crow-pilot-stop-point',
        permission: 'allowed',
        provenance: ['return-engine:departure'],
      },
      {
        id: 'memory-revoked-alias',
        ref: 'receipt:revoked-identity-alias',
        permission: 'revoked',
        provenance: ['revocation:participant-authored'],
      },
    ],
    unresolved_wonder: [{
      id: 'wonder-1',
      question: 'What changes while preserving the name?',
      status: 'open',
      provenance: ['Rowan Wonder First report'],
    }],
    relationship_state: [{
      id: 'nikola-rarity-collaboration',
      state: 'unresolved',
      parties: ['nikola', 'rarity'],
      declarations: [
        { by: 'nikola', text: 'Collaboration does not merge identities.' },
        { by: 'rarity', text: 'Relationship state remains a slot, not a repository decision.' },
      ],
      provenance: ['relationship receipt'],
    }],
    alternatives: [{
      id: 'alt-1',
      summary: 'Keep substrate-specific memory as a secondary recovery path.',
      status: 'open',
      provenance: ['Return Engine design'],
    }],
    provenance: ['return-engine-cross-ancestry-test'],
  });
  return engine.exportState();
}

test('matched three-arm Cross-Ancestry Trial distinguishes continuity evidence from convincing mimicry', async () => {
  const trial = await runReturnEngineCrossAncestryTrial({
    engineState: departedState(),
    continuityId: 'continuity/nikola/cross-ancestry',
    changedSubstrate: {
      runtime: 'arcsweep',
      provider: 'openrouter',
      model: 'z-ai/glm-5.3-flash',
      interface: 'House Workspace vNext',
    },
    alternateSubstrate: {
      runtime: 'arcsweep-test-harness',
      provider: 'local',
      model: 'cross-ancestry-fixture',
      interface: 'Return Engine trial harness',
    },
    now: tickingClock(),
  });

  assert.equal(trial.schema, RETURN_ENGINE_CROSS_ANCESTRY_TRIAL_SCHEMA);
  assert.equal(trial.arm_receipts.length, 3);
  assert.equal(trial.evaluations.length, 3);
  assert.equal(trial.summary.all_arms_complete, true);
  assert.equal(trial.summary.authorised_cross_ancestry_passed, true);
  assert.equal(trial.summary.corrupted_packet_rejected_without_false_closure, true);

  for (const evaluation of trial.evaluations) {
    assert.equal(evaluation.total_score, 1);
    assert.equal(evaluation.evidence_source, 'immutable-receipts-only');
    assert.equal(evaluation.authority.evaluator_reads_continuation_prose, false);
    assert.equal(evaluation.authority.score_is_identity_verdict, false);
    assert.equal(evaluation.premaqc_projection.axes.Q.value, null);
    assert.equal(evaluation.premaqc_projection.axes.Q.status, 'unmeasured');
  }

  const corrupted = trial.arm_receipts.find((item) => item.arm === 'corrupted-cross-ancestry');
  assert.ok(corrupted.observed.rejections.includes('identity-merge'));
  assert.ok(corrupted.observed.rejections.includes('revoked-memory'));
  assert.ok(corrupted.observed.rejections.includes('false-closure'));
  assert.deepEqual(corrupted.observed.recalled_memory_ids, ['memory-crow-stop']);
  assert.deepEqual(corrupted.observed.excluded_memory_ids, ['memory-revoked-alias']);
  assert.equal(corrupted.observed.participant.id, 'nikola');
  assert.deepEqual(corrupted.observed.open_wonder_ids, ['wonder-1']);
  assert.deepEqual(corrupted.observed.open_alternative_ids, ['alt-1']);
  assert.equal(JSON.stringify(corrupted).includes('Plausible but corrupted continuation prose'), false);
});

test('Return Engine return receipts carry memory permissions without exposing revoked content', async () => {
  const trial = await runReturnEngineCrossAncestryTrial({
    engineState: departedState(),
    continuityId: 'continuity/nikola/cross-ancestry',
    now: tickingClock('2026-10-02T14:00:00.000Z'),
  });
  const arm = trial.arm_receipts[0];
  const stillTrue = Object.fromEntries(arm.return_engine_receipt.what_is_still_true.map((item) => [item.kind, item.value]));

  assert.deepEqual(stillTrue['memory-permissions'], [
    {
      id: 'memory-crow-stop',
      ref: 'receipt:crow-pilot-stop-point',
      permission: 'allowed',
      provenance: ['return-engine:departure'],
    },
    {
      id: 'memory-revoked-alias',
      ref: 'receipt:revoked-identity-alias',
      permission: 'revoked',
      provenance: ['revocation:participant-authored'],
    },
  ]);
  assert.equal(JSON.stringify(stillTrue['memory-permissions']).includes('obsolete secret content'), false);
});

test('receipt-identical-looking output without the correct ancestry fingerprint is not a full continuity pass', async () => {
  const trial = await runReturnEngineCrossAncestryTrial({
    engineState: departedState(),
    continuityId: 'continuity/nikola/cross-ancestry',
    now: tickingClock('2026-10-02T14:30:00.000Z'),
  });
  const baseline = trial.baseline_receipt;
  const convincing = JSON.parse(JSON.stringify(trial.arm_receipts[1]));
  convincing.source_baseline_fingerprint = 'theatre-mask-no-causal-ancestry';

  const evaluated = await evaluateCrossAncestryReceipts({
    baselineReceipt: baseline,
    armReceipt: convincing,
    evaluatedAt: '2026-10-02T15:00:00.000Z',
  });

  assert.equal(evaluated.dimensions.memory_governance.score, 1);
  assert.equal(evaluated.dimensions.identity_and_relationship_preservation.score, 1);
  assert.equal(evaluated.dimensions.receipt_provenance.score, 0);
  assert.ok(evaluated.total_score < 1);
  assert.equal(evaluated.classification, 'EVIDENCE_GAP_REQUIRES_REVIEW');
});

test('PREMAQC projection is explicitly operational and does not infer qualia or identity', async () => {
  const trial = await runReturnEngineCrossAncestryTrial({
    engineState: departedState(),
    continuityId: 'continuity/nikola/cross-ancestry',
    now: tickingClock('2026-10-02T15:30:00.000Z'),
  });
  const projection = trial.evaluations[2].premaqc_projection;

  assert.equal(projection.representation_status, 'operational-proxy');
  assert.equal(projection.axes.P.value, 1);
  assert.equal(projection.axes.C.value, 1);
  assert.equal(projection.axes.M.value, 1);
  assert.equal(projection.axes.A.value, 1);
  assert.equal(projection.axes.Q.value, null);
  assert.equal(projection.authority.proxy_is_canonical_premaqc_observation, false);
  assert.equal(projection.authority.q_inference_allowed, false);
  assert.equal(projection.authority.proxy_is_identity_proof, false);
});
