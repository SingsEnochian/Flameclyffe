import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  MAGIC_BOOK_PHYSICAL_ACCEPTANCE_SCHEMA,
  evaluateMagicBookPhysicalAcceptance,
  sealMagicBookPhysicalAcceptance,
} from '../src/magic-book-physical-acceptance.js';

const receipt = (kind, createdAt, detail = {}, pageId = 'glyph-forge') => ({
  schema: 'arcsweep.magic-book-receipt/v0.1',
  receipt_id: `receipt:${kind}:${createdAt}`,
  kind,
  page_id: pageId,
  world_id: 'world:test',
  room: 'forge',
  detail,
  created_at: createdAt,
});

function completedEvidence() {
  const touchId = 'stroke:touch';
  const penId = 'stroke:pen';
  return {
    deviceStatus: {
      pointer_events_available: true,
      touch_points: 5,
    },
    deviceProofs: [
      { pointer_type: 'touch', pressure_observed: true, observed_at: '2026-09-21T03:00:04Z' },
      { pointer_type: 'pen', pressure_observed: true, tilt_observed: true, observed_at: '2026-09-21T03:00:06Z' },
    ],
    receipts: [
      receipt('book-open', '2026-09-21T03:00:00Z', {}, 'threshold'),
      receipt('page-turn', '2026-09-21T03:00:01Z', { to_page_id: 'glyph-forge' }, 'glyph-forge'),
      receipt('brush-select', '2026-09-21T03:00:02Z', { brush_id: 'brush:test' }),
      receipt('brush-setting-change', '2026-09-21T03:00:03Z', { brush_id: 'brush:test', setting: 'size' }),
      receipt('glyph-stroke', '2026-09-21T03:00:04Z', { stroke_id: touchId, pointer_type: 'touch' }),
      receipt('glyph-stroke', '2026-09-21T03:00:06Z', { stroke_id: penId, pointer_type: 'pen' }),
      receipt('book-close', '2026-09-21T03:00:07Z', {}, 'glyph-forge'),
      receipt('book-open', '2026-09-21T03:00:08Z', {}, 'receipts'),
    ],
    persistedProject: {
      glyphs: [{ id: 'glyph:test', strokes: [{ id: touchId }, { id: penId }] }],
    },
  };
}

test('physical acceptance candidate requires real touch, Pencil pressure, persistence, and leave/return evidence', () => {
  const candidate = evaluateMagicBookPhysicalAcceptance(completedEvidence());
  assert.equal(candidate.ready_to_seal, true);
  assert.deepEqual(candidate.missing, []);
  assert.equal(candidate.checks.touch_stroke_observed, true);
  assert.equal(candidate.checks.pencil_stroke_observed, true);
  assert.equal(candidate.checks.pencil_pressure_observed, true);
  assert.equal(candidate.checks.proof_strokes_persisted, true);
  assert.equal(candidate.checks.leave_return_observed, true);
  assert.equal(candidate.privacy.coordinates_recorded, false);
  assert.equal(candidate.privacy.drawing_content_recorded, false);
});

test('mouse-only or incomplete evidence cannot seal the physical gate', () => {
  const candidate = evaluateMagicBookPhysicalAcceptance({
    deviceStatus: { pointer_events_available: true, touch_points: 0 },
    deviceProof: { pointer_type: 'mouse', pressure_observed: false },
    receipts: [receipt('glyph-stroke', '2026-09-21T03:00:00Z', { stroke_id: 'mouse', pointer_type: 'mouse' })],
    persistedProject: { glyphs: [{ strokes: [{ id: 'mouse' }] }] },
  });
  assert.equal(candidate.ready_to_seal, false);
  assert.ok(candidate.missing.includes('touch_capable_device'));
  assert.ok(candidate.missing.includes('touch_stroke_observed'));
  assert.ok(candidate.missing.includes('pencil_stroke_observed'));
  assert.ok(candidate.missing.includes('pencil_pressure_observed'));
  assert.throws(() => sealMagicBookPhysicalAcceptance(candidate, { humanConfirmed: true }), /incomplete/i);
});

test('completed evidence still requires explicit human confirmation and never auto-promotes release', () => {
  const candidate = evaluateMagicBookPhysicalAcceptance(completedEvidence());
  assert.throws(() => sealMagicBookPhysicalAcceptance(candidate), /human confirmation/i);

  const sealed = sealMagicBookPhysicalAcceptance(candidate, {
    humanConfirmed: true,
    sealedAt: '2026-09-21T03:01:00Z',
  });
  assert.equal(sealed.schema, MAGIC_BOOK_PHYSICAL_ACCEPTANCE_SCHEMA);
  assert.equal(sealed.human_confirmed, true);
  assert.equal(sealed.physical_device_attested, true);
  assert.equal(sealed.release_promotion, false);
  assert.equal(sealed.acceptance_scope, 'real-ipad-touch-and-apple-pencil');
});

test('physical acceptance sidecar is mounted after Magic Book and stores bounded metadata only', () => {
  const bootstrap = readFileSync(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const book = bootstrap.indexOf("'./magic-book-sidecar.js'");
  const acceptance = bootstrap.indexOf("'./magic-book-physical-acceptance-entry.js'");
  assert.ok(book >= 0);
  assert.ok(acceptance > book);
  assert.match(bootstrap, /import\.meta\.glob\([\s\S]*magic-book-physical-acceptance-entry\.js/);

  const source = readFileSync(new URL('../src/magic-book-physical-acceptance-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /arcsweep:glyph-brush-sample/);
  assert.match(source, /device\.status/);
  assert.match(source, /device\.input-proof/);
  assert.match(source, /Seal this iPad proof/);
  assert.match(source, /release/);
  assert.doesNotMatch(source, /detail\.x/);
  assert.doesNotMatch(source, /detail\.y/);
});
