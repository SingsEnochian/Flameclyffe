import './universal-codex-animation.css';

import {
  DEFAULT_CODEX_ANIMATION_STATE,
  UNIVERSAL_CODEX_ANIMATION_KEY,
  UNIVERSAL_CODEX_ANIMATION_SCHEMA,
  glyphSampleToInkSpark,
  normaliseCodexAnimationState,
  patchCodexAnimationState,
  receiptToCodexPulse,
} from './universal-codex-animation-model.js';

const BOOK_ID = 'arcsweep-magic-book';
const MAX_SPARKS = 144;

let state = loadState();
let rendererController = null;
let rootObserver = null;
let mountObserver = null;
let resizeObserver = null;
let mountedRoot = null;

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

function saveState() {
  try {
    globalThis.localStorage?.setItem(UNIVERSAL_CODEX_ANIMATION_KEY, JSON.stringify(state));
  } catch {}
}

function publishState(reason = 'ui') {
  saveState();
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:universal-codex-animation-state', {
    detail: Object.freeze({ ...state, reason }),
  }));
}

function button(label, key) {
  return `<button type="button" data-codex-fx-toggle="${key}" aria-pressed="${state[key] ? 'true' : 'false'}">${label}</button>`;
}

function dockMarkup() {
  return [
    '<section class="universal-codex-control-dock" data-universal-codex-control-dock aria-label="Universal Codex animation controls">',
      '<div class="universal-codex-control-title"><strong>Codex Projection</strong><small>animation lab v0.1</small></div>',
      '<div class="universal-codex-control-row">',
        button('Holograms', 'holograms'),
        button('Ink aura', 'inkAura'),
        button('Orbit', 'orbit'),
      '</div>',
      '<label class="universal-codex-intensity">',
        '<span>Light</span>',
        `<input type="range" min="0.15" max="1" step="0.01" value="${state.intensity}" data-codex-fx-intensity>`,
        `<output data-codex-fx-intensity-output>${Math.round(state.intensity * 100)}</output>`,
      '</label>',
    '</section>',
  ].join('');
}

function renderDock(root) {
  let dock = root.querySelector('[data-universal-codex-control-dock]');
  if (!dock) {
    root.insertAdjacentHTML('beforeend', dockMarkup());
    dock = root.querySelector('[data-universal-codex-control-dock]');
  }
  for (const key of ['holograms', 'inkAura', 'orbit']) {
    const control = dock?.querySelector(`[data-codex-fx-toggle="${key}"]`);
    if (control) control.setAttribute('aria-pressed', state[key] ? 'true' : 'false');
  }
  const range = dock?.querySelector('[data-codex-fx-intensity]');
  const output = dock?.querySelector('[data-codex-fx-intensity-output]');
  if (range) range.value = String(state.intensity);
  if (output) output.value = String(Math.round(state.intensity * 100));
}

function installDockEvents(root) {
  if (root.dataset.codexAnimationControls === 'true') return;
  root.dataset.codexAnimationControls = 'true';
  root.addEventListener('click', (event) => {
    const control = event.target.closest?.('[data-codex-fx-toggle]');
    if (!control) return;
    const key = control.dataset.codexFxToggle;
    if (!['holograms', 'inkAura', 'orbit'].includes(key)) return;
    state = patchCodexAnimationState(state, { [key]: !state[key] });
    renderDock(root);
    rendererController?.applyState?.(state);
    publishState(`toggle:${key}`);
  });
  root.addEventListener('input', (event) => {
    const range = event.target.closest?.('[data-codex-fx-intensity]');
    if (!range) return;
    state = patchCodexAnimationState(state, { intensity: Number(range.value) });
    const output = root.querySelector('[data-codex-fx-intensity-output]');
    if (output) output.value = String(Math.round(state.intensity * 100));
    rendererController?.applyState?.(state);
    publishState('intensity');
  });
}

async function createRenderer(canvas, root) {
  if (!canvas || reducedMotion()) {
    return {
      mode: 'fallback',
      applyState() {},
      addInkSpark() {},
      pulse() {},
      resize() {},
      destroy() {},
    };
  }

  try {
    const THREE = await import('three');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    camera.position.set(0, 0.2, 8.2);

    const projection = new THREE.Group();
    projection.position.set(0.8, 0.55, 0.2);
    scene.add(projection);

    const holoMaterial = (colour, opacity = 0.64) => new THREE.MeshBasicMaterial({
      color: colour,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const ringA = new THREE.Mesh(new THREE.RingGeometry(1.42, 1.48, 96), holoMaterial(0x85efd0, 0.6));
    const ringB = new THREE.Mesh(new THREE.RingGeometry(1.02, 1.055, 72), holoMaterial(0xe8c777, 0.52));
    const ringC = new THREE.Mesh(new THREE.RingGeometry(0.64, 0.67, 64), holoMaterial(0x9ed7ff, 0.48));
    ringA.rotation.x = -0.28;
    ringB.rotation.x = -0.28;
    ringC.rotation.x = -0.28;
    projection.add(ringA, ringB, ringC);

    const crown = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.38, 1),
      new THREE.MeshBasicMaterial({
        color: 0xcaf7e8,
        wireframe: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    crown.position.z = 0.52;
    projection.add(crown);

    const panelMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.42 },
        uScanlines: { value: 1 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uOpacity;
        uniform float uScanlines;
        void main() {
          float edge = smoothstep(0.0, .08, vUv.x) * smoothstep(0.0, .08, vUv.y)
            * smoothstep(0.0, .08, 1.0 - vUv.x) * smoothstep(0.0, .08, 1.0 - vUv.y);
          float scan = 0.72 + 0.28 * sin((vUv.y * 170.0) - uTime * 3.4);
          scan = mix(1.0, scan, uScanlines);
          float gridX = 1.0 - smoothstep(.0, .025, abs(fract(vUv.x * 6.0) - .5));
          float gridY = 1.0 - smoothstep(.0, .025, abs(fract(vUv.y * 9.0) - .5));
          float grid = max(gridX, gridY) * .12;
          vec3 colour = mix(vec3(.20, .78, .66), vec3(.96, .78, .35), vUv.y * .5 + grid);
          gl_FragColor = vec4(colour, (0.12 + grid) * edge * scan * uOpacity);
        }
      `,
    });

    const panelGeometry = new THREE.PlaneGeometry(1.8, 2.4);
    const panelLeft = new THREE.Mesh(panelGeometry, panelMaterial);
    panelLeft.position.set(-2.25, 0.25, 0.05);
    panelLeft.rotation.y = 0.28;
    const panelRight = new THREE.Mesh(panelGeometry, panelMaterial.clone());
    panelRight.position.set(2.25, 0.25, 0.05);
    panelRight.rotation.y = -0.28;
    projection.add(panelLeft, panelRight);

    const inkPositions = new Float32Array(MAX_SPARKS * 3);
    inkPositions.fill(999);
    const inkGeometry = new THREE.BufferGeometry();
    inkGeometry.setAttribute('position', new THREE.BufferAttribute(inkPositions, 3));
    const inkMaterial = new THREE.PointsMaterial({
      color: 0x9bf4d7,
      size: 0.065,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const inkPoints = new THREE.Points(inkGeometry, inkMaterial);
    projection.add(inkPoints);

    const sparks = Array.from({ length: MAX_SPARKS }, () => ({ life: 0, vx: 0, vy: 0, vz: 0 }));
    let sparkCursor = 0;
    let pulseStrength = 0;
    let currentState = state;
    let raf = 0;
    const clock = new THREE.Clock();

    function addInkSpark(spark) {
      if (!currentState.inkAura) return;
      const index = sparkCursor++ % MAX_SPARKS;
      const base = index * 3;
      inkPositions[base] = spark.x + 0.82;
      inkPositions[base + 1] = spark.y * 0.82 + 0.36;
      inkPositions[base + 2] = spark.z;
      const angle = (index * 2.3999632297) + spark.velocity * .0004;
      sparks[index] = {
        life: 0.65 + spark.energy * 0.75,
        vx: Math.cos(angle) * (0.025 + spark.energy * .045),
        vy: 0.018 + Math.sin(angle) * .018 + spark.pressure * .018,
        vz: 0.02 + spark.energy * .025,
      };
      inkGeometry.attributes.position.needsUpdate = true;
    }

    function pulse(data) {
      pulseStrength = Math.max(pulseStrength, Number(data?.strength || 0.6));
    }

    function applyState(next) {
      currentState = normaliseCodexAnimationState(next);
      projection.visible = currentState.holograms;
      inkPoints.visible = currentState.inkAura;
      const intensity = currentState.intensity;
      ringA.material.opacity = 0.28 + intensity * 0.44;
      ringB.material.opacity = 0.22 + intensity * 0.40;
      ringC.material.opacity = 0.18 + intensity * 0.35;
      crown.material.opacity = 0.28 + intensity * 0.52;
      panelMaterial.uniforms.uOpacity.value = intensity;
      panelMaterial.uniforms.uScanlines.value = currentState.scanlines ? 1 : 0;
      panelRight.material.uniforms.uOpacity.value = intensity;
      panelRight.material.uniforms.uScanlines.value = currentState.scanlines ? 1 : 0;
      inkMaterial.opacity = 0.34 + intensity * 0.58;
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      if (canvas.width !== width || canvas.height !== height) renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function tick() {
      raf = requestAnimationFrame(tick);
      if (root.hidden) return;
      const delta = Math.min(.05, clock.getDelta());
      const elapsed = clock.elapsedTime;
      panelMaterial.uniforms.uTime.value = elapsed;
      panelRight.material.uniforms.uTime.value = elapsed + 0.5;

      if (currentState.orbit) {
        ringA.rotation.z += delta * .24;
        ringB.rotation.z -= delta * .38;
        ringC.rotation.z += delta * .62;
        crown.rotation.x += delta * .22;
        crown.rotation.y -= delta * .34;
      }

      pulseStrength = Math.max(0, pulseStrength - delta * 1.45);
      const pulseScale = 1 + Math.sin(Math.PI * Math.min(1, pulseStrength)) * pulseStrength * .07;
      projection.scale.setScalar(pulseScale);
      projection.position.y = .55 + Math.sin(elapsed * .82) * .045;

      for (let index = 0; index < MAX_SPARKS; index += 1) {
        const spark = sparks[index];
        if (spark.life <= 0) continue;
        spark.life -= delta;
        const base = index * 3;
        inkPositions[base] += spark.vx;
        inkPositions[base + 1] += spark.vy;
        inkPositions[base + 2] += spark.vz;
        spark.vx *= .985;
        spark.vy *= .986;
        spark.vz *= .978;
        if (spark.life <= 0) {
          inkPositions[base] = 999;
          inkPositions[base + 1] = 999;
          inkPositions[base + 2] = 999;
        }
      }
      inkGeometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    }

    applyState(currentState);
    resize();
    tick();

    return {
      mode: 'three',
      applyState,
      addInkSpark,
      pulse,
      resize,
      destroy() {
        cancelAnimationFrame(raf);
        renderer.dispose();
        [ringA, ringB, ringC].forEach((mesh) => {
          mesh.geometry.dispose();
          mesh.material.dispose();
        });
        crown.geometry.dispose();
        crown.material.dispose();
        panelGeometry.dispose();
        panelMaterial.dispose();
        panelRight.material.dispose();
        inkGeometry.dispose();
        inkMaterial.dispose();
      },
    };
  } catch (error) {
    console.warn('[Universal Codex] holography lab unavailable; keeping the functional book.', error);
    return {
      mode: 'fallback',
      applyState() {},
      addInkSpark() {},
      pulse() {},
      resize() {},
      destroy() {},
    };
  }
}

async function mount(root) {
  if (!root || root.dataset.codexAnimationMounted === 'true') return;
  root.dataset.codexAnimationMounted = 'true';
  mountedRoot = root;
  const stage = root.querySelector('.magic-book-stage');
  if (!stage) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'universal-codex-fx';
  canvas.dataset.universalCodexFx = UNIVERSAL_CODEX_ANIMATION_SCHEMA;
  canvas.setAttribute('aria-hidden', 'true');
  stage.prepend(canvas);
  renderDock(root);
  installDockEvents(root);
  rendererController = await createRenderer(canvas, root);
  root.dataset.codexHolography = rendererController.mode;
  rendererController.applyState?.(state);
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => rendererController?.resize?.());
    resizeObserver.observe(canvas);
  }
  publishState('mount');
}

function findAndMount() {
  const root = document.getElementById(BOOK_ID);
  if (root) void mount(root);
}

globalThis.addEventListener?.('arcsweep:glyph-brush-sample', (event) => {
  if (!rendererController || !state.inkAura) return;
  rendererController.addInkSpark?.(glyphSampleToInkSpark(event.detail));
});

globalThis.addEventListener?.('arcsweep:magic-book-receipt', (event) => {
  rendererController?.pulse?.(receiptToCodexPulse(event.detail));
});

globalThis.addEventListener?.('arcsweep:magic-book-ready', findAndMount);

findAndMount();
if (!mountedRoot && typeof MutationObserver !== 'undefined') {
  mountObserver = new MutationObserver(findAndMount);
  mountObserver.observe(document.body, { childList: true, subtree: true });
}

rootObserver = typeof MutationObserver !== 'undefined' ? new MutationObserver(() => {
  if (mountedRoot && !document.body.contains(mountedRoot)) {
    rendererController?.destroy?.();
    rendererController = null;
    mountedRoot = null;
    findAndMount();
  }
}) : null;
rootObserver?.observe(document.body, { childList: true, subtree: true });

globalThis.__universalCodexAnimation = Object.freeze({
  schema: UNIVERSAL_CODEX_ANIMATION_SCHEMA,
  state: () => structuredClone(state),
  patch(patch) {
    state = patchCodexAnimationState(state, patch);
    rendererController?.applyState?.(state);
    if (mountedRoot) renderDock(mountedRoot);
    publishState('api');
    return structuredClone(state);
  },
  pulse(kind = 'manual') {
    rendererController?.pulse?.({ strength: 0.9, kind });
  },
});

globalThis.addEventListener?.('pagehide', () => {
  resizeObserver?.disconnect?.();
  mountObserver?.disconnect?.();
  rootObserver?.disconnect?.();
  rendererController?.destroy?.();
  rendererController = null;
}, { once: true });
