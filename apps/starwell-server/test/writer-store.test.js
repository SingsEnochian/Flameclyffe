'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createWriterStore } = require('../lib/writer-store');

test('writing room creates, updates, lists, and removes persistent documents', async () => {
  const dataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hearthgate-writer-'));
  const store = createWriterStore({ dataDir });
  const created = await store.create({ title: 'Between the Dreaming', documentType: 'continuity', continuity: 'July 2027', tags: ['Sariel'], content: 'Clarion is Sariel ascended.' });
  assert.equal(created.wordCount, 4);
  assert.equal((await store.list()).documents.length, 1);
  const updated = await store.update(created.id, { content: 'Clarion is Sariel, wholly remembered.' });
  assert.equal(updated.title, created.title);
  assert.equal(updated.wordCount, 5);
  assert.equal(await store.remove(created.id), true);
  assert.equal((await store.list()).documents.length, 0);
});
