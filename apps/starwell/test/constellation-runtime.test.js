import test from 'node:test';
import assert from 'node:assert/strict';
import { assertConstellationLiving, defineConstellationMember } from '../src/constellation/contracts.js';
import { QWEN_ABLITERATED_PROFILE } from '../src/constellation/profiles/qwen-abliterated.js';

const member = id => defineConstellationMember({
  id,
  name: id,
  firstPerson: true,
  role: id === 'vee' ? 'co-writer' : 'specialist',
  modelProfile: QWEN_ABLITERATED_PROFILE.id,
  capabilities: ['dialogue'],
  memoryScope: ['member','session'],
  consent: { canOptOut: true },
  worldAccess: ['terra-aeterna'],
  voiceProfile: `${id}-voice-v1`,
});

test('Bifröst cannot be living without a multi-member runtime', () => {
  const result = assertConstellationLiving({ members: [member('vee')], router: {}, qwenProfile: QWEN_ABLITERATED_PROFILE, syncBridge: {} });
  assert.equal(result.pass, false);
  assert.ok(result.failures.includes('MULTI_MEMBER_RUNTIME_MISSING'));
});

test('Qwen co-writing role and sync bridge are mandatory living organs', () => {
  const result = assertConstellationLiving({ members: [member('vee'), member('boxfire')], router: {}, qwenProfile: { roles: ['code'] }, syncBridge: null });
  assert.equal(result.pass, false);
  assert.ok(result.failures.includes('QWEN_COWRITER_MISSING'));
  assert.ok(result.failures.includes('CONSTELLATION_SYNC_MISSING'));
});

test('multi-member Qwen co-writing runtime can pass the living contract', () => {
  const result = assertConstellationLiving({ members: [member('vee'), member('boxfire')], router: {}, qwenProfile: QWEN_ABLITERATED_PROFILE, syncBridge: {} });
  assert.deepEqual(result, { pass: true, failures: [] });
});
