const test = require('node:test');
const assert = require('node:assert/strict');
const { FLAMES } = require('../../starwell-server/flames/manifests');
const { getModelCandidate } = require('../../starwell-server/flames/model-candidates');

test('Qwen3.8-27B is pinned as lab-only substrate, not a resident Flame', () => {
  const qwen = getModelCandidate('qwen38-27b-lab');
  assert.ok(qwen);
  assert.equal(qwen.model_id, 'Qwen/Qwen3.8-27B');
  assert.equal(qwen.source.repo, 'Qwen/Qwen3.8-27B');
  assert.equal(qwen.source.license, 'apache-2.0');
  assert.equal(qwen.deployment.lab_route, true);
  assert.equal(qwen.deployment.live_route, false);
  assert.equal(qwen.deployment.audition_route, false);
  assert.equal(qwen.deployment.resident_identity_created, false);
  assert.equal(qwen.deployment.ambient_context_allowed, false);
  assert.equal(qwen.lab.hidden_reasoning_storage, false);
  assert.equal(qwen.lab.memory_write, false);
  assert.deepEqual(qwen.lab.trial_modes, ['cold', 'seeded', 'warm', 'federated', 'conflict', 'upgrade']);
  assert.equal(Object.hasOwn(FLAMES, 'qwen38-27b-lab'), false);
});
