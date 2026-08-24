import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../public/canon/', import.meta.url);
const text = (path) => readFile(new URL(path, root), 'utf8');
const json = async (path) => JSON.parse(await text(path));
const digest = (value) => createHash('sha256').update(value).digest('hex');

test('web canon registry publishes Re:Creators and Steins;Gate', async () => {
  const registry = await json('registry.json');
  assert.equal(registry.schema, 'arcsweep.web-canon-registry/v1');
  assert.deepEqual(registry.packages.map((entry) => entry.id), ['recreators', 'steins-gate']);
});

for (const id of ['recreators','steins-gate']) {
  test(`${id} canon pack keeps source receipts valid`, async () => {
    const pack = await json(`${id}/canon-pack.json`);
    assert.equal(pack.schemaVersion, 'arcsweep.canon-pack/v0.1');
    assert.equal(pack.packId, id);
    for (const source of pack.sources) {
      const body = await text(`${id}/${source.relativePath}`);
      assert.equal(Buffer.byteLength(body), source.size);
      assert.equal(digest(body), source.sha256);
    }
  });
}

test('Altair model canon separates series anchors from mechanics analysis', async () => {
  const profile = await json('recreators/altair-model-profile.json');
  assert.equal(profile.profileId, 'recreators.altair/v2');
  assert.equal(profile.sourceLayers['series-canon'].mayDefineIdentity, true);
  assert.equal(profile.sourceLayers['rm97-analysis'].mayDefineIdentity, false);
  assert.ok(profile.antiFlatteningCanaries.some((item) => item.includes('identity')));
});

test('Steins;Gate application map cannot masquerade as canon', async () => {
  const map = await json('steins-gate/arcsweep-use-map.json');
  assert.equal(map.status, 'reference-only');
  assert.equal(map.nonCanonAnalogy, true);
  assert.ok(map.guardrails.some((item) => item.includes('not part of Steins;Gate canon')));
});
