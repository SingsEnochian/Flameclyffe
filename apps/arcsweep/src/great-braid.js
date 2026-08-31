import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { createPossibilityTopology } from './possibility-topology.js';

export const GREAT_BRAID_SCHEMA = 'arcsweep.great-braid-receipt/v1';
export const GREAT_BRAID_PUBLISH_SCHEMA = 'arcsweep.great-braid-publish-receipt/v1';
export const PROJECT_ZERO_EVENT_RAIL_KEY = 'flameclyffe.project-zero-companion.event-rail/v1';

const REQUIRED_PROJECTIONS = Object.freeze(['glyph', 'runa', 'storywork']);

function invariant(condition, message) {
  if (!condition) throw new Error(`GREAT_BRAID: ${message}`);
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function stamp(value, field) {
  invariant(typeof value === 'string' && !Number.isNaN(Date.parse(value)), `${field} must be an ISO timestamp`);
  return new Date(value).toISOString();
}

function projection(envelope, type) {
  return (envelope?.projections || []).find((item) => item?.projection_type === type) || null;
}

export async function createGreatBraidReceipt({
  arc,
  runtimePacket,
  bridgeTest,
  worldseedSnapshot,
  commonsThreadId,
  generatedAt = new Date().toISOString(),
} = {}) {
  invariant(arc?.id && arc?.world_id && String(arc?.intention || '').trim(), 'Arc identity, world, and intention are required');
  invariant(runtimePacket?.schema === 'hearthgate.runtime-braid-packet/v1', 'Runtime Braid Packet is required');
  invariant(runtimePacket.stage === 'entered-deeptime', 'Runtime Braid must be admitted to DEEPTime');
  invariant(runtimePacket.world?.id === arc.world_id, 'Arc world must match Runtime Braid world');
  invariant(runtimePacket.lineage?.math_spine_packet_id, 'Math Spine lineage is required');
  invariant(runtimePacket.lineage?.deterministic_replay_matched === true, 'Math/feedback replay must match exactly');
  invariant(runtimePacket.lineage?.deep_time_record_id, 'DEEPTime lineage is required');
  invariant(bridgeTest?.crossing_complete === true, 'Bifröst crossing must be complete');
  invariant(bridgeTest.envelope?.source?.world_identity === arc.world_id, 'Bifröst source must match the Arc world');
  invariant(worldseedSnapshot?.schema === 'arcsweep.worldseed-braid/v1', 'Worldseed braid snapshot is required');
  invariant(bridgeTest.envelope?.destination?.world_identity === worldseedSnapshot.world?.id, 'Worldseed world must match the Bifröst destination');
  invariant(worldseedSnapshot.stages?.seedhouse?.fingerprint, 'Worldseed fingerprint is required');
  invariant(typeof commonsThreadId === 'string' && commonsThreadId.trim(), 'Commons thread id is required');
  for (const type of REQUIRED_PROJECTIONS) invariant(projection(bridgeTest.envelope, type), `${type} projection receipt is required`);

  const at = stamp(generatedAt, 'generatedAt');
  const possibilityTopology = createPossibilityTopology({ arc, runtimePacket, bridgeTest, worldseedSnapshot });
  const core = {
    schema: GREAT_BRAID_SCHEMA,
    schema_version: 1,
    generated_at: at,
    arc: {
      id: String(arc.id),
      world_id: String(arc.world_id),
      intention: String(arc.intention).trim(),
      started_at: arc.started_at ? stamp(arc.started_at, 'arc.started_at') : null,
    },
    stages: {
      observer_premaqc_math: {
        continuity_packet_id: runtimePacket.continuity_packet_id,
        cycle_id: runtimePacket.observation?.cycle_id,
        premaqc_receipt_id: runtimePacket.active_state?.premaqc_receipt_id,
        math_spine_packet_id: runtimePacket.lineage.math_spine_packet_id,
        replay_fingerprint: runtimePacket.lineage.replay_fingerprint,
      },
      deeptime: {
        record_id: runtimePacket.lineage.deep_time_record_id,
        record_fingerprint: runtimePacket.lineage.deep_time_record_fingerprint,
        review_receipt_id: runtimePacket.lineage.review_receipt_id,
      },
      possibility_topology: possibilityTopology,
      bifrost: {
        crossing_id: bridgeTest.envelope.crossing_id,
        crossing_receipt_id: bridgeTest.envelope.lineage?.receipt_id || null,
        source_world_id: bridgeTest.envelope.source.world_identity,
        destination_world_id: bridgeTest.envelope.destination.world_identity,
        translation_status: bridgeTest.envelope.translation?.status,
      },
      worldseed: {
        world_id: worldseedSnapshot.world.id,
        fingerprint: worldseedSnapshot.stages.seedhouse.fingerprint,
        canon_count: worldseedSnapshot.stages.canonStudio.count,
        rooted_seed_count: worldseedSnapshot.stages.seedhouse.count,
        replay_matched: worldseedSnapshot.stages.replay.latest?.matched ?? null,
      },
      projections: Object.fromEntries(REQUIRED_PROJECTIONS.map((type) => {
        const item = projection(bridgeTest.envelope, type);
        return [type, {
          artifact_id: item.artifact_id,
          input_state_id: item.input_state_id,
          projection_receipt_id: item.projection_receipt_id || item.receipt_id || item.artifact_id,
        }];
      })),
      project_zero: {
        plugin_id: 'arcsweep-runtime-bridge',
        event_type: 'arcsweep.great-braid.receipted',
        rail_key: PROJECT_ZERO_EVENT_RAIL_KEY,
        topology_schema: possibilityTopology.schema,
      },
      commons: {
        thread_id: commonsThreadId.trim(),
        status: 'ready-to-publish',
      },
    },
    lineage: {
      source_receipt_ids: [...new Set([
        ...(runtimePacket.lineage?.source_receipt_ids || []),
        bridgeTest.envelope.lineage?.receipt_id,
        ...REQUIRED_PROJECTIONS.map((type) => projection(bridgeTest.envelope, type)?.projection_receipt_id || projection(bridgeTest.envelope, type)?.receipt_id),
        worldseedSnapshot.stages.replay.latest?.id,
      ].filter(Boolean))],
      primary_runtime_packet_id: runtimePacket.packet_id,
      primary_runtime_packet_fingerprint: runtimePacket.packet_fingerprint,
    },
    authority: {
      human_review_required_for_deeptime: true,
      silent_canon_merge: false,
      project_zero_reclassifies_source: false,
      commons_reclassifies_source: false,
      qualia_inference_allowed: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return deepFreeze({
    ...core,
    receipt_id: `great-braid-${fingerprint.slice(0, 24)}`,
    receipt_fingerprint: fingerprint,
  });
}

export function greatBraidProjectZeroEvent(receipt) {
  invariant(receipt?.schema === GREAT_BRAID_SCHEMA, 'Project Zero event requires a Great Braid receipt');
  return deepFreeze({
    schema: 'flameclyffe.project-zero-companion.adapter-event/v1',
    bridge_owner: 'flameclyffe',
    integration_target: 'nocturne-project-zero',
    plugin_id: 'arcsweep-runtime-bridge',
    type: 'arcsweep.great-braid.receipted',
    payload: {
      great_braid_receipt_id: receipt.receipt_id,
      great_braid_fingerprint: receipt.receipt_fingerprint,
      arc: clone(receipt.arc),
      stages: clone(receipt.stages),
      lineage: clone(receipt.lineage),
    },
    created_at: receipt.generated_at,
    rule: 'Data sets atmosphere, not fate.',
  });
}

export function greatBraidCommonsEntry(receipt) {
  invariant(receipt?.schema === GREAT_BRAID_SCHEMA, 'Commons entry requires a Great Braid receipt');
  return deepFreeze({
    kind: 'system',
    author: 'Great Braid',
    status: 'receipted',
    thread_id: receipt.stages.commons.thread_id,
    turn_id: `great-braid:${receipt.receipt_id}`,
    links: [
      { kind: 'feedback', id: receipt.stages.observer_premaqc_math.cycle_id, label: 'Observer → PREMAQC → Math Spine' },
      { kind: 'world', id: receipt.stages.worldseed.world_id, label: 'Worldseed destination' },
    ],
    text: `Great Braid receipted · ${receipt.arc.intention}\n${receipt.arc.world_id} → DEEPTime → Possibility Topology → Bifröst → ${receipt.stages.worldseed.world_id} → Glyph/Runa/Storywork → Project Zero → Commons\nReceipt: ${receipt.receipt_id}`,
    great_braid: {
      receipt_id: receipt.receipt_id,
      fingerprint: receipt.receipt_fingerprint,
    },
  });
}

function readRail(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem?.(PROJECT_ZERO_EVENT_RAIL_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function publishGreatBraid({ receipt, appendCommons, storage = globalThis.localStorage, dispatchTarget = globalThis.window } = {}) {
  invariant(receipt?.schema === GREAT_BRAID_SCHEMA, 'publish requires a Great Braid receipt');
  invariant(typeof appendCommons === 'function', 'appendCommons callback is required');
  invariant(storage?.setItem && storage?.getItem, 'Project Zero event rail storage is required');

  const event = greatBraidProjectZeroEvent(receipt);
  const rail = readRail(storage);
  const nextRail = [event, ...rail.filter((item) => item?.payload?.great_braid_receipt_id !== receipt.receipt_id)].slice(0, 100);
  storage.setItem(PROJECT_ZERO_EVENT_RAIL_KEY, JSON.stringify(nextRail));
  dispatchTarget?.dispatchEvent?.(new CustomEvent('project-zero-companion:event', { detail: event }));

  const commonsEntry = greatBraidCommonsEntry(receipt);
  const commonsResult = await appendCommons(commonsEntry);
  const core = {
    schema: GREAT_BRAID_PUBLISH_SCHEMA,
    published_at: receipt.generated_at,
    great_braid_receipt_id: receipt.receipt_id,
    project_zero: { event_type: event.type, rail_key: PROJECT_ZERO_EVENT_RAIL_KEY, persisted: true },
    commons: { thread_id: commonsEntry.thread_id, appended: true, entry_id: commonsResult?.id || null },
  };
  return deepFreeze(core);
}
