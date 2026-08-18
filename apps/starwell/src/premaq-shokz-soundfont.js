import {
  PREMAQ_AXES,
  premaqToTemporalState,
  validateTemporalState,
} from './arcsweep-temporal-quantum/engine.js';
import { compressRelease } from './arcsweep-temporal-quantum/compression-release.js';
import {
  readActiveDualAspectPacket,
  subscribeToDualAspectActivation,
} from './hearthweave-kernel/activation.js';

export const PREMAQ_SHOKZ_CYCLES_PER_AXIS = 35;
export const PREMAQ_SHOKZ_AXIS_CYCLES = PREMAQ_AXES.length * PREMAQ_SHOKZ_CYCLES_PER_AXIS;
export const PREMAQ_SHOKZ_TONE_EVENTS = PREMAQ_SHOKZ_AXIS_CYCLES * 2;
export const PREMAQ_SHOKZ_MIN_HZ = 90;
export const PREMAQ_SHOKZ_MAX_HZ = 360;
export const PREMAQ_SHOKZ_MASTER_GAIN_CEILING = 0.018;

const SESSION_KEY = 'bifrost:current-interface-session:v0.4';
const DOCK_ID = 'premaq-shokz-soundfont-dock';
const ROOT_HZ = 220;
const DEFAULT_BPM = 84;
const INTERACTION_SELECTOR = [
  'a[href]',
  'button',
  'summary',
  'select',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[data-key]',
  '[data-keyboard-key]',
  '[data-soundfont-key]',
].join(',');

const AXIS_NAMES = Object.freeze({
  P: 'Presence',
  C: 'Coherence',
  R: 'Resonance',
  E: 'Entanglement',
  M: 'Memory',
  A: 'Agency',
  Q: 'Qualia',
});

const AXIS_INTERVALS = Object.freeze({
  P: 0,
  C: 2,
  R: 4,
  E: 5,
  M: 7,
  A: 9,
  Q: 11,
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

let installed = false;
let enabled = false;
let fullSongPlaying = false;
let sourceState = null;
let sourceMode = 'local-reference';
let activePlan = null;
let audioContext = null;
let masterGain = null;
let activeNodes = new Set();
let fullSongTimer = null;
let fullSongProgressTimer = null;
let interactionCursorByAxis = Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, 0]));

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function makeReferenceState() {
  const now = new Date().toISOString();
  const packet = {
    schema_version: '2.0.0',
    id: 'premaq-shokz-reference',
    observed_at: now,
    registry_version: 'premaq-registry/2.0',
    state: Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, {
      value: REFERENCE_VALUES[axis],
      derivative: axis === 'P' ? 0.12 : axis === 'R' ? 0.06 : 0.02,
      uncertainty: 0.08,
      confidence: 0.86,
      contributors: [],
    }])),
    receipt_id: 'premaq-shokz-reference-receipt',
    sequence: 0,
    prior_state_ref: null,
    model_version: 'premaq-shokz-soundfont/0.4',
    provenance_refs: [],
    generated_at: now,
    degraded: true,
  };
  const state = premaqToTemporalState(packet);
  state.interpretation = {
    formalism: 'temporal-compression-release-state-machine',
    physical_claim: false,
    note: 'Explicit local reference source for the browser sound font.',
  };
  return state;
}

function resolveSourceState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (saved?.state) {
      return { state: validateTemporalState(saved.state), mode: 'bifrost-session' };
    }
  } catch {
    // Continue to the active packet or explicit reference source.
  }

  try {
    const packet = readActiveDualAspectPacket({ storage: sessionStorage });
    const target = packet?.temporal?.targetside;
    if (target) {
      return { state: validateTemporalState(target), mode: 'active-dual-aspect-packet' };
    }
  } catch {
    // Continue to the explicit reference source.
  }

  return { state: makeReferenceState(), mode: 'local-reference' };
}

function foldToShokzBand(frequency) {
  let folded = frequency;
  if (!Number.isFinite(folded) || folded <= 0) return null;
  while (folded < PREMAQ_SHOKZ_MIN_HZ) folded *= 2;
  while (folded > PREMAQ_SHOKZ_MAX_HZ) folded /= 2;
  return folded;
}

function axisFrequency(rootHz, axis, probability, phase, cycleIndex) {
  const interval = AXIS_INTERVALS[axis];
  const centred = probability - (1 / PREMAQ_AXES.length);
  const stateBend = clamp(centred * 24, -4.5, 4.5);
  const phaseBend = phase === 'compression' ? 0.75 : -0.35;
  const cycleBend = Math.sin((cycleIndex + 1) * Math.PI / 7) * 0.55;
  return rootHz * (2 ** ((interval + stateBend + phaseBend + cycleBend) / 12));
}

function requireLineage(prior, released, receipt) {
  if (receipt?.from_state_id !== prior.state_id) {
    throw new Error('PREMAQ_SHOKZ_SOURCE_LINEAGE_MISMATCH');
  }
  if (receipt?.to_state_id !== released.state_id) {
    throw new Error('PREMAQ_SHOKZ_RELEASE_LINEAGE_MISMATCH');
  }
}

export function buildPremaqShokzSoundfontPlan({
  state,
  rootHz = ROOT_HZ,
  bpm = DEFAULT_BPM,
  focus = 'Q',
  compressionStrength = 0.65,
  compressionGain = 1.2,
  releaseFraction = 0.35,
} = {}) {
  let current = validateTemporalState(state);
  const calibratedRoot = finiteNumber(rootHz, ROOT_HZ);
  if (calibratedRoot <= 0) throw new Error('PREMAQ_SHOKZ_ROOT_MUST_BE_POSITIVE');
  const cycleSeconds = 60 / clamp(finiteNumber(bpm, DEFAULT_BPM), 60, 120);
  const cycles = [];
  const voiceCycleCounts = Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, 0]));

  for (let cycleIndex = 0; cycleIndex < PREMAQ_SHOKZ_CYCLES_PER_AXIS; cycleIndex += 1) {
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
      const compressedProbability = finiteNumber(receipt.compression_probabilities?.[axis], 0);
      const releasedProbability = finiteNumber(receipt.release_probabilities?.[axis], 0);
      const compressionSourceHz = axisFrequency(
        calibratedRoot,
        axis,
        compressedProbability,
        'compression',
        cycleIndex,
      );
      const releaseSourceHz = axisFrequency(
        calibratedRoot,
        axis,
        releasedProbability,
        'release',
        cycleIndex,
      );
      const compressionPlaybackHz = foldToShokzBand(compressionSourceHz);
      const releasePlaybackHz = foldToShokzBand(releaseSourceHz);
      if (!compressionPlaybackHz || !releasePlaybackHz) {
        throw new Error(`PREMAQ_SHOKZ_NONFINITE_FREQUENCY_${axis}`);
      }
      voiceCycleCounts[axis] += 1;
      return Object.freeze({
        axis,
        axis_name: AXIS_NAMES[axis],
        axis_index: axisIndex,
        cycle: cycleIndex + 1,
        compressed_probability: compressedProbability,
        released_probability: releasedProbability,
        compression_source_hz: compressionSourceHz,
        release_source_hz: releaseSourceHz,
        compression_playback_hz: compressionPlaybackHz,
        release_playback_hz: releasePlaybackHz,
        waveform: AXIS_WAVES[axis],
        stereo_pan: -0.75 + (axisIndex / (PREMAQ_AXES.length - 1)) * 1.5,
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
    if (voiceCycleCounts[axis] !== PREMAQ_SHOKZ_CYCLES_PER_AXIS) {
      throw new Error(`PREMAQ_SHOKZ_AXIS_COUNT_MISMATCH_${axis}`);
    }
  }

  return Object.freeze({
    schema: 'bifrost.premaq-shokz-soundfont-plan/v0.4',
    formalism: 'temporal-compression-release-state-machine',
    physical_claim: false,
    device_profile: 'shokz-bone-conduction-audio-haptic-proxy',
    cycles_per_axis: PREMAQ_SHOKZ_CYCLES_PER_AXIS,
    axis_cycle_count: PREMAQ_SHOKZ_AXIS_CYCLES,
    scheduled_tone_events: PREMAQ_SHOKZ_TONE_EVENTS,
    axes: Object.freeze([...PREMAQ_AXES]),
    voice_cycle_counts: Object.freeze(voiceCycleCounts),
    playback_band_hz: Object.freeze([PREMAQ_SHOKZ_MIN_HZ, PREMAQ_SHOKZ_MAX_HZ]),
    root_hz: calibratedRoot,
    bpm: 60 / cycleSeconds,
    cycle_duration_seconds: cycleSeconds,
    duration_seconds: cycleSeconds * PREMAQ_SHOKZ_CYCLES_PER_AXIS,
    source_state_id: state.state_id,
    final_released_state_id: current.state_id,
    next_operation: 'compression-of-release',
    cycles: Object.freeze(cycles),
  });
}

function hashToken(token) {
  let hash = 2166136261;
  for (const character of String(token)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function axisForInteractionToken(token) {
  const normalised = String(token ?? '').trim().toUpperCase();
  if (PREMAQ_AXES.includes(normalised)) return normalised;
  return PREMAQ_AXES[hashToken(normalised || 'UNKNOWN') % PREMAQ_AXES.length];
}

function rebuildPlan() {
  const resolved = resolveSourceState();
  sourceState = clone(resolved.state);
  sourceMode = resolved.mode;
  activePlan = buildPremaqShokzSoundfontPlan({ state: sourceState });
  interactionCursorByAxis = Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, 0]));
  renderStatus(
    `READY · ${sourceMode} · 35 chained cycles per PREMAQ voice · 90–360 Hz Shokz proxy.`,
    'ready',
  );
  renderSource();
}

function dock() {
  return document.getElementById(DOCK_ID);
}

function confirmedOutput() {
  return Boolean(dock()?.querySelector('#premaq-shokz-confirm')?.checked);
}

function renderStatus(message, kind = 'resting') {
  const status = dock()?.querySelector('#premaq-shokz-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.kind = kind;
}

function renderSource() {
  const source = dock()?.querySelector('#premaq-shokz-source');
  if (source) source.textContent = sourceMode;
  const cycle = dock()?.querySelector('#premaq-shokz-cycle');
  if (cycle) cycle.textContent = `${PREMAQ_SHOKZ_CYCLES_PER_AXIS} × ${PREMAQ_AXES.length}`;
}

function makeDock() {
  const container = document.createElement('aside');
  container.id = DOCK_ID;
  container.dataset.shokzControl = 'true';
  container.setAttribute('aria-label', 'PREMAQ Shokz sound font');
  container.innerHTML = `
    <style>
      #${DOCK_ID} {
        position: fixed;
        z-index: 2147483000;
        right: max(0.65rem, env(safe-area-inset-right));
        bottom: max(0.65rem, env(safe-area-inset-bottom));
        width: min(27rem, calc(100vw - 1.3rem));
        border: 1px solid rgba(131, 239, 217, 0.42);
        border-radius: 1rem;
        background: rgba(4, 15, 23, 0.96);
        color: #eaf7f4;
        box-shadow: 0 1.4rem 5rem rgba(0,0,0,.42);
        font: 500 13px/1.4 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        backdrop-filter: blur(18px);
      }
      #${DOCK_ID} * { box-sizing: border-box; }
      #${DOCK_ID} details { padding: .7rem; }
      #${DOCK_ID} summary { cursor: pointer; font-weight: 800; letter-spacing: .04em; }
      #${DOCK_ID} .premaq-shokz-grid { display: grid; gap: .65rem; margin-top: .75rem; }
      #${DOCK_ID} .premaq-shokz-meta { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
      #${DOCK_ID} .premaq-shokz-meta span { padding: .5rem; border: 1px solid rgba(164,231,221,.16); border-radius: .65rem; color: #a9bfbd; }
      #${DOCK_ID} label { display: flex; gap: .55rem; align-items: flex-start; color: #d9ebe8; }
      #${DOCK_ID} input { margin-top: .15rem; width: 1.15rem; height: 1.15rem; accent-color: #83efd9; }
      #${DOCK_ID} .premaq-shokz-actions { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
      #${DOCK_ID} button { min-height: 2.75rem; border: 1px solid rgba(131,239,217,.34); border-radius: .75rem; background: rgba(40,115,111,.24); color: #eaf7f4; font: inherit; font-weight: 760; }
      #${DOCK_ID} button[data-stop] { border-color: rgba(255,138,147,.44); background: rgba(126,31,44,.23); }
      #${DOCK_ID} button:disabled { opacity: .48; }
      #${DOCK_ID} progress { width: 100%; accent-color: #83efd9; }
      #${DOCK_ID} #premaq-shokz-status { margin: 0; padding: .58rem; border-radius: .65rem; background: rgba(131,239,217,.06); color: #bfe8df; }
      #${DOCK_ID} #premaq-shokz-status[data-kind="blocked"] { background: rgba(255,138,147,.09); color: #ffc2c7; }
      #${DOCK_ID} small { color: #93aaa9; }
      @media (max-width: 540px) {
        #${DOCK_ID} { left: max(.5rem, env(safe-area-inset-left)); right: max(.5rem, env(safe-area-inset-right)); width: auto; }
        #${DOCK_ID} .premaq-shokz-actions { grid-template-columns: 1fr; }
      }
    </style>
    <details open>
      <summary>PREMAQ · Shokz sound font</summary>
      <div class="premaq-shokz-grid">
        <div class="premaq-shokz-meta">
          <span>Source<br><strong id="premaq-shokz-source">loading</strong></span>
          <span>Cycles<br><strong id="premaq-shokz-cycle">35 × 7</strong></span>
        </div>
        <label>
          <input id="premaq-shokz-confirm" type="checkbox" />
          <span>I confirm Shokz is selected as the iPad audio output. The browser cannot detect it.</span>
        </label>
        <div class="premaq-shokz-actions">
          <button id="premaq-shokz-enable" type="button">Enable keyboard + menus</button>
          <button id="premaq-shokz-run" type="button">Run 35-cycle PREMAQ</button>
          <button id="premaq-shokz-stop" data-stop type="button">Feather Stop</button>
          <button id="premaq-shokz-refresh" type="button">Refresh PREMAQ source</button>
        </div>
        <progress id="premaq-shokz-progress" max="1" value="0" aria-label="PREMAQ Shokz song progress"></progress>
        <p id="premaq-shokz-status" data-kind="resting" role="status">Loading the active PREMAQ source…</p>
        <small>No autoplay · master gain ceiling 0.018 · 90–360 Hz proxy · no internal iPad haptic claim.</small>
      </div>
    </details>
  `;
  document.body.append(container);
  return container;
}

async function ensureAudio() {
  if (!confirmedOutput()) {
    throw new Error('CONFIRM_SHOKZ_OUTPUT_FIRST');
  }
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) throw new Error('WEB_AUDIO_UNAVAILABLE');
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContextCtor();
    masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(PREMAQ_SHOKZ_MASTER_GAIN_CEILING, audioContext.currentTime);
    masterGain.connect(audioContext.destination);
  }
  await audioContext.resume();
  return audioContext;
}

function disposeNode(node) {
  activeNodes.delete(node);
  try { node.disconnect(); } catch { /* already disconnected */ }
}

function scheduleInteractionPair(voice) {
  const context = audioContext;
  if (!context || !masterGain) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = voice.waveform;
  const now = context.currentTime + 0.006;
  oscillator.frequency.setValueAtTime(voice.compression_playback_hz, now);
  oscillator.frequency.setValueAtTime(voice.release_playback_hz, now + 0.075);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.085);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.155);
  oscillator.connect(gain).connect(masterGain);
  activeNodes.add(oscillator);
  oscillator.addEventListener('ended', () => {
    disposeNode(oscillator);
    try { gain.disconnect(); } catch { /* already disconnected */ }
  });
  oscillator.start(now);
  oscillator.stop(now + 0.17);
}

function interactionTokenFromElement(element) {
  return element?.dataset?.soundfontKey
    ?? element?.dataset?.keyboardKey
    ?? element?.dataset?.key
    ?? element?.getAttribute?.('aria-label')
    ?? element?.textContent
    ?? element?.id
    ?? element?.tagName
    ?? 'menu';
}

async function playInteraction(token) {
  if (!enabled || fullSongPlaying || !activePlan) return;
  try {
    await ensureAudio();
    const axis = axisForInteractionToken(token);
    const cycleIndex = interactionCursorByAxis[axis] % PREMAQ_SHOKZ_CYCLES_PER_AXIS;
    interactionCursorByAxis[axis] += 1;
    const voice = activePlan.cycles[cycleIndex].voices.find((candidate) => candidate.axis === axis);
    scheduleInteractionPair(voice);
    renderStatus(
      `PLAYING · ${axis} ${AXIS_NAMES[axis]} · cycle ${cycleIndex + 1}/35 · ${voice.compression_playback_hz.toFixed(1)} → ${voice.release_playback_hz.toFixed(1)} Hz.`,
      'playing',
    );
  } catch (error) {
    renderStatus(`BLOCKED · ${error.message}`, 'blocked');
  }
}

function scheduleFullSong(plan) {
  const context = audioContext;
  const startAt = context.currentTime + 0.08;
  const voiceNodes = PREMAQ_AXES.map((axis) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const panner = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
    oscillator.type = AXIS_WAVES[axis];
    gain.gain.setValueAtTime(0.0001, startAt);
    oscillator.connect(gain);
    if (panner) {
      gain.connect(panner).connect(masterGain);
    } else {
      gain.connect(masterGain);
    }
    activeNodes.add(oscillator);
    oscillator.addEventListener('ended', () => {
      disposeNode(oscillator);
      try { gain.disconnect(); } catch { /* already disconnected */ }
      try { panner?.disconnect(); } catch { /* already disconnected */ }
    });
    return { axis, oscillator, gain, panner };
  });

  for (const cycle of plan.cycles) {
    const cycleStart = startAt + cycle.starts_at_seconds;
    const half = cycle.duration_seconds * 0.46;
    const releaseStart = cycleStart + half;
    const cycleEnd = cycleStart + cycle.duration_seconds * 0.94;
    for (const node of voiceNodes) {
      const voice = cycle.voices.find((candidate) => candidate.axis === node.axis);
      node.oscillator.frequency.setValueAtTime(voice.compression_playback_hz, cycleStart);
      node.oscillator.frequency.exponentialRampToValueAtTime(
        voice.release_playback_hz,
        releaseStart,
      );
      node.gain.gain.setValueAtTime(0.0001, cycleStart);
      node.gain.gain.exponentialRampToValueAtTime(0.12, cycleStart + 0.035);
      node.gain.gain.exponentialRampToValueAtTime(0.055, releaseStart - 0.02);
      node.gain.gain.exponentialRampToValueAtTime(0.11, releaseStart + 0.025);
      node.gain.gain.exponentialRampToValueAtTime(0.0001, cycleEnd);
      if (node.panner) node.panner.pan.setValueAtTime(voice.stereo_pan, cycleStart);
    }
  }

  const stopAt = startAt + plan.duration_seconds + 0.03;
  for (const node of voiceNodes) {
    node.oscillator.start(startAt);
    node.oscillator.stop(stopAt);
  }
  return { startAt, stopAt };
}

async function runFullSong() {
  if (!activePlan) rebuildPlan();
  try {
    await ensureAudio();
    stopTimers();
    fullSongPlaying = true;
    const { startAt, stopAt } = scheduleFullSong(activePlan);
    const progress = dock()?.querySelector('#premaq-shokz-progress');
    renderStatus(
      `PLAYING · ${PREMAQ_SHOKZ_TONE_EVENTS} tone events across 35 chained cycles · Feather Stop is immediate.`,
      'playing',
    );
    fullSongProgressTimer = window.setInterval(() => {
      if (!audioContext || !progress) return;
      progress.value = clamp((audioContext.currentTime - startAt) / activePlan.duration_seconds, 0, 1);
    }, 120);
    fullSongTimer = window.setTimeout(() => {
      fullSongPlaying = false;
      if (progress) progress.value = 1;
      stopTimers();
      renderStatus('COMPLETE · 35 chained cycles played for P C R E M A Q. Physical sensation remains NOT TESTED.', 'ready');
    }, Math.max(0, (stopAt - audioContext.currentTime) * 1000 + 80));
  } catch (error) {
    fullSongPlaying = false;
    renderStatus(`BLOCKED · ${error.message}`, 'blocked');
  }
}

function stopTimers() {
  if (fullSongTimer) window.clearTimeout(fullSongTimer);
  if (fullSongProgressTimer) window.clearInterval(fullSongProgressTimer);
  fullSongTimer = null;
  fullSongProgressTimer = null;
}

export function featherStop(message = 'FEATHER STOP · all scheduled PREMAQ Shokz sound has stopped.') {
  fullSongPlaying = false;
  stopTimers();
  for (const node of activeNodes) {
    try { node.stop(); } catch { /* already stopped */ }
    disposeNode(node);
  }
  activeNodes.clear();
  if (audioContext) {
    const closing = audioContext;
    audioContext = null;
    masterGain = null;
    closing.close().catch(() => {});
  }
  const progress = dock()?.querySelector('#premaq-shokz-progress');
  if (progress) progress.value = 0;
  renderStatus(message, 'ready');
}

function onPointerDown(event) {
  if (!enabled || fullSongPlaying) return;
  const target = event.target instanceof Element ? event.target.closest(INTERACTION_SELECTOR) : null;
  if (!target || target.closest(`#${DOCK_ID}`)) return;
  playInteraction(interactionTokenFromElement(target));
}

function onKeyDown(event) {
  if (!enabled || fullSongPlaying || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.target instanceof Element && event.target.closest(`#${DOCK_ID}`)) return;
  playInteraction(event.key);
}

function onChange(event) {
  if (!enabled || fullSongPlaying) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target || target.closest(`#${DOCK_ID}`)) return;
  if (target.matches('select,input[type="range"],input[type="checkbox"],input[type="radio"]')) {
    playInteraction(interactionTokenFromElement(target));
  }
}

function bindDockControls(container) {
  const confirm = container.querySelector('#premaq-shokz-confirm');
  const enableButton = container.querySelector('#premaq-shokz-enable');
  const runButton = container.querySelector('#premaq-shokz-run');
  const stopButton = container.querySelector('#premaq-shokz-stop');
  const refreshButton = container.querySelector('#premaq-shokz-refresh');

  confirm.addEventListener('change', () => {
    if (!confirm.checked) {
      enabled = false;
      featherStop('DISABLED · Shokz output confirmation was cleared.');
      enableButton.textContent = 'Enable keyboard + menus';
    } else {
      renderStatus('CONFIRMED · press Enable to start keyboard and menu cues.', 'ready');
    }
  });

  enableButton.addEventListener('click', async () => {
    if (!confirmedOutput()) {
      renderStatus('BLOCKED · confirm Shokz as the selected iPad audio output first.', 'blocked');
      return;
    }
    try {
      await ensureAudio();
      enabled = !enabled;
      enableButton.textContent = enabled ? 'Disable keyboard + menus' : 'Enable keyboard + menus';
      renderStatus(
        enabled
          ? 'ACTIVE · physical keyboard, virtual keys, links, buttons, selects, and semantic menu items now use the PREMAQ sound font.'
          : 'RESTING · keyboard and menu cues are disabled.',
        'ready',
      );
    } catch (error) {
      renderStatus(`BLOCKED · ${error.message}`, 'blocked');
    }
  });

  runButton.addEventListener('click', runFullSong);
  stopButton.addEventListener('click', () => featherStop());
  refreshButton.addEventListener('click', () => {
    featherStop('REFRESHING · rebuilding the 35-cycle plan from the current PREMAQ source.');
    rebuildPlan();
  });
}

export function installPremaqShokzSoundfont() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const container = makeDock();
  bindDockControls(container);
  rebuildPlan();

  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
  document.addEventListener('keydown', onKeyDown, { capture: true });
  document.addEventListener('change', onChange, { capture: true });
  window.addEventListener('pagehide', () => featherStop('FEATHER STOP · page hidden.'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) featherStop('FEATHER STOP · page hidden.');
  });

  subscribeToDualAspectActivation(() => {
    if (fullSongPlaying) return;
    rebuildPlan();
  }, { storage: sessionStorage, eventTarget: window, emitCurrent: false });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installPremaqShokzSoundfont, { once: true });
  } else {
    installPremaqShokzSoundfont();
  }
}
