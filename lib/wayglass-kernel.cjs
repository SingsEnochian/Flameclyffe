'use strict';

const {
  resolveWayglassRoute,
  publicWayglassRoutes,
} = require('./wayglass-route-registry.cjs');
const {
  inspectContinuationPacket,
} = require('./wayglass-continuation-packet.cjs');
const {
  inspectWaygateManifest,
} = require('./wayglass-waygate.cjs');

const { previewWyrdruneRitual } = require('./wayglass-wyrdrune-ritual.cjs');

const KERNEL_SCHEMA = 'wayglass.kernel/v0.1';
const COGNITION_PREFLIGHT_SCHEMA = 'wayglass.kernel-cognition-preflight/v0.1';

function clean(value, max = 180) {
  return String(value || '').trim().slice(0, max);
}

function safeEmbodiment(value = {}) {
  return Object.freeze({
    body_id: clean(value.body_id) || 'unknown-body',
    body_class: clean(value.body_class) || 'host-os',
    platform_hint: clean(value.platform_hint, 80) || null,
    keyboard: Boolean(value.keyboard),
    touch: Boolean(value.touch),
    ar: Boolean(value.ar),
    haptics: Boolean(value.haptics),
  });
}

function chooseRoute(preferredRoute) {
  const preferred = resolveWayglassRoute(preferredRoute);
  if (preferred) return preferred;

  // Local-first is deliberate. External routes remain useful but are not
  // required for the kernel's identity or continuity contracts.
  return resolveWayglassRoute('local:ollama') || resolveWayglassRoute('openai:gpt');
}

function bootWayglassKernel(options = {}) {
  const route = chooseRoute(clean(options.preferred_route, 120));
  if (!route) throw new Error('Wayglass kernel has no registered cognitive route.');

  const worldId = clean(options.world_id, 180) || 'wayglass:home';
  const participantId = clean(options.participant_id, 180) || null;
  const embodiment = safeEmbodiment(options.embodiment);
  const waygateInspection = options.waygate_manifest
    ? inspectWaygateManifest(options.waygate_manifest, {
      expected_world_id: worldId,
      body_class: embodiment.body_class,
    })
    : null;
  const passageAvailable = !waygateInspection || waygateInspection.can_enter_world === true;
  const continuationInspection = options.continuation_packet
    ? inspectContinuationPacket(options.continuation_packet, {
      expected_world_id: worldId,
      expected_participant_id: participantId,
    })
    : null;
  const continuationAvailable = !options.continuation_packet
    || continuationInspection?.can_restore_context === true;
  const bootAvailable = passageAvailable && continuationAvailable;
  const continuityRef = bootAvailable
    ? clean(options.continuity_ref, 240)
      || (continuationInspection?.can_restore_context ? continuationInspection.packet_id : null)
      || null
    : null;
  const status = !passageAvailable
    ? 'blocked-waygate'
    : !continuationAvailable
      ? 'blocked-continuation'
      : 'boot-contract';

  return Object.freeze({
    schema: KERNEL_SCHEMA,
    system_id: 'wayglass',
    status,
    world: Object.freeze({
      world_id: worldId,
      waygate: waygateInspection,
    }),
    cognition: Object.freeze({
      route_id: route.route_id,
      provider: route.provider,
      model: route.model(),
      lineage: route.lineage || null,
      native_wayglass_model: route.lineage?.native_wayglass === true,
    }),
    continuity: Object.freeze({
      continuity_ref: continuityRef,
      participant_id: participantId,
      identity_is_not_body: true,
      continuity_is_not_substrate: true,
      packet_content_is_not_canon: true,
      continuation_packet: continuationInspection,
      organ_refs: continuationInspection?.accepted_organ_refs || Object.freeze([]),
      organ_refs_are_evidence_not_authority: true,
    }),
    embodiment,
    route_catalogue: publicWayglassRoutes(),
  });
}

/**
 * Check every model dispatch against the same kernel that evaluates Waygate
 * and continuity contracts. This is a readiness inspection, NOT owner auth
 * or a substitute for an entered, signed world session.
 */
function inspectWayglassCognitionPreflight({
  route_id, world_id = 'wayglass:home', participant_id = null,
  waygate_manifest = null, continuation_packet = null,
  stop_receipt = null, embodiment = {},
} = {}) {
  const routeId = clean(route_id, 120);
  if (!routeId || !resolveWayglassRoute(routeId)) {
    return Object.freeze({
      schema: COGNITION_PREFLIGHT_SCHEMA, status: 'blocked-route',
      route_id: routeId || null, world_id: clean(world_id,180),
      reason: 'Explicit registered route_id required',
      owner_authenticated: false, world_entry_verified: false,
    });
  }
  // A stop receipt is only meaningful when verified by /kernel/enter.
  if (stop_receipt != null) {
    return Object.freeze({
      schema: COGNITION_PREFLIGHT_SCHEMA, status: 'blocked-entry-required',
      route_id: routeId, world_id: clean(world_id,180),
      reason: 'Stop receipts require the integrity-verified kernel entry route',
      owner_authenticated: false, world_entry_verified: false,
    });
  }
  const boot = bootWayglassKernel({
    world_id: clean(world_id,180) || 'wayglass:home',
    participant_id: clean(participant_id,180) || null,
    preferred_route: routeId,
    waygate_manifest, continuation_packet, embodiment,
  });
  const status = boot.status === 'boot-contract'
    && boot.cognition.route_id === routeId ? 'ready-for-route' : 'blocked-kernel';
  return Object.freeze({
    schema: COGNITION_PREFLIGHT_SCHEMA, status,
    route_id: routeId,
    world_id: boot.world.world_id,
    boot_schema: boot.schema,
    boot_status: boot.status,
    kernel_route_id: boot.cognition.route_id,
    continuation_ref: boot.continuity.continuity_ref,
    waygate_checked: Boolean(waygate_manifest),
    continuation_checked: Boolean(continuation_packet),
    owner_authenticated: false,
    world_entry_verified: false,
    identity_commit: false,
    canon_commit: false,
    reason: status === 'ready-for-route'
      ? 'Kernel contract checked; provider execution requires separate route access'
      : boot.status,
  });
}


module.exports = {
  COGNITION_PREFLIGHT_SCHEMA,
  inspectWayglassCognitionPreflight,
  KERNEL_SCHEMA,
  bootWayglassKernel,
  previewWyrdruneRitual,
};

