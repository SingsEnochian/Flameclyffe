import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseSemanticEvent, presentationInstructions } from '../src/semantic-presentation-event.js';

test('keeps participant, worker, model and session separate', () => {
  const e = normaliseSemanticEvent({
    event_id: 'evt:1', phase: 'capture', target: 'writing-room',
    actor: { participant_id: 'bluebird', worker_id: 'worker:7', model_id: 'model:8', session_id: 'session:9' },
    provenance: { source_sha: 'a'.repeat(40), receipt_id: 'receipt:2' },
  });
  assert.equal(e.actor.participant_id, 'bluebird');
  assert.equal(e.actor.model_id, 'model:8');
  assert.equal(e.provenance.source_sha, 'a'.repeat(40));
  assert.equal(e.presentation_only, true);
  assert.equal(presentationInstructions(e).dispatch_authorised, false);
  assert.ok(Object.isFrozen(e.actor));
});

test('Feather, reduced motion and cancel silence presentation', () => {
  for (const patch of [{ feather: true }, { reduced_motion: true }, { phase: 'cancel' }]) {
    const p = presentationInstructions({ phase: 'capture', ...patch });
    assert.equal(p.animate, false);
    assert.equal(p.sound, false);
    assert.equal(p.haptics, false);
    assert.equal(p.instant_reading, true);
  }
});

test('untrusted identifiers and provenance are not elevated', () => {
  const e = normaliseSemanticEvent({
    phase: 'made-up', event_id: '../bad', actor: { model_id: '<script>' },
    provenance: { source_sha: 'not-a-sha', receipt_id: '../../secret' },
    material: { strength: 900, canon_state: 'approved' },
  });
  assert.equal(e.phase, 'rest');
  assert.equal(e.event_id, null);
  assert.equal(e.actor.model_id, null);
  assert.equal(e.provenance.source_sha, null);
  assert.equal(e.material.strength, 1);
  assert.equal(e.material.canon_state, 'candidate');
});

test('source Wyrdrune and English readings are not transformed by presentation envelope', () => {
  const source = 'mobius { perceive { let beat = 3; } }';
  const english = 'Two voices remain distinct.';
  const e = normaliseSemanticEvent({ phase: 'release', target: 'inscription' });
  assert.equal(e.target, 'inscription');
  assert.equal(source, 'mobius { perceive { let beat = 3; } }');
  assert.equal(english, 'Two voices remain distinct.');
});
