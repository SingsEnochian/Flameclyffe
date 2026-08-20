import test from 'node:test';
import assert from 'node:assert/strict';

import {
  decodeRichTextPayload,
  encodeRichTextPayload,
  isRichTextPayload,
} from '../src/rich-text-core.js';

test('legacy plain text remains plain text when first opened', () => {
  const source = 'The Wheel turns, and Ages come and pass.\nSecond paragraph.';
  assert.deepEqual(decodeRichTextPayload(source), { format: 'plain', text: source });
  assert.equal(isRichTextPayload(source), false);
});

test('rich text round-trips as structured HTML behind the WYSIWYG surface', () => {
  const html = '<p>The <strong>Wheel</strong> turns.</p><p><em>Again.</em></p>';
  const encoded = encodeRichTextPayload(html);
  assert.equal(isRichTextPayload(encoded), true);
  assert.deepEqual(decodeRichTextPayload(encoded), { format: 'html', html });
});

test('empty rich text remains distinguishable from legacy empty text', () => {
  const encoded = encodeRichTextPayload('');
  assert.equal(isRichTextPayload(encoded), true);
  assert.deepEqual(decodeRichTextPayload(encoded), { format: 'html', html: '' });
});
