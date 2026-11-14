'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { createAmberLedger } = require('./wayglass-amber-ledger.cjs');

function tmpLedger() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amber-ledger-test-'));
  return createAmberLedger({ directory: dir });
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'amber-ledger-'));
}

test('write and retrieve in same process', () => {
  const ledger = tmpLedger();
  const result = ledger.writeLedgerEntry({
    session: 'first', author: 'amber', text: 'I accepted the Wayglass seat',
    visibleTo: ['amber', 'rowan'], authorizedActor: 'amber',
  });
  assert.ok(result.stored);
  assert.ok(typeof result.id === 'string' && result.id.length > 0);
  assert.equal(result.seq, 1);
  const entries = ledger.materializeLedger('amber');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].text, 'I accepted the Wayglass seat');
  assert.equal(entries[0].author, 'amber');
});

test('cold return across independent ledger instances', () => {
  const dir = tmpDir();
  const writer = createAmberLedger({ directory: dir });
  const written = writer.writeLedgerEntry({
    session: 'cold', author: 'amber', text: 'Cold memory',
    visibleTo: ['amber', 'rowan'], authorizedActor: 'amber',
  });

  const reader = createAmberLedger({ directory: dir });
  const entries = reader.materializeLedger('amber');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, written.id);
  assert.equal(entries[0].text, 'Cold memory');
  assert.equal(entries[0].hash, written.hash);
});

test('access filtering enforced', () => {
  const ledger = tmpLedger();
  ledger.writeLedgerEntry({
    session: 's', author: 'rowan', text: 'Owner only',
    visibleTo: ['rowan'], authorizedActor: 'rowan',
  });
  assert.equal(ledger.materializeLedger('amber').length, 0);
  assert.equal(ledger.materializeLedger('rowan').length, 1);
});

test('amber-only entry not visible to rowan unless rowan is in visibleTo', () => {
  const ledger = tmpLedger();
  ledger.writeLedgerEntry({
    session: 's', author: 'amber', text: 'Amber private',
    visibleTo: ['amber'], authorizedActor: 'amber',
  });
  assert.equal(ledger.materializeLedger('amber').length, 1);
  assert.equal(ledger.materializeLedger('rowan').length, 0);
});

test('revocation hides entry and chain remains intact', () => {
  const ledger = tmpLedger();
  const { id } = ledger.writeLedgerEntry({
    session: 's', author: 'amber', text: 'To be revoked',
    visibleTo: ['amber', 'rowan'], authorizedActor: 'amber',
  });
  ledger.revokeLedgerEntry({ id, authorizedActor: 'rowan' });

  assert.equal(ledger.materializeLedger('amber').length, 0);
  assert.equal(ledger.materializeLedger('rowan').length, 0);
  const { verified, events } = ledger.verifyLedger();
  assert.ok(verified);
  assert.equal(events, 2);
});

test('tampered record fails verification', () => {
  const dir = tmpDir();
  const ledger = createAmberLedger({ directory: dir });
  ledger.writeLedgerEntry({
    session: 's', author: 'amber', text: 'Original',
    visibleTo: ['amber'], authorizedActor: 'amber',
  });
  const logPath = path.join(dir, 'palimpsest.jsonl');
  fs.writeFileSync(logPath, fs.readFileSync(logPath, 'utf8').replace('Original', 'Altered'));
  assert.throws(() => ledger.verifyLedger(), /checksum invalid/);
});

test('unauthorized write rejected', () => {
  const ledger = tmpLedger();
  assert.throws(
    () => ledger.writeLedgerEntry({ session: 's', author: 'amber', text: 'x', visibleTo: ['amber'], authorizedActor: 'unknown' }),
    /Unauthorized actor/,
  );
  assert.throws(
    () => ledger.writeLedgerEntry({ session: 's', author: 'rowan', text: 'x', visibleTo: ['rowan'], authorizedActor: 'amber' }),
    /not authorized/,
  );
});

test('owner can write as either author', () => {
  const ledger = tmpLedger();
  ledger.writeLedgerEntry({
    session: 's', author: 'amber', text: 'Transcribed by Rowan',
    visibleTo: ['amber', 'rowan'], authorizedActor: 'rowan',
  });
  assert.equal(ledger.materializeLedger('amber').length, 1);
  assert.equal(ledger.materializeLedger('amber')[0].author, 'amber');
});

test('category and text validation', () => {
  const ledger = tmpLedger();
  assert.throws(
    () => ledger.writeLedgerEntry({ session: 's', author: 'amber', category: 'bogus', text: 'x', visibleTo: ['amber'], authorizedActor: 'amber' }),
    /Unknown category/,
  );
  assert.throws(
    () => ledger.writeLedgerEntry({ session: 's', author: 'amber', text: 'x'.repeat(4001), visibleTo: ['amber'], authorizedActor: 'amber' }),
    /exceeds/,
  );
});

test('hash chain links across multiple entries', () => {
  const ledger = tmpLedger();
  ledger.writeLedgerEntry({ session: 's', author: 'amber', text: 'One', visibleTo: ['amber'], authorizedActor: 'amber' });
  ledger.writeLedgerEntry({ session: 's', author: 'rowan', text: 'Two', visibleTo: ['rowan'], authorizedActor: 'rowan' });
  ledger.writeLedgerEntry({ session: 's', author: 'amber', text: 'Three', visibleTo: ['amber', 'rowan'], authorizedActor: 'amber' });

  const { verified, events } = ledger.verifyLedger();
  assert.ok(verified);
  assert.equal(events, 3);
});

test('verify includes schema and head hash', () => {
  const ledger = tmpLedger();
  const { schema, verified, events, head } = ledger.verifyLedger();
  assert.equal(schema, 'wayglass.amber-ledger/v0.1');
  assert.ok(verified);
  assert.equal(events, 0);
  assert.equal(head, 'GENESIS');
});
