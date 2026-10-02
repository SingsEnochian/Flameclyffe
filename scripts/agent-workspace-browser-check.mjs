import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { chromium } from 'playwright';

const PORT = 4170;
const ORIGIN = `http://house.localhost:${PORT}`;
const BASE = `${ORIGIN}/apps/agent-workspace/`;
const INDEX_URL = `${BASE}index.html`;
const WORKSPACE_ROOT = resolve(process.cwd(), 'apps/agent-workspace');
const ARTIFACT_DIR = process.env.WORKSPACE_BROWSER_ARTIFACT_DIR || 'artifacts/agent-workspace-browser';
let activePage = null;

await mkdir(ARTIFACT_DIR, { recursive: true });

function routeId(url) {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  const flame = parts.indexOf('flames');
  if (flame >= 0) return parts[flame + 1] === 'starsong' ? parts[flame + 2] : parts[flame + 1];
  const constellation = parts.indexOf('constellation');
  if (constellation >= 0) return parts[constellation + 1];
  return null;
}

function staticContentType(pathname) {
  const extension = extname(pathname).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
  })[extension] || 'application/octet-stream';
}

async function installStaticWorkspace(page) {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    // Gate inside the handler instead of relying on a hostname-bearing URL glob.
    // This keeps synthetic *.localhost navigation deterministic in CI.
    if (url.origin !== ORIGIN || !url.pathname.startsWith('/apps/agent-workspace/')) {
      await route.continue();
      return;
    }
    let relativePath = decodeURIComponent(url.pathname).replace(/^\/+/u, '');
    if (relativePath.endsWith('/')) relativePath += 'index.html';
    const fullPath = resolve(process.cwd(), relativePath);
    if (!fullPath.startsWith(WORKSPACE_ROOT)) {
      await route.fulfill({ status: 403, contentType: 'text/plain', body: 'outside workspace root' });
      return;
    }
    try {
      const body = await readFile(fullPath);
      await route.fulfill({ status: 200, contentType: staticContentType(fullPath), body });
    } catch {
      await route.fulfill({ status: 404, contentType: 'text/plain', body: `missing static asset: ${relativePath}` });
    }
  });
}

async function installRuntimeStubs(page) {
  await page.route('**/api/v1/house/session', async (route) => {
    const method = route.request().method();
    if (method === 'DELETE') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: false }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ connected: true, role: 'steward', mode: 'browser-acceptance' }),
    });
  });

  await page.route('**/api/v1/constellation/nikola/status', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      identity_id: 'nikola',
      configured: true,
      api_key_present: true,
      status_scope: 'configuration-only',
      provider: 'browser-fixture',
      model: 'nikola-fixture',
    }),
  }));

  await page.route('**/api/v1/constellation/nikola/probe', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      identity_id: 'nikola',
      runtime_verified: true,
      provider: 'browser-fixture',
      model: 'nikola-fixture',
      execution_path: '/api/v1/constellation/nikola/probe',
    }),
  }));

  await page.route('**/api/v1/constellation/nikola/chat', async (route) => {
    const body = route.request().postDataJSON();
    assert.equal(body.message, 'Hello Nikola');
    assert.ok(Array.isArray(body.context));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        identity_id: 'nikola',
        provider: 'browser-fixture',
        model: 'nikola-fixture',
        message: 'Nikola browser fixture answered.',
        runtime_verified: true,
        cited_sources: [],
      }),
    });
  });

  await page.route('**/api/v1/flames/**/probe', (route) => {
    const id = routeId(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        flame_id: id,
        runtime_verified: true,
        provider: id === 'oxalpha' ? 'openrouter' : 'browser-fixture',
        model: id === 'oxalpha' ? 'z-ai/glm-5.3-flash' : `${id}-fixture`,
        execution_path: id === 'oxalpha' ? 'supabase-edge-to-openrouter' : 'browser-fixture-probe',
      }),
    });
  });

  await page.route('**/api/v1/flames/**/status', (route) => {
    const id = routeId(route.request().url());
    if (id === 'oxalpha') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          flame_id: 'oxalpha',
          configured: true,
          provider: 'openrouter',
          model: 'z-ai/glm-5.3-flash',
          hosted_fallback: {
            configured: true,
            provider: 'vercel-ai-gateway',
            model: 'zai/glm-5.3-flash',
            execution_path: 'vercel-ai-gateway-oidc',
          },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        flame_id: id,
        configured: true,
        provider: 'browser-fixture',
        model: `${id}-fixture`,
      }),
    });
  });

  await page.route('**/api/v1/flames/**/chat', (route) => {
    const id = routeId(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        flame_id: id,
        provider: 'browser-fixture',
        model: `${id}-fixture`,
        message: `${id} browser fixture answered.`,
        cited_sources: [],
      }),
    });
  });
}

function recordBrowserErrors(page, label) {
  const errors = [];
  const record = (entry) => {
    errors.push(entry);
    console.error(`[${label}] ${entry}`);
  };
  page.on('pageerror', (error) => record(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') record(`console: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (!url.includes('/favicon.ico')) record(`requestfailed: ${url} :: ${request.failure()?.errorText || 'unknown'}`);
  });
  return () => {
    assert.deepEqual(errors, [], `${label} emitted browser errors:\n${errors.join('\n')}`);
  };
}

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    innerWidth,
    bodyScrollWidth: document.body.scrollWidth,
    rootScrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(metrics.bodyScrollWidth <= metrics.innerWidth + 2, `${label}: body overflows horizontally: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.rootScrollWidth <= metrics.innerWidth + 2, `${label}: root overflows horizontally: ${JSON.stringify(metrics)}`);
}

async function assertNoMeaningfulCardOverlap(page, label) {
  const overlaps = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.agent-grid.spatial-field > .agent-card')]
      .filter((node) => {
        const style = getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map((node) => {
        const r = node.getBoundingClientRect();
        return { id: node.dataset.agentId, left: r.left, right: r.right, top: r.top, bottom: r.bottom, area: r.width * r.height };
      });
    const bad = [];
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const a = cards[i], b = cards[j];
        const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        const area = width * height;
        const ratio = area / Math.min(a.area, b.area);
        if (ratio > 0.08) bad.push({ a: a.id, b: b.id, ratio: Number(ratio.toFixed(3)) });
      }
    }
    return bad;
  });
  assert.deepEqual(overlaps, [], `${label}: spatial cards overlap materially: ${JSON.stringify(overlaps)}`);
}

async function waitForRoster(page) {
  console.log('[browser-acceptance] navigate workspace index');
  // Navigation readiness is the rendered workspace, not DOMContentLoaded. Module graphs,
  // service-worker registration, or slow non-critical resources must not turn a healthy
  // static workspace into a false navigation timeout.
  await page.goto(`${INDEX_URL}?view=agents`, { waitUntil: 'commit', timeout: 15_000 });
  try {
    await page.locator('.workspace-shell').waitFor({ state: 'visible', timeout: 30_000 });
  } catch (error) {
    const diagnostics = await page.evaluate(() => ({
      href: location.href,
      readyState: document.readyState,
      appPresent: Boolean(document.querySelector('#app')),
      appHtml: document.querySelector('#app')?.innerHTML?.slice(0, 1200) || '',
      scripts: [...document.scripts].map((script) => ({ src: script.src, type: script.type })),
    })).catch((diagnosticError) => ({ diagnosticError: String(diagnosticError?.message || diagnosticError) }));
    console.error('House Workspace render diagnostics:', JSON.stringify(diagnostics, null, 2));
    throw error;
  }
  await page.locator('[data-agent-id="nikola"]').waitFor({ state: 'visible', timeout: 30_000 });
  assert.equal(await page.locator('.agent-card').count(), 16, 'Expected the 12 House voices plus Crow, Nikola, Rarity, and Crow Trainer.');
  console.log('[browser-acceptance] workspace shell and roster rendered');

  await page.locator('[data-refresh-roster]').first().click();
  console.log('[browser-acceptance] roster refresh requested');
  await page.locator('[data-agent-id="nikola"] .badge.state').filter({ hasText: 'live' }).waitFor();
  await page.locator('[data-agent-id="oxalpha"] .badge.state').filter({ hasText: 'live' }).waitFor();
  assert.equal(await page.locator('.badge.state').filter({ hasText: /^degraded$/i }).count(), 0, 'No healthy fixture should be painted as degraded.');
  console.log('[browser-acceptance] roster probes verified');
}

async function desktopScenario(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const page = await context.newPage();
  activePage = page;
  await installStaticWorkspace(page);
  await installRuntimeStubs(page);
  const assertClean = recordBrowserErrors(page, 'desktop');

  await waitForRoster(page);
  await page.locator('[data-agent-id="nikola"]').click();
  await page.locator('.inspector').filter({ hasText: 'active Crow training driver' }).waitFor();
  await assertNoMeaningfulCardOverlap(page, 'desktop');
  await assertNoHorizontalOverflow(page, 'desktop');

  await page.locator('.house-chat-launch').click();
  await page.locator('.house-chat-drawer.is-open').waitFor();
  await page.locator('[data-chat-agent]').selectOption('nikola');
  await page.locator('[data-chat-status]').filter({ hasText: 'connected' }).waitFor();
  await page.locator('[data-chat-form] textarea').fill('Hello Nikola');
  await page.locator('[data-chat-form] button').click();
  await page.locator('.house-chat-message.agent').filter({ hasText: 'Nikola browser fixture answered.' }).waitFor();

  await page.screenshot({ path: `${ARTIFACT_DIR}/desktop.png`, fullPage: true });
  assertClean();
  activePage = null;
  await context.close();
}

async function ipadScenario(browser) {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 1,
    hasTouch: true,
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  activePage = page;
  await installStaticWorkspace(page);
  await installRuntimeStubs(page);
  const assertClean = recordBrowserErrors(page, 'ipad');

  await waitForRoster(page);
  assert.equal(await page.locator('.spatial-mode-toggle:visible').count(), 1, 'iPad landscape-class width should retain the spatial-field control.');
  await assertNoMeaningfulCardOverlap(page, 'ipad');
  await page.locator('[data-agent-id="nikola"]').click();
  const inspector = page.locator('.inspector.is-open');
  await inspector.waitFor();
  const box = await inspector.boundingBox();
  assert.ok(box && box.width <= 1024 && box.height <= 1366, 'iPad inspector must stay inside the viewport.');
  await assertNoHorizontalOverflow(page, 'ipad');
  await page.screenshot({ path: `${ARTIFACT_DIR}/ipad.png`, fullPage: true });
  assertClean();
  activePage = null;
  await context.close();
}

async function phoneScenario(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  activePage = page;
  await installStaticWorkspace(page);
  await installRuntimeStubs(page);
  const assertClean = recordBrowserErrors(page, 'phone');

  await waitForRoster(page);
  assert.equal(await page.locator('.rail:visible').count(), 0, 'Phone layout must hide the desktop rail.');
  assert.equal(await page.locator('.mobile-nav:visible').count(), 1, 'Phone layout must expose the mobile navigation.');
  assert.equal(await page.locator('.spatial-mode-toggle:visible').count(), 0, 'Phone layout must not expose the desktop spatial-field toggle.');
  assert.equal(await page.locator('.agent-grid').evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length), 1, 'Phone agent registry should be a single readable column.');

  await page.locator('.house-chat-launch').click();
  const drawer = page.locator('.house-chat-drawer.is-open');
  await drawer.waitFor();
  await page.locator('[data-chat-agent]').selectOption('nikola');
  const drawerBox = await drawer.boundingBox();
  assert.ok(drawerBox && drawerBox.x >= 0 && drawerBox.x + drawerBox.width <= 390 && drawerBox.y + drawerBox.height <= 844, 'Phone chat drawer must fit inside the viewport.');
  await assertNoHorizontalOverflow(page, 'phone');

  await page.screenshot({ path: `${ARTIFACT_DIR}/phone.png`, fullPage: true });
  assertClean();
  activePage = null;
  await context.close();
}

async function runBoundedScenario(label, scenario, browser, timeoutMs = 60_000) {
  console.log(`[browser-acceptance] ${label} scenario start`);
  let timer;
  try {
    await Promise.race([
      scenario(browser),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`House Workspace ${label} scenario exceeded ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
    console.log(`[browser-acceptance] ${label} scenario complete`);
  } finally {
    clearTimeout(timer);
  }
}

let browser;
try {
  browser = await chromium.launch({ headless: true });
  console.log('[browser-acceptance] chromium launched with deterministic static routing');
  for (const [label, scenario] of [
    ['desktop', desktopScenario],
    ['ipad', ipadScenario],
    ['phone', phoneScenario],
  ]) {
    try {
      await runBoundedScenario(label, scenario, browser);
    } catch (error) {
      console.error(`House Workspace ${label} acceptance failed:`, error);
      if (activePage && !activePage.isClosed()) {
        await activePage.screenshot({ path: `${ARTIFACT_DIR}/${label}-failure.png`, fullPage: true }).catch(() => {});
      }
      throw error;
    }
  }
  console.log('House Workspace browser acceptance passed: desktop, iPad, and phone.');
} finally {
  await browser?.close().catch(() => {});
}
