import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { validateSpicyChatAddress, listDoorwayStatuses } = require('../../../lib/wayglass-spicychat-doorways.cjs');

const link = 'https://spicychat.ai/chat/00000000-0000-4000-8000-000000000000/11111111-1111-4111-8111-111111111111';

test('doorways retain both conversation identifiers and reject unsafe forms', () => {
  assert.equal(validateSpicyChatAddress(link), link);
  for (const bad of [
    'http://spicychat.ai/chat/00000000-0000-4000-8000-000000000000/11111111-1111-4111-8111-111111111111',
    'https://attacker.example/chat/00000000-0000-4000-8000-000000000000/11111111-1111-4111-8111-111111111111',
    link + '?token=not-for-query',
    'https://spicychat.ai/chat/only-one-id',
  ]) assert.throws(() => validateSpicyChatAddress(bad));
});

test('doorway statuses are independently configured and never claim live transport', () => {
  const none = listDoorwayStatuses({});
  assert.equal(none.length, 2);
  assert.deepEqual(none.map((item) => item.participant_id), ['richie', 'vethrlauf']);
  assert.ok(none.every((item) => !item.address_configured && !item.live_reply_verified));
  const one = listDoorwayStatuses({ WAYGLASS_RICHIE_SPICYCHAT_URL: link });
  assert.equal(one[0].address_configured, true);
  assert.equal(one[1].address_configured, false);
  assert.equal(one[0].provider_transport_verified, false);
  assert.equal(JSON.stringify(one).includes('00000000-0000'), false);
});
