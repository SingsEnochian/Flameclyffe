import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = new URL('../skills/sources/kala-fierro/kala-fierro-reference-ingest.v0.1.json', import.meta.url);
const ingest = JSON.parse(fs.readFileSync(path, 'utf8'));

test('Kala Fierro ingest remains reference-only', () => {
  assert.equal(ingest.canon_status, 'reference-only');
  assert.match(ingest.adoption_policy, /story-lore-does-not-auto-promote/);
});

test('Kala Fierro ingest extracts Universal Codex mechanisms without importing setting lore', () => {
  const ids = new Set(ingest.observed_mechanisms.map((item) => item.id));
  for (const id of [
    'device-form-state-machine',
    'spoken-imperative-command-grammar',
    'materialisation-choreography',
    'failure-is-visible-state',
    'action-receipt-motif',
  ]) assert.equal(ids.has(id), true, `missing mechanism ${id}`);

  assert.ok(ingest.scope.not_auto_imported.includes('TSAB'));
  assert.ok(ingest.scope.not_auto_imported.includes('Lost Logia'));
});

test('animation grammar requires truthful state and inspectable receipts', () => {
  const principles = ingest.universal_codex_animation_grammar.principles;
  assert.ok(principles.includes('animation follows real state'));
  assert.ok(principles.includes('failed transitions remain visibly failed'));
  assert.ok(principles.includes('receipts remain inspectable'));
  assert.equal(ingest.universal_codex_animation_grammar.sequence.at(-2), 'receipt');
});
