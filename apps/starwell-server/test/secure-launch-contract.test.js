'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

test('npm core and ordinary launcher use server-secure rather than direct server.js', () => {
  const pkg = JSON.parse(read('package.json'));
  const launcher = read('launcher.js');
  assert.equal(pkg.scripts['start:core'], 'node server-secure.js');
  assert.match(launcher, /server-secure\.js/);
  assert.doesNotMatch(pkg.scripts.start, /server\.js/);
});

test('Electron desktop launches server-secure and exports dedicated runtime token', () => {
  const electron = read('electron/main.js');
  assert.match(electron, /server-secure\.js/);
  assert.match(electron, /ARCSWEEP_RUNTIME_TOKEN/);
  assert.match(electron, /keys\.runtime/);
});

test('secure wrapper shadows historical legacy chat before loading server monolith', () => {
  const secure = read('server-secure.js');
  const legacyRouteIndex = secure.indexOf("'/api/chat'");
  const serverRequireIndex = secure.indexOf("require('./server')");
  assert.ok(legacyRouteIndex >= 0);
  assert.ok(serverRequireIndex > legacyRouteIndex);
  assert.match(secure, /createLegacyMemberChatHandler/);
});

test('historical MEMBER_CONFIGS is not treated as the secure launch authority', () => {
  const secure = read('server-secure.js');
  assert.doesNotMatch(secure, /MEMBER_CONFIGS/);
  assert.match(secure, /authoritative Bifröst\/Flame router/);
});
