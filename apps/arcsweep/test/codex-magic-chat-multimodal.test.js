import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const entry = readFileSync(new URL('../src/magic-book-physical-acceptance-entry.js', import.meta.url), 'utf8');
const resident = readFileSync(new URL('../src/bluebird-codex-resident-v0-2-sidecar.js', import.meta.url), 'utf8');
const multimodal = readFileSync(new URL('../src/codex-magic-chat-multimodal-sidecar.js', import.meta.url), 'utf8');

test('Magic Chat multimodal layer mounts after the whole-book resident voice', () => {
  const residentIndex = entry.indexOf("'./bluebird-codex-resident-v0-2-sidecar.js'");
  const multimodalIndex = entry.indexOf("'./codex-magic-chat-multimodal-sidecar.js'");
  assert.ok(residentIndex >= 0);
  assert.ok(multimodalIndex > residentIndex);
});

test('Magic Chat supports files without pretending non-text images were inspected', () => {
  assert.match(multimodal, /data-codex-file-input/);
  assert.match(multimodal, /image\/\*/);
  assert.match(multimodal, /MAX_ATTACHMENT_TEXT/);
  assert.match(multimodal, /metadata only/);
  assert.match(multimodal, /do not claim visual inspection/);
});

test('Magic Chat keeps portable thread utilities outside the model process', () => {
  assert.match(multimodal, /Export thread/);
  assert.match(multimodal, /resident_state/);
  assert.match(multimodal, /context: api\.context/);
  assert.match(multimodal, /Copy last reply/);
  assert.match(multimodal, /smart window/);
  assert.match(resident, /MAX_THREAD = 40/);
  assert.match(resident, /installationId\(\)/);
  assert.match(resident, /receiver_mode/);
  assert.match(resident, /One continuity, swappable receivers/);
});
