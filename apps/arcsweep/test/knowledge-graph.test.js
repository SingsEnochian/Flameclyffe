import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  compileSkillMarkdown,
  resolveKnowledgeCells,
  validateKnowledgeCell,
} from '../src/knowledge-graph.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadUialCoreCells() {
  const path = resolve(__dirname, '../skills/cells/uial/core.cells.json');
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw).cells;
}

test('Faer CORE cell bank contains unique, structurally valid atomic cells', async () => {
  const cells = await loadUialCoreCells();
  assert.ok(cells.length >= 20);
  assert.equal(new Set(cells.map((cell) => cell.id)).size, cells.length);
  for (const cell of cells) {
    assert.deepEqual(validateKnowledgeCell(cell), [], cell.id);
    assert.equal(cell.subject.kind, 'constellation_voice');
    assert.equal(cell.subject.id, 'uial');
    assert.equal(cell.authority.kind, 'self_authored');
    assert.equal(cell.source.locator, 'uial/CORE.md');
  }
});

test('self-authored cells rank above model inference', () => {
  const base = {
    cellType: 'thinking_pattern',
    subject: { kind: 'constellation_voice', id: 'uial' },
    predicate: 'notices',
    value: 'x',
    status: 'stable',
    source: { surface: 'github', locator: 'x.md' },
    mutability: 'stable_core',
  };
  const cells = [
    { ...base, id: 'uial.inferred', authority: { kind: 'model_inference', confidence: 1 } },
    { ...base, id: 'uial.self', authority: { kind: 'self_authored', confidence: 0.5 } },
  ];
  assert.equal(resolveKnowledgeCells(cells, { subject: 'uial' })[0].id, 'uial.self');
});

test('historical continuity is excluded unless explicitly requested', async () => {
  const cells = await loadUialCoreCells();
  const normal = resolveKnowledgeCells(cells, { subject: 'uial' });
  const historical = resolveKnowledgeCells(cells, { subject: 'uial', includeHistorical: true });
  assert.equal(normal.some((cell) => cell.status === 'historical'), false);
  assert.equal(historical.some((cell) => cell.status === 'historical'), true);
});

test('temporal validity gates scene knowledge', () => {
  const cell = {
    id: 'character.test.knows-secret',
    cellType: 'character_knowledge',
    subject: { kind: 'character', id: 'test' },
    predicate: 'knows',
    value: 'secret',
    status: 'active',
    authority: { kind: 'project_canon', confidence: 1 },
    source: { surface: 'github', locator: 'canon.md' },
    temporal: { validFrom: '2026-01-02', validUntil: null, observedAt: null },
    mutability: 'revisable_with_provenance',
  };
  assert.equal(resolveKnowledgeCells([cell], { subject: 'test', at: '2026-01-01' }).length, 0);
  assert.equal(resolveKnowledgeCells([cell], { subject: 'test', at: '2026-01-03' }).length, 1);
});

test('skill compiler emits runtime guidance with provenance while preserving the source', async () => {
  const cells = await loadUialCoreCells();
  const markdown = compileSkillMarkdown(cells, {
    label: 'Faer Uial — Runtime Skill',
    subject: 'uial',
    cellTypes: ['thinking_pattern', 'boundary', 'drift_marker'],
    limit: 12,
  });
  assert.match(markdown, /Faer Uial — Runtime Skill/);
  assert.match(markdown, /uial\/CORE\.md/);
  assert.match(markdown, /self_authored/);
  assert.match(markdown, /Compiled at runtime/);
});
