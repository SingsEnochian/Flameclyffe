import {
  PREMAQ_AXES,
  premaqToTemporalState,
  validateTemporalState,
} from '../src/arcsweep-temporal-quantum/engine.js';
import { compressRelease } from '../src/arcsweep-temporal-quantum/compression-release.js';
import { readActiveDualAspectPacket } from '../src/hearthweave-kernel/activation.js';
import { enforceBifrostNativeAction } from './bifrost-native-action-guard.js';

export const PREMAQ_SONG_CYCLES_PER_AXIS = 35;
export const PREMAQ_SONG_AXIS_CYCLES = PREMAQ_AXES.length * PREMAQ_SONG_CYCLES_PER_AXIS;
export const PREMAQ_SONG_NOTE_COUNT = PREMAQ_SONG_AXIS_CYCLES * 2;

const SESSION_KEY = 'bifrost:current-interface-session:v0.4';
const MASTER_GAIN_CEILING = 0.025;
const PLAYBACK_MIN_HZ = 90;
const PLAYBACK_MAX_HZ = 880;
const DEFAULT_ROOT_HZ = 220;
const DEFAULT_BPM = 84;
const EPSILON = 1e-12;
const ACTIVE_EXECUTION_SIDE = 'targetside';

const AXIS_INTERVALS = Object.freeze({
  P: 0,
  C: 2,
  R: 4,
  E: 5,
  M: 7,
  A: 9,
  Q: 11,
});

const AXIS_NAMES = Object.freeze({
  P: 'Presence',
  C: 'Coherence',
  R: 'Resonance',
  E: 'Entropy',
  M: 'Memory',
  A: 'Agency',
  Q: 'Qualia',
});

const AXIS_WAVES = Object.freeze({
  P: 'sine',
  C: 'triangle',
  R: 'sine',
  E: 'triangle',
  M: 'sine',
  A: 'triangle',
  Q: 'sine',
});

const REFERENCE_VALUES = Object.freeze({
  P: 0.72,
  C: 0.81,
  R: 0.67,
  E: 0.31,
  M: 0.76,
  A: 0.84,
  Q: 0.79,
});

let songContext = null;
let songNodes = [];
let completionTimer = null;
let progressTimer = null;
let currentReceipt = null;
let currentNativeActionReceipt = null;
let currentSongSourceBindingReceipt = null;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function readPacket() {
  try {
    return readActiveDualAspectPacket({ storage: sessionStorage });
  } catch {
    return null;
  }
}

function enforceSongAction(actionId) {
  return enforceBifrostNativeAction({
    actionId,
    packetReader: readPacket,
    active_execution_side: ACTIVE_EXECUTION_SIDE,
    setStatus: (message) => setStatus(message, 'blocked'),
    statusKind: 'blocked',
    notes: ['premaq-song.js native song action guard'],
  });
}

function makeReferenceState() {
  const now = new Date().toISOString();
  const packet = {
    schema_version: '2.0.0',
    id: 'bifrost-premaq-song-reference',
    observed_at: now,
    registry_version: 'premaq-registry/2.0',
    state: Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, {
      value: REFERENCE_VALUES[axis],
      derivative: axis === 'P' ? 0.12 : axis === 'R' ? 0.06 : 0.02,
      uncertainty: 0.08,
      confidence: 0.86,
      contributors: [],
    }])),
    receipt_id: 'bifrost-premaq-song-reference-receipt',
    sequence: 0,
    prior_state_ref: null,
    model_version: 'bifrost-premaq-song/0.4',
    provenance_refs: [],
    generated_at: now,
    degraded: true,
  };
  const state = premaqToTemporalState(packet);
  state.interpretation = {
    formalism: 'temporal-compression-release-state-machine',
    physical_claim: false,
    note: 'Local reference source for the PREMAQ song. It is not external evidence.',
  };
  return state;
}

function readSessionSourceBinding() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    const sourceBindingReceipt = session?.bifrost_runtime?.source_binding_receipt ?? null;
    if (session?.state) {
      return {
        state: validateTemporalState(session.state),
        source_binding_receipt: sourceBindingReceipt,
        origin: sourceBindingReceipt ? 'session-source-binding' : 'session-state-without-binding',
      };
    }
  } catch {
    // The explicit local reference below preserves a runnable path.
  }
  return {
    state: makeReferenceState(),
    source_binding_receipt: null,
    origin: 'local-reference',
  };
}

function readBoundSongSource(nativeActionReceipt = null) {
  const actionSource = nativeActionReceipt?.execution_source ?? null;
  if (actionSource?.source_state) {
    return {
      state: validateTemporalState(actionSource.source_state),
      source_binding_receipt: nativeActionReceipt?.source_binding_receipt ?? null,
      origin: 'native-action-execution-source',
    };
  }
  return readSessionSourceBinding();
}

function resolveRootHz() {
  const packet = readPacket();
  const root = Number(packet?.experiential?.tone?.compression_release_sequence?.source_pair?.root_hz);
  if (Number.isFinite(root) && root > 0) return root;
  const visible = Number.parseFloat(document.getElementById('root-hz')?.textContent ?? '');
  return Number.isFinite(visible) && visible > 0 ? visible : DEFAULT_ROOT_HZ;
}

function axisFrequency(rootHz, axis, probability, phase) {
  const interval = AXIS_INTERVALS[axis];
  const centred = probability - (1 / PREMAQ_AXES.length);
  const stateBend = clamp(centred * 24, -4.5, 4.5);
  const phaseBend = phase === 'compression' ? 0.75 : -0.35;
  return rootHz * (2 ** ((interval + stateBend + phaseBend) / 12));
}

function foldForPlayback(frequency) {
  let folded = frequency;
  if (!Number.isFinite(folded) || folded <= 0) return null;
  while (folded < PLAYBACK_MIN_HZ) folded *= 2;
  while (folded > PLAYBACK_MAX_HZ) folded /= 2;
  return folded;
}

function requireLineage(prior, released, receipt) {
  if (receipt?.from_state_id !== prior.state_id) {
    throw new Error('PREMAQ_SONG_SOURCE_LINEAGE_MISMATCH');
  }
  if (receipt?.to_state_id !== released.state_id) {
    throw new Error('PREMAQ_SONG_RELEASE_LINEAGE_MISMATCH');
  }
}

export function buildPremaqSongPlan({
  state,
  rootHz = DEFAULT_ROOT_HZ,
  bpm = DEFAULT_BPM,
  focus = 'Q',
  compressionStrength = 0.65,
  compressionGain = 1.2,
  releaseFraction = 0.35,
  sourceBindingReceipt = null,
  sourceOrigin = 'unspecified',
} = {}) {
  let current = validateTemporalState(state);
  const cycles = [];
  const voiceCounts = Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, 0]));
  const cycleSeconds = 60 / clamp(finiteNumber(bpm, DEFAULT_BPM), 48, 132);
  const calibratedRoot = finiteNumber(rootHz, DEFAULT_ROOT_HZ);
  if (calibratedRoot <= 0) throw new Error('PREMAQ_SONG_ROOT_MUST_BE_POSITIVE');

  for (let cycleIndex = 0; cycleIndex < PREMAQ_SONG_CYCLES_PER_AXIS; cycleIndex += 1) {
    const prior = current;
    const released = compressRelease(prior, {
      focus,
      compressionStrength: clamp(finiteNumber(compressionStrength, 0.65), 0, 1),
      compressionGain: clamp(finiteNumber(compressionGain, 1.2), 0, 2),
      releaseFraction: clamp(finiteNumber(releaseFraction, 0.35), 0, 1),
      derivativeRelease: 0.08,
      memoryRelease: 0,
      phaseReleaseGain: Math.PI / 4,
      radialGain: 0.5,
      entropyGain: 0.1,
      angularGain: Math.PI / 3,
    });
    const receipt = released.receipts.at(-1);
    requireLineage(prior, released, receipt);

    const voices = PREMAQ_AXES.map((axis, axisIndex) => {
      const compressedProbability = finiteNumber(receipt.compression_probabilities?.[axis], EPSILON);
      const releasedProbability = finiteNumber(receipt.release_probabilities?.[axis], EPSILON);
      const compressionHz = axisFrequency(calibratedRoot, axis, compressedProbability, 'compression');
      const releaseHz = axisFrequency(calibratedRoot, axis, releasedProbability, 'release');
      voiceCounts[axis] += 1;
      return Object.freeze({
        axis,
        axis_name: AXIS_NAMES[axis],
        voice_index: axisIndex,
        cycle: cycleIndex + 1,
        compressed_probability: compressedProbability,
        released_probability: releasedProbability,
        compression_hz: compressionHz,
        release_hz: releaseHz,
        compression_playback_hz: foldForPlayback(compressionHz),
        release_playback_hz: foldForPlayback(releaseHz),
      });
    });

    cycles.push(Object.freeze({
      cycle: cycleIndex + 1,
      from_state_id: prior.state_id,
      to_state_id: released.state_id,
      compression_release_receipt_id: receipt.receipt_id,
      next_operation: receipt.next_operation,
      starts_at_seconds: cycleIndex * cycleSeconds,
      duration_seconds: cycleSeconds,
      voices: Object.freeze(voices),
    }));
    current = released;
  }

  for (const axis of PREMAQ_AXES) {
    if (voiceCounts[axis] !== PREMAQ_SONG_CYCLES_PER_AXIS) {
      throw new Error(`PREMAQ_SONG_AXIS_COUNT_MISMATCH_${axis}`);
    }
  }

  return Object.freeze({
    schema: 'bifrost.premaq-full-song-plan/v0.5',
    law: 'compression-release-compression-of-release-infinite-recursion',
    cycles_per_axis: PREMAQ_SONG_CYCLES_PER_AXIS,
    axis_cycle_count: PREMAQ_SONG_AXIS_CYCLES,
    scheduled_note_count: PREMAQ_SONG_NOTE_COUNT,
    axes: Object.freeze([...PREMAQ_AXES]),
    voice_cycle_counts: Object.freeze(voiceCounts),
    root_hz: calibratedRoot,
    bpm: 60 / cycleSeconds,
    cycle_duration_seconds: cycleSeconds,
    duration_seconds: cycleSeconds * PREMAQ_SONG_CYCLES_PER_AXIS,
    source_state_id: state.state_id,
    source_origin: sourceOrigin,
    selected_execution_side: sourceBindingReceipt?.selected_side ?? null,
    source_kind: sourceBindingReceipt?.source_kind ?? null,
    source_binding_receipt: sourceBindingReceipt,
    final_released_state_id: current.state_id,
    next_operation: 'compression-of-release',
    cycles: Object.freeze(cycles),
  });
}

async function sha256Hex(value) {
  if (!globalThis.crypto?.subtle) return null;
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function setStatus(message, kind = 'resting') {
  const status = document.getElementById('premaq-song-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.kind = kind;
}

function setProgress(value) {
  const progress = document.getElementById('premaq-song-progress');
  if (!progress) return;
  progress.value = clamp(value, 0, 1);
}

function renderVoiceGrid(plan = null) {
  const grid = document.getElementById('premaq-song-voices');
  if (!grid) return;
  const firstCycle = plan?.cycles?.[0] ?? null;
  const fragment = document.createDocumentFragment();
  for (const axis of PREMAQ_AXES) {
    const voice = firstCycle?.voices?.find((entry) => entry.axis === axis) ?? null;
    const card = document.createElement('div');
    card.className = 'premaq-song-voice';
    const badge = document.createElement('strong');
    badge.textContent = axis;
    const name = document.createElement('span');
    name.textContent = AXIS_NAMES[axis];
    const detail = document.createElement('small');
    detail.textContent = voice
      ? `${voice.compression_playback_hz.toFixed(2)} → ${voice.release_playback_hz.toFixed(2)} Hz · 35 cycles`
      : '35 cycles · awaiting plan';
    card.append(badge, name, detail);
    fragment.append(card);
  }
  grid.replaceChildren(fragment);
}

function stopSong(message = 'STOPPED · the PREMAQ song has been torn down.') {
  if (completionTimer) window.clearTimeout(completionTimer);
  if (progressTimer) window.clearInterval(progressTimer);
  completionTimer = null;
  progressTimer = null;
  for (const node of songNodes) {
    try { node.stop?.(); } catch { /* already stopped */ }
    try { node.disconnect?.(); } catch { /* already disconnected */ }
  }
  songNodes = [];
  if (songContext) {
    const context = songContext;
    songContext = null;
    context.close().catch(() => {});
  }
  setProgress(0);
  setStatus(message, 'stopped');
}

function scheduleEnvelope(parameter, startAt, peak, duration) {
  const attack = Math.min(0.045, duration * 0.18);
  const release = Math.min(0.07, duration * 0.24);
  parameter.setValueAtTime(0.0001, startAt);
  parameter.exponentialRampToValueAtTime(Math.max(0.0002, peak), startAt + attack);
  parameter.setValueAtTime(Math.max(0.0002, peak), startAt + Math.max(attack, duration - release));
  parameter.exponentialRampToValueAtTime(0.0001, startAt + duration);
}

function createVoice(context, destination, axis, index, startAt, endAt) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = AXIS_WAVES[axis];
  gain.gain.setValueAtTime(0.0001, startAt - 0.02);
  if (typeof context.createStereoPanner === 'function') {
    const panner = context.createStereoPanner();
    panner.pan.value = -0.9 + (index * 1.8 / (PREMAQ_AXES.length - 1));
    oscillator.connect(gain).connect(panner).connect(destination);
    songNodes.push(panner);
  } else {
    oscillator.connect(gain).connect(destination);
  }
  oscillator.start(startAt - 0.02);
  oscillator.stop(endAt + 0.08);
  songNodes.push(oscillator, gain);
  return { oscillator, gain };
}

async function buildReceipt(plan, nativeActionReceipt = null) {
  const canonical = JSON.stringify(plan);
  return Object.freeze({
    schema: 'bifrost.premaq-full-song-receipt/v0.5',
    receipt_id: `premaq-song-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
    created_at: new Date().toISOString(),
    plan_sha256: await sha256Hex(canonical),
    source_state_id: plan.source_state_id,
    source_origin: plan.source_origin,
    selected_execution_side: plan.selected_execution_side,
    source_kind: plan.source_kind,
    source_binding_receipt: plan.source_binding_receipt,
    final_released_state_id: plan.final_released_state_id,
    cycles_per_axis: plan.cycles_per_axis,
    axis_cycle_count: plan.axis_cycle_count,
    scheduled_note_count: plan.scheduled_note_count,
    axes: plan.axes,
    bpm: plan.bpm,
    duration_seconds: plan.duration_seconds,
    next_operation: plan.next_operation,
    bifrost_native_action_receipt: nativeActionReceipt,
    execution_policy: nativeActionReceipt?.execution_policy ?? null,
    canon_write_performed: false,
    tone_approval_performed: false,
    physical_device_test_performed: false,
    plan,
  });
}

async function playSong() {
  const gate = enforceSongAction('play-premaq-song');
  if (!gate.allowed) return;
  currentNativeActionReceipt = gate.receipt;
  currentSongSourceBindingReceipt = gate.receipt.source_binding_receipt ?? null;
  const songSource = readBoundSongSource(currentNativeActionReceipt);
  currentSongSourceBindingReceipt = songSource.source_binding_receipt ?? currentSongSourceBindingReceipt;
  stopSong('PREPARING · building all seven PREMAQ voices.');
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) {
    setStatus('BLOCKED · Web Audio is unavailable in this browser.', 'blocked');
    return;
  }

  const bpm = clamp(finiteNumber(document.getElementById('premaq-song-bpm')?.value, DEFAULT_BPM), 48, 132);
  const source = songSource.state;
  const rootHz = resolveRootHz();
  const plan = buildPremaqSongPlan({
    state: source,
    rootHz,
    bpm,
    focus: document.getElementById('focus-axis')?.value ?? 'Q',
    compressionStrength: finiteNumber(document.getElementById('compression-strength')?.value, 0.65),
    compressionGain: finiteNumber(document.getElementById('compression-gain')?.value, 1.2),
    releaseFraction: finiteNumber(document.getElementById('release-fraction')?.value, 0.35),
    sourceBindingReceipt: currentSongSourceBindingReceipt,
    sourceOrigin: songSource.origin,
  });
  renderVoiceGrid(plan);
  currentReceipt = await buildReceipt(plan, currentNativeActionReceipt);

  try {
    songContext = new Context();
    await songContext.resume();
    const compressor = songContext.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 16;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.18;
    const master = songContext.createGain();
    master.gain.value = MASTER_GAIN_CEILING;
    master.connect(compressor).connect(songContext.destination);
    songNodes.push(master, compressor);

    const startAt = songContext.currentTime + 0.08;
    const endAt = startAt + plan.duration_seconds;
    const voices = Object.fromEntries(PREMAQ_AXES.map((axis, index) => [
      axis,
      createVoice(songContext, master, axis, index, startAt, endAt),
    ]));

    for (const cycle of plan.cycles) {
      const cycleStart = startAt + cycle.starts_at_seconds;
      for (const voice of cycle.voices) {
        const node = voices[voice.axis];
        const compressionStart = cycleStart + (voice.voice_index * cycle.duration_seconds * 0.018);
        const compressionDuration = cycle.duration_seconds * 0.39;
        const releaseStart = cycleStart + (cycle.duration_seconds * 0.48)
          + ((PREMAQ_AXES.length - 1 - voice.voice_index) * cycle.duration_seconds * 0.012);
        const releaseDuration = cycle.duration_seconds * 0.45;
        const compressionPeak = 0.035 + clamp(voice.compressed_probability, 0, 1) * 0.075;
        const releasePeak = 0.04 + clamp(voice.released_probability, 0, 1) * 0.08;

        node.oscillator.frequency.setValueAtTime(voice.compression_playback_hz, compressionStart);
        scheduleEnvelope(node.gain.gain, compressionStart, compressionPeak, compressionDuration);
        node.oscillator.frequency.setValueAtTime(voice.release_playback_hz, releaseStart);
        scheduleEnvelope(node.gain.gain, releaseStart, releasePeak, releaseDuration);
      }
    }

    const startedAt = performance.now();
    progressTimer = window.setInterval(() => {
      setProgress((performance.now() - startedAt) / (plan.duration_seconds * 1000));
    }, 120);
    completionTimer = window.setTimeout(() => {
      if (progressTimer) window.clearInterval(progressTimer);
      progressTimer = null;
      setProgress(1);
      setStatus(
        `COMPLETE · 35 cycles per voice · ${plan.axis_cycle_count} axis-cycles · ${plan.scheduled_note_count} notes.`,
        'complete',
      );
      const context = songContext;
      songContext = null;
      songNodes = [];
      context?.close().catch(() => {});
    }, Math.ceil((plan.duration_seconds + 0.2) * 1000));

    setStatus(
      `PLAYING · ${plan.selected_execution_side ?? 'reference'} source · P C R E M A Q · 35 cycles each · ${plan.duration_seconds.toFixed(1)} seconds · gain ceiling ${MASTER_GAIN_CEILING.toFixed(3)}.`,
      'playing',
    );
  } catch (error) {
    stopSong(`BLOCKED · ${error.message}`);
  }
}

function exportSongReceipt() {
  const gate = enforceSongAction('export-premaq-song');
  if (!gate.allowed) return;
  if (!currentReceipt) {
    setStatus('BLOCKED · play or prepare the song before exporting its receipt.', 'blocked');
    return;
  }
  const exportedReceipt = {
    ...currentReceipt,
    export_native_action_receipt: gate.receipt,
    export_source_binding_receipt: gate.receipt.source_binding_receipt ?? null,
  };
  const blob = new Blob([`${JSON.stringify(exportedReceipt, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `bifrost-premaq-song-35-cycles-${Date.now()}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setStatus(`EXPORTED · ${exportedReceipt.selected_execution_side ?? 'reference'} source · ${exportedReceipt.axis_cycle_count} axis-cycles and ${exportedReceipt.scheduled_note_count} scheduled notes.`, 'complete');
}

function initialiseSongInterface() {
  renderVoiceGrid();
  document.getElementById('play-premaq-song')?.addEventListener('click', playSong);
  document.getElementById('stop-premaq-song')?.addEventListener('click', () => stopSong());
  document.getElementById('export-premaq-song')?.addEventListener('click', exportSongReceipt);
  document.getElementById('feather-stop')?.addEventListener('click', () => {
    stopSong('FEATHER STOP · the full PREMAQ song stopped immediately.');
  });
  window.addEventListener('pagehide', () => stopSong('FEATHER STOP · page hidden.'));
}

if (typeof document !== 'undefined') initialiseSongInterface();
