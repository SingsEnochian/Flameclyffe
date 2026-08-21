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

test('Project Zero socket envelopes are typed, local and provenance-bearing', () => {
  const receipt = createSocketEnvelope({ pluginId: 'flame-channel', channel: 'chat', type: 'chat.flame.received', payload: { voice_id: 'lioreal' } });
  assert.equal(receipt.schema, PROJECT_ZERO_SOCKET.schema);
  assert.equal(receipt.plugin_id, 'flame-channel');
  assert.equal(receipt.channel, 'chat');
  assert.equal(receipt.type, 'chat.flame.received');
  assert.equal(receipt.provenance.local_only, true);
  assert.match(receipt.envelope_id, /^socket-/);
});

test('theme documents round-trip through the Project Zero schema', () => {
  const theme = normaliseProjectZeroTheme({ name: 'Nocturne bench', tokens: { accent: '#aa77ff', radiusPanel: 6 } });
  assert.equal(theme.schema, PROJECT_ZERO_THEME_SCHEMA);
  assert.equal(theme.tokens.accent, '#aa77ff');
  assert.equal(theme.tokens.radiusPanel, 6);
  assert.equal(theme.tokens.text, DEFAULT_PROJECT_ZERO_THEME.tokens.text);
  assert.deepEqual(importProjectZeroTheme(exportProjectZeroTheme(theme)), theme);
});

test('visible response text becomes escaped native rich-text paragraphs', () => {
  const html = visibleTextToRichHtml('First <signal>\nline two\n\nSecond block');
  assert.equal(PROJECT_ZERO_RICH_TEXT_SCHEMA, 'project-zero.rich-text/v1');
  assert.match(html, /^<p>/);
  assert.match(html, /&lt;signal&gt;/);
  assert.match(html, /<br>/);
  assert.match(html, /<\/p><p>/);
  assert.equal(escapeRichText('<script>'), '&lt;script&gt;');
});

test('Flame Channel keeps attestation, multi-Flame broadcast and native rich text in the source contract', async () => {
  const source = await readFile(new URL('../src/FlameChannel.jsx', import.meta.url), 'utf8');
  assert.match(source, /runtimeVerified/);
  assert.match(source, /data\.provider/);
  assert.match(source, /data\.model/);
  assert.match(source, /selectedVoices\.forEach/);
  assert.match(source, /contentEditable/);
  assert.match(source, /sanitiseRichHtml/);
  assert.doesNotMatch(source, /marked\(|markdown-it|react-markdown/i);
});
