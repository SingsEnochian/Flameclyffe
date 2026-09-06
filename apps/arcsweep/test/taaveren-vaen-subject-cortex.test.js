import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { resolveKnowledgeCells, validateKnowledgeCell } from '../src/knowledge-graph.js';

async function json(relative) {
  return JSON.parse(await readFile(new URL(relative, import.meta.url), 'utf8'));
}

test('Subject Cortex registers character, narrator, and writing-style subjects', async () => {
  const manifest = await json('../skills/subject-banks.json');
  assert.equal(manifest.subjects['character:kestrelle'].label, 'Kestrelle al’Var');
  assert.equal(manifest.subjects['narrative_voice:taaveren-vaen-narrator'].status, 'provisional-derived-cortex');
  assert.equal(manifest.subjects['writing_style:taaveren-vaen-longform'].status, 'provisional-derived-cortex');
  assert.equal(manifest.rules.currentCanonOverlaySupersedesHistoricalBundleClaims, true);
});

test('Kestrelle cortex resolves current canon and quarantines superseded names and eras', async () => {
  const bank = await json('../skills/cells/characters/kestrelle.cells.json');
  for (const cell of bank.cells) assert.deepEqual(validateKnowledgeCell(cell), [], cell.id);

  const current = resolveKnowledgeCells(bank.cells, {
    subject: { kind: 'character', id: 'kestrelle' },
    worldId: 'taaveren-vaen',
    storyOrder: 0,
    includeHistorical: true,
  });
  const values = current.map((cell) => cell.value);
  assert.ok(values.includes('Kestrelle al’Var'));
  assert.ok(values.some((value) => typeof value === 'string' && value.includes('Age of Restoration')));
  assert.ok(values.some((value) => typeof value === 'string' && value.includes('White Tower')));
  assert.ok(values.includes('saidin remains clean'));
  assert.equal(values.includes('Kestrelle al’Valari'), false);
  assert.equal(values.includes('Fourth Age'), false);
  assert.equal(values.includes('Mending'), false);
});

test('Ta’veren Vaen narrator and longform banks remain explicitly derived rather than silently canon', async () => {
  const narrator = await json('../skills/cells/narrative-voices/taaveren-vaen-narrator.cells.json');
  const style = await json('../skills/cells/writing-styles/taaveren-vaen-longform.cells.json');
  assert.equal(narrator.status, 'provisional-derived');
  assert.equal(style.status, 'provisional-derived');
  assert.ok(narrator.cells.length > 5);
  assert.ok(style.cells.length > 5);
  assert.ok(narrator.cells.every((cell) => validateKnowledgeCell(cell).length === 0));
  assert.ok(style.cells.every((cell) => validateKnowledgeCell(cell).length === 0));
});
