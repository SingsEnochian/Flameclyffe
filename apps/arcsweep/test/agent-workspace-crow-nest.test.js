import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const html = read('apps/agent-workspace/index.html');
const brain = read('apps/agent-workspace/brain-core.js');
const brainTypes = read('apps/agent-workspace/brain-core.ts');
const host = read('apps/agent-workspace/host-bridge.js');
const neural = read('apps/agent-workspace/neural-bridge.js');
const nest = read('apps/agent-workspace/crow-nest.js');
const bootstrap = read('apps/agent-workspace/crow-nest-bootstrap.js');
const css = read('apps/agent-workspace/crow-nest.css');
const motion = read('apps/agent-workspace/crow-nest-motion.css');
const astra = read('apps/agent-workspace/astra-bridge.js');
const sw = read('apps/agent-workspace/sw.js');
const tauriConfig = read('apps/agent-workspace-tauri/src-tauri/tauri.conf.json');
const tauriLib = read('apps/agent-workspace-tauri/src-tauri/src/lib.rs');

test('Crow Nest browser modules parse before shipping', () => {
  assert.doesNotThrow(() => new Function(brain));
  assert.doesNotThrow(() => new Function(host));
  assert.doesNotThrow(() => new Function(neural));
  assert.doesNotThrow(() => new Function(nest));
  assert.doesNotThrow(() => new Function(bootstrap));
  assert.doesNotThrow(() => new Function(astra));
});

test('typed House brain separates lanes, nodes, signals, and epistemic class', () => {
  assert.match(brainTypes, /HouseBrainLane/);
  assert.match(brainTypes, /HouseBrainEpistemicClass/);
  assert.match(brainTypes, /HouseBrainSignal/);
  assert.match(brainTypes, /HouseBrainSnapshot/);
  assert.match(brain, /house\.brain-signal\/v0\.1/);
  assert.match(brain, /house:brain-signal/);
  assert.match(brain, /setNode/);
  assert.match(html, /\.\/brain-core\.js/);
  assert.ok(html.indexOf('./brain-core.js') < html.indexOf('./astra-bridge.js'));
});

test('Crow Nest mounts as a responsive glass AR cockpit', () => {
  assert.match(html, /\.\/crow-nest\.css/);
  assert.match(html, /\.\/crow-nest-motion\.css/);
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

test('Crow Nest spatial motion preserves centered transforms and reduced-motion fallbacks', () => {
  assert.match(motion, /@keyframes nest-orbit-centered/);
  assert.match(motion, /translate\(-50%,-50%\) rotate\(360deg\)/);
  assert.match(motion, /crow-presence-breathe/);
  assert.match(motion, /prefers-reduced-motion/);
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

test('Astra bridge witnesses events through the House brain without smuggling prompt text or authority', () => {
  assert.match(astra, /arcsweep:astra-slice-receipt/);
  assert.match(astra, /house:astra-witness-request/);
  assert.match(astra, /house:astra-bridge-state/);
  assert.match(astra, /lane: 'astra'/);
  assert.match(astra, /witness-receipt/);
  assert.match(astra, /capability = 'text-generation'/);
  assert.doesNotMatch(astra, /messageText|promptText|credential/);
  assert.match(nest, /HouseAstraBridge\?\.requestWitness/);
  assert.match(nest, /surface: 'ar'/);
});

test('neural bridge connects Nest interaction, session state, Astra, and sensory feedback', () => {
  assert.match(html, /\.\/neural-bridge\.js/);
  assert.match(neural, /HouseCrowNest/);
  assert.match(neural, /text-intent/);
  assert.match(neural, /house:astra-bridge-state/);
  assert.match(neural, /house:sensory-feedback/);
});

test('Tauri host remains a bounded surface rather than arbitrary shell authority', () => {
  const config = JSON.parse(tauriConfig);
  assert.equal(config.app.withGlobalTauri, true);
  assert.match(host, /host_capabilities/);
  assert.match(tauriLib, /arbitrary_shell: false/);
  assert.doesNotMatch(tauriLib, /Command::new|std::process::Command/);
});

test('Crow Nest shell is available offline with the workspace brain and bridges', () => {
  assert.match(sw, /house-workspace-os-v0\.3\.0/);
  for (const file of [
    'brain-core.js', 'host-bridge.js', 'crow-nest.css', 'crow-nest-motion.css',
    'crow-nest-bootstrap.js', 'crow-nest.js', 'sensory-feedback.js', 'astra-bridge.js', 'neural-bridge.js',
  ]) {
    assert.match(sw, new RegExp(`'\\./${file.replace('.', '\\.')}'`));
  }
});
