const RICH_TEXT_MARKER = '<!--arcsweep-richtext-v1-->';

const ALLOWED_TAGS = new Set([
  'A', 'B', 'BLOCKQUOTE', 'BR', 'DIV', 'EM', 'H1', 'H2', 'H3', 'I',
  'LI', 'OL', 'P', 'S', 'SPAN', 'STRONG', 'U', 'UL',
]);

const TOOLBAR_ITEMS = Object.freeze([
  { label: 'B', title: 'Bold (Ctrl/Cmd+B)', command: 'bold', state: 'bold' },
  { label: 'I', title: 'Italic (Ctrl/Cmd+I)', command: 'italic', state: 'italic' },
  { label: 'U', title: 'Underline (Ctrl/Cmd+U)', command: 'underline', state: 'underline' },
  { label: 'Link', title: 'Link (Ctrl/Cmd+K)', command: 'link' },
  { separator: true },
  { label: 'H2', title: 'Heading', command: 'formatBlock', value: 'H2' },
  { label: '¶', title: 'Paragraph', command: 'formatBlock', value: 'P' },
  { label: '❝', title: 'Block quote', command: 'formatBlock', value: 'BLOCKQUOTE' },
  { separator: true },
  { label: '• List', title: 'Bulleted list', command: 'insertUnorderedList', state: 'insertUnorderedList' },
  { label: '1. List', title: 'Numbered list', command: 'insertOrderedList', state: 'insertOrderedList' },
  { separator: true },
  { label: '↶', title: 'Undo', command: 'undo' },
  { label: '↷', title: 'Redo', command: 'redo' },
]);

export function isRichTextPayload(value = '') {
  return String(value).startsWith(RICH_TEXT_MARKER);
}

export function encodeRichTextPayload(html = '') {
  return `${RICH_TEXT_MARKER}${String(html)}`;
}

export function decodeRichTextPayload(value = '') {
  const source = String(value);
  if (isRichTextPayload(source)) {
    return { format: 'html', html: source.slice(RICH_TEXT_MARKER.length) };
  }
  return { format: 'plain', text: source };
}

function safeHref(value = '') {
  const href = String(value).trim();
  if (!href) return '';
  if (href.startsWith('#') || href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) return href;
  try {
    const parsed = new URL(href, window.location.href);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol) ? href : '';
  } catch {
    return '';
  }
}

function sanitizeRichHtml(html = '') {
  const template = document.createElement('template');
  template.innerHTML = String(html);
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
  const elements = [];
  while (walker.nextNode()) elements.push(walker.currentNode);

  for (const element of elements) {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      continue;
    }

    for (const attribute of [...element.attributes]) {
      if (element.tagName === 'A' && attribute.name.toLowerCase() === 'href') continue;
      element.removeAttribute(attribute.name);
    }

    if (element.tagName === 'A') {
      const href = safeHref(element.getAttribute('href'));
      if (href) element.setAttribute('href', href);
      else element.removeAttribute('href');
    }
  }
  return template.innerHTML;
}

function richTextSelectors() {
  return [
    '#script-form textarea[name="content"]',
    '#record-form[data-room-id="records"] textarea[name="content"]',
  ].join(',');
}

function toolbarMarkup() {
  return TOOLBAR_ITEMS.map((item) => {
    if (item.separator) return '<span class="richtext-separator" aria-hidden="true"></span>';
    const value = item.value ? ` data-value="${item.value}"` : '';
    const state = item.state ? ` data-state-command="${item.state}"` : '';
    return `<button type="button" class="richtext-tool" data-richtext-command="${item.command}"${value}${state} title="${item.title}" aria-label="${item.title}">${item.label}</button>`;
  }).join('');
}

function editorLabel(textarea) {
  const label = textarea.closest('label');
  if (!label) return textarea.name || 'Rich text editor';
  const textNode = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  return textNode?.textContent.trim() || textarea.name || 'Rich text editor';
}

function setInitialContent(editor, textarea) {
  const decoded = decodeRichTextPayload(textarea.value);
  if (decoded.format === 'html') editor.innerHTML = sanitizeRichHtml(decoded.html);
  else editor.textContent = decoded.text;
}

function syncSource(editor, textarea) {
  textarea.value = encodeRichTextPayload(sanitizeRichHtml(editor.innerHTML));
}

function updateToolbarState(shell) {
  const editor = shell.querySelector('.arcsweep-richtext-editor');
  if (!editor || document.activeElement !== editor) return;
  shell.querySelectorAll('[data-state-command]').forEach((button) => {
    let active = false;
    try { active = document.queryCommandState(button.dataset.stateCommand); } catch {}
    button.classList.toggle('active', Boolean(active));
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function promptForLink(editor) {
  const href = window.prompt('Link address');
  if (href === null) return;
  const safe = safeHref(href);
  if (!safe) return;
  editor.focus();
  document.execCommand('createLink', false, safe);
}

function runCommand(shell, button) {
  const editor = shell.querySelector('.arcsweep-richtext-editor');
  const textarea = shell.previousElementSibling?.matches('textarea') ? shell.previousElementSibling : null;
  if (!editor || !textarea) return;

  const command = button.dataset.richtextCommand;
  editor.focus();
  if (command === 'link') promptForLink(editor);
  else document.execCommand(command, false, button.dataset.value || null);
  syncSource(editor, textarea);
  updateToolbarState(shell);
}

function insertSanitizedPaste(editor, event) {
  const clipboard = event.clipboardData;
  if (!clipboard) return;
  event.preventDefault();
  const html = clipboard.getData('text/html');
  const text = clipboard.getData('text/plain');
  if (html) document.execCommand('insertHTML', false, sanitizeRichHtml(html));
  else document.execCommand('insertText', false, text);
}

function handleShortcut(editor, event) {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return false;
  const key = event.key.toLowerCase();
  const commands = { b: 'bold', i: 'italic', u: 'underline' };
  if (commands[key]) {
    event.preventDefault();
    document.execCommand(commands[key], false, null);
    return true;
  }
  if (key === 'k') {
    event.preventDefault();
    promptForLink(editor);
    return true;
  }
  if (event.shiftKey && key === '7') {
    event.preventDefault();
    document.execCommand('insertOrderedList', false, null);
    return true;
  }
  if (event.shiftKey && key === '8') {
    event.preventDefault();
    document.execCommand('insertUnorderedList', false, null);
    return true;
  }
  return false;
}

function upgradeTextarea(textarea) {
  if (textarea.dataset.richTextUpgraded === 'true') return;
  textarea.dataset.richTextUpgraded = 'true';
  textarea.dataset.richTextRequired = textarea.required ? 'true' : 'false';
  textarea.required = false;
  textarea.classList.add('richtext-source-field');

  const shell = document.createElement('div');
  shell.className = 'arcsweep-richtext-shell';
  shell.innerHTML = `
    <div class="arcsweep-richtext-toolbar" role="toolbar" aria-label="Text formatting">${toolbarMarkup()}</div>
    <div class="arcsweep-richtext-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${editorLabel(textarea).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}" spellcheck="true"></div>
  `;
  textarea.insertAdjacentElement('afterend', shell);

  const editor = shell.querySelector('.arcsweep-richtext-editor');
  setInitialContent(editor, textarea);
  syncSource(editor, textarea);

  shell.querySelectorAll('[data-richtext-command]').forEach((button) => {
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => runCommand(shell, button));
  });

  editor.addEventListener('input', () => {
    editor.classList.remove('invalid');
    syncSource(editor, textarea);
    updateToolbarState(shell);
  });
  editor.addEventListener('keydown', (event) => {
    if (handleShortcut(editor, event)) {
      syncSource(editor, textarea);
      updateToolbarState(shell);
    }
  });
  editor.addEventListener('paste', (event) => {
    insertSanitizedPaste(editor, event);
    syncSource(editor, textarea);
  });
  editor.addEventListener('focus', () => updateToolbarState(shell));
}

function upgradeAll(root = document) {
  root.querySelectorAll(richTextSelectors()).forEach(upgradeTextarea);
}

function injectStyles() {
  if (document.querySelector('#arcsweep-richtext-styles')) return;
  const style = document.createElement('style');
  style.id = 'arcsweep-richtext-styles';
  style.textContent = `
    .richtext-source-field {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0,0,0,0) !important;
      white-space: nowrap !important;
      border: 0 !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
    .arcsweep-richtext-shell {
      display: grid;
      gap: .55rem;
      margin-top: .45rem;
      width: 100%;
    }
    .arcsweep-richtext-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: .32rem;
      padding: .42rem;
      border: 1px solid color-mix(in srgb, var(--gold) 30%, transparent);
      border-radius: .7rem;
      background: color-mix(in srgb, var(--panel-solid) 86%, transparent);
    }
    .richtext-tool {
      min-width: 2.25rem;
      min-height: 2.1rem;
      padding: .32rem .55rem;
      border-radius: .48rem;
      font: inherit;
      line-height: 1;
    }
    .richtext-tool[data-richtext-command="bold"] { font-weight: 800; }
    .richtext-tool[data-richtext-command="italic"] { font-style: italic; }
    .richtext-tool[data-richtext-command="underline"] { text-decoration: underline; }
    .richtext-tool.active {
      outline: 2px solid var(--gold);
      outline-offset: 1px;
    }
    .richtext-separator {
      width: 1px;
      align-self: stretch;
      min-height: 1.7rem;
      margin: 0 .12rem;
      background: color-mix(in srgb, var(--text) 22%, transparent);
    }
    .arcsweep-richtext-editor {
      box-sizing: border-box;
      width: 100%;
      min-height: 15rem;
      padding: .9rem 1rem;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      border: 1px solid color-mix(in srgb, var(--text) 22%, transparent);
      border-radius: .75rem;
      background: color-mix(in srgb, var(--bg) 72%, var(--panel-solid));
      color: var(--text);
      font: inherit;
      line-height: 1.65;
      outline: none;
    }
    #script-form .arcsweep-richtext-editor { min-height: 32rem; }
    .arcsweep-richtext-editor:focus {
      border-color: var(--gold);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--gold) 24%, transparent);
    }
    .arcsweep-richtext-editor.invalid {
      border-color: #d96c6c;
      box-shadow: 0 0 0 2px rgba(217,108,108,.2);
    }
    .arcsweep-richtext-editor h1,
    .arcsweep-richtext-editor h2,
    .arcsweep-richtext-editor h3 { margin: 1em 0 .45em; line-height: 1.2; }
    .arcsweep-richtext-editor p { margin: .7em 0; }
    .arcsweep-richtext-editor blockquote {
      margin: 1em 0;
      padding-left: 1rem;
      border-left: 3px solid var(--gold);
      opacity: .94;
    }
    .arcsweep-richtext-editor a { color: var(--green); text-decoration: underline; }
  `;
  document.head.append(style);
}

export function installRichTextCore() {
  injectStyles();
  upgradeAll();

  const app = document.querySelector('#app');
  if (app) {
    new MutationObserver(() => upgradeAll(app)).observe(app, { childList: true, subtree: true });
  }

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const editors = [...form.querySelectorAll('.arcsweep-richtext-editor')];
    for (const editor of editors) {
      const shell = editor.closest('.arcsweep-richtext-shell');
      const textarea = shell?.previousElementSibling?.matches('textarea') ? shell.previousElementSibling : null;
      if (!textarea) continue;
      syncSource(editor, textarea);
      if (textarea.dataset.richTextRequired === 'true' && !editor.textContent.trim()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        editor.classList.add('invalid');
        editor.focus();
        return;
      }
    }
  }, true);

  document.addEventListener('selectionchange', () => {
    const editor = document.activeElement?.closest?.('.arcsweep-richtext-editor');
    const shell = editor?.closest('.arcsweep-richtext-shell');
    if (shell) updateToolbarState(shell);
  });
}

if (typeof document !== 'undefined') installRichTextCore();
