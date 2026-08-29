import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('House Chat owns a native authoritative surface before v5 enhancement', async () => {
  const source = await readFile(new URL('../src/house-chat-authoritative-surface.js', import.meta.url), 'utf8');
  const bootstrap = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');

  assert.match(source, /house-chat-authoritative-surface\/v1/);
  assert.match(source, /data-house-chat-authoritative/);
  assert.match(source, /data-house-chat-native-form/);
  assert.match(source, /class=\"panel commons-log\"/);
  assert.match(source, /id=\"commons-form\"/);
  assert.match(source, /Send to House Chat ∞/);
  assert.match(bootstrap, /house-chat-authoritative-surface\.js'[\s\S]*house-commons-chat-v5\.js'[\s\S]*house-chat-runtime-roster-ui\.js'/);
});

test('legacy core Commons remains transport-compatible but is replaced visibly', async () => {
  const core = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const surface = await readFile(new URL('../src/house-chat-authoritative-surface.js', import.meta.url), 'utf8');
  assert.match(core, /id=\"commons-form\"/);
  assert.match(surface, /page\.replaceChildren\(surface\)/);
});
