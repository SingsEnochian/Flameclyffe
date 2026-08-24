import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const commandRoom = fs.readFileSync(new URL('../src/house-commons-command-room.js', import.meta.url), 'utf8');
const attachments = fs.readFileSync(new URL('../src/house-commons-attachments.js', import.meta.url), 'utf8');

test('Commons command room refreshes only when the Commons form is introduced', () => {
  assert.match(commandRoom, /mutationIntroducedCommons/);
  assert.doesNotMatch(commandRoom, /new MutationObserver\(\(\)=>\{if\(document\.querySelector\('#commons-form'\)\)void refresh\(\)\}\)/);
});

test('Commons periodic refresh is idempotent when remote entries are unchanged', () => {
  assert.match(commandRoom, /commonsEntriesFingerprint/);
  assert.match(commandRoom, /fingerprint === lastRemoteFingerprint/);
  assert.match(commandRoom, /if \(!force && !hostChanged && fingerprint === lastRemoteFingerprint\) return/);
});

test('Commons coalesces concurrent refresh requests instead of racing DOM rebuilds', () => {
  assert.match(commandRoom, /if \(refreshInFlight\) return refreshInFlight/);
  assert.match(commandRoom, /refreshInFlight = performRefresh\(options\)\.finally/);
});

test('Commons remount and attachment events may force exactly one fresh paint', () => {
  assert.match(commandRoom, /refreshHouseCommonsCommandRoom\(\{ force: true \}\)/);
  assert.match(commandRoom, /commons-attachment-saved/);
});

test('Commons attachment observer ignores its own injected buttons and chips', () => {
  assert.match(attachments, /mutationNeedsEnhancement/);
  assert.match(attachments, /#commons-form,\.commons-chat-entry/);
  assert.doesNotMatch(attachments, /new MutationObserver\(\(\)=>\{enhance\(\); renderAttachmentChips\(\);\}\)/);
});
