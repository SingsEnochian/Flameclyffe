import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, '../src/mythframe-federation-live-ui.js'), 'utf8');

test('federation UI requires explicit export, target review, and manual model execution', () => {
  assert.match(source, /export_consent/);
  assert.match(source, /targetAdmissionState: 'unreviewed'/);
  assert.match(source, /reviewMythframeTranslationCapsule/);
  assert.match(source, /data-model-lab-form/);
  assert.match(source, /Run sealed trial/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /continuity_admission\s*:\s*true/);
  assert.doesNotMatch(source, /canon_admission\s*:\s*true/);
});

test('cross-framework defaults name both local mythframes without declaring equivalence', () => {
  assert.match(source, /value="elara-codex"/);
  assert.match(source, /value="templehouse-hearthweave"/);
  assert.match(source, /Proposed target relation/);
  assert.doesNotMatch(source, /same identity/i);
});
