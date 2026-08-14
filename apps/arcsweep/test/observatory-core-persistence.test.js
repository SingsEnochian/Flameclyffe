import assert from 'node:assert/strict';
import test from 'node:test';

import { validateImportedState } from '../src/core.js';
import {
  createDefaultState,
  createEmptyObservatoryStore,
  normaliseObservatoryStore,
  normaliseState,
} from '../src/storage.js';

test('Arcsweep 0.3 owns Observatory, transformation and feedback review state in the core archive', () => {
  const state = createDefaultState();
  assert.equal(state.version, '0.3.0');
  assert.equal(state.observatory.version, 1);
  assert.deepEqual(state.observatory.deep_time_records, []);
  assert.deepEqual(state.observatory.theory_reviews, []);
  assert.deepEqual(state.observatory.runa_renderer_candidates, []);
  assert.deepEqual(state.observatory.runa_renderer_reviews, []);
  assert.deepEqual(state.observatory.provenance_exports, []);
  assert.deepEqual(state.observatory.integrity_reports, []);
  assert.equal(state.feedbackQueue.schema, 'arcsweep.feedback-cycle-queue/v1');
  assert.deepEqual(state.transformationRequests, { version: 1, byWorld: {} });
});

test('Observatory normalisation preserves receipted organs and repairs malformed optional collections', () => {
  const store = normaliseObservatoryStore({
    version: 1,
    active_profile_id: 'bai-requested-transformation',
    sweeps: [{ sweep_id: 'sweep-1' }],
    theory_candidates: [{ receipt_id: 'theory-1' }],
    theory_reviews: [{ receipt_id: 'review-1' }],
    deep_time_records: [{ id: 'time-1' }],
    deep_time_replays: [{ receipt_id: 'replay-1' }],
    advisor_receipts: [{ receipt_id: 'advisor-1' }],
    domain_mappings: [{ mapping_id: 'map-1' }],
    runa_suggestions: [{ suggestion_id: 'runa-1' }],
    runa_renderer_candidates: [{ candidate_id: 'renderer-1' }],
    runa_renderer_reviews: [{ review_id: 'renderer-review-1' }],
    provenance_exports: [{ export_receipt_id: 'export-1' }],
    integrity_reports: [{ report_id: 'integrity-1' }],
    custom_profiles: 'not-an-array',
  });
  assert.equal(store.active_profile_id, 'bai-requested-transformation');
  assert.equal(store.sweeps[0].sweep_id, 'sweep-1');
  assert.equal(store.deep_time_records[0].id, 'time-1');
  assert.equal(store.runa_suggestions[0].suggestion_id, 'runa-1');
  assert.equal(store.runa_renderer_candidates[0].candidate_id, 'renderer-1');
  assert.equal(store.runa_renderer_reviews[0].review_id, 'renderer-review-1');
  assert.equal(store.provenance_exports[0].export_receipt_id, 'export-1');
  assert.equal(store.integrity_reports[0].report_id, 'integrity-1');
  assert.deepEqual(store.custom_profiles, []);
});

test('normaliseState upgrades an older archive while retaining Observatory, transformation and feedback receipts', () => {
  const legacy = createDefaultState();
  legacy.version = '0.2.1';
  legacy.observatory = {
    ...createEmptyObservatoryStore(),
    deep_time_records: [{ id: 'deep-time-keep-me' }],
    theory_reviews: [{ receipt_id: 'review-keep-me' }],
    runa_renderer_candidates: [{ candidate_id: 'renderer-keep-me' }],
    runa_renderer_reviews: [{ review_id: 'renderer-review-keep-me' }],
    provenance_exports: [{ export_receipt_id: 'export-keep-me' }],
    integrity_reports: [{ report_id: 'integrity-keep-me' }],
  };
  legacy.feedbackQueue = {
    schema: 'arcsweep.feedback-cycle-queue/v1',
    version: 1,
    entries: { c1: { cycle_id: 'c1', status: 'accepted' } },
    receipts: [{ review_receipt_id: 'feedback-review-1' }],
    updated_at: '2026-08-14T14:00:00.000Z',
  };
  legacy.transformationRequests = {
    version: 1,
    byWorld: {
      'terra-aeterna': {
        requests: [{ request_id: 'ask-keep-me' }],
        responses: [{ response_id: 'response-keep-me' }],
        circuits: [{ circuit_id: 'circuit-keep-me' }],
      },
    },
  };
  const upgraded = normaliseState(legacy);
  assert.equal(upgraded.version, '0.3.0');
  assert.equal(upgraded.observatory.deep_time_records[0].id, 'deep-time-keep-me');
  assert.equal(upgraded.observatory.theory_reviews[0].receipt_id, 'review-keep-me');
  assert.equal(upgraded.observatory.runa_renderer_candidates[0].candidate_id, 'renderer-keep-me');
  assert.equal(upgraded.observatory.runa_renderer_reviews[0].review_id, 'renderer-review-keep-me');
  assert.equal(upgraded.observatory.provenance_exports[0].export_receipt_id, 'export-keep-me');
  assert.equal(upgraded.observatory.integrity_reports[0].report_id, 'integrity-keep-me');
  assert.equal(upgraded.feedbackQueue.entries.c1.status, 'accepted');
  assert.equal(upgraded.transformationRequests.byWorld['terra-aeterna'].requests[0].request_id, 'ask-keep-me');
  assert.equal(upgraded.transformationRequests.byWorld['terra-aeterna'].circuits[0].circuit_id, 'circuit-keep-me');
});

test('import validation refuses malformed Observatory collections', () => {
  assert.throws(
    () => validateImportedState({ observatory: { deep_time_records: {} } }),
    /observatory deep_time_records must be an array/i,
  );
  assert.throws(
    () => validateImportedState({ observatory: { integrity_reports: {} } }),
    /observatory integrity_reports must be an array/i,
  );
  assert.throws(
    () => validateImportedState({ observatory: { runa_renderer_reviews: {} } }),
    /observatory runa_renderer_reviews must be an array/i,
  );
});

test('import validation refuses malformed persisted transformation receipt collections', () => {
  assert.throws(
    () => validateImportedState({ transformationRequests: { version: 1, byWorld: { terra: { requests: {} } } } }),
    /transformationRequests terra.requests must be an array/i,
  );
});
