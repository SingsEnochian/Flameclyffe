import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('runtime roster ships its deployment markers', async () => {
  const source = await readFile(new URL('../src/house-chat-runtime-roster-ui.js', import.meta.url), 'utf8');
  for (const marker of ['House voices', 'Live runtime roster', 'data-runtime-voice-id', 'house-runtime-roster-legacy']) {
    assert.equal(source.includes(marker), true, `missing House Chat runtime roster marker: ${marker}`);
  }
});
