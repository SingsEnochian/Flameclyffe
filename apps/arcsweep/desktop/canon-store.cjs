'use strict';

const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const MEDIA_TYPES = Object.freeze({
  '.txt': 'text/plain', '.md': 'text/markdown', '.json': 'application/json',
  '.html': 'text/html', '.htm': 'text/html', '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.rtf': 'application/rtf', '.epub': 'application/epub+zip', '.csv': 'text/csv',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.flac': 'audio/flac', '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.webm': 'video/webm'
});

function safeId(value, fallback = 'canon') {
  const id = String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return id || fallback;
}

async function hashFile(filePath) {
  const data = await fsp.readFile(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function walkFiles(root) {
  const output = [];
  async function visit(current) {
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(fullPath);
      else if (entry.isFile()) output.push(fullPath);
    }
  }
  await visit(root);
  return output;
}

function createCanonPaths(storePaths, canonId) {
  const id = safeId(canonId);
  const root = path.join(storePaths.root, 'canons', id);
  return {
    id,
    root,
    sourceDir: path.join(root, 'sources'),
    manifestFile: path.join(root, 'canon.json'),
    primerFile: path.join(root, 'primer.json'),
    receiptFile: path.join(storePaths.root, 'receipts', `canon-${id}.jsonl`)
  };
}

async function ensureCanon(paths) {
  await Promise.all([
    fsp.mkdir(paths.root, { recursive: true }),
    fsp.mkdir(paths.sourceDir, { recursive: true }),
    fsp.mkdir(path.dirname(paths.receiptFile), { recursive: true })
  ]);
}

async function appendCanonReceipt(paths, receipt) {
  await ensureCanon(paths);
  await fsp.appendFile(paths.receiptFile, `${JSON.stringify({ ...receipt, recordedAt: new Date().toISOString() })}\n`, 'utf8');
}

async function existingHashes(paths) {
  try {
    const text = await fsp.readFile(paths.manifestFile, 'utf8');
    const manifest = JSON.parse(text);
    return new Map((manifest.sources || []).map((source) => [source.sha256, source]));
  } catch (error) {
    if (error.code === 'ENOENT') return new Map();
    throw error;
  }
}

async function ingestSources(storePaths, options) {
  const canonPaths = createCanonPaths(storePaths, options.canonId);
  await ensureCanon(canonPaths);
  const accepted = new Set((options.primer?.sourcePolicy?.acceptedExtensions || []).map((item) => String(item).toLowerCase()));
  const paths = Array.from(new Set(options.filePaths || [])).filter((filePath) => !accepted.size || accepted.has(path.extname(filePath).toLowerCase()));
  const known = await existingHashes(canonPaths);
  const added = [];
  const duplicates = [];

  for (const sourcePath of paths) {
    const stats = await fsp.stat(sourcePath);
    if (!stats.isFile()) continue;
    const sha256 = await hashFile(sourcePath);
    if (known.has(sha256)) {
      const duplicate = { sourcePath, sha256, existing: known.get(sha256) };
      duplicates.push(duplicate);
      await appendCanonReceipt(canonPaths, { action: 'source-duplicate', ...duplicate });
      continue;
    }

    const sourceId = crypto.randomUUID();
    const ext = path.extname(sourcePath).toLowerCase().slice(0, 16);
    const storedName = `${sourceId}${ext}`;
    const destination = path.join(canonPaths.sourceDir, storedName);
    await fsp.copyFile(sourcePath, destination);
    const originalRoot = options.originalRoot ? path.resolve(options.originalRoot) : null;
    const relative = originalRoot && path.resolve(sourcePath).startsWith(originalRoot + path.sep)
      ? path.relative(originalRoot, sourcePath)
      : null;
    const record = {
      sourceId,
      name: path.basename(sourcePath),
      storedName,
      relativePath: path.join('canons', canonPaths.id, 'sources', storedName),
      originalRelativePath: relative,
      sha256,
      size: stats.size,
      mediaType: MEDIA_TYPES[ext] || null,
      addedAt: new Date().toISOString(),
      authority: options.authority || 'unknown',
      status: options.status || 'unclassified',
      tags: Array.isArray(options.tags) ? options.tags : []
    };
    known.set(sha256, record);
    added.push(record);
    await appendCanonReceipt(canonPaths, { action: 'source-add', canonId: canonPaths.id, ...record });
  }

  const current = await readCanonManifest(canonPaths).catch(() => null);
  const manifest = current || {
    schemaVersion: 'arcsweep.canon-pack/v0.1',
    packId: `${canonPaths.id}-canon`,
    name: options.canonName || canonPaths.id,
    world: { id: canonPaths.id, name: options.canonName || canonPaths.id, variant: null, timeline: null, receptionProfileRef: options.receptionProfileRef || null },
    createdAt: new Date().toISOString(),
    primer: options.primer || {},
    sources: [],
    records: {},
    conflicts: [],
    provenance: { createdBy: options.createdBy || ['Rowan', 'Vee'], receipts: [], revisionNotes: [] }
  };
  manifest.updatedAt = new Date().toISOString();
  manifest.sources = [...(manifest.sources || []), ...added];
  await fsp.writeFile(canonPaths.manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  if (options.primer) await fsp.writeFile(canonPaths.primerFile, `${JSON.stringify(options.primer, null, 2)}\n`, 'utf8');
  return { ok: true, canonId: canonPaths.id, added, duplicates, manifestFile: canonPaths.manifestFile };
}

async function listCanons(storePaths) {
  const canonRoot = path.join(storePaths.root, 'canons');
  await fsp.mkdir(canonRoot, { recursive: true });
  const entries = await fsp.readdir(canonRoot, { withFileTypes: true });
  const rows = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const paths = createCanonPaths(storePaths, entry.name);
    try {
      const manifest = await readCanonManifest(paths);
      rows.push({ canonId: paths.id, name: manifest.name, world: manifest.world, sourceCount: (manifest.sources || []).length, updatedAt: manifest.updatedAt || manifest.createdAt });
    } catch { /* skip incomplete canon directories */ }
  }
  return rows.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

async function readCanonManifest(pathsOrStore, canonId) {
  const paths = canonId ? createCanonPaths(pathsOrStore, canonId) : pathsOrStore;
  const text = await fsp.readFile(paths.manifestFile, 'utf8');
  return JSON.parse(text);
}

async function exportCanonJson(storePaths, canonId, destination) {
  const paths = createCanonPaths(storePaths, canonId);
  const manifest = await readCanonManifest(paths);
  await fsp.writeFile(destination, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await appendCanonReceipt(paths, { action: 'export-json', destination });
  return { ok: true, destination };
}

async function exportPortableCanonFolder(storePaths, canonId, destinationRoot) {
  const paths = createCanonPaths(storePaths, canonId);
  const manifest = await readCanonManifest(paths);
  const folder = path.join(destinationRoot, `${safeId(manifest.name, canonId)}-${new Date().toISOString().slice(0, 10)}`);
  await fsp.mkdir(folder, { recursive: true });
  await fsp.copyFile(paths.manifestFile, path.join(folder, 'canon.json'));
  try { await fsp.copyFile(paths.primerFile, path.join(folder, 'primer.json')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fsp.cp(paths.sourceDir, path.join(folder, 'sources'), { recursive: true });
  try { await fsp.copyFile(paths.receiptFile, path.join(folder, 'receipts.jsonl')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await appendCanonReceipt(paths, { action: 'export-portable-folder', destination: folder });
  return { ok: true, destination: folder };
}

module.exports = {
  createCanonPaths,
  exportCanonJson,
  exportPortableCanonFolder,
  hashFile,
  ingestSources,
  listCanons,
  readCanonManifest,
  safeId,
  walkFiles
};
