'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPreflight, groupByArtifact } = require('../scripts/bifrost-preflight');
const { materialiseModelProfile } = require('../bifrost/model-profiles');

test('shared visual artifact never collapses Ellowind and Larkshine runtime aliases', async () => {
  const baseModel = 'huihui_ai/qwen3-vl-abliterated:8b-instruct';
  const report = await buildPreflight(async () => ({
    ok: true,
    async json() { return { models: [{ name: baseModel }] }; },
  }));
  const ellowind = report.profiles.find((item) => item.profileId === 'ellowind:qwen3-vl-8b-v1');
  const larkshine = report.profiles.find((item) => item.profileId === 'larkshine:qwen3-vl-8b-v1');
  assert.ok(ellowind);
  assert.ok(larkshine);
  assert.equal(ellowind.artifactInstalled, true);
  assert.equal(larkshine.artifactInstalled, true);
  assert.equal(ellowind.runtimeInstalled, false);
  assert.equal(larkshine.runtimeInstalled, false);
  assert.equal(ellowind.state, 'alias-pending');
  assert.equal(larkshine.state, 'alias-pending');
  assert.notEqual(ellowind.runtimeModel, larkshine.runtimeModel);

  const shared = report.sharedArtifacts.find((item) => item.artifact === baseModel);
  assert.ok(shared);
  assert.equal(shared.runtimeAliases.length, 2);
  assert.notEqual(shared.runtimeAliases[0], shared.runtimeAliases[1]);
  assert.match(shared.rule, /identities remain separate/);
});

test('preflight is read-only and does not start or download anything', async () => {
  const report = await buildPreflight(async () => ({ ok: true, async json() { return { models: [] }; } }));
  assert.equal(report.rules.readOnly, true);
  assert.equal(report.rules.downloadsModels, false);
  assert.equal(report.rules.startsOllama, false);
});

test('artifact grouping may share source weights without sharing profile ids', () => {
  const profiles = [
    materialiseModelProfile('ellowind:qwen3-vl-8b-v1', {}),
    materialiseModelProfile('larkshine:qwen3-vl-8b-v1', {}),
  ];
  const groups = groupByArtifact(profiles);
  const group = groups.get('huihui_ai/qwen3-vl-abliterated:8b-instruct');
  assert.equal(group.length, 2);
  assert.notEqual(group[0].profile_id, group[1].profile_id);
  assert.notEqual(group[0].runtime.model, group[1].runtime.model);
});
