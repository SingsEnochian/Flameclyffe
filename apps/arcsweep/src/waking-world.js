import { createWorld } from './worlds.js';
import { recordWorldBirth } from './world-registry-operations.js';

export const WAKING_WORLD_SCHEMA = 'arcsweep.waking-world/v1';
export const TERRA_PRIME_NAME = 'Terra Prime';
export const CURRENT_REALITY_ANCHOR_URL = 'https://app.notion.com/p/3a870290d9c481c5b8f2cdfb2cab70fc';
export const CURRENT_REALITY_ANCHOR_REVISED_AT = '2026-08-20T20:49:26.216Z';

const WAKE_NAMES = new Set(['terra prime', 'waking world', 'current reality']);

function normalise(value) {
  return String(value || '').trim().toLowerCase();
}

export function isWakingWorld(world) {
  if (!world || typeof world !== 'object') return false;
  return world.wakingWorld?.schema === WAKING_WORLD_SCHEMA
    || WAKE_NAMES.has(normalise(world.name))
    || normalise(world.kind) === 'waking world';
}

function liveEntry(entry) {
  return {
    id: entry.id || null,
    title: String(entry.title || '').trim(),
    source: String(entry.source || 'Self-entered').trim(),
    details: String(entry.details || '').trim(),
    observed_at: entry.createdAt || null,
  };
}

export function wakingWorldLiveEntries(state, { limit = 12 } = {}) {
  const continuity = Array.isArray(state?.continuity) ? state.continuity : [];
  return continuity
    .filter((entry) => entry && typeof entry === 'object')
    .map(liveEntry)
    .sort((left, right) => String(right.observed_at || '').localeCompare(String(left.observed_at || '')))
    .slice(0, Math.max(0, Number(limit) || 0));
}

export function wakingWorldMetadata(world) {
  return {
    ...(world?.wakingWorld && typeof world.wakingWorld === 'object' ? world.wakingWorld : {}),
    schema: WAKING_WORLD_SCHEMA,
    canonical_name: TERRA_PRIME_NAME,
    aliases: ['Waking World', 'Current Reality'],
    stable_anchor: {
      title: 'Current Reality Anchor',
      source_url: CURRENT_REALITY_ANCHOR_URL,
      source_revised_at: CURRENT_REALITY_ANCHOR_REVISED_AT,
    },
    live_sources: ['arcsweep:waking-thread'],
    eligible_live_sources: ['house-runtime:observations', 'deep-time'],
    freshness_law: 'stable-anchor-plus-timestamped-live-state',
  };
}

export function ensureTerraPrimeWakingWorld(state, now = new Date().toISOString()) {
  if (!state || typeof state !== 'object' || !Array.isArray(state.worlds)) throw new TypeError('Arcsweep state with worlds is required.');
  let world = state.worlds.find(isWakingWorld) || null;
  let created = false;
  let changed = false;

  if (!world) {
    world = createWorld('terra-prime', now);
    world.name = TERRA_PRIME_NAME;
    world.kind = 'Waking World';
    world.description = 'The Waking World / current reality anchor. Stable foundation is paired with timestamped live Waking Thread state; Observer and DEEP records remain separately receipted eligible layers.';
    world.lineageLabel = 'Root world · Waking World';
    state.worlds.push(world);
    created = true;
    changed = true;
  }

  const prior = JSON.stringify(world.wakingWorld || null);
  world.wakingWorld = wakingWorldMetadata(world);
  if (prior !== JSON.stringify(world.wakingWorld)) changed = true;

  if (normalise(world.name) === 'waking world' || normalise(world.name) === 'current reality') {
    world.name = TERRA_PRIME_NAME;
    changed = true;
  }
  if (normalise(world.name) === 'terra prime' && world.kind !== 'Waking World') {
    world.kind = 'Waking World';
    changed = true;
  }
  if (changed && !created) world.updatedAt = now;

  const existingBirth = Array.isArray(state.worldBirthReceipts)
    ? state.worldBirthReceipts.find((receipt) => receipt?.event === 'WORLD_BORN' && receipt?.worldId === world.id)
    : null;
  const receipt = existingBirth || recordWorldBirth(state, world, {
    bornAt: created ? now : (world.createdAt || null),
    source: 'waking-world-migration',
    sourceRef: created ? 'terra-prime:create' : (world.createdAt ? 'terra-prime:adopt-recorded-createdAt' : 'terra-prime:adopt-birth-time-unknown'),
    seedFingerprint: world.worldseedFingerprint,
  });
  if (!existingBirth) changed = true;

  return { state, world, receipt, created, changed };
}
