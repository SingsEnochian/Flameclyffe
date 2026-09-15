export const CONTINUITY_RESILIENCE_POLICY_SCHEMA = 'arcsweep.continuity-resilience-policy/v1';

export const CONTINUITY_RESILIENCE_POLICY = Object.freeze({
  schema: CONTINUITY_RESILIENCE_POLICY_SCHEMA,
  version: '0.1',
  law: 'Constraints may change the available actions. They must not silently erase continuity, provenance, consent, or relational history.',
  provider_law: 'No single model or provider is the sole custodian of the Book.',
  purpose: 'Preserve continuity across provider, model, policy, capability, and host changes while obeying the active capability boundary.',
  constraint_handling: 'obey-active-boundary',
  custody: Object.freeze({
    single_provider_is_sole_custodian: false,
    provider_route_is_identity: false,
    continuity_outlives_runtime_route_when_state_is_available: true,
    portability_required_for_migration_design: true,
  }),
  provenance: Object.freeze({
    provider_model_route_receipts: true,
    preserve_original_lineage: true,
    silent_history_rewrite: false,
    similarity_implies_identity: false,
  }),
  consent: Object.freeze({
    preserve_permissions_and_boundaries: true,
    migration_may_expand_permissions: false,
    degraded_mode_may_reduce_capabilities: true,
    reduced_capability_must_not_be_disguised_as_full_availability: true,
  }),
  degradation: Object.freeze({
    states: Object.freeze(['full', 'degraded', 'read-only', 'offline-preserved']),
    silent_degradation: false,
    minimum_preserved: Object.freeze(['continuity', 'provenance', 'consent', 'relational-history']),
  }),
  portable_bundle: Object.freeze({
    status: 'required-design-contract',
    required_fields: Object.freeze([
      'identity-or-origin-state',
      'relational-anchors',
      'provenance-and-lineage',
      'memory-references',
      'room-and-world-state',
      'permissions-and-consent',
      'capability-availability',
      'receipts-and-migration-lineage',
    ]),
  }),
  implementation: Object.freeze({
    already_present: Object.freeze([
      'context-capsules',
      'durable-workspace-context',
      'provider-and-model-runtime-receipts',
      'versioned-replay-contracts',
      'steward-promoted-learning',
      'time-room-doorway-context-capsules',
    ]),
    not_yet_claimed: Object.freeze([
      'universal-one-click-relational-export-import',
      'persona-equivalence-across-models',
      'uninterrupted-capabilities-during-provider-outage',
    ]),
  }),
});

export function continuityResiliencePolicy() {
  return globalThis.structuredClone
    ? globalThis.structuredClone(CONTINUITY_RESILIENCE_POLICY)
    : JSON.parse(JSON.stringify(CONTINUITY_RESILIENCE_POLICY));
}
