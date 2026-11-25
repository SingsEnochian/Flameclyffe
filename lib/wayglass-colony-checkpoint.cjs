'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { digest } = require('./wyrdrune/canonical.cjs');

const SCHEMA = 'wayglass.colony-checkpoint/v1';

function createColonyCheckpointStore(directory) {
  const filename = sequence => path.join(directory, String(sequence).padStart(12, '0') + '.json');
  const conflict = () => Object.assign(new Error('The colony checkpoint changed on another host'), { status: 409 });

  function head() {
    try {
      const latest = fs.readdirSync(directory).filter(name => /^\d{12}\.json$/.test(name)).sort().at(-1);
      return latest ? Number(latest.slice(0, 12)) : 0;
    } catch (error) {
      if (error.code === 'ENOENT') return 0;
      throw error;
    }
  }

  function load() {
    const sequence = head();
    if (!sequence) return null;
    const decoded = JSON.parse(fs.readFileSync(filename(sequence), 'utf8'));
    const { checksum, ...record } = decoded;
    if (record.schema !== SCHEMA || record.sequence !== sequence || checksum !== digest(record))
      throw new Error('Colony checkpoint integrity failed');
    return record;
  }

  function save(state, expectedSequence) {
    if (head() !== expectedSequence) throw conflict();
    const record = { schema: SCHEMA, sequence: expectedSequence + 1, state };
    const raw = JSON.stringify({ ...record, checksum: digest(record) });
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const temporary = path.join(directory, '.' + randomUUID() + '.tmp');
    const file = fs.openSync(temporary, 'wx', 0o600);
    try {
      try { fs.writeFileSync(file, raw); fs.fsyncSync(file); }
      finally { fs.closeSync(file); }
      try { fs.linkSync(temporary, filename(record.sequence)); }
      catch (error) { if (error.code === 'EEXIST') throw conflict(); throw error; }
      // Windows may deny directory handles. The completed file itself was flushed.
      try {
        const dir = fs.openSync(directory, 'r');
        try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
      } catch {}
    } finally {
      try { fs.unlinkSync(temporary); } catch {}
    }
    return record.sequence;
  }

  return Object.freeze({ load, save });
}

module.exports = { createColonyCheckpointStore };
