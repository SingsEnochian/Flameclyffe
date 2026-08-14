import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { normaliseControlValue } from '../src/constellation-lens.js';
import {
  buildMarginPrompt,
  clearConstellationRuntimeToken,
  hasConstellationRuntimeToken,
  setConstellationRuntimeToken,
} from '../src/constellation-runtime-adapter.js';
import { createLearningCellFromMargin } from '../src/knowledge-learning-store.js';
import { resolveKnowledgeCells, validateKnowledgeCell } from '../src/knowledge-graph.js';
import { expandWorldIds, worldIdsEquivalent } from '../src/world-id-aliases.js';

test('password values are never normalised into Lens context', () => {
  assert.equal(normaliseControlValue({ type: 'password', value: 'do-not-leak' }), null);
});

test('Constellation runtime token is session-memory state with explicit clear', () => {
  clearConstellationRuntimeToken();
  assert.equal(hasConstellationRuntimeToken(), false);
  assert.equal(setConstellationRuntimeToken('house-secret'), true);
  assert.equal(hasConstellationRuntimeToken(), true);
  clearConstellationRuntimeToken();
  assert.equal(hasConstellationRuntimeToken(), false);
});

test('margin prompt carries bounded cells and explicitly forbids hidden reasoning and silent edits', () => {
  const packet = {
    mode: 'writing',
    fieldContext: {
      field: { key: 'script-form:content', label: 'Scene prose', type: 'rich-text', value: 'The lantern burned.' },
      page: { worldId: 'taveren-vaen', documentId: 'chapter-1', sceneId: 'scene-1' },
    },
  };
  const voice = {
    voiceId: 'uial',
    displayName: 'Uial',
    cells: [{
      id: 'uial.core.thinking.patterns-before-propositions',
      cellType: 'thinking_pattern',
      predicate: 'notices_before',
      value: 'patterns before propositions',
      authority: { kind: 'self_authored' },
    }],
  };
  const prompt = buildMarginPrompt(packet, voice);
  assert.match(prompt, /Uial/);
  assert.match(prompt, /uial\.core\.thinking\.patterns-before-propositions/);
  assert.match(prompt, /Do not reveal hidden chain-of-thought/);
  assert.match(prompt, /Do not rewrite or insert into the field automatically/);
});

test('user-kept margin thoughts become provisional model observations, never stable core', () => {
  const cell = createLearningCellFromMargin({
    voiceId: 'uial',
    voiceLabel: 'Uial',
    text: 'This sentence keeps returning to the threshold before naming it.',
    requestId: 'writer-request-1',
    mode: 'writing',
    fieldContext: {
      field: { key: 'script-form:content' },
      page: {
        worldId: 'taveren-vaen',
        worldIdAliases: ['taveren-vaen', 'taaveren-vaen'],
        documentId: 'chapter-1',
        sceneId: 'scene-1',
      },
    },
  });

  assert.deepEqual(validateKnowledgeCell(cell), []);
  assert.equal(cell.cellType, 'model_observation');
  assert.equal(cell.status, 'provisional');
  assert.equal(cell.authority.kind, 'model_inference');
  assert.equal(cell.mutability, 'append_only');
  assert.equal(cell.provenance.reviewedBy, 'user-kept');
  assert.equal(cell.source.surface, 'runtime');
  assert.equal(cell.source.locator, 'arcsweep-margin:script-form:content');
});

test('Sonata has no fallback runtime route and cannot inherit another voice route', async () => {
  const raw = await readFile(new URL('../skills/voice-runtime-routes.json', import.meta.url), 'utf8');
  const routes = JSON.parse(raw);
  assert.equal(routes.routes.sonata.route, null);
  assert.equal(routes.routes.sonata.status, 'staged-no-runtime-route');
  assert.equal(routes.rules.noFallbackImpersonation, true);
});

test('world aliases let Starsong scoped cells survive lineage id changes', () => {
  assert.equal(worldIdsEquivalent('equestria-starsong', 'starsong-friendship-is-magic'), true);
  assert.deepEqual(expandWorldIds('starsong'), ['equestria-starsong', 'starsong-friendship-is-magic', 'starsong']);

  const cell = {
    id: 'ellowind.test.starsong',
    cellType: 'identity',
    subject: { kind: 'constellation_voice', id: 'ellowind' },
    predicate: 'has_home_world',
    value: 'Equestria: Starsong',
    status: 'active',
    authority: { kind: 'project_canon', confidence: 1 },
    source: { surface: 'github', locator: 'starsong.world.json' },
    scope: { worldIds: ['equestria-starsong'] },
    mutability: 'revisable_with_provenance',
  };

  const resolved = resolveKnowledgeCells([cell], {
    subject: { kind: 'constellation_voice', id: 'ellowind' },
    worldIds: expandWorldIds('starsong-friendship-is-magic'),
    requireScopedContext: true,
  });
  assert.equal(resolved.length, 1);
});
