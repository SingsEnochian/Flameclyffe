export const PROJECT_ZERO_RICH_TEXT_SCHEMA = 'flameclyffe.project-zero-companion.rich-text/v1';

const ALLOWED_TAGS = new Set(['P', 'DIV', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'A']);

export function escapeRichText(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function visibleTextToRichHtml(text = '') {
  const blocks = String(text || '').replace(/\r\n?/g, '\n').split(/\n{2,}/);
  return blocks.map((block) => `<p>${escapeRichText(block).replaceAll('\n', '<br>')}</p>`).join('') || '<p><br></p>';
}

function safeHref(value = '') {
  try {
    const url = new URL(value, globalThis.location?.href || 'https://project-zero-companion.local/');
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? value : '';
  } catch { return ''; }
}

export function sanitiseRichHtml(html = '', documentRef = globalThis.document) {
  if (!documentRef?.createElement) return visibleTextToRichHtml(String(html).replace(/<[^>]*>/g, ' '));
  const template = documentRef.createElement('template');
  template.innerHTML = String(html || '');

  function clean(node) {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) continue;
      if (child.nodeType !== 1) { child.remove(); continue; }
      if (!ALLOWED_TAGS.has(child.tagName)) {
        clean(child);
        child.replaceWith(...child.childNodes);
        continue;
      }
      const href = child.tagName === 'A' ? safeHref(child.getAttribute('href') || '') : '';
      for (const attr of [...child.attributes]) child.removeAttribute(attr.name);
      if (child.tagName === 'A' && href) {
        child.setAttribute('href', href);
        child.setAttribute('rel', 'noreferrer');
        child.setAttribute('target', '_blank');
      }
      clean(child);
    }
  }
  clean(template.content);
  return template.innerHTML;
}

export function richHtmlToPlainText(html = '', documentRef = globalThis.document) {
  if (!documentRef?.createElement) return String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const div = documentRef.createElement('div');
  div.innerHTML = sanitiseRichHtml(html, documentRef);
  return String(div.innerText || div.textContent || '').trim();
}

export function createRichTextDocument({ html = '', plainText = null } = {}) {
  const safeHtml = sanitiseRichHtml(html);
  return Object.freeze({ schema: PROJECT_ZERO_RICH_TEXT_SCHEMA, html: safeHtml, plain_text: plainText == null ? richHtmlToPlainText(safeHtml) : String(plainText) });
}

export function visibleTextToRichDocument(text = '') {
  return createRichTextDocument({ html: visibleTextToRichHtml(text), plainText: String(text || '') });
}

export function executeNativeRichTextCommand(command, value = null, documentRef = globalThis.document) {
  if (!documentRef?.execCommand) return false;
  return documentRef.execCommand(command, false, value);
}
