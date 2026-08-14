import test from 'node:test';
import assert from 'node:assert/strict';
import { clearKnowledgeBankCache } from '../src/knowledge-bank-loader.js';
import { clearKnowledgeSubjectCache } from '../src/knowledge-subject-loader.js';
import { buildWriterContextPacket } from '../src/writer-context-resolver.js';

const registry = {
  canonicalEstablishedVoices: [{ id: 'uial', displayName: 'Uial', runtimeAliases: ['uial'] }],
  developingVoices: [],
};

const voiceManifest = {
  voices: { uial: { displayName: 'Uial', banks: ['./cells/uial/core.cells.json'] } },
};

const voiceBank = {
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

const subjectManifest = {
  contract: 'arcsweep.subject-bank-manifest/v1',
  subjects: {
    'narrative_voice:deep-third': { label: 'Deep Third', banks: ['./cells/narrators/deep-third.cells.json'] },
    'character:kestrelle': { label: 'Kestrelle', banks: ['./cells/characters/kestrelle.cells.json'] },
  },
};

const narratorBank = {
  cells: [{
    id: 'deep-third.distance.close',
    cellType: 'writing_style_rule',
    subject: { kind: 'narrative_voice', id: 'deep-third' },
    predicate: 'keeps_distance',
    value: 'close third person',
    status: 'active',
    authority: { kind: 'user_confirmed', confidence: 1 },
    source: { surface: 'github', locator: 'test/narrator.md' },
    mutability: 'stable_core',
  }],
};

const characterBank = {
  cells: [
    {
      id: 'kestrelle.identity.name',
      cellType: 'identity',
      subject: { kind: 'character', id: 'kestrelle' },
      predicate: 'has_name',
      value: 'Kestrelle',
      status: 'stable',
      authority: { kind: 'project_canon', confidence: 1 },
      source: { surface: 'github', locator: 'test/kestrelle.md' },
      mutability: 'stable_core',
    },
    {
      id: 'kestrelle.knowledge.future',
      cellType: 'character_knowledge',
      subject: { kind: 'character', id: 'kestrelle' },
      predicate: 'knows',
      value: 'future revelation',
      status: 'active',
      authority: { kind: 'project_canon', confidence: 1 },
      source: { surface: 'github', locator: 'test/chapter-8.md' },
      temporal: { validFrom: '2026-10-01T00:00:00.000Z', validUntil: null },
      mutability: 'revisable_with_provenance',
    },
  ],
};

function fakeFetch(url) {
  const value = String(url);
  if (value.endsWith('/voice-bank-registry.json')) return Promise.resolve({ ok: true, json: async () => registry });
  if (value.endsWith('/cell-banks.json')) return Promise.resolve({ ok: true, json: async () => voiceManifest });
  if (value.endsWith('/cells/uial/core.cells.json')) return Promise.resolve({ ok: true, json: async () => voiceBank });
  if (value.endsWith('/subject-banks.json')) return Promise.resolve({ ok: true, json: async () => subjectManifest });
  if (value.endsWith('/cells/narrators/deep-third.cells.json')) return Promise.resolve({ ok: true, json: async () => narratorBank });
  if (value.endsWith('/cells/characters/kestrelle.cells.json')) return Promise.resolve({ ok: true, json: async () => characterBank });
  return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
}

test('rich text field composes voice, narrator, and temporally bounded POV character cortex', async () => {
  clearKnowledgeBankCache();
  clearKnowledgeSubjectCache();
  const fieldContext = {
    field: { key: 'script-form:content', label: 'Scene prose', type: 'rich-text', value: 'The lantern burned.' },
    form: { id: 'script-form', roomId: 'scripts' },
    page: {
      worldId: 'taaveren-vaen',
      documentId: 'chapter-1',
      sceneId: 'scene-1',
      storyAt: '2026-09-01T00:00:00.000Z',
      narrativeVoiceId: 'deep-third',
      povCharacterId: 'kestrelle',
    },
  };

  const packet = await buildWriterContextPacket(fieldContext, {
    voiceIds: ['uial'],
    perVoiceLimit: 12,
    resolveLocalState: false,
    fetchImpl: fakeFetch,
    includeLocalLearning: false,
    includeLocalSubjects: false,
  });

  assert.equal(packet.contract, 'arcsweep.writer-context-packet/v2');
  assert.deepEqual(packet.selection.resolvedVoiceIds, ['uial']);
  assert.equal(packet.rules.noRawChainOfThought, true);
  assert.equal(packet.rules.noSilentFieldMutation, true);
  assert.equal(packet.rules.characterKnowledgeMustRespectTemporalScope, true);
  assert.equal(packet.voices[0].displayName, 'Uial');
  assert.deepEqual(packet.voices[0].cells.map((cell) => cell.id).sort(), ['uial.test.drift', 'uial.test.thinking']);

  const narrator = packet.subjects.find((subject) => subject.kind === 'narrative_voice');
  const character = packet.subjects.find((subject) => subject.kind === 'character');
  assert.deepEqual(narrator.cells.map((cell) => cell.id), ['deep-third.distance.close']);
  assert.deepEqual(character.cells.map((cell) => cell.id), ['kestrelle.identity.name']);
  assert.equal(character.cells.some((cell) => cell.id === 'kestrelle.knowledge.future'), false);
});
