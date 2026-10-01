import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const html = read('apps/agent-workspace/index.html');
const css = read('apps/agent-workspace/styles.css');
const app = read('apps/agent-workspace/app.js');
const manifest = JSON.parse(read('apps/agent-workspace/manifest.webmanifest'));
const sw = read('apps/agent-workspace/sw.js');
const stage = read('apps/arcsweep/vercel-stage.cjs');
const pages = read('.github/workflows/pages.yml');

test('House Workspace is an installable mobile-first web surface', () => {
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.ok(manifest.icons.some((icon) => icon.src === './icon.svg'));
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /\.mobile-nav/);
});

test('workspace keeps living glass material depth instead of stacking blur', () => {
  assert.match(css, /\.glass \.glass \{ backdrop-filter: none/);
  assert.match(css, /prefers-reduced-transparency/);
  assert.match(css, /body\[data-theme="mossglass"\]/);
  assert.match(css, /body\[data-theme="lapis"\]/);
  assert.match(css, /body\[data-theme="hearthglass"\]/);
});

test('workspace carries explicit agent and handoff boundaries', () => {
  assert.match(app, /workspace ≠ cognition/);
  assert.match(app, /theme ≠ identity/);
  assert.match(app, /presence ≠ authority/);
  assert.match(app, /proposal ≠ decision/);
  assert.match(app, /Next owner/);
  assert.match(app, /Unacknowledged handoff/);
  assert.match(app, /crow-trainer/);
});

test('runtime presence probes existing same-origin House routes truthfully', () => {
  assert.match(app, /String\(agent\.route\)\.split\('\/'\)\.map\(\(segment\) => encodeURIComponent\(segment\)\)\.join\('\/'\)/);
  assert.match(app, /\/api\/v1\/flames\/\$\{routePath\}\/status/);
  assert.match(app, /route: 'starsong\/larkshine'/);
  assert.match(app, /route: 'starsong\/ellowind'/);
  assert.match(app, /credentials: 'same-origin'/);
  assert.match(app, /response\.status === 401 \? 'offline' : 'degraded'/);
  assert.match(app, /runtime route mismatch/);
});

test('workspace offline cache is shell-scoped', () => {
  assert.match(sw, /house-workspace-os-v0\.2\.1/);
  assert.match(sw, /url\.origin !== location\.origin/);
  assert.match(sw, /url\.pathname\.includes\('\/agents\/'\)/);
});

test('Vercel staging publishes House Workspace at /agents', () => {
  assert.match(stage, /agentWorkspaceSource/);
  assert.match(stage, /'agents'/);
  assert.match(stage, /House Workspace Vercel stage failed/);
});

test('GitHub Pages fallback publishes House Workspace at /Flameclyffe/agents', () => {
  assert.match(pages, /mkdir -p _site\/agents/);
  assert.match(pages, /cp -a apps\/agent-workspace\/\. _site\/agents\//);
  assert.match(pages, /House Workspace OS: \/Flameclyffe\/agents\//);
});


test('GitHub Pages workspace links cross into the published ArcSweep route', () => {
  assert.match(app, /href="\.\.\/apps\/arcsweep\/\?open=1"/);
  assert.doesNotMatch(app, /href="\.\.\/arcsweep\/\?open=1"/);
});