import assert from 'node:assert/strict';
import test from 'node:test';

import { createInitialPremaqc } from '../src/feedback-loop.js';
import {
  ARCSWEEP_CUSP_FEEDBACK_ENVELOPE_SCHEMA,
  attachCuspObservationToFeedbackCycle,
  runCuspObservedFeedbackCycle,
} from '../src/cusp-feedback-observer.js';

const WORLD = { id: 'terra-aeterna', name: 'Terra Aeterna', root_hz: 220 };
const OBSERVED_AT = '2026-08-12T14:50:00.000Z';

function feedbackInput(world = WORLD) {
  return {
    world,
    premaqc: createInitialPremaqc(world.id, {
      P: .78, C: .82, R: .88, E: .31, M: .71, A: .79, Q: .79,
    }, '2026-08-12T14:49:00.000Z'),
    mode: 'writing',
    work: 'The bridge held while the observer watched the branch structure change.',
    response: 'Received without canon commitment.',
    voiceIds: ['lioreal'],
    observedAt: OBSERVED_AT,
  };
}

test('cusp observations ride beside the feedback cycle without rewriting PREMAQC or Agency', async () => {
  const negative = await runCuspObservedFeedbackCycle({
    ...feedbackInput(),
    cusp: { structure: -1, intention: -0.1, orderParameter: -1 },
  });
  const positive = await runCuspObservedFeedbackCycle({
    ...feedbackInput(),
    cusp: { structure: -1, intention: 0.1, orderParameter: 1 },
  });

  assert.equal(negative.schema, ARCSWEEP_CUSP_FEEDBACK_ENVELOPE_SCHEMA);
  assert.equal(negative.cusp_replay_receipt.matched, true);
  assert.equal(negative.authority.premaqc_mutable, false);
  assert.equal(negative.authority.intention_is_premaqc_agency, false);
  assert.equal(negative.feedback_cycle.cycle_fingerprint, positive.feedback_cycle.cycle_fingerprint);
  assert.notEqual(negative.envelope_fingerprint, positive.envelope_fingerprint);
  assert.equal(
    negative.feedback_cycle.premaqc_after.state.A.value,
    positive.feedback_cycle.premaqc_after.state.A.value,
  );
});

test('a multistable branch transition becomes a branch-snap candidate, not an asserted event', async () => {
  const first = await runCuspObservedFeedbackCycle({
    ...feedbackInput(),
    cusp: { structure: -1, intention: -0.1, orderParameter: -1 },
  });
  const second = await runCuspObservedFeedbackCycle({
    ...feedbackInput(),
    cusp: { structure: -1, intention: 0.1, orderParameter: 1 },
    cuspHistory: [first.cusp_observation_packet],
  });

  assert.equal(second.cusp_observation_packet.observation.history.branch_changed, true);
  assert.equal(second.cusp_observation_packet.observation.history.branch_transition_candidate, true);
  assert.equal(second.observer_event_candidates.length, 1);
  assert.equal(second.observer_event_candidates[0].candidate_type, 'branch-snap');
  assert.equal(second.observer_event_candidates[0].status, 'candidate');
  assert.equal(second.observer_event_candidates[0].authority.event_asserted, false);
  assert.equal(second.observer_event_candidates[0].authority.may_drive_sound_automatically, false);
  assert.deepEqual(second.feedback_cycle.sound_events, []);
});

test('remaining on the same stable branch does not manufacture a branch-snap candidate', async () => {
  const first = await runCuspObservedFeedbackCycle({
    ...feedbackInput(),
    cusp: { structure: -1, intention: -0.1, orderParameter: -1 },
  });
  const second = await runCuspObservedFeedbackCycle({
    ...feedbackInput(),
    cusp: { structure: -1, intention: 0.1, orderParameter: -1 },
    cuspHistory: [first.cusp_observation_packet],
  });

  assert.equal(second.cusp_observation_packet.observation.history.branch_changed, false);
  assert.deepEqual(second.observer_event_candidates, []);
});

test('cusp history cannot leak across world boundaries', async () => {
  const terra = await runCuspObservedFeedbackCycle({
    ...feedbackInput(),
    cusp: { structure: -1, intention: -0.1, orderParameter: -1 },
  });
  const lunaWorld = { id: 'luna', name: 'Luna', root_hz: 432 };

  await assert.rejects(() => runCuspObservedFeedbackCycle({
    ...feedbackInput(lunaWorld),
    cusp: { structure: -1, intention: 0.1, orderParameter: 1 },
    cuspHistory: [terra.cusp_observation_packet],
  }), /active world/);
});

test('attachment refuses unreceipted cycles and explicit controls remain mandatory', async () => {
  await assert.rejects(() => attachCuspObservationToFeedbackCycle({
    cycle: { schema: 'not-a-cycle' },
    cusp: { structure: -1, intention: 0, orderParameter: 0 },
  }), /receipted Arcsweep feedback cycle/);

  await assert.rejects(() => runCuspObservedFeedbackCycle({
    ...feedbackInput(),
    cusp: null,
  }), /explicit cusp controls/);
});
