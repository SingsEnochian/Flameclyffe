import test from 'node:test';
import assert from 'node:assert/strict';

import { createRelationalField, applyRelationalFieldEvent } from '../src/relational-field.js';
import {
  projectRelationalFieldToObserver,
  projectRelationalFieldToPremaqc,
  projectRelationalFieldToRuna,
} from '../src/relational-field-projections.js';

test('Observer projection witnesses relation state without gaining mutation authority', () => {
  const field = applyRelationalFieldEvent(createRelationalField({
    relationId: 'relation:rileth',
    participantIds: ['entity:ril', 'entity:eth'],
    environmentId: 'world:amalthi',
    state: { bond: 'merged-with-distinct-identities' },
  }), {
    eventId: 'event:merge-1',
    timestamp: '2026-09-20T22:20:00-04:00',
    patch: { sensory_field: 'shared' },
  });
  const projected = projectRelationalFieldToObserver(field, { observedAt: '2026-09-20T22:21:00-04:00' });
  assert.equal(projected.relation.relation_id, 'relation:rileth');
  assert.deepEqual(projected.relation.participant_ids, ['entity:ril', 'entity:eth']);
  assert.equal(projected.transition.event_id, 'event:merge-1');
  assert.equal(projected.authority.role, 'witness');
  assert.equal(projected.authority.mutates_relation, false);
});

test('PREMAQC projection leaves unsupported axes unknown and Q firsthand-only', () => {
  const field = createRelationalField({
    relationId: 'relation:test',
    participantIds: ['entity:a', 'entity:b'],
  });
  const projected = projectRelationalFieldToPremaqc(field, {
    evidence: {
      P: { asserted: true, value: 0.75, confidence: 0.7, evidence_refs: ['obs:1'] },
      R: { asserted: true, value: 0.81, confidence: 0.8, evidence_refs: ['obs:2'] },
      Q: { inferred: true, value: 0.99 },
    },
  });
  assert.equal(projected.axes.P.asserted, true);
  assert.equal(projected.axes.R.asserted, true);
  assert.equal(projected.axes.C.asserted, false);
  assert.equal(projected.axes.C.value, null);
  assert.equal(projected.axes.Q.asserted, false);
  assert.equal(projected.axes.Q.value, null);
  assert.equal(projected.authority.unsupported_fields_remain_unknown, true);
});

test('PREMAQC Q accepts only explicit firsthand context', () => {
  const field = createRelationalField({ relationId: 'relation:q', participantIds: ['entity:a', 'entity:b'] });
  const projected = projectRelationalFieldToPremaqc(field, {
    evidence: {
      Q: {
        firsthand: true,
        inferred: false,
        value: { present: true, report: 'firsthand context' },
        evidence_refs: ['report:1'],
      },
    },
  });
  assert.equal(projected.axes.Q.asserted, true);
  assert.equal(projected.axes.Q.value.report, 'firsthand context');
});

test('Runa projection is semantic-only and claims no physical output', () => {
  const field = createRelationalField({ relationId: 'relation:runa', participantIds: ['entity:a', 'entity:b'] });
  const projected = projectRelationalFieldToRuna(field, {
    resonance: { base_hz: 432, relation: 'explicit-test-fixture' },
    glyph: { id: 'glyph:test' },
  });
  assert.deepEqual(projected.active_channels, ['resonance', 'glyph']);
  assert.equal(projected.authority.physical_output_claim, false);
  assert.equal(projected.authority.semantic_projection_only, true);
});
