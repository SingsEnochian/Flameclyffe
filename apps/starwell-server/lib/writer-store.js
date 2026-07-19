'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function createWriterStore({ dataDir }) {
  const root = path.join(dataDir, 'writing-room');
  const catalogPath = path.join(root, 'documents.json');

  async function atomicWrite(value) {
    await fs.promises.mkdir(root, { recursive: true });
    const temporary = `${catalogPath}.${process.pid}.tmp`;
    await fs.promises.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.promises.rename(temporary, catalogPath);
  }

  async function list() {
    try { return JSON.parse(await fs.promises.readFile(catalogPath, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const empty = { schema: 'hearthgate.writing-room/v1', documents: [] };
      await atomicWrite(empty);
      return empty;
    }
  }

  function clean(input, existing = {}) {
    const now = new Date().toISOString();
    return {
      id: existing.id || crypto.randomUUID(),
      title: String(input.title ?? existing.title ?? 'Untitled').slice(0, 240),
      documentType: String(input.documentType ?? existing.documentType ?? 'story').slice(0, 80),
      continuity: String(input.continuity ?? existing.continuity ?? '').slice(0, 240),
      tone: String(input.tone ?? existing.tone ?? '').slice(0, 240),
      pointOfView: String(input.pointOfView ?? existing.pointOfView ?? 'first person').slice(0, 80),
      tense: String(input.tense ?? existing.tense ?? 'past').slice(0, 80),
      status: String(input.status ?? existing.status ?? 'draft').slice(0, 80),
      synopsis: String(input.synopsis ?? existing.synopsis ?? '').slice(0, 12000),
      canonNotes: String(input.canonNotes ?? existing.canonNotes ?? '').slice(0, 20000),
      tags: Array.isArray(input.tags) ? input.tags.map(String).map(x => x.trim()).filter(Boolean).slice(0, 80) : (existing.tags || []),
      content: String(input.content ?? existing.content ?? ''),
      sourceDocumentId: input.sourceDocumentId ?? existing.sourceDocumentId ?? null,
      sourceSha256: input.sourceSha256 ?? existing.sourceSha256 ?? null,
      sourceName: input.sourceName ?? existing.sourceName ?? null,
      createdAt: existing.createdAt || now,
      updatedAt: now,
      wordCount: String(input.content ?? existing.content ?? '').trim().split(/\s+/).filter(Boolean).length,
    };
  }

  async function create(input = {}) {
    const catalog = await list();
    const document = clean(input);
    catalog.documents.unshift(document);
    catalog.updatedAt = document.updatedAt;
    await atomicWrite(catalog);
    return document;
  }

  async function get(id) { return (await list()).documents.find(document => document.id === id) || null; }

  async function update(id, input = {}) {
    const catalog = await list();
    const index = catalog.documents.findIndex(document => document.id === id);
    if (index < 0) return null;
    catalog.documents[index] = clean(input, catalog.documents[index]);
    catalog.updatedAt = catalog.documents[index].updatedAt;
    await atomicWrite(catalog);
    return catalog.documents[index];
  }

  async function remove(id) {
    const catalog = await list(), before = catalog.documents.length;
    catalog.documents = catalog.documents.filter(document => document.id !== id);
    if (catalog.documents.length === before) return false;
    catalog.updatedAt = new Date().toISOString();
    await atomicWrite(catalog);
    return true;
  }

  return { list, get, create, update, remove, catalogPath };
}

module.exports = { createWriterStore };
