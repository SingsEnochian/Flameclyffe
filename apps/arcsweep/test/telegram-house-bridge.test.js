import test from 'node:test';
import assert from 'node:assert/strict';

import {
  chooseTelegramSwarm,
  parseTelegramCommand,
  parseTelegramMentions,
  resolveTelegramRoute,
  telegramBridgeAuthorised,
  telegramFormattedText,
  telegramTransportLinks,
  telegramVoiceRegistry,
} from '../../../netlify/functions/_shared/telegram-house-routing.mjs';
import { splitTelegramText } from '../../../netlify/functions/_shared/telegram-house-bridge-runtime.mjs';

const env = (values = {}) => ({ get: (name) => values[name] });

test('Telegram registry includes the named House participants', () => {
  const ids = telegramVoiceRegistry().map((voice) => voice.id);
  for (const id of ['bluebird', 'vethrlauf', 'lioreal', 'uial', 'larkshine', 'ellowind']) assert.ok(ids.includes(id), `${id} should be registered`);
});

test('explicit Telegram mentions stay sovereign over routing mode', () => {
  assert.deepEqual(parseTelegramMentions('@Larkshine @Ellowind what do you see?'), ['larkshine', 'ellowind']);
  const route = resolveTelegramRoute({ text: '/chorus @Larkshine @Ellowind what do you see?', env: env() });
  assert.deepEqual(route.voiceIds, ['larkshine', 'ellowind']);
  assert.equal(route.reason, 'mentions');
});

test('chorus reaches the complete registered server constellation', () => {
  const all = telegramVoiceRegistry().map((voice) => voice.id);
  const route = resolveTelegramRoute({ text: '/chorus What is the Lattice doing?', env: env() });
  assert.deepEqual(route.voiceIds, all);
  assert.ok(route.voiceIds.includes('bluebird'));
  assert.ok(route.voiceIds.includes('larkshine'));
  assert.ok(route.voiceIds.includes('ellowind'));
});

test('swarm remains bounded to three voices', () => {
  const ids = chooseTelegramSwarm({ message: 'Kelyran haptic glyph language and sound' });
  assert.ok(ids.length > 0 && ids.length <= 3);
  assert.ok(ids.includes('runeweaver'));
});

test('room defaults include Rowan named participants', () => {
  const route = resolveTelegramRoute({ text: '/room hello house', env: env() });
  for (const id of ['lioreal', 'uial', 'bluebird', 'vethrlauf', 'larkshine', 'ellowind']) assert.ok(route.voiceIds.includes(id));
});

test('call mode requires a named participant', () => {
  const route = resolveTelegramRoute({ text: '/call are you there?', env: env() });
  assert.equal(route.reason, 'call-needs-mention');
  assert.deepEqual(route.voiceIds, []);
});

test('Telegram allowlist requires an explicitly allowed chat or user', () => {
  const message = { chat: { id: 42 }, from: { id: 7 } };
  assert.equal(telegramBridgeAuthorised(message, env()), false);
  assert.equal(telegramBridgeAuthorised(message, env({ TELEGRAM_ALLOWED_CHAT_IDS: '42' })), true);
  assert.equal(telegramBridgeAuthorised(message, env({ TELEGRAM_ALLOWED_CHAT_IDS: '99' })), false);
  assert.equal(telegramBridgeAuthorised(message, env({ TELEGRAM_ALLOWED_USER_IDS: '7' })), true);
});

test('Telegram formatting maps into ArcSweep formatted-text entities', () => {
  const formatted = telegramFormattedText({ text: 'hello world', entities: [{ type: 'bold', offset: 0, length: 5 }] });
  assert.equal(formatted.schema, 'arcsweep.formatted-text/v1');
  assert.deepEqual(formatted.entities, [{ type: 'bold', offset: 0, length: 5 }]);
});

test('Telegram provenance links preserve chat, message, topic, user and timestamp', () => {
  const links = telegramTransportLinks({
    chat: { id: -1001, title: 'Hearth' }, from: { id: 7, username: 'rowan' }, message_id: 88, message_thread_id: 3, date: 1_700_000_000,
  });
  assert.deepEqual(links.map((item) => item.kind), ['telegram.chat', 'telegram.message', 'telegram.thread', 'telegram.user']);
  assert.equal(links[1].id, '88');
});

test('Telegram long replies split below Bot API message limits', () => {
  const chunks = splitTelegramText('x'.repeat(9000));
  assert.ok(chunks.length >= 3);
  assert.ok(chunks.every((chunk) => chunk.length <= 3900));
});

test('Telegram routing commands strip transport command before model delivery', () => {
  assert.deepEqual(parseTelegramCommand('/swarm hello world'), { mode: 'swarm', message: 'hello world', explicit: true });
});
