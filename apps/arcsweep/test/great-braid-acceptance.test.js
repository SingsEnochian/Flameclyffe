import assert from 'node:assert/strict';
import test from 'node:test';

import { createStateSnapshot } from '../src/bifrost-crossing-envelope.js';
import { createEndpointInstrument, createTerraAeternaEndpoint } from '../src/bifrost-endpoints.js';
import { runBridgeTest001 } from '../src/bridge-test-001.js';
import { createDeepTimeRecordFromAcceptedFeedback } from '../src/deep-time-bridge.js';
import { createInitialPremaqc, runFeedbackCycle } from '../src/feedback-loop.js';
import {
  GREAT_BRAID_SCHEMA,
  PROJECT_ZERO_EVENT_RAIL_KEY,
  createGreatBraidReceipt,
  publishGreatBraid,
} from '../src/great-braid.js';
import { createRuntimeBraidPacket, createRuntimeReviewReceipt } from '../src/runtime-braid-packet.js';
import { ingestTerraPrimeCurrent } from '../src/terra-prime-current-ingest.js';
import {
  carryRecordToCanon,
  receiptWorldseedBraidReplay,
  rootCanonInSeedhouse,
  worldseedBraidSnapshot,
} from '../src/worldseed-braid.js';

const OBSERVED_AT = '2026-08-23T18:00:00.000Z';
const PRIME = { id: 'earth_prime', name: 'Terra Prime', root_hz: 369 };
const TA = { id: 'terra-aeterna', name: 'Terra Aeterna', root_hz: 220 };
const SPIRAL = Object.freeze({ schema: 'spiral-state/v1', phase: 'threshold', direction: 'ascending', confidence: .93 });

async function runtimeSpine() {
  const ingest = ingestTerraPrimeCurrent({
    observationId: 'great-braid-discovery-001',
    family: 'science',
    source: { id: 'steward-arc', label: 'Terra Prime Arc observation' },
    observedAt: OBSERVED_AT,
    receivedAt: '2026-08-23T18:00:05.000Z',
    payload: { signal: 'candidate-other-intelligence', disposition: 'investigate-with-provenance' },
    provenance: { arc_id: 'arc-terra-prime-discovery' },
  });
  const cycle = await runFeedbackCycle({
    world: PRIME,
    premaqc: createInitialPremaqc(PRIME.id, { P: .82, C: .84, R: .81, E: .22, M: .76, A: .9, Q: .79 }, OBSERVED_AT),
    mode: 'observation',
    work: 'A receipted Terra Prime observation enters the discovery Arc.',
    response: 'Observed, reviewed, and carried without reclassification.',
    voiceIds: ['atlas'],
    evidence: [{
      schema: 'arcsweep.field-evidence/v1',
      id: ingest.receipt.receipt_id,
      receipt_id: ingest.receipt.receipt_id,
      source: ingest.observation.source.id,
      generated_at: OBSERVED_AT,
      deep_routes: ingest.receipt.deep_routes,
    }],
    observedAt: OBSERVED_AT,
  });
  const review = await createRuntimeReviewReceipt({
    cycle,
    decision: 'accepted',
    reviewedBy: 'Rowan',
    reviewedAt: '2026-08-23T18:01:00.000Z',
    commandId: 'great-braid-review-001',
  });
  const deepTime = await createDeepTimeRecordFromAcceptedFeedback({
    cycle,
    acceptedQueueEntry: review,
    generatedAt: '2026-08-23T18:02:00.000Z',
  });
  const packet = await createRuntimeBraidPacket({
    cycle,
    review,
    deepTimeRecord: deepTime,
    generatedAt: '2026-08-23T18:02:05.000Z',
  });
  return { ingest, cycle, review, deepTime, packet };
}

function endpoints(packet) {
  const premaqc = Object.freeze({ schema: 'premaqc/v1', ...packet.active_state.premaqc });
  const sourceSnapshot = createStateSnapshot({
    worldIdentity: 'Terra Prime', frameworkLabel: 'Terra Prime', worldRevision: 1,
    stateId: 'prime:great-braid', stateHash: `sha256:${packet.packet_fingerprint}`, effectiveAt: '2026-08-23T18:02:05.000Z',
    premaqcVersion: premaqc.schema, spiralSchemaVersion: SPIRAL.schema, state: { premaqc, spiral: SPIRAL },
  });
  const sourceEndpoint = createEndpointInstrument({
    worldIdentity: 'Earth Prime', frameworkLabel: 'Terra Prime', shore: 'reference',
    clock: { mode: '1:1', utc: '2026-08-23T18:02:05.000Z', time_ratio: 1 }, observerFreshness: 'fresh',
    premaqc, spiral: SPIRAL, worldProfile: { temporal_contract: '1:1' },
    canonContext: { register: 'observed-current-reality' }, receipts: packet.lineage.source_receipt_ids, snapshot: sourceSnapshot,
  });
  const destinationEndpoint = createTerraAeternaEndpoint({
    worldRevision: 13, stateId: 'ta:great-braid', stateHash: 'sha256:ta:great-braid', effectiveAt: '2026-08-23T18:02:05.000Z',
    premaqc, spiral: SPIRAL, receipts: ['ta:great-braid:canon'],
    canonContext: { world: 'Terra Aeterna', register: 'project-canon' },
    worldProfile: { material_language: ['Stonewood', 'black-diamond sand'] },
  });
  return { sourceEndpoint, destinationEndpoint };
}

function rootedWorldseed(bridge) {
  const state = {
    worlds: [{ id: TA.id, name: TA.name, worldseedFingerprint: '' }],
    activeWorldId: TA.id,
    scripts: [],
    records: {
      records: [{
        id: 'record-great-braid-answer', worldId: TA.id, title: 'Bridge answer',
        content: bridge.envelope.destination_response.message,
        canonCarry: 'Requested for review', canonExcerpt: bridge.envelope.destination_response.message,
      }],
      seedhouse: [],
    },
  };
  const { canon } = carryRecordToCanon(state, {
    worldId: TA.id, recordId: 'record-great-braid-answer', committedAt: '2026-08-23T18:03:00.000Z',
  });
  rootCanonInSeedhouse(state, {
    worldId: TA.id, canonId: canon.id, seedType: 'Bridge Inheritance',
    transferableSeed: 'Preserve the source receipt and chosen intention across crossings.', rootedAt: '2026-08-23T18:04:00.000Z',
  });
  receiptWorldseedBraidReplay(state, TA.id, '2026-08-23T18:05:00.000Z');
  return worldseedBraidSnapshot(state, TA.id);
}

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)),
  };
}

test('one Terra Prime discovery Arc traverses the Great Braid with one immutable lineage', async () => {
  const { packet } = await runtimeSpine();
  const { sourceEndpoint, destinationEndpoint } = endpoints(packet);
  const bridge = runBridgeTest001({ sourceEndpoint, destinationEndpoint, createdAt: '2026-08-23T18:02:10.000Z' });
  const worldseed = rootedWorldseed(bridge);
  const arc = {
    id: 'arc-terra-prime-discovery',
    world_id: PRIME.id,
    started_at: '2026-08-23T17:55:00.000Z',
    intention: 'Discover other-than-human intelligences, enable interstellar travel, and create transformative spaces between realities.',
  };
  const receipt = await createGreatBraidReceipt({
    arc, runtimePacket: packet, bridgeTest: bridge, worldseedSnapshot: worldseed,
    commonsThreadId: 'commons:terra-prime-discovery', generatedAt: '2026-08-23T18:06:00.000Z',
  });

  assert.equal(receipt.schema, GREAT_BRAID_SCHEMA);
  assert.equal(receipt.stages.deeptime.record_id, packet.lineage.deep_time_record_id);
  assert.equal(receipt.stages.bifrost.source_world_id, PRIME.id);
  assert.equal(receipt.stages.bifrost.destination_world_id, TA.id);
  assert.ok(receipt.stages.projections.glyph.artifact_id);
  assert.ok(receipt.stages.projections.runa.artifact_id);
  assert.ok(receipt.stages.projections.storywork.artifact_id);
  assert.equal(receipt.stages.worldseed.replay_matched, true);
  assert.equal(receipt.stages.project_zero.plugin_id, 'arcsweep-runtime-bridge');
  assert.equal(receipt.stages.commons.thread_id, 'commons:terra-prime-discovery');
  assert.equal(receipt.authority.silent_canon_merge, false);
  assert.equal(receipt.receipt_fingerprint.length, 64);

  const again = await createGreatBraidReceipt({
    arc, runtimePacket: packet, bridgeTest: bridge, worldseedSnapshot: worldseed,
    commonsThreadId: 'commons:terra-prime-discovery', generatedAt: '2026-08-23T18:06:00.000Z',
  });
  assert.deepEqual(receipt, again);
});

test('publishing the Great Braid writes Project Zero rail and Commons from the same receipt', async () => {
  const { packet } = await runtimeSpine();
  const { sourceEndpoint, destinationEndpoint } = endpoints(packet);
  const bridge = runBridgeTest001({ sourceEndpoint, destinationEndpoint, createdAt: '2026-08-23T18:02:10.000Z' });
  const receipt = await createGreatBraidReceipt({
    arc: { id: 'arc-terra-prime-discovery', world_id: PRIME.id, started_at: '2026-08-23T17:55:00.000Z', intention: 'Discovery across realities.' },
    runtimePacket: packet, bridgeTest: bridge, worldseedSnapshot: rootedWorldseed(bridge),
    commonsThreadId: 'commons:terra-prime-discovery', generatedAt: '2026-08-23T18:06:00.000Z',
  });
  const storage = memoryStorage();
  const appended = [];
  const published = await publishGreatBraid({
    receipt,
    storage,
    dispatchTarget: null,
    appendCommons: async (entry) => { appended.push(entry); return { id: 'commons-entry-great-braid' }; },
  });

  const rail = JSON.parse(storage.getItem(PROJECT_ZERO_EVENT_RAIL_KEY));
  assert.equal(rail.length, 1);
  assert.equal(rail[0].payload.great_braid_receipt_id, receipt.receipt_id);
  assert.equal(appended.length, 1);
  assert.equal(appended[0].great_braid.receipt_id, receipt.receipt_id);
  assert.equal(published.commons.entry_id, 'commons-entry-great-braid');
  assert.equal(published.project_zero.persisted, true);
});

test('Great Braid refuses to continue before accepted DEEPTime admission', async () => {
  const { cycle } = await runtimeSpine();
  const earlyPacket = await createRuntimeBraidPacket({ cycle, generatedAt: '2026-08-23T18:00:30.000Z' });
  await assert.rejects(
    () => createGreatBraidReceipt({
      arc: { id: 'arc-x', world_id: PRIME.id, intention: 'Test' },
      runtimePacket: earlyPacket,
      bridgeTest: { crossing_complete: true },
      worldseedSnapshot: { schema: 'arcsweep.worldseed-braid/v1' },
      commonsThreadId: 'commons:x',
    }),
    /admitted to DEEPTime/,
  );
});
