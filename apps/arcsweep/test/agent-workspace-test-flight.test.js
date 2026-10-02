import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const html = read('apps/agent-workspace/index.html');
const app = read('apps/agent-workspace/app.js');
const chat = read('apps/agent-workspace/chat.js');
const glass = read('apps/agent-workspace/refractive-glass-three.js');
const glassCss = read('apps/agent-workspace/refractive-glass-three.css');
const doctor = read('apps/agent-workspace/connection-doctor.js');
const doctorCss = read('apps/agent-workspace/connection-doctor.css');
const sw = read('apps/agent-workspace/sw.js');
const hermesDoctor = read('profiles/crow-trainer/scripts/connection_doctor.py');

test('test-flight surface mounts crew diagnostics and refractive optics', () => {
  assert.match(html, /\.\/connection-doctor\.css/);
  assert.match(html, /\.\/connection-doctor\.js/);
  assert.match(html, /\.\/refractive-glass-three\.css/);
  assert.match(html, /\.\/refractive-glass-three\.js/);
  assert.match(sw, /connection-doctor\.js/);
  assert.match(sw, /refractive-glass-three\.js/);
});

test('glass optics use real Three physical-material vocabulary without becoming a required runtime dependency', () => {
  assert.match(glass, /await import\('three'\)/);
  assert.match(glass, /MeshPhysicalMaterial/);
  assert.match(glass, /transmission:0\.92/);
  assert.match(glass, /thickness:spec\.thickness/);
  assert.match(glass, /ior:spec\.ior/);
  assert.match(glass, /document\.body\.dataset\.glassOptics='css'/);
  assert.doesNotMatch(glass, /TorusGeometry|RingGeometry/);
});

test('glass movement is pointer-coupled and keeps accessibility fallbacks', () => {
  assert.match(glass, /pointermove/);
  assert.match(glass, /--glass-rx/);
  assert.match(glass, /--glass-ry/);
  assert.match(glassCss, /backdrop-filter:blur/);
  assert.match(glassCss, /perspective\(1100px\)/);
  assert.match(glassCss, /prefers-reduced-motion:reduce/);
  assert.match(glassCss, /prefers-reduced-transparency:reduce/);
});

test('crew connection doctor keeps transport, House session, and participant runtimes distinct', () => {
  assert.match(doctor, /HouseChatConnection/);
  assert.match(doctor, /HouseWorkspaceRuntime/);
  assert.match(doctor, /House session/);
  assert.match(doctor, /Hermes \/ Crow Trainer/);
  assert.match(doctor, /configured/);
  assert.match(doctor, /blocked/);
  assert.match(doctor, /fault/);
  assert.doesNotMatch(doctor, /configured.*return 'live'/s);
  assert.match(doctorCss, /crew-link-row\[data-state="fault"\]/);
});

test('crew chat retries only the harmless House session check and refuses uncertain duplicate sends', () => {
  assert.match(chat, /attempt <= 2/);
  assert.match(chat, /Network restored · rechecking House door/);
  assert.match(chat, /message was not auto-retried/);
  assert.match(chat, /do not risk duplicating a turn/);
});

test('workspace exposes runtime diagnostics without merging connection state into identity', () => {
  assert.match(app, /HouseWorkspaceRuntime/);
  assert.match(app, /snapshot:/);
  assert.match(app, /\$\{agent\.name\} inference probe failed/);
  assert.match(app, /identity != provider\/model|theme ≠ identity/);
});

test('Hermes doctor is read-only, secret-avoiding, and checks current CLI diagnostics', () => {
  assert.match(hermesDoctor, /\[hermes, "--version"\]/);
  assert.match(hermesDoctor, /\[hermes, "tools", "--summary"\]/);
  assert.match(hermesDoctor, /\[hermes, "computer-use", "status"\]/);
  assert.match(hermesDoctor, /\[hermes, "computer-use", "doctor", "--json"\]/);
  assert.match(hermesDoctor, /logs.*agent\.log/s);
  assert.match(hermesDoctor, /Could not open a stream/);
  assert.doesNotMatch(hermesDoctor, /read_text\([^\n]*config\.yaml/);
  assert.doesNotMatch(hermesDoctor, /API_KEY|TOKEN|PASSWORD/);
});
