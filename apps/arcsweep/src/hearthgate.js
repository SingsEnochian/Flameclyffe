import * as THREE from 'three';
import { initializeValaStreamAdapter } from './vala-stream-adapter.js';
import {
  processEarthGateTelemetry,
  projectEarthGateReceipt,
  sha256Hex,
} from './earth-gate-telemetry.js';
import { computeAqcVector } from './earth-gate-aqc-vector.js';
import { computeBaseline65Aqc } from './earth-gate-aqc-baseline65.js';
import { buildRunaPremaqcEvidence } from './runa-premaqc-evidence.js';
import { buildValaMatrixInsert } from './vala-matrix-frame-contract.js';
import {
  buildVisualProjectionReceipt,
  projectSceneTarget,
  spectrometerLevels,
} from './hearthgate-visual-projection.js';

const mount = document.querySelector('#hearthgate-three');
const stepCounter = document.querySelector('#step-counter');
const frameCounter = document.querySelector('#frame-counter');
const trailCounter = document.querySelector('#trail-counter');
const modeCounter = document.querySelector('#mode-counter');
const coordinateBox = document.querySelector('#matrix-spine-display');
const status = document.querySelector('#stream-status');
const statusLabel = document.querySelector('#stream-status-label');
const spectrometer = document.querySelector('#spectrometer');
const provenance = document.querySelector('#stream-provenance');
const eventLog = document.querySelector('#event-log');
const pauseButton = document.querySelector('#pause-stream');
const stepButton = document.querySelector('#step-stream');
const digestShort = document.querySelector('#digest-short');
const digestCopy = document.querySelector('#digest-copy');

const BAR_COUNT = 16;
const TRAIL_LIMIT = 96;
const EVENT_LIMIT = 8;
const SIMULATION_INTERVAL_MS = 3000;

const bars = Array.from({ length: BAR_COUNT }, () => {
  const bar = document.createElement('div');
  bar.className = 'bar';
  spectrometer.append(bar);
  return bar;
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
camera.position.set(0, 0, 6.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
mount.append(renderer.domElement);

const grid = new THREE.GridHelper(7, 14, 0x3c3224, 0x15110c);
grid.rotation.x = Math.PI / 2;
grid.position.z = -1.25;
scene.add(grid);

const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.16, 2),
  new THREE.MeshBasicMaterial({ color: 0xf5f2eb }),
);
scene.add(core);

const halo = new THREE.Mesh(
  new THREE.TorusGeometry(0.55, 0.018, 8, 96),
  new THREE.MeshBasicMaterial({ color: 0xffb852, transparent: true, opacity: 0.72 }),
);
scene.add(halo);

const trailGeometry = new THREE.BufferGeometry();
const trailMaterial = new THREE.LineBasicMaterial({ color: 0xd9a05b, transparent: true, opacity: 0.74 });
const trail = new THREE.Line(trailGeometry, trailMaterial);
scene.add(trail);

const trailPoints = [];
const eventEntries = [];
const bufferedLiveFrames = [];
let target = new THREE.Vector3();
let current = new THREE.Vector3();
let paused = false;
let detach = null;
let simulationFrames = [];
let simulationIndex = 0;
let simulationTimer = null;
let currentDigest = null;

function resize() {
  const width = Math.max(1, mount.clientWidth);
  const height = Math.max(1, mount.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

new ResizeObserver(resize).observe(mount);
resize();

function appendEvent(kind, message) {
  const stamp = new Date().toISOString().slice(11, 19);
  eventEntries.push(`[${stamp}] [${String(kind).toUpperCase()}] ${message}`);
  if (eventEntries.length > EVENT_LIMIT) eventEntries.shift();
  eventLog.textContent = eventEntries.join('\n');
}

function displayStatus(next, label = next) {
  status.dataset.state = next;
  statusLabel.textContent = String(label).toUpperCase();
}

function shortDigest(value) {
  if (!value) return 'not-yet-hashed';
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}

async function digestForFrame(frame) {
  const supplied = frame?.raw_coordinates?.checkpoint_digest;
  if (typeof supplied === 'string' && supplied.length >= 16) return supplied;
  return sha256Hex({
    step: frame.step,
    timestamp: frame.timestamp,
    raw_coordinates: frame.raw_coordinates,
    projected_coordinates: frame.projected_coordinates,
  });
}

function renderSpectrometer(projected) {
  const levels = spectrometerLevels(projected, { count: BAR_COUNT });
  bars.forEach((bar, index) => {
    const level = levels[index];
    bar.style.height = `${level.height_percent}%`;
    bar.title = String(level.raw);
  });
}

async function receiveFrame(frame, meta = {}) {
  const projection = projectSceneTarget(frame.projected_coordinates);
  const projectionReceipt = buildVisualProjectionReceipt(frame.projected_coordinates);
  const digest = await digestForFrame(frame);
  currentDigest = digest;

  stepCounter.textContent = String(frame.step).padStart(4, '0');
  frameCounter.textContent = String(frame.id ?? frame.step);
  modeCounter.textContent = String(meta.source || 'unknown').toUpperCase();
  digestShort.textContent = shortDigest(digest);

  coordinateBox.textContent = JSON.stringify({
    frame: {
      id: frame.id ?? null,
      step: frame.step,
      projected_coordinates: frame.projected_coordinates,
      raw_coordinates: frame.raw_coordinates,
    },
    visual_projection: projectionReceipt,
  }, null, 2);

  provenance.textContent = meta.source === 'local-simulation'
    ? `source: LOCAL SIMULATION / synthetic-labelled / unposted / ${frame.created_at || frame.timestamp}`
    : `source: Vala Work / matrix_stream / ${meta.source || 'unknown'} / ${frame.created_at || frame.timestamp}`;

  renderSpectrometer(frame.projected_coordinates);

  target = new THREE.Vector3(...projection.target_coordinates);
  trailPoints.push(target.clone());
  if (trailPoints.length > TRAIL_LIMIT) trailPoints.shift();
  trailGeometry.setFromPoints(trailPoints);
  trailCounter.textContent = `${trailPoints.length}/${TRAIL_LIMIT}`;

  appendEvent(meta.source || 'frame', `step=${frame.step} digest=${shortDigest(digest)} target=${projection.target_coordinates.join(',')}`);
}

function animate() {
  current.lerp(target, 0.12);
  core.position.copy(current);
  halo.position.copy(current);
  halo.rotation.x += 0.004;
  halo.rotation.y += 0.006;
  core.rotation.x += 0.008;
  core.rotation.y += 0.01;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

const syntheticProfiles = Object.freeze([
  Object.freeze({ hrv_rmssd_ms: 90, heart_rate_bpm: 110, audio_frequency_hz: 432, haptic_cadence_bpm: 60, previous_haptic_cadence_bpm: 60, pre_rating: 3, post_rating: 5 }),
  Object.freeze({ hrv_rmssd_ms: 85, heart_rate_bpm: 106, audio_frequency_hz: 430, haptic_cadence_bpm: 62, previous_haptic_cadence_bpm: 60, pre_rating: 3, post_rating: 5 }),
  Object.freeze({ hrv_rmssd_ms: 78, heart_rate_bpm: 102, audio_frequency_hz: 426, haptic_cadence_bpm: 64, previous_haptic_cadence_bpm: 62, pre_rating: 3, post_rating: 5 }),
]);

async function buildSyntheticFrame(profile, index) {
  const observedAt = new Date(Date.parse('2026-09-20T07:30:00.000Z') + (index * 3000)).toISOString();
  const canonicalPayload = {
    hrv_rmssd_ms: profile.hrv_rmssd_ms,
    hrv_reference_ms: 100,
    audio_frequency_hz: profile.audio_frequency_hz,
    target_audio_frequency_hz: 432,
    haptic_cadence_bpm: profile.haptic_cadence_bpm,
    target_haptic_cadence_bpm: 60,
    previous_haptic_cadence_bpm: profile.previous_haptic_cadence_bpm,
    sample_interval_s: 2,
    user_rating: profile.post_rating,
    qualia_report_present: false,
    observed_at: observedAt,
  };

  const runaPayload = {
    ...canonicalPayload,
    heart_rate_bpm: profile.heart_rate_bpm,
    pre_rating: profile.pre_rating,
    post_rating: profile.post_rating,
  };

  const canonical = await processEarthGateTelemetry('RA-90', canonicalPayload, { observedAt });
  const runaA = computeAqcVector(runaPayload, { observedAt });
  const runaB = computeBaseline65Aqc({
    heart_rate_bpm: profile.heart_rate_bpm,
    hrv_rmssd_ms: profile.hrv_rmssd_ms,
    resonance: canonical.metrics.resonance_lock * 4,
    emotional_delta: profile.post_rating,
    modulation_velocity: runaA.diagnostics.modulation_velocity_hz_per_sec,
    observed_at: observedAt,
  }, { observedAt });
  const evidence = buildRunaPremaqcEvidence(runaA);
  const sourceReceipt = Object.freeze({
    provenance: 'SYNTHETIC_LABELED_TEST',
    canonical,
    runa_model_a: runaA,
    runa_model_b: runaB,
    runa_to_premaqc_evidence: evidence,
    replay_verification: 'not-yet-replayed',
    reconstruction_fidelity: null,
  });
  const checkpointDigest = await sha256Hex(sourceReceipt);
  const insert = buildValaMatrixInsert({
    step: index + 1,
    observedAt,
    projectedCoordinates: projectEarthGateReceipt(canonical),
    sourceReceipt,
    checkpointDigest,
    provenance: 'SYNTHETIC_LABELED_TEST',
    persistence: 'local-simulation',
    valaWritten: false,
    realtimeObserved: false,
  });

  return Object.freeze({
    schema: 'arcsweep.vala-matrix-stream/v1',
    id: index + 1,
    ...insert,
    created_at: observedAt,
  });
}

async function buildSyntheticFrames() {
  return Promise.all(syntheticProfiles.map(buildSyntheticFrame));
}

function advanceSimulation() {
  if (!simulationFrames.length) return;
  const frame = simulationFrames[simulationIndex];
  simulationIndex = (simulationIndex + 1) % simulationFrames.length;
  void receiveFrame(frame, { source: 'local-simulation' });
}

function bufferOrRenderLive(frame, meta) {
  if (!paused) {
    void receiveFrame(frame, meta);
    return;
  }
  bufferedLiveFrames.push({ frame, meta });
  if (bufferedLiveFrames.length > TRAIL_LIMIT) bufferedLiveFrames.shift();
  appendEvent('buffer', `paused; queued live frame step=${frame.step}`);
}

function setPaused(next) {
  paused = Boolean(next);
  pauseButton.textContent = paused ? 'Resume' : 'Pause';
  stepButton.disabled = !paused;
  appendEvent('control', paused ? 'stream paused' : 'stream resumed');

  if (!paused && bufferedLiveFrames.length) {
    const pending = bufferedLiveFrames.splice(0);
    pending.forEach(({ frame, meta }) => { void receiveFrame(frame, meta); });
  }
}

pauseButton.addEventListener('click', () => setPaused(!paused));
stepButton.addEventListener('click', () => {
  if (!paused) return;
  if (simulationMode) {
    advanceSimulation();
    return;
  }
  const next = bufferedLiveFrames.shift();
  if (next) void receiveFrame(next.frame, next.meta);
  else appendEvent('control', 'no buffered live frame available');
});

digestCopy.addEventListener('click', async () => {
  if (!currentDigest) return;
  try {
    await navigator.clipboard.writeText(currentDigest);
    appendEvent('receipt', 'full SHA-256 digest copied');
  } catch (error) {
    appendEvent('error', `digest copy failed: ${error instanceof Error ? error.message : String(error)}`);
  }
});

const simulationMode = new URLSearchParams(globalThis.location?.search || '').get('simulation') === '1';
appendEvent('boot', simulationMode ? 'local simulation mode requested' : 'live Vala mode requested');

if (simulationMode) {
  displayStatus('simulation', 'Local simulation');
  try {
    simulationFrames = await buildSyntheticFrames();
    appendEvent('simulation', `${simulationFrames.length} computed synthetic receipts ready; Vala write not attempted`);
    advanceSimulation();
    simulationTimer = setInterval(() => {
      if (!paused) advanceSimulation();
    }, SIMULATION_INTERVAL_MS);
  } catch (error) {
    displayStatus('error', 'Simulation error');
    appendEvent('error', error instanceof Error ? error.message : String(error));
  }
} else {
  try {
    detach = await initializeValaStreamAdapter({
      onFrame(frame, meta) {
        bufferOrRenderLive(frame, meta);
      },
      onStatus(next) {
        appendEvent('status', `Vala Realtime: ${next}`);
        if (next === 'SUBSCRIBED') displayStatus('live', 'Realtime live');
        else if (next === 'CHANNEL_ERROR' || next === 'TIMED_OUT') displayStatus('error', next);
        else displayStatus('connecting', next);
      },
      onError(error) {
        displayStatus('error', 'Stream error');
        appendEvent('error', error.message);
      },
    });
  } catch (error) {
    displayStatus('error', 'Adapter error');
    appendEvent('error', error instanceof Error ? error.message : String(error));
  }
}

addEventListener('pagehide', () => {
  if (simulationTimer) clearInterval(simulationTimer);
  void detach?.();
}, { once: true });
