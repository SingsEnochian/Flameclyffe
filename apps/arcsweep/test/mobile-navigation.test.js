import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const bootstrap = readFileSync(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/mobile-navigation.css', import.meta.url), 'utf8');
const sidecar = readFileSync(new URL('../src/mobile-navigation-sidecar.js', import.meta.url), 'utf8');

test('iPhone navigation uses a dedicated fixed bar plus room sheet', () => {
  assert.match(index, /viewport-fit=cover/);
  assert.match(index, /mobile-navigation\.css/);
  assert.match(bootstrap, /mobile-navigation-sidecar\.js/);
  assert.match(css, /grid-template-columns:\s*repeat\(5,/);
  assert.match(css, /\.sidebar\s*\{\s*display:\s*none\s*!important;/);
  assert.match(css, /\.mobile-room-sheet/);
  assert.doesNotMatch(css, /overflow-x:\s*auto/);
});

test('mobile bar keeps four stable rooms and exposes every desktop room through More', () => {
  for (const room of ['portal', 'worlds', 'commons', 'deep-observer']) {
    assert.match(sidecar, new RegExp(`id: '${room}'`));
  }
  assert.match(sidecar, /data-mobile-more/);
  assert.match(sidecar, /desktopRoomButtons\(\)\.map\(roomDescriptor\)/);
  assert.match(css, /min-height:\s*4\.65rem/);
});

test('mobile navigation never mounts over bootstrap or recovery screens', () => {
  assert.match(sidecar, /app\?\.querySelector\('\.app-shell'\)/);
  assert.match(sidecar, /if \(!media\.matches \|\| !applicationReady\)/);
  assert.match(sidecar, /clearShell\(shell\)/);
});
