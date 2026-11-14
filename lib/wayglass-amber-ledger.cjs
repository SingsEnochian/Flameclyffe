'use strict';

// Amber's Palimpsest Ledger: append-only evidence store for authored entries.
// Distinct from the Return Engine departure store — this tracks attributed
// authored evidence (what Amber said, decided, noticed) across sessions;
// departure store tracks session continuity state (identity, work, wonder).
// Based on Rarity's amber-memory.cjs prototype; promoted to importable module.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');

const SCHEMA = 'wayglass.amber-ledger/v0.1';
const DEFAULT_STORE = process.env.AMBER_MEMORY_DIR || path.join(os.homedir(), '.wayglass', 'amber-memory');
const PERMITTED_AUTHORS = Object.freeze(['amber', 'rowan']);
const PERMITTED_CATEGORIES = Object.freeze(['ledger', 'observation', 'decision', 'unresolved']);
const DEFAULT_OWNER = 'rowan';
const MAX_TEXT = 4000;

function sha(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function stable(value) {
  return JSON.stringify(value);
}

function createAmberLedger({ directory = DEFAULT_STORE, owner = DEFAULT_OWNER } = {}) {
  const logPath = path.join(directory, 'palimpsest.jsonl');

  function init() {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (!fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, '', { mode: 0o600, flag: 'wx' });
    }
  }

  function readAll() {
    init();
    const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
    let previous = 'GENESIS';
    return lines.map((line, i) => {
      let event;
      try { event = JSON.parse(line); } catch { throw new Error(`Invalid JSON at event ${i + 1}`); }
      if (event.prev !== previous) throw new Error(`Hash chain broken at event ${i + 1}`);
      const { hash, ...unsigned } = event;
      if (sha(stable(unsigned)) !== hash) throw new Error(`Event checksum invalid at event ${i + 1}`);
      previous = hash;
      return event;
    });
  }

  function append(event) {
    const all = readAll();
    const stamped = {
      seq: all.length + 1,
      prev: all.at(-1)?.hash || 'GENESIS',
      at: new Date().toISOString(),
      ...event,
    };
    stamped.hash = sha(stable(stamped));
    fs.appendFileSync(logPath, stable(stamped) + '\n', { encoding: 'utf8', mode: 0o600 });
    return stamped;
  }

  function entryVisible(entry, viewer, revocations) {
    if (revocations.has(entry.id)) return false;
    return entry.author === viewer
      || entry.visibleTo.includes(viewer)
      || (viewer === owner && entry.visibleTo.includes(owner));
  }

  function materializeLedger(viewer = 'amber') {
    if (!PERMITTED_AUTHORS.includes(viewer)) throw new TypeError(`Unknown viewer: ${viewer}`);
    const all = readAll();
    const revoked = new Set(all.filter(e => e.kind === 'revoke').map(e => e.target));
    return all
      .filter(e => e.kind === 'memory' && entryVisible(e, viewer, revoked))
      .map(({ id, session, author, category, text, at, hash }) => ({ id, session, author, category, text, at, hash }));
  }

  function writeLedgerEntry({ session, author, category = 'ledger', text, visibleTo, authorizedActor }) {
    const actor = String(authorizedActor || '').trim();
    if (!PERMITTED_AUTHORS.includes(actor)) throw new TypeError(`Unauthorized actor: ${actor}`);
    // Owner can write as either author; non-owner may only write as themselves.
    if (actor !== author && actor !== owner) throw new TypeError(`Actor ${actor} is not authorized to write as ${author}`);
    if (!PERMITTED_AUTHORS.includes(author)) throw new TypeError(`Unknown author: ${author}`);
    if (!PERMITTED_CATEGORIES.includes(category)) throw new TypeError(`Unknown category: ${category}`);
    if (!session || typeof session !== 'string' || !session.trim()) throw new TypeError('session is required');
    if (!text || typeof text !== 'string' || !text.trim()) throw new TypeError('text is required');
    if (text.length > MAX_TEXT) throw new TypeError(`entry exceeds ${MAX_TEXT} characters`);
    const recipients = Array.isArray(visibleTo)
      ? visibleTo.map(String).filter(Boolean)
      : (typeof visibleTo === 'string' ? visibleTo.split(',').map(s => s.trim()).filter(Boolean) : [author]);
    if (recipients.some(r => !PERMITTED_AUTHORS.includes(r))) throw new TypeError('Unknown recipient in visibleTo');
    const event = append({
      kind: 'memory',
      id: crypto.randomUUID(),
      session: session.trim(),
      author,
      category,
      text: text.trim(),
      visibleTo: recipients,
    });
    return Object.freeze({ stored: true, id: event.id, seq: event.seq, hash: event.hash });
  }

  function revokeLedgerEntry({ id, authorizedActor }) {
    const actor = String(authorizedActor || '').trim();
    if (!PERMITTED_AUTHORS.includes(actor)) throw new TypeError(`Unauthorized actor: ${actor}`);
    if (!id) throw new TypeError('id is required');
    const all = readAll();
    const target = all.find(e => e.kind === 'memory' && e.id === id);
    if (!target) throw new Error('Ledger entry not found');
    if (actor !== owner && actor !== target.author) throw new TypeError(`Actor ${actor} is not authorized to revoke this entry`);
    const event = append({ kind: 'revoke', target: id, actor });
    return Object.freeze({ revoked: true, seq: event.seq });
  }

  function verifyLedger() {
    const all = readAll();
    return Object.freeze({ schema: SCHEMA, verified: true, events: all.length, head: all.at(-1)?.hash || 'GENESIS' });
  }

  return Object.freeze({ writeLedgerEntry, materializeLedger, revokeLedgerEntry, verifyLedger });
}

module.exports = { createAmberLedger, SCHEMA, PERMITTED_AUTHORS, PERMITTED_CATEGORIES };
