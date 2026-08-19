import {
  createEmptyReactionRegistryStore,
  normaliseReactionRegistryStore,
} from './react-ion-registry.js';
import { loadState, saveState, setStateExtensionSnapshot } from './storage.js';

export const REACTION_STATE_SCHEMA = 'arcsweep.react-ion-state/v1';
export const REACTION_STATE_MIGRATION_SCHEMA = 'arcsweep.react-ion-state-migration/v1';
export const REACTION_STATE_UPDATED_EVENT = 'arcsweep:reaction-state-updated';
export const LEGACY_REACTION_REGISTRY_KEY = 'hearthgate.arcsweep.react-ion-registry.v1';
export const LEGACY_REACTION_HELM_KEY = 'hearthgate.arcsweep.react-ion-helm.v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`REACT_ION_STATE: ${message}`);
}

function clone(value) {
  return structuredClone(value);
}

function notifyReactionState(reaction, meta = {}) {
  const EventClass = globalThis.CustomEvent;
  if (typeof globalThis.dispatchEvent === 'function' && typeof EventClass === 'function') {
    globalThis.dispatchEvent(new EventClass(REACTION_STATE_UPDATED_EVENT, {
      detail: {
        reaction: clone(reaction),
        meta: clone(meta),
      },
    }));
  }
}

export function createEmptyReactionState() {
  return {
    schema: REACTION_STATE_SCHEMA,
    version: 1,
    registry: createEmptyReactionRegistryStore(),
    helm: {
      version: 1,
      receipts: [],
    },
    migration: {
      legacy_sidecars_imported_at: null,
      legacy_registry_imported: false,
      legacy_helm_imported: false,
      legacy_keys_preserved: true,
    },
  };
}

export function normaliseReactionState(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const defaults = createEmptyReactionState();
  const helm = source.helm && typeof source.helm === 'object' && !Array.isArray(source.helm) ? source.helm : {};
  const migration = source.migration && typeof source.migration === 'object' && !Array.isArray(source.migration)
    ? source.migration
    : {};

  return {
    schema: REACTION_STATE_SCHEMA,
    version: 1,
    registry: clone(normaliseReactionRegistryStore(source.registry)),
    helm: {
      version: 1,
      receipts: Array.isArray(helm.receipts) ? clone(helm.receipts) : [],
    },
    migration: {
      ...defaults.migration,
      ...migration,
      legacy_sidecars_imported_at: typeof migration.legacy_sidecars_imported_at === 'string'
        ? migration.legacy_sidecars_imported_at
        : null,
      legacy_registry_imported: migration.legacy_registry_imported === true,
      legacy_helm_imported: migration.legacy_helm_imported === true,
      legacy_keys_preserved: migration.legacy_keys_preserved !== false,
    },
  };
}

export function ensureReactionState(state) {
  invariant(state && typeof state === 'object' && !Array.isArray(state), 'an Arcsweep state object is required');
  state.reaction = normaliseReactionState(state.reaction);
  return state.reaction;
}

export function setReactionRegistry(state, registry) {
  const reaction = ensureReactionState(state);
  reaction.registry = clone(normaliseReactionRegistryStore(registry));
  return reaction.registry;
}

export function appendReactionHelmReceipt(state, receipt) {
  invariant(receipt && typeof receipt === 'object' && !Array.isArray(receipt), 'a Helm receipt object is required');
  const reaction = ensureReactionState(state);
  reaction.helm.receipts.push(clone(receipt));
  return reaction.helm.receipts.at(-1);
}

function readLegacyJson(storage, key) {
  try {
    const raw = storage?.getItem?.(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function migrateLegacyReactionSidecars(state, {
  storage = globalThis.localStorage,
  migratedAt = new Date().toISOString(),
} = {}) {
  const reaction = ensureReactionState(state);
  if (reaction.migration.legacy_sidecars_imported_at) {
    return Object.freeze({
      state,
      changed: false,
      receipt: null,
    });
  }
  invariant(!Number.isNaN(Date.parse(migratedAt)), 'migratedAt must be an ISO-compatible timestamp');

  const legacyRegistry = readLegacyJson(storage, LEGACY_REACTION_REGISTRY_KEY);
  const legacyHelm = readLegacyJson(storage, LEGACY_REACTION_HELM_KEY);
  const registryImported = Boolean(
    legacyRegistry
    && typeof legacyRegistry === 'object'
    && Array.isArray(legacyRegistry.destinations)
    && Array.isArray(legacyRegistry.corridors)
  );
  const helmImported = Boolean(
    legacyHelm
    && typeof legacyHelm === 'object'
    && Array.isArray(legacyHelm.receipts)
  );

  if (registryImported) reaction.registry = clone(normaliseReactionRegistryStore(legacyRegistry));
  if (helmImported) reaction.helm = { version: 1, receipts: clone(legacyHelm.receipts) };

  reaction.migration = {
    legacy_sidecars_imported_at: new Date(migratedAt).toISOString(),
    legacy_registry_imported: registryImported,
    legacy_helm_imported: helmImported,
    legacy_keys_preserved: true,
  };

  const receipt = Object.freeze({
    schema: REACTION_STATE_MIGRATION_SCHEMA,
    schema_version: 1,
    migrated_at: reaction.migration.legacy_sidecars_imported_at,
    imported: Object.freeze({ registry: registryImported, helm: helmImported }),
    source_keys: Object.freeze([LEGACY_REACTION_REGISTRY_KEY, LEGACY_REACTION_HELM_KEY]),
    legacy_keys_preserved: true,
    destination: 'arcsweep-state.reaction',
    authority: Object.freeze({
      current_persistence_owner: 'Hearthfire storage loadState/saveState',
      legacy_sidecars_are_not_live_truth_stores: true,
    }),
  });

  return Object.freeze({ state, changed: registryImported || helmImported, receipt });
}

let persistChain = Promise.resolve();
export function persistReactionState(reactionInput, meta = {}) {
  const reaction = normaliseReactionState(reactionInput);
  setStateExtensionSnapshot('reaction', reaction);
  persistChain = persistChain.catch(() => {}).then(async () => {
    const state = await loadState();
    state.reaction = clone(reaction);
    const result = await saveState(state, { reason: 'react-ion-state-update', ...meta });
    notifyReactionState(reaction, meta);
    return result;
  });
  return persistChain;
}
