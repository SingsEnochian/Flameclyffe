import assert from 'node:assert/strict';
import test from 'node:test';
import { compileWorldseed } from '../src/worldseed.js';
import { comparePossibleWorlds, POSSIBLE_WORLDS_COMPARISON_SCHEMA } from '../src/possible-worlds.js';

const world = { id: 'earth', name: 'Earth', kind: 'Living World' };

function compile(records) {
  return compileWorldseed(world, records, '2026-08-18T14:20:00.000Z');
}

const baseline = [
  {
    id: 'genome', worldId: 'earth', title: 'Genome', seedType: 'Continuity Genome', status: 'Rooted',
    emotionalLaws: 'Belonging increases agency.',
    narrativeGait: 'Plural, relational, memory-rich.',
    valuesCore: 'Care, curiosity, reciprocity.',
    mustSurvive: 'Living systems remain more important than extraction.',
    descendantsInherit: 'The archive remembers origins.',
    lineageRefs: 'earth:root',
  },
];

test('compares branch differences across inheritance and Continuity Genome fields', () => {
  const left = compile(baseline);
  const right = compile(baseline.map((record) => ({
    ...record,
    emotionalLaws: 'Belonging increases agency and mobility.',
    valuesCore: 'Care, curiosity, reciprocity, exploration.',
    mustSurvive: 'Living systems remain more important than extraction or prestige.',
    lineageRefs: 'earth:root > moon:branch',
  })));

  const comparison = comparePossibleWorlds(left, right);
  assert.equal(comparison.schema, POSSIBLE_WORLDS_COMPARISON_SCHEMA);
  assert.equal(comparison.sameFingerprint, false);
  assert.deepEqual(new Set(comparison.changedGenomeFields), new Set(['emotionalLaws', 'valuesCore']));
  assert.deepEqual(comparison.changedInheritanceAxes, ['mustSurvive']);
  assert.equal(comparison.summary.changedGenomeFieldCount, 2);
  assert.deepEqual(comparison.lineage.delta.added, ['earth:root > moon:branch']);
});

test('reports no structural changes when two compiled branches are identical', () => {
  const left = compile(baseline);
  const right = compile([...baseline]);
  const comparison = comparePossibleWorlds(left, right);
  assert.equal(comparison.sameFingerprint, true);
  assert.deepEqual(comparison.changedGenomeFields, []);
  assert.deepEqual(comparison.changedInheritanceAxes, []);
  assert.equal(comparison.summary.sectionCountChanges, 0);
});
