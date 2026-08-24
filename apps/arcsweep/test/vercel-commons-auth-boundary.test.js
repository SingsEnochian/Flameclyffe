import assert from 'node:assert/strict';
import test from 'node:test';

import commonsAdapter from '../../../api/v1/house/commons.js';
import attachmentsAdapter from '../../../api/v1/house/commons/attachments.js';

const SERVICE_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

async function withoutServiceStorage(run) {
  const previous = Object.fromEntries(SERVICE_ENV.map((name) => [name, process.env[name]]));
  for (const name of SERVICE_ENV) delete process.env[name];
  try {
    return await run();
  } finally {
    for (const name of SERVICE_ENV) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
}

test('Vercel Commons rejects unauthorised requests before Supabase storage initialises', async () => {
  await withoutServiceStorage(async () => {
    const response = await commonsAdapter.fetch(new Request('https://house.test/api/v1/house/commons'));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Valid House Runtime session required.' });
  });
});

test('Vercel Commons attachments reject unauthorised requests before Supabase storage initialises', async () => {
  await withoutServiceStorage(async () => {
    const response = await attachmentsAdapter.fetch(new Request('https://house.test/api/v1/house/commons/attachments'));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Valid House Runtime session required.' });
  });
});
