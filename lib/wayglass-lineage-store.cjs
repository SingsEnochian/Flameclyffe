'use strict';
// Wyrdrune lineage memory: the Return Engine's durable, verifiable record of what
// crossed. Each return of a Wyrdrune lineage (its carry and its chained checkpoints)
// is appended as an immutable, content-addressed file; records chain by `prev`, and
// the head is published atomically. Reading the head re-verifies the whole chain back
// to its first record and refuses, with a reason, rather than guessing.
//
// Same custody discipline as the Departure Store: owner-private local files, fsync,
// never overwrite evidence. It records what Wyrdrune returned; it is not canon,
// identity, a relationship decision or model weights.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash, randomUUID } = require('node:crypto');
const { digest: wce1 } = require('./wyrdrune/canonical.cjs');

const SCHEMA = 'wayglass.lineage-return/v0.1';
const sha256 = text => createHash('sha256').update(text).digest('hex');
const ID = /^[a-f0-9]{64}$/;
const WCE = /^wce1:[a-f0-9]{64}$/;
const NAME = /^[a-z0-9][a-z0-9:._-]{0,95}$/i;

function verifyCheckpoints(record) {
  const cps = record.checkpoints;
  if (!Array.isArray(cps) || !cps.length || cps.length > 64) return 'checkpoints missing';
  for (const [i, cp] of cps.entries()) {
    if (!cp || cp.cycle !== i + 1 || !['outer', 'inner'].includes(cp.face) || cp.face !== (i % 2 ? 'inner' : 'outer')) return 'checkpoint ' + (i + 1) + ' is malformed';
    const expected = i === 0 ? record.lineage_root : wce1(cps[i - 1]);
    if (cp.prev !== expected) return 'checkpoint ' + (i + 1) + ' does not chain';
    if (!WCE.test(cp.state) || !WCE.test(cp.carry)) return 'checkpoint ' + (i + 1) + ' digests are malformed';
  }
  if (cps.at(-1).carry !== record.carry_digest) return 'last checkpoint does not carry the recorded carry';
  return null;
}

function validateEntry(entry) {
  const problems = [];
  if (!NAME.test(entry?.lineage || '')) problems.push('lineage');
  if (!NAME.test(entry?.participant_id || '')) problems.push('participant');
  if (!ID.test(entry?.source_hash || '')) problems.push('source hash');
  if (!ID.test(entry?.input_hash || '')) problems.push('input hash');
  if (!WCE.test(entry?.lineage_root || '')) problems.push('lineage root');
  if (!entry?.carry || typeof entry.carry !== 'object' || Array.isArray(entry.carry)) problems.push('carry');
  else if (wce1(entry.carry) !== entry.carry_digest) problems.push('carry digest');
  if (problems.length) throw new TypeError('Lineage return rejected: invalid ' + problems.join(', ') + '.');
  const chain = verifyCheckpoints(entry);
  if (chain) throw new TypeError('Lineage return rejected: ' + chain + '.');
}

function createLineageStore({ directory = path.join(process.env.WAYGLASS_DATA_DIR || path.join(os.homedir(), '.wayglass'), 'lineages'),
  now = () => new Date().toISOString() } = {}) {
  const dirFor = (lineage, participant) => path.join(directory, sha256(lineage + '\u0000' + participant).slice(0, 32));

  function writeAtomic(target, raw, { exclusive }) {
    const temporary = path.join(path.dirname(target), '.' + randomUUID() + '.tmp');
    const fd = fs.openSync(temporary, 'wx', 0o600);
    try { fs.writeFileSync(fd, raw); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    try {
      if (exclusive) { try { fs.linkSync(temporary, target); } catch (error) { if (error.code !== 'EEXIST') throw error; } }
      else fs.renameSync(temporary, target);
    } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  }

  /** Walk from the published head to the first record, checking everything. */
  function verify(lineage, participant) {
    const dir = dirFor(lineage, participant);
    let head;
    try { head = JSON.parse(fs.readFileSync(path.join(dir, 'HEAD'), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return Object.freeze({ status: 'none', lineage, participant_id: participant }); return refuse('head unreadable'); }
    function refuse(reason) { return Object.freeze({ status: 'refused', reason, lineage, participant_id: participant }); }
    if (!ID.test(head?.storage_id || '') || !Number.isInteger(head?.seq) || head.seq < 1) return refuse('head is malformed');
    let id = head.storage_id, expectSeq = head.seq, newest = null, length = 0;
    while (id) {
      let raw;
      try { raw = fs.readFileSync(path.join(dir, id + '.json'), 'utf8'); } catch { return refuse('record ' + id.slice(0, 12) + ' is missing'); }
      if (sha256(raw) !== id) return refuse('record ' + id.slice(0, 12) + ' was altered');
      let record; try { record = JSON.parse(raw); } catch { return refuse('record ' + id.slice(0, 12) + ' is unreadable'); }
      if (record.schema !== SCHEMA || record.lineage !== lineage || record.participant_id !== participant) return refuse('record ' + id.slice(0, 12) + ' belongs to another lineage');
      if (record.seq !== expectSeq) return refuse('sequence broken at ' + expectSeq);
      if (wce1(record.carry) !== record.carry_digest) return refuse('carry digest mismatch at ' + expectSeq);
      const chain = verifyCheckpoints(record); if (chain) return refuse(chain + ' at ' + expectSeq);
      if (expectSeq === 1 ? record.prev !== null : !ID.test(record.prev || '')) return refuse('chain link broken at ' + expectSeq);
      newest ||= { ...record, storage_id: id };
      length += 1; expectSeq -= 1; id = record.prev;
    }
    if (expectSeq !== 0) return refuse('chain ends early');
    return Object.freeze({ status: 'verified', lineage, participant_id: participant, length,
      head: Object.freeze({ seq: newest.seq, storage_id: newest.storage_id, recorded_at: newest.recorded_at,
        carry: Object.freeze({ ...newest.carry }), carry_digest: newest.carry_digest, source_hash: newest.source_hash,
        lineage_root: newest.lineage_root, checkpoint_head: wce1(newest.checkpoints.at(-1)) }) });
  }

  /** Append one verified return. A broken chain is never extended. */
  function append(entry) {
    validateEntry(entry);
    const dir = dirFor(entry.lineage, entry.participant_id);
    const current = verify(entry.lineage, entry.participant_id);
    if (current.status === 'refused') throw new Error('Lineage memory refused to extend a broken chain: ' + current.reason + '.');
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const record = { schema: SCHEMA, lineage: entry.lineage, participant_id: entry.participant_id,
      seq: current.status === 'verified' ? current.head.seq + 1 : 1,
      prev: current.status === 'verified' ? current.head.storage_id : null,
      recorded_at: entry.recorded_at || now(), source_hash: entry.source_hash, input_hash: entry.input_hash,
      lineage_root: entry.lineage_root, carry: entry.carry, carry_digest: entry.carry_digest, checkpoints: entry.checkpoints,
      canon_commit: false, identity_commit: false, model_weights_updated: false };
    const raw = JSON.stringify(record);
    const storageId = sha256(raw);
    writeAtomic(path.join(dir, storageId + '.json'), raw, { exclusive: true });
    writeAtomic(path.join(dir, 'HEAD'), JSON.stringify({ storage_id: storageId, seq: record.seq }), { exclusive: false });
    const after = verify(entry.lineage, entry.participant_id);
    if (after.status !== 'verified' || after.head.storage_id !== storageId) throw new Error('Lineage memory did not verify after writing.');
    return Object.freeze({ schema: 'wayglass.lineage-receipt/v0.1', persisted: true, durability: 'local-file-fsync',
      seq: record.seq, storage_id: storageId, prev: record.prev, carry_digest: record.carry_digest,
      canon_commit: false, authority_grant: false });
  }

  return Object.freeze({ append, verify });
}

module.exports = { SCHEMA, createLineageStore, verifyCheckpoints };
