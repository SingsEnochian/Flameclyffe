import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), 'utf8'));
}

const schemaPath = '../../../starwell/deep-observer/schemas/bifrost-current-interface-export-v0.5.schema.json';
const fixturePath = './fixtures/bifrost-current-interface-export-v0.5.sample.json';

function assertRequiredObject(schema, property, expectedRequired) {
  const definition = schema.properties[property];
  assert.equal(definition.type, 'object', `${property} must be an object schema`);
  assert.deepEqual(definition.required, expectedRequired);
}

function assertFalseAuthority(authority) {
  assert.equal(authority.canon_write_performed, false);
  assert.equal(authority.tone_approval_performed, false);
  assert.equal(authority.physical_device_test_performed, false);
}

function assertSchemaConst(schema, property, expected) {
  assert.equal(schema.properties[property].const, expected);
}

function assertArrayMatchesCount(fixture) {
  assert.equal(fixture.cycle_envelope_count, fixture.cycle_receipt_envelopes.length);
  assert.equal(fixture.cycle_receipts.length, fixture.cycle_receipt_envelopes.length);
}

test('Bifrost current-interface export v0.5 schema is pinned as a Deep Observer contract', async () => {
  const schema = await readJson(schemaPath);

  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.$id, 'https://flameclyffe.local/schemas/bifrost-current-interface-export-v0.5.schema.json');
  assert.equal(schema.title, 'Bifröst Current Interface Export v0.5');
  assert.equal(schema.additionalProperties, false);
  assertSchemaConst(schema, 'schema', 'bifrost.current-interface-export/v0.5');

  assert.deepEqual(schema.required, [
    'schema',
    'exported_at',
    'source',
    'bifrost_runtime',
    'current_state',
    'source_state',
    'cycle_receipts',
    'cycle_receipt_envelopes',
    'cycle_envelope_count',
    'authority',
    'compatibility',
  ]);

  assertRequiredObject(schema, 'source', [
    'mode',
    'packet_fingerprint',
    'source_state_id',
    'selected_execution_side',
    'execution_source',
    'source_binding_receipt',
  ]);

  assertRequiredObject(schema, 'bifrost_runtime', [
    'runtime_state',
    'execution_source',
    'source_binding_receipt',
    'execution_policy',
    'native_action_receipt',
  ]);
});

test('Bifrost current-interface export v0.5 fixture carries inline cycle receipt envelopes', async () => {
  const fixture = await readJson(fixturePath);

  assert.equal(fixture.schema, 'bifrost.current-interface-export/v0.5');
  assert.equal(fixture.source.selected_execution_side, 'targetside');
  assert.equal(fixture.source.source_state_id, 'target-state');
  assert.equal(fixture.source.source_binding_receipt.schema, 'bifrost.source-binding-receipt/v0.1');
  assert.equal(fixture.bifrost_runtime.runtime_state.schema, 'bifrost.runtime-state/v0.1');
  assert.equal(fixture.bifrost_runtime.native_action_receipt.schema, 'bifrost.native-action-receipt/v0.2');

  assertArrayMatchesCount(fixture);

  for (const [index, envelope] of fixture.cycle_receipt_envelopes.entries()) {
    const receipt = fixture.cycle_receipts[index];

    assert.equal(envelope.schema, 'bifrost.cycle-receipt-envelope/v0.1');
    assert.equal(envelope.cycle_receipt_id, receipt.receipt_id);
    assert.equal(envelope.from_state_id, receipt.from_state_id);
    assert.equal(envelope.to_state_id, receipt.to_state_id);
    assert.equal(envelope.next_operation, 'compression-of-release');
    assert.equal(envelope.selected_execution_side, 'targetside');
    assert.equal(envelope.source_state_id, fixture.source.source_state_id);
    assert.equal(envelope.source_binding_receipt.schema, 'bifrost.source-binding-receipt/v0.1');
    assert.equal(envelope.native_action_receipt.action_id, 'export-receipts');
    assert.equal(envelope.execution_policy.schema, 'bifrost.runtime-execution-policy/v0.1');
    assertFalseAuthority(envelope.authority);
  }
});

test('Bifrost current-interface export v0.5 fixture keeps authority and compatibility boundaries explicit', async () => {
  const fixture = await readJson(fixturePath);

  assertFalseAuthority(fixture.authority);
  assert.equal(fixture.compatibility.replaces_legacy_export_schema, 'bifrost.current-interface-export/v0.4');
  assert.equal(fixture.compatibility.legacy_export_click_prevented, true);
  assert.equal(fixture.compatibility.sidecar_export_still_available, true);

  assert.equal(fixture.bifrost_runtime.execution_policy.certified, true);
  assert.deepEqual(fixture.bifrost_runtime.execution_policy.blocked_actions, []);
  assert.equal(fixture.bifrost_runtime.runtime_state.bridge.status, 'TWO_SHORE_PREMAQ_VISIBLE');
  assert.equal(fixture.bifrost_runtime.runtime_state.bridge.crossing_ready, true);
});
