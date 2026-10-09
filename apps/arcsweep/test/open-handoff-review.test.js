import assert from 'node:assert/strict';
import test from 'node:test';

import { auditOpenHandoffReview } from '../src/open-handoff-review.js';

test('open-handoff audit preserves missing owners as warnings and forbids inferred/system ownership', () => {
  const result = auditOpenHandoffReview({
    schema: 'arcsweep.open-handoffs-review/v1',
    rules: {
      silence_is_acknowledgement: false,
      infer_owner: false,
      allow_system_owner: false,
    },
    handoffs: [
      {
        source_receipt: 'receipt-a',
        handoff: 'Do the next thing',
        acknowledgement_status: 'not-found',
        next_owner: null,
      },
      {
        source_receipt: 'receipt-b',
        handoff: 'Review the thing',
        acknowledgement_status: 'pending',
        next_owner: { kind: 'human', id: 'rowan', display_name: 'Rowan' },
      },
    ],
  });

  assert.equal(result.pass, true);
  assert.equal(result.missing_owner_count, 1);
});

test('open-handoff audit rejects system ownership and silent acknowledgement rules', () => {
  const result = auditOpenHandoffReview({
    schema: 'arcsweep.open-handoffs-review/v1',
    rules: {
      silence_is_acknowledgement: true,
      infer_owner: false,
      allow_system_owner: false,
    },
    handoffs: [
      {
        source_receipt: 'receipt-c',
        handoff: 'Invisible accountability is forbidden',
        acknowledgement_status: 'pending',
        next_owner: { kind: 'agent', id: 'system', display_name: 'the system' },
      },
    ],
  });

  assert.equal(result.pass, false);
  assert.ok(result.violations.some((entry) => entry.code === 'handoff.silence-ack'));
  assert.ok(result.violations.some((entry) => entry.code === 'handoff.system-owner'));
});
