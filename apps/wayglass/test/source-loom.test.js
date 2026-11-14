import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { catalogue, compileSelection } = require('../../../lib/wayglass-source-loom.cjs');

test('Source Loom exposes a grounded reference inventory without reading external content', () => {
  const state = catalogue();
  assert.equal(state.schema, 'wayglass.source-loom/v0.1');
  assert.equal(state.content_fetched, false);
  assert.equal(state.training_performed, false);
  for (const id of ['observer', 'lanternbridge', 'terra-aeterna', 'moonmere', 'continuity', 'sound', 'sight', 'training', 'project-zero', 'richie', 'vethrlauf']) {
    assert.ok(state.sources.some((source) => source.id === id), id);
  }
  assert.equal(state.sources.find((source) => source.id === 'project-zero').selectable, false);
  assert.equal(state.sources.find((source) => source.id === 'richie').selectable, false);
  assert.equal(state.sources.find((source) => source.id === 'vethrlauf').selectable, false);
});

test('source selection is a per-turn explicit choice, never an implicit corpus import', () => {
  assert.throws(() => compileSelection({ source_ids: ['observer'] }), /consent/i);
  assert.throws(() => compileSelection({ source_ids: ['not-real'], consent: true }), /Unknown/);
  assert.throws(() => compileSelection({ source_ids: ['project-zero'], consent: true }), /connector or authority/i);
  assert.throws(() => compileSelection({ source_ids: ['richie'], consent: true }), /connector or authority/i);
  assert.throws(() => compileSelection({ source_ids: ['training'], consent: true }), /connector or authority/i);
});

test('approved references compile into inspectable pointers, not impersonation or weight training', () => {
  const compiled = compileSelection({ source_ids: ['observer', 'moonmere', 'observer'], consent: true });
  assert.deepEqual(compiled.receipt.selected_source_ids, ['observer', 'moonmere']);
  assert.match(compiled.reference_text, /OBSERVER_CHARTER/);
  assert.match(compiled.reference_text, /time-room-service/);
  assert.equal(compiled.receipt.model_weights_updated, false);
  assert.equal(compiled.receipt.content_fetched, false);
  assert.equal(compiled.receipt.external_calls_performed, false);
  assert.equal(compiled.receipt.canon_commit, false);
  assert.equal(compileSelection().reference_text, '');
});
