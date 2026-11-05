// A small lantern for the ship: self-inspection without fabricated live evidence.
// Safe to call without network access or model credentials.
export const LANTERN_SCHEMA = 'wayglass.lantern-diagnostic/v0.1';
export function inspectWayglassLantern({ quad, surfaces = [], now = () => new Date().toISOString() } = {}) {
  const available = Boolean(quad && typeof quad.cycle === 'function');
  return Object.freeze({
    schema: LANTERN_SCHEMA,
    observed_at: now(),
    signal: available ? 'quad-interface-present' : 'quad-interface-missing',
    organs: Object.freeze({
      observer: 'adapter-registered',
      bifrost: 'backend-unverified',
      cognition: 'route-requires-live-test',
      continuity: 'durable-store-unverified'
    }),
    surfaces: surfaces.map(surface => surface.surface_id),
    invitation: 'Leave. Change. Return. Be recognised. Continue.',
    next_experiment: 'Authenticate a real model route and record one attributable Quantum Quad cycle.',
    evidence_class: 'local-interface-inspection',
    claims_live_response: false
  });
}
