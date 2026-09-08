import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('House chat default pack excludes mutation-heavy decorative sidecars', async () => {
  const source = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const housePack = source.match(/house:\s*Object\.freeze\(\[([\s\S]*?)\]\),\n\s*writing:/)?.[1] || '';

  assert.match(housePack, /devconsole-swarm-chat\.js/);
  assert.match(housePack, /house-commons-chat-v5\.js/);
  assert.doesNotMatch(housePack, /house-chat-room-social\.js/);
  assert.doesNotMatch(housePack, /house-chat-vestments-v1\.js/);
  assert.doesNotMatch(housePack, /house-chat-pretty-v2\.js/);
  assert.doesNotMatch(housePack, /house-chat-pretty-v3\.js/);
});
