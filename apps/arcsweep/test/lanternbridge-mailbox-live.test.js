import assert from 'node:assert/strict';
import test from 'node:test';
import { syncLanternbridgeMailbox } from '../src/lanternbridge-mailbox-live.js';

test('live mailbox calls only the authenticated House sync route', async () => {
  let calls = 0;
  const fetchImpl = async (url, init = {}) => {
    calls += 1;
    assert.equal(String(url), '/api/v1/house/lanternbridge/sync');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.authorization, 'Bearer test-house-token');
    return new Response(JSON.stringify({
      schema: 'hearthgate.lanternbridge-mailbox-sync/v1',
      state: 'ready',
      checked: 7,
      processed: 1,
      duplicates: 6,
    }), { status: 200 });
  };

  const result = await syncLanternbridgeMailbox({ fetchImpl, sessionProvider: async () => 'test-house-token' });
  assert.equal(result.state, 'ready');
  assert.equal(result.processed, 1);
  assert.equal(result.duplicates, 6);
  assert.equal(calls, 1);
});

test('mailbox does no network work while House Runtime is offline', async () => {
  let calls = 0;
  const result = await syncLanternbridgeMailbox({
    fetchImpl: async () => { calls += 1; throw new Error('should not fetch'); },
    sessionProvider: async () => '',
  });
  assert.equal(result.state, 'house-offline');
  assert.equal(calls, 0);
});

test('private-repository configuration errors surface instead of falling back to browser GitHub access', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    state: 'provider-unconfigured',
    error: 'Lanternbridge private-repository access is not configured.',
    missing: ['LANTERNBRIDGE_GITHUB_TOKEN'],
  }), { status: 503 });
  await assert.rejects(
    () => syncLanternbridgeMailbox({ fetchImpl, sessionProvider: async () => 'test-house-token' }),
    /private-repository access is not configured/i,
  );
});
