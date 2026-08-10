'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function createDeepTheoryStore({ dataDir }) {
  const root = path.join(dataDir, 'deep-theory');
  const catalogPath = path.join(root, 'records.json');

  async function read() {
    try {
      return JSON.parse(await fs.promises.readFile(catalogPath, 'utf8'));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      return { schema: 'hearthgate.deep-theory-catalog/v1', records: [] };
    }
  }

  async function write(v) {
    await fs.promises.mkdir(root, { recursive: true });
    const t = `${catalogPath}.${process.pid}.tmp`;
    await fs.promises.writeFile(t, `${JSON.stringify(v, null, 2)}\n`);
    await fs.promises.rename(t, catalogPath);
  }

  function clean(input, old = {}) {
    const now = new Date().toISOString();
    return {
      schema_version: '0.1.0',
      dataset_kind: 'deep_theory',
      id: old.id || `th-${crypto.randomUUID()}`,
      envelope_id: input.envelope_id ?? old.envelope_id ?? null,
      source_kind: input.source_kind ?? old.source_kind ?? null,
      source_id: input.source_id ?? old.source_id ?? null,
      content_kind: input.content_kind ?? old.content_kind ?? null,
      canon_effect: input.canon_effect ?? old.canon_effect ?? null,
      confidence: typeof input.confidence === 'number' ? input.confidence : (old.confidence ?? null),
      evidence_class: input.evidence_class ?? old.evidence_class ?? null,
      temporal_extent: input.temporal_extent ?? old.temporal_extent ?? null,
      payload: input.payload ?? old.payload ?? {},
      source_refs: Array.isArray(input.source_refs) ? input.source_refs : (old.source_refs || []),
      source_integrity: { raw_sources_immutable: true, interpretations_append_only: true },
      consent_scope: input.consent_scope ?? old.consent_scope ?? 'private_local',
      privacy_scope: input.privacy_scope ?? old.privacy_scope ?? 'private_local',
      created_at: old.created_at || now,
      updated_at: now,
      append_only_revisions: old.append_only_revisions || [],
    };
  }

  async function list() { return read(); }
  async function get(id) { return (await read()).records.find(r => r.id === id) || null; }

  async function save(input, id = null) {
    const cat = await read();
    const i = id ? cat.records.findIndex(r => r.id === id) : -1;
    const old = i >= 0 ? cat.records[i] : {};
    const next = clean(input, old);
    if (i >= 0) {
      next.append_only_revisions = [
        ...old.append_only_revisions,
        { created_at: new Date().toISOString(), kind: 'addition', note: String(input.revision_note || 'DEEPTheory record updated.') },
      ];
      cat.records[i] = next;
    } else {
      cat.records.unshift(next);
    }
    cat.updatedAt = next.updated_at;
    await write(cat);
    return next;
  }

  async function remove(id) {
    const cat = await read();
    const before = cat.records.length;
    cat.records = cat.records.filter(r => r.id !== id);
    if (before === cat.records.length) return false;
    await write(cat);
    return true;
  }

  return { list, get, save, remove, catalogPath };
}

module.exports = { createDeepTheoryStore };
