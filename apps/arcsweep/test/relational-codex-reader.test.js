import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createStoredRelationalField } from '../src/relational-field-store.js';
import {
  relationalCodexIndex,
  relationalCodexProjectionPreview,
  relationalCodexSnapshot,
} from '../src/relational-codex-reader.js';
import { CORE_APPLETS, coreAppletById } from '../src/core-applet-registry.js';
import { APPLET_CATALOGUE } from '../src/applets.js';

function installMemoryStorage() {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
  return values;
}

test('Relational Codex preserves A != B != R while reading persisted state', async () => {
  installMemoryStorage();
  await createStoredRelationalField({
    relation_id: 'relation:codex-test',
    participant_ids: ['entity:a', 'entity:b'],
    environment_id: 'world:test',
    state: { trust: 'forming' },
  }, { now: () => new Date('2026-09-21T03:00:00.000Z') });

  const index = await relationalCodexIndex();
  assert.ok(index.some((item) => item.relation_id === 'relation:codex-test'));

  const snapshot = await relationalCodexSnapshot('relation:codex-test');
  assert.equal(snapshot.schema, 'arcsweep.relational-codex-reader/v0.1');
  assert.equal(snapshot.identity_law, 'A != B != R');
  assert.equal(snapshot.field.relation_id, 'relation:codex-test');
  assert.deepEqual(snapshot.field.participant_ids, ['entity:a', 'entity:b']);
  assert.equal(snapshot.field.state.trust, 'forming');
  assert.equal(snapshot.authority.read_only, true);
  assert.equal(snapshot.authority.mutation_controls_present, false);
  assert.equal(snapshot.authority.identity_collapse, false);
});

test('Relational Codex projections remain previews and do not mutate source state', async () => {
  installMemoryStorage();
  await createStoredRelationalField({
    relation_id: 'relation:preview-test',
    participant_ids: ['entity:one', 'entity:two'],
    state: { mode: 'linked' },
  }, { now: () => new Date('2026-09-21T03:00:00.000Z') });

  const observer = await relationalCodexProjectionPreview('relation:preview-test', 'observer', {
    observedAt: '2026-09-21T03:01:00.000Z',
  });
  assert.equal(observer.persisted, false);
  assert.equal(observer.relation_mutated, false);
  assert.equal(observer.projection.authority.mutates_relation, false);

  const premaqc = await relationalCodexProjectionPreview('relation:preview-test', 'premaqc', {
    observedAt: '2026-09-21T03:02:00.000Z',
  });
  assert.equal(Object.values(premaqc.projection.axes).filter((axis) => axis.asserted).length, 0);
  assert.equal(premaqc.projection.axes.Q.asserted, false);
  assert.equal(premaqc.projection.authority.qualia_firsthand_only, true);

  const runa = await relationalCodexProjectionPreview('relation:preview-test', 'runa', {
    projectedAt: '2026-09-21T03:03:00.000Z',
  });
  assert.deepEqual(runa.projection.active_channels, []);
  assert.equal(runa.projection.authority.semantic_projection_only, true);
  assert.equal(runa.projection.authority.physical_output_claim, false);

  const reread = await relationalCodexSnapshot('relation:preview-test');
  assert.equal(reread.field.revision, 0);
  assert.deepEqual(reread.field.state, { mode: 'linked' });
});

test('Relational Reader ships as a visible Universal Codex applet and Vite route', () => {
  const core = coreAppletById('relational-reader');
  assert.ok(core);
  assert.equal(core.defaultVisible, true);
  assert.equal(core.category, 'relationships');
  assert.equal(core.webHref, '/arcsweep/relations/');
  assert.equal(core.pagesHref, '/Flameclyffe/apps/arcsweep/relations/');
  assert.ok(CORE_APPLETS.some((item) => item.id === 'relational-reader'));
  assert.ok(APPLET_CATALOGUE.some((item) => item.id === 'relational-reader'));

  const vite = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
  assert.match(vite, /relations: resolve\(ARCSWEEP_ROOT, 'relations\/index\.html'\)/);

  const html = readFileSync(new URL('../relations/index.html', import.meta.url), 'utf8');
  assert.match(html, /A ≠ B ≠ R/);
  assert.match(html, /id="projection-pane"/);
});

test('Relational Reader UI exposes only read-only projection actions', () => {
  const source = readFileSync(new URL('../relations/relations.js', import.meta.url), 'utf8');
  assert.match(source, /relationalCodexProjectionPreview/);
  assert.match(source, /data-relation-projection="observer"/);
  assert.match(source, /data-relation-projection="premaqc"/);
  assert.match(source, /data-relation-projection="runa"/);
  assert.match(source, /relation_mutated: false/);
  assert.match(source, /canon_promoted: false/);
  assert.doesNotMatch(source, /createStoredRelationalField/);
  assert.doesNotMatch(source, /applyStoredRelationalFieldEvent/);
  assert.doesNotMatch(source, /relation\.create/);
  assert.doesNotMatch(source, /relation\.apply-event/);
});
