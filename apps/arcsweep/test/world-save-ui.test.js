import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

test('World Registry uses an explicit save action that survives Houseglass re-render boundaries', () => {
  assert.match(source, /type="button" data-action="save-world">Save world</);
  assert.match(source, /if \(action === 'save-world'\) \{\s*saveWorldRegistry\(button\.closest\('#world-registry-form'\)\);/s);
});

test('mouse and keyboard World saves share the same persistence function', () => {
  assert.match(source, /function saveWorldRegistry\(form\)/);
  assert.match(source, /persist\('World portal saved\.', 'world-registry'\)/);
  assert.match(source, /if \(form\.id === 'world-registry-form'\) saveWorldRegistry\(form\);/);
});
