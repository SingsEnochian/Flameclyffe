import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const html = read('apps/agent-workspace/index.html');
const nest = read('apps/agent-workspace/crow-nest.js');
const bootstrap = read('apps/agent-workspace/crow-nest-bootstrap.js');
const css = read('apps/agent-workspace/crow-nest.css');
const astra = read('apps/agent-workspace/astra-bridge.js');
const sw = read('apps/agent-workspace/sw.js');

test('Crow Nest browser modules parse before shipping', () => {
  assert.doesNotThrow(() => new Function(nest));
  assert.doesNotThrow(() => new Function(bootstrap));
  assert.doesNotThrow(() => new Function(astra));
});

test('Crow Nest mounts as a responsive glass AR cockpit', () => {
  assert.match(html, /\.\/crow-nest\.css/);
  assert.match(html, /\.\/astra-bridge\.js/);
  assert.match(html, /\.\/crow-nest-bootstrap\.js/);
  assert.match(html, /\.\/crow-nest\.js/);
  assert.match(css, /\.crow-nest-orbit/);
  assert.match(css, /\.crow-presence/);
  assert.match(css, /backdrop-filter/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /prefers-reduced-transparency/);
});

test('fresh Crow desks bind to the dedicated House runtime without equating route and identity', () => {
  assert.match(bootstrap, /crowRoute: 'crow'/);
  assert.match(bootstrap, /runtimeDefaultVersion/);
  assert.match(nest, /profile configured · runtime unbound/);
  assert.match(nest, /no live House runtime route is bound yet/);
  assert.match(nest, /cleanRoute/);
  assert.match(nest, /\/api\/v1\/flames\/\$\{routePath\(target\.route\)\}\/status/);
  assert.match(nest, /runtime route mismatch/);
});

test('Crow Nest uses sealed House sessions and does not persist credentials', () => {
  assert.match(nest, /\/api\/v1\/house\/session/);
  assert.match(nest, /credentials: 'same-origin'/);
  assert.match(nest, /sealed House session cookie/);
  assert.doesNotMatch(nest, /localStorage\.setItem\([^\n]*credential/i);
  assert.doesNotMatch(nest, /credential\s*:/i);
});

test('nestlings stay device-local until an explicit House route is bound', () => {
  assert.match(nest, /hearthweave\.crow-nest\/v0\.1/);
  assert.match(nest, /Nestlings are device-local role desks/);
  assert.match(nest, /Registering one here does not mutate canon/);
  assert.match(nest, /House route, if live/);
});

test('Astra bridge witnesses events without smuggling prompt text or authority', () => {
  assert.match(astra, /arcsweep:astra-slice-receipt/);
  assert.match(astra, /house:astra-witness-request/);
  assert.match(astra, /house:astra-bridge-state/);
  assert.match(astra, /capability = 'text-generation'/);
  assert.doesNotMatch(astra, /messageText|promptText|credential/);
  assert.match(nest, /HouseAstraBridge\?\.requestWitness/);
  assert.match(nest, /surface: 'ar'/);
});

test('Crow Nest shell is available offline with the workspace', () => {
  assert.match(sw, /house-workspace-os-v0\.2\.1/);
  assert.match(sw, /'\.\/crow-nest\.css'/);
  assert.match(sw, /'\.\/crow-nest-bootstrap\.js'/);
  assert.match(sw, /'\.\/crow-nest\.js'/);
  assert.match(sw, /'\.\/astra-bridge\.js'/);
});
