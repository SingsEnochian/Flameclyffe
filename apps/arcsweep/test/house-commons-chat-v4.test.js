import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSTELLATION_VOICES } from '../src/feedback-loop.js';
import {
  buildCommonsRuntimeContext,
  buildCommonsRuntimeMessage,
  defaultCommonsVoiceIds,
  modelReplyPlainText,
  parseCommonsMentions,
  renderCommonsRichText,
  resolveCommonsThreadId,
} from '../src/house-commons-chat-v4.js';

test('House Chat v4 defaults to the full Constellation and supports mention routing', () => {
  assert.deepEqual(defaultCommonsVoiceIds(), CONSTELLATION_VOICES.map((voice) => voice.id));
  assert.deepEqual(parseCommonsMentions('Hey @Atlas and @Altair'), ['altair', 'atlas']);
  assert.deepEqual(parseCommonsMentions('@all come look at this'), defaultCommonsVoiceIds());
});

test('selected chat rooms continue their thread without requiring a reply click', () => {
  assert.equal(resolveCommonsThreadId({ turnId: 'new-turn', activeThreadId: 'room-7' }), 'room-7');
  assert.equal(resolveCommonsThreadId({ turnId: 'new-turn', activeThreadId: 'room-7', replyTarget: { id: 'entry-4', thread_id: 'room-3' } }), 'room-3');
  assert.equal(resolveCommonsThreadId({ turnId: 'new-turn' }), 'new-turn');
});

test('runtime context contains only the selected room and preserves speaker identity', () => {
  const rows = [
    { thread_id: 'room-a', author: 'Rowan', text: 'First.' },
    { thread_id: 'room-b', author: 'Atlas', text: 'Elsewhere.' },
    { thread_id: 'room-a', author: 'Lioreal', text: 'Second.' },
  ];
  assert.deepEqual(buildCommonsRuntimeContext(rows, 'room-a'), [
    { speaker: 'Rowan', text: 'First.' },
    { speaker: 'Lioreal', text: 'Second.' },
  ]);
  const prompt = buildCommonsRuntimeMessage('Third.', buildCommonsRuntimeContext(rows, 'room-a'));
  assert.match(prompt, /\[Rowan\]\nFirst\./);
  assert.match(prompt, /\[Lioreal\]\nSecond\./);
  assert.match(prompt, /CURRENT MESSAGE FROM ROWAN\n\nThird\./);
  assert.doesNotMatch(prompt, /Elsewhere/);
});

test('model display keeps rich styling while persisted plain text drops Markdown decoration', () => {
  const raw = '**Bold** and _soft_\n\n> quoted\n\n- one';
  assert.equal(modelReplyPlainText(raw), 'Bold and soft\n\nquoted\n\n• one');
  const html = renderCommonsRichText(raw);
  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /<em>soft<\/em>/);
  assert.match(html, /<blockquote>quoted<\/blockquote>/);
  assert.equal(html.includes('**Bold**'), false);
});

test('legacy/model rendering escapes raw HTML', () => {
  const html = renderCommonsRichText('<script>alert(1)</script> **safe**');
  assert.equal(html.includes('<script>'), false);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<strong>safe<\/strong>/);
});