import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNotionFeed, mergeNotionFeed } from '../src/notion-feed.js';

const base = {
  id: 'base',
  version: '1',
  title: 'Base',
  source: 'Bundled snapshot',
  decisionDate: '2026-07-26',
  defaultWorldSourceKey: 'terra-aeterna',
  worlds: [
    { sourceKey: 'terra-aeterna', name: 'Terra Aeterna', description: 'old', localOnly: true },
    { sourceKey: 'other', name: 'Other world' },
  ],
  documents: [{ sourceKey: 'script-1', title: 'Existing script', content: 'preserved' }],
};

test('Notion feed overlays source-managed records without erasing bundled worlds or documents', () => {
  const result = mergeNotionFeed(base, {
    schemaVersion: 'arcsweep.notion-feed/v1',
    generatedAt: '2026-07-28T00:00:00.000Z',
    registry: { pageId: 'registry', url: 'https://notion.example/registry' },
    bundle: {
      id: 'base',
      version: '2',
      source: 'Notion',
      worlds: [
        { sourceKey: 'terra-aeterna', name: 'Terra Aeterna / Hearthweave', description: 'new' },
        { sourceKey: 'new-world', name: 'New world' },
      ],
      documents: [],
    },
  });

  assert.equal(result.version, '2');
  assert.equal(result.worlds.length, 3);
  assert.equal(result.documents.length, 1);
  assert.equal(result.worlds.find((world) => world.sourceKey === 'terra-aeterna').description, 'new');
  assert.equal(result.worlds.find((world) => world.sourceKey === 'terra-aeterna').localOnly, true);
  assert.equal(result.notionFeed.registryPageId, 'registry');
});

test('web feed failure preserves the bundled library', async () => {
  const result = await loadNotionFeed(base, async () => { throw new Error('offline'); });
  assert.equal(result, base);
});
