import { appendHouseCommons, readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';
import { COMMONS_ACTIVE_THREAD_KEY } from './house-commons-thread-restoration.js';

const MAX_BYTES = 5 * 1024 * 1024;
async function session() { return readHouseRuntimeToken() || await restoreHouseRuntimeSession(); }
function activeThread() { try { return localStorage.getItem(COMMONS_ACTIVE_THREAD_KEY) || ''; } catch { return ''; } }
function fileToBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(reader.error); reader.onload = () => resolve(String(reader.result || '').split(',')[1] || ''); reader.readAsDataURL(file); }); }
async function upload(file) {
  if (file.size > MAX_BYTES) throw new Error(`${file.name} exceeds the 5 MiB Commons attachment limit.`);
  const token = await session(); if (!token) throw new Error('House Runtime offline.');
  const headers = { 'content-type': 'application/json' }; if (token !== 'cookie-session') headers.authorization = `Bearer ${token}`;
  const response = await fetch('/api/v1/house/commons/attachments', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers, body: JSON.stringify({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, data_base64: await fileToBase64(file) }) });
  const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || `Attachment upload failed (${response.status}).`); return data;
}
async function attachFiles(files, replyTo = null, thread = activeThread()) {
  const token = await session(); if (!token) throw new Error('House Runtime offline.');
  const attachments = []; for (const file of files) attachments.push(await upload(file));
  const threadId = thread || `commons-attachment:${crypto.randomUUID?.() || Date.now()}`;
  await appendHouseCommons(token, { kind: 'system', author: 'House Commons', status: 'attachment', thread_id: threadId, turn_id: `commons-attachment:${crypto.randomUUID?.() || Date.now()}`, reply_to: replyTo, attachments, text: attachments.length === 1 ? `Attached ${attachments[0].name}.` : `Attached ${attachments.length} files.` });
  return attachments;
}
async function openAttachment(id) {
  const token = await session(); if (!token) return;
  const headers = {}; if (token !== 'cookie-session') headers.authorization = `Bearer ${token}`;
  const response = await fetch(`/api/v1/house/commons/attachments?id=${encodeURIComponent(id)}`, { credentials: 'same-origin', cache: 'no-store', headers }); if (!response.ok) return;
  const blob = await response.blob(); const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
function enhance() {
  const form = document.querySelector('#commons-form'); if (!form) return;
  if (!form.querySelector('[data-commons-attach-files]')) {
    const input = document.createElement('input'); input.type = 'file'; input.multiple = true; input.hidden = true; input.dataset.commonsAttachmentInput = 'true';
    const button = document.createElement('button'); button.type = 'button'; button.className = 'quiet mini'; button.dataset.commonsAttachFiles = 'true'; button.textContent = 'Attach files';
    const toolbar = form.querySelector('[data-commons-toolbar]') || form; toolbar.append(button, input);
    button.addEventListener('click', () => input.click()); input.addEventListener('change', async () => { button.disabled = true; button.textContent = 'Uploading…'; try { await attachFiles([...input.files]); document.dispatchEvent(new CustomEvent('arcsweep:commons-attachment-saved')); } catch (error) { button.textContent = error.message; setTimeout(() => { button.textContent = 'Attach files'; }, 3000); } finally { button.disabled = false; input.value = ''; if (button.textContent === 'Uploading…') button.textContent = 'Attach files'; } });
  }
  document.querySelectorAll('.commons-chat-entry').forEach((entry) => {
    if (entry.querySelector('[data-attach-to-entry]')) return;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'quiet mini'; button.dataset.attachToEntry = 'true'; button.textContent = 'Attach';
    entry.querySelector('header>div')?.prepend(button);
    button.addEventListener('click', () => { const picker = document.createElement('input'); picker.type = 'file'; picker.multiple = true; picker.onchange = async () => { await attachFiles([...picker.files], entry.dataset.entryId, entry.dataset.threadId); document.dispatchEvent(new CustomEvent('arcsweep:commons-attachment-saved')); }; picker.click(); });
  });
}
function renderAttachmentChips() {
  fetch('/api/v1/house/commons', { credentials: 'same-origin', cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((data) => {
    for (const item of data?.entries || []) {
      if (!item.attachments?.length) continue;
      const node = document.querySelector(`[data-entry-id="${CSS.escape(item.id)}"]`); if (!node || node.querySelector('[data-attachment-chip]')) continue;
      const wrap = document.createElement('div'); wrap.className = 'commons-links';
      for (const attachment of item.attachments) { const button = document.createElement('button'); button.type = 'button'; button.className = 'commons-link-chip'; button.dataset.attachmentChip = attachment.id; button.textContent = `${attachment.name}${attachment.size != null ? ` · ${Math.ceil(attachment.size / 1024)} KiB` : ''}`; button.addEventListener('click', () => void openAttachment(attachment.id)); wrap.append(button); }
      node.append(wrap);
    }
  }).catch(() => null);
}
function mutationNeedsEnhancement(mutations) { return mutations.some((mutation) => [...mutation.addedNodes].some((node) => node?.nodeType === 1 && (node.matches?.('#commons-form,.commons-chat-entry') || node.querySelector?.('#commons-form,.commons-chat-entry')))); }
export function installHouseCommonsAttachments() { if (typeof document === 'undefined') return; const observer = new MutationObserver((mutations) => { if (!mutationNeedsEnhancement(mutations)) return; enhance(); setTimeout(renderAttachmentChips, 0); }); observer.observe(document.body, { childList: true, subtree: true }); document.addEventListener('arcsweep:commons-attachment-saved', () => setTimeout(() => { enhance(); renderAttachmentChips(); }, 250)); enhance(); renderAttachmentChips(); }
if (typeof document !== 'undefined') installHouseCommonsAttachments();
