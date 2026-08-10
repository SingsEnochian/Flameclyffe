'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const { createIngestStore } = require('../lib/hearthfire-ingest');

async function temporaryStore(t) {
  const dataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hearthgate-ingest-test-'));
  t.after(() => fs.promises.rm(dataDir, { recursive: true, force: true }));
  return createIngestStore({ dataDir, appRoot: path.resolve(__dirname, '..') });
}

test('first light seeds the per-user catalogue without duplicating it', async (t) => {
  const store = await temporaryStore(t);
  await store.firstLight();
  await store.firstLight();
  const catalog = await store.list();
  assert.equal(catalog.documents.length, 4);
  assert.equal(catalog.documents.filter((document) => document.bootstrap).length, 4);
});

test('text ingestion records provenance, receipt data, and hash deduplication', async (t) => {
  const store = await temporaryStore(t);
  const input = { buffer: Buffer.from('The hearth remembers its source.'), name: 'source.txt', source: { kind: 'test-source' } };
  const first = await store.ingestBuffer(input);
  const second = await store.ingestBuffer({ ...input, name: 'renamed.txt' });
  assert.equal(first.document.extraction.wordCount, 5);
  assert.equal(first.receipt.originalCopied, false);
  assert.equal(first.document.source.kind, 'test-source');
  assert.equal(second.duplicate, true);
  assert.equal((await store.list()).documents.length, 1);
});

test('PDF ingestion uses the installed pdf-parse API and preserves page count', async (t) => {
  const store = await temporaryStore(t);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage().drawText('Hearthfire keeps provenance.', { x: 72, y: 720, font, size: 12 });
  const result = await store.ingestBuffer({ buffer: Buffer.from(await pdf.save()), name: 'source.pdf', mimeType: 'application/pdf' });
  assert.equal(result.document.extraction.status, 'complete');
  assert.equal(result.document.extraction.pageCount, 1);
  assert.equal(result.document.extraction.wordCount, 3);
});

