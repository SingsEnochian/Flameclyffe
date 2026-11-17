import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, extname, dirname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.env.WAYGLASS_NATIVE_ARCSWEEP_STAGED_ROOT || 'apps/starwell-server/public');
const output = resolve(process.env.WAYGLASS_NATIVE_ARCSWEEP_BROWSER_ARTIFACTS || 'artifacts/wayglass/native-arcsweep');
const moduleFile = resolve(process.env.WAYGLASS_PLAYWRIGHT_MODULE || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const packageInfo = JSON.parse(await readFile(resolve(dirname(moduleFile), 'package.json'), 'utf8');
assert.equal(packageInfo.version, '1.62.1', 'Pinned Playwright is required');
const { chromium } = await import(pathToFileURL(moduleFile).href);

await stat(resolve(root, 'wayglass/index.html'));
await mkdir(output, { recursive: true });

const mime = {
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml',
  '.png':'image/png','.woff2':'font/woff2','.wasm':'application/wasm','.webmanifest':'application/manifest+json',
};

const requests = [];
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    requests.push(pathname);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (pathname.startsWith('/api/')) {
      res.writeHead(503, {'content-type':'application/json'});
      res.end('{"error":"Optional live service unavailable in native ArcSweep browser gate"}');
      return;
    }
    if (pathname.startsWith('/arcsweep/')) {
      res.writeHead(404, {'content-type':'text/plain'});
      res.end('Standalone ArcSweep intentionally unavailable in native migration gate');
      return;
    }

    const file = resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    const local = relative(root, file);
    if (local === '..' || local.startsWith('..' + sep) || local.startsWith(sep)) {
      res.writeHead(403); res.end(); return;
    }
    const body = await readFile(file);
    res.writeHead(200, {'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control':'no-store'});
    res.end(body);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500);
    res.end('Built asset unavailable');
  }
});

await new Promise((done, fail) => {
  server.once('error', fail);
  server.listen(0, '127.0.0.1', done);
});
const origin = 'http://127.0.0.1:' + server.address().port;

const receipt = {
  schema: 'wayglass.native-arcsweep-browser/v1',
  source_sha: process.env.GITHUB_SHA || null,
  standalone_arcsweep_available: false,
  live_provider_calls: false,
  production_deployment: false,
  playwright: packageInfo.version,
  scenarios: [],
  page_errors: [],
  console_errors: [],
  requested_paths: requests,
  status: 'running',
};

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.WAYGLASS_CHROMIUM_EXECUTABLE ? { executablePath: process.env.WAYGLASS_CHROMIUM_EXECUTABLE } : {}),
  });

  for (const profile of [
    { name:'desktop', viewport:{width:1440,height:1100} },
    { name:'mobile-reduced-motion', viewport:{width:390,height:844}, isMobile:true, hasTouch:true, reducedMotion:'reduce' },
  ]) {
    const { name, ...options } = profile;
    const context = await browser.newContext(options);
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) {
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    });

    const page = await context.newPage();
    page.on('pageerror', error => receipt.page_errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') receipt.console_errors.push(message.text().slice(0, 2000));
    });

    await page.goto(origin + '/wayglass/?room=deck');
    await page.locator('[data-surface="wayglass-world-continuity"]').waitFor();
    assert.equal(await page.locator('iframe').count(), 0, 'native World & Continuity must not use an iframe');
    await page.getByRole('heading', { name:'World & Continuity', exact:true }).waitFor();

    const firstWorldId = await page.locator('[data-world-select]').inputValue();
    assert.ok(firstWorldId, 'native inherited world registry must expose an active world');
    assert.match(await page.locator('[data-world-state]').textContent(), /Native state current/);

    const storageBefore = await page.evaluate(() => {
      const raw = localStorage.getItem('hearthgate.arcsweep.local.v0.1');
      return raw ? JSON.parse(raw) : null;
    });
    assert.ok(storageBefore, 'native Wayglass surface must load the existing ArcSweep-compatible state store');
    assert.equal(storageBefore.activeWorldId, firstWorldId);

    await page.reload();
    await page.locator('[data-surface="wayglass-world-continuity"]').waitFor();
    assert.equal(await page.locator('[data-world-select]').inputValue(), firstWorldId, 'active world must survive a cold browser reload');

    await page.evaluate(async () => {
      await globalThis.__wayglassOS.mount('arcsweep:deck');
    });
    await page.locator('[data-surface="wayglass-world-continuity"]').waitFor();
    assert.equal(await page.locator('iframe').count(), 0, 'legacy deck alias must resolve inward without reopening ArcSweep');

    await page.evaluate(async () => {
      await globalThis.__wayglassOS.mount('arcsweep:writing-room');
    });
    await page.locator('[data-surface="wayglass-writing-room"]').waitFor();
    assert.equal(await page.locator('iframe').count(), 0, 'legacy writing alias must resolve to native Wayglass Writing Room');

    await page.goto(origin + '/wayglass/?room=worlds');
    await page.locator('[data-surface="wayglass-world-continuity"]').waitFor();

    await page.screenshot({ path: resolve(output, name + '.png'), fullPage: true });

    receipt.scenarios.push({
      profile: name,
      canonical_world_surface: true,
      legacy_deck_alias_resolves_inward: true,
      legacy_writing_alias_resolves_inward: true,
      persisted_active_world_survives_reload: true,
      iframe_count: 0,
      standalone_arcsweep_requested: false,
    });

    await context.close();
  }

  const arcsweepRequests = requests.filter(pathname => pathname.startsWith('/arcsweep/'));
  assert.deepEqual(arcsweepRequests, [], 'Wayglass native migration must not request standalone /arcsweep/ assets');
  assert.deepEqual(receipt.page_errors, []);
  receipt.standalone_arcsweep_requests = arcsweepRequests;
  receipt.status = 'passed';
} catch (error) {
  receipt.status = 'failed';
  receipt.failure = String(error.stack || error);
  throw error;
} finally {
  await writeFile(resolve(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  await browser?.close();
  await new Promise(done => server.close(done));
}
