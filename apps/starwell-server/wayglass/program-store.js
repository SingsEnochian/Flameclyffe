'use strict';

const { createHash } = require('node:crypto');

const OWNER_KEY = 'rowan';
const PROGRAM_COLUMNS = 'program_id,owner_key,slug,title,description,source,source_hash,version,status,metadata,created_at,updated_at';
const REVISION_COLUMNS = 'revision_id,program_id,owner_key,version,source,source_hash,change_note,created_at';

function sourceHash(source) {
  return createHash('sha256').update(source, 'utf8').digest('hex');
}

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function createWayglassProgramStore({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  function credentials() {
    const url = clean(env.SUPABASE_URL || env.VITE_SUPABASE_URL, 300).replace(/\/$/, '');
    const key = clean(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY, 1000);
    if (!url || !key) throw new Error('Wayglass program storage requires the server-side Supabase secret.');
    if (typeof fetchImpl !== 'function') throw new Error('Wayglass program storage requires fetch.');
    return { url, key };
  }

  async function request(path, { method = 'GET', body, prefer = 'return=representation' } = {}) {
    const { url, key } = credentials();
    const response = await fetchImpl(url + '/rest/v1/' + path, {
      method,
      headers: {
        apikey: key,
        authorization: 'Bearer ' + key,
        accept: 'application/json',
        'content-type': 'application/json',
        prefer,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    if (!response.ok) throw new Error('Wayglass program storage returned ' + response.status + ': ' + clean(text, 500));
    if (!text) return null;
    try { return JSON.parse(text); } catch { throw new Error('Wayglass program storage returned invalid JSON.'); }
  }

  async function listPrograms() {
    return request('wayglass_programs?owner_key=eq.' + encodeURIComponent(OWNER_KEY) +
      '&select=' + encodeURIComponent(PROGRAM_COLUMNS) + '&order=updated_at.desc');
  }

  async function getProgram(slug) {
    const rows = await request('wayglass_programs?owner_key=eq.' + encodeURIComponent(OWNER_KEY) +
      '&slug=eq.' + encodeURIComponent(clean(slug, 80)) + '&select=' + encodeURIComponent(PROGRAM_COLUMNS) + '&limit=1');
    return Array.isArray(rows) ? rows[0] || null : null;
  }

  async function saveProgram({ slug, title, description = '', source, metadata = {}, changeNote = '' } = {}) {
    const cleanSlug = clean(slug, 80);
    const cleanTitle = clean(title, 160);
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(cleanSlug)) throw new TypeError('Programme slug must use lowercase letters, numbers and hyphens.');
    if (!cleanTitle) throw new TypeError('Programme title is required.');
    if (typeof source !== 'string' || !source.trim() || Buffer.byteLength(source, 'utf8') > 50000) {
      throw new TypeError('Programme source must be nonempty text up to 50000 bytes.');
    }
    const safeMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
    const hash = sourceHash(source);
    const result = await request('rpc/wayglass_save_program', {
      method: 'POST',
      body: {
        p_owner_key: OWNER_KEY,
        p_slug: cleanSlug,
        p_title: cleanTitle,
        p_description: clean(description, 1200),
        p_source: source,
        p_source_hash: hash,
        p_metadata: safeMetadata,
        p_change_note: clean(changeNote, 500),
      },
    });
    return result;
  }

  async function listRevisions(programId) {
    const rows = await request('wayglass_program_revisions?owner_key=eq.' + encodeURIComponent(OWNER_KEY) +
      '&program_id=eq.' + encodeURIComponent(clean(programId, 80)) +
      '&select=' + encodeURIComponent(REVISION_COLUMNS) + '&order=version.desc');
    return Array.isArray(rows) ? rows : [];
  }

  async function saveRun({ programId = null, source, status, executionReceipt = {}, context = {} } = {}) {
    if (typeof source !== 'string' || !source.trim()) throw new TypeError('Run source is required.');
    if (!['committed', 'rolled-back', 'failed', 'compiled', 'held'].includes(status)) {
      throw new TypeError('Invalid Wayglass programme run status.');
    }
    const row = {
      program_id: programId || null,
      owner_key: OWNER_KEY,
      source_hash: sourceHash(source),
      runtime_version: 'wyrdrune.ir/v0.1',
      status,
      execution_receipt: executionReceipt && typeof executionReceipt === 'object' ? executionReceipt : {},
      context: context && typeof context === 'object' ? context : {},
    };
    const rows = await request('wayglass_program_runs', { method: 'POST', body: row });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }

  return Object.freeze({ listPrograms, getProgram, saveProgram, listRevisions, saveRun, sourceHash });
}

module.exports = { OWNER_KEY, createWayglassProgramStore, sourceHash };
