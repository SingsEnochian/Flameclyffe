import test from 'node:test';
import assert from 'node:assert/strict';

import { SYNC_STREAM } from '../../starwell/src/bifrost-sync/contracts.js';
import {
  HOUSE_RUNTIME_BIFROST_POLICY,
  bifrostDomainPolicy,
  runtimeBraidSyncClass,
} from '../src/runtime-braid-sync-policy.js';

test('Runtime Braid events remain append-only receipt traffic', () => {
  const result = runtimeBraidSyncClass({
    schema: 'hearthgate.runtime-braid-event/v1',
    event_type: 'review-accepted',
  });
  assert.equal(result.stream, SYNC_STREAM.RECEIPT);
  assert.equal(result.policy, 'APPEND_ONLY');
  assert.equal(result.appendOnly, true);
  assert.equal(result.silentMergeAllowed, false);
});

test('Runtime Braid packets are state and never silently merge divergences', () => {
  const result = runtimeBraidSyncClass({ schema: 'hearthgate.runtime-braid-packet/v1' });
  assert.equal(result.stream, SYNC_STREAM.STATE);
  assert.equal(result.policy, 'EXPLICIT_CONFLICT');
  assert.equal(result.silentMergeAllowed, false);
});

test('canon requires explicit conflict while settings retain last-write-wins compatibility', () => {
  assert.deepEqual(bifrostDomainPolicy(SYNC_STREAM.CANON), {
    stream: SYNC_STREAM.CANON,
    policy: 'EXPLICIT_CONFLICT',
    requiresExplicitConflict: true,
    appendOnly: false,
    lastWriteWins: false,
  });
  assert.equal(bifrostDomainPolicy(SYNC_STREAM.SETTINGS).lastWriteWins, true);
});

test('House Runtime remains the sole transport authority', () => {
  assert.equal(HOUSE_RUNTIME_BIFROST_POLICY.transport, 'house-runtime-braid');
  assert.equal(HOUSE_RUNTIME_BIFROST_POLICY.duplicateSupabaseEnvelopeTable, false);
});
