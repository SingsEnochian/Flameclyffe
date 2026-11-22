import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createWayglassVoiceBoundary } from '../apps/wayglass/src/voice-boundary.js';

/** A synthetic transport test: no microphone, provider, Osia or real speech. */
export const VOICE_PREFLIGHT_SCHEMA = 'wayglass.voice-synthetic-preflight/v0.1';
export function runSyntheticVoicePreflight() {
  let audioChunks = 0, localStops = 0, transportCloses = 0;
  const boundary = createWayglassVoiceBoundary({
    participantId: 'synthetic:participant', roomId: 'synthetic:room',
    stopLocalCapture: () => { localStops++; },
  });
  const initiallyClosed = boundary.snapshot().send_enabled === false;
  let unconsentedRejected = false;
  try { boundary.sendAudio(Uint8Array.from([1])); } catch { unconsentedRejected = true; }
  boundary.grantConsent({ affirmative: true, participantId: 'synthetic:participant', roomId: 'synthetic:room' });
  boundary.bindTransport({sendAudio: () => { audioChunks++; }, close: () => { transportCloses++; }});
  boundary.sendAudio(Uint8Array.from([0, 0, 0, 0]));
  const transcript = boundary.observeTranscript('Synthetic words only.', { source: 'synthetic-preflight' });
  const halted = boundary.feather();
  const passed = initiallyClosed && unconsentedRejected && audioChunks === 1
    && transcript?.review === 'unreviewed' && transcript?.canon_commit === false
    && halted.send_enabled === false && localStops === 1 && transportCloses === 1;
  return Object.freeze({
    schema: VOICE_PREFLIGHT_SCHEMA,
    result: passed ? 'passed' : 'failed',
    synthetic_audio_chunks: audioChunks,
    local_stops: localStops, transport_closes: transportCloses,
    claims: { microphone_used: false, actual_voice_transcribed: false, external_provider_called: false,
      osia_output_verified: false, participant_identity_verified: false,
      transcript_reviewed: false, recording_persisted: false },
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--synthetic')) {
    const result = runSyntheticVoicePreflight();
    console.log(JSON.stringify(result, null, 2));
    if (result.result !== 'passed') process.exitCode = 1;
  } else console.log('Synthetic-only preflight. Add --synthetic to run without microphone, network or real audio.');
}
