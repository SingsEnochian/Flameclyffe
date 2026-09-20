import * as THREE from 'three';
import { initializeValaStreamAdapter, numericCoordinates } from './vala-stream-adapter.js';

const mount = document.querySelector('#hearthgate-three');
const stepCounter = document.querySelector('#step-counter');
const frameCounter = document.querySelector('#frame-counter');
const coordinateBox = document.querySelector('#matrix-spine-display');
const status = document.querySelector('#stream-status');
const statusLabel = document.querySelector('#stream-status-label');
const spectrometer = document.querySelector('#spectrometer');
const provenance = document.querySelector('#stream-provenance');

const BAR_COUNT = 16;
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

function coordinateVector(projected) {
  const values = numericCoordinates(projected);
  if (!values.length) return new THREE.Vector3();
  return new THREE.Vector3(values[0] || 0, values[1] || 0, values[2] || 0);
}

function scaledVector(vector) {
  const magnitude = Math.max(1, vector.length());
  const scale = Math.min(2.6 / magnitude, 1);
  return vector.clone().multiplyScalar(scale);
}

function renderSpectrometer(projected) {
  const values = numericCoordinates(projected).slice(0, BAR_COUNT);
  const ceiling = Math.max(1e-9, ...values.map((value) => Math.abs(value)));
  bars.forEach((bar, index) => {
    const amplitude = Math.abs(values[index] || 0) / ceiling;
    bar.style.height = `${Math.max(4, Math.round(amplitude * 100))}%`;
    bar.title = values[index] == null ? '' : String(values[index]);
  });
}

function receiveFrame(frame, meta) {
  renderedFrames += 1;
  stepCounter.textContent = String(frame.step).padStart(4, '0');
  frameCounter.textContent = String(frame.id);
  coordinateBox.textContent = JSON.stringify(frame.projected_coordinates, null, 2);
  provenance.textContent = `source: Vala Work / matrix_stream / ${meta?.source || 'unknown'} / ${frame.created_at || frame.timestamp}`;
  renderSpectrometer(frame.projected_coordinates);

  target = scaledVector(coordinateVector(frame.projected_coordinates));
  trailPoints.push(target.clone());
  if (trailPoints.length > 96) trailPoints.shift();
  trailGeometry.setFromPoints(trailPoints);
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

let detach = null;

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

addEventListener('pagehide', () => {
  void detach?.();
}, { once: true });
