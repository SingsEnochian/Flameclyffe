export const CODEX_MAGIC_CHAT_MULTIMODAL_SCHEMA = 'arcsweep.codex-magic-chat-multimodal/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
const MAX_ATTACHMENT_TEXT = 12000;
const MAX_ATTACHMENTS = 8;
const TEXT_EXTENSIONS = new Set(['txt','md','json','js','mjs','cjs','ts','tsx','jsx','py','html','css','csv','xml','yaml','yml','toml','ini','log']);

let installed = false;
let observer = null;
let attachments = [];

const text = (value, max = 4000) => String(value == null ? '' : value).trim().slice(0, max);

function esc(value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function ext(name = '') {
  const part = String(name).split('.').pop();
  return part && part !== name ? part.toLowerCase() : '';
}

function isTextFile(file) {
  return String(file?.type || '').startsWith('text/') || TEXT_EXTENSIONS.has(ext(file?.name || ''));
}

async function normaliseFile(file) {
  const item = {
    id: globalThis.crypto?.randomUUID?.() || `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(file?.name || 'attachment'),
    type: String(file?.type || 'application/octet-stream'),
    size: Number(file?.size || 0),
    kind: String(file?.type || '').startsWith('image/') ? 'image' : isTextFile(file) ? 'text' : 'binary',
    text: null,
    truncated: false,
  };
  if (item.kind === 'text') {
    const raw = await file.text();
    item.truncated = raw.length > MAX_ATTACHMENT_TEXT;
    item.text = raw.slice(0, MAX_ATTACHMENT_TEXT);
  }
  return item;
}

function attachmentContext() {
  if (!attachments.length) return '';
  const sections = attachments.map((item, index) => {
    const header = `ATTACHMENT ${index + 1}: ${item.name} (${item.type || item.kind}, ${item.size} bytes)`;
    if (item.kind === 'text') {
      return `${header}\n${item.truncated ? '[text truncated for context]\n' : ''}${item.text || ''}`;
    }
    if (item.kind === 'image') {
      return `${header}\n[Image is attached to Magic Chat. This receiver pass carries image metadata only; do not claim visual inspection unless a multimodal receiver supplies image content.]`;
    }
    return `${header}\n[Binary attachment metadata only.]`;
  });
  return `MAGIC CHAT ATTACHMENTS\n\n${sections.join('\n\n---\n\n')}`;
}

function composeMessage(message) {
  const body = text(message, 2400);
  const context = attachmentContext();
  return context ? `${body}\n\n${context}` : body;
}

function resident() {
  return globalThis.__arcsweepCodexResident || null;
}

function attachmentMarkup() {
  if (!attachments.length) return '<span class="codex-attachment-empty">No attachments</span>';
  return attachments.map((item) => `<span class="codex-attachment-chip" data-kind="${esc(item.kind)}"><span>${esc(item.name)}</span><small>${item.kind}</small><button type="button" data-codex-attachment-remove="${esc(item.id)}" aria-label="Remove ${esc(item.name)}">×</button></span>`).join('');
}

function ensureStyles() {
  if (document.getElementById('codex-magic-chat-multimodal-styles')) return;
  const style = document.createElement('style');
  style.id = 'codex-magic-chat-multimodal-styles';
  style.textContent = `
    #${ROOT_ID} .codex-chat-tools{display:grid;gap:7px;padding:8px 14px;border-top:1px solid rgba(218,171,84,.14);background:rgba(255,255,255,.018)}
    #${ROOT_ID} .codex-chat-tool-row{display:flex;flex-wrap:wrap;align-items:center;gap:7px}
    #${ROOT_ID} .codex-chat-tool-row>button,#${ROOT_ID} .codex-file-label{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(218,171,84,.22);border-radius:9px;padding:6px 8px;background:rgba(255,255,255,.035);color:inherit;font:inherit;font-size:11px;cursor:pointer}
    #${ROOT_ID} .codex-file-label input{display:none}
    #${ROOT_ID} .codex-attachment-list{display:flex;flex-wrap:wrap;gap:6px;min-height:25px;align-items:center}
    #${ROOT_ID} .codex-attachment-chip{display:inline-flex;align-items:center;gap:5px;max-width:100%;padding:4px 6px;border:1px solid rgba(91,140,164,.22);border-radius:999px;background:rgba(91,140,164,.07);font-size:10px}
    #${ROOT_ID} .codex-attachment-chip span{max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap} #${ROOT_ID} .codex-attachment-chip small{opacity:.55}
    #${ROOT_ID} .codex-attachment-chip button{border:0;background:none;color:inherit;padding:0 2px;cursor:pointer} #${ROOT_ID} .codex-attachment-empty{font-size:10px;opacity:.48}
    #${ROOT_ID} .codex-context-meter{margin-left:auto;font-size:10px;opacity:.58}
  `;
  document.head.append(style);
}

function ensureTools() {
  const chat = document.getElementById(ROOT_ID)?.querySelector('[data-codex-magic-chat]');
  const form = chat?.querySelector('[data-codex-chat-form]');
  if (!chat || !form) return null;
  let tools = chat.querySelector('[data-codex-chat-tools]');
  if (!tools) {
    tools = document.createElement('section');
    tools.className = 'codex-chat-tools';
    tools.dataset.codexChatTools = CODEX_MAGIC_CHAT_MULTIMODAL_SCHEMA;
    form.insertAdjacentElement('beforebegin', tools);
  }
  const state = resident()?.state?.() || {};
  const threadCount = Array.isArray(state.thread) ? state.thread.length : 0;
  tools.innerHTML = `
    <div class="codex-chat-tool-row">
      <label class="codex-file-label">＋ Attach<input type="file" data-codex-file-input multiple accept="image/*,text/*,.md,.json,.js,.mjs,.cjs,.ts,.tsx,.jsx,.py,.html,.css,.csv,.xml,.yaml,.yml,.toml,.ini,.log"></label>
      <button type="button" data-codex-copy-last>Copy last reply</button>
      <button type="button" data-codex-export-chat>Export thread</button>
      <span class="codex-context-meter">${threadCount}/40 resident turns · smart window</span>
    </div>
    <div class="codex-attachment-list" data-codex-attachment-list>${attachmentMarkup()}</div>`;
  return tools;
}

function refresh() {
  ensureTools();
}

async function handleFiles(input) {
  const selected = [...(input?.files || [])].slice(0, Math.max(0, MAX_ATTACHMENTS - attachments.length));
  for (const file of selected) {
    try { attachments.push(await normaliseFile(file)); }
    catch { attachments.push({ id: `attachment-${Date.now()}-${Math.random()}`, name: file.name, type: file.type, size: file.size, kind: 'binary', text: null, truncated: false }); }
  }
  attachments = attachments.slice(0, MAX_ATTACHMENTS);
  if (input) input.value = '';
  refresh();
}

async function copyLastReply() {
  const state = resident()?.state?.() || {};
  const turns = Array.isArray(state.thread) ? state.thread : [];
  const last = [...turns].reverse().find((item) => item?.role === 'assistant' && item?.content);
  if (!last?.content) return;
  try { await navigator.clipboard.writeText(String(last.content)); }
  catch {}
}

function exportThread() {
  const api = resident();
  if (!api) return;
  const payload = {
    schema: 'arcsweep.codex-magic-chat-export/v0.1',
    exported_at: new Date().toISOString(),
    context: api.context?.() || null,
    resident_state: api.state?.() || null,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `universal-codex-magic-chat-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function handleClick(event) {
  const remove = event.target.closest?.('[data-codex-attachment-remove]');
  if (remove) {
    attachments = attachments.filter((item) => item.id !== remove.dataset.codexAttachmentRemove);
    refresh();
    return;
  }
  if (event.target.closest?.('[data-codex-copy-last]')) { void copyLastReply(); return; }
  if (event.target.closest?.('[data-codex-export-chat]')) exportThread();
}

function handleChange(event) {
  const input = event.target.closest?.('[data-codex-file-input]');
  if (input) void handleFiles(input);
}

function handleSubmitCapture(event) {
  const form = event.target.closest?.('[data-codex-chat-form]');
  if (!form || !attachments.length) return;
  const api = resident();
  if (!api?.speak) return;
  const input = form.elements?.message;
  const message = text(input?.value, 2400);
  if (!message) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (input) input.value = '';
  const payload = composeMessage(message);
  attachments = [];
  refresh();
  void api.speak(payload, { source: 'magic-chat-multimodal' });
}

function install() {
  if (installed || typeof document === 'undefined') return installed;
  installed = true;
  ensureStyles();
  document.addEventListener('submit', handleSubmitCapture, true);
  document.addEventListener('change', handleChange);
  document.addEventListener('click', handleClick);
  globalThis.addEventListener?.('arcsweep:codex-resident-ready', refresh);
  globalThis.addEventListener?.('arcsweep:codex-resident-response', refresh);
  globalThis.addEventListener?.('arcsweep:magic-book-receipt', refresh);
  observer = new MutationObserver(refresh);
  observer.observe(document.body, { childList: true, subtree: true });
  refresh();
  globalThis.__arcsweepCodexMagicChat = Object.freeze({
    schema: CODEX_MAGIC_CHAT_MULTIMODAL_SCHEMA,
    attachments: () => attachments.map((item) => ({ id: item.id, name: item.name, type: item.type, size: item.size, kind: item.kind, truncated: item.truncated })),
    clear_attachments() { attachments = []; refresh(); },
    export_thread: exportThread,
  });
  return true;
}

install();
globalThis.addEventListener?.('pagehide', () => observer?.disconnect(), { once: true });
