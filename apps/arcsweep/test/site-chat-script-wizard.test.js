import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sidecars = fs.readFileSync(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
const chat = fs.readFileSync(new URL('../src/site-chat-rail.js', import.meta.url), 'utf8');
const wizard = fs.readFileSync(new URL('../src/script-world-scenario-wizard.js', import.meta.url), 'utf8');

test('site-wide chat rail is mounted as a sidecar and lives outside the app root', () => {
  assert.match(sidecars, /\.\/site-chat-rail\.js/);
  assert.match(chat, /document\.body\.append\(host, launch\)/);
  assert.match(chat, /metadata: \{ surface: 'site-chat-rail', room, world_name: world \}/);
  assert.match(chat, /\.content\[data-houseglass-room\]/);
});

test('Scripts exposes LLM suggestions plus world and scenario wizard modes', () => {
  assert.match(sidecars, /\.\/script-world-scenario-wizard\.js/);
  assert.match(wizard, /data-script-assist="suggest"/);
  assert.match(wizard, /data-script-assist="world"/);
  assert.match(wizard, /data-script-assist="scenario"/);
  assert.match(wizard, /instrument: 'world-scenario-wizard'/);
});

test('wizard output remains staged until explicit append or replace action', () => {
  assert.match(wizard, /Nothing enters the script until you choose Append or Replace/);
  assert.match(wizard, /data-script-apply="append"/);
  assert.match(wizard, /data-script-apply="replace"/);
  assert.doesNotMatch(wizard, /textarea\.value = reply\.message/);
});
