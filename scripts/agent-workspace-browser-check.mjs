import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 4170;
const BASE = `http://127.0.0.1:${PORT}/apps/agent-workspace/`;
const ARTIFACT_DIR = process.env.WORKSPACE_BROWSER_ARTIFACT_DIR || 'artifacts/agent-workspace-browser';

await mkdir(ARTIFACT_DIR, { recursive: true });

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', '.'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOutput = '';
server.stdout.on('data', (chunk) => { serverOutput += chunk; });
server.stderr.on('data', (chunk) => { serverOutput += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE, { cache: 'no-store' });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  throw new Error(`Workspace static server did not start.\n${serverOutput}`);
}

function routeId(url) {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  const flame = parts.indexOf('flames');
  if (flame >= 0) return parts[flame + 1] === 'starsong' ? parts[flame + 2] : parts[flame + 1];
  const constellation = parts.indexOf('constellation');
  if (constellation >= 0) return parts[constellation + 1];
  return null;
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
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (!url.includes('/favicon.ico')) errors.push(`requestfailed: ${url} :: ${request.failure()?.errorText || 'unknown'}`);
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
  await page.goto(`${BASE}?view=agents`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await page.locator('.workspace-shell').waitFor();
  await page.locator('[data-agent-id="nikola"]').waitFor();
  assert.equal(await page.locator('.agent-card').count(), 16, 'Expected the 12 House voices plus Crow, Nikola, Rarity, and Crow Trainer.');

  await page.locator('[data-refresh-roster]').first().click();
  await page.locator('[data-agent-id="nikola"] .badge.state').filter({ hasText: 'live' }).waitFor();
  await page.locator('[data-agent-id="oxalpha"] .badge.state').filter({ hasText: 'live' }).waitFor();
  assert.equal(await page.locator('.badge.state').filter({ hasText: /^degraded$/i }).count(), 0, 'No healthy fixture should be painted as degraded.');
}

async function desktopScenario(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
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
  await context.close();
}

async function ipadScenario(browser) {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 1,
    hasTouch: true,
  });
  const page = await context.newPage();
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
  await context.close();
}

async function phoneScenario(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
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
  await context.close();
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  for (const [label, scenario] of [
    ['desktop', desktopScenario],
    ['ipad', ipadScenario],
    ['phone', phoneScenario],
  ]) {
    try {
      await scenario(browser);
    } catch (error) {
      console.error(`House Workspace ${label} acceptance failed:`, error);
      throw error;
    }
  }
  console.log('House Workspace browser acceptance passed: desktop, iPad, and phone.');
} finally {
  await browser?.close().catch(() => {});
  server.kill('SIGTERM');
}
