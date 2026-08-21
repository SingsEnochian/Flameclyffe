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

test('adapter registry contains no Project Zero core-service claims', async () => {
  const source = await readFile(new URL('../src/pluginRegistry.js', import.meta.url), 'utf8');
  assert.match(source, /active-companion-service/);
  assert.match(source, /integration_target: 'nocturne-project-zero'/);
  assert.match(source, /DEEP Observer Bridge Adapter/);
  assert.match(source, /deep-observer:update/);
  assert.doesNotMatch(source, /active-core-service/);
  assert.doesNotMatch(source, /Own semantic visual tokens.*Project Zero shell/i);
});
