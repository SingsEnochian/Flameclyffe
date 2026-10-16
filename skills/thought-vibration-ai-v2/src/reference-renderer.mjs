/**
 * Thought Vibration AI 2 | Offline audio proving chamber.
 * Standard library only. No audio device, browser, network or external API calls.
 * Claim domain: OBSERVATION-TRUE for generated PCM and measured quantities.
 * The standalone fixture is not a registered Hearthgate ENGINE-TRUE law.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const RENDERER_ID = 'thought-vibration.offline-reference/v2.0.0';
export const SAMPLE_RATE_HZ = 48000;
const TWO_PI = 2 * Math.PI;
const VALID_DOMAINS = new Set(['ENGINE-TRUE', 'OBSERVATION-TRUE', 'CANON-TRUE', 'SYMBOLIC', 'UNKNOWN', 'REJECTED']);
const VALID_MODES = new Set(['mythic-composition', 'acoustic-engineering', 'quantum-simulation', 'combined-experiment']);
const SESSION_KEYS = new Set(['schema', 'session_id', 'mode', 'claim_domain', 'source_id', 'render_intent_confirmed', 'audio', 'output', 'mythic', 'stop_point', 'next_owner', 'unresolved_questions']);
const COMMON_AUDIO_KEYS = ['kind','duration_seconds','sample_rate_hz','gain_linear','fade_seconds'];
const STEREO_KEYS = [...COMMON_AUDIO_KEYS,'left_hz','right_hz','phase_offset_deg'];
const MONO_KEYS = [...COMMON_AUDIO_KEYS,'carrier_hz','modulation_hz','modulation_depth'];

function sha256(buffer) { return createHash('sha256').update(buffer).digest('hex'); }
function assert(condition, message) { if (!condition) throw new RangeError(message); }
function finiteBetween(value, min, max, key, lowerInclusive = true) {
  assert(typeof value === 'number' && Number.isFinite(value), `${key} must be finite number`);
  assert((lowerInclusive ? value >= min : value > min) && value <= max, `${key} out of range`);
}
function exactlyKeys(obj, keys, path) {
  assert(obj !== null && typeof obj === 'object' && !Array.isArray(obj), `${path} must be object`);
  for (const key of Object.keys(obj)) assert((keys instanceof Set ? keys.has(key) : keys.includes(key)), `unsupported ${path}.${key}`);
}

export function validateSession(session) {
  exactlyKeys(session, SESSION_KEYS, 'session');
  assert(session.schema === 'thought-vibration.session/v1', 'unsupported session schema');
  assert(typeof session.session_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(session.session_id), 'invalid session_id');
  assert(typeof session.source_id === 'string' && session.source_id.length > 0 && session.source_id.length <= 256, 'source_id required');
  assert(VALID_DOMAINS.has(session.claim_domain), 'unknown authority domain');
  assert(VALID_MODES.has(session.mode), 'unknown mode');
  assert(session.render_intent_confirmed === true, 'offline render requires explicit intent');
  assert(session.output?.kind === 'offline-diagnostic-wav' && session.output?.playback === false, 'offline output must not request playback');
  exactlyKeys(session.output, ['kind','playback'], 'output');
  assert(session.mode === 'acoustic-engineering' || session.mode === 'combined-experiment', 'this reference renderer only supports acoustic-engineering/combined-experiment');
  assert(['separate-ear-stereo','mono-am'].includes(session.audio?.kind), 'unsupported audio mode');
  const a = session.audio;
  const stereo = a.kind === 'separate-ear-stereo';
  exactlyKeys(a, stereo ? STEREO_KEYS : MONO_KEYS, 'audio');
  assert((stereo ? STEREO_KEYS : MONO_KEYS).every(key => Object.hasOwn(a,key)), 'audio recipe incomplete');
  assert(a.sample_rate_hz === SAMPLE_RATE_HZ, 'fixture requires 48000 Hz sample rate');
  finiteBetween(a.duration_seconds, 0.05, 30, 'duration_seconds');
  finiteBetween(a.gain_linear, 0, 0.15, 'gain_linear', false);
  finiteBetween(a.fade_seconds, 0.005, 2, 'fade_seconds');
  assert(a.fade_seconds * 2 <= a.duration_seconds, 'fade must fit inside duration');
  if (stereo) {
    finiteBetween(a.left_hz, 20, 10000, 'left_hz');
    finiteBetween(a.right_hz, 20, 10000, 'right_hz');
    finiteBetween(a.phase_offset_deg, -180, 180, 'phase_offset_deg');
  } else {
    finiteBetween(a.carrier_hz, 20, 10000, 'carrier_hz');
    finiteBetween(a.modulation_hz, 0, 30, 'modulation_hz', false);
    finiteBetween(a.modulation_depth, 0, 1, 'modulation_depth');
    assert(a.carrier_hz + a.modulation_hz < SAMPLE_RATE_HZ / 2, 'signal exceeds Nyquist');
  }
  if (session.mythic !== undefined) {
    exactlyKeys(session.mythic, ['channel_state','rhythm_pattern','interpretation'], 'mythic');
    if (session.mythic.channel_state !== undefined) assert(['open','collapsed','stabilised'].includes(session.mythic.channel_state), 'unknown authored channel state');
    if (session.mythic.rhythm_pattern !== undefined) assert(typeof session.mythic.rhythm_pattern === 'string' && session.mythic.rhythm_pattern.length <= 128, 'invalid rhythm_pattern');
    if (session.mythic.interpretation !== undefined) assert(typeof session.mythic.interpretation === 'string' && session.mythic.interpretation.length <= 512, 'invalid mythic interpretation');
  }
  for (const key of ['stop_point','next_owner']) if (session[key] !== undefined) assert(session[key] === null || (typeof session[key] === 'string' && session[key].length <= (key === 'stop_point' ? 256 : 128)), `invalid ${key}`);
  if (session.unresolved_questions !== undefined) assert(Array.isArray(session.unresolved_questions) && session.unresolved_questions.length <= 20 && session.unresolved_questions.every(q=>typeof q === 'string' && q.length <= 500), 'invalid unresolved_questions');
  return session;
}

function envelope(frame, frames, fadeFrames) {
  return Math.min(1, frame / fadeFrames, (frames - 1 - frame) / fadeFrames);
}
function pcm16(sample) {
  assert(Number.isFinite(sample) && Math.abs(sample) <= 1, 'sample outside PCM range');
  return Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
}
function wavHeader(frameCount, channels, sampleRate) {
  const dataBytes = frameCount * channels * 2;
  const wave = Buffer.alloc(44 + dataBytes);
  wave.write('RIFF', 0, 'ascii');
  wave.writeUInt32LE(36 + dataBytes, 4);
  wave.write('WAVE', 8, 'ascii');
  wave.write('fmt ', 12, 'ascii');
  wave.writeUInt32LE(16, 16);             // PCM fmt chunk size
  wave.writeUInt16LE(1, 20);              // format: linear PCM
  wave.writeUInt16LE(channels, 22);
  wave.writeUInt32LE(sampleRate, 24);
  wave.writeUInt32LE(sampleRate * channels * 2, 28);
  wave.writeUInt16LE(channels * 2, 32);
  wave.writeUInt16LE(16, 34);
  wave.write('data', 36, 'ascii');
  wave.writeUInt32LE(dataBytes, 40);
  return wave;
}

/** Synthesize deterministic PCM without ever opening an output device. */
export function synthesizeSession(session, inputBytes = Buffer.from(JSON.stringify(session), 'utf8')) {
  validateSession(session);
  const a = session.audio;
  const stereo = a.kind === 'separate-ear-stereo';
  const channels = stereo ? 2 : 1;
  const frames = Math.round(a.duration_seconds * SAMPLE_RATE_HZ);
  const fadeFrames = a.fade_seconds * SAMPLE_RATE_HZ;
  const wav = wavHeader(frames, channels, SAMPLE_RATE_HZ);
  const sums = new Array(channels).fill(0), squareSums = [...sums], peaks = [...sums];
  let product = 0;
  const phaseR = stereo ? a.phase_offset_deg * Math.PI / 180 : 0;
  for (let frame = 0; frame < frames; frame++) {
    const time = frame / SAMPLE_RATE_HZ;
    const fade = envelope(frame, frames, fadeFrames);
    let v;
    if (stereo) {
      v = [a.gain_linear * fade * Math.sin(TWO_PI * a.left_hz * time),
           a.gain_linear * fade * Math.sin(TWO_PI * a.right_hz * time + phaseR)];
    } else {
      const modulation = (1 + a.modulation_depth * Math.sin(TWO_PI * a.modulation_hz * time)) / (1 + a.modulation_depth);
      v = [a.gain_linear * fade * modulation * Math.sin(TWO_PI * a.carrier_hz * time)];
    }
    for (let c = 0; c < channels; c++) {
      const q = pcm16(v[c]);
      wav.writeInt16LE(q, 44 + (frame * channels + c) * 2);
      const measured = q / 32768;
      sums[c] += measured;
      squareSums[c] += measured * measured;
      peaks[c] = Math.max(peaks[c], Math.abs(measured));
      v[c] = measured;
    }
    if (stereo) product += v[0] * v[1];
  }
  const rms = squareSums.map(sum => Math.sqrt(sum / frames));
  const dc = sums.map(sum => sum / frames);
  const variances = squareSums.map((sum, c) => sum / frames - dc[c] * dc[c]);
  const covariance = stereo ? product / frames - dc[0] * dc[1] : null;
  const correlation = !stereo || variances[0] <= 0 || variances[1] <= 0 ? null
    : Math.max(-1, Math.min(1, covariance / Math.sqrt(variances[0] * variances[1])));
  const wave_file = `${session.session_id}.wav`;
  const receipt = {
    schema:'thought-vibration.receipt/v1', session_id:session.session_id,
    status:'offline-rendered', renderer_id:RENDERER_ID, source_id:session.source_id,
    input_file_sha256:sha256(inputBytes), wave_file_sha256:sha256(wav), wave_file,
    format:{sample_rate_hz:SAMPLE_RATE_HZ,channels,bit_depth:16,frames,endian:'little',codec:'pcm'},
    measurements:{sample_peak:peaks,rms,dc_offset:dc,stereo_correlation:correlation,
      integrated_lufs:null,true_peak_dbtp:null,roughness:null},
    claims:[
      {domain:'OBSERVATION-TRUE',statement:'Offline PCM generated from specified oscillator/modulation reference contract.'},
      {domain:'OBSERVATION-TRUE',statement:'RMS, DC, sample peak and correlation computed from quantised PCM bytes.'},
      {domain:'UNKNOWN',statement:'No LUFS, true-peak, device, hearing response, quantum state or physical haptic measurement.'},
      ...(session.mythic ? [{domain:'SYMBOLIC',statement:'Mythic channel and cue labels are authorial scene descriptions.'}] : [])
    ],
    continuity:{stop_point:session.stop_point ?? null,next_owner:session.next_owner ?? null,
      unresolved_questions:session.unresolved_questions ?? []}
  };
  return {wav,receipt};
}

export async function renderFile(inputPath, outputDirectory) {
  assert(typeof inputPath === 'string' && inputPath.length > 0, 'input path required');
  assert(typeof outputDirectory === 'string' && outputDirectory.length > 0, 'output directory required');
  const inputBytes = await readFile(inputPath);
  const session = JSON.parse(inputBytes.toString('utf8'));
  const {wav,receipt} = synthesizeSession(session,inputBytes);
  const target = resolve(outputDirectory);
  await mkdir(target,{recursive:true});
  const wavPath = join(target,receipt.wave_file);
  const receiptPath = join(target,`${session.session_id}.receipt.json`);
  // Opt-in offline output; no device I/O. Re-running is deterministic.
  await writeFile(wavPath,wav);
  await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');
  return {wavPath,receiptPath,receipt};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input,output] = process.argv.slice(2);
  if (!input || !output) {
    console.error('Usage: node src/reference-renderer.mjs <session.json> <output-directory>');
    process.exitCode = 2;
  } else {
    renderFile(input,output).then(result => console.log(`Rendered offline: ${result.wavPath}\nReceipt: ${result.receiptPath}\nSHA-256: ${result.receipt.wave_file_sha256}`))
      .catch(e=>{console.error(`${e.name}: ${e.message}`);process.exitCode=1;});
  }
}
