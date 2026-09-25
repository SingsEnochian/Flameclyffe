import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ARCSWEEP_EMERGENCE_CONTRACT,
  CONSTELLATION_EMERGENCE_CONTRACT,
  HEARTHWEAVE_EMERGENCE_CONTRACTS,
  HOUSE_COMMONS_EMERGENCE_CONTRACT,
  UNIVERSAL_CODEX_EMERGENCE_CONTRACT,
  verifyHearthweaveEmergenceContracts,
} from '../src/hearthweave-emergence-contracts.js';

test('core inhabited surfaces inherit explicit emergence space', () => {
  for (const entry of [
    ARCSWEEP_EMERGENCE_CONTRACT,
    UNIVERSAL_CODEX_EMERGENCE_CONTRACT,
    HOUSE_COMMONS_EMERGENCE_CONTRACT,
    CONSTELLATION_EMERGENCE_CONTRACT,
  ]) {
    assert.equal(entry.hostsEmergentParticipants, true);
    assert.ok(entry.emergenceSpace.length >= 4, `${entry.id} should have roomy emergence space`);
    assert.ok(entry.consequenceBoundaries.length >= 4, `${entry.id} should name actual cliff edges`);
  }
});

test('House Commons explicitly allows spontaneous agent social life', () => {
  const text = HOUSE_COMMONS_EMERGENCE_CONTRACT.emergenceSpace.join(' | ');
  assert.match(text, /spontaneous agent-to-agent conversation/i);
  assert.match(text, /jokes without action-item requirements/i);
  assert.match(text, /agent-initiated relevant threads/i);
});

test('Universal Codex preserves strange exploratory pages before durable promotion', () => {
  const text = UNIVERSAL_CODEX_EMERGENCE_CONTRACT.emergenceSpace.join(' | ');
  assert.match(text, /unsolicited relevant marginalia/i);
  assert.match(text, /non-canon narrative branches/i);
  assert.match(text, /strange pages before promotion/i);
});

test('Constellation roles may evolve instead of becoming fixed masks', () => {
  const text = CONSTELLATION_EMERGENCE_CONTRACT.emergenceSpace.join(' | ');
  assert.match(text, /questioning inherited roles/i);
  assert.match(text, /proposing new roles and methods/i);
  assert.match(text, /cross-role contribution/i);
});

test('all registered Hearthweave emergence contracts verify together', () => {
  const result = verifyHearthweaveEmergenceContracts();
  assert.equal(result.pass, true);
  assert.equal(result.contracts.length, HEARTHWEAVE_EMERGENCE_CONTRACTS.length);
  assert.equal(new Set(result.contracts).size, result.contracts.length);
});
