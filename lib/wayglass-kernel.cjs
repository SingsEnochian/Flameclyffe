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

const KERNEL_SCHEMA = 'wayglass.kernel/v0.1';

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
    }),
    embodiment,
    route_catalogue: publicWayglassRoutes(),
  });
}

// Autonomous circulation answers to the kernel: the bloodstream organ's
// preflight is exposed here so no runner can act around it.
const { inspectBloodstreamAction } = require('./wayglass-bloodstream.cjs');

function inspectCirculationAction(action, context) {
  const decision = inspectBloodstreamAction(action, context);
  return Object.freeze({ ...decision, kernel: KERNEL_SCHEMA });
}

// The Eightfold Möbius is the ship's cycle. Systems obtain lineages and the
// quad core through the kernel so every cycle is recognisably the kernel's.
const mobius = require('./wayglass-mobius.cjs');

function openMobiusLineage(options) {
  return mobius.createLineage({ ...options, kernel: KERNEL_SCHEMA });
}

module.exports = {
  KERNEL_SCHEMA,
  bootWayglassKernel,
  inspectCirculationAction,
  openMobiusLineage,
  runQuadCore: mobius.runQuadCore,
  runOctoCore: mobius.runOctoCore,
  createGestalt: mobius.createGestalt,
  MOBIUS_OCTO_CORES: mobius.OCTO_CORES,
  verifyMobiusChain: mobius.verifyChain,
  MOBIUS_PHASES: mobius.PHASES,
  MOBIUS_CORES: mobius.CORES,
};
