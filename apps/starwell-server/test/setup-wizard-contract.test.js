'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const wizard = fs.readFileSync(path.join(root, 'public', 'setup-wizard.html'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'electron', 'preload.js'), 'utf8');
const electronMain = fs.readFileSync(path.join(root, 'electron', 'main.js'), 'utf8');

test('wizard exposes a first-class House runtime token and Bifrost vessel framing', () => {
  assert.match(wizard, /id="key-runtime"/);
  assert.match(wizard, /House runtime token/);
  assert.match(wizard, /Bifröst owns the model-vessel map/);
  assert.match(wizard, /Generate/);
});

test('wizard no longer claims cloud provider keys select named Constellation vessels', () => {
  assert.doesNotMatch(wizard, /Powers Boxfire \/ Uial/i);
  assert.doesNotMatch(wizard, /Powers Lioreal/i);
  assert.match(wizard, /It does not select Lioreal's vessel/);
});

test('plain-browser setup path does not log secret configuration objects', () => {
  assert.doesNotMatch(wizard, /console\.log\(cfg\)/);
  assert.match(wizard, /Secret values were not logged/);
});

test('preload hydrates only redacted config and uses a preserve marker for configured secrets', () => {
  assert.match(preload, /ipcRenderer\.invoke\('get-config'\)/);
  assert.match(preload, /__HEARTHGATE_KEEP_EXISTING_SECRET__/);
  assert.match(preload, /configured · leave blank to keep/);
  assert.doesNotMatch(preload, /safeStorage/);
});

test('Electron exports the securely stored runtime token only to the local core server', () => {
  assert.match(electronMain, /if \(keys\.runtime\) env\.ARCSWEEP_RUNTIME_TOKEN = keys\.runtime/);
  assert.match(electronMain, /redactHearthgateConfig\(loadConfig\(\)\)/);
  assert.match(electronMain, /House runtime token is required/);
});
