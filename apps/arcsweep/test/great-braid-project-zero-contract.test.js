import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (relative) => readFile(new URL(relative, import.meta.url), 'utf8');

test('Project Zero mounts the Great Braid receipt rail and shares its storage key', async () => {
  const [index, rail, braid] = await Promise.all([
    read('../../project-zero-companion/index.html'),
    read('../../project-zero-companion/src/greatBraidRail.js'),
    read('../src/great-braid.js'),
  ]);
  assert.match(index, /greatBraidRail\.js/);
  assert.match(rail, /flameclyffe\.project-zero-companion\.event-rail\/v1/);
  assert.match(braid, /flameclyffe\.project-zero-companion\.event-rail\/v1/);
  assert.match(rail, /arcsweep\.great-braid\.receipted/);
});

test('Project Zero registry names the Great Braid and uses canonical Arcsweep routes', async () => {
  const registry = await read('../../project-zero-companion/src/pluginRegistry.js');
  assert.match(registry, /great-braid-receipt-rail/);
  assert.match(registry, /arcsweep\.great-braid\.receipted/);
  assert.match(registry, /href: '\/arcsweep\/'/);
  assert.doesNotMatch(registry, /href: '\/apps\/arcsweep/);
});

test('Great Braid Project Zero event and Commons entry are both derived from the same receipt', async () => {
  const braid = await read('../src/great-braid.js');
  assert.match(braid, /greatBraidProjectZeroEvent\(receipt\)/);
  assert.match(braid, /greatBraidCommonsEntry\(receipt\)/);
  assert.match(braid, /great_braid_receipt_id: receipt\.receipt_id/);
  assert.match(braid, /great_braid: \{/);
});
