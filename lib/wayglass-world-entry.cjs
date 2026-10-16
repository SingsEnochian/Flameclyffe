'use strict';

const { bootWayglassKernel } = require('./wayglass-kernel.cjs');
const { inspectWayglassStopIntegrity } = require('./wayglass-stop-receipt.cjs');

const WORLD_ENTRY_SCHEMA = 'wayglass.world-entry/v0.1';
const WORLD_ENTRY_RECEIPT_SCHEMA = 'wayglass.world-entry-receipt/v0.1';

function clean(value, max = 320) {
  return String(value || '').trim().slice(0, max);
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(label + ' must be an object.');
  }
  return value;
}

function entryReceipt({
  entered_at,
  world_id,
  participant_id,
  waygate_id = null,
  continuity_ref = null,
  route_id = null,
  result,
  stop_integrity = null,
} = {}) {
  return Object.freeze({
    schema: WORLD_ENTRY_RECEIPT_SCHEMA,
    entered_at: clean(entered_at, 80) || new Date().toISOString(),
    world_id,
    participant_id,
    waygate_id,
    continuity_ref,
    route_id,
    result,
    stop_integrity_checked: Boolean(stop_integrity),
    stop_integrity_verified: stop_integrity?.integrity_verified ?? null,
    canon_commit: false,
    identity_commit: false,
    relationship_commit: false,
    authority_grant: false,
    continuation_content_promoted: false,
  });
}

function enterWayglassWorld({
  world_id,
  participant_id,
  preferred_route = null,
  waygate_manifest,
  continuation_packet = null,
  stop_receipt = null,
  embodiment = {},
  entered_at = null,
} = {}) {
  const worldId = clean(world_id, 180);
  const participantId = clean(participant_id, 180);
  if (!worldId) throw new Error('Wayglass world entry requires world_id.');
  if (!participantId) throw new Error('Wayglass world entry requires participant_id.');
  requireObject(waygate_manifest, 'waygate_manifest');
  if (continuation_packet != null) requireObject(continuation_packet, 'continuation_packet');
  if (stop_receipt != null) requireObject(stop_receipt, 'stop_receipt');
  if (stop_receipt != null && continuation_packet == null) {
    throw new TypeError('stop_receipt requires continuation_packet for integrity inspection.');
  }

  const stopIntegrity = stop_receipt
    ? inspectWayglassStopIntegrity(stop_receipt, continuation_packet)
    : null;

  if (stopIntegrity && !stopIntegrity.integrity_verified) {
    const waygateId = clean(waygate_manifest.waygate_id, 240) || null;
    return Object.freeze({
      schema: WORLD_ENTRY_SCHEMA,
      status: 'blocked-stop-integrity',
      entered: false,
      world_id: worldId,
      participant_id: participantId,
      waygate_id: waygateId,
      continuity_ref: null,
      route_id: null,
      blocked_by: Object.freeze([...stopIntegrity.blocking]),
      stop_integrity: stopIntegrity,
      boot: null,
      receipt: entryReceipt({
        entered_at,
        world_id: worldId,
        participant_id: participantId,
        waygate_id: waygateId,
        result: 'blocked-stop-integrity',
        stop_integrity: stopIntegrity,
      }),
    });
  }

  const boot = bootWayglassKernel({
    world_id: worldId,
    participant_id: participantId,
    preferred_route: clean(preferred_route, 120),
    waygate_manifest,
    continuation_packet,
    embodiment,
  });
  const entered = boot.status === 'boot-contract';
  const blockedBy = boot.status === 'blocked-waygate'
    ? boot.world?.waygate?.blocking || []
    : boot.status === 'blocked-continuation'
      ? boot.continuity?.continuation_packet?.blocking || []
      : [];

  return Object.freeze({
    schema: WORLD_ENTRY_SCHEMA,
    status: entered ? 'entered' : boot.status,
    entered,
    world_id: worldId,
    participant_id: participantId,
    waygate_id: boot.world?.waygate?.waygate_id || null,
    continuity_ref: boot.continuity?.continuity_ref || null,
    route_id: boot.cognition?.route_id || null,
    blocked_by: Object.freeze([...blockedBy]),
    stop_integrity: stopIntegrity,
    boot,
    receipt: entryReceipt({
      entered_at,
      world_id: worldId,
      participant_id: participantId,
      waygate_id: boot.world?.waygate?.waygate_id || null,
      continuity_ref: boot.continuity?.continuity_ref || null,
      route_id: boot.cognition?.route_id || null,
      result: entered ? 'entered' : boot.status,
      stop_integrity: stopIntegrity,
    }),
  });
}

module.exports = {
  WORLD_ENTRY_SCHEMA,
  WORLD_ENTRY_RECEIPT_SCHEMA,
  enterWayglassWorld,
};
