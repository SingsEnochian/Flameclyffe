'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { PDFParse } = require('pdf-parse');
const { createWorker, OEM } = require('tesseract.js');
const englishData = require('@tesseract.js-data/eng');

const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.jsonl', '.yaml', '.yml', '.xml', '.html', '.htm', '.rtf']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff', '.bmp', '.gif']);
const SUPPORTED_EXTENSIONS = new Set([...TEXT_EXTENSIONS, ...IMAGE_EXTENSIONS, '.pdf', '.docx']);

function cleanText(value) {
  return String(value || '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();
}

function safeName(value) {
  return path.basename(String(value || 'untitled')).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 180) || 'untitled';
}

function detectContentKind(buffer, filename, extension) {
  const name = String(filename || '').toLowerCase();
  const sample = buffer.subarray(0, Math.min(buffer.length, 250000)).toString('utf8').toLowerCase();
  if (/observer-project/.test(name) || /"project_schema"\s*:\s*"observer-project\//.test(sample)) return 'observer-project';
  if (/lorebook/.test(name) || /"(?:lorebook|entries)"\s*:/.test(sample) && /(?:keys|trigger|keyword)/.test(sample)) return 'lorebook';
  if (/spicychat|chat with|chat-export/.test(name) || /spicychat\.ai|"messages"\s*:/.test(sample)) return 'chat-export';
  if (/character/.test(name) || /"(?:character|personality|first_mes|scenario)"\s*:/.test(sample)) return 'character-export';
  if (/memor(?:y|ies)|continuity/.test(name) || /"memories"\s*:/.test(sample)) return 'memory-log';
  if (IMAGE_EXTENSIONS.has(extension)) return 'image-source';
  if (extension === '.pdf' || extension === '.docx') return 'document-source';
  return 'general-source';
}

async function atomicJson(filePath, value) {
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.promises.rename(temporary, filePath);
}

async function extractPdf(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    // pdf-parse appends synthetic "-- n of n --" markers to result.text.
    // Store the page text itself so receipts and search counts describe the source.
    const pageText = Array.isArray(result.pages) ? result.pages.map((page) => page.text).join('\n\n') : result.text;
    return { text: cleanText(pageText), pageCount: result.total || result.pages?.length || null, ocr: { status: 'not-needed' } };
  } finally {
    await parser.destroy();
  }
}

async function extractImage(buffer, cachePath) {
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    langPath: englishData.langPath,
    gzip: englishData.gzip,
    cachePath,
    logger: () => {},
  });
  try {
    const result = await worker.recognize(buffer);
    return {
      text: cleanText(result.data.text),
      pageCount: 1,
      ocr: { status: 'complete', engine: 'tesseract.js', language: 'eng', confidence: Number(result.data.confidence.toFixed(2)) },
    };
  } finally {
    await worker.terminate();
  }
}

function createIngestStore({ dataDir, appRoot, maxFileBytes = 64 * 1024 * 1024 }) {
  if (!dataDir) throw new Error('dataDir is required');
  const ingestRoot = path.join(dataDir, 'hearthfire-ingest');
  const documentsRoot = path.join(ingestRoot, 'documents');
  const receiptsRoot = path.join(ingestRoot, 'receipts');
  const ocrCacheRoot = path.join(ingestRoot, 'ocr-cache');
  const catalogPath = path.join(ingestRoot, 'catalog.json');

  async function ensure() {
    await Promise.all([
      fs.promises.mkdir(documentsRoot, { recursive: true }),
      fs.promises.mkdir(receiptsRoot, { recursive: true }),
      fs.promises.mkdir(ocrCacheRoot, { recursive: true }),
    ]);
    try {
      return JSON.parse(await fs.promises.readFile(catalogPath, 'utf8'));
    } catch {
      const catalog = { schema: 'hearthfire.ingest-catalog/v1', litAt: new Date().toISOString(), documents: [] };
      await atomicJson(catalogPath, catalog);
      return catalog;
    }
  }

  async function extract(buffer, extension) {
    if (TEXT_EXTENSIONS.has(extension)) {
      let text = buffer.toString('utf8');
      if (extension === '.html' || extension === '.htm') {
        text = text.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
      }
      return { text: cleanText(text), pageCount: null, ocr: { status: 'not-needed' } };
    }
    if (extension === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      return { text: cleanText(result.value), pageCount: null, ocr: { status: 'not-needed' }, warnings: result.messages.map((message) => message.message) };
    }
    if (extension === '.pdf') return extractPdf(buffer);
    if (IMAGE_EXTENSIONS.has(extension)) return extractImage(buffer, ocrCacheRoot);
    const error = new Error('unsupported-file-type');
    error.code = 'unsupported-file-type';
    throw error;
  }

  async function ingestBuffer({ buffer, name, mimeType = 'application/octet-stream', source = {}, bootstrap = false }) {
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw Object.assign(new Error('empty-file'), { code: 'empty-file' });
    if (buffer.length > maxFileBytes) throw Object.assign(new Error('file-too-large'), { code: 'file-too-large' });
    const filename = safeName(name);
    const extension = path.extname(filename).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(extension)) throw Object.assign(new Error('unsupported-file-type'), { code: 'unsupported-file-type' });
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const contentKind = detectContentKind(buffer, filename, extension);
    const catalog = await ensure();
    const existing = catalog.documents.find((document) => document.sha256 === sha256);
    if (existing) return { document: existing, duplicate: true };

    const extracted = await extract(buffer, extension);
    const text = cleanText(extracted.text);
    const importedAt = new Date().toISOString();
    const id = crypto.randomUUID();
    const textFile = text ? `${id}.txt` : null;
    if (textFile) await fs.promises.writeFile(path.join(documentsRoot, textFile), `${text}\n`, 'utf8');
    const document = {
      id,
      name: filename,
      extension,
      mimeType,
      contentKind,
      sha256,
      importedAt,
      bootstrap,
      source: {
        kind: source.kind || 'user-upload',
        path: source.path || null,
        originalRetainedBy: source.originalRetainedBy || 'user-archive',
      },
      extraction: {
        status: text ? 'complete' : 'metadata-only',
        textFile,
        pageCount: extracted.pageCount ?? null,
        characterCount: text.length,
        wordCount: text ? text.split(/\s+/u).length : 0,
        ocr: extracted.ocr,
        warnings: extracted.warnings || [],
      },
    };
    catalog.documents.push(document);
    catalog.updatedAt = importedAt;
    await atomicJson(catalogPath, catalog);
    const receipt = {
      schema: 'hearthfire.ingest-receipt/v1', action: 'ingest', documentId: id, sha256, importedAt,
      provenance: document.source, originalCopied: false, extraction: document.extraction,
    };
    await atomicJson(path.join(receiptsRoot, `${id}.json`), receipt);
    return { document, duplicate: false, receipt };
  }

  async function ingestPath(filePath, options = {}) {
    return ingestBuffer({
      buffer: await fs.promises.readFile(filePath),
      name: options.name || path.basename(filePath),
      mimeType: options.mimeType,
      source: { kind: options.kind || 'local-file', path: path.resolve(filePath), originalRetainedBy: 'source-path' },
      bootstrap: options.bootstrap,
    });
  }

  async function firstLight() {
    await ensure();
    const seedPaths = [
      path.join(appRoot, 'seed-data', 'rooms.json'),
      path.join(appRoot, 'seed-data', 'bridges.json'),
      path.join(appRoot, 'seed-data', 'signals.json'),
      path.join(appRoot, 'public', 'hearthgate-archive.example.json'),
    ];
    const results = [];
    for (const filePath of seedPaths) {
      try { results.push(await ingestPath(filePath, { kind: 'hearthfire-first-light', bootstrap: true })); }
      catch (error) { console.warn(`[first-light] seed unavailable: ${filePath} (${error.code || error.message})`); }
    }
    return results;
  }

  async function list() {
    return ensure();
  }

  async function readExtractedText(documentId) {
    const catalog = await ensure();
    const document = catalog.documents.find((entry) => entry.id === documentId);
    if (!document?.extraction?.textFile) return '';
    return fs.promises.readFile(path.join(documentsRoot, document.extraction.textFile), 'utf8');
  }

  async function saveAnalysis(documentId, analysis) {
    const catalog = await ensure();
    const document = catalog.documents.find((entry) => entry.id === documentId);
    if (!document) throw Object.assign(new Error('document-not-found'), { code: 'document-not-found' });
    document.analysis = analysis;
    catalog.updatedAt = new Date().toISOString();
    await atomicJson(catalogPath, catalog);
    await atomicJson(path.join(receiptsRoot, `${documentId}.analysis.json`), {
      schema: 'hearthfire.analysis-receipt/v1', documentId, sha256: document.sha256,
      analysedAt: analysis.analysedAt, provider: analysis.provider, model: analysis.model,
      boundary: analysis.boundary,
    });
    return document;
  }

  return { ensure, firstLight, list, readExtractedText, saveAnalysis, ingestBuffer, ingestPath, supportedExtensions: [...SUPPORTED_EXTENSIONS], maxFileBytes, catalogPath };
}

module.exports = { createIngestStore, detectContentKind, TEXT_EXTENSIONS, IMAGE_EXTENSIONS, SUPPORTED_EXTENSIONS };
