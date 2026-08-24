import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/active-input-continuity.js', import.meta.url), 'utf8');
const sidecars = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');

test('active input continuity is mounted before heavy runtime sidecars', () => {
  assert.match(sidecars, /'\.\/active-input-continuity\.js'/);
  assert.ok(sidecars.indexOf('./active-input-continuity.js') < sidecars.indexOf('./runtime-integration-bootstrap.js'));
});

test('continuity guard preserves focused editor value, selection and focus across #app remounts', () => {
  assert.match(source, /const APP_SELECTOR = '#app'/);
  assert.match(source, /selectionStart/);
  assert.match(source, /selectionEnd/);
  assert.match(source, /setSelectionRange/);
  assert.match(source, /focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /node\.value !== snapshot\.value/);
});
