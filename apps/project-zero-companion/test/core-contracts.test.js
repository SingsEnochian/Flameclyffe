import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createSocketEnvelope, PROJECT_ZERO_SOCKET } from '../src/projectZeroSocket.js';
import {
  DEFAULT_PROJECT_ZERO_THEME,
  PROJECT_ZERO_THEME_SCHEMA,
  exportProjectZeroTheme,
  importProjectZeroTheme,
  normaliseProjectZeroTheme,
} from '../src/themeEngine.js';
import {
  PROJECT_ZERO_RICH_TEXT_SCHEMA,
  escapeRichText,
  visibleTextToRichHtml,
} from '../src/richText.js';
import {
  DEEP_OBSERVER_BRIDGE_SCHEMA,
  createDeepObserverBridgeReceipt,
  normaliseDeepObserverVector,
} from '../src/deepObserverBridge.js';
import {
  COMPANION_ARTIFACT_SCHEMA,
  createCompanionArtifact,
  localPathToAlias,
} from '../src/artifactContract.js';
import { createTerraAeternaArtifact } from '../src/terraAeternaRootAdapter.js';
import { createWriterRoomArtifact } from '../src/writerRoomRailAdapter.js';
import {
  ASSET_WATCHER_SCHEMA,
  createAssetWatcherArtifact,
  isNativeAssetWatcherAvailable,
} from '../src/assetWatcherAdapter.js';

test('Companion socket envelopes are Flameclyffe-owned, typed, local and provenance-bearing', () => {
  const receipt = createSocketEnvelope({ pluginId: 'project-zero-companion-flame-channel', channel: 'chat', type: 'chat.flame.received', payload: { voice_id: 'lioreal' } });
  assert.equal(receipt.schema, PROJECT_ZERO_SOCKET.schema);
  assert.equal(receipt.plugin_id, 'project-zero-companion-flame-channel');
  assert.equal(receipt.channel, 'chat');
  assert.equal(receipt.type, 'chat.flame.received');
  assert.equal(receipt.provenance.owner, 'flameclyffe');
  assert.equal(receipt.provenance.integration_target, 'nocturne-project-zero');
  assert.equal(receipt.provenance.local_only, true);
  assert.match(receipt.schema, /^flameclyffe\.project-zero-companion\./);
  assert.match(receipt.envelope_id, /^socket-/);
});

test('Companion theme documents round-trip without claiming Project Zero core authority', () => {
  const theme = normaliseProjectZeroTheme({ name: 'Nocturne bench bridge', tokens: { accent: '#aa77ff', radiusPanel: 6 } });
  assert.equal(theme.schema, PROJECT_ZERO_THEME_SCHEMA);
  assert.match(theme.schema, /^flameclyffe\.project-zero-companion\./);
  assert.equal(theme.tokens.accent, '#aa77ff');
  assert.equal(theme.tokens.radiusPanel, 6);
  assert.equal(theme.tokens.text, DEFAULT_PROJECT_ZERO_THEME.tokens.text);
  assert.deepEqual(importProjectZeroTheme(exportProjectZeroTheme(theme)), theme);
});

test('visible response text becomes escaped native rich-text paragraphs', () => {
  const html = visibleTextToRichHtml('First <signal>\nline two\n\nSecond block');
  assert.equal(PROJECT_ZERO_RICH_TEXT_SCHEMA, 'flameclyffe.project-zero-companion.rich-text/v1');
  assert.match(html, /^<p>/);
  assert.match(html, /&lt;signal&gt;/);
  assert.match(html, /<br>/);
  assert.match(html, /<\/p><p>/);
  assert.equal(escapeRichText('<script>'), '&lt;script&gt;');
});

test('DEEP Observer bridge preserves missing axes and never claims Project Zero consumption', () => {
  const vector = normaliseDeepObserverVector({ P: 0.55, C: 1.2, E: -0.2, A: 0.654 });
  assert.deepEqual(vector, { P: 0.55, C: 1, R: null, E: 0, M: null, A: 0.654, Q: null });
  const receipt = createDeepObserverBridgeReceipt({ vector, source: 'deep-observer:update', observedAt: '2026-08-21T00:40:00-04:00' });
  assert.equal(receipt.schema, DEEP_OBSERVER_BRIDGE_SCHEMA);
  assert.equal(receipt.bridge_owner, 'flameclyffe');
  assert.equal(receipt.integration_target, 'nocturne-project-zero');
  assert.equal(receipt.project_zero_core_authority, false);
  assert.equal(receipt.availability.Q, 'unavailable');
  assert.equal(receipt.authority.claims_external_consumption, false);
  assert.equal(receipt.authority.claims_project_zero_adoption, false);
});

test('shared artifact contract strips raw local paths and never auto-promotes canon', () => {
  assert.equal(localPathToAlias('C:\\Users\\Rowan\\TerraAeterna\\Maps\\moon.png'), 'TerraAeterna/Maps/moon.png');
  const artifact = createCompanionArtifact({
    kind: 'image',
    title: 'Moon map',
    sourceAdapter: 'terra-aeterna-root',
    localPath: 'C:\\Users\\Rowan\\TerraAeterna\\Maps\\moon.png',
    tags: ['Map', ' map ', 'MOON'],
  });
  assert.equal(artifact.schema, COMPANION_ARTIFACT_SCHEMA);
  assert.equal(artifact.source.local_path_alias, 'TerraAeterna/Maps/moon.png');
  assert.equal(artifact.source.raw_local_path_persisted, false);
  assert.equal(JSON.stringify(artifact).includes('C:\\\\Users'), false);
  assert.deepEqual(artifact.tags, ['map', 'moon']);
  assert.equal(artifact.authority.canon_commit, false);
  assert.equal(artifact.authority.claims_project_zero_adoption, false);
});

test('Terra Aeterna and Writer Room adapters share one artifact law without sharing authority', () => {
  const terra = createTerraAeternaArtifact({ kind: 'audio', title: 'World hum', localPathAlias: 'Music/world-hum.wav' });
  const writer = createWriterRoomArtifact({ kind: 'draft', title: 'Chapter fragment', worldId: 'terra-aeterna', plainText: 'The sea breathed against the black sand.' });
  assert.equal(terra.schema, COMPANION_ARTIFACT_SCHEMA);
  assert.equal(writer.schema, COMPANION_ARTIFACT_SCHEMA);
  assert.equal(terra.world_id, 'terra-aeterna');
  assert.equal(terra.source_adapter, 'terra-aeterna-root');
  assert.equal(writer.source_adapter, 'writer-room-rail');
  assert.equal(writer.content.rich_text.schema, PROJECT_ZERO_RICH_TEXT_SCHEMA);
  assert.match(writer.content.plain_text, /black sand/);
  assert.equal(writer.authority.canon_commit, false);
  assert.equal(writer.project_zero_core_authority, false);
});

test('Asset Watcher stays inert in browsers and converts native metadata into reviewable artifacts', () => {
  assert.equal(isNativeAssetWatcherAvailable({}), false);
  assert.equal(isNativeAssetWatcherAvailable({
    selectAssetWatchDirectory() {},
    startAssetWatch() {},
    stopAssetWatch() {},
    onAssetWatchEvent() {},
  }), true);
  const artifact = createAssetWatcherArtifact({
    schema: 'flameclyffe.hearthgate.asset-watch-event/v1',
    watch_id: 'watch-1',
    root_label: 'TerraAeterna',
    event_type: 'change',
    relative_path_alias: 'Images/moon.png',
    name: 'moon.png',
    extension: '.png',
    exists: true,
    is_directory: false,
    size_bytes: 2048,
    modified_at: '2026-08-21T01:50:00-04:00',
    observed_at: '2026-08-21T01:50:01-04:00',
    content_read: false,
  });
  assert.equal(ASSET_WATCHER_SCHEMA, 'flameclyffe.project-zero-companion.asset-watcher/v1');
  assert.equal(artifact.kind, 'image');
  assert.equal(artifact.source.local_path_alias, 'TerraAeterna/Images/moon.png');
  assert.equal(artifact.source.raw_local_path_persisted, false);
  assert.equal(artifact.metadata.content_read, false);
  assert.equal(artifact.authority.canon_commit, false);
  assert.equal(artifact.authority.claims_project_zero_adoption, false);
});

test('Flame Channel keeps attestation, multi-Flame broadcast, ownership boundary and native rich text', async () => {
  const source = await readFile(new URL('../src/FlameChannel.jsx', import.meta.url), 'utf8');
  assert.match(source, /runtimeVerified/);
  assert.match(source, /data\.provider/);
  assert.match(source, /data\.model/);
  assert.match(source, /selectedVoices\.forEach/);
  assert.match(source, /contentEditable/);
  assert.match(source, /sanitiseRichHtml/);
  assert.match(source, /integration_target: 'nocturne-project-zero'/);
  assert.match(source, /bridge_owner: 'flameclyffe'/);
  assert.doesNotMatch(source, /Project Zero core/);
  assert.doesNotMatch(source, /marked\(|markdown-it|react-markdown/i);
});

test('artifact rail is native rich text and exposes both active Companion adapters', async () => {
  const source = await readFile(new URL('../src/ArtifactBridgePanel.jsx', import.meta.url), 'utf8');
  assert.match(source, /contentEditable/);
  assert.match(source, /emitWriterRoomArtifact/);
  assert.match(source, /emitTerraAeternaArtifact/);
  assert.match(source, /Raw local path was not persisted/);
  assert.doesNotMatch(source, /claims_project_zero_adoption:\s*true/);
});

test('Asset Watcher panel requires explicit native selection and has a visible stop control', async () => {
  const source = await readFile(new URL('../src/AssetWatcherPanel.jsx', import.meta.url), 'utf8');
  assert.match(source, /selectAssetWatchDirectory/);
  assert.match(source, /startAssetWatch/);
  assert.match(source, /stopAssetWatch/);
  assert.match(source, /Choose folder/);
  assert.match(source, /Stop \+ release/);
  assert.match(source, /contents were not read/);
});

test('adapter registry contains no Project Zero core-service claims', async () => {
  const source = await readFile(new URL('../src/pluginRegistry.js', import.meta.url), 'utf8');
  assert.match(source, /active-companion-service/);
  assert.match(source, /active-native-companion-service/);
  assert.match(source, /integration_target: 'nocturne-project-zero'/);
  assert.match(source, /DEEP Observer Bridge Adapter/);
  assert.match(source, /Terra Aeterna Root Adapter/);
  assert.match(source, /Writer Room Rail Adapter/);
  assert.match(source, /Asset Watcher Adapter/);
  assert.match(source, /shared-artifact-contract/);
  assert.match(source, /native-selected-folder-watcher/);
  assert.doesNotMatch(source, /active-core-service/);
  assert.doesNotMatch(source, /Own semantic visual tokens.*Project Zero shell/i);
});
