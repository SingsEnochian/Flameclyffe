import './resonance-room.css';

import {
  DEFAULT_RESONANCE_ROOM_STATE,
  RESONANCE_ROOM_RECEIPTS_KEY,
  RESONANCE_ROOM_STORAGE_KEY,
  createResonanceRoomReceipt,
  deriveResonanceRoomField,
  normaliseResonanceRoomState,
  patchResonanceRoomState,
} from './resonance-room-model.js';

const ROOT_SELECTOR = '[data-resonance-room]';
const MAX_RECEIPTS = 36;
const RECEIPT_EVENT = 'arcsweep:resonance-room-receipt';

let state = loadJson(RESONANCE_ROOM_STORAGE_KEY, DEFAULT_RESONANCE_ROOM_STATE);
state = normaliseResonanceRoomState(state);
let receipts = loadJson(RESONANCE_ROOM_RECEIPTS_KEY, []);
if (!Array.isArray(receipts)) receipts = [];

let mountedRoot = null;
let rendererController = null;
let mutationObserver = null;
let resizeObserver = null;
let lastCommittedState = state;
let pointerStartState = null;
let pulseBusy = false;

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function loadJson(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : clone(fallback);
  } catch {
    return clone(fallback);
  }
}

function saveJson(key, value) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function reducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

function ensureBusEvent() {
  const bus = globalThis.__arcsweepOS?.bus;
  if (!bus?.define) return;
  const names = typeof bus.eventNames === 'function' ? bus.eventNames() : [];
  if (names.includes(RECEIPT_EVENT)) return;
  bus.define(RECEIPT_EVENT, (payload) => (
    payload?.schema === 'arcsweep.resonance-room-receipt/v0.1'
    && Boolean(payload?.receipt_id)
  ));
}

function publishReceipt(receipt) {
  receipts = [...receipts, receipt].slice(-MAX_RECEIPTS);
  saveJson(RESONANCE_ROOM_RECEIPTS_KEY, receipts);
  ensureBusEvent();
  try {
    globalThis.__arcsweepOS?.bus?.publish?.(RECEIPT_EVENT, receipt, { source: 'resonance-room' });
  } catch {}
  globalThis.dispatchEvent?.(new CustomEvent(RECEIPT_EVENT, { detail: receipt }));
  renderReceipts();
  return receipt;
}

function commit(kind, before, after, note = null) {
  const receipt = createResonanceRoomReceipt({
    kind,
    before,
    after,
    source: 'human-ui',
    note,
  });
  lastCommittedState = normaliseResonanceRoomState(after);
  return publishReceipt(receipt);
}

function field() {
  return deriveResonanceRoomField(state);
}

function outputValue(key, value) {
  if (key === 'frequency_hz') return Math.round(value) + ' Hz';
  if (key === 'phase_radians') return Number(value).toFixed(2) + ' rad';
  if (key === 'mode_order') return 'n=' + Math.round(value);
  return Number(value).toFixed(2);
}

function renderReadout(nextField = field()) {
  const root = mountedRoot;
  if (!root) return;
  root.querySelectorAll('[data-resonance-output]').forEach((node) => {
    const key = node.dataset.resonanceOutput;
    if (key in nextField.state) node.textContent = outputValue(key, nextField.state[key]);
  });
  root.querySelectorAll('[data-resonance-key]').forEach((input) => {
    const key = input.dataset.resonanceKey;
    if (key in nextField.state && document.activeElement !== input) input.value = String(nextField.state[key]);
  });

  const summary = root.querySelector('[data-resonance-summary]');
  if (summary) {
    summary.textContent = 'Mode ' + nextField.state.mode_order
      + ' · ' + nextField.nodes.length + ' nodes'
      + ' · peak ' + nextField.peak_amplitude.toFixed(2)
      + ' · glass IOR ' + nextField.glass.ior.toFixed(2);
  }
  const mode = root.querySelector('[data-resonance-renderer]');
  if (mode) mode.textContent = rendererController?.mode === 'three' ? 'Live Three.js field' : 'DOM fallback';
  const trace = {
    source: Math.round(nextField.state.frequency_hz) + ' Hz simulated oscillator',
    medium: nextField.field.medium,
    geometry: 'bounded chamber · mode n=' + nextField.state.mode_order,
    transduction: 'field → glass geometry → visual / optional somatic cue',
    provenance: 'simulated ArcSweep resonance-room state',
  };
  for (const [key, value] of Object.entries(trace)) {
    const node = root.querySelector('[data-resonance-trace="' + key + '"]');
    if (node) node.textContent = value;
  }
}

function renderReceipts() {
  const list = mountedRoot?.querySelector('[data-resonance-receipts]');
  if (!list) return;
  const recent = receipts.slice(-6).reverse();
  if (!recent.length) {
    list.innerHTML = '<p class="muted">No field changes receipted yet.</p>';
    return;
  }
  list.replaceChildren(...recent.map((receipt) => {
    const item = document.createElement('article');
    item.className = 'resonance-room-receipt';
    const strong = document.createElement('strong');
    strong.textContent = receipt.kind;
    const small = document.createElement('small');
    small.textContent = new Date(receipt.created_at).toLocaleTimeString()
      + ' · ' + Math.round(receipt.after.frequency_hz) + ' Hz'
      + ' · n=' + receipt.after.mode_order;
    item.append(strong, small);
    return item;
  }));
}

function setStatus(message) {
  const node = mountedRoot?.querySelector('[data-resonance-status]');
  if (node) node.textContent = String(message || '');
}

function saveState(next) {
  state = normaliseResonanceRoomState(next);
  saveJson(RESONANCE_ROOM_STORAGE_KEY, state);
  const nextField = field();
  rendererController?.applyField?.(nextField);
  renderReadout(nextField);
  return nextField;
}

function fallbackController(canvas = null) {
  if (canvas) canvas.hidden = true;
  return Object.freeze({
    mode: 'fallback',
    applyField() {},
    pulse() {},
    resize() {},
    destroy() {},
  });
}

async function createRenderer(canvas) {
  if (!canvas) return fallbackController(canvas);
  try {
    const THREE = await import('three');
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050b0d);
    scene.fog = new THREE.FogExp2(0x050b0d, 0.055);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    camera.position.set(0, 1.05, 7.8);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xbceee6, 0x14100b, 1.4));
    const warm = new THREE.PointLight(0xf0c46f, 26, 16, 2);
    warm.position.set(-3.2, 2.6, 2.4);
    scene.add(warm);
    const cool = new THREE.PointLight(0x74d7ff, 34, 18, 2);
    cool.position.set(3.4, 1.4, -1.2);
    scene.add(cool);

    const chamber = new THREE.Group();
    scene.add(chamber);

    const floor = new THREE.GridHelper(10, 24, 0x587d73, 0x17342f);
    floor.position.y = -2.05;
    floor.material.transparent = true;
    floor.material.opacity = 0.28;
    chamber.add(floor);

    const archMaterial = new THREE.MeshBasicMaterial({
      color: 0x79c7bd,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      wireframe: true,
    });
    const arches = [-2.8, -1.4, 0, 1.4, 2.8].map((x) => {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.018, 8, 96, Math.PI), archMaterial);
      arch.position.set(x, -1.7, -1.6);
      arch.rotation.y = Math.PI / 2;
      chamber.add(arch);
      return arch;
    });

    const backRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x56d6e5,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const backRings = [0.86, 1.34, 1.82].map((radius, index) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.026 + index * 0.006, 8, 96), backRingMaterial.clone());
      ring.position.set(0, 0.1, -1.15 - index * 0.08);
      ring.rotation.x = 0.18 + index * 0.12;
      chamber.add(ring);
      return ring;
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xa7fff4,
      roughness: 0.12,
      metalness: 0.02,
      transmission: 0.9,
      thickness: 1.1,
      ior: 1.4,
      transparent: true,
      opacity: 0.94,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      attenuationColor: new THREE.Color(0x3bb5aa),
      attenuationDistance: 2.6,
    });
    if ('dispersion' in glassMaterial) glassMaterial.dispersion = 0.06;

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.02, 5), glassMaterial);
    core.position.set(0, 0.05, 0.22);
    chamber.add(core);

    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0xf0c46f,
      transparent: true,
      opacity: 0.56,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      wireframe: true,
    });
    const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 2), innerMaterial);
    inner.position.copy(core.position);
    chamber.add(inner);

    const sourceMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sourceOrb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), sourceMaterial);
    sourceOrb.position.set(0, 0.12, 1.55);
    chamber.add(sourceOrb);

    const waveGeometry = new THREE.BufferGeometry();
    const waveMaterial = new THREE.LineBasicMaterial({
      color: 0x8ceee0,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const waveLine = new THREE.Line(waveGeometry, waveMaterial);
    waveLine.position.z = 1.25;
    chamber.add(waveLine);

    const nodeGeometry = new THREE.SphereGeometry(0.055, 18, 12);
    const nodeMaterial = new THREE.MeshBasicMaterial({
      color: 0xd8b56a,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nodeMeshes = Array.from({ length: 10 }, () => {
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
      chamber.add(node);
      return node;
    });

    const antinodeGeometry = new THREE.TorusGeometry(0.13, 0.018, 8, 32);
    const antinodeMaterial = new THREE.MeshBasicMaterial({
      color: 0x88d8ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const antinodeMeshes = Array.from({ length: 9 }, () => {
      const node = new THREE.Mesh(antinodeGeometry, antinodeMaterial.clone());
      node.rotation.x = Math.PI / 2;
      chamber.add(node);
      return node;
    });

    let activeField = field();
    let raf = 0;
    let visualPulse = 0;
    const clock = new THREE.Clock();
    const motionAllowed = !reducedMotion();

    function applyField(nextField) {
      activeField = nextField;
      const { state: nextState, glass } = nextField;
      glassMaterial.thickness = glass.thickness;
      glassMaterial.ior = glass.ior;
      glassMaterial.roughness = glass.roughness;
      glassMaterial.transmission = glass.transmission;
      if ('dispersion' in glassMaterial) glassMaterial.dispersion = glass.dispersion;
      glassMaterial.needsUpdate = true;

      const scale = 0.9 + nextState.amplitude * 0.24 + nextState.coupling * 0.1;
      core.scale.set(scale * (1 + nextState.coupling * 0.08), scale, scale * (1 - nextState.damping * 0.05));
      inner.scale.setScalar(0.88 + nextState.amplitude * 0.32);
      innerMaterial.opacity = 0.24 + nextField.glass.glow * 0.5;

      sourceOrb.position.set(nextState.source_x * 2.8, nextState.source_y * 2.0, 1.55);
      sourceOrb.scale.setScalar(0.72 + nextState.amplitude * 0.72);

      const points = nextField.wave.map((sample) => new THREE.Vector3(sample.x * 3.25, sample.y * 1.45 - 0.05, 0));
      waveGeometry.setFromPoints(points);

      nodeMeshes.forEach((mesh, index) => {
        const datum = nextField.nodes[index];
        mesh.visible = Boolean(datum);
        if (datum) {
          mesh.position.set(datum.x * 3.25, -0.05, 1.25);
          mesh.scale.setScalar(0.72 + nextState.coupling * 0.65);
        }
      });
      antinodeMeshes.forEach((mesh, index) => {
        const datum = nextField.antinodes[index];
        mesh.visible = Boolean(datum);
        if (datum) {
          mesh.position.set(datum.x * 3.25, 0.02, 1.22);
          mesh.scale.setScalar(0.68 + datum.magnitude * 0.72);
        }
      });

      backRings.forEach((ring, index) => {
        ring.material.opacity = 0.16 + nextState.coupling * 0.22 + nextState.amplitude * 0.12;
        ring.scale.setScalar(0.9 + nextState.amplitude * 0.08 + index * 0.025);
      });
      renderer.render(scene, camera);
    }

    function pulse(strength = 1) {
      visualPulse = Math.max(visualPulse, Number(strength) || 1);
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    }

    function tick() {
      raf = requestAnimationFrame(tick);
      const delta = Math.min(0.05, clock.getDelta());
      const elapsed = clock.elapsedTime;
      visualPulse = Math.max(0, visualPulse - delta * 1.7);

      if (motionAllowed) {
        const speed = 0.12 + activeField.state.frequency_hz / 4200;
        core.rotation.y += delta * speed;
        core.rotation.x = Math.sin(elapsed * 0.19) * 0.12 + activeField.state.source_y * 0.12;
        inner.rotation.x -= delta * speed * 1.35;
        inner.rotation.z += delta * speed * 0.8;
        backRings.forEach((ring, index) => {
          ring.rotation.z += delta * speed * (index % 2 ? -0.8 : 0.62);
          ring.position.x = Math.sin(elapsed * (0.16 + index * 0.025) + activeField.state.phase_radians) * 0.12;
        });
        arches.forEach((arch, index) => {
          arch.material.opacity = 0.08 + activeField.state.coupling * 0.1 + Math.sin(elapsed * 0.38 + index) * 0.018;
        });
      }

      const pulseScale = 1 + visualPulse * 0.16;
      core.scale.multiplyScalar(pulseScale);
      renderer.render(scene, camera);
      core.scale.multiplyScalar(1 / pulseScale);
    }

    applyField(activeField);
    resize();
    if (motionAllowed) tick(); else renderer.render(scene, camera);

    return Object.freeze({
      mode: 'three',
      applyField,
      pulse,
      resize,
      destroy() {
        cancelAnimationFrame(raf);
        renderer.dispose();
        floor.geometry.dispose();
        floor.material.dispose();
        arches.forEach((mesh) => mesh.geometry.dispose());
        archMaterial.dispose();
        backRings.forEach((mesh) => { mesh.geometry.dispose(); mesh.material.dispose(); });
        core.geometry.dispose();
        glassMaterial.dispose();
        inner.geometry.dispose();
        innerMaterial.dispose();
        sourceOrb.geometry.dispose();
        sourceMaterial.dispose();
        waveGeometry.dispose();
        waveMaterial.dispose();
        nodeGeometry.dispose();
        nodeMeshes.forEach((mesh) => mesh.material.dispose());
        antinodeGeometry.dispose();
        antinodeMeshes.forEach((mesh) => mesh.material.dispose());
      },
    });
  } catch (error) {
    console.warn('[ArcSweep] resonance chamber WebGL unavailable; preserving functional controls.', error);
    return fallbackController(canvas);
  }
}

function statePatchFromInput(input) {
  const key = input.dataset.resonanceKey;
  if (!key) return null;
  return { [key]: Number(input.value) };
}

function installControls(root) {
  root.querySelectorAll('[data-resonance-key]').forEach((input) => {
    input.addEventListener('input', () => {
      const patch = statePatchFromInput(input);
      if (!patch) return;
      saveState(patchResonanceRoomState(state, patch));
    });
    input.addEventListener('change', () => {
      const before = lastCommittedState;
      const patch = statePatchFromInput(input);
      if (!patch) return;
      const after = patchResonanceRoomState(state, patch);
      saveState(after);
      commit('field-tune', before, after, input.dataset.resonanceKey);
      setStatus('Field change receipted.');
    });
  });

  root.querySelector('[data-resonance-reset]')?.addEventListener('click', () => {
    const before = state;
    const after = normaliseResonanceRoomState(DEFAULT_RESONANCE_ROOM_STATE);
    saveState(after);
    commit('field-reset', before, after, 'Returned to the default resonance chamber state.');
    setStatus('Resonance chamber reset and receipted.');
  });

  root.querySelector('[data-resonance-calibrate]')?.addEventListener('click', async () => {
    const somatic = globalThis.__arcsweepSomatic;
    if (!somatic?.openCalibration) {
      setStatus('Somatic calibration is not available in this runtime.');
      return;
    }
    await somatic.openCalibration();
    setStatus('Sensory calibration opened.');
  });

  root.querySelector('[data-resonance-pulse]')?.addEventListener('click', async () => {
    if (pulseBusy) return;
    pulseBusy = true;
    const button = root.querySelector('[data-resonance-pulse]');
    if (button) button.disabled = true;
    const currentField = field();
    rendererController?.pulse?.(1);
    setStatus('Pulse travelling through the chamber…');
    let result = null;
    try {
      const somatic = globalThis.__arcsweepSomatic;
      result = somatic?.emit
        ? await somatic.emit('threshold', {
            modulation: currentField.somatic,
            context: { trigger: 'resonance-chamber', phase: 'pulse' },
          })
        : { status: 'unavailable', output: null };
      const output = result?.output || result;
      commit(
        'somatic-pulse',
        state,
        state,
        output?.schema === 'arcsweep.somatic-receipt/v1'
          ? 'Visual field and semantic somatic transducer completed together.'
          : 'Visual pulse completed; somatic output was unavailable or suppressed.'
      );
      setStatus(output?.schema === 'arcsweep.somatic-receipt/v1'
        ? 'Pulse completed. Visual, audio/haptic transduction receipted.'
        : 'Visual pulse completed. Enable the somatic profile to hear/feel it.');
    } catch (error) {
      setStatus('Pulse visualised; somatic transduction stopped: ' + (error?.message || String(error)));
    } finally {
      pulseBusy = false;
      if (button) button.disabled = false;
    }
  });

  const canvas = root.querySelector('[data-resonance-canvas]');
  if (canvas) {
    canvas.addEventListener('pointerdown', (event) => {
      pointerStartState = state;
      canvas.setPointerCapture?.(event.pointerId);
      updateSourceFromPointer(canvas, event);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!pointerStartState || !canvas.hasPointerCapture?.(event.pointerId)) return;
      updateSourceFromPointer(canvas, event);
    });
    const finish = (event) => {
      if (!pointerStartState) return;
      updateSourceFromPointer(canvas, event);
      if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      const before = pointerStartState;
      pointerStartState = null;
      commit('source-move', before, state, 'Source locus moved through the simulated chamber.');
      setStatus('Source locus moved and receipted.');
    };
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', () => { pointerStartState = null; });
  }
}

function updateSourceFromPointer(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  saveState(patchResonanceRoomState(state, {
    source_x: x,
    source_y: y * 0.7,
  }));
}

async function mount(root = document.querySelector(ROOT_SELECTOR)) {
  if (!root) return null;
  if (mountedRoot === root && rendererController) return rendererController;

  resizeObserver?.disconnect?.();
  rendererController?.destroy?.();
  mountedRoot = root;
  const canvas = root.querySelector('[data-resonance-canvas]');
  rendererController = await createRenderer(canvas);
  root.dataset.resonanceRenderer = rendererController.mode;

  installControls(root);
  renderReadout();
  renderReceipts();
  rendererController.applyField(field());

  if (typeof ResizeObserver !== 'undefined' && canvas) {
    resizeObserver = new ResizeObserver(() => rendererController?.resize?.());
    resizeObserver.observe(canvas);
  }

  globalThis.__arcsweepOS?.health?.set?.({
    service_id: 'resonance-chamber',
    status: 'healthy',
    version: '0.1',
    last_success_at: new Date().toISOString(),
    dependencies: ['arcsweep-os-kernel', 'somatic-interface', 'three'],
    recoverable: true,
  });

  return rendererController;
}

function scheduleMount() {
  const root = document.querySelector(ROOT_SELECTOR);
  if (!root) {
    if (mountedRoot) {
      resizeObserver?.disconnect?.();
      rendererController?.destroy?.();
      rendererController = null;
      mountedRoot = null;
    }
    return;
  }
  if (root !== mountedRoot) void mount(root);
}

if (typeof document !== 'undefined') {
  mutationObserver = new MutationObserver(scheduleMount);
  mutationObserver.observe(document.body, { childList: true, subtree: true });
  scheduleMount();
}

globalThis.__arcsweepResonanceRoom = Object.freeze({
  schema: 'arcsweep.resonance-room-runtime/v0.1',
  state: () => clone(state),
  field: () => clone(field()),
  receipts: () => receipts.map(clone),
  setState(patch = {}, { receipt = true } = {}) {
    const before = state;
    const after = patchResonanceRoomState(state, patch);
    saveState(after);
    if (receipt) commit('api-tune', before, after, 'Resonance state updated through local runtime API.');
    return clone(after);
  },
  pulse: async () => {
    rendererController?.pulse?.(1);
    return globalThis.__arcsweepSomatic?.emit?.('threshold', {
      modulation: field().somatic,
      context: { trigger: 'resonance-chamber-api', phase: 'pulse' },
    }) || null;
  },
  reset() {
    const before = state;
    saveState(DEFAULT_RESONANCE_ROOM_STATE);
    return publishReceipt(createResonanceRoomReceipt({ kind: 'api-reset', before, after: state, source: 'local-api' }));
  },
  mount,
});

globalThis.addEventListener?.('pagehide', () => {
  mutationObserver?.disconnect?.();
  resizeObserver?.disconnect?.();
  rendererController?.destroy?.();
  rendererController = null;
  mountedRoot = null;
}, { once: true });
