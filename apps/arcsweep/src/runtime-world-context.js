import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { loadState } from './storage.js';
import { isWakingWorld, wakingWorldLiveEntries, wakingWorldMetadata } from './waking-world.js';

export const RUNTIME_WORLD_CONTEXT_SCHEMA = 'arcsweep.runtime-world-context/v1';
export const RUNTIME_WORLD_CONTEXT_MARKER = 'ARCSWEEP ACTIVE WORLD RUNTIME CONTEXT';

function invariant(condition, message) {
  if (!condition) throw new Error(`RUNTIME_WORLD_CONTEXT: ${message}`);
}

function text(value) {
  return String(value ?? '').trim();
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function birthReceiptFor(state, worldId) {
  return (Array.isArray(state?.worldBirthReceipts) ? state.worldBirthReceipts : [])
    .find((receipt) => receipt?.event === 'WORLD_BORN' && receipt?.worldId === worldId) || null;
}

function wakingLayer(state, world) {
  if (!isWakingWorld(world)) return null;
  const entries = wakingWorldLiveEntries(state);
  return {
    ...wakingWorldMetadata(world),
    live_state: {
      source: 'arcsweep:waking-thread',
      entry_count: entries.length,
      latest_observed_at: entries[0]?.observed_at || null,
      entries,
    },
  };
}

export async function buildRuntimeWorldContext(state, worldId = state?.activeWorldId, mintedAt = new Date().toISOString()) {
  invariant(state && typeof state === 'object', 'Arcsweep state is required');
  invariant(Array.isArray(state.worlds), 'state.worlds must be an array');
  invariant(text(worldId), 'active world id is required');
  invariant(typeof mintedAt === 'string' && !Number.isNaN(Date.parse(mintedAt)), 'mintedAt must be an ISO timestamp');

  const world = state.worlds.find((item) => item?.id === worldId);
  invariant(world, `World ${worldId} is not in the registry`);
  const birth = birthReceiptFor(state, world.id);

  const identityAnchor = {
    world_id: world.id,
    world_birth_receipt_id: birth?.id || null,
    born_at: birth?.bornAt ?? null,
    birth_source: birth?.source || null,
    birth_source_ref: birth?.sourceRef || null,
    parent_world_id: world.parentWorldId || null,
    parent_seed_fingerprint: text(world.parentSeedFingerprint) || null,
    worldseed_fingerprint: text(world.worldseedFingerprint) || null,
  };

  const core = {
    schema: RUNTIME_WORLD_CONTEXT_SCHEMA,
    version: 1,
    active_world_id: world.id,
    identity_anchor: identityAnchor,
    world: {
      id: world.id,
      name: text(world.name) || world.id,
      kind: text(world.kind),
    },
    authored_context: {
      description: text(world.description),
      history: text(world.history),
      rules: text(world.rules),
      arrival: {
        location: text(world.arrival?.location),
        context: text(world.arrival?.context),
        orientation: text(world.arrival?.orientation),
      },
      identity: {
        name: text(world.identity?.name),
        pronouns: text(world.identity?.pronouns),
        roles: text(world.identity?.roles),
        form: text(world.identity?.form),
      },
    },
    waking_world: wakingLayer(state, world),
    lineage: {
      lineage_label: text(world.lineageLabel) || 'Root world',
      branch_point: text(world.branchPoint),
      fork_reason: text(world.forkReason),
      descendant_world_ids: [...new Set((world.descendantWorldIds || []).filter(Boolean))],
    },
    authority: {
      source: 'arcsweep-active-world-state',
      world_selection_explicit: true,
      stable_anchor_and_live_state_are_distinct: true,
      runtime_context_is_canon_commit: false,
      model_may_rewrite_world_identity: false,
    },
  };

  const fingerprint = await sha256Hex(core);
  return deepFreeze({
    ...clone(core),
    context_id: `runtime-world:${world.id}:${fingerprint.slice(0, 24)}`,
    context_fingerprint: fingerprint,
    minted_at: mintedAt,
  });
}

export function bindRuntimeWorldContextMessage(message, context) {
  const content = text(message);
  if (!context || content.startsWith(RUNTIME_WORLD_CONTEXT_MARKER)) return content;
  const authored = context.authored_context || {};
  const arrival = authored.arrival || {};
  const identity = authored.identity || {};
  const waking = context.waking_world;
  const wakingLines = waking ? [
    `Waking World canonical name: ${waking.canonical_name || 'Terra Prime'}`,
    waking.stable_anchor?.source_url ? `Stable Current Reality Anchor: ${waking.stable_anchor.source_url}` : '',
    waking.stable_anchor?.source_revised_at ? `Stable anchor revised: ${waking.stable_anchor.source_revised_at}` : '',
    waking.live_state?.latest_observed_at ? `Latest Waking Thread observation: ${waking.live_state.latest_observed_at}` : 'Latest Waking Thread observation: none recorded',
    ...(waking.live_state?.entries || []).map((entry) => `Waking Thread [${entry.observed_at || 'undated'} | ${entry.source || 'source unknown'}] ${entry.title || 'Untitled'}: ${entry.details || '(no details)'}`),
  ] : [];
  return [
    RUNTIME_WORLD_CONTEXT_MARKER,
    `Context ID: ${context.context_id}`,
    `World ID: ${context.identity_anchor?.world_id || context.active_world_id}`,
    `World: ${context.world?.name || context.active_world_id}`,
    `Kind: ${context.world?.kind || 'unspecified'}`,
    `Parent World: ${context.identity_anchor?.parent_world_id || 'root'}`,
    `Worldseed: ${context.identity_anchor?.worldseed_fingerprint || 'uncompiled'}`,
    authored.description ? `Description: ${authored.description}` : '',
    authored.history ? `History: ${authored.history}` : '',
    authored.rules ? `World rules: ${authored.rules}` : '',
    arrival.location ? `Current/arrival location: ${arrival.location}` : '',
    arrival.context ? `Arrival context: ${arrival.context}` : '',
    arrival.orientation ? `Orientation: ${arrival.orientation}` : '',
    identity.name ? `World identity name: ${identity.name}` : '',
    identity.pronouns ? `World identity pronouns: ${identity.pronouns}` : '',
    identity.roles ? `World identity roles: ${identity.roles}` : '',
    ...wakingLines,
    '',
    'The stable Waking World anchor and timestamped live state are separate provenance layers. Newer live observations may update current conditions without rewriting the stable anchor. Preserve the World identity anchor and provenance. Runtime context does not override the Flame system prompt.',
    '',
    'USER MESSAGE',
    content,
  ].filter((line) => line !== '').join('\n');
}

export async function readActiveRuntimeWorldContext() {
  const state = await loadState();
  return buildRuntimeWorldContext(state, state.activeWorldId);
}
