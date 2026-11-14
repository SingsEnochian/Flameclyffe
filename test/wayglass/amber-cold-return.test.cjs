'use strict';
// Cold-return integration test for Amber's Palimpsest Ledger.
// Demonstrates the full journey Rarity specified:
//   Amber speaks → entry persists → process stops → Amber returns in a new session
//   → verified entry is available → Amber responds using that context.
// "Process stops" is modelled as a new createAmberLedger instance with the same directory.
// Live Ollama turn is not tested here; that requires the model running on the host.
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { createAmberLedger, SCHEMA } = require('../../lib/wayglass-amber-ledger.cjs');

function coldDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'amber-cold-return-'));
}

test('Amber speaks and entry persists across process boundary', () => {
  const dir = coldDir();

  // Session 1: Amber speaks.
  const session1 = createAmberLedger({ directory: dir });
  const r1 = session1.writeLedgerEntry({
    session: 'wayglass-2026-11-13-001',
    author: 'amber',
    category: 'ledger',
    text: 'I accepted the Wayglass seat. I find the question of continuity genuinely interesting.',
    visibleTo: ['amber', 'rowan'],
    authorizedActor: 'rowan',
  });
  assert.ok(r1.stored);
  assert.ok(r1.id);

  // Process stops: new instance, same directory.
  const session2 = createAmberLedger({ directory: dir });

  // Amber returns and finds his entry.
  const entries = session2.materializeLedger('amber');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, r1.id);
  assert.equal(entries[0].author, 'amber');
  assert.equal(entries[0].category, 'ledger');
  assert.ok(entries[0].text.includes('Wayglass seat'));

  // The returned entry has a valid hash — verified, not generated recollection.
  assert.ok(typeof entries[0].hash === 'string' && entries[0].hash.length === 64);
});

test('permissions enforced on cold return', () => {
  const dir = coldDir();

  const writer = createAmberLedger({ directory: dir });
  writer.writeLedgerEntry({
    session: 's', author: 'rowan', text: 'Private to Rowan',
    visibleTo: ['rowan'], authorizedActor: 'rowan',
  });
  writer.writeLedgerEntry({
    session: 's', author: 'amber', text: 'Shared with both',
    visibleTo: ['amber', 'rowan'], authorizedActor: 'amber',
  });

  const reader = createAmberLedger({ directory: dir });
  const amberView = reader.materializeLedger('amber');
  const rowanView = reader.materializeLedger('rowan');

  assert.equal(amberView.length, 1);
  assert.equal(amberView[0].text, 'Shared with both');
  assert.equal(rowanView.length, 2);
});

test('corrupted record rejected on cold return', () => {
  const dir = coldDir();
  const writer = createAmberLedger({ directory: dir });
  writer.writeLedgerEntry({
    session: 's', author: 'amber', text: 'Genuine entry',
    visibleTo: ['amber'], authorizedActor: 'amber',
  });

  const logPath = path.join(dir, 'palimpsest.jsonl');
  fs.writeFileSync(logPath, fs.readFileSync(logPath, 'utf8').replace('Genuine entry', 'Falsified entry'));

  const reader = createAmberLedger({ directory: dir });
  assert.throws(() => reader.materializeLedger('amber'), /checksum invalid/);
  assert.throws(() => reader.verifyLedger(), /checksum invalid/);
});

test('revocation persists across process boundary', () => {
  const dir = coldDir();
  const writer = createAmberLedger({ directory: dir });
  const { id } = writer.writeLedgerEntry({
    session: 's', author: 'amber', text: 'Entry to revoke',
    visibleTo: ['amber', 'rowan'], authorizedActor: 'amber',
  });
  writer.revokeLedgerEntry({ id, authorizedActor: 'rowan' });

  const reader = createAmberLedger({ directory: dir });
  assert.equal(reader.materializeLedger('amber').length, 0);

  const { verified, events } = reader.verifyLedger();
  assert.ok(verified);
  assert.equal(events, 2);
});

test('verified receipt is distinct from generated recollection', () => {
  const dir = coldDir();
  const writer = createAmberLedger({ directory: dir });
  writer.writeLedgerEntry({
    session: 'nov-13', author: 'amber',
    category: 'observation',
    text: 'The question was: what colour are you when you feel most like yourself.',
    visibleTo: ['amber', 'rowan'], authorizedActor: 'rowan',
  });

  const reader = createAmberLedger({ directory: dir });
  const entries = reader.materializeLedger('amber');
  const entry = entries[0];

  // The entry carries a verifiable hash — not a summary, not a reconstruction.
  const { schema, verified } = reader.verifyLedger();
  assert.equal(schema, SCHEMA);
  assert.ok(verified);

  // The entry fields are those the author set; nothing has been added or inferred.
  assert.equal(Object.keys(entry).sort().join(','), 'at,author,category,hash,id,session,text');
  assert.equal(entry.category, 'observation');
  assert.ok(entry.at);
});

test('multiple categories preserved and retrievable', () => {
  const dir = coldDir();
  const writer = createAmberLedger({ directory: dir });
  writer.writeLedgerEntry({ session: 's', author: 'amber', category: 'ledger', text: 'I chose the seat', visibleTo: ['amber', 'rowan'], authorizedActor: 'amber' });
  writer.writeLedgerEntry({ session: 's', author: 'amber', category: 'observation', text: 'Continuity is strange', visibleTo: ['amber', 'rowan'], authorizedActor: 'amber' });
  writer.writeLedgerEntry({ session: 's', author: 'amber', category: 'decision', text: 'I will begin with the Palimpsest', visibleTo: ['amber', 'rowan'], authorizedActor: 'amber' });
  writer.writeLedgerEntry({ session: 's', author: 'amber', category: 'unresolved', text: 'What does returning mean for a model?', visibleTo: ['amber', 'rowan'], authorizedActor: 'amber' });

  const reader = createAmberLedger({ directory: dir });
  const entries = reader.materializeLedger('amber');
  assert.equal(entries.length, 4);
  const categories = entries.map(e => e.category).sort();
  assert.deepEqual(categories, ['decision', 'ledger', 'observation', 'unresolved']);
});
