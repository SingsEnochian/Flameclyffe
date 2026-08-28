import { CONSTELLATION_VOICES } from './feedback-loop.js';
import { appendHouseCommons, readHouseCommons, readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';
import { publishModelPresence } from './model-presence-bus.js';
import { readActiveRuntimeWorldContext } from './runtime-world-context.js';
import { streamConstellationRuntimeVoice } from './flame-chat-stream-client.js';
import { readHouseRooms, markHouseRoomRead, upsertHouseRoom, roomUnreadCount } from './house-room-client.js';
import { uploadHouseAttachment, openHouseAttachment } from './house-attachment-client.js';
import {
  escapeHtml,
  houseModelPlainText,
  insertHouseHtmlAtSelection,
  linkHouseSelection,
  renderHouseModelRichText,
  sanitizeHouseRichHtml,
  setHouseBlock,
  toggleHouseList,
  wrapHouseSelection,
} from './house-chat-rich-text.js';
import {
  HOUSE_CHAT_ACTIVE_ROOM_KEY,
  HOUSE_CHAT_DRAFT_HTML_KEY,
  HOUSE_CHAT_DRAFT_TEXT_KEY,
  HOUSE_CHAT_HOME_ROOM_ID,
  HOUSE_CHAT_REPLY_KEY,
  HOUSE_CHAT_SELECTION_KEY,
  commonsThreadId,
  createOptimisticStewardEntry,
  defaultVoiceIds,
  directRoomSeed,
  latestRoomEntry,
  normaliseVoiceSelection,
  parseHouseMentions,
  roomContext,
  roomEntries,
  roomLabel,
  uuid,
  voiceName,
} from './house-commons-chat-v5-core.js';

const REFRESH_MS = 4000;
const PINS_KEY = 'arcsweep.house-commons-pins/v1';
const TOOLBAR = Object.freeze([
  ['B', 'Bold', 'strong'], ['I', 'Italic', 'em'], ['U', 'Underline', 'u'],
  ['Link', 'Link', 'link'], ['H2', 'Heading', 'h2'], ['¶', 'Paragraph', 'p'],
  ['❝', 'Quote', 'blockquote'], ['Code', 'Code block', 'pre'], ['• List', 'Bulleted list', 'ul'], ['1. List', 'Numbered list', 'ol'],
]);

let installed = false;
let observer = null;
let refreshTimer = null;
let refreshInFlight = null;
let entries = [];
let rooms = [];
let reads = [];
let activeRoomId = '';
let replyTarget = null;
let optimisticEntries = new Map();
let pendingAttachments = [];
let attachmentUploads = new Map();
let streamingTurns = new Map();
let streamControllers = new Map();
let sending = false;
let searchQuery = '';
let pinnedOnly = false;
let lastSignature = '';
let lastLog = null;
let readMarkTimer = null;

const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
const writeJson = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
const activeSession = () => readHouseRuntimeToken() || restoreHouseRuntimeSession();
const voiceCheckboxes = (form) => [...form.querySelectorAll('input[name="voiceIds"]')];
const readSelection = () => normaliseVoiceSelection(readJson(HOUSE_CHAT_SELECTION_KEY, null));
const writeSelection = (ids) => { const value = normaliseVoiceSelection(ids); writeJson(HOUSE_CHAT_SELECTION_KEY, value); return value; };
const currentPins = () => new Set(readJson(PINS_KEY, []));
const setPins = (pins) => writeJson(PINS_KEY, [...pins]);
const mergedEntries = () => [...entries, ...optimisticEntries.values()].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));

function readDraft() {
  try { return { text: localStorage.getItem(HOUSE_CHAT_DRAFT_TEXT_KEY) || '', html: localStorage.getItem(HOUSE_CHAT_DRAFT_HTML_KEY) || '' }; }
  catch { return { text: '', html: '' }; }
}
function writeDraft(text, html) {
  try {
    text ? localStorage.setItem(HOUSE_CHAT_DRAFT_TEXT_KEY, text) : localStorage.removeItem(HOUSE_CHAT_DRAFT_TEXT_KEY);
    text ? localStorage.setItem(HOUSE_CHAT_DRAFT_HTML_KEY, html) : localStorage.removeItem(HOUSE_CHAT_DRAFT_HTML_KEY);
  } catch {}
}
function readActiveRoom() { try { return localStorage.getItem(HOUSE_CHAT_ACTIVE_ROOM_KEY) || ''; } catch { return ''; } }
function persistActiveRoom(id) { activeRoomId = String(id || '').trim(); try { activeRoomId ? localStorage.setItem(HOUSE_CHAT_ACTIVE_ROOM_KEY, activeRoomId) : localStorage.removeItem(HOUSE_CHAT_ACTIVE_ROOM_KEY); } catch {} }
function rememberReply(target) { replyTarget = target || null; writeJson(HOUSE_CHAT_REPLY_KEY, replyTarget ? { id: replyTarget.id, thread_id: commonsThreadId(replyTarget), author: replyTarget.author, text: replyTarget.text } : null); }
function restoreReply() { const saved = readJson(HOUSE_CHAT_REPLY_KEY, null); replyTarget = saved?.id ? entries.find((entry) => entry.id === saved.id) || saved : null; }

function syncAll(form) {
  const all = form.querySelector('[data-commons-all]');
  const checks = voiceCheckboxes(form);
  if (!all || !checks.length) return;
  const count = checks.filter((input) => input.checked).length;
  all.checked = count === checks.length;
  all.indeterminate = count > 0 && count < checks.length;
}
function installAll(form) {
  const fieldset = form.querySelector('fieldset');
  if (!fieldset || fieldset.querySelector('[data-commons-all]')) return;
  const label = document.createElement('label');
  label.className = 'checkbox commons-all-control';
  label.innerHTML = '<input type="checkbox" data-commons-all /> <span><b>All Constellation</b><small>Everyone may answer an unmentioned turn</small></span>';
  fieldset.insertBefore(label, fieldset.querySelector('.voice-grid') || fieldset.firstChild);
  label.querySelector('input').addEventListener('change', (event) => {
    voiceCheckboxes(form).forEach((input) => { input.checked = event.target.checked; });
    writeSelection(voiceCheckboxes(form).filter((input) => input.checked).map((input) => input.value));
    syncAll(form);
  });
}

function toolbarMarkup() {
  return TOOLBAR.map(([label, title, command]) => `<button type="button" class="quiet mini commons-native-tool" data-v5-rich="${command}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${label}</button>`).join('');
}
function composerParts(form) {
  return {
    textarea: form?.elements?.namedItem?.('message'),
    shell: form?.querySelector('[data-commons-native-composer]'),
    editor: form?.querySelector('[data-commons-native-editor]'),
  };
}
function syncComposer(form) {
  const { textarea, editor } = composerParts(form);
  if (!(textarea instanceof HTMLTextAreaElement) || !editor) return { text: '', richTextHtml: '' };
  editor.querySelectorAll('*').forEach((node) => { if (node.textContent === '\u200b') node.textContent = ''; });
  const text = String(editor.innerText || '').replaceAll('\u00a0', ' ').replaceAll('\u200b', '').trimEnd();
  const richTextHtml = sanitizeHouseRichHtml(editor.innerHTML);
  textarea.dataset.commonsSyncing = 'true'; textarea.value = text; delete textarea.dataset.commonsSyncing;
  writeDraft(text, richTextHtml);
  return { text: text.trim(), richTextHtml };
}
function setComposer(form, text = '', html = '') {
  const { textarea, editor } = composerParts(form);
  if (!(textarea instanceof HTMLTextAreaElement) || !editor) return;
  editor.innerHTML = html ? sanitizeHouseRichHtml(html) : '';
  if (!html && text) editor.textContent = text;
  textarea.value = text;
  writeDraft(text, editor.innerHTML);
}
function focusComposer(form = document.querySelector('#commons-form')) {
  form?.querySelector('[data-commons-native-editor]')?.focus();
}
function renderReplyBanner(form) {
  const banner = form?.querySelector('[data-commons-reply-banner]');
  if (!banner) return;
  banner.hidden = !replyTarget;
  if (replyTarget) banner.querySelector('[data-commons-reply-text]').textContent = `Replying to ${replyTarget.author || 'House'} · ${String(replyTarget.text || '').slice(0, 140)}`;
}
function attachmentChip(item) {
  const progress = item.state && item.state !== 'complete' ? ` · ${item.state}` : '';
  const size = Number.isFinite(Number(item.size)) ? ` · ${Math.ceil(Number(item.size) / 1024)} KiB` : '';
  return `<span class="commons-pending-attachment" data-pending-attachment="${escapeHtml(item.tempId || item.id || '')}"><span>${escapeHtml(item.name || 'attachment')}${escapeHtml(size)}${escapeHtml(progress)}</span><button type="button" class="quiet mini" data-remove-pending="${escapeHtml(item.tempId || item.id || '')}">×</button></span>`;
}
function renderAttachmentQueue(form) {
  const host = form?.querySelector('[data-commons-pending-attachments]');
  if (!host) return;
  host.innerHTML = pendingAttachments.map(attachmentChip).join('');
  host.querySelectorAll('[data-remove-pending]').forEach((button) => {
    button.onclick = () => {
      const id = button.dataset.removePending;
      if (attachmentUploads.has(id)) return;
      pendingAttachments = pendingAttachments.filter((item) => (item.tempId || item.id) !== id);
      renderAttachmentQueue(form);
    };
  });
}
async function queueFiles(form, files) {
  for (const file of [...files].filter(Boolean)) {
    const tempId = `upload:${uuid()}`;
    pendingAttachments.push({ tempId, name: file.name, type: file.type, size: file.size, state: 'queued' });
    renderAttachmentQueue(form);
    const promise = uploadHouseAttachment(file, {
      onProgress(info) {
        const item = pendingAttachments.find((entry) => entry.tempId === tempId);
        if (item) { item.state = info.state; renderAttachmentQueue(form); }
      },
    }).then((saved) => {
      const index = pendingAttachments.findIndex((entry) => entry.tempId === tempId);
      if (index >= 0) pendingAttachments[index] = { ...saved, tempId, state: 'complete' };
      renderAttachmentQueue(form);
      return saved;
    }).catch((error) => {
      const item = pendingAttachments.find((entry) => entry.tempId === tempId);
      if (item) item.state = `error: ${error.message}`;
      renderAttachmentQueue(form);
      throw error;
    }).finally(() => attachmentUploads.delete(tempId));
    attachmentUploads.set(tempId, promise);
  }
}
async function settleAttachments() {
  if (attachmentUploads.size) await Promise.allSettled([...attachmentUploads.values()]);
  return pendingAttachments.filter((item) => item.id && item.state === 'complete').map(({ tempId, state, ...item }) => item);
}

function installComposer(form) {
  const textarea = form.elements?.namedItem?.('message');
  if (!(textarea instanceof HTMLTextAreaElement) || form.querySelector('[data-commons-native-composer]')) return;
  textarea.classList.add('commons-native-source'); textarea.required = false;
  const shell = document.createElement('div'); shell.className = 'commons-native-composer'; shell.dataset.commonsNativeComposer = 'true';
  shell.innerHTML = `<div class="commons-reply-banner" data-commons-reply-banner hidden><span data-commons-reply-text></span><button type="button" class="quiet mini" data-commons-reply-clear>Cancel reply</button></div><div class="commons-native-toolbar" data-commons-toolbar role="toolbar" aria-label="Message formatting">${toolbarMarkup()}<button type="button" class="quiet mini" data-commons-attach-files>Attach</button><input type="file" multiple hidden data-commons-attachment-input /></div><div class="commons-pending-attachments" data-commons-pending-attachments></div><div class="commons-native-editor" data-commons-native-editor contenteditable="true" role="textbox" aria-multiline="true" aria-label="Message" spellcheck="true"></div><small class="muted">Enter sends · Shift+Enter adds a line · rich text is native · @name routes directly.</small>`;
  textarea.insertAdjacentElement('afterend', shell);
  const editor = shell.querySelector('[data-commons-native-editor]');
  const draft = readDraft();
  draft.html ? editor.insertAdjacentHTML('afterbegin', sanitizeHouseRichHtml(draft.html)) : editor.append(document.createTextNode(draft.text || textarea.value));
  shell.querySelectorAll('[data-v5-rich]').forEach((button) => {
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => {
      const command = button.dataset.v5Rich;
      if (['strong', 'em', 'u'].includes(command)) wrapHouseSelection(editor, command);
      else if (command === 'link') {
        const href = window.prompt('Link address'); if (href != null) linkHouseSelection(editor, href);
      } else if (command === 'ul') toggleHouseList(editor, false);
      else if (command === 'ol') toggleHouseList(editor, true);
      else setHouseBlock(editor, command);
      syncComposer(form);
    });
  });
  shell.querySelector('[data-commons-reply-clear]').onclick = () => { rememberReply(null); renderReplyBanner(form); focusComposer(form); };
  const picker = shell.querySelector('[data-commons-attachment-input]');
  shell.querySelector('[data-commons-attach-files]').onclick = () => picker.click();
  picker.onchange = () => { void queueFiles(form, picker.files); picker.value = ''; };
  editor.addEventListener('input', () => syncComposer(form));
  editor.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault(); form.requestSubmit();
  });
  editor.addEventListener('paste', (event) => {
    const files = [...(event.clipboardData?.files || [])];
    if (files.length) { event.preventDefault(); void queueFiles(form, files); return; }
    const html = event.clipboardData?.getData('text/html');
    const plain = event.clipboardData?.getData('text/plain') || '';
    if (!html && !plain) return;
    event.preventDefault();
    insertHouseHtmlAtSelection(editor, html || `<p>${escapeHtml(plain).replaceAll('\n', '<br>')}</p>`);
    syncComposer(form);
  });
  shell.addEventListener('dragover', (event) => { if ([...(event.dataTransfer?.items || [])].some((item) => item.kind === 'file')) { event.preventDefault(); shell.classList.add('commons-drop-active'); } });
  shell.addEventListener('dragleave', () => shell.classList.remove('commons-drop-active'));
  shell.addEventListener('drop', (event) => { const files = [...(event.dataTransfer?.files || [])]; if (!files.length) return; event.preventDefault(); shell.classList.remove('commons-drop-active'); void queueFiles(form, files); });
  textarea.addEventListener('focus', () => queueMicrotask(() => focusComposer(form)));
  textarea.addEventListener('input', () => {
    if (textarea.dataset.commonsSyncing === 'true') return;
    if (!textarea.value) setComposer(form);
    else if (String(editor.innerText || '').trim() !== textarea.value.trim()) setComposer(form, textarea.value);
  });
  syncComposer(form); renderAttachmentQueue(form); renderReplyBanner(form);
}

function roomRead(roomId) { return reads.find((item) => item.room_id === roomId) || null; }
function activeRoom() { return rooms.find((room) => room.id === activeRoomId) || rooms[0] || { id: HOUSE_CHAT_HOME_ROOM_ID, slug: 'constellation', title: 'Constellation', kind: 'channel', participants: defaultVoiceIds() }; }
function chooseActiveRoom() {
  const preferred = readActiveRoom();
  const available = new Set(rooms.filter((room) => !room.archived).map((room) => room.id));
  persistActiveRoom(available.has(preferred) ? preferred : available.has(HOUSE_CHAT_HOME_ROOM_ID) ? HOUSE_CHAT_HOME_ROOM_ID : rooms.find((room) => !room.archived)?.id || HOUSE_CHAT_HOME_ROOM_ID);
}
async function loadRooms() {
  try {
    const data = await readHouseRooms();
    rooms = Array.isArray(data?.rooms) ? data.rooms : [];
    reads = Array.isArray(data?.reads) ? data.reads : [];
  } catch {
    rooms = rooms.length ? rooms : [{ id: HOUSE_CHAT_HOME_ROOM_ID, slug: 'constellation', title: 'Constellation', kind: 'channel', participants: defaultVoiceIds(), archived: false }];
  }
  chooseActiveRoom();
}
async function switchRoom(id) {
  if (!rooms.some((room) => room.id === id && !room.archived)) return;
  persistActiveRoom(id); rememberReply(null); searchQuery = ''; pinnedOnly = false; renderLog({ scroll: true }); renderReplyBanner(document.querySelector('#commons-form')); scheduleReadMark();
}
async function createConversationRoom() {
  const room = await upsertHouseRoom({
    id: `house-room:conversation:${uuid()}`,
    slug: `conversation-${new Date().toISOString().slice(11, 16).replace(':', '')}`,
    title: `Conversation ${new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
    topic: 'House conversation.', kind: 'channel', participants: defaultVoiceIds(), world_id: null,
  });
  rooms.push(room); await switchRoom(room.id); renderLog();
}
async function createDirectRoom(form) {
  const selected = voiceCheckboxes(form).filter((input) => input.checked).map((input) => input.value);
  if (selected.length !== 1) { const node = document.querySelector('[data-commons-connection]'); if (node) node.textContent = 'Select exactly one Flame for a direct room.'; return; }
  const seed = directRoomSeed(selected[0]); if (!seed) return;
  const room = await upsertHouseRoom(seed);
  const index = rooms.findIndex((item) => item.id === room.id); index >= 0 ? rooms.splice(index, 1, room) : rooms.push(room);
  await switchRoom(room.id); renderLog();
}

function entryBody(entry) {
  if (entry?.rich_text_html) { const safe = sanitizeHouseRichHtml(entry.rich_text_html); if (safe) return safe; }
  return renderHouseModelRichText(entry?.text || '');
}
function attachmentMarkup(entry) {
  if (!entry?.attachments?.length) return '';
  return `<div class="commons-links">${entry.attachments.map((attachment) => `<button type="button" class="commons-link-chip" data-attachment-chip="${escapeHtml(attachment.id)}">${escapeHtml(attachment.name)}${attachment.size != null ? ` · ${Math.ceil(attachment.size / 1024)} KiB` : ''}</button>`).join('')}</div>`;
}
function renderEntry(entry) {
  const stamp = entry.created_at ? new Date(entry.created_at).toLocaleString() : '';
  const parent = entry.reply_to ? mergedEntries().find((item) => item.id === entry.reply_to) : null;
  const runtime = entry.runtime ? [entry.runtime.provider, entry.runtime.model, entry.runtime.latency_ms != null ? `${entry.runtime.latency_ms} ms` : null].filter(Boolean).join(' · ') : '';
  const pinned = currentPins().has(entry.id);
  const failed = entry.optimistic && entry.status === 'failed';
  return `<article class="commons-chat-entry${entry.optimistic ? ' commons-optimistic' : ''}" data-entry-id="${escapeHtml(entry.id || '')}" data-thread-id="${escapeHtml(commonsThreadId(entry) || '')}" data-kind="${escapeHtml(entry.kind || 'system')}">${parent ? `<button type="button" class="commons-reply-context" data-jump-parent="${escapeHtml(parent.id)}">↳ ${escapeHtml(parent.author || 'House')}: ${escapeHtml(String(parent.text || '').slice(0, 120))}</button>` : ''}<header><strong>${escapeHtml(entry.author || 'House')}</strong><span>${escapeHtml([stamp, entry.status, runtime].filter(Boolean).join(' · '))}</span><div>${failed ? `<button type="button" class="quiet mini" data-retry-optimistic="${escapeHtml(entry.turn_id || '')}">Retry</button>` : ''}<button type="button" class="quiet mini" data-reply-entry="${escapeHtml(entry.id || '')}">Reply</button><button type="button" class="quiet mini" data-pin-entry="${escapeHtml(entry.id || '')}">${pinned ? 'Unpin' : 'Pin'}</button><button type="button" class="quiet mini" data-copy-entry="${escapeHtml(entry.id || '')}">Copy</button></div></header><div class="commons-chat-body">${entryBody(entry)}</div>${attachmentMarkup(entry)}</article>`;
}
function streamingMarkup(stream) {
  return `<article class="commons-chat-entry commons-streaming" data-kind="voice" data-stream-key="${escapeHtml(stream.key)}"><header><strong>${escapeHtml(voiceName(stream.voiceId))}</strong><span>${escapeHtml([stream.state, stream.provider, stream.model].filter(Boolean).join(' · '))}</span><div><button type="button" class="quiet mini" data-cancel-stream="${escapeHtml(stream.key)}">Cancel</button></div></header><div class="commons-chat-body" data-stream-body>${escapeHtml(stream.text || '')}<span class="commons-stream-cursor" aria-hidden="true">▍</span></div></article>`;
}
function roomOptions() {
  return rooms.filter((room) => !room.archived).map((room) => `<option value="${escapeHtml(room.id)}" ${room.id === activeRoomId ? 'selected' : ''}>${escapeHtml(roomLabel(room, room.id === activeRoomId ? 0 : roomUnreadCount(entries, room, roomRead(room.id))))}</option>`).join('');
}
function signature(source) { return JSON.stringify(source.map((entry) => [entry.id, entry.created_at, entry.status, entry.text, entry.rich_text_html, entry.thread_id, entry.reply_to, entry.attachments?.map((item) => item.id)])); }
function exportRoomMarkdown() {
  const room = activeRoom(); const source = roomEntries(entries, activeRoomId);
  const content = [`# ${room.title}`, room.topic ? `\n${room.topic}\n` : '', ...source.map((entry) => `## ${entry.author || 'House'} · ${entry.created_at || ''}\n\n${entry.text || ''}\n`)].join('\n');
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${room.slug || 'house-room'}.md`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderLog({ scroll = false } = {}) {
  const log = document.querySelector('.commons-log'); if (!log) return;
  const pins = currentPins();
  const visible = roomEntries(mergedEntries(), activeRoomId, { search: searchQuery, pinnedIds: pinnedOnly ? pins : null });
  const room = activeRoom();
  log.innerHTML = `<div class="commons-chat-log-head"><div><div><h2>${escapeHtml(room.kind === 'direct' ? `@${room.title}` : `#${room.slug || room.title}`)}</h2><span>${escapeHtml(room.topic || `${visible.length} turns`)}</span></div><span>${visible.length} shown · ${entries.filter((entry) => commonsThreadId(entry) === activeRoomId).length} saved</span></div><div class="commons-log-tools"><select data-commons-thread data-house-room-select aria-label="House room">${roomOptions()}</select><input type="search" data-house-room-search placeholder="Search this room" value="${escapeHtml(searchQuery)}" aria-label="Search room"/><button type="button" class="quiet mini" data-pinned-only>${pinnedOnly ? 'All messages' : 'Pinned'}</button><button type="button" class="quiet mini" data-new-room>New room</button><button type="button" class="quiet mini" data-direct-room>DM selected</button><button type="button" class="quiet mini" data-export-room>Export</button></div></div>${visible.length ? visible.map(renderEntry).join('') : '<p class="muted">The room is quiet. Speak when ready.</p>'}<div data-streaming-zone>${[...streamingTurns.values()].filter((item) => item.roomId === activeRoomId).map(streamingMarkup).join('')}</div>`;
  log.querySelector('[data-commons-thread]')?.addEventListener('change', (event) => void switchRoom(event.target.value));
  log.querySelector('[data-house-room-search]')?.addEventListener('input', (event) => { searchQuery = event.target.value; renderLog(); });
  log.querySelector('[data-pinned-only]')?.addEventListener('click', () => { pinnedOnly = !pinnedOnly; renderLog(); });
  log.querySelector('[data-new-room]')?.addEventListener('click', () => void createConversationRoom());
  log.querySelector('[data-direct-room]')?.addEventListener('click', () => void createDirectRoom(document.querySelector('#commons-form')));
  log.querySelector('[data-export-room]')?.addEventListener('click', exportRoomMarkdown);
  log.querySelectorAll('[data-reply-entry]').forEach((button) => button.addEventListener('click', () => {
    const target = mergedEntries().find((entry) => entry.id === button.dataset.replyEntry); if (!target) return;
    rememberReply(target); renderReplyBanner(document.querySelector('#commons-form')); focusComposer();
  }));
  log.querySelectorAll('[data-copy-entry]').forEach((button) => button.addEventListener('click', async () => {
    const entry = mergedEntries().find((item) => item.id === button.dataset.copyEntry); if (!entry) return;
    try { await navigator.clipboard.writeText(entry.text || ''); button.textContent = 'Copied'; } catch { button.textContent = 'Unavailable'; }
  }));
  log.querySelectorAll('[data-pin-entry]').forEach((button) => button.addEventListener('click', () => {
    const pins = currentPins(); pins.has(button.dataset.pinEntry) ? pins.delete(button.dataset.pinEntry) : pins.add(button.dataset.pinEntry); setPins(pins); renderLog();
  }));
  log.querySelectorAll('[data-jump-parent]').forEach((button) => button.addEventListener('click', () => {
    const target = log.querySelector(`[data-entry-id="${CSS.escape(button.dataset.jumpParent)}"]`); if (!target) return; target.scrollIntoView({ block: 'center', behavior: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth' }); target.classList.add('commons-parent-pulse'); setTimeout(() => target.classList.remove('commons-parent-pulse'), 1400);
  }));
  log.querySelectorAll('[data-attachment-chip]').forEach((button) => button.addEventListener('click', () => void openHouseAttachment(button.dataset.attachmentChip).catch(() => {})));
  log.querySelectorAll('[data-cancel-stream]').forEach((button) => button.addEventListener('click', () => streamControllers.get(button.dataset.cancelStream)?.abort()));
  log.querySelectorAll('[data-retry-optimistic]').forEach((button) => button.addEventListener('click', () => void retryOptimistic(button.dataset.retryOptimistic)));
  if (scroll) log.scrollTop = log.scrollHeight;
  scheduleReadMark();
}

function updateStreamingBubble(key) {
  const stream = streamingTurns.get(key); if (!stream || stream.roomId !== activeRoomId) return;
  const zone = document.querySelector('[data-streaming-zone]'); if (!zone) return;
  let article = zone.querySelector(`[data-stream-key="${CSS.escape(key)}"]`);
  if (!article) { zone.insertAdjacentHTML('beforeend', streamingMarkup(stream)); article = zone.querySelector(`[data-stream-key="${CSS.escape(key)}"]`); article?.querySelector('[data-cancel-stream]')?.addEventListener('click', () => streamControllers.get(key)?.abort()); }
  if (!article) return;
  const body = article.querySelector('[data-stream-body]'); if (body) body.innerHTML = `${escapeHtml(stream.text || '')}<span class="commons-stream-cursor" aria-hidden="true">▍</span>`;
  const meta = article.querySelector('header>span'); if (meta) meta.textContent = [stream.state, stream.provider, stream.model].filter(Boolean).join(' · ');
  article.closest('.commons-log')?.scrollTo?.({ top: article.closest('.commons-log').scrollHeight });
}

function scheduleReadMark() {
  if (readMarkTimer) clearTimeout(readMarkTimer);
  readMarkTimer = setTimeout(() => void markActiveRoomRead(), 450);
}
async function markActiveRoomRead() {
  const roomId = activeRoomId; if (!roomId) return;
  const latest = latestRoomEntry(entries, roomId); if (!latest) return;
  const existing = roomRead(roomId);
  if (existing?.last_read_entry_id === latest.id) return;
  try {
    const saved = await markHouseRoomRead(roomId, latest.id, latest.created_at || new Date().toISOString());
    const index = reads.findIndex((item) => item.room_id === roomId); index >= 0 ? reads.splice(index, 1, saved) : reads.push(saved);
  } catch {}
}

async function activeWorld() {
  try {
    const context = await readActiveRuntimeWorldContext();
    const anchor = context?.identity_anchor;
    return { id: anchor?.world_id || null, name: context?.world?.name || document.querySelector('.sidebar-world strong')?.textContent?.trim() || 'Active World', context };
  } catch { return { id: null, name: document.querySelector('.sidebar-world strong')?.textContent?.trim() || 'Active World', context: null }; }
}

async function persistVoiceResult({ token, turnId, roomId, stewardEntry, voiceId, reply, world }) {
  const raw = reply.message || '';
  const text = houseModelPlainText(raw);
  const richTextHtml = renderHouseModelRichText(raw);
  return appendHouseCommons(token, {
    idempotency_key: `commons:${turnId}:${voiceId}`,
    kind: 'voice', author: voiceName(voiceId), voice_id: voiceId, status: 'replied',
    world: (reply.worldId || world.id) ? { id: reply.worldId || world.id, name: world.name } : null,
    turn_id: turnId, thread_id: roomId, reply_to: stewardEntry.id,
    runtime: { provider: reply.provider, model: reply.model, route: reply.route, profile_id: reply.profileId, latency_ms: reply.latencyMs, runtime_world_context_id: reply.runtimeWorldContextId },
    rich_text_html: richTextHtml, text,
  });
}

async function runVoiceStream({ voiceId, message, turnId, roomId, stewardEntry, world, token, context }) {
  const key = `${turnId}:${voiceId}`;
  const controller = new AbortController(); streamControllers.set(key, controller);
  streamingTurns.set(key, { key, voiceId, roomId, state: 'thinking', text: '', provider: null, model: null });
  publishModelPresence({ voiceId, displayName: voiceName(voiceId), state: 'thinking', worldId: world.id, task: 'house-commons-stream' });
  updateStreamingBubble(key);
  let firstDelta = true;
  try {
    const reply = await streamConstellationRuntimeVoice({
      voiceId, message, sessionId: `house-commons-${roomId}-${voiceId}`, context,
      metadata: { surface: 'house-commons', world_name: world.name, commons_thread_id: roomId, commons_turn_id: turnId, visible_message: message, request_id: key },
      worldContext: world.context, signal: controller.signal,
      onStarted(event) {
        const stream = streamingTurns.get(key); if (!stream) return;
        Object.assign(stream, { state: 'thinking', provider: event.provider, model: event.model });
        publishModelPresence({ voiceId, displayName: voiceName(voiceId), state: 'thinking', provider: event.provider, model: event.model, worldId: world.id, runtimeWorldContextId: event.runtime_world_context_id, task: 'house-commons-stream' });
        updateStreamingBubble(key);
      },
      onDelta(event) {
        const stream = streamingTurns.get(key); if (!stream) return;
        stream.text = event.message || stream.text;
        stream.state = 'speaking';
        if (firstDelta) { firstDelta = false; publishModelPresence({ voiceId, displayName: voiceName(voiceId), state: 'speaking', provider: stream.provider, model: stream.model, worldId: world.id, task: 'house-commons-stream-reply' }); }
        updateStreamingBubble(key);
      },
    });
    await persistVoiceResult({ token, turnId, roomId, stewardEntry, voiceId, reply, world });
    publishModelPresence({ voiceId, displayName: voiceName(voiceId), state: 'ready', provider: reply.provider, model: reply.model, latencyMs: reply.latencyMs, worldId: world.id, runtimeWorldContextId: reply.runtimeWorldContextId, task: null });
  } catch (error) {
    const cancelled = error?.name === 'AbortError' || controller.signal.aborted;
    const text = cancelled ? 'Reply cancelled.' : `Route error: ${error?.message || 'Flame stream failed.'}`;
    await appendHouseCommons(token, {
      idempotency_key: `commons:${turnId}:${voiceId}:error`, kind: 'voice', author: voiceName(voiceId), voice_id: voiceId,
      status: cancelled ? 'cancelled' : 'route-error', world: world.id ? { id: world.id, name: world.name } : null,
      turn_id: turnId, thread_id: roomId, reply_to: stewardEntry.id, rich_text_html: `<p>${escapeHtml(text)}</p>`, text,
    }).catch(() => null);
    publishModelPresence({ voiceId, displayName: voiceName(voiceId), state: cancelled ? 'ready' : 'degraded', worldId: world.id, task: null, reason: cancelled ? null : error?.message });
  } finally {
    streamControllers.delete(key); streamingTurns.delete(key); await refreshLog({ force: true, scroll: true });
  }
}

async function retryOptimistic(turnId) {
  const entry = optimisticEntries.get(turnId); if (!entry?._sendPayload) return;
  entry.status = 'sending'; renderLog({ scroll: true });
  try {
    const token = await activeSession(); if (!token) throw new Error('House Runtime offline.');
    const saved = await appendHouseCommons(token, entry._sendPayload);
    optimisticEntries.delete(turnId); await refreshLog({ force: true, scroll: true });
    const world = await activeWorld();
    const context = roomContext([...entries, saved], entry.thread_id);
    await Promise.all(entry._voiceIds.map((voiceId) => runVoiceStream({ voiceId, message: entry.text, turnId, roomId: entry.thread_id, stewardEntry: saved, world, token, context })));
  } catch (error) { entry.status = 'failed'; entry.text = entry.text; entry._error = error.message; renderLog({ scroll: true }); }
}

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'commons-form') return;
  event.preventDefault(); event.stopImmediatePropagation(); if (sending) return;
  const payload = syncComposer(form); if (!payload.text) { focusComposer(form); return; }
  const selected = voiceCheckboxes(form).filter((input) => input.checked).map((input) => input.value);
  const mentions = parseHouseMentions(payload.text); const room = activeRoom(); const voiceIds = mentions.length ? mentions : room.kind === 'direct' ? room.participants : selected;
  if (!voiceIds.length) return;
  const token = await activeSession(); const connection = document.querySelector('[data-commons-connection]');
  if (!token) { if (connection) connection.textContent = 'House Runtime offline · connect once in Settings'; return; }
  sending = true; const submit = form.querySelector('button[type="submit"]'); if (submit) { submit.disabled = true; submit.textContent = 'Sending…'; }
  const attachments = await settleAttachments();
  const world = await activeWorld(); const turnId = `commons-turn:${uuid()}`; const roomId = activeRoomId || HOUSE_CHAT_HOME_ROOM_ID; const replyTo = replyTarget?.id || null;
  const sendPayload = {
    idempotency_key: `commons:${turnId}:rowan`, kind: 'steward', author: 'Rowan', status: 'sent',
    world: world.id ? { id: world.id, name: world.name } : null,
    turn_id: turnId, thread_id: roomId, reply_to: replyTo, mentions, attachments, rich_text_html: payload.richTextHtml, text: payload.text,
  };
  const optimistic = createOptimisticStewardEntry({ roomId, turnId, text: payload.text, richTextHtml: payload.richTextHtml, replyTo, mentions, attachments, world: sendPayload.world, idempotencyKey: sendPayload.idempotency_key });
  optimistic._sendPayload = sendPayload; optimistic._voiceIds = voiceIds;
  optimisticEntries.set(turnId, optimistic); setComposer(form); pendingAttachments = []; renderAttachmentQueue(form); rememberReply(null); renderReplyBanner(form); renderLog({ scroll: true });
  try {
    const stewardEntry = await appendHouseCommons(token, sendPayload);
    optimisticEntries.delete(turnId); await refreshLog({ force: true, scroll: true });
    const context = roomContext([...entries, stewardEntry], roomId);
    await Promise.all(voiceIds.map((voiceId) => runVoiceStream({ voiceId, message: payload.text, turnId, roomId, stewardEntry, world, token, context })));
  } catch (error) {
    optimistic.status = 'failed'; optimistic._error = error.message; optimisticEntries.set(turnId, optimistic); renderLog({ scroll: true });
  } finally {
    sending = false; if (submit) { submit.disabled = false; submit.textContent = 'Send to House Chat ∞'; } focusComposer(form);
  }
}

async function performRefresh({ force = false, scroll = false } = {}) {
  const connection = document.querySelector('[data-commons-connection]'); const token = await activeSession();
  if (!token) { if (connection) connection.textContent = 'House Runtime offline · connect once in Settings'; return; }
  try {
    const [commons] = await Promise.all([readHouseCommons(token), loadRooms()]);
    const next = Array.isArray(commons?.entries) ? commons.entries : [];
    entries = next; restoreReply();
    for (const [turnId, optimistic] of optimisticEntries) if (entries.some((entry) => entry.idempotency_key === optimistic.idempotency_key)) optimisticEntries.delete(turnId);
    const nextSignature = signature(entries); const log = document.querySelector('.commons-log');
    if (connection) connection.textContent = `House Runtime connected · ${rooms.filter((room) => !room.archived).length} rooms · ${entries.length} saved turns`;
    if (!force && log === lastLog && nextSignature === lastSignature) { renderReplyBanner(document.querySelector('#commons-form')); scheduleReadMark(); return; }
    lastLog = log; lastSignature = nextSignature; renderLog({ scroll }); renderReplyBanner(document.querySelector('#commons-form'));
  } catch (error) { if (connection) connection.textContent = `House Runtime error · ${error.message}`; }
}
function refreshLog(options = {}) { if (refreshInFlight) return refreshInFlight; refreshInFlight = performRefresh(options).finally(() => { refreshInFlight = null; }); return refreshInFlight; }

function enhance(form) {
  if (!form || form.dataset.commonsEnhanced === 'v5') return;
  form.dataset.commonsEnhanced = 'v5';
  const selected = new Set(readSelection());
  voiceCheckboxes(form).forEach((input) => { input.checked = selected.has(input.value); input.addEventListener('change', () => { writeSelection(voiceCheckboxes(form).filter((item) => item.checked).map((item) => item.value)); syncAll(form); }); });
  installAll(form); syncAll(form); installComposer(form);
  const heading = document.querySelector('.section-heading');
  if (heading && !heading.querySelector('[data-commons-connection]')) { const state = document.createElement('p'); state.className = 'commons-connection-state'; state.dataset.commonsConnection = 'true'; state.textContent = 'Restoring House Runtime session…'; heading.querySelector('div')?.append(state); }
  void refreshLog({ force: true });
}

function styles() {
  if (document.getElementById('house-commons-chat-v5-styles')) return;
  const style = document.createElement('style'); style.id = 'house-commons-chat-v5-styles';
  style.textContent = `.commons-layout{grid-template-columns:minmax(0,1fr);align-items:start}.commons-log{max-height:66vh;overflow:auto;padding:.2rem .4rem 1rem}.commons-chat-log-head{position:sticky;top:0;z-index:3;display:grid;gap:.55rem;padding:.35rem 0 .75rem;background:var(--panel)}.commons-chat-log-head>div{display:flex;align-items:flex-start;justify-content:space-between;gap:.7rem}.commons-chat-log-head h2{margin:0}.commons-chat-log-head span{color:var(--muted);font-size:.72rem}.commons-log-tools{display:flex;flex-wrap:wrap;gap:.4rem}.commons-log-tools select,.commons-log-tools input{min-width:13rem}.commons-log-tools input{flex:1}.commons-chat-entry{width:min(84%,54rem);margin:.72rem 0;padding:.82rem .95rem;border:1px solid var(--line-soft);border-radius:1rem;background:color-mix(in srgb,var(--panel-solid) 88%,transparent);box-shadow:0 5px 18px rgba(0,0,0,.08)}.commons-chat-entry[data-kind="steward"]{margin-left:auto;background:color-mix(in srgb,var(--green) 9%,var(--panel-solid));border-color:color-mix(in srgb,var(--green) 30%,var(--line-soft))}.commons-chat-entry[data-kind="voice"]{margin-right:auto;background:color-mix(in srgb,var(--gold) 6%,var(--panel-solid));border-color:color-mix(in srgb,var(--gold) 24%,var(--line-soft))}.commons-chat-entry header{display:flex;align-items:center;gap:.6rem;justify-content:space-between}.commons-chat-entry header>span{margin-left:auto;color:var(--muted);font-size:.7rem}.commons-chat-entry header>div{display:flex;gap:.3rem}.commons-chat-body{overflow-wrap:anywhere;line-height:1.62}.commons-chat-body p{margin:.45rem 0}.commons-chat-body blockquote{margin:.55rem 0;padding:.45rem .7rem;border-left:3px solid var(--gold);background:color-mix(in srgb,var(--gold) 7%,transparent)}.commons-chat-body pre,.commons-chat-body code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:rgba(0,0,0,.25);border-radius:.35rem}.commons-chat-body pre{padding:.65rem;overflow:auto;white-space:pre-wrap}.commons-chat-body code{padding:.12rem .28rem}.commons-chat-body table{width:100%;border-collapse:collapse;margin:.6rem 0}.commons-chat-body th,.commons-chat-body td{border:1px solid var(--line-soft);padding:.35rem .45rem;text-align:left}.commons-chat-body a{color:var(--green);text-decoration:underline}.commons-reply-context,.commons-reply-banner{margin:.25rem 0 .55rem;padding:.45rem .6rem;border:0;border-left:3px solid var(--gold);background:color-mix(in srgb,var(--gold) 7%,transparent);color:inherit;font:inherit;text-align:left}.commons-reply-banner{display:flex;justify-content:space-between;gap:.5rem}.commons-reply-banner[hidden]{display:none}.commons-native-source{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;opacity:0!important;pointer-events:none!important}.commons-native-composer{display:grid;gap:.5rem;margin-top:.35rem}.commons-native-toolbar{display:flex;flex-wrap:wrap;gap:.32rem;padding:.42rem;border:1px solid color-mix(in srgb,var(--gold) 30%,transparent);border-radius:.7rem;background:color-mix(in srgb,var(--panel-solid) 86%,transparent)}.commons-native-editor{box-sizing:border-box;width:100%;min-height:7rem;max-height:20rem;overflow:auto;padding:.85rem 1rem;border:1px solid color-mix(in srgb,var(--text) 22%,transparent);border-radius:.85rem;background:color-mix(in srgb,var(--bg) 72%,var(--panel-solid));color:var(--text);font:inherit;line-height:1.6;outline:none}.commons-native-editor:focus{border-color:var(--gold);box-shadow:0 0 0 2px color-mix(in srgb,var(--gold) 24%,transparent)}.commons-native-editor:empty:before{content:'Message the room…';color:var(--muted);pointer-events:none}.commons-drop-active{outline:2px dashed var(--gold);outline-offset:4px}.commons-pending-attachments{display:flex;gap:.35rem;flex-wrap:wrap}.commons-pending-attachment{display:inline-flex;align-items:center;gap:.3rem;padding:.25rem .4rem;border:1px solid var(--line-soft);border-radius:.55rem;font-size:.72rem}.commons-links{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.55rem}.commons-link-chip{border:1px solid var(--line-soft);border-radius:.55rem;background:transparent;color:inherit;padding:.3rem .45rem}.commons-streaming{opacity:.96}.commons-stream-cursor{display:inline-block;margin-left:.1rem;animation:commons-cursor .7s step-end infinite}.commons-optimistic{opacity:.78}.commons-parent-pulse{animation:commons-parent 1.4s ease}.commons-all-control{padding:.5rem .6rem;border:1px solid color-mix(in srgb,var(--gold) 30%,transparent);border-radius:.65rem}.commons-all-control span{display:grid}.commons-all-control small{color:var(--muted)}.commons-connection-state{margin:.5rem 0 0;color:var(--green);font-size:.8rem}@keyframes commons-cursor{50%{opacity:0}}@keyframes commons-parent{0%,100%{box-shadow:0 5px 18px rgba(0,0,0,.08)}35%{box-shadow:0 0 0 .22rem color-mix(in srgb,var(--gold) 24%,transparent)}}@media(max-width:650px){.commons-log{max-height:58vh}.commons-chat-entry{width:94%}.commons-chat-entry header{align-items:flex-start;flex-wrap:wrap}.commons-chat-entry header>span{margin-left:0;width:100%}.commons-log-tools>*{width:100%!important}.commons-chat-log-head>div{flex-direction:column}}@media(prefers-reduced-motion:reduce){.commons-stream-cursor,.commons-parent-pulse{animation:none}}`;
  document.head.append(style);
}
function mutationIntroducedCommons(mutations) { return mutations.some((mutation) => [...mutation.addedNodes].some((node) => node?.nodeType === 1 && (node.matches?.('#commons-form') || node.querySelector?.('#commons-form')))); }

export function installHouseCommonsChatV5() {
  if (installed || typeof document === 'undefined') return;
  installed = true; styles(); document.addEventListener('submit', handleSubmit, true);
  observer = new MutationObserver((mutations) => { if (mutationIntroducedCommons(mutations)) enhance(document.querySelector('#commons-form')); });
  observer.observe(document.body, { childList: true, subtree: true });
  enhance(document.querySelector('#commons-form'));
  refreshTimer = setInterval(() => { if (document.querySelector('#commons-form')) void refreshLog(); }, REFRESH_MS);
  globalThis.addEventListener?.('online', () => void refreshLog({ force: true }));
  globalThis.addEventListener?.('beforeunload', () => { if (refreshTimer) clearInterval(refreshTimer); if (readMarkTimer) clearTimeout(readMarkTimer); for (const controller of streamControllers.values()) controller.abort(); observer?.disconnect(); }, { once: true });
}

if (typeof document !== 'undefined') installHouseCommonsChatV5();
