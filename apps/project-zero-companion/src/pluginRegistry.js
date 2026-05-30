export const CORE_CAPABILITIES = [
  'folder-bindings',
  'bridge-event-bus',
  'local-metadata-ledger',
  'explicit-consent-gates',
  'dry-run-preview',
];

export const PLUGIN_MANIFESTS = [
  {
    id: 'terra-aeterna-root',
    name: 'Terra Aeterna Root',
    status: 'planned',
    purpose: 'Bind local Terra Aeterna folders, artifacts, writing shards, images, and music to STARWELL world records.',
    permissions: ['selected-folders', 'metadata-read', 'manual-attach'],
    emits: ['folder_anchor', 'file_anchor', 'artifact_added'],
    listens: ['observer_bridge_event', 'deep_state_update'],
  },
  {
    id: 'deep-observer-bridge',
    name: 'DEEP Observer Bridge',
    status: 'planned',
    purpose: 'Share DEEP vectors, Observer state, condition sets, and sigil signatures with local and web surfaces.',
    permissions: ['local-storage', 'supabase-sync-optional'],
    emits: ['deep_state_update', 'observer_condition_set', 'sigil_signature'],
    listens: ['file_anchor', 'story_shard', 'altar_working'],
  },
  {
    id: 'writer-room-rail',
    name: 'Writer Room Rail',
    status: 'planned',
    purpose: 'Attach passages, drafts, and atmospheric prompts to Project Zero bridge events.',
    permissions: ['selected-folders', 'manual-attach'],
    emits: ['story_shard', 'reverse_watch_request'],
    listens: ['observer_condition_set', 'deep_state_update'],
  },
  {
    id: 'hearthweave-altar-sound',
    name: 'Hearthweave Altar Sound',
    status: 'active-web-prototype',
    purpose: 'Map DEEP Observer state into browser-native Web Audio responses on the altar.',
    permissions: ['web-audio-after-user-gesture', 'local-storage'],
    emits: ['altar_working', 'sound_response'],
    listens: ['deep_state_update', 'altar_realm_change', 'altar_intention'],
  },
  {
    id: 'asset-watcher',
    name: 'Asset Watcher',
    status: 'planned-native',
    purpose: 'Watch explicitly selected folders for new files and generate bridge-event drafts.',
    permissions: ['selected-folders', 'file-metadata-read'],
    emits: ['file_detected', 'file_anchor_draft'],
    listens: ['folder_binding_changed'],
  },
];

export function buildPluginEvent(pluginId, type, payload = {}) {
  return {
    plugin_id: pluginId,
    type,
    payload,
    created_at: new Date().toISOString(),
    rule: 'Data sets atmosphere, not fate.',
  };
}
