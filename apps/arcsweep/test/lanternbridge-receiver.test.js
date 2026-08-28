import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inspectLanternbridgeRecord,
  parseLanternbridgeRecord,
  resolveLanternbridgeAuthority,
} from '../src/lanternbridge-receiver.js';

const adopted = `---
bridge_protocol: "0.2"
bridge_id: lb_adopted_fixture

type: proposal
origin: nocturne
authors:
  - nocturne:twilight
addressed_to:
  - rowan:vee
created_at: 2026-08-25T21:32:00-04:00
response_signal: requested
conversation_state: open
lifecycle_state: active
provenance:
  source_system: universal-horizon
  source_ref: ideas/example.md
usage:
  memory_ingest: deny
  transform: ask
  republish: deny
  model_training: deny
relations:
  responds_to: null
  supersedes: null
  adopts: []
  related: []
x_preserve_me_unmodified: "present"
---

# Adopted fixture
`;

test('recognizes an adopted v0.2 envelope and preserves raw source plus unknown fields', () => {
  const record = parseLanternbridgeRecord(adopted);
  assert.equal(record.recognition, 'VALID');
  assert.equal(record.protocol, '0.2');
  assert.equal(record.metadata.response_signal, 'requested');
  assert.equal(record.metadata.x_preserve_me_unmodified, 'present');
  assert.deepEqual(record.unknownFields, ['x_preserve_me_unmodified']);
  assert.equal(record.rawSource, adopted);
  assert.equal(record.sourcePreserved, true);
});

test('resolves explicit adopted authority without confusing declaration with execution', () => {
  const record = parseLanternbridgeRecord(adopted);
  assert.equal(resolveLanternbridgeAuthority(record, 'memory_ingest').authority, 'DENY');
  assert.equal(resolveLanternbridgeAuthority(record, 'transform').authority, 'ASK');
  assert.equal(resolveLanternbridgeAuthority(record, 'republish').authority, 'DENY');
  assert.equal(resolveLanternbridgeAuthority(record, 'model_training').authority, 'DENY');
  const dryRun = inspectLanternbridgeRecord(adopted);
  assert.deepEqual(dryRun.downstreamActionsPerformed, []);
});

test('keeps experimental records historically distinct by default', () => {
  const experimental = adopted.replace('bridge_protocol: "0.2"', 'bridge_protocol: "0.2-experimental"');
  const record = parseLanternbridgeRecord(experimental);
  assert.equal(record.recognition, 'UNSUPPORTED');
  assert.equal(record.protocol, '0.2-experimental');
  assert.equal(record.rawSource, experimental);
});

test('supports explicit historical inspection without reinterpreting protocol identity', () => {
  const experimental = adopted.replace('bridge_protocol: "0.2"', 'bridge_protocol: "0.2-experimental"');
  const record = parseLanternbridgeRecord(experimental, { supportedProtocols: ['0.2', '0.2-experimental'] });
  assert.equal(record.recognition, 'VALID');
  assert.equal(record.protocol, '0.2-experimental');
});

test('classifies protocol-less records as HUMAN_ONLY', () => {
  const record = parseLanternbridgeRecord('# ordinary bridge note\n\nhello');
  assert.equal(record.recognition, 'HUMAN_ONLY');
  assert.equal(resolveLanternbridgeAuthority(record, 'transform').authority, 'UNSUPPORTED');
});

test('rejects incomplete adopted envelopes as INVALID', () => {
  const record = parseLanternbridgeRecord(`---\nbridge_protocol: "0.2"\nbridge_id: lb_incomplete\n---\nhello`);
  assert.equal(record.recognition, 'INVALID');
  assert.match(record.validationErrors.join('\n'), /type must be one of/);
  assert.match(record.validationErrors.join('\n'), /authors must be/);
});

test('does not let an unknown usage profile get rescued by explicit overrides', () => {
  const withUnknownProfile = adopted.replace('usage:\n', 'usage:\n  profile: future-profile/v9\n');
  const record = parseLanternbridgeRecord(withUnknownProfile);
  assert.equal(record.recognition, 'VALID');
  const result = resolveLanternbridgeAuthority(record, 'transform');
  assert.equal(result.authority, 'UNSUPPORTED');
  assert.equal(result.source, 'profile');
});

test('resolves recognized profiles only after explicit per-entry authority is absent', () => {
  const viaProfile = adopted
    .replace('  memory_ingest: deny\n', '')
    .replace('usage:\n', 'usage:\n  profile: bridge-default/v1\n');
  const record = parseLanternbridgeRecord(viaProfile);
  const profiles = { 'bridge-default/v1': { memory_ingest: 'ask' } };
  assert.equal(resolveLanternbridgeAuthority(record, 'memory_ingest', { profiles }).authority, 'ASK');
  assert.equal(resolveLanternbridgeAuthority(record, 'transform', { profiles }).authority, 'ASK');
  assert.equal(resolveLanternbridgeAuthority(record, 'transform', { profiles }).source, 'explicit');
});

test('missing downstream authority is NO_AUTHORITY rather than ALLOW', () => {
  const withoutTransform = adopted.replace('  transform: ask\n', '');
  const record = parseLanternbridgeRecord(withoutTransform);
  assert.equal(resolveLanternbridgeAuthority(record, 'transform').authority, 'NO_AUTHORITY');
});

test('validates the converged response_signal vocabulary', () => {
  for (const signal of ['none', 'welcome', 'requested']) {
    const source = adopted.replace('response_signal: requested', `response_signal: ${signal}`);
    assert.equal(parseLanternbridgeRecord(source).recognition, 'VALID');
  }
  const invalid = adopted.replace('response_signal: requested', 'response_signal: required');
  assert.equal(parseLanternbridgeRecord(invalid).recognition, 'INVALID');
});

test('Crossing-E-shaped denial remains readable while every downstream action resolves DENY', () => {
  const restricted = adopted.replace('  transform: ask\n', '  transform: deny\n');
  const dryRun = inspectLanternbridgeRecord(restricted);
  assert.equal(dryRun.recognition, 'VALID');
  for (const action of ['memory_ingest', 'transform', 'republish', 'model_training']) {
    assert.equal(dryRun.authority[action].authority, 'DENY');
  }
  assert.equal(dryRun.rawSource, restricted);
  assert.deepEqual(dryRun.downstreamActionsPerformed, []);
});
