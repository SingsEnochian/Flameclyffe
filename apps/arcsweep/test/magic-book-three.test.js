import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/magic-book-three.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../src/main-bootstrap.js', import.meta.url), 'utf8');

test('Magic Book uses Three.js and emits durable receipt-shaped events', () => {
  assert.match(source, /from 'three'/);
  assert.match(source, /arcsweep\.magic-book-receipt\/1/);
  assert.match(source, /object_id: 'arcsweep:magic-book'/);
  assert.match(source, /localStorage\.setItem\(STORAGE_KEY/);
  assert.match(source, /pointerdown/);
  assert.match(source, /pointermove/);
  assert.match(source, /pointerup/);
  assert.match(source, /function curlPage/);
  assert.match(source, /position\.needsUpdate = true/);
  assert.match(source, /computeVertexNormals/);
  assert.match(source, /arcsweep:magic-book:page:starsong-001/);
  assert.match(source, /continuity_signature: PAGE_SIGNATURE/);
  assert.match(source, /representation-changed/);
  assert.match(source, /continuity_preserved: true/);
  assert.match(source, /crossing-origin-sealed/);
  assert.match(source, /crossing-encounter-sealed/);
  assert.match(source, /crossing-observed/);
  assert.match(source, /arcsweep:observer:magic-book/);
  assert.match(source, /sameIdentity && sameSignature/);
  assert.match(source, /createArtifact/);
  assert.match(source, /sealOriginReceipt/);
  assert.match(source, /sealEncounterReceipt/);
  assert.match(source, /createCrossingReceipt/);
  assert.match(source, /evidence_state/);
  assert.match(source, /Magic Book Observatory/);
  assert.match(source, /data-observer-continuity/);
  assert.match(source, /data-observer-origin/);
  assert.match(source, /data-observer-encounter/);
  assert.match(source, /data-observer-join/);
  assert.match(source, /showCrossing\(comparison/);
  assert.match(source, /arcsweep\.temporal-witness\.magic-book\/1/);
  assert.match(source, /appendWitness/);
  assert.match(source, /origin_snapshot/);
  assert.match(source, /encounter_snapshot/);
  assert.match(source, /witness-recorded/);
  assert.match(source, /witness-replayed/);
  assert.match(source, /data-witness-prev/);
  assert.match(source, /data-witness-next/);
  assert.match(source, /reconstructWitness/);
  assert.match(source, /data-witness-origin/);
  assert.match(source, /data-witness-encounter/);
  assert.match(source, /Time Room replay/);
  assert.match(source, /reconstructed_progress/);
});

test('Magic Book mounts only after normal core readiness', () => {
  assert.match(bootstrap, /import\('\.\/magic-book-three\.js'\)/);
  assert.match(bootstrap, /mountMagicBook/);
  assert.match(bootstrap, /if \(!safeBoot\)/);
});
