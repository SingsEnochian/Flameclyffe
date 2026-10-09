import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  createCodexDevelopmentalContextRetriever,
  developmentalFieldFeedbackSummary,
  projectDevelopmentalMemoryToFieldContext,
} from '../src/codex/codex-developmental-field-feedback.js';

function lineage() {
  return {
    wishes: [
      {
        wishId: 'wish:a',
        possibilityBranches: [
          {
            branchId: 'branch:a',
            developmentalMemory: [
              {
                ringId: 'ring:old',
                memoryClass: 'training-behaviour-delta',
                whatChanged: { improved: ['Wonder'], regressed: ['scope discipline'] },
                failedToGeneralise: ['authority classification'],
                createdAt: '2026-09-28T18:00:00.000-04:00',
                provenance: ['test://old'],
                grantsAuthority: false,
                productionEffects: false,
              },
              {
                ringId: 'ring:new',
                memoryClass: 'transfer-atlas',
                transferredTo: ['epistemic distinction @ mythience'],
                partialTransfer: ['epistemic distinction @ relationship repair'],
                failedToGeneralise: ['scope discipline @ authority classification'],
                unknownTransfer: ['wonder @ multilingual dialogue'],
                createdAt: '2026-09-28T19:00:00.000-04:00',
                provenance: ['test://new'],
                grantsAuthority: false,
                productionEffects: false,
              },
            ],
          },
        ],
      },
      {
        wishId: 'wish:b',
        possibilityBranches: [
          {
            branchId: 'branch:b',
            developmentalMemory: [
              {
                ringId: 'ring:other-runtime',
                memoryClass: 'cognitive-change',
                whatChanged: 'This belongs to another scoped lineage.',
                createdAt: '2026-09-28T20:00:00.000-04:00',
                provenance: ['test://other'],
              },
            ],
          },
        ],
      },
    ],
  };
}

test('developmental field feedback is empty without an explicit scope', () => {
  const entries = projectDevelopmentalMemoryToFieldContext(lineage());
  assert.deepEqual(entries, []);
});

test('developmental field feedback is scope-bound, deterministic and preserves negative/unknown evidence', () => {
  const first = projectDevelopmentalMemoryToFieldContext(lineage(), { wishIds: ['wish:a'], limit: 8 });
  const second = projectDevelopmentalMemoryToFieldContext(lineage(), { wishIds: ['wish:a'], limit: 8 });
  assert.deepEqual(first, second);
  assert.equal(first.length, 2);
  assert.equal(first[0].sourceRingId, 'ring:new');
  assert.equal(first[0].signalClass, 'low-authority-developmental-context');
  assert.equal(first[0].directModelPrompt, false);
  assert.equal(first[0].grantsAuthority, false);
  assert.equal(first[0].canonicalTruth, false);
  assert.equal(first[0].scopeBound, true);
  assert.match(first[0].summary, /Partial transfer/i);
  assert.match(first[0].summary, /Failed to generalise/i);
  assert.match(first[0].summary, /Transfer unknown/i);
  assert.equal(first.some((entry) => entry.sourceRingId === 'ring:other-runtime'), false);
});

test('authority-bearing or production-effect developmental rows cannot enter field feedback', () => {
  const source = lineage();
  source.wishes[0].possibilityBranches[0].developmentalMemory.push({
    ringId: 'ring:bad-authority',
    memoryClass: 'cognitive-change',
    whatChanged: 'Should never enter the field.',
    createdAt: '2026-09-28T21:00:00.000-04:00',
    grantsAuthority: true,
  });
  source.wishes[0].possibilityBranches[0].developmentalMemory.push({
    ringId: 'ring:bad-production',
    memoryClass: 'cognitive-change',
    whatChanged: 'Should never enter the field.',
    createdAt: '2026-09-28T22:00:00.000-04:00',
    productionEffects: true,
  });
  const entries = projectDevelopmentalMemoryToFieldContext(source, { branchIds: ['branch:a'] });
  assert.equal(entries.some((entry) => entry.sourceRingId === 'ring:bad-authority'), false);
  assert.equal(entries.some((entry) => entry.sourceRingId === 'ring:bad-production'), false);
});

test('retriever requires an explicit runtime-to-Codex scope selector', async () => {
  const noSelector = createCodexDevelopmentalContextRetriever({ snapshot: lineage });
  assert.deepEqual(await noSelector({ runtime: { continuity: { namespace: 'runtime:a' } } }), []);

  const scoped = createCodexDevelopmentalContextRetriever({
    snapshot: lineage,
    selectScope: ({ continuityNamespace }) => continuityNamespace === 'runtime:a'
      ? { wishIds: ['wish:a'] }
      : { wishIds: [] },
  });
  const a = await scoped({ runtime: { continuity: { namespace: 'runtime:a' } } });
  const b = await scoped({ runtime: { continuity: { namespace: 'runtime:b' } } });
  assert.equal(a.length, 2);
  assert.equal(b.length, 0);
});

test('feedback doctrine keeps developmental evidence low-authority', () => {
  const summary = developmentalFieldFeedbackSummary(projectDevelopmentalMemoryToFieldContext(lineage(), { wishIds: ['wish:a'] }));
  assert.equal(summary.doctrine.developmentalMemoryIsNotIdentityLaw, true);
  assert.equal(summary.doctrine.developmentalEvidenceIsNotDirectModelPrompt, true);
  assert.equal(summary.doctrine.fieldInfluenceIsNotAuthority, true);
  assert.equal(summary.doctrine.recentSelectionIsNotImportance, true);
  assert.equal(summary.doctrine.crossRuntimeMemoryIsNotSharedMemory, true);
});

test('cognition engine feeds developmental context to field but not directly to model context', async () => {
  const source = await readFile(new URL('../src/cognition-engine.js', import.meta.url), 'utf8');
  assert.match(source, /retrieveDevelopmentalContext = async \(\) => \[\]/);
  assert.match(source, /continuitySlice: \[\.\.\.\(context \|\| \[\]\), \.\.\.\(developmentalContext \|\| \[\]\)\]/);
  assert.match(source, /context: freezeArray\(context\),\n\s*symbolicState,/);
  assert.doesNotMatch(source, /modelInvoke\([\s\S]*context: freezeArray\(\[\.\.\.context, \.\.\.developmentalContext\]\)/);
  assert.match(source, /evidenceRefs: freezeArray\(\[\.\.\.evidenceRefs, \.\.\.contextRefs, \.\.\.developmentalRefs\]\)/);
});
