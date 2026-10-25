import test from 'node:test';
import assert from 'node:assert/strict';
import { createWayglassVoiceBoundary } from '../src/voice-boundary.js';

test('voice begins closed and rejects unconsented transport/audio', () => {
  const gate = createWayglassVoiceBoundary({ participantId: 'rowan', roomId: 'writing' });
  assert.equal(gate.snapshot().phase, 'closed');
  assert.equal(gate.snapshot().send_enabled, false);
  assert.throws(() => gate.bindTransport({ sendAudio() {}, close() {} }), /current consent/);
  assert.throws(() => gate.sendAudio(new Uint8Array([1])), /not authorised/);
  assert.equal(gate.observeTranscript('fictional caption'), null);
});

test('consent must be explicit and exactly participant/room-scoped', () => {
  const gate = createWayglassVoiceBoundary({ participantId: 'rowan', roomId: 'commons' });
  for (const args of [
    { affirmative: false, participantId: 'rowan', roomId: 'commons' },
    { affirmative: true, participantId: 'somebody-else', roomId: 'commons' },
    { affirmative: true, participantId: 'rowan', roomId: 'other-room' },
  ]) assert.throws(() => gate.grantConsent(args), /scope-matching/);
  assert.equal(gate.grantConsent({ affirmative: true, participantId: 'rowan', roomId: 'commons' }).phase, 'consented');
  assert.throws(() => gate.grantConsent({ affirmative: true, participantId: 'rowan', roomId: 'commons' }), /Close the previous/);
});

test('authorised audio travels to supplied mock transport, never persists or canonises', () => {
  const sent = [];
  const gate = createWayglassVoiceBoundary({ participantId: 'rowan', roomId: 'commons' });
  gate.grantConsent({ affirmative: true, participantId: 'rowan', roomId: 'commons' });
  gate.bindTransport({ sendAudio(bytes) { sent.push([...bytes]); }, close() {} });
  const audio = Uint8Array.from([3, 7, 12]);
  gate.sendAudio(audio);
  const transcript = gate.observeTranscript('A synthetic partial caption.');
  assert.deepEqual(sent, [[3, 7, 12]]);
  assert.equal(transcript.review, 'unreviewed');
  assert.equal(transcript.canon_commit, false);
  assert.equal(transcript.speaker_verified, false);
  assert.equal(gate.snapshot().recording_persisted, false);
  assert.doesNotMatch(JSON.stringify(gate.snapshot()), /3,7,12/);
  for (const chunk of [new Uint8Array(0), new Uint8Array(65537), 'raw-audio']) {
    assert.throws(() => gate.sendAudio(chunk), /Uint8Array/);
  }
});

test('Feather revokes authorisation before stopping local capture and provider transport', () => {
  let gate;
  let localStopped = 0, remoteClosed = 0;
  gate = createWayglassVoiceBoundary({
    participantId: 'rowan', roomId: 'commons',
    stopLocalCapture() {
      localStopped++;
      assert.equal(gate.snapshot().send_enabled, false);
      assert.equal(gate.snapshot().consent_active, false);
    },
  });
  gate.grantConsent({ affirmative: true, participantId: 'rowan', roomId: 'commons' });
  gate.bindTransport({ sendAudio() {}, close() { remoteClosed++; assert.equal(gate.snapshot().send_enabled, false); } });
  const stop = gate.feather();
  assert.equal(stop.last_halt, 'Feather');
  assert.equal(stop.phase, 'closed');
  assert.equal(localStopped, 1);
  assert.equal(remoteClosed, 1);
  assert.throws(() => gate.sendAudio(new Uint8Array([1])), /not authorised/);
  assert.equal(gate.observeTranscript('Late upstream words'), null);
  assert.equal(stop.canon_commit, false);
});

test('callback errors cannot re-open capture; new consent required after halt', () => {
  const gate = createWayglassVoiceBoundary({ participantId: 'rowan', roomId: 'commons', stopLocalCapture() { throw Error('device failure'); } });
  gate.grantConsent({ affirmative: true, participantId: 'rowan', roomId: 'commons' });
  gate.bindTransport({ sendAudio() {}, close() { throw Error('upstream failure'); } });
  const stop = gate.halt('Icarus');
  assert.deepEqual(stop.stop_errors, ['local-capture-stop-failed', 'transport-close-failed']);
  assert.equal(gate.snapshot().phase, 'closed');
  assert.equal(gate.snapshot().send_enabled, false);
  assert.throws(() => gate.bindTransport({sendAudio() {}, close() {}}), /current consent/);
  assert.equal(gate.grantConsent({ affirmative: true, participantId: 'rowan', roomId: 'commons' }).phase, 'consented');
});

test('connection loss stops local capture and requires new explicit consent', () => {
  let stopped = 0;
  const gate = createWayglassVoiceBoundary({ participantId: 'rowan', roomId: 'commons', stopLocalCapture() { stopped++; } });
  gate.grantConsent({ affirmative: true, participantId: 'rowan', roomId: 'commons' });
  gate.bindTransport({ sendAudio() {}, close() {} });
  assert.equal(gate.disconnect().last_halt, 'transport-disconnected');
  assert.equal(stopped, 1);
  assert.equal(gate.snapshot().consent_active, false);
  assert.throws(() => gate.sendAudio(Uint8Array.from([5])), /not authorised/);
});
