import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyLanternbridgeRuntimeFailure } from '../../../api/v1/house/lanternbridge.js';

test('safe Lanternbridge diagnostics distinguish storage configuration and operations', () => {
  assert.equal(
    classifyLanternbridgeRuntimeFailure(new Error('Supabase Lanternbridge storage is not configured.')),
    'supabase_index_config_missing',
  );
  assert.equal(
    classifyLanternbridgeRuntimeFailure(new Error('Lanternbridge cursor read failed: relation missing')),
    'supabase_index_read_failed',
  );
  assert.equal(
    classifyLanternbridgeRuntimeFailure(new Error('Lanternbridge index insert failed: denied')),
    'supabase_index_write_failed',
  );
  assert.equal(
    classifyLanternbridgeRuntimeFailure(new Error('Supabase House Runtime storage is not configured.')),
    'commons_storage_config_missing',
  );
  assert.equal(
    classifyLanternbridgeRuntimeFailure(new Error('House Commons ledger write failed: denied')),
    'commons_storage_write_failed',
  );
});

test('unknown failures collapse to a non-sensitive internal code', () => {
  assert.equal(classifyLanternbridgeRuntimeFailure(new Error('secret internal stack detail')), 'internal_error');
});
