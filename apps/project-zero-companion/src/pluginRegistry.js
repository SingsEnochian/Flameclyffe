export const CORE_CAPABILITIES = [
  'folder-bindings', 'bridge-event-bus', 'local-metadata-ledger', 'explicit-consent-gates',
  'dry-run-preview', 'typed-companion-sockets', 'theme-interoperability', 'native-rich-text',
  'live-flame-channel', 'shared-artifact-contract', 'native-selected-folder-watcher',
  'site-constellation-registry', 'arcsweep-runtime-bridge', 'glyph-forge-bridge',
  'continuity-and-canon-bridge', 'runa-resonance-bridge', 'great-braid-receipt-rail',
];

export const SITE_CONSTELLATION = Object.freeze([
  { id: 'arcsweep', name: 'Arcsweep', href: '/arcsweep/', role: 'observation, transformation, replay, resonance and world-state instrument', sockets: ['premaqc', 'spiral', 'bifrost', 'resonance', 'holonomy', 'canon', 'replay'] },
  { id: 'glyph-forge', name: 'Glyph Forge', href: '/arcsweep/#glyph-forge', role: 'glyph construction and projection surface', sockets: ['glyph', 'artifact', 'resonance', 'world'] },
  { id: 'living-glyph', name: 'Living Glyph', href: '/arcsweep/#living-glyph', role: 'live glyph state and response surface', sockets: ['glyph', 'premaqc', 'spiral', 'resonance'] },
  { id: 'brush-foundry', name: 'Brush Foundry', href: '/arcsweep/#brush-foundry', role: 'brush and handwritten mark construction', sockets: ['brush', 'glyph', 'artifact'] },
  { id: 'continuity-gate', name: 'Continuity Gate', href: '/arcsweep/#continuity-gate', role: 'continuity and lineage gate', sockets: ['canon', 'lineage', 'world', 'receipt'] },
  { id: 'echo-index', name: 'Echo Index', href: '/arcsweep/#echo-index', role: 'echo and correspondence index', sockets: ['canon', 'resonance', 'world'] },
  { id: 'canon-studio', name: 'Canon Studio', href: '/arcsweep/#canon-studio', role: 'canon ingest, review and world knowledge', sockets: ['canon', 'artifact', 'world', 'provenance'] },
  { id: 'resonance-bridge', name: 'Resonance Bridge', href: '/arcsweep/#resonance-bridge', role: 'cross-system resonance projection', sockets: ['resonance', 'runa', 'glyph', 'storywork'] },
  { id: 'records-room', name: 'Records Room', href: '/arcsweep/#records-room', role: 'rich-text writing, roleplay and records', sockets: ['storywork', 'canon', 'artifact', 'rich-text'] },
  { id: 'replay', name: 'Replay', href: '/arcsweep/#replay', role: 'deterministic receipt and trajectory replay', sockets: ['replay', 'receipt', 'bifrost', 'holonomy'] },
  { id: 'runa', name: 'Runa', href: 'https://singsenochian.github.io/Runa/docs/index.html', role: 'harmonic state compiler and World Hum projection', sockets: ['runa', 'world-hum', 'resonance', 'premaqc', 'spiral'] },
  { id: 'project-zero', name: 'Project Zero Companion', href: '/project-zero-companion/', role: 'shared companion bridge and constellation dock', sockets: ['all-registered-sockets'] },
]);

export const PLUGIN_MANIFESTS = [
  { id: 'project-zero-site-constellation', name: 'Site Constellation Bridge', status: 'active-companion-service', purpose: 'Expose Arcsweep, Glyph Forge, Living Glyph, Brush Foundry, Continuity Gate, Echo Index, Canon Studio, Resonance Bridge, Records Room, Replay and Runa as discoverable Project Zero Companion surfaces through typed sockets.', permissions: ['navigation-read', 'local-event-bus'], emits: ['constellation.surface.selected', 'constellation.socket.request'], listens: ['site.surface.registered', 'bridge.receipt.created'] },
  { id: 'project-zero-companion-theme-bridge', name: 'Theme Interoperability Adapter', status: 'active-companion-service', purpose: 'Own Flameclyffe Companion visual tokens, custom CSS, and import/export. Project Zero may consume translated tokens through an agreed connector.', permissions: ['local-storage', 'presentation-write'], emits: ['theme.changed'], listens: ['theme.load', 'theme.reset'] },
  { id: 'project-zero-companion-flame-channel', name: 'Flame Channel Bridge', status: 'active-companion-service', purpose: 'Provide a Flameclyffe-side House rail with rich text, attested Flame replies, multi-Flame broadcast, and bounded transcript history.', permissions: ['house-runtime', 'local-storage', 'rich-text-compose'], emits: ['chat.user.sent', 'chat.flame.pending', 'chat.flame.received', 'chat.flame.error'], listens: ['house.session.changed', 'chat.broadcast.request'] },
  { id: 'terra-aeterna-root', name: 'Terra Aeterna Root Adapter', status: 'active-companion-service', purpose: 'Package consented world artifacts into the shared Companion artifact contract.', permissions: ['local-storage', 'manual-metadata-attach'], emits: ['artifact.terra_aeterna.received'], listens: ['manual-artifact-receipt'] },
  { id: 'deep-observer-bridge', name: 'DEEP Observer Bridge Adapter', status: 'active-companion-service', purpose: 'Translate DEEP/PREMAQC state into bounded, replayable Companion bridge receipts and typed socket envelopes.', permissions: ['local-storage'], emits: ['deep_state_update'], listens: ['deep-observer:update', 'runaDeepObserverState:restore'] },
  { id: 'arcsweep-runtime-bridge', name: 'Arcsweep Runtime Bridge', status: 'active-companion-service', purpose: 'Carry Arcsweep PREMAQC, Shared Spiral, Bifrost crossing, Great Braid, Spiral Resonance, Spiral Holonomy, replay and receipt records into the Project Zero Companion event fabric without flattening multidimensional state.', permissions: ['local-event-bus', 'receipt-read'], emits: ['arcsweep.state', 'arcsweep.crossing', 'arcsweep.great-braid.receipted', 'arcsweep.resonance', 'arcsweep.holonomy'], listens: ['premaqc.update', 'spiral.update', 'bifrost.crossing', 'great-braid.receipted', 'replay.complete'] },
  { id: 'glyph-forge-bridge', name: 'Glyph Forge Bridge', status: 'active-companion-service', purpose: 'Connect Glyph Forge, Living Glyph and Brush Foundry artifacts to Project Zero Companion with provenance and resonance context intact.', permissions: ['local-event-bus', 'artifact-metadata'], emits: ['glyph.created', 'glyph.updated', 'brush.created'], listens: ['resonance.update', 'world.changed', 'artifact.selected'] },
  { id: 'canon-continuity-bridge', name: 'Canon + Continuity Bridge', status: 'active-companion-service', purpose: 'Connect Canon Studio, Continuity Gate, Echo Index and Records Room through provenance-bearing world and storywork receipts.', permissions: ['local-event-bus', 'artifact-metadata', 'rich-text-compose'], emits: ['canon.receipt', 'continuity.receipt', 'storywork.receipt'], listens: ['world.changed', 'canon.ingest', 'records.saved'] },
  { id: 'runa-resonance-bridge', name: 'Runa Resonance Bridge', status: 'active-companion-service', purpose: 'Project shared Spiral Resonance into Runa World Hum and harmonic channels while preserving the originating crossing receipt.', permissions: ['local-event-bus', 'web-audio-after-user-gesture'], emits: ['runa.resonance', 'world-hum.update'], listens: ['arcsweep.resonance', 'premaqc.update', 'spiral.update'] },
  { id: 'writer-room-rail', name: 'Writer Room Rail Adapter', status: 'active-companion-service', purpose: 'Package passages, drafts, prompts, and documents with native rich text into the shared Companion artifact contract.', permissions: ['local-storage', 'rich-text-compose', 'manual-attach'], emits: ['writer.artifact.received'], listens: ['manual-writer-receipt'] },
  { id: 'asset-watcher', name: 'Asset Watcher Adapter', status: 'active-native-companion-service', purpose: 'Watch only an explicitly selected folder and translate metadata-only file events into reviewable Companion artifact receipts.', permissions: ['explicit-folder-picker', 'file-metadata-read', 'native-session-watch'], emits: ['asset.file_detected'], listens: ['electron.asset-watch:event'] },
];

export function buildPluginEvent(pluginId, type, payload = {}) {
  return { schema: 'flameclyffe.project-zero-companion.adapter-event/v1', bridge_owner: 'flameclyffe', integration_target: 'nocturne-project-zero', plugin_id: pluginId, type, payload, created_at: new Date().toISOString(), rule: 'Data sets atmosphere, not fate.' };
}
