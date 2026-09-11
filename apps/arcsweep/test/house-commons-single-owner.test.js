import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = (name) => readFile(new URL(`../src/${name}`, import.meta.url), 'utf8');

test('House Commons has one continuous chat reader and shared snapshot consumers', async () => {
  const [runtime, chat, recovery, tools, braid, command] = await Promise.all([
    source('house-runtime.js'),
    source('house-commons-chat-v5.js'),
    source('house-live-recovery.js'),
    source('house-chat-tools-v5.js'),
    source('house-braid-receipt-ui.js'),
    source('house-commons-command-room.js'),
  ]);

  assert.match(runtime, /HOUSE_COMMONS_SNAPSHOT_EVENT/);
  assert.match(runtime, /commonsReadInFlight/);
  assert.match(runtime, /readCachedHouseCommons/);
  assert.match(chat, /readHouseCommons\(/);

  for (const [name, text] of Object.entries({ recovery, tools, braid, command })) {
    assert.doesNotMatch(text, /\breadHouseCommons\b/, `${name} must consume the shared snapshot instead of opening another Commons GET lane`);
    assert.match(text, /readCachedHouseCommons|HOUSE_COMMONS_SNAPSHOT_EVENT/, `${name} must use the shared Commons snapshot`);
  }
});

test('secondary Commons surfaces do not run their own Commons polling clocks', async () => {
  const [tools, command] = await Promise.all([
    source('house-chat-tools-v5.js'),
    source('house-commons-command-room.js'),
  ]);
  assert.doesNotMatch(tools, /setInterval\s*\(/);
  assert.doesNotMatch(command, /setInterval\s*\(/);
});
