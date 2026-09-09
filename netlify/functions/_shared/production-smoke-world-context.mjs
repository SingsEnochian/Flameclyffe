export const PRODUCTION_SMOKE_WORLD_CONTEXT_SCHEMA = 'arcsweep.runtime-world-context/v1';

function canonicalise(value) {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalise(value[key])]),
  );
}

export function stableProductionSmokeJson(value) {
  return JSON.stringify(canonicalise(value));
}

export async function sha256ProductionSmoke(value) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stableProductionSmokeJson(value))),
  );
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function productionSmokeWorldContextCore() {
  return {
    schema: PRODUCTION_SMOKE_WORLD_CONTEXT_SCHEMA,
    version: 1,
    active_world_id: 'terra-prime',
    identity_anchor: {
      world_id: 'terra-prime',
      world_birth_receipt_id: null,
      born_at: null,
      birth_source: 'vercel-production-authenticated-smoke',
      birth_source_ref: null,
      parent_world_id: null,
      parent_seed_fingerprint: null,
      worldseed_fingerprint: null,
    },
    world: {
      id: 'terra-prime',
      name: 'Terra Prime',
      kind: 'Waking World',
    },
    authored_context: {
      description: 'Synthetic authenticated production circulation fixture.',
      history: '',
      rules: 'Production route verification only; this fixture is not a canon commit.',
      arrival: { location: '', context: '', orientation: '' },
      identity: { name: '', pronouns: '', roles: '', form: '' },
    },
    waking_world: null,
    lineage: {
      lineage_label: 'Root world',
      branch_point: '',
      fork_reason: '',
      descendant_world_ids: [],
    },
    authority: {
      source: 'vercel-production-authenticated-smoke',
      world_selection_explicit: true,
      stable_anchor_and_live_state_are_distinct: true,
      runtime_context_is_canon_commit: false,
      model_may_rewrite_world_identity: false,
    },
  };
}

export async function buildProductionSmokeWorldContext(mintedAt = new Date().toISOString()) {
  const core = productionSmokeWorldContextCore();
  const fingerprint = await sha256ProductionSmoke(core);
  return {
    ...core,
    context_id: `runtime-world:terra-prime:${fingerprint.slice(0, 24)}`,
    context_fingerprint: fingerprint,
    minted_at: mintedAt,
  };
}
