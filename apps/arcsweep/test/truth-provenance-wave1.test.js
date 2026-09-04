import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  HYDRATION_RECEIPT_SCHEMA,
  PROVENANCE_CLASSES,
  TEMPORAL_SCALES,
  buildHydrationReceipt,
  fieldCompletion,
  logarithmicTimePosition,
  worldCompletionReport,
} from '../src/truth-provenance.js';

test('truth provenance keeps observation, reconstruction, canon, hypothesis and model inference distinct', () => {
  for (const id of ['observation', 'scientific-consensus', 'scientific-reconstruction', 'project-record', 'world-canon', 'hypothesis', 'model-inference', 'unknown']) {
    assert.ok(PROVENANCE_CLASSES[id], `missing provenance class ${id}`);
  }
  assert.notEqual(PROVENANCE_CLASSES.observation.authority, PROVENANCE_CLASSES.hypothesis.authority);
  assert.notEqual(PROVENANCE_CLASSES['world-canon'].authority, PROVENANCE_CLASSES['scientific-consensus'].authority);
});

test('completion treats explicit unknown markers as evidence rather than completeness', () => {
  assert.equal(fieldCompletion('A specified value'), 'complete');
  assert.equal(fieldCompletion('Not yet specified for Luna. Preserve as unknown until canon supplies history.'), 'unknown');
  assert.equal(fieldCompletion('', { intentionalBlank: true }), 'intentionally-blank');
});

test('world completion reports field-level states and ratio', () => {
  const report = worldCompletionReport({ id: 'luna', name: 'Luna', description: 'Moon world', history: 'Not yet specified for Luna.', surface: { type: 'portal' } });
  assert.equal(report.worldId, 'luna');
  assert.ok(report.fields.some((field) => field.path === 'history' && field.state === 'unknown'));
  assert.ok(report.completionRatio > 0 && report.completionRatio < 1);
});

test('hydration receipt distinguishes added, changed, preserved and unknown without metadata churn', () => {
  const before = { id: 'terra', name: 'Terra Prime', description: '', history: 'kept', updatedAt: 'a', knowledgeAtlas: { revisedAt: 'old' } };
  const after = { id: 'terra', name: 'Terra Prime', description: 'Waking World', history: 'kept', updatedAt: 'b', knowledgeAtlas: { revisedAt: 'new' } };
  const receipt = buildHydrationReceipt(before, after, '2026-09-04T00:00:00Z');
  assert.equal(receipt.schema, HYDRATION_RECEIPT_SCHEMA);
  assert.ok(receipt.added.includes('description'));
  assert.ok(receipt.preserved.includes('history'));
  assert.equal(receipt.changed.includes('updatedAt'), false);
  assert.equal(receipt.changed.includes('knowledgeAtlas.revisedAt'), false);
});

test('temporal scale uses logarithmic placement across House to cosmic time', () => {
  assert.deepEqual(TEMPORAL_SCALES.map((scale) => scale.id), ['cosmic', 'planetary', 'geological', 'biological', 'human', 'house']);
  const ancient = logarithmicTimePosition(1e10);
  const recent = logarithmicTimePosition(100);
  assert.ok(ancient < recent);
  assert.equal(logarithmicTimePosition(0), 1);
});

test('World Registry lazy pack ships the visible truth inspector', async () => {
  const bootstrap = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const sidecar = await readFile(new URL('../src/terra-prime-truth-sidecar.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /terra-prime-truth-sidecar\.js/);
  assert.match(sidecar, /Completion & deep-time atlas/);
  assert.match(sidecar, /provenance visible/);
  assert.match(sidecar, /logarithmic time/);
});

test('Terra Prime core persists hydration receipts and completion reports', async () => {
  const core = await readFile(new URL('../src/terra-prime-core.js', import.meta.url), 'utf8');
  assert.match(core, /worldHydrationReceipts/);
  assert.match(core, /worldCompletionReports/);
  assert.match(core, /buildHydrationReceipt/);
  assert.match(core, /worldCompletionReport/);
});
