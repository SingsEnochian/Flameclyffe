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
