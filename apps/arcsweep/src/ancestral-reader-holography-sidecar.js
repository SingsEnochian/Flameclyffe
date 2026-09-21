import './ancestral-reader-holography.css';

import {
  DEFAULT_CODEX_ANIMATION_STATE,
  UNIVERSAL_CODEX_ANIMATION_KEY,
  ancestryEventToCodexPulse,
  normaliseCodexAnimationState,
} from './universal-codex-animation-model.js';

const ROOT_SELECTOR = '[data-universal-codex-surface="ancestry"]';
const STAGE_SELECTOR = '[data-universal-codex-stage]';

let controller = null;
let resizeObserver = null;

function reducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

function loadState() {
  try {
    const raw = globalThis.localStorage?.getItem(UNIVERSAL_CODEX_ANIMATION_KEY);
    return normaliseCodexAnimationState(raw ? JSON.parse(raw) : DEFAULT_CODEX_ANIMATION_STATE);
  } catch {
    return normaliseCodexAnimationState(DEFAULT_CODEX_ANIMATION_STATE);
  }
}

function fallbackController(canvas = null) {
  if (canvas) canvas.hidden = true;
  return Object.freeze({
    mode: 'fallback',
    pulse() {},
    applyState() {},
    resize() {},
    destroy() {},
  });
}

async function createRenderer(canvas) {
  if (!canvas || reducedMotion()) return fallbackController(canvas);

  try {
    const THREE = await import('three');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.set(0, 0.1, 7.2);

    const group = new THREE.Group();
    group.position.set(0.55, 0, 0);
    scene.add(group);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xd9b86b,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.62, 1.67, 96), ringMaterial);
    ring.rotation.x = -0.22;
    group.add(ring);

    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0x82e7cf,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const inner = new THREE.Mesh(new THREE.RingGeometry(1.18, 1.21, 72), innerMaterial);
    inner.rotation.x = -0.22;
    group.add(inner);

    const nodeGeometry = new THREE.OctahedronGeometry(0.16, 1);
    const nodeMaterials = [0xe7c87b, 0x8ce3d0, 0xaed6ff].map((colour) => new THREE.MeshBasicMaterial({
      color: colour,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      wireframe: true,
    }));
    const nodes = [-1.45, 0, 1.45].map((x, index) => {
      const node = new THREE.Mesh(nodeGeometry, nodeMaterials[index]);
      node.position.set(x, index === 1 ? 0.18 : -0.18, 0.34);
      group.add(node);
      return node;
    });

    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.45, -0.18, 0.34),
      new THREE.Vector3(0, 0.18, 0.34),
      new THREE.Vector3(1.45, -0.18, 0.34),
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xa8e7d6,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lineage = new THREE.Line(lineGeometry, lineMaterial);
    group.add(lineage);

    let state = loadState();
    let pulseStrength = 0;
    let raf = 0;
    const clock = new THREE.Clock();

    function applyState(next) {
      state = normaliseCodexAnimationState(next);
      group.visible = state.holograms;
      const intensity = state.intensity;
      ringMaterial.opacity = 0.22 + intensity * 0.42;
      innerMaterial.opacity = 0.18 + intensity * 0.38;
      lineMaterial.opacity = 0.2 + intensity * 0.42;
      nodeMaterials.forEach((material) => { material.opacity = 0.32 + intensity * 0.55; });
    }

    function pulse(pulseData = {}) {
      pulseStrength = Math.max(pulseStrength, Number(pulseData.strength || 0.6));
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function tick() {
      raf = requestAnimationFrame(tick);
      const delta = Math.min(0.05, clock.getDelta());
      const elapsed = clock.elapsedTime;
      pulseStrength = Math.max(0, pulseStrength - delta * 1.25);
      const pulseScale = 1 + pulseStrength * 0.09;
      group.scale.setScalar(pulseScale);
      group.position.y = Math.sin(elapsed * 0.72) * 0.05;
      if (state.orbit) {
        ring.rotation.z += delta * 0.16;
        inner.rotation.z -= delta * 0.24;
        nodes.forEach((node, index) => {
          node.rotation.x += delta * (0.18 + index * 0.04);
          node.rotation.y -= delta * (0.22 + index * 0.05);
        });
      }
      renderer.render(scene, camera);
    }

    applyState(state);
    resize();
    tick();

    return Object.freeze({
      mode: 'three',
      pulse,
      applyState,
      resize,
      destroy() {
        cancelAnimationFrame(raf);
        renderer.dispose();
        ring.geometry.dispose();
        ringMaterial.dispose();
        inner.geometry.dispose();
        innerMaterial.dispose();
        nodeGeometry.dispose();
        nodeMaterials.forEach((material) => material.dispose());
        lineGeometry.dispose();
        lineMaterial.dispose();
      },
    });
  } catch (error) {
    console.warn('[Universal Codex] ancestry holography unavailable; reader remains functional.', error);
    return fallbackController(canvas);
  }
}

async function mount() {
  if (controller) return controller;
  const root = document.querySelector(ROOT_SELECTOR);
  const stage = root?.querySelector(STAGE_SELECTOR);
  if (!root || !stage) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'universal-codex-fx ancestry-codex-fx';
  canvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(canvas);
  controller = await createRenderer(canvas);
  root.dataset.codexHolography = controller.mode;

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => controller?.resize?.());
    resizeObserver.observe(canvas);
  }
  return controller;
}

function pulseFromEvent(event) {
  controller?.pulse?.(ancestryEventToCodexPulse(event.detail || {}));
}

globalThis.addEventListener?.('arcsweep:ancestry-read', pulseFromEvent);
globalThis.addEventListener?.('arcsweep:ancestry-plan', pulseFromEvent);
globalThis.addEventListener?.('arcsweep:universal-codex-animation-state', (event) => controller?.applyState?.(event.detail || {}));

void mount();

globalThis.__ancestralReaderHolography = Object.freeze({
  schema: 'arcsweep.ancestral-reader-holography/v0.1',
  mount,
  mode: () => controller?.mode || 'unmounted',
});

globalThis.addEventListener?.('pagehide', () => {
  resizeObserver?.disconnect?.();
  controller?.destroy?.();
  controller = null;
}, { once: true });
