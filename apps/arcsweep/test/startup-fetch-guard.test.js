import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { installStartupFetchGuard } from '../src/startup-fetch-guard.js';

test('House session startup fetch receives a timeout signal without affecting other requests', async () => {
  const calls = [];
  const target = {
    fetch(input, init = {}) {
      calls.push({ input, init });
      return Promise.resolve({ ok: true });
    },
  };

  assert.equal(installStartupFetchGuard(target, 25), true);
  await target.fetch('/api/v1/house/session');
  await target.fetch('/api/v1/house/commons');

  assert.ok(calls[0].init.signal, 'House session restore must be abortable');
  assert.equal(calls[1].init.signal, undefined, 'unrelated runtime requests keep their caller-controlled behaviour');
  assert.equal(installStartupFetchGuard(target, 25), false, 'guard installs only once');
});

test('startup guard is mounted before main.js in the browser shell', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.indexOf('./src/startup-fetch-guard.js') < html.indexOf('./src/main.js'));
});
