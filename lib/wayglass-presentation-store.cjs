'use strict';
const fs = require('node:fs/promises');
const { constants } = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { snapshot, validResource, assertReceipt } = require('./wayglass-presentation-receipt.cjs');

// Directory must be provisioned by the host outside its checkout/web root. Its
// parent-directory creation/durability is the host's responsibility, not implied
// by mkdir(recursive). Runtime evidence is immutable and never migrated silently.
function createPresentationStore({ directory, filesystem = fs } = {}) {
  if (!directory || !path.isAbsolute(directory)) throw new TypeError('Absolute private receipt directory required');
  const filename = key => {
    if (!/^[a-f0-9]{64}$/.test(key || '')) throw new TypeError('Invalid receipt key');
    return path.join(directory,key+'.json');
  };
  async function syncDirectory() {
    const info = await filesystem.lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink() || (process.platform !== 'win32' && (info.mode & 0o077))) throw new Error('Private host directory required');
    const handle = await filesystem.open(directory,'r');
    try { await handle.sync(); } finally { await handle.close(); }
  }
  async function get(key) {
    const target = filename(key);
    // Every read, including duplicate/recovery reads, establishes directory
    // durability. An unsupported/failing fsync cannot turn into later success.
    await syncDirectory();
    let handle;
    try {
      handle = await filesystem.open(target,constants.O_RDONLY | constants.O_NOFOLLOW);
      const info = await handle.stat();
      if (!info.isFile() || (process.platform !== 'win32' && (info.mode & 0o077))) throw new Error('Private receipt file required');
      return assertReceipt(JSON.parse(await handle.readFile('utf8')),key);
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    finally { if (handle) await handle.close(); }
  }
  async function putIfAbsent(key, record) {
    const captured = snapshot(record), target = filename(key);
    assertReceipt(captured,key);
    await syncDirectory();
    const temporary = path.join(directory,'.'+randomUUID()+'.tmp');
    let handle;
    try {
      handle = await filesystem.open(temporary,'wx',0o600);
      await handle.writeFile(JSON.stringify(captured)); await handle.sync();
      await handle.close(); handle = null;
      let inserted = true;
      try { await filesystem.link(temporary,target); }
      catch (error) { if (error.code === 'EEXIST') inserted = false; else throw error; }
      await syncDirectory();
      return inserted;
    } finally {
      if (handle) await handle.close();
      await filesystem.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
  }
  async function listQueued({resource,after = '',limit = 100} = {}) {
    if (!validResource(resource) || (after !== '' && !/^[a-f0-9]{64}$/.test(after)) || !Number.isInteger(limit) || limit < 1 || limit > 1000) throw new TypeError('Resource and bounded recovery page required');
    await syncDirectory();
    const entries = (await filesystem.readdir(directory)).filter(name=>/^[a-f0-9]{64}\.json$/.test(name)).sort();
    const records = []; let scannedThrough = null, exhausted = true;
    for (const entry of entries) {
      const key = entry.slice(0,-5); if (key <= after) continue;
      scannedThrough = key;
      const record = await get(key); // Fail closed on damaged evidence; never skip it silently.
      if (record && record.resource === resource) records.push({key,receipt_id:record.receipt_id,resource:record.resource});
      if (records.length === limit) { exhausted = false; break; }
    }
    return {records,next:exhausted ? null : scannedThrough};
  }
  return { get, putIfAbsent, listQueued };
}
module.exports = { createPresentationStore };
