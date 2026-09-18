import test from 'node:test';
import assert from 'node:assert/strict';

import { ARCSWEEP_OS_MANIFEST, ARCSWEEP_OS_VERSION } from '../src/os/version.js';

test('ArcSweep rc.8 caps the working Magic Book v0.1 without claiming final release', () => {
  assert.equal(ARCSWEEP_OS_VERSION, '0.1.0-rc.8');
  assert.equal(ARCSWEEP_OS_MANIFEST.runtime.magicBook, true);
  assert.equal(ARCSWEEP_OS_MANIFEST.runtime.magicBookVersion, '0.1');
  assert.equal(ARCSWEEP_OS_MANIFEST.runtime.magicBookPrimaryEmbodiedInterface, true);
  assert.equal(ARCSWEEP_OS_MANIFEST.runtime.magicBookThreeEmbodiment, true);
  assert.equal(ARCSWEEP_OS_MANIFEST.runtime.magicBookAccessibleDomAuthority, true);
  assert.equal(ARCSWEEP_OS_MANIFEST.runtime.magicBookSharedGlyphStudioState, true);
  assert.equal(ARCSWEEP_OS_MANIFEST.runtime.magicBookReceipts, true);
  assert.deepEqual(ARCSWEEP_OS_MANIFEST.runtime.magicBookPages, ['threshold', 'glyph-forge', 'receipts']);
  assert.equal(ARCSWEEP_OS_MANIFEST.contracts.magicBookBinding, 'arcsweep.magic-book-binding/v0.1');
  assert.equal(ARCSWEEP_OS_MANIFEST.contracts.magicBookReceipt, 'arcsweep.magic-book-receipt/v0.1');
  assert.equal(ARCSWEEP_OS_MANIFEST.contracts.magicBookSurface, 'arcsweep.magic-book-surface/v0.1');
  assert.match(ARCSWEEP_OS_MANIFEST.stage, /release-candidate/);
});
