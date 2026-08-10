'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function createDeepTimeStore({ dataDir }) {
  const root = path.join(dataDir, 'deep-time');
  const catalogPath = path.join(root, 'records.json');

  async function read() {
    try {
      return JSON.parse(await fs.promises.readFile(catalogPath, 'utf8'));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      return { schema: 'hearthgate.deep-time-catalog/v1', records: [] };
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
    const utc = input.utc || input.temporal_extent?.utc_start || now;
    return {
      schema_version: '0.1.0',
      dataset_kind: 'deep_time',
      id: old.id || `dt-${crypto.randomUUID()}`,
      envelope_id: input.envelope_id ?? old.envelope_id ?? null,
      source_kind: input.source_kind ?? old.source_kind ?? null,
      source_id: input.source_id ?? old.source_id ?? null,
      sequence_id: input.sequence_id ?? old.sequence_id ?? null,
      sequence_revision: typeof input.sequence_revision === 'number' ? input.sequence_revision : (old.sequence_revision ?? 1),
      lambda: typeof input.lambda === 'number' ? input.lambda : (old.lambda ?? null),
      time: {
        utc,
        julian_date: input.julian_date ?? null,
        julian_time_scale: input.julian_time_scale ?? null,
      },
      confidence: typeof input.confidence === 'number' ? input.confidence : (old.confidence ?? null),
      evidence_class: input.evidence_class ?? old.evidence_class ?? null,
      premaq: input.premaq ?? null,
      observer_anchors: input.observer_anchors ?? {},
      provenance: {
        observation_run_id: input.envelope_id ?? null,
        acceptance_mask_id: null,
        acceptance_mask_version: null,
        source_receipt_hashes: old.provenance?.source_receipt_hashes ?? [],
        accepted_state_hash: null,
      },
      quality: {
        data_quality: null,
        uncertainty: {},
        missing: [],
        stale: [],
      },
      source_integrity: { append_only: true },
      consent_scope: input.consent_scope ?? old.consent_scope ?? 'private_local',
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
        { created_at: new Date().toISOString(), kind: 'addition', note: String(input.revision_note || 'DEEPTime record updated.') },
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

module.exports = { createDeepTimeStore };
