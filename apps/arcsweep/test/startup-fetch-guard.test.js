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

test('startup guard and visible bootstrap are mounted before the application module', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const guard = html.indexOf('./src/startup-fetch-guard.js');
  const bootstrap = html.indexOf('./src/main-bootstrap.js');
  assert.ok(guard >= 0, 'startup fetch guard must be mounted');
  assert.ok(bootstrap > guard, 'visible bootstrap must follow the fetch guard');
  assert.equal(html.includes('<script type="module" src="./src/main.js"></script>'), false, 'main.js must be imported through the visible bootstrap');
});

test('visible bootstrap paints first, fails persistence soft, and offers safe boot', async () => {
  const source = await readFile(new URL('../src/main-bootstrap.js', import.meta.url), 'utf8');
  assert.match(source, /Opening the house/);
  assert.match(source, /persistence unavailable; continuing in memory/);
  assert.match(source, /await import\('\.\/main\.js'\)/);
  assert.match(source, /The house did not finish opening/);
  assert.match(source, /\?safe=1/);
  assert.match(source, /Safe Boot active/);
  assert.match(source, /return null/);
  assert.match(source, /__arcsweepSafeBoot/);
});
