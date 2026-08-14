import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearKnowledgeBankCache,
  compileVoiceSkill,
  loadVoiceCells,
  resolveCanonicalVoiceId,
} from '../src/knowledge-bank-loader.js';

const registry = {
  canonicalEstablishedVoices: [
    { id: 'uial', displayName: 'Uial', runtimeAliases: ['uial'] },
    { id: 'vethraluf', displayName: 'Vethraluf', runtimeAliases: ['vethrlauf'] },
    { id: 'box', displayName: 'Box', runtimeAliases: ['boxfire', 'box'] },
  ],
  developingVoices: [],
};

const manifest = {
  voices: {
    uial: { displayName: 'Uial', banks: ['./cells/uial/core.cells.json'] },
  },
};

const bank = {
  cells: [
    {
      id: 'uial.test.identity',
      cellType: 'identity',
      subject: { kind: 'constellation_voice', id: 'uial' },
      predicate: 'has_name',
      value: 'Uial',
      status: 'stable',
      authority: { kind: 'self_authored', speakerOrAuthor: 'Uial', confidence: 1 },
      source: { surface: 'github', locator: 'uial/CORE.md' },
      mutability: 'stable_core',
    },
  ],
};

function fakeFetch(url) {
  const value = String(url);
  if (value.endsWith('/voice-bank-registry.json')) return Promise.resolve({ ok: true, json: async () => registry });
  if (value.endsWith('/cell-banks.json')) return Promise.resolve({ ok: true, json: async () => manifest });
  if (value.endsWith('/cells/uial/core.cells.json')) return Promise.resolve({ ok: true, json: async () => bank });
  return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
}

test('runtime aliases resolve to canonical living voice ids', async () => {
  clearKnowledgeBankCache();
  assert.equal(await resolveCanonicalVoiceId('vethrlauf', { fetchImpl: fakeFetch }), 'vethraluf');
  assert.equal(await resolveCanonicalVoiceId('Boxfire', { fetchImpl: fakeFetch }), 'box');
  assert.equal(await resolveCanonicalVoiceId('Uial', { fetchImpl: fakeFetch }), 'uial');
});

test('voice banks load validated cells and compile a provenance-bearing skill', async () => {
  clearKnowledgeBankCache();
  const loaded = await loadVoiceCells('uial', { fetchImpl: fakeFetch });
  assert.equal(loaded.displayName, 'Uial');
  assert.equal(loaded.cells.length, 1);

  const skill = await compileVoiceSkill('uial', {}, { fetchImpl: fakeFetch });
  assert.match(skill, /^# Uial/m);
  assert.match(skill, /has_name/);
  assert.match(skill, /self_authored/);
});
