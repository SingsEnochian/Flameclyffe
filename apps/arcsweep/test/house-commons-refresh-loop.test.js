import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const commandRoom = fs.readFileSync(new URL('../src/house-commons-command-room.js', import.meta.url), 'utf8');
const attachments = fs.readFileSync(new URL('../src/house-commons-attachments.js', import.meta.url), 'utf8');

test('Commons command room refreshes only when the Commons form is introduced', () => {
  assert.match(commandRoom, /mutationIntroducedCommons/);
  assert.doesNotMatch(commandRoom, /new MutationObserver\(\(\)=>\{if\(document\.querySelector\('#commons-form'\)\)void refresh\(\)\}\)/);
});

test('Commons attachment observer ignores its own injected buttons and chips', () => {
  assert.match(attachments, /mutationNeedsEnhancement/);
  assert.match(attachments, /#commons-form,\.commons-chat-entry/);
  assert.doesNotMatch(attachments, /new MutationObserver\(\(\)=>\{enhance\(\); renderAttachmentChips\(\);\}\)/);
});
