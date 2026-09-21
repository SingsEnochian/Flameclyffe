import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAGIC_BOOK_PHYSICAL_PROOF_EXPORT_SCHEMA,
  isSealedMagicBookPhysicalProof,
  magicBookPhysicalProofFilename,
  serialiseMagicBookPhysicalProof,
} from '../src/magic-book-physical-proof-export.js';

const sealed = Object.freeze({
  schema: 'arcsweep.magic-book-physical-acceptance/v0.1',
  sealed_at: '2026-09-21T04:12:33.000Z',
  human_confirmed: true,
  physical_device_attested: true,
  acceptance_scope: 'real-ipad-touch-and-apple-pencil',
  checks: Object.freeze({ touch_stroke_observed: true, pencil_stroke_observed: true }),
  evidence: Object.freeze({ touch_stroke_receipt_id: 'touch:1', pencil_stroke_receipt_id: 'pen:1' }),
  privacy: Object.freeze({ coordinates_recorded: false, drawing_content_recorded: false, text_content_recorded: false }),
  release_promotion: false,
});

test('sealed physical proof serialises as portable JSON without changing release authority', () => {
  assert.equal(MAGIC_BOOK_PHYSICAL_PROOF_EXPORT_SCHEMA, 'arcsweep.magic-book-physical-proof-export/v0.1');
  assert.equal(isSealedMagicBookPhysicalProof(sealed), true);
  const exported = JSON.parse(serialiseMagicBookPhysicalProof(sealed));
  assert.equal(exported.human_confirmed, true);
  assert.equal(exported.physical_device_attested, true);
  assert.equal(exported.release_promotion, false);
  assert.equal(exported.privacy.coordinates_recorded, false);
  assert.equal(exported.privacy.drawing_content_recorded, false);
  assert.equal(exported.privacy.text_content_recorded, false);
});

test('export filename is deterministic and filesystem-friendly', () => {
  const filename = magicBookPhysicalProofFilename(sealed);
  assert.equal(filename, 'arcsweep-magic-book-ipad-proof-2026-09-21T04-12-33.000Z.json');
  assert.equal(filename.includes(':'), false);
});

test('unsealed or non-attested records cannot be exported as physical proof', () => {
  const unconfirmed = { ...sealed, human_confirmed: false };
  const unattested = { ...sealed, physical_device_attested: false };
  assert.equal(isSealedMagicBookPhysicalProof(unconfirmed), false);
  assert.equal(isSealedMagicBookPhysicalProof(unattested), false);
  assert.throws(() => serialiseMagicBookPhysicalProof(unconfirmed), /sealed physical acceptance receipt/i);
  assert.throws(() => magicBookPhysicalProofFilename(unattested), /sealed physical acceptance receipt/i);
});
