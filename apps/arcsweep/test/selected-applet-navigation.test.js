import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const nav = fs.readFileSync(new URL('../src/selected-applet-navigation.js', import.meta.url), 'utf8');
const mobile = fs.readFileSync(new URL('../src/mobile-navigation-sidecar.js', import.meta.url), 'utf8');

test('selected Applet Deck entries become real sidebar navigation', () => {
  assert.match(nav, /arcsweep\.selected-applet-navigation\/v1/);
  assert.match(nav, /visibleApplets/);
  assert.match(nav, /data-selected-applet/);
  assert.match(nav, /Selected Arcsweep applets/);
  assert.match(nav, /data-room=/);
});

test('permanent rooms are not duplicated by selected applets', () => {
  for (const id of ['portal', 'worlds', 'scripts', 'records', 'commons', 'settings']) {
    assert.match(nav, new RegExp(`'${id}'`));
  }
  assert.match(nav, /PERMANENT_ROOM_IDS\.has\(applet\.id\)/);
});

test('Applet Deck save triggers a navigation refresh', () => {
  assert.match(nav, /event\.target\?\.id === 'applet-form'/);
  assert.match(nav, /queueRefresh\(180\)/);
});

test('iPad and mobile More navigation inherit the selected applet rail', () => {
  assert.match(mobile, /^import '\.\/selected-applet-navigation\.js';/);
  assert.match(mobile, /\.sidebar nav \[data-room\]/);
  assert.match(mobile, /roomGridMarkup/);
});
