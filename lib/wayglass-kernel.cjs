'use strict';

const {
  resolveWayglassRoute,
  publicWayglassRoutes,
} = require('./wayglass-route-registry.cjs');
const {
  inspectContinuationPacket,
} = require('./wayglass-continuation-packet.cjs');

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
  const continuationInspection = options.continuation_packet
    ? inspectContinuationPacket(options.continuation_packet, {
      expected_world_id: worldId,
      expected_participant_id: participantId,
    })
    : null;
  const continuityRef = clean(options.continuity_ref, 240)
    || (continuationInspection?.can_restore_context ? continuationInspection.packet_id : null)
    || null;

  return Object.freeze({
    schema: KERNEL_SCHEMA,
    system_id: 'wayglass',
    status: 'boot-contract',
    world: Object.freeze({
      world_id: worldId,
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

module.exports = {
  KERNEL_SCHEMA,
  bootWayglassKernel,
};
