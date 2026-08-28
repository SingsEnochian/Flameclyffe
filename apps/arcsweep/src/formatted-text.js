export const FORMATTED_TEXT_SCHEMA = 'arcsweep.formatted-text/v1';

export const FORMATTED_TEXT_ENTITY_TYPES = Object.freeze([
  'bold', 'italic', 'underline', 'strikethrough', 'code', 'link', 'mention',
  'paragraph', 'heading', 'quote', 'code_block', 'list_item',
  'action', 'dialogue', 'narration', 'ooc', 'system', 'sourceCitation',
  'evidenceClaim', 'hypothesis', 'observation', 'interpretation', 'worldTerm', 'flameMention', 'ritualCall',
]);

const ENTITY_TYPES = new Set(FORMATTED_TEXT_ENTITY_TYPES);
const BLOCK_TYPES = new Set(['paragraph', 'heading', 'quote', 'code_block', 'list_item']);
const INLINE_ORDER = Object.freeze([
  'link', 'bold', 'italic', 'underline', 'strikethrough', 'code', 'mention', 'flameMention',
  'action', 'dialogue', 'narration', 'ooc', 'system', 'sourceCitation', 'evidenceClaim',
  'hypothesis', 'observation', 'interpretation', 'worldTerm', 'ritualCall',
]);

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const safeHref = (value = '') => {
  const href = String(value || '').trim();
  if (!href) return '';
  if (/^(?:#|\/|\.\/|\.\.\/)/.test(href)) return href;
  try {
    const parsed = new URL(href, 'https://arcsweep.invalid/');
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol) ? href : '';
  } catch { return ''; }
};

const cleanData = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value).slice(0, 16).map(([key, item]) => {
    if (item == null) return [String(key).slice(0, 80), null];
    if (typeof item === 'number' || typeof item === 'boolean') return [String(key).slice(0, 80), item];
    return [String(key).slice(0, 80), String(item).slice(0, 2000)];
  });
  return entries.length ? Object.fromEntries(entries) : undefined;
};

export function normaliseFormattedText(value) {
  const text = String(value?.text || '');
  const entities = [];
  const seen = new Set();
  for (const raw of Array.isArray(value?.entities) ? value.entities : []) {
    const type = String(raw?.type || '');
    const offset = Number(raw?.offset);
    const length = Number(raw?.length);
    if (!ENTITY_TYPES.has(type) || !Number.isInteger(offset) || !Number.isInteger(length) || offset < 0 || length <= 0 || offset + length > text.length) continue;
    const data = cleanData(raw?.data);
    const entity = { type, offset, length, ...(data ? { data } : {}) };
    const key = JSON.stringify(entity);
    if (seen.has(key)) continue;
    seen.add(key); entities.push(entity);
  }
  entities.sort((a, b) => a.offset - b.offset || b.length - a.length || a.type.localeCompare(b.type));
  return { schema: FORMATTED_TEXT_SCHEMA, text, entities };
}

export function formattedTextFromPlainText(value = '') {
  const text = String(value || '').replace(/\r\n?/g, '\n');
  const entities = [];
  let cursor = 0;
  for (const chunk of text.split(/(\n\n+)/)) {
    if (!chunk) continue;
    if (!/^\n\n+$/.test(chunk) && chunk.length) entities.push({ type: 'paragraph', offset: cursor, length: chunk.length });
    cursor += chunk.length;
  }
  return normaliseFormattedText({ text, entities });
}

function markdownBuilder() {
  let text = '';
  const entities = [];
  const append = (value) => { const start = text.length; text += value; return start; };
  const entity = (type, start, data) => {
    const length = text.length - start;
    if (length > 0) entities.push({ type, offset: start, length, ...(data ? { data } : {}) });
  };
  return { get text() { return text; }, entities, append, entity };
}

function parseInlineMarkdown(input, out) {
  const source = String(input || '');
  let i = 0;
  while (i < source.length) {
    const paired = (open, close, type) => {
      if (!source.startsWith(open, i)) return false;
      const end = source.indexOf(close, i + open.length);
      if (end < 0) return false;
      const start = out.text.length;
      parseInlineMarkdown(source.slice(i + open.length, end), out);
      out.entity(type, start);
      i = end + close.length;
      return true;
    };
    if (paired('**', '**', 'bold') || paired('__', '__', 'bold') || paired('~~', '~~', 'strikethrough')) continue;
    if (source[i] === '`') {
      const end = source.indexOf('`', i + 1);
      if (end > i + 1) {
        const start = out.append(source.slice(i + 1, end)); out.entity('code', start); i = end + 1; continue;
      }
    }
    if (source[i] === '[') {
      const labelEnd = source.indexOf('](', i + 1);
      const hrefEnd = labelEnd >= 0 ? source.indexOf(')', labelEnd + 2) : -1;
      if (labelEnd > i + 1 && hrefEnd > labelEnd + 2) {
        const href = safeHref(source.slice(labelEnd + 2, hrefEnd));
        const start = out.text.length;
        parseInlineMarkdown(source.slice(i + 1, labelEnd), out);
        if (href) out.entity('link', start, { href });
        i = hrefEnd + 1; continue;
      }
    }
    if ((source[i] === '*' || source[i] === '_') && source[i + 1] !== source[i]) {
      const marker = source[i]; const end = source.indexOf(marker, i + 1);
      if (end > i + 1) {
        const start = out.text.length; parseInlineMarkdown(source.slice(i + 1, end), out); out.entity('italic', start); i = end + 1; continue;
      }
    }
    if (source[i] === '@') {
      const match = source.slice(i).match(/^@[\w/-]+/);
      if (match) {
        const start = out.append(match[0]); out.entity('mention', start, { id: match[0].slice(1).toLowerCase() }); i += match[0].length; continue;
      }
    }
    if (source[i] === '\\' && i + 1 < source.length && /[\\`*_{}\[\]()#+.!~-]/.test(source[i + 1])) {
      out.append(source[i + 1]); i += 2; continue;
    }
    out.append(source[i]); i += 1;
  }
}

export function formattedTextFromMarkdown(value = '') {
  const lines = String(value || '').replace(/\r\n?/g, '\n').split('\n');
  const out = markdownBuilder();
  let blockCount = 0;
  const separator = () => { if (blockCount++) out.append('\n\n'); };
  const addInlineBlock = (type, body, data) => {
    separator(); const start = out.text.length; parseInlineMarkdown(body, out); out.entity(type, start, data);
  };
  for (let i = 0; i < lines.length;) {
    if (!lines[i].trim()) { i += 1; continue; }
    const fence = lines[i].match(/^```([\w+-]*)\s*$/);
    if (fence) {
      const body = []; i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
      if (i < lines.length) i += 1;
      separator(); const start = out.append(body.join('\n')); out.entity('code_block', start, fence[1] ? { language: fence[1] } : undefined); continue;
    }
    const heading = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (heading) { addInlineBlock('heading', heading[2], { level: heading[1].length }); i += 1; continue; }
    if (/^>\s?/.test(lines[i])) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
      addInlineBlock('quote', quote.join('\n')); continue;
    }
    if (/^\s*[-*+]\s+/.test(lines[i]) || /^\s*\d+[.)]\s+/.test(lines[i])) {
      const ordered = /^\s*\d+[.)]\s+/.test(lines[i]); let index = 0;
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/.test(lines[i]) : /^\s*[-*+]\s+/.test(lines[i]))) {
        addInlineBlock('list_item', lines[i++].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/, ''), { ordered, index: index++ });
      }
      continue;
    }
    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !/^```/.test(lines[i]) && !/^(#{1,6})\s+/.test(lines[i]) && !/^>\s?/.test(lines[i]) && !/^\s*[-*+]\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i])) paragraph.push(lines[i++]);
    addInlineBlock('paragraph', paragraph.join('\n'));
  }
  return normaliseFormattedText({ text: out.text, entities: out.entities });
}

function domEntityType(element) {
  const semantic = element?.getAttribute?.('data-ft-entity');
  if (semantic && ENTITY_TYPES.has(semantic)) return { type: semantic, data: element.getAttribute('data-ft-value') ? { value: element.getAttribute('data-ft-value') } : undefined };
  const tag = element?.tagName;
  if (tag === 'STRONG' || tag === 'B') return { type: 'bold' };
  if (tag === 'EM' || tag === 'I') return { type: 'italic' };
  if (tag === 'U') return { type: 'underline' };
  if (tag === 'S' || tag === 'DEL') return { type: 'strikethrough' };
  if (tag === 'A') return { type: 'link', data: { href: safeHref(element.getAttribute('href')) } };
  if (tag === 'MARK' && element.classList?.contains('commons-mention')) return { type: 'mention', data: { id: String(element.textContent || '').replace(/^@/, '').toLowerCase() } };
  if (tag === 'BLOCKQUOTE') return { type: 'quote' };
  if (/^H[1-6]$/.test(tag || '')) return { type: 'heading', data: { level: Number(tag.slice(1)) } };
  if (tag === 'PRE') return { type: 'code_block', data: element.getAttribute('data-language') ? { language: element.getAttribute('data-language') } : undefined };
  if (tag === 'CODE' && element.parentElement?.tagName !== 'PRE') return { type: 'code' };
  if (tag === 'LI') return { type: 'list_item', data: { ordered: element.parentElement?.tagName === 'OL' } };
  if (tag === 'P' || tag === 'DIV') return { type: 'paragraph' };
  return null;
}

export function formattedTextFromDom(root) {
  if (!root) return formattedTextFromPlainText('');
  let text = '';
  const entities = [];
  const append = (value) => { text += value; };
  const ensureBreak = (count = 1) => {
    const need = '\n'.repeat(count);
    if (!text.endsWith(need)) text += text.endsWith('\n') ? '\n'.repeat(Math.max(0, count - 1)) : need;
  };
  const walk = (node) => {
    if (node.nodeType === 3) { append(node.nodeValue || ''); return; }
    if (node.nodeType !== 1) { for (const child of node.childNodes || []) walk(child); return; }
    const tag = node.tagName;
    if (tag === 'BR') { append('\n'); return; }
    const block = /^(P|DIV|H[1-6]|BLOCKQUOTE|PRE|LI)$/.test(tag);
    if (block && text && !text.endsWith('\n')) ensureBreak(1);
    const start = text.length;
    for (const child of node.childNodes || []) walk(child);
    const end = text.length;
    const mapped = domEntityType(node);
    if (mapped && end > start) entities.push({ type: mapped.type, offset: start, length: end - start, ...(mapped.data ? { data: mapped.data } : {}) });
    if (block && !text.endsWith('\n')) ensureBreak(tag === 'LI' ? 1 : 2);
  };
  for (const child of root.childNodes || []) walk(child);
  text = text.replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '');
  return normaliseFormattedText({ text, entities: entities.filter((entity) => entity.offset + entity.length <= text.length) });
}

function inlineEntity(entity) { return !BLOCK_TYPES.has(entity.type); }

function wrapInline(type, content, data = {}) {
  if (type === 'bold') return `<strong>${content}</strong>`;
  if (type === 'italic') return `<em>${content}</em>`;
  if (type === 'underline') return `<u>${content}</u>`;
  if (type === 'strikethrough') return `<s>${content}</s>`;
  if (type === 'code') return `<code>${content}</code>`;
  if (type === 'link') { const href = safeHref(data.href); return href ? `<a href="${escapeHtml(href)}">${content}</a>` : content; }
  if (type === 'mention' || type === 'flameMention') return `<mark class="commons-mention" data-ft-entity="${type}">${content}</mark>`;
  return `<span class="ft-semantic ft-${type.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}" data-ft-entity="${escapeHtml(type)}">${content}</span>`;
}

function renderInlineRange(doc, start, end) {
  const relevant = doc.entities.filter((entity) => inlineEntity(entity) && entity.offset < end && entity.offset + entity.length > start);
  const points = new Set([start, end]);
  for (const entity of relevant) { points.add(Math.max(start, entity.offset)); points.add(Math.min(end, entity.offset + entity.length)); }
  const boundaries = [...points].sort((a, b) => a - b);
  let html = '';
  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const a = boundaries[i]; const b = boundaries[i + 1]; if (b <= a) continue;
    let content = escapeHtml(doc.text.slice(a, b)).replaceAll('\n', '<br>');
    const active = relevant.filter((entity) => entity.offset <= a && entity.offset + entity.length >= b)
      .sort((x, y) => INLINE_ORDER.indexOf(y.type) - INLINE_ORDER.indexOf(x.type));
    for (const entity of active) content = wrapInline(entity.type, content, entity.data || {});
    html += content;
  }
  return html;
}

export function renderFormattedTextHtml(value) {
  const doc = normaliseFormattedText(value);
  if (!doc.text) return '';
  const blocks = doc.entities.filter((entity) => BLOCK_TYPES.has(entity.type)).sort((a, b) => a.offset - b.offset || b.length - a.length);
  if (!blocks.length) return `<p>${renderInlineRange(doc, 0, doc.text.length)}</p>`;
  const top = [];
  let coveredUntil = 0;
  for (const block of blocks) {
    if (block.offset < coveredUntil) continue;
    if (block.offset > coveredUntil && doc.text.slice(coveredUntil, block.offset).trim()) top.push({ type: 'paragraph', offset: coveredUntil, length: block.offset - coveredUntil });
    top.push(block); coveredUntil = block.offset + block.length;
  }
  if (coveredUntil < doc.text.length && doc.text.slice(coveredUntil).trim()) top.push({ type: 'paragraph', offset: coveredUntil, length: doc.text.length - coveredUntil });
  let html = '';
  let listType = null;
  const closeList = () => { if (listType) { html += `</${listType}>`; listType = null; } };
  for (const block of top) {
    const inner = renderInlineRange(doc, block.offset, block.offset + block.length);
    if (block.type === 'list_item') {
      const wanted = block.data?.ordered ? 'ol' : 'ul';
      if (listType !== wanted) { closeList(); listType = wanted; html += `<${wanted}>`; }
      html += `<li>${inner}</li>`; continue;
    }
    closeList();
    if (block.type === 'heading') { const level = Math.max(1, Math.min(6, Number(block.data?.level) || 2)); html += `<h${level}>${inner}</h${level}>`; }
    else if (block.type === 'quote') html += `<blockquote>${inner}</blockquote>`;
    else if (block.type === 'code_block') html += `<pre${block.data?.language ? ` data-language="${escapeHtml(block.data.language)}"` : ''}><code>${escapeHtml(doc.text.slice(block.offset, block.offset + block.length))}</code></pre>`;
    else html += `<p>${inner}</p>`;
  }
  closeList(); return html;
}

export function formattedTextToPlainText(value) {
  return normaliseFormattedText(value).text;
}

function markdownInlineRange(doc, start, end) {
  const relevant = doc.entities.filter((entity) => inlineEntity(entity) && entity.offset < end && entity.offset + entity.length > start);
  const points = new Set([start, end]);
  for (const entity of relevant) { points.add(Math.max(start, entity.offset)); points.add(Math.min(end, entity.offset + entity.length)); }
  const boundaries = [...points].sort((a, b) => a - b);
  let output = '';
  const markers = { bold: '**', italic: '_', underline: '__', strikethrough: '~~', code: '`' };
  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const a = boundaries[i]; const b = boundaries[i + 1]; if (b <= a) continue;
    let content = doc.text.slice(a, b);
    const active = relevant.filter((entity) => entity.offset <= a && entity.offset + entity.length >= b);
    for (const entity of active) {
      if (markers[entity.type]) content = `${markers[entity.type]}${content}${markers[entity.type]}`;
      else if (entity.type === 'link' && safeHref(entity.data?.href)) content = `[${content}](${safeHref(entity.data.href)})`;
    }
    output += content;
  }
  return output;
}

export function formattedTextToMarkdown(value) {
  const doc = normaliseFormattedText(value);
  const blocks = doc.entities.filter((entity) => BLOCK_TYPES.has(entity.type)).sort((a, b) => a.offset - b.offset || b.length - a.length);
  if (!blocks.length) return markdownInlineRange(doc, 0, doc.text.length);
  const rendered = [];
  for (const block of blocks) {
    let body = markdownInlineRange(doc, block.offset, block.offset + block.length);
    if (block.type === 'heading') body = `${'#'.repeat(Math.max(1, Math.min(6, Number(block.data?.level) || 2)))} ${body}`;
    else if (block.type === 'quote') body = body.split('\n').map((line) => `> ${line}`).join('\n');
    else if (block.type === 'code_block') body = `\`\`\`${block.data?.language || ''}\n${doc.text.slice(block.offset, block.offset + block.length)}\n\`\`\``;
    else if (block.type === 'list_item') body = `${block.data?.ordered ? '1.' : '-'} ${body}`;
    rendered.push(body);
  }
  return rendered.join('\n\n');
}

export function semanticEntity(type, offset, length, data) {
  if (!ENTITY_TYPES.has(type) || BLOCK_TYPES.has(type)) throw new Error(`Unsupported semantic entity: ${type}`);
  return { type, offset, length, ...(cleanData(data) ? { data: cleanData(data) } : {}) };
}
