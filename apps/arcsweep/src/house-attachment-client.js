import { HOUSE_COOKIE_SESSION, readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';

export const HOUSE_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

async function session(fetchImpl = fetch) {
  return readHouseRuntimeToken() || await restoreHouseRuntimeSession(fetchImpl);
}
function authHeaders(token) {
  return token && token !== HOUSE_COOKIE_SESSION ? { authorization: `Bearer ${token}` } : {};
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.readAsDataURL(file);
  });
}

export async function uploadHouseAttachment(file, { fetchImpl = fetch, onProgress = () => {} } = {}) {
  if (!file) throw new Error('Attachment required.');
  if (file.size > HOUSE_ATTACHMENT_MAX_BYTES) throw new Error(`${file.name} exceeds the 5 MiB House attachment limit.`);
  const token = await session(fetchImpl);
  if (!token) throw new Error('House Runtime offline.');
  onProgress({ state: 'encoding', loaded: 0, total: file.size });
  const dataBase64 = await fileToBase64(file);
  onProgress({ state: 'uploading', loaded: file.size, total: file.size });
  const response = await fetchImpl('/api/v1/house/commons/attachments', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, data_base64: dataBase64 }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Attachment upload failed (${response.status}).`);
  onProgress({ state: 'complete', loaded: file.size, total: file.size });
  return data;
}

export async function openHouseAttachment(id, fetchImpl = fetch) {
  const token = await session(fetchImpl);
  if (!token) throw new Error('House Runtime offline.');
  const response = await fetchImpl(`/api/v1/house/commons/attachments?id=${encodeURIComponent(id)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(`Attachment read failed (${response.status}).`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
