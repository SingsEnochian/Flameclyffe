import * as THREE from 'three';
import { initializeValaStreamAdapter } from './vala-stream-adapter.js';
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

const BAR_COUNT = 16;
const TRAIL_LIMIT = 96;
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

const grid = new THREE.GridHelper(7, 14, 0x1b554b, 0x16262b);
grid.rotation.x = Math.PI / 2;
grid.position.z = -1.25;
scene.add(grid);

const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.16, 2),
  new THREE.MeshBasicMaterial({ color: 0x79f2d2 }),
);
scene.add(core);

const halo = new THREE.Mesh(
  new THREE.TorusGeometry(0.55, 0.018, 8, 96),
  new THREE.MeshBasicMaterial({ color: 0x5e8bff, transparent: true, opacity: 0.72 }),
);
scene.add(halo);

const trailGeometry = new THREE.BufferGeometry();
const trailMaterial = new THREE.LineBasicMaterial({ color: 0x79f2d2, transparent: true, opacity: 0.68 });
const trail = new THREE.Line(trailGeometry, trailMaterial);
scene.add(trail);

const trailPoints = [];
let renderedFrames = 0;
let target = new THREE.Vector3();
let current = new THREE.Vector3();

function resize() {
  const width = Math.max(1, mount.clientWidth);
  const height = Math.max(1, mount.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

new ResizeObserver(resize).observe(mount);
resize();

function displayStatus(next, label = next) {
  status.dataset.state = next;
  statusLabel.textContent = String(label).toUpperCase();
}

function renderSpectrometer(projected) {
  const levels = spectrometerLevels(projected, { count: BAR_COUNT });
  bars.forEach((bar, index) => {
    const level = levels[index];
    bar.style.height = `${level.height_percent}%`;
    bar.title = String(level.raw);
  });
}

function receiveFrame(frame, meta = {}) {
  renderedFrames += 1;
  const projection = projectSceneTarget(frame.projected_coordinates);
  const projectionReceipt = buildVisualProjectionReceipt(frame.projected_coordinates);

  stepCounter.textContent = String(frame.step).padStart(4, '0');
  frameCounter.textContent = String(frame.id);
  modeCounter.textContent = String(meta.source || 'unknown').toUpperCase();
  coordinateBox.textContent = JSON.stringify({
    frame: {
      id: frame.id,
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

function syntheticDivergenceFrame() {
  const now = new Date().toISOString();
  return Object.freeze({
    schema: 'arcsweep.vala-matrix-stream/v1',
    id: 1,
    step: 1,
    timestamp: Date.parse(now) / 1000,
    created_at: now,
    raw_coordinates: {
      provenance: 'SYNTHETIC_LABELED_TEST',
      persistence: 'local-simulation',
      vala_written: false,
      realtime_observed: false,
      canonical_operational: {
        adaptive_quality: 0.975,
        premaqc_bearing: {
          P: { status: 'estimated', delta_estimate: 0.08 },
          C: { status: 'estimated', delta_estimate: 0.09 },
          R: { status: 'estimated', delta_estimate: 0.1 },
          E: { status: 'unasserted' },
          M: { status: 'unasserted' },
          A: { status: 'unasserted' },
          Q: { status: 'context-only', report_present: false, inferred: false },
        },
      },
      runa_vector_model_a: {
        P: 0.9,
        R: 1,
        E: 0.75,
        M: 0,
        A: 0.545455,
        AQC: 83.9091,
      },
      runa_vector_model_b: {
        P: 0.75,
        R_normalized: 1,
        E: 5,
        M: 0,
        A: 0.6,
        AQC: 75.75,
      },
      replay_verification: 'not-yet-replayed',
      reconstruction_fidelity: null,
    },
    projected_coordinates: [0.9, 0.95, 1.0],
  });
}

let detach = null;
const simulationMode = new URLSearchParams(globalThis.location?.search || '').get('simulation') === '1';

if (simulationMode) {
  displayStatus('simulation', 'Local simulation');
  receiveFrame(syntheticDivergenceFrame(), { source: 'local-simulation' });
} else {
  try {
    detach = await initializeValaStreamAdapter({
      onFrame: receiveFrame,
      onStatus(next) {
        if (next === 'SUBSCRIBED') displayStatus('live', 'Realtime live');
        else if (next === 'CHANNEL_ERROR' || next === 'TIMED_OUT') displayStatus('error', next);
        else displayStatus('connecting', next);
      },
      onError(error) {
        displayStatus('error', 'Stream error');
        coordinateBox.textContent = `${coordinateBox.textContent}\n\n${error.message}`;
      },
    });
  } catch (error) {
    displayStatus('error', 'Adapter error');
    coordinateBox.textContent = error instanceof Error ? error.message : String(error);
  }
}

addEventListener('pagehide', () => {
  void detach?.();
}, { once: true });
