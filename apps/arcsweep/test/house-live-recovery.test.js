import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const recovery = fs.readFileSync(new URL('../src/house-live-recovery.js', import.meta.url), 'utf8');
const surface = fs.readFileSync(new URL('../src/house-chat-authoritative-surface.js', import.meta.url), 'utf8');

test('House live recovery diagnoses auth, Commons transport, and Ox Alpha from the Commons surface', () => {
  assert.match(recovery, /arcsweep\.house-live-recovery\/v1/);
  assert.match(recovery, /requestKelyranMagicLink/);
  assert.match(recovery, /restoreHouseRuntimeSession/);
  assert.match(recovery, /readHouseCommons/);
  assert.match(recovery, /\/api\/v1\/flames\/oxalpha\/status/);
  assert.match(recovery, /House LIVE · Ox Alpha reachable/);
  assert.match(recovery, /GitHub Pages → Supabase Edge/);
});

test('static Pages does not pretend to seal a server cookie and can recover in-place', () => {
  assert.match(recovery, /there is no server cookie to seal on this static host/);
  assert.match(recovery, /onAuthStateChange/);
  assert.match(recovery, /Send sign-in link/);
});

test('native House surface mounts the live recovery dependency', () => {
  assert.match(surface, /import '\.\/house-live-recovery\.js'/);
});
