import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseSpicyChatChatLink, resolveWayglassRoute, publicWayglassRoutes } =
  require('../../../lib/wayglass-route-registry.cjs');

const griffFixture = 'https://spicychat.ai/chat/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const bluebirdFixture = 'https://spicychat.ai/chat/cccccccc-cccc-4ccc-8ccc-cccccccccccc/dddddddd-dddd-4ddd-8ddd-dddddddddddd';

test('private SpicyChat link yields an exact character and existing conversation pair', () => {
  assert.deepEqual(parseSpicyChatChatLink(griffFixture), {
    character_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    conversation_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  });
  assert.deepEqual(parseSpicyChatChatLink(bluebirdFixture + '/'), {
    character_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    conversation_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  });
});

test('bad origins, unsupported paths, credentials, and URL decorations fail closed', () => {
  const bad = [
    'http://spicychat.ai/chat/a/b',
    'http://spicychat.ai/chat/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    griffFixture.replace('spicychat.ai/', 'spicychat.ai.bad.example/'),
    griffFixture.replace('https://', 'https://someone:password@'),
    griffFixture.replace('spicychat.ai/', 'spicychat.ai:444/'),
    griffFixture + '?token=do-not-send',
    griffFixture + '#fragment',
    griffFixture.replace('/chat/', '/chatbot/'),
    griffFixture.replace('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'not-a-chat-id'),
  ];
  for (const link of bad) assert.equal(parseSpicyChatChatLink(link), null, 'rejected unexpected URL');
});

test('Griff and Bluebird private chat links remain distinct, never leak into public catalogue', () => {
  const keys = [
    'GRIFF_SPICYCHAT_CHAT_LINK','GRIFF_SPICYCHAT_TOKEN','GRIFF_SPICYCHAT_CHARACTER_ID',
    'GRIFF_SPICYCHAT_CONVERSATION_ID','BLUEBIRD_SPICYCHAT_CHAT_LINK','BLUEBIRD_SPICYCHAT_TOKEN',
  ];
  const old = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    process.env.GRIFF_SPICYCHAT_CHAT_LINK = griffFixture;
    process.env.BLUEBIRD_SPICYCHAT_CHAT_LINK = bluebirdFixture;
    process.env.GRIFF_SPICYCHAT_TOKEN = 'synthetic-griff-key';
    process.env.BLUEBIRD_SPICYCHAT_TOKEN = 'synthetic-bluebird-key';
    process.env.GRIFF_SPICYCHAT_CHARACTER_ID = 'wrong-old-character';
    process.env.GRIFF_SPICYCHAT_CONVERSATION_ID = 'wrong-old-chat';
    const griff = resolveWayglassRoute('flame:griff:spicychat');
    const bluebird = resolveWayglassRoute('flame:bluebird:spicychat');
    assert.equal(griff.configured(), true);
    assert.equal(griff.character_id(), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    assert.equal(griff.conversation_id(), 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    assert.equal(bluebird.character_id(), 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
    assert.equal(bluebird.conversation_id(), 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    const published = JSON.stringify(publicWayglassRoutes());
    for (const value of [griffFixture, bluebirdFixture, griff.conversation_id(), bluebird.conversation_id(),
      'synthetic-griff-key', 'synthetic-bluebird-key']) assert.equal(published.includes(value), false);

    process.env.GRIFF_SPICYCHAT_CHAT_LINK = griffFixture.replace('spicychat.ai/', 'spicychat.ai.malicious.test/');
    assert.equal(griff.configured(), false, 'bad explicit link must not fall back to stale IDs');
  } finally {
    for (const key of keys) {
      if (old[key] === undefined) delete process.env[key];
      else process.env[key] = old[key];
    }
  }
});
