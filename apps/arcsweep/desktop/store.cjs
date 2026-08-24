'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

function safeStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function createStorePaths(root) {
  return {
    root,
    stateDir: path.join(root, 'state'),
    stateFile: path.join(root, 'state', 'arcsweep-state.json'),
    backupDir: path.join(root, 'backups'),
    attachmentDir: path.join(root, 'attachments'),
    ingestDir: path.join(root, 'ingest'),
    receiptDir: path.join(root, 'receipts'),
    receiptFile: path.join(root, 'receipts', 'storage-receipts.jsonl'),
  };
}

async function ensureStore(paths) {
  await Promise.all([
    fsp.mkdir(paths.stateDir, { recursive: true }),
    fsp.mkdir(paths.backupDir, { recursive: true }),
    fsp.mkdir(paths.attachmentDir, { recursive: true }),
    fsp.mkdir(paths.ingestDir, { recursive: true }),
    fsp.mkdir(paths.receiptDir, { recursive: true }),
  ]);
}

async function appendReceipt(paths, receipt) {
  await ensureStore(paths);
  await fsp.appendFile(paths.receiptFile, `${JSON.stringify({
    ...receipt,
    recordedAt: new Date().toISOString(),
  })}\n`, 'utf8');
}

async function readState(paths) {
  await ensureStore(paths);
  try {
    const text = await fsp.readFile(paths.stateFile, 'utf8');
    return { state: JSON.parse(text), exists: true, sha256: sha256(text) };
  } catch (error) {
    if (error.code === 'ENOENT') return { state: null, exists: false, sha256: null };
    const corruptName = `corrupt-${safeStamp()}.json`;
    try {
      await fsp.copyFile(paths.stateFile, path.join(paths.backupDir, corruptName));
    } catch { /* preserve startup even when quarantine copy fails */ }
    await appendReceipt(paths, { action: 'load-failed', error: error.message, corruptName });
    return { state: null, exists: false, sha256: null, error: error.message };
  }
}

async function listBackups(paths) {
  await ensureStore(paths);
  const files = await fsp.readdir(paths.backupDir, { withFileTypes: true });
  const rows = [];
  for (const entry of files) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const full = path.join(paths.backupDir, entry.name);
    const stats = await fsp.stat(full);
    rows.push({ name: entry.name, size: stats.size, modifiedAt: stats.mtime.toISOString() });
  }
  return rows.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

async function rotateBackups(paths, keep = 20) {
  const backups = await listBackups(paths);
  await Promise.all(backups.slice(keep).map((item) => fsp.unlink(path.join(paths.backupDir, item.name)).catch(() => {})));
}

async function createBackup(paths, reason = 'manual') {
  await ensureStore(paths);
  try {
    await fsp.access(paths.stateFile);
  } catch {
    return { ok: false, reason: 'no-state-yet' };
  }
  const safeReason = String(reason || 'manual').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 40);
  const name = `${safeStamp()}-${safeReason}.json`;
  const destination = path.join(paths.backupDir, name);
  await fsp.copyFile(paths.stateFile, destination);
  await rotateBackups(paths);
  await appendReceipt(paths, { action: 'backup', name, reason: safeReason });
  return { ok: true, name, path: destination };
}

async function writeStateAtomic(paths, state, meta = {}) {
  await ensureStore(paths);
  if (fs.existsSync(paths.stateFile)) await createBackup(paths, meta.reason || 'autosave');
  const text = `${JSON.stringify(state, null, 2)}\n`;
  const temp = `${paths.stateFile}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(temp, text, 'utf8');
  await fsp.rename(temp, paths.stateFile);
  const digest = sha256(text);
  await appendReceipt(paths, {
    action: 'save',
    reason: meta.reason || 'state-change',
    bytes: Buffer.byteLength(text),
    sha256: digest,
  });
  return { ok: true, path: paths.stateFile, sha256: digest, bytes: Buffer.byteLength(text) };
}

async function restoreBackup(paths, name) {
  if (!/^[a-zA-Z0-9_.-]+\.json$/.test(name)) throw new Error('Invalid backup name.');
  const source = path.join(paths.backupDir, name);
  const resolved = path.resolve(source);
  if (!resolved.startsWith(path.resolve(paths.backupDir) + path.sep)) throw new Error('Backup path escaped its directory.');
  const text = await fsp.readFile(source, 'utf8');
  const state = JSON.parse(text);
  await createBackup(paths, 'before-restore');
  await writeStateAtomic(paths, state, { reason: `restore-${name}` });
  await appendReceipt(paths, { action: 'restore', name, sha256: sha256(text) });
  return { ok: true, state };
}

async function copyAttachment(paths, sourcePath) {
  await ensureStore(paths);
  const stats = await fsp.stat(sourcePath);
  if (!stats.isFile()) throw new Error('Attachment source is not a file.');
  const ext = path.extname(sourcePath).slice(0, 12).toLowerCase();
  const id = crypto.randomUUID();
  const name = `${id}${ext}`;
  const destination = path.join(paths.ingestDir, name);
  const bytes = await fsp.readFile(sourcePath);
  const digest = sha256(bytes);
  await fsp.writeFile(destination, bytes);
  const originalName = path.basename(sourcePath);
  const receipt = {
    id,
    name: originalName,
    storedName: name,
    relativePath: path.join('ingest', name),
    size: stats.size,
    extension: ext,
    sha256: digest,
    canonStatus: 'non-canon',
    reviewStatus: 'unreviewed',
    sourceClass: 'uploaded-reference',
    addedAt: new Date().toISOString(),
  };
  await appendReceipt(paths, { action: 'source-ingest', ...receipt });
  return receipt;
}

function resolveAttachment(paths, attachment) {
  const relativePath = String(attachment?.relativePath || '');
  if (relativePath) {
    const portablePath = relativePath.replace(/[\\/]+/g, path.sep);
    const resolved = path.resolve(paths.root, portablePath);
    const root = path.resolve(paths.root);
    if (!resolved.startsWith(root + path.sep)) throw new Error('Attachment path escaped its data directory.');
    return resolved;
  }

  const storedName = attachment?.storedName || '';
  if (!/^[a-zA-Z0-9_.-]+$/.test(storedName)) throw new Error('Invalid attachment path.');
  return path.join(paths.attachmentDir, storedName);
}

async function readAttachmentPayload(paths, attachment) {
  await ensureStore(paths);
  const target = resolveAttachment(paths, attachment);
  const bytes = await fsp.readFile(target);
  const digest = sha256(bytes);
  if (attachment?.sha256 && attachment.sha256 !== digest) {
    throw new Error(`Attachment ${attachment.name || attachment.id || 'file'} failed its stored SHA-256 check.`);
  }
  return {
    schema: 'arcsweep.worldseed-binary-entry/v1',
    attachmentId: attachment?.id || null,
    name: attachment?.name || path.basename(target),
    extension: String(attachment?.extension || path.extname(target)).slice(0, 12).toLowerCase(),
    size: bytes.length,
    sha256: digest,
    base64: bytes.toString('base64'),
  };
}

async function writeAttachmentPayload(paths, payload) {
  await ensureStore(paths);
  if (!payload || payload.schema !== 'arcsweep.worldseed-binary-entry/v1') {
    throw new Error('Worldseed attachment payload has an unsupported schema.');
  }
  if (typeof payload.base64 !== 'string' || !payload.base64) throw new Error('Worldseed attachment payload is empty.');
  const bytes = Buffer.from(payload.base64, 'base64');
  const digest = sha256(bytes);
  if (payload.sha256 && payload.sha256 !== digest) throw new Error(`Worldseed attachment ${payload.name || payload.attachmentId || 'file'} failed SHA-256 verification.`);
  if (Number.isFinite(Number(payload.size)) && Number(payload.size) !== bytes.length) throw new Error(`Worldseed attachment ${payload.name || 'file'} failed byte-length verification.`);

  const rawExt = String(payload.extension || path.extname(payload.name || '')).toLowerCase();
  const extension = /^\.[a-z0-9]{1,11}$/.test(rawExt) ? rawExt : '';
  const id = crypto.randomUUID();
  const storedName = `${id}${extension}`;
  const destination = path.join(paths.ingestDir, storedName);
  await fsp.writeFile(destination, bytes);
  const receipt = {
    id,
    name: path.basename(String(payload.name || storedName)),
    storedName,
    relativePath: path.join('ingest', storedName),
    size: bytes.length,
    extension,
    sha256: digest,
    canonStatus: 'non-canon',
    reviewStatus: 'unreviewed',
    sourceClass: 'worldseed-ark-import',
    importedFromAttachmentId: payload.attachmentId || null,
    addedAt: new Date().toISOString(),
  };
  await appendReceipt(paths, { action: 'worldseed-attachment-import', ...receipt });
  return receipt;
}

module.exports = {
  appendReceipt,
  copyAttachment,
  createBackup,
  createStorePaths,
  ensureStore,
  listBackups,
  readAttachmentPayload,
  readState,
  resolveAttachment,
  restoreBackup,
  rotateBackups,
  sha256,
  writeAttachmentPayload,
  writeStateAtomic,
};
