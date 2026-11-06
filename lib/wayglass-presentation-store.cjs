'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// Private, immutable host receipts. Configure outside the checkout and web root.
function createPresentationStore({ directory } = {}) {
  if (!directory || !path.isAbsolute(directory)) throw new TypeError('Absolute private receipt directory required');
  const filename = key => {
    if (!/^[a-f0-9]{64}$/.test(key || '')) throw new TypeError('Invalid receipt key');
    return path.join(directory, key + '.json');
  };
  async function get(key) {
    try {
      const record = JSON.parse(await fs.readFile(filename(key), 'utf8'));
      if (record.key !== key) throw new Error('Receipt key mismatch');
      return record;
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  async function putIfAbsent(key, record) {
    const target = filename(key);
    if (record.key !== key) throw new Error('Receipt key mismatch');
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const temporary = path.join(directory, '.' + randomUUID() + '.tmp');
    let handle;
    try {
      handle = await fs.open(temporary, 'wx', 0o600);
      await handle.writeFile(JSON.stringify(record));
      await handle.sync();
      await handle.close(); handle = null;
      try { await fs.link(temporary, target); }
      catch (error) { if (error.code === 'EEXIST') return false; throw error; }
      // Directory sync establishes publication durability on supported hosts.
      // Unsupported filesystems fail explicitly; callers must not report success.
      const dir = await fs.open(directory, 'r');
      try { await dir.sync(); } finally { await dir.close(); }
      return true;
    } finally {
      if (handle) await handle.close();
      await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
  }
  return { get, putIfAbsent };
}
module.exports = { createPresentationStore };
