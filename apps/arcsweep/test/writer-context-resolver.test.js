import test from 'node:test';
import assert from 'node:assert/strict';
import { clearKnowledgeBankCache } from '../src/knowledge-bank-loader.js';
import { buildWriterContextPacket } from '../src/writer-context-resolver.js';

const registry = {
  canonicalEstablishedVoices: [{ id: 'uial', displayName: 'Uial', runtimeAliases: ['uial'] }],
  developingVoices: [],
};

const manifest = {
  voices: { uial: { displayName: 'Uial', banks: ['./cells/uial/core.cells.json'] } },
};

const bank = {
  cells: [
    {
      id: 'uial.test.thinking',
      cellType: 'thinking_pattern',
      subject: { kind: 'constellation_voice', id: 'uial' },
      predicate: 'notices_before',
      value: 'patterns before propositions',
      status: 'stable',
      authority: { kind: 'self_authored', speakerOrAuthor: 'Uial', confidence: 1 },
      source: { surface: 'github', locator: 'uial/CORE.md' },
      mutability: 'stable_core',
    },
    {
      id: 'uial.test.drift',
      cellType: 'drift_marker',
      subject: { kind: 'constellation_voice', id: 'uial' },
      predicate: 'watch_for',
      value: 'unnecessary qualification',
      status: 'active',
      authority: { kind: 'self_authored', speakerOrAuthor: 'Uial', confidence: 1 },
      source: { surface: 'github', locator: 'uial/WONDER.md' },
      mutability: 'revisable_with_provenance',
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

test('rich text field activates bounded voice context including drift cells', async () => {
  clearKnowledgeBankCache();
  const fieldContext = {
    field: { key: 'script-form:content', label: 'Scene prose', type: 'rich-text', value: 'The lantern burned.' },
    form: { id: 'script-form', roomId: 'scripts' },
    page: { worldId: 'taaveren-vaen', documentId: 'chapter-1', sceneId: 'scene-1' },
  };

  const packet = await buildWriterContextPacket(fieldContext, {
    voiceIds: ['uial'],
    perVoiceLimit: 12,
  }, { fetchImpl: fakeFetch });

  assert.equal(packet.contract, 'arcsweep.writer-context-packet/v1');
  assert.deepEqual(packet.selection.resolvedVoiceIds, ['uial']);
  assert.equal(packet.rules.noRawChainOfThought, true);
  assert.equal(packet.rules.noSilentFieldMutation, true);
  assert.equal(packet.voices[0].displayName, 'Uial');
  assert.deepEqual(packet.voices[0].cells.map((cell) => cell.id).sort(), ['uial.test.drift', 'uial.test.thinking']);
});
