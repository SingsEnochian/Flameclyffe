import assert from 'node:assert/strict';
import test from 'node:test';

import { createRunaPreviewPaletteReceipt } from '../src/runa-preview-palette.js';
import { createRunaPreviewPlan } from '../src/runa-preview-render.js';
import { buildExtendedArcsweepProvenanceGraph } from '../src/receipt-provenance-extension.js';
import { verifyProvenanceGraph } from '../src/receipt-integrity.js';

const WORLD = { id: 'terra-aeterna', name: 'Terra Aeterna', soundscape: { rootHz: 220, waveform: 'triangle' } };

function approvedReview() {
  return {
    schema: 'arcsweep.runa-renderer-review/v1',
    schema_version: 1,
    review_id: 'renderer-review-palette',
    review_fingerprint: 'a'.repeat(64),
    reviewed_at: '2026-08-14T16:00:00.000Z',
    reviewed_by: 'Rowan',
    decision: 'approved',
    source: { candidate_id: 'candidate-palette', candidate_fingerprint: 'b'.repeat(64), suggestion_id: 'suggestion-palette', world_id: WORLD.id },
    reviewed_candidate: {
      compiler: {
        parameters: {
          world_hum: { transition_ms: 7000, detune_limit_cents: 18, mix_delta_limit: .18 },
          keyboard_harmonics: { transition_ms: 4900, harmonic_blend_delta_limit: .2, velocity_mix_delta_limit: .12 },
          environmental_soundscape: { transition_ms: 8050, layer_mix_delta_limit: .16, filter_motion_octaves_limit: .3 },
        },
      },
    },
    authority: { preview_compilation_allowed: true, render_authorized: false },
  };
}

test('preview palette is an explicit receipt and assigns no persistent soundscape state', async () => {
  const palette = await createRunaPreviewPaletteReceipt({
    rendererReview: approvedReview(),
    selectedBy: 'Rowan',
    harmonicSet: 'root-fifth-octave',
    environmentSource: 'filtered-noise',
    selectedAt: '2026-08-14T16:01:00.000Z',
  });
  assert.equal(palette.schema, 'arcsweep.runa-preview-palette/v1');
  assert.deepEqual(palette.selection.harmonic_ratios, [1, 1.5, 2]);
  assert.equal(palette.authority.explicit_human_selection, true);
  assert.equal(palette.authority.assignments_are_preview_only, true);
  assert.equal(palette.authority.persistent_world_soundscape_mutable, false);
  assert.equal(palette.palette_fingerprint.length, 64);
});

test('selected harmonics and environment compile inside reviewed bounds', async () => {
  const review = approvedReview();
  const palette = await createRunaPreviewPaletteReceipt({ rendererReview: review, selectedBy: 'Rowan', harmonicSet: 'root-third-fifth', environmentSource: 'filtered-noise' });
  const plan = await createRunaPreviewPlan({ rendererReview: review, world: WORLD, paletteReceipt: palette, generatedAt: '2026-08-14T16:02:00.000Z' });
  assert.equal(plan.source.palette_id, palette.palette_id);
  assert.equal(plan.preview.keyboard_harmonics.assigned, true);
  assert.deepEqual(plan.preview.keyboard_harmonics.ratios, [1, 1.25, 1.5]);
  assert.equal(plan.preview.environmental_soundscape.assigned, true);
  assert.equal(plan.preview.environmental_soundscape.source, 'filtered-noise');
  assert.equal(plan.bounds.keyboard_within_candidate_bounds, true);
  assert.equal(plan.bounds.environment_within_candidate_bounds, true);
  assert.equal(plan.authority.preview_palette_explicit, true);
  assert.equal(plan.authority.assignments_are_temporary_preview_only, true);
});

test('none/none palette remains an explicit choice and produces hum-only preview', async () => {
  const review = approvedReview();
  const palette = await createRunaPreviewPaletteReceipt({ rendererReview: review, selectedBy: 'Rowan', harmonicSet: 'none', environmentSource: 'none' });
  const plan = await createRunaPreviewPlan({ rendererReview: review, world: WORLD, paletteReceipt: palette });
  assert.equal(plan.preview.keyboard_harmonics.assigned, false);
  assert.equal(plan.preview.environmental_soundscape.assigned, false);
  assert.equal(plan.preview.source_layers.length, 0);
  assert.equal(plan.source.palette_id, palette.palette_id);
});

test('palette cannot cross renderer review or world boundaries', async () => {
  const review = approvedReview();
  const palette = await createRunaPreviewPaletteReceipt({ rendererReview: review, selectedBy: 'Rowan', harmonicSet: 'root-octaves' });
  const otherReview = approvedReview();
  otherReview.review_id = 'other-review';
  await assert.rejects(() => createRunaPreviewPlan({ rendererReview: otherReview, world: WORLD, paletteReceipt: palette }), /belong to this renderer review/i);
  await assert.rejects(() => createRunaPreviewPlan({ rendererReview: review, world: { ...WORLD, id: 'luna' }, paletteReceipt: palette }), /world must match/i);
});

test('palette receipt is visible and hash-verifiable in extended provenance', async () => {
  const review = approvedReview();
  const palette = await createRunaPreviewPaletteReceipt({ rendererReview: review, selectedBy: 'Rowan', harmonicSet: 'root-fifth-octave', environmentSource: 'filtered-noise', selectedAt: '2026-08-14T16:01:00.000Z' });
  const plan = await createRunaPreviewPlan({ rendererReview: review, world: WORLD, paletteReceipt: palette, generatedAt: '2026-08-14T16:02:00.000Z' });
  const graph = buildExtendedArcsweepProvenanceGraph({ worldId: WORLD.id, observatory: { runa_renderer_reviews: [review], runa_preview_palettes: [palette], runa_preview_plans: [plan] } });
  const relations = new Set(graph.edges.map((item) => `${item.from}:${item.relation}:${item.to}`));
  assert.ok(relations.has(`${review.review_id}:selects-preview-palette:${palette.palette_id}`));
  assert.ok(relations.has(`${palette.palette_id}:compiles-preview-plan:${plan.plan_id}`));
  const paletteNode = graph.nodes.find((item) => item.id === palette.palette_id);
  const integrityGraph = { ...graph, nodes: [paletteNode], edges: [], unresolved_edges: [], collisions: [], summary: { node_count: 1, edge_count: 0, unresolved_edge_count: 0, collision_count: 0, by_kind: { runa_preview_palette: 1 } } };
  const report = await verifyProvenanceGraph(integrityGraph, { generatedAt: '2026-08-14T16:03:00.000Z' });
  assert.equal(report.status, 'PASS');
  assert.equal(report.counts.verified, 1);
});
