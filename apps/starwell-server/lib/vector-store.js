'use strict';

const path = require('path');
const Database = require('better-sqlite3');
const OpenAI = require('openai');

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function floatToBuffer(floats) {
  const buf = Buffer.alloc(floats.length * 4);
  for (let i = 0; i < floats.length; i++) buf.writeFloatLE(floats[i], i * 4);
  return buf;
}

function bufferToFloat(buf) {
  const out = new Array(buf.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = buf.readFloatLE(i * 4);
  return out;
}

function createVectorStore({ dataDir, apiKey }) {
  const dbPath = path.join(dataDir, 'hearthfire-vectors.sqlite3');
  const openai = new OpenAI({ apiKey });
  let db = null;

  function open() {
    if (db) return db;
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        source_id TEXT,
        source_type TEXT NOT NULL DEFAULT 'general',
        text TEXT NOT NULL,
        embedding BLOB NOT NULL,
        world_id TEXT NOT NULL DEFAULT 'earth',
        epistemic_status TEXT NOT NULL DEFAULT 'established-science',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS docs_source ON documents(source_id);
      CREATE INDEX IF NOT EXISTS docs_world ON documents(world_id);
      CREATE INDEX IF NOT EXISTS docs_type ON documents(source_type);
    `);
    return db;
  }

  async function embed(text) {
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: String(text).slice(0, 8000),
    });
    return res.data[0].embedding;
  }

  async function addDocument({ id, source_id, source_type = 'general', text, world_id = 'earth', epistemic_status = 'established-science', metadata = {} }) {
    const d = open();
    const docId = id || source_id || `doc:${Date.now()}`;
    const embedding = floatToBuffer(await embed(text));
    d.prepare(`
      INSERT OR REPLACE INTO documents(id, source_id, source_type, text, embedding, world_id, epistemic_status, metadata)
      VALUES(?,?,?,?,?,?,?,?)
    `).run(docId, source_id || docId, source_type, String(text), embedding, world_id, epistemic_status, JSON.stringify(metadata));
    return { id: docId };
  }

  async function similaritySearch({ query, world_id, source_type, limit = 10, threshold = 0.25 }) {
    const d = open();
    let sql = 'SELECT id, source_id, source_type, text, embedding, world_id, epistemic_status, metadata FROM documents WHERE 1=1';
    const params = [];
    if (world_id) { sql += ' AND world_id=?'; params.push(world_id); }
    if (source_type) { sql += ' AND source_type=?'; params.push(source_type); }
    const rows = d.prepare(sql).all(...params);
    if (!rows.length) return [];
    const queryVec = await embed(query);
    return rows
      .map(row => ({ ...row, score: cosine(queryVec, bufferToFloat(row.embedding)), metadata: JSON.parse(row.metadata || '{}') }))
      .filter(r => r.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ embedding: _e, ...rest }) => rest);
  }

  async function indexTools(tools) {
    for (const tool of tools) {
      const text = `${tool.id} ${tool.label} ${tool.description || ''}`;
      await addDocument({ id: `tool:${tool.id}`, source_id: tool.id, source_type: 'tool', text });
    }
  }

  async function discoverTools({ query, limit = 5 }) {
    return similaritySearch({ query, source_type: 'tool', limit });
  }

  async function removeDocument(id) {
    open().prepare('DELETE FROM documents WHERE id=?').run(id);
  }

  function stats() {
    const d = open();
    return {
      documentCount: d.prepare('SELECT COUNT(*) as c FROM documents').get().c,
      byType: d.prepare('SELECT source_type, COUNT(*) as count FROM documents GROUP BY source_type ORDER BY count DESC').all(),
      model: EMBEDDING_MODEL,
      dim: EMBEDDING_DIM,
    };
  }

  return { addDocument, similaritySearch, discoverTools, indexTools, embed, removeDocument, stats };
}

module.exports = { createVectorStore };
