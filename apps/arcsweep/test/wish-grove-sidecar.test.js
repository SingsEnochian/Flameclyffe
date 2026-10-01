import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { MAGIC_BOOK_PAGES } from '../src/magic-book-model.js';

test('Wish Grove is a first-class Universal Codex possibility page', () => {
  const page = MAGIC_BOOK_PAGES.find((item) => item.id === 'wish-grove');
  assert.ok(page);
  assert.equal(page.label, 'Wish Grove');
  assert.equal(page.kind, 'possibility');
});

test('browser runtime mounts Wish Grove without making Node import CSS', async () => {
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /typeof document !== 'undefined'/);
  assert.match(bootstrap, /import\('\.\/wish-grove-sidecar\.js'\)/);
});

test('Wish Grove uses the canonical persistent Codex wish store', async () => {
  const source = await readFile(new URL('../src/wish-grove-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /getCodexWishStore/);
  assert.match(source, /CODEX_WISH_STORE_EVENT/);
  assert.match(source, /MAGIC_BOOK_BINDING_KEY/);
  assert.match(source, /active_page_id === PAGE_ID/);
});

test('Wish Grove exposes create, branch, revise and open-question return operations', async () => {
  const source = await readFile(new URL('../src/wish-grove-sidecar.js', import.meta.url), 'utf8');
  for (const operation of [
    'createWish',
    'branchWish',
    'reviseWish',
    'createQuestion',
    'revisitQuestion',
    'resolveQuestion',
    'reopenQuestion',
  ]) {
    assert.match(source, new RegExp(operation));
  }
  assert.match(source, /The original question remains in the Codex/);
  assert.match(source, /Question reopened\. Wonder gets another turn\./);
});

test('Wish Grove UI keeps lineaged possibility separate from external execution', async () => {
  const source = await readFile(new URL('../src/wish-grove-sidecar.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /__arcsweepOS\?\.navigate/);
  assert.doesNotMatch(source, /window\.open/);
  assert.match(source, /surface:\/\/universal-codex\/wish-grove/);
});
