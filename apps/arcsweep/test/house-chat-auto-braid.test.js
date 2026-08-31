import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const streamSource = fs.readFileSync(new URL('../src/flame-chat-stream-client.js', import.meta.url), 'utf8');
const receiptSource = fs.readFileSync(new URL('../src/house-runtime-receipt-client.js', import.meta.url), 'utf8');

test('ordinary House Chat replies automatically enter the Runtime Braid', () => {
  assert.match(streamSource, /HOUSE_CHAT_AUTO_BRAID_SCHEMA = 'arcsweep\.house-chat-auto-braid\/v1'/);
  assert.match(streamSource, /metadata\?\.surface !== 'house-commons'/);
  assert.match(streamSource, /buildModelReplyRuntimeEvent/);
  assert.match(streamSource, /persistAndVerifyModelReplyRuntimeEvent/);
  assert.match(streamSource, /commons_thread_id/);
  assert.match(streamSource, /commons_turn_id/);
});

test('successful model speech survives receipt failure without pretending persistence', () => {
  assert.match(streamSource, /catch \(error\) \{/);
  assert.match(streamSource, /persisted: false/);
  assert.match(streamSource, /readbackVerified: false/);
  assert.match(streamSource, /reason: error\?\.message \|\| String\(error\)/);
  assert.doesNotMatch(streamSource, /throw new Error\('Runtime receipt readback did not match the written event\.'\)[\s\S]*House reply was visible/);
});

test('auto braid receipt remains attributable to World, Flame, route, thread and turn', () => {
  for (const needle of ['voice_id', 'provider', 'model', 'route', 'worldContext', 'threadId', 'turnId']) assert.match(streamSource, new RegExp(needle));
  assert.match(receiptSource, /readback\.voice_id === event\.voice_id/);
  assert.match(receiptSource, /readback\.provider === event\.provider/);
  assert.match(receiptSource, /readback\.model === event\.model/);
  assert.match(receiptSource, /readback\.route === event\.route/);
  assert.match(receiptSource, /readback\.thread_id === event\.thread_id/);
  assert.match(receiptSource, /readback\.turn_id === event\.turn_id/);
});

test('portable Ox Alpha follows the same automatic receipt path', () => {
  assert.match(streamSource, /return maybeAutoReceiptHouseReply\(reply, metadata, worldContext\);/);
  assert.match(streamSource, /voiceId: 'oxalpha'/);
  assert.match(streamSource, /route: rawReply\.route \|\| 'oxalpha'/);
});
