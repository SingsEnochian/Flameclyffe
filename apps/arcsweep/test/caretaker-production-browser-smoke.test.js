import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const endpoint = fs.readFileSync(path.join(root, 'api/v1/house/smoke.js'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/vercel-production-authenticated-smoke.yml'), 'utf8');
const browserSmoke = fs.readFileSync(path.join(root, 'scripts/arcsweep-caretaker-production-browser-smoke.mjs'), 'utf8');

test('trusted production smoke can expose Caretaker status without passing through Atlas', () => {
  assert.match(endpoint, /smokeTarget === 'caretaker'/);
  assert.match(endpoint, /houseFetch\('\/api\/v1\/house\/caretaker'\)/);
  assert.match(endpoint, /hearthgate\.caretaker-production-status\/v1/);
  assert.match(endpoint, /runtime_reachable: caretakerStatus\.runtime_reachable === true/);
  assert.match(endpoint, /model_available: caretakerStatus\.model_available === true/);
  assert.match(endpoint, /'set-cookie': sessionCookieHeader/);
  assert.match(endpoint, /production_write_scope: 'none'/);
});

test('Caretaker browser proof uses a real production DOM and exact user navigation request', () => {
  assert.match(browserSmoke, /Take me to Glyph Forge\./);
  assert.match(browserSmoke, /headless=new/);
  assert.match(browserSmoke, /remote-debugging-port/);
  assert.match(browserSmoke, /document\.querySelector\('\[data-caretaker-launch\]'\)/);
  assert.match(browserSmoke, /requestSubmit\(\)/);
  assert.match(browserSmoke, /button\[data-room="forge"\]\.active/);
  assert.match(browserSmoke, /arcsweep\.caretaker\.receipts\.v0\.1/);
  assert.match(browserSmoke, /receipt\?\.status === 'applied'/);
  assert.match(browserSmoke, /simulated_navigation: false/);
  assert.doesNotMatch(browserSmoke, /console\.log\([^\n]*cookie/i);
});

test('trusted workflow runs Caretaker browser proof independently of the legacy circulation job', () => {
  assert.match(workflow, /caretaker-production-browser-smoke:/);
  assert.match(workflow, /if: github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow, /node scripts\/arcsweep-caretaker-production-browser-smoke\.mjs/);
  assert.match(workflow, /Caretaker production browser smoke/);
});
