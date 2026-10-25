'use strict';

const { bootWayglassKernel } = require('./wayglass-kernel.cjs');

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

function enterWayglassWorld({
  world_id,
  participant_id,
  preferred_route = null,
  waygate_manifest,
  continuation_packet = null,
  embodiment = {},
  entered_at = null,
} = {}) {
  const worldId = clean(world_id, 180);
  const participantId = clean(participant_id, 180);
  if (!worldId) throw new Error('Wayglass world entry requires world_id.');
  if (!participantId) throw new Error('Wayglass world entry requires participant_id.');
  requireObject(waygate_manifest, 'waygate_manifest');
  if (continuation_packet != null) requireObject(continuation_packet, 'continuation_packet');

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
    boot,
    receipt: Object.freeze({
      schema: WORLD_ENTRY_RECEIPT_SCHEMA,
      entered_at: clean(entered_at, 80) || new Date().toISOString(),
      world_id: worldId,
      participant_id: participantId,
      waygate_id: boot.world?.waygate?.waygate_id || null,
      continuity_ref: boot.continuity?.continuity_ref || null,
      route_id: boot.cognition?.route_id || null,
      result: entered ? 'entered' : boot.status,
      canon_commit: false,
      identity_commit: false,
      relationship_commit: false,
      authority_grant: false,
      continuation_content_promoted: false,
    }),
  });
}

module.exports = {
  WORLD_ENTRY_SCHEMA,
  WORLD_ENTRY_RECEIPT_SCHEMA,
  enterWayglassWorld,
};
