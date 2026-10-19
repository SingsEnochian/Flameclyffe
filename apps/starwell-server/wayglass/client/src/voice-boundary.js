// Wayglass voice consent and local audio transfer boundary.
//
// Transport-neutral: this module does not open the microphone, connect to
// StepFun, assert model compatibility or persist raw speech. An actual host
// transport must be independently authorised and supplied to bindTransport().
// Provider != persona; transcription != canon.
export const WAYGLASS_VOICE_BOUNDARY_SCHEMA = 'wayglass.voice-boundary/v0.1';

const clip = (value, max = 180) => String(value ?? '').trim().slice(0, max);

export function createWayglassVoiceBoundary({
  participantId,
  roomId,
  stopLocalCapture = () => {},
} = {}) {
  const participant = clip(participantId), room = clip(roomId);
  if (!participant || !room) throw new TypeError('Voice boundary requires a participant and a room.');
  if (typeof stopLocalCapture !== 'function') throw new TypeError('stopLocalCapture must be a function.');

  let transport = null;
  let phase = 'closed';
  let consent = false;
  let transcriptCount = 0;
  let lastHalt = null;

  function snapshot() {
    return Object.freeze({
      schema: WAYGLASS_VOICE_BOUNDARY_SCHEMA,
      participant_id: participant,
      room_id: room,
      phase,
      consent_active: consent,
      transport_bound: transport !== null,
      send_enabled: phase === 'active' && consent && transport !== null,
      transcript_observations: transcriptCount,
      last_halt: lastHalt,
      recording_persisted: false,
      canon_commit: false,
    });
  }

  function grantConsent({ affirmative = false, participantId: grantee, roomId: targetRoom } = {}) {
    if (affirmative !== true || grantee !== participant || targetRoom !== room) {
      throw new Error('Explicit, scope-matching participant consent required.');
    }
    if (phase !== 'closed') throw new Error('Close the previous voice session before granting fresh consent.');
    consent = true;
    phase = 'consented';
    lastHalt = null;
    return snapshot();
  }

  function bindTransport(adapter) {
    if (!consent || phase !== 'consented') throw new Error('Voice transport requires current consent.');
    if (!adapter || typeof adapter.sendAudio !== 'function' || typeof adapter.close !== 'function') {
      throw new TypeError('Voice transport must support sendAudio and close.');
    }
    transport = adapter;
    phase = 'active';
    return snapshot();
  }

  function sendAudio(chunk) {
    if (!consent || phase !== 'active' || !transport) throw new Error('Voice audio transfer is not authorised or active.');
    if (!(chunk instanceof Uint8Array) || chunk.byteLength === 0 || chunk.byteLength > 65536) {
      throw new TypeError('Voice transfer requires a 1–65536-byte Uint8Array chunk.');
    }
    // Only transport receives the bytes. Never cache raw audio in Wayglass state.
    return transport.sendAudio(chunk);
  }

  function observeTranscript(text, { source = 'external-model' } = {}) {
    if (!consent || phase !== 'active') return null;
    const value = clip(text, 4000);
    if (!value) return null;
    transcriptCount += 1;
    return Object.freeze({
      schema: 'wayglass.voice-transcript-observation/v0.1',
      participant_id: participant,
      room_id: room,
      source: clip(source, 120) || 'external-model',
      text: value,
      review: 'unreviewed',
      canon_commit: false,
      speaker_verified: false,
    });
  }

  // "Feather"/"Icarus" is a hard local halt. Synchronously close the gate
  // before calling capture/transport hooks, including if those hooks fail.
  function halt(reason = 'stop') {
    const why = clip(reason, 120) || 'stop';
    const previous = transport;
    transport = null;
    consent = false;
    phase = 'closed';
    lastHalt = why;
    const errors = [];
    try { stopLocalCapture(); } catch (error) { errors.push('local-capture-stop-failed'); }
    try { previous?.close(); } catch (error) { errors.push('transport-close-failed'); }
    return Object.freeze({ ...snapshot(), stop_errors: Object.freeze(errors) });
  }

  function disconnect() { return halt('transport-disconnected'); }
  function feather() { return halt('Feather'); }
  return Object.freeze({ snapshot, grantConsent, bindTransport, sendAudio, observeTranscript, halt, disconnect, feather });
}
