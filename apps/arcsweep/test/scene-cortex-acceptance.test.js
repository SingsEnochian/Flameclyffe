import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSceneCortexAcceptanceReport } from '../src/scene-cortex-acceptance.js';
import { clearKnowledgeSubjectCache } from '../src/knowledge-subject-loader.js';

const manifest = {
  contract: 'arcsweep.subject-bank-manifest/v1',
  subjects: {
    'character:kestrelle': {
      label: 'Kestrelle al’Var',
      worldIds: ['taaveren-vaen', 'taveren-vaen'],
      banks: ['./cells/characters/kestrelle.cells.json'],
      status: 'active-canon-cortex',
    },
    'narrative_voice:taaveren-vaen-narrator': {
      label: 'Ta’veren Vaen Narrative Voice',
      worldIds: ['taaveren-vaen', 'taveren-vaen'],
      banks: ['./cells/narrative-voices/taaveren-vaen-narrator.cells.json'],
      status: 'provisional-derived-cortex',
    },
    'writing_style:taaveren-vaen-longform': {
      label: 'Ta’veren Vaen Longform',
      worldIds: ['taaveren-vaen', 'taveren-vaen'],
      banks: ['./cells/writing-styles/taaveren-vaen-longform.cells.json'],
      status: 'provisional-derived-cortex',
    },
  },
};

function cell({ id, cellType, kind, subjectId, predicate, value, authority = 'derived', status = 'active', temporal = undefined }) {
  return {
    id,
    cellType,
    subject: { kind, id: subjectId, worldId: 'taaveren-vaen' },
    predicate,
    value,
    status,
    authority: { kind: authority, confidence: 1 },
    source: { surface: 'github', locator: `test/${id}.md` },
    scope: { worldIds: ['taaveren-vaen', 'taveren-vaen'] },
    ...(temporal ? { temporal } : {}),
    mutability: 'revisable_with_provenance',
  };
}

const characterBank = {
  cells: [
    cell({
      id: 'kestrelle.identity.active-name',
      cellType: 'identity',
      kind: 'character',
      subjectId: 'kestrelle',
      predicate: 'named',
      value: 'Kestrelle al’Var',
      authority: 'project_canon',
    }),
    cell({
      id: 'kestrelle.identity.restoration-era',
      cellType: 'identity',
      kind: 'character',
      subjectId: 'kestrelle',
      predicate: 'lives_during',
      value: 'Restoration',
      authority: 'project_canon',
    }),
    cell({
      id: 'kestrelle.knowledge.future-letter',
      cellType: 'character_knowledge',
      kind: 'character',
      subjectId: 'kestrelle',
      predicate: 'knows',
      value: 'the sealed letter contains a map',
      authority: 'project_canon',
      temporal: { storyOrderFrom: 57, storyOrderUntil: null },
    }),
  ],
};

const narratorBank = {
  cells: [
    cell({
      id: 'taaveren-vaen-narrator.identity.world-facing',
      cellType: 'identity',
      kind: 'narrative_voice',
      subjectId: 'taaveren-vaen-narrator',
      predicate: 'functions_as',
      value: 'world-facing prose intelligence with POV discipline',
    }),
    cell({
      id: 'taaveren-vaen-narrator.preference.structure',
      cellType: 'preference',
      kind: 'narrative_voice',
      subjectId: 'taaveren-vaen-narrator',
      predicate: 'prefers',
      value: 'concrete sensory or structural evidence before abstract explanation',
    }),
  ],
};

const styleBank = {
  cells: [
    cell({
      id: 'taaveren-vaen-longform.rule.embodied',
      cellType: 'writing_style_rule',
      kind: 'writing_style',
      subjectId: 'taaveren-vaen-longform',
      predicate: 'writes_as',
      value: 'inhabited long-form prose',
    }),
    cell({
      id: 'taaveren-vaen-longform.open.tense',
      cellType: 'open_question',
      kind: 'writing_style',
      subjectId: 'taaveren-vaen-longform',
      predicate: 'open_axis',
      value: 'default narrative tense',
      status: 'open',
    }),
  ],
};

function fakeFetchWith(character = characterBank) {
  return async function fakeFetch(url) {
    const value = String(url);
    if (value.endsWith('/subject-banks.json')) return { ok: true, json: async () => manifest };
    if (value.endsWith('/cells/characters/kestrelle.cells.json')) return { ok: true, json: async () => character };
    if (value.endsWith('/cells/narrative-voices/taaveren-vaen-narrator.cells.json')) return { ok: true, json: async () => narratorBank };
    if (value.endsWith('/cells/writing-styles/taaveren-vaen-longform.cells.json')) return { ok: true, json: async () => styleBank };
    return { ok: false, status: 404, json: async () => ({}) };
  };
}

const fieldContext = {
  contract: 'arcsweep.constellation-field-context/v2',
  trigger: 'scene-cortex-acceptance',
  field: {
    key: 'acceptance-script:content',
    label: 'Acceptance scene prose',
    type: 'rich-text',
    value: 'Rain had left the road dark and shining between the wagon ruts.',
  },
  form: { id: 'script-form', recordId: 'acceptance-kestrelle-roadside-care-v1' },
  page: {
    worldId: 'taaveren-vaen',
    worldIdAliases: ['taaveren-vaen', 'taveren-vaen'],
    documentId: 'acceptance-kestrelle-roadside-care-v1',
    sceneId: 'acceptance-roadside-care',
    storyAt: 'Restoration · roadside care after rain',
    storyOrder: 12,
    povCharacterId: 'kestrelle',
    narrativeVoiceId: 'taaveren-vaen-narrator',
    writingStyleId: 'taaveren-vaen-longform',
    sceneCharacterIds: [],
  },
};

const noLocalCells = async () => [];

test('Kestrelle first-scene cortex resolves character, narrator, style and chronology without model invocation', async () => {
  clearKnowledgeSubjectCache();
  const report = await buildSceneCortexAcceptanceReport(fieldContext, {
    voiceIds: [],
    resolveLocalState: false,
    fetchImpl: fakeFetchWith(),
    localCellLoader: noLocalCells,
    includeLocalSubjects: false,
  });

  assert.equal(report.passed, true);
  assert.equal(report.rules.invokesModels, false);
  assert.equal(report.rules.mutatesField, false);
  assert.equal(report.rules.promotesCanon, false);
  assert.equal(report.summary.storyOrder, 12);
  assert.equal(report.summary.povCharacterId, 'kestrelle');
  assert.equal(report.summary.narrativeVoiceId, 'taaveren-vaen-narrator');
  assert.equal(report.summary.writingStyleId, 'taaveren-vaen-longform');

  const character = report.packet.subjects.find((item) => item.kind === 'character');
  const style = report.packet.subjects.find((item) => item.kind === 'writing_style');
  assert.ok(character.cells.some((item) => item.value === 'Kestrelle al’Var'));
  assert.ok(character.cells.every((item) => item.value !== 'the sealed letter contains a map'));
  assert.ok(style.cells.some((item) => item.cellType === 'open_question' && item.value === 'default narrative tense'));
});

test('scene cortex acceptance fails when a superseded protagonist name leaks into active subject context', async () => {
  clearKnowledgeSubjectCache();
  const leakingBank = {
    cells: [
      ...characterBank.cells,
      cell({
        id: 'kestrelle.identity.leaked-old-name',
        cellType: 'identity',
        kind: 'character',
        subjectId: 'kestrelle',
        predicate: 'named',
        value: 'Kestrelle al’Valar',
        authority: 'derived',
      }),
    ],
  };
  const report = await buildSceneCortexAcceptanceReport(fieldContext, {
    voiceIds: [],
    resolveLocalState: false,
    fetchImpl: fakeFetchWith(leakingBank),
    localCellLoader: noLocalCells,
    includeLocalSubjects: false,
  });
  assert.equal(report.passed, false);
  const leakCheck = report.checks.find((item) => item.id === 'superseded-name');
  assert.equal(leakCheck.passed, false);
});
