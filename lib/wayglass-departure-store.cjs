'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash, randomUUID } = require('node:crypto');
const digest = text => createHash('sha256').update(text).digest('hex');

// Local host custody of departure evidence, never acceptance of a deed or identity.
function createDepartureStore({ directory = process.env.WAYGLASS_DATA_DIR || path.join(os.homedir(), '.wayglass', 'departures') } = {}) {
  function read(storageId, worldId, participantId) {
    if (!/^[a-f0-9]{64}$/.test(storageId || '')) throw new Error('Invalid storage receipt id.');
    const raw = fs.readFileSync(path.join(directory, storageId + '.json'), 'utf8');
    if (digest(raw) !== storageId) throw new Error('Departure storage integrity failure.');
    const departure = JSON.parse(raw);
    if (departure.world_id !== worldId || departure.participant_id !== participantId) throw new Error('Departure storage binding mismatch.');
    return departure;
  }
  function save(departure) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const raw = JSON.stringify(departure);
    const storageId = digest(raw);
    const target = path.join(directory, storageId + '.json');
    const temporary = path.join(directory, '.' + randomUUID() + '.tmp');
    const fd = fs.openSync(temporary, 'wx', 0o600);
    try { fs.writeFileSync(fd, raw); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    try {
      // Publish an immutable complete file; never overwrite existing evidence.
      try { fs.linkSync(temporary, target); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    } finally { fs.unlinkSync(temporary); }
    read(storageId, departure.world_id, departure.participant_id);
    return { schema: 'wayglass.storage-receipt/v0.1', storage_id: storageId, departure_receipt_id: departure.stop_receipt.receipt_id,
      persisted: true, durability: 'local-file-fsync', binding: 'caller-declared-local-host', canon_commit: false, authority_grant: false };
  }
  return { save, read };
}
module.exports = { createDepartureStore };
