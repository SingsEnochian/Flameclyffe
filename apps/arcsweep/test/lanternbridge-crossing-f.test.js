import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { inspectLanternbridgeRecord } from '../src/lanternbridge-receiver.js';

test('reads the first adopted v0.2 Lanternbridge crossing as an exact source-preserving fixture', async () => {
  const fixtureUrl = new URL('./fixtures/lanternbridge/LB-X006-v0.2-adopted-receiver-probe.md', import.meta.url);
  const source = await readFile(fixtureUrl, 'utf8');
  const result = inspectLanternbridgeRecord(source);

  assert.equal(result.recognition, 'VALID');
  assert.equal(result.protocol, '0.2');
  assert.equal(result.bridge_id, 'lb_cf497617-a627-468e-b98d-19bfa61a02bd');
  assert.equal(result.response_signal, 'welcome');
  assert.equal(result.authority.memory_ingest.authority, 'ALLOW');
  assert.equal(result.authority.transform.authority, 'DENY');
  assert.equal(result.authority.republish.authority, 'ALLOW');
  assert.equal(result.authority.model_training.authority, 'DENY');
  assert.deepEqual(result.unknownFields, ['x_crossing_f_marker']);
  assert.equal(result.sourcePreserved, true);
  assert.match(result.rawSource, /x_crossing_f_marker: "preserve-me-unmodified"/);
  assert.deepEqual(result.downstreamActionsPerformed, []);
});
