import test from 'node:test';
import assert from 'node:assert/strict';
import { projectWayglassObserverEvent, observerGlyphSeed } from './observer-runa-bridge.js';

const sample = {
  consent_scope: 'observer-display',
  consent_status: 'granted',
  source_ref: 'receipt:fixture-001',
  room_id: 'wayglass:writing-room',
  event_kind: 'commons-received',
  verification_state: 'verified',
  observed_at: '2026-11-03T15:00:00.000Z',
  body: 'PRIVATE TEXT MUST NEVER CROSS',
  secret: 'NOT FOR DISPLAY',
};

test('metadata-only projection preserves provenance and omits private fields', () => {
  const result = projectWayglassObserverEvent(sample);
  assert.equal(result.ok, true);
  assert.equal(result.event.source_ref, sample.source_ref);
  assert.equal(result.event.visual_cue, 'steady');
  assert.equal(JSON.stringify(result.event).includes('PRIVATE'), false);
  assert.equal(JSON.stringify(result.event).includes('NOT FOR DISPLAY'), false);
  assert.equal(observerGlyphSeed(result.event), observerGlyphSeed(result.event));
});

test('refuses missing or revoked consent', () => {
  assert.equal(projectWayglassObserverEvent({ ...sample, consent_status: 'revoked' }).ok, false);
  assert.equal(projectWayglassObserverEvent({ ...sample, consent_scope: 'private-only' }).ok, false);
});

test('refuses forged return and missing provenance', () => {
  assert.equal(projectWayglassObserverEvent({ ...sample, event_kind: 'return-verified', verification_state: 'pending' }).ok, false);
  assert.equal(projectWayglassObserverEvent({ ...sample, source_ref: 'private://sensitive?token=123' }).ok, false);
  assert.equal(projectWayglassObserverEvent({ ...sample, observed_at: 'yesterday' }).ok, false);
});

test('failed events never display a success cue', () => {
  const result = projectWayglassObserverEvent({ ...sample, event_kind: 'commons-failed', verification_state: 'failed' });
  assert.equal(result.ok, true);
  assert.equal(result.event.visual_cue, 'dim');
});
