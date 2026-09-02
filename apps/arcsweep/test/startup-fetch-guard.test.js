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

test('only startup guard and visible bootstrap sit on the critical HTML boot path', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const moduleScripts = [...html.matchAll(/<script type="module" src="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(moduleScripts, [
    './src/canonical-runtime-host.js',
    './src/startup-fetch-guard.js',
    './src/main-bootstrap.js',
  ]);
});

test('iPhone bootstrap exposes native launch links before loading core', async () => {
  const source = await readFile(new URL('../src/main-bootstrap.js', import.meta.url), 'utf8');
  assert.match(source, /mobileLauncher/);
  assert.match(source, /data-arcsweep-recovery="launcher"/);
  assert.match(source, /href="\.\/\?open=1"/);
  assert.match(source, /href="\.\/\?safe=1"/);
  assert.match(source, /Nothing heavy loads until you tap/);
  assert.match(source, /min-height:48px/);
  assert.match(source, /touch-action:manipulation/);
});

test('core renders before deferred sidecars and Safe Boot remains core-only', async () => {
  const source = await readFile(new URL('../src/main-bootstrap.js', import.meta.url), 'utf8');
  assert.match(source, /await import\('\.\/main\.js'\)/);
  assert.match(source, /arcsweep:core-ready/);
  assert.match(source, /sidecar-bootstrap\.js/);
  assert.match(source, /if \(!safeBoot\)/);
  assert.match(source, /core Arcsweep only/);
  assert.match(source, /__arcsweepSafeBoot/);
  assert.match(source, /persistence unavailable; continuing in memory/);
  assert.match(source, /data-arcsweep-recovery="boot"/);
  assert.match(source, /data-arcsweep-recovery="error"/);
});

test('sidecar bootstrap contains failures, build-visible loaders, and WebKit yields between organs', async () => {
  const source = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  assert.match(source, /import\.meta\.glob\(/);
  assert.match(source, /SIDECAR_LOADERS\[specifier\]/);
  assert.match(source, /await load\(\)/);
  assert.doesNotMatch(source, /await import\(specifier\)/);
  assert.match(source, /setTimeout\(resolve, 0\)/);
  assert.match(source, /sidecar failed/);
  assert.match(source, /arcsweep:sidecars-ready/);
  assert.match(source, /mobile-navigation-sidecar\.js/);
});
