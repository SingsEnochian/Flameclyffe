import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/magic-book-three.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../src/main-bootstrap.js', import.meta.url), 'utf8');

test('Magic Book uses Three.js and emits durable receipt-shaped events', () => {
  assert.match(source, /from 'three'/);
  assert.match(source, /arcsweep\.magic-book-receipt\/1/);
  assert.match(source, /object_id: 'arcsweep:magic-book'/);
  assert.match(source, /localStorage\.setItem\(STORAGE_KEY/);
  assert.match(source, /pointerdown/);
  assert.match(source, /pointermove/);
  assert.match(source, /pointerup/);
});

test('Magic Book mounts only after normal core readiness', () => {
  assert.match(bootstrap, /import\('\.\/magic-book-three\.js'\)/);
  assert.match(bootstrap, /mountMagicBook/);
  assert.match(bootstrap, /if \(!safeBoot\)/);
});
