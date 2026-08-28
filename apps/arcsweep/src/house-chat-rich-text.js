import { FORMATTED_TEXT_ENTITY_TYPES } from './formatted-text.js';

export const HOUSE_CHAT_ALLOWED_TAGS = new Set(['A', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'DIV', 'EM', 'H1', 'H2', 'H3', 'I', 'LI', 'MARK', 'OL', 'P', 'PRE', 'S', 'SPAN', 'STRONG', 'TABLE', 'TBODY', 'TD', 'TH', 'THEAD', 'TR', 'U', 'UL']);
const SEMANTIC_ENTITY_TYPES = new Set(FORMATTED_TEXT_ENTITY_TYPES.filter((type) => !['paragraph', 'heading', 'quote', 'code_block', 'list_item', 'bold', 'italic', 'underline', 'strikethrough', 'code', 'link', 'mention'].includes(type)));

export const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function safeHouseHref(value = '') {
  const href = String(value || '').trim();
  if (!href) return '';
  if (/^(?:#|\/|\.\/|\.\.\/)/.test(href)) return href;
  try {
    const parsed = new URL(href, globalThis.location?.href || 'https://arcsweep.invalid/');
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol) ? href : '';
  } catch { return ''; }
}

export function sanitizeHouseRichHtml(html = '', doc = globalThis.document) {
  if (!doc?.createElement) return '';
  const template = doc.createElement('template');
  template.innerHTML = String(html || '');
  const walker = doc.createTreeWalker(template.content, globalThis.NodeFilter?.SHOW_ELEMENT ?? 1);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const element of nodes) {
    if (!HOUSE_CHAT_ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      continue;
    }
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      if (element.tagName === 'A' && name === 'href') continue;
      if (element.tagName === 'MARK' && name === 'class' && attribute.value === 'commons-mention') continue;
      if (element.tagName === 'PRE' && name === 'data-language' && /^[\w+-]{1,40}$/.test(attribute.value)) continue;
      if ((element.tagName === 'SPAN' || element.tagName === 'MARK') && name === 'data-ft-entity' && FORMATTED_TEXT_ENTITY_TYPES.includes(attribute.value)) continue;
      if ((element.tagName === 'SPAN' || element.tagName === 'MARK') && name === 'data-ft-value') { element.setAttribute(attribute.name, String(attribute.value).slice(0, 2000)); continue; }
      element.removeAttribute(attribute.name);
    }
    if (element.tagName === 'A') {
      const href = safeHouseHref(element.getAttribute('href'));
      href ? element.setAttribute('href', href) : element.removeAttribute('href');
    }
    if ((element.tagName === 'SPAN' || element.tagName === 'MARK') && element.hasAttribute('data-ft-entity') && !FORMATTED_TEXT_ENTITY_TYPES.includes(element.getAttribute('data-ft-entity'))) {
      element.removeAttribute('data-ft-entity'); element.removeAttribute('data-ft-value');
    }
  }
  return template.innerHTML;
}

function inlineMarkdown(text) {
  return text
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^\w])_([^_\n]+)_([^\w]|$)/g, '$1<em>$2</em>$3')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const safe = safeHouseHref(href);
      return safe ? `<a href="${escapeHtml(safe)}">${label}</a>` : label;
    })
    .replace(/(^|\s)(@[\w/-]+)/g, '$1<mark class="commons-mention">$2</mark>');
}

function renderTable(lines) {
  if (lines.length < 2 || !/^\s*\|?\s*:?-{3,}/.test(lines[1].replace(/\|/g, ''))) return null;
  const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => inlineMarkdown(cell.trim()));
  const head = cells(lines[0]);
  const body = lines.slice(2).filter((line) => line.includes('|')).map(cells);
  if (!head.length || !body.length) return null;
  return `<table><thead><tr>${head.map((cell) => `<th>${cell}</th>`).join('')}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

export function renderHouseModelRichText(value = '') {
  const escaped = escapeHtml(value).replace(/```([\w+-]*)\n([\s\S]*?)```/g, (_, language, code) => `<pre${language ? ` data-language="${escapeHtml(language)}"` : ''}><code>${code.replace(/\n$/, '')}</code></pre>`);
  const lines = escaped.split(/\r?\n/);
  const output = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    if (line.startsWith('<pre')) {
      let block = line;
      while (!block.includes('</pre>') && i + 1 < lines.length) block += `\n${lines[++i]}`;
      output.push(block); i += 1; continue;
    }
    const tableCandidate = lines.slice(i, Math.min(lines.length, i + 12));
    const table = renderTable(tableCandidate);
    if (table) {
      let consumed = 2;
      while (i + consumed < lines.length && lines[i + consumed].includes('|') && lines[i + consumed].trim()) consumed += 1;
      output.push(table); i += consumed; continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { output.push(`<h${Math.min(3, heading[1].length + 1)}>${inlineMarkdown(heading[2])}</h${Math.min(3, heading[1].length + 1)}>`); i += 1; continue; }
    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
      output.push(`<blockquote>${inlineMarkdown(quote.join('<br>'))}</blockquote>`); continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*+]\s+/, ''));
      output.push(`<ul>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`); continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''));
      output.push(`<ol>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ol>`); continue;
    }
    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3})\s+|^>\s?|^\s*[-*+]\s+|^\s*\d+[.)]\s+|^<pre/.test(lines[i])) paragraph.push(lines[i++]);
    output.push(`<p>${inlineMarkdown(paragraph.join('<br>'))}</p>`);
  }
  return output.join('');
}

export function houseModelPlainText(value = '') {
  return String(value)
    .replace(/```(?:[\w+-]+)?\n?([\s\S]*?)```/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+[.)]\s+/gm, '• ')
    .replace(/(^|[^\w])_([^_\n]+)_([^\w]|$)/g, '$1$2$3')
    .trim();
}

function selectionInside(editor, doc = globalThis.document) {
  const selection = doc?.getSelection?.();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  return editor.contains(range.commonAncestorContainer) ? { selection, range } : null;
}

function placeCaretInside(node, doc = globalThis.document) {
  const selection = doc?.getSelection?.();
  if (!selection) return;
  const range = doc.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  selection.removeAllRanges(); selection.addRange(range);
}

export function wrapHouseSelection(editor, tagName, doc = globalThis.document) {
  editor.focus();
  const current = selectionInside(editor, doc);
  if (!current) return false;
  const wrapper = doc.createElement(tagName);
  if (current.range.collapsed) {
    wrapper.append(doc.createTextNode('\u200b'));
    current.range.insertNode(wrapper);
    placeCaretInside(wrapper, doc);
  } else {
    const fragment = current.range.extractContents();
    wrapper.append(fragment);
    current.range.insertNode(wrapper);
    const next = doc.createRange(); next.selectNodeContents(wrapper);
    current.selection.removeAllRanges(); current.selection.addRange(next);
  }
  return true;
}

export function wrapHouseSemanticSelection(editor, type, doc = globalThis.document) {
  if (!SEMANTIC_ENTITY_TYPES.has(type)) return false;
  editor.focus();
  const current = selectionInside(editor, doc);
  if (!current) return false;
  const wrapper = doc.createElement('span');
  wrapper.setAttribute('data-ft-entity', type);
  if (current.range.collapsed) {
    wrapper.append(doc.createTextNode('\u200b'));
    current.range.insertNode(wrapper);
    placeCaretInside(wrapper, doc);
  } else {
    wrapper.append(current.range.extractContents());
    current.range.insertNode(wrapper);
    const next = doc.createRange(); next.selectNodeContents(wrapper);
    current.selection.removeAllRanges(); current.selection.addRange(next);
  }
  return true;
}

function nearestBlock(editor, node) {
  let current = node?.nodeType === 1 ? node : node?.parentElement;
  while (current && current !== editor) {
    if (/^(P|DIV|H1|H2|H3|BLOCKQUOTE|PRE|LI)$/.test(current.tagName)) return current;
    current = current.parentElement;
  }
  return null;
}

export function setHouseBlock(editor, tagName, doc = globalThis.document) {
  editor.focus();
  const current = selectionInside(editor, doc);
  if (!current) return false;
  const block = nearestBlock(editor, current.range.startContainer);
  const replacement = doc.createElement(tagName);
  if (block) {
    replacement.append(...block.childNodes);
    block.replaceWith(replacement);
  } else {
    const fragment = current.range.extractContents();
    replacement.append(fragment.childNodes.length ? fragment : doc.createTextNode('\u200b'));
    current.range.insertNode(replacement);
  }
  placeCaretInside(replacement, doc);
  return true;
}

export function toggleHouseList(editor, ordered = false, doc = globalThis.document) {
  editor.focus();
  const current = selectionInside(editor, doc);
  if (!current) return false;
  const block = nearestBlock(editor, current.range.startContainer);
  const list = doc.createElement(ordered ? 'ol' : 'ul');
  const item = doc.createElement('li');
  if (block) {
    item.append(...block.childNodes); list.append(item); block.replaceWith(list);
  } else {
    const fragment = current.range.extractContents(); item.append(fragment.childNodes.length ? fragment : doc.createTextNode('\u200b')); list.append(item); current.range.insertNode(list);
  }
  placeCaretInside(item, doc);
  return true;
}

export function linkHouseSelection(editor, href, doc = globalThis.document) {
  const safe = safeHouseHref(href);
  if (!safe) return false;
  editor.focus();
  const current = selectionInside(editor, doc);
  if (!current) return false;
  const anchor = doc.createElement('a'); anchor.setAttribute('href', safe);
  if (current.range.collapsed) anchor.append(doc.createTextNode(safe));
  else anchor.append(current.range.extractContents());
  current.range.insertNode(anchor); placeCaretInside(anchor, doc); return true;
}

export function insertHouseHtmlAtSelection(editor, html, doc = globalThis.document) {
  editor.focus();
  const current = selectionInside(editor, doc);
  if (!current) return false;
  const template = doc.createElement('template'); template.innerHTML = sanitizeHouseRichHtml(html, doc);
  const fragment = template.content;
  const last = fragment.lastChild;
  current.range.deleteContents(); current.range.insertNode(fragment);
  if (last) {
    const range = doc.createRange(); range.setStartAfter(last); range.collapse(true);
    current.selection.removeAllRanges(); current.selection.addRange(range);
  }
  return true;
}
