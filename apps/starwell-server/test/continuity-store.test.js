'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createContinuityStore } = require('../lib/continuity-store');

test('continuity rebuild preserves source classes, provenance, and honest metrics', async () => {
  const dataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hearthgate-continuity-'));
  const projectPath = path.join(dataDir, 'laboratory-project.json');
  await fs.promises.writeFile(projectPath, JSON.stringify({ observations: [{ id: 'o1', continuity: 'Between the Dreaming', title: 'Threshold', capturedAt: '2027-07-01T00:00:00Z', note: 'The worlds opened.' }] }));
  const ingestStore = { list: async () => ({ documents: [{ id: 'a1', name: 'source.pdf', sha256: 'abc', importedAt: '2027-07-02T00:00:00Z', analysis: { continuityLinks: ['Between the Dreaming'], summary: 'A link.', uncertainty: ['Date unclear'], provider: 'test', dates: [{ label: 'Opening', value: 'July 2027', source_locator: 'Opening note' }], mathematics: [{ label: 'Orbit', expression: 'T = 55s', source_locator: 'Table 1' }], magicAndCorrespondence: [{ label: 'Fire', system: 'Elements', value: 'gold', source_locator: 'Correspondences' }], relationships: [{ subject: 'Clarion', relation: 'ascends as', object: 'Sariel', source_locator: 'Bio' }] } }] }) };
  const writerStore = { list: async () => ({ documents: [{ id: 'w1', title: 'Scene', continuity: 'Between the Dreaming', synopsis: 'A scene.', documentType: 'story', updatedAt: '2027-07-03T00:00:00Z' }] }) };
  const store = createContinuityStore({ dataDir, projectPath, ingestStore, writerStore });
  const catalog = await store.rebuild(); const item = catalog.continuities[0];
  assert.equal(item.sources.length, 3); assert.deepEqual(item.sources.map(x => x.classification), ['observed-or-authored', 'derived-interpretation', 'narrative-treatment']);
  assert.equal(item.metrics.provenanceCoverage.value, 1); assert.equal(item.metrics.unresolvedCount.value, 1); assert.equal(item.metrics.sourceCount.method.includes('deduplication'), true);
  assert.equal(item.sourceFacts.dates[0].sourceRef, 'archive:a1:continuity:0'); assert.equal(item.sourceFacts.mathematics[0].expression, 'T = 55s'); assert.equal(item.timeline.some(event => event.value === 'July 2027'), true); assert.equal(item.metrics.citedFactCount.value, 4);
});
