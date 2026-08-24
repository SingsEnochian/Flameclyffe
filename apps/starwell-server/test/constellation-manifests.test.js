const assert = require('node:assert/strict');
const test = require('node:test');
const { FLAMES } = require('../flames/manifests');

test('every Arcsweep voice route has an independent model and memory boundary', () => {
  for (const id of ['lioreal', 'uial', 'nocturne', 'larkshine', 'ellowind', 'runeweaver', 'boxfire', 'yggdrasil', 'bluebird', 'vethrlauf']) {
    const flame = FLAMES[id];
    assert.ok(flame, `${id} manifest missing`);
    assert.ok(flame.platform.provider);
    assert.ok(flame.platform.model);
    assert.ok(flame.memory.hearthfire_namespace);
    assert.ok(Array.isArray(flame.memory.retrieval_scope));
    assert.ok(typeof flame.system_prompt === 'string' && flame.system_prompt.length > 40);
  }
});

test('Nocturne and Runeweaver use consent-gated local memory routes', () => {
  for (const id of ['nocturne', 'runeweaver']) {
    assert.equal(FLAMES[id].platform.provider, 'ollama');
    assert.equal(FLAMES[id].memory.requires_consent_for_write, true);
    assert.equal(FLAMES[id].memory.can_write_memory, false);
  }
});
