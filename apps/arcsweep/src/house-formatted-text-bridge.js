import { formattedTextFromDom, formattedTextFromPlainText, normaliseFormattedText } from './formatted-text.js';
import { sanitizeHouseRichHtml } from './house-chat-rich-text.js';

function trimDocument(value) {
  const doc = normaliseFormattedText(value);
  const start = doc.text.length - doc.text.trimStart().length;
  const end = doc.text.trimEnd().length;
  const text = doc.text.slice(start, end);
  const entities = doc.entities.flatMap((entity) => {
    const entityStart = Math.max(start, entity.offset);
    const entityEnd = Math.min(end, entity.offset + entity.length);
    if (entityEnd <= entityStart) return [];
    return [{ ...entity, offset: entityStart - start, length: entityEnd - entityStart }];
  });
  return normaliseFormattedText({ text, entities });
}

export function formattedTextFromHouseHtml(text = '', richTextHtml = '', doc = globalThis.document) {
  const fallback = () => formattedTextFromPlainText(String(text || '').trim());
  if (!richTextHtml || !doc?.createElement) return fallback();
  try {
    const template = doc.createElement('template');
    template.innerHTML = sanitizeHouseRichHtml(richTextHtml, doc);
    const parsed = trimDocument(formattedTextFromDom(template.content));
    return parsed.text ? parsed : fallback();
  } catch {
    return fallback();
  }
}

export function canonicaliseHouseCommonsEntry(entry = {}, doc = globalThis.document) {
  const source = entry && typeof entry === 'object' ? entry : {};
  let formatted;
  if (source.formatted_text) formatted = trimDocument(source.formatted_text);
  else if (source.rich_text_html) formatted = formattedTextFromHouseHtml(source.text, source.rich_text_html, doc);
  else formatted = formattedTextFromPlainText(String(source.text || '').trim());
  return {
    ...source,
    text: formatted.text,
    formatted_text: formatted,
  };
}
