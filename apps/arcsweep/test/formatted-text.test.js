import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FORMATTED_TEXT_SCHEMA,
  formattedTextFromMarkdown,
  formattedTextFromPlainText,
  formattedTextToMarkdown,
  formattedTextToPlainText,
  normaliseFormattedText,
  renderFormattedTextHtml,
  semanticEntity,
} from '../src/formatted-text.js';

test('Markdown becomes plain text plus typed entities instead of storing punctuation as formatting', () => {
  const doc = formattedTextFromMarkdown('**Bold** and _soft_ with [source](https://example.test) and @Atlas.');
  assert.equal(doc.schema, FORMATTED_TEXT_SCHEMA);
  assert.equal(doc.text, 'Bold and soft with source and @Atlas.');
  assert.ok(doc.entities.some((entity) => entity.type === 'bold' && doc.text.slice(entity.offset, entity.offset + entity.length) === 'Bold'));
  assert.ok(doc.entities.some((entity) => entity.type === 'italic' && doc.text.slice(entity.offset, entity.offset + entity.length) === 'soft'));
  assert.ok(doc.entities.some((entity) => entity.type === 'link' && entity.data?.href === 'https://example.test'));
  assert.ok(doc.entities.some((entity) => entity.type === 'mention' && entity.data?.id === 'atlas'));
});

test('block structure survives as entities without contaminating plain text', () => {
  const doc = formattedTextFromMarkdown('# Heading\n\n> witnessed\n> carefully\n\n- one\n- two\n\n```js\nconst x = 1;\n```');
  assert.equal(formattedTextToPlainText(doc), 'Heading\n\nwitnessed\ncarefully\n\none\n\ntwo\n\nconst x = 1;');
  assert.ok(doc.entities.some((entity) => entity.type === 'heading' && entity.data?.level === 1));
  assert.ok(doc.entities.some((entity) => entity.type === 'quote'));
  assert.equal(doc.entities.filter((entity) => entity.type === 'list_item').length, 2);
  assert.ok(doc.entities.some((entity) => entity.type === 'code_block' && entity.data?.language === 'js'));
});

test('renderer is safe and refuses executable link protocols', () => {
  const doc = normaliseFormattedText({
    text: '<b>not html</b> click',
    entities: [
      { type: 'bold', offset: 0, length: 15 },
      { type: 'link', offset: 16, length: 5, data: { href: 'javascript:alert(1)' } },
    ],
  });
  const html = renderFormattedTextHtml(doc);
  assert.match(html, /&lt;b&gt;not html&lt;\/b&gt;/);
  assert.doesNotMatch(html, /javascript:/i);
  assert.doesNotMatch(html, /<b>not html<\/b>/);
});

test('overlapping entities render without changing the canonical text', () => {
  const doc = normaliseFormattedText({
    text: 'abcdef',
    entities: [
      { type: 'bold', offset: 0, length: 4 },
      { type: 'italic', offset: 2, length: 4 },
    ],
  });
  assert.equal(doc.text, 'abcdef');
  const html = renderFormattedTextHtml(doc);
  assert.match(html, /<strong>ab<\/strong>/);
  assert.match(html, /<strong><em>cd<\/em><\/strong>|<em><strong>cd<\/strong><\/em>/);
  assert.match(html, /<em>ef<\/em>/);
});

test('Roleplay semantics are explicit: italics do not silently become actions', () => {
  const parsed = formattedTextFromMarkdown('*walks toward the door*');
  assert.ok(parsed.entities.some((entity) => entity.type === 'italic'));
  assert.ok(!parsed.entities.some((entity) => entity.type === 'action'));
  const action = normaliseFormattedText({
    text: parsed.text,
    entities: [...parsed.entities, semanticEntity('action', 0, parsed.text.length, { actor: 'atlas' })],
  });
  const html = renderFormattedTextHtml(action);
  assert.match(html, /data-ft-entity="action"/);
  assert.equal(action.text, 'walks toward the door');
});

test('scientific semantics distinguish observation, hypothesis, interpretation, and evidence without rewriting prose', () => {
  const text = 'The signal rose. A coupling change may explain it.';
  const doc = normaliseFormattedText({
    text,
    entities: [
      semanticEntity('observation', 0, 16, { receipt: 'obs-1' }),
      semanticEntity('hypothesis', 17, 32, { candidate: 'h-1' }),
      semanticEntity('sourceCitation', 0, 16, { source: 'receipt:obs-1' }),
    ],
  });
  assert.equal(doc.text, text);
  const html = renderFormattedTextHtml(doc);
  assert.match(html, /data-ft-entity="observation"/);
  assert.match(html, /data-ft-entity="hypothesis"/);
  assert.match(html, /data-ft-entity="sourceCitation"/);
});

test('normalisation drops invalid or out-of-range entities and de-duplicates exact duplicates', () => {
  const doc = normaliseFormattedText({
    text: 'hello',
    entities: [
      { type: 'bold', offset: 0, length: 5 },
      { type: 'bold', offset: 0, length: 5 },
      { type: 'bogus', offset: 0, length: 5 },
      { type: 'italic', offset: 3, length: 99 },
    ],
  });
  assert.deepEqual(doc.entities, [{ type: 'bold', offset: 0, length: 5 }]);
});

test('plain text remains a valid first-class document and Markdown export is derived', () => {
  const doc = formattedTextFromPlainText('First paragraph.\n\nSecond paragraph.');
  assert.equal(formattedTextToPlainText(doc), 'First paragraph.\n\nSecond paragraph.');
  const bold = normaliseFormattedText({ text: 'Native bold', entities: [{ type: 'paragraph', offset: 0, length: 11 }, { type: 'bold', offset: 7, length: 4 }] });
  assert.equal(formattedTextToMarkdown(bold), 'Native **bold**');
});
