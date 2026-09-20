'use strict';

const path = require('node:path');
const fsp = require('node:fs/promises');

const OBSERVER_WITNESS_SCHEMA = 'arcsweep.observer-witness/v1';
const OBSERVER_WITNESS_DIRECTORY = 'observer-witness';
const OBSERVER_WITNESS_LATEST = 'latest.json';
const OBSERVER_WITNESS_LOG = 'receipts.jsonl';
const OBSERVER_WITNESS_LIMIT = 256;

function witnessPaths(storePaths) {
  if (!storePaths?.root) throw new Error('Observer witness store requires storePaths.root.');
  const root = path.join(storePaths.root, OBSERVER_WITNESS_DIRECTORY);
  return {
    root,
    latestFile: path.join(root, OBSERVER_WITNESS_LATEST),
    logFile: path.join(root, OBSERVER_WITNESS_LOG),
  };
}

async function ensureWitnessDir(storePaths) {
  const paths = witnessPaths(storePaths);
  await fsp.mkdir(paths.root, { recursive: true });
  return paths;
}

function validatePacket(packet) {
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) throw new Error('Observer witness packet must be an object.');
  if (packet.schema !== OBSERVER_WITNESS_SCHEMA) throw new Error(`Observer witness packet must use ${OBSERVER_WITNESS_SCHEMA}.`);
  if (!packet.receipt_id || !packet.created_at) throw new Error('Observer witness packet requires receipt_id and created_at.');
  return packet;
}

async function atomicWrite(filePath, text) {
  const temp = `${filePath}.tmp`;
  await fsp.writeFile(temp, text, 'utf8');
  await fsp.rename(temp, filePath);
}

async function trimLog(logFile, limit = OBSERVER_WITNESS_LIMIT) {
  let text = '';
  try { text = await fsp.readFile(logFile, 'utf8'); }
  catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length <= limit) return;
  const kept = lines.slice(-limit);
  await atomicWrite(logFile, `${kept.join('\n')}\n`);
}

async function appendObserverWitness(storePaths, packet) {
  const value = validatePacket(packet);
  const paths = await ensureWitnessDir(storePaths);
  const serialised = JSON.stringify(value);
  await atomicWrite(paths.latestFile, `${JSON.stringify(value, null, 2)}\n`);
  await fsp.appendFile(paths.logFile, `${serialised}\n`, 'utf8');
  await trimLog(paths.logFile);
  return {
    ok: true,
    receipt_id: value.receipt_id,
    latestFile: paths.latestFile,
    logFile: paths.logFile,
  };
}

async function readObserverWitness(storePaths, { limit = 24 } = {}) {
  const paths = await ensureWitnessDir(storePaths);
  let latest = null;
  let history = [];
  try { latest = JSON.parse(await fsp.readFile(paths.latestFile, 'utf8')); }
  catch (error) { if (error?.code !== 'ENOENT') throw error; }
  try {
    const text = await fsp.readFile(paths.logFile, 'utf8');
    const maximum = Math.max(1, Math.min(OBSERVER_WITNESS_LIMIT, Number(limit) || 24));
    history = text.split(/\r?\n/).filter(Boolean).slice(-maximum).flatMap((line) => {
      try {
        const value = JSON.parse(line);
        return value?.schema === OBSERVER_WITNESS_SCHEMA ? [value] : [];
      } catch {
        return [];
      }
    });
  } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  return { ok: true, latest, history, ...paths };
}

async function observerWitnessStatus(storePaths) {
  const paths = await ensureWitnessDir(storePaths);
  let latestReceiptId = null;
  let latestCreatedAt = null;
  try {
    const latest = JSON.parse(await fsp.readFile(paths.latestFile, 'utf8'));
    latestReceiptId = latest?.receipt_id || null;
    latestCreatedAt = latest?.created_at || null;
  } catch {}
  return {
    ok: true,
    schema: 'arcsweep.observer-witness-desktop-status/v1',
    directory: paths.root,
    latestFile: paths.latestFile,
    logFile: paths.logFile,
    latest_receipt_id: latestReceiptId,
    latest_created_at: latestCreatedAt,
    writable: true,
    authority: 'witness-only',
  };
}

module.exports = {
  OBSERVER_WITNESS_SCHEMA,
  OBSERVER_WITNESS_LIMIT,
  appendObserverWitness,
  observerWitnessStatus,
  readObserverWitness,
  witnessPaths,
};
