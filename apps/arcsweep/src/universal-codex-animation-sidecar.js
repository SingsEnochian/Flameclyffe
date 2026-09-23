import './universal-codex-animation.css';

import {
  DEFAULT_CODEX_ANIMATION_STATE,
  UNIVERSAL_CODEX_ANIMATION_KEY,
  UNIVERSAL_CODEX_ANIMATION_SCHEMA,
  glyphSampleToInkSpark,
  normaliseCodexAnimationState,
  normalisePageSide,
  patchCodexAnimationState,
  receiptToCodexPulse,
} from './universal-codex-animation-model.js';
import {
  CODEX_MOTION_TIERS,
  latentRevealStrength,
  resolveCodexMotionTier,
} from './universal-codex-reference-patterns.js';

const BOOK_ID = 'arcsweep-magic-book';
const MAX_SPARKS_PER_PAGE = 72;
const PAGE_SELECTORS = Object.freeze({ left: '.magic-book-left', right: '.magic-book-right' });

let state = loadState();
let rendererController = null;
let rootObserver = null;
let mountObserver = null;
let resizeObserver = null;
let mountedRoot = null;
let pointerCleanup = null;

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

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
    '<section class="universal-codex-control-dock" data-universal-codex-control-dock aria-label="Universal Codex material animation controls">',
      '<div class="universal-codex-control-title"><strong>Codex Presence</strong><small>physical renderer v0.1</small></div>',
      '<div class="universal-codex-control-row">',
        button('Page light', 'pageLight'),
        button('Latent ink', 'latentInk'),
        button('Depth', 'depthMotion'),
      '</div>',
      '<label class="universal-codex-intensity">',
        '<span>Presence</span>',
        `<input type="range" min="0.02" max="1" step="0.01" value="${state.intensity}" data-codex-fx-intensity>`,
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
  for (const key of ['pageLight', 'latentInk', 'depthMotion']) {
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
    if (!['pageLight', 'latentInk', 'depthMotion'].includes(key)) return;
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

function fallbackRenderer() {
  return {
    mode: 'fallback',
    applyState() {},
    addInkSpark() {},
    pulse() {},
    setPointer() {},
    resize() {},
    destroy() {},
  };
}

async function createRenderer(canvas, root) {
  if (!canvas || reducedMotion()) return fallbackRenderer();

  try {
    const THREE = await import('three');
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
      premultipliedAlpha: true,
    });
    renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = false;

    const pageElements = {
      left: root.querySelector(PAGE_SELECTORS.left),
      right: root.querySelector(PAGE_SELECTORS.right),
    };

    function createPageRig(side, seed) {
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-2.05, 2.05, 2.5, -2.5, 0.1, 12);
      camera.position.set(0, 0, 5);

      const ambient = new THREE.AmbientLight(0xffe6ba, 0.12);
      const pageLight = new THREE.PointLight(0xe6b662, 0.0, 9, 2.2);
      pageLight.position.set(side === 'left' ? -0.7 : 0.7, 0.6, 2.6);
      scene.add(ambient, pageLight);

      const materialPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(4.1, 5.0, 18, 22),
        new THREE.MeshPhysicalMaterial({
          color: 0xc49a5f,
          roughness: 0.92,
          metalness: 0.015,
          clearcoat: 0.04,
          clearcoatRoughness: 0.82,
          transparent: true,
          opacity: 0.018,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      materialPlane.position.z = -0.03;
      scene.add(materialPlane);

      const latentMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
        uniforms: {
          uTime: { value: 0 },
          uReveal: { value: 0.035 },
          uEnergy: { value: CODEX_MOTION_TIERS.idle },
          uSeed: { value: seed },
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
          uniform float uReveal;
          uniform float uEnergy;
          uniform float uSeed;

          float stroke(float value, float width) {
            return 1.0 - smoothstep(width, width + 0.045, abs(sin(value)));
          }

          void main() {
            vec2 p = vUv * vec2(6.28318, 7.2);
            float drift = sin(p.y * 0.73 + uSeed) * 0.42 + sin(p.y * 1.91 - uSeed) * 0.18;
            float a = stroke(p.x * 1.13 + drift + sin(p.y * 0.31) * 0.4, 0.075);
            float b = stroke((p.x + p.y * 0.44) * 1.47 + uSeed * 1.7, 0.055);
            float c = stroke((p.x - p.y * 0.29) * 2.03 - uSeed, 0.038);
            float constellation = smoothstep(0.965, 1.0, sin(p.x * 4.7 + uSeed) * sin(p.y * 3.9 - uSeed));
            float edge = smoothstep(0.02, 0.12, vUv.x)
              * smoothstep(0.02, 0.12, vUv.y)
              * smoothstep(0.02, 0.12, 1.0 - vUv.x)
              * smoothstep(0.02, 0.12, 1.0 - vUv.y);
            float marks = clamp(a * 0.46 + b * 0.26 + c * 0.13 + constellation * 0.22, 0.0, 1.0) * edge;
            float breath = 0.94 + 0.06 * sin(uTime * 0.41 + uSeed);
            vec3 dryInk = vec3(0.24, 0.13, 0.055);
            vec3 gilt = vec3(0.91, 0.66, 0.27);
            vec3 colour = mix(dryInk, gilt, clamp(uEnergy * 1.25, 0.0, 1.0));
            float alpha = marks * uReveal * (0.13 + uEnergy * 0.24) * breath;
            gl_FragColor = vec4(colour, alpha);
          }
        `,
      });
      const latentPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.04, 4.94), latentMaterial);
      latentPlane.position.z = 0.02;
      scene.add(latentPlane);

      const inkPositions = new Float32Array(MAX_SPARKS_PER_PAGE * 3);
      inkPositions.fill(999);
      const inkGeometry = new THREE.BufferGeometry();
      inkGeometry.setAttribute('position', new THREE.BufferAttribute(inkPositions, 3));
      const inkMaterial = new THREE.PointsMaterial({
        color: 0xd8aa55,
        size: 0.038,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.54,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const inkPoints = new THREE.Points(inkGeometry, inkMaterial);
      scene.add(inkPoints);

      const sparks = Array.from({ length: MAX_SPARKS_PER_PAGE }, () => ({ life: 0, vx: 0, vy: 0, vz: 0 }));
      let sparkCursor = 0;
      let eventEnergy = CODEX_MOTION_TIERS.idle;
      let eventLife = 0;
      let pointerReveal = 0;
      let pointerX = 0;
      let pointerY = 0;

      function addInkSpark(spark) {
        if (!state.inkAura) return;
        const index = sparkCursor++ % MAX_SPARKS_PER_PAGE;
        const base = index * 3;
        inkPositions[base] = spark.x;
        inkPositions[base + 1] = spark.y;
        inkPositions[base + 2] = spark.z;
        const angle = (index * 2.3999632297) + spark.velocity * 0.0004;
        sparks[index] = {
          life: 0.42 + spark.energy * 0.72,
          vx: Math.cos(angle) * (0.005 + spark.energy * 0.018),
          vy: 0.006 + Math.sin(angle) * 0.009 + spark.pressure * 0.008,
          vz: 0.003 + spark.energy * 0.008,
        };
        inkGeometry.attributes.position.needsUpdate = true;
        eventEnergy = Math.max(eventEnergy, CODEX_MOTION_TIERS.interaction * spark.energy);
        eventLife = Math.max(eventLife, 0.55);
      }

      function pulse(data = {}) {
        const motion = resolveCodexMotionTier({
          kind: data.kind || data.family || 'event',
          revelation: data.revelation === true,
        });
        const strength = clamp01(data.strength == null ? 0.7 : data.strength);
        eventEnergy = Math.max(eventEnergy, motion.intensity * (0.55 + strength * 0.45));
        eventLife = Math.max(eventLife, 0.65 + motion.intensity * 1.45);
      }

      function setPointer(input = {}) {
        pointerReveal = clamp01(input.reveal);
        pointerX = Math.max(-1, Math.min(1, Number(input.x) || 0));
        pointerY = Math.max(-1, Math.min(1, Number(input.y) || 0));
      }

      function resize(aspect) {
        const width = 4.1;
        const height = width / Math.max(0.4, aspect || 0.78);
        camera.left = -width / 2;
        camera.right = width / 2;
        camera.top = height / 2;
        camera.bottom = -height / 2;
        camera.updateProjectionMatrix();
      }

      function tick(delta, elapsed, currentState) {
        eventLife = Math.max(0, eventLife - delta);
        if (eventLife <= 0) eventEnergy += (CODEX_MOTION_TIERS.idle - eventEnergy) * Math.min(1, delta * 2.6);
        else eventEnergy = Math.max(CODEX_MOTION_TIERS.idle, eventEnergy - delta * 0.08);

        pointerReveal += (0 - pointerReveal) * Math.min(1, delta * 0.16);
        const presenceScale = 0.45 + currentState.intensity * 0.75;
        const energy = Math.min(1, Math.max(CODEX_MOTION_TIERS.idle, eventEnergy, pointerReveal * 0.34)) * presenceScale;
        const reveal = currentState.latentInk ? Math.max(0.025, pointerReveal, energy * 0.27) : 0;

        latentMaterial.uniforms.uTime.value = elapsed;
        latentMaterial.uniforms.uReveal.value = reveal;
        latentMaterial.uniforms.uEnergy.value = energy;
        latentPlane.visible = currentState.latentInk;

        pageLight.intensity = currentState.pageLight ? 0.035 + energy * 0.62 : 0;
        pageLight.position.x = (side === 'left' ? -0.7 : 0.7) + pointerX * 0.6;
        pageLight.position.y = 0.5 - pointerY * 0.45;
        materialPlane.material.opacity = currentState.pageLight ? 0.009 + energy * 0.045 : 0;
        inkPoints.visible = currentState.inkAura;
        inkMaterial.opacity = 0.22 + energy * 0.58;

        if (currentState.depthMotion) {
          const breath = Math.sin(elapsed * 0.47 + seed) * 0.0025 * (0.35 + energy);
          materialPlane.rotation.x = breath;
          materialPlane.rotation.y = (side === 'left' ? 1 : -1) * breath * 0.8;
          latentPlane.position.z = 0.02 + Math.sin(elapsed * 0.39 + seed) * 0.006 * energy;
        } else {
          materialPlane.rotation.set(0, 0, 0);
          latentPlane.position.z = 0.02;
        }

        for (let index = 0; index < MAX_SPARKS_PER_PAGE; index += 1) {
          const spark = sparks[index];
          if (spark.life <= 0) continue;
          spark.life -= delta;
          const base = index * 3;
          inkPositions[base] += spark.vx;
          inkPositions[base + 1] += spark.vy;
          inkPositions[base + 2] += spark.vz;
          spark.vx *= 0.982;
          spark.vy *= 0.984;
          spark.vz *= 0.976;
          if (spark.life <= 0) {
            inkPositions[base] = 999;
            inkPositions[base + 1] = 999;
            inkPositions[base + 2] = 999;
          }
        }
        inkGeometry.attributes.position.needsUpdate = true;
      }

      function destroy() {
        materialPlane.geometry.dispose();
        materialPlane.material.dispose();
        latentPlane.geometry.dispose();
        latentMaterial.dispose();
        inkGeometry.dispose();
        inkMaterial.dispose();
      }

      return { side, scene, camera, addInkSpark, pulse, setPointer, resize, tick, destroy };
    }

    const rigs = {
      left: createPageRig('left', 1.731),
      right: createPageRig('right', 4.219),
    };
    let currentState = state;
    let raf = 0;
    const clock = new THREE.Clock();

    function targets(side) {
      const normal = normalisePageSide(side, 'right');
      return normal === 'both' ? [rigs.left, rigs.right] : [rigs[normal]];
    }

    function addInkSpark(spark) {
      for (const rig of targets(spark?.pageSide)) rig?.addInkSpark(spark);
    }

    function pulse(data = {}) {
      for (const rig of targets(data.pageSide)) rig?.pulse(data);
    }

    function setPointer(side, input = {}) {
      const target = rigs[normalisePageSide(side, 'right')];
      target?.setPointer(input);
    }

    function applyState(next) {
      currentState = normaliseCodexAnimationState(next);
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height, false);
    }

    function pageViewport(element, canvasRect) {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const left = Math.max(canvasRect.left, rect.left);
      const right = Math.min(canvasRect.right, rect.right);
      const top = Math.max(canvasRect.top, rect.top);
      const bottom = Math.min(canvasRect.bottom, rect.bottom);
      if (right <= left || bottom <= top) return null;
      return {
        x: left - canvasRect.left,
        y: canvasRect.bottom - bottom,
        width: right - left,
        height: bottom - top,
      };
    }

    function renderRig(rig, element, canvasRect) {
      const viewport = pageViewport(element, canvasRect);
      if (!viewport) return;
      rig.resize(viewport.width / Math.max(1, viewport.height));
      renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
      renderer.setScissor(viewport.x, viewport.y, viewport.width, viewport.height);
      renderer.render(rig.scene, rig.camera);
    }

    function tick() {
      raf = requestAnimationFrame(tick);
      if (root.hidden || !document.body.contains(root)) return;
      const delta = Math.min(0.05, clock.getDelta());
      const elapsed = clock.elapsedTime;
      rigs.left.tick(delta, elapsed, currentState);
      rigs.right.tick(delta, elapsed + 0.37, currentState);

      const canvasRect = canvas.getBoundingClientRect();
      renderer.setScissorTest(false);
      renderer.clear(true, true, true);
      renderer.setScissorTest(true);
      renderRig(rigs.left, pageElements.left, canvasRect);
      renderRig(rigs.right, pageElements.right, canvasRect);
      renderer.setScissorTest(false);
    }

    applyState(currentState);
    resize();
    tick();

    return {
      mode: 'three-physical-pages',
      applyState,
      addInkSpark,
      pulse,
      setPointer,
      resize,
      destroy() {
        cancelAnimationFrame(raf);
        rigs.left.destroy();
        rigs.right.destroy();
        renderer.dispose();
      },
    };
  } catch (error) {
    console.warn('[Universal Codex] physical page renderer unavailable; keeping the functional book.', error);
    return fallbackRenderer();
  }
}

function installPointerReveal(root) {
  const pages = {
    left: root.querySelector(PAGE_SELECTORS.left),
    right: root.querySelector(PAGE_SELECTORS.right),
  };

  const onPointerMove = (event) => {
    for (const [side, page] of Object.entries(pages)) {
      if (!page) continue;
      const rect = page.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) continue;
      const u = clamp01((event.clientX - rect.left) / Math.max(1, rect.width));
      const v = clamp01((event.clientY - rect.top) / Math.max(1, rect.height));
      const dx = (u - 0.5) * 2;
      const dy = (v - 0.5) * 2;
      const proximity = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 0.58);
      const pressure = event.pointerType === 'pen' ? Math.max(0.12, event.pressure || 0) : 0.08;
      const reveal = latentRevealStrength({
        proximity,
        signal: pressure,
        confidence: event.pointerType === 'pen' ? 0.72 : 0.42,
        intent: event.pointerType === 'pen' ? 0.82 : 0.36,
      });
      rendererController?.setPointer?.(side, { reveal, x: dx, y: dy });
      const other = side === 'left' ? 'right' : 'left';
      rendererController?.setPointer?.(other, { reveal: 0 });
      return;
    }
    rendererController?.setPointer?.('left', { reveal: 0 });
    rendererController?.setPointer?.('right', { reveal: 0 });
  };

  const onPointerLeave = () => {
    rendererController?.setPointer?.('left', { reveal: 0 });
    rendererController?.setPointer?.('right', { reveal: 0 });
  };

  root.addEventListener('pointermove', onPointerMove, { passive: true });
  root.addEventListener('pointerleave', onPointerLeave, { passive: true });
  return () => {
    root.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerleave', onPointerLeave);
  };
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
  pointerCleanup?.();
  pointerCleanup = installPointerReveal(root);
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => rendererController?.resize?.());
    resizeObserver.observe(stage);
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

globalThis.addEventListener?.('arcsweep:codex-motion', (event) => {
  const detail = event.detail || {};
  const motion = resolveCodexMotionTier(detail);
  rendererController?.pulse?.({
    ...detail,
    strength: detail.strength ?? motion.intensity,
    pageSide: normalisePageSide(detail.page_side ?? detail.pageSide, 'right'),
  });
});

globalThis.addEventListener?.('arcsweep:magic-book-ready', findAndMount);

findAndMount();
if (!mountedRoot && typeof MutationObserver !== 'undefined') {
  mountObserver = new MutationObserver(findAndMount);
  mountObserver.observe(document.body, { childList: true, subtree: true });
}

rootObserver = typeof MutationObserver !== 'undefined' ? new MutationObserver(() => {
  if (mountedRoot && !document.body.contains(mountedRoot)) {
    pointerCleanup?.();
    pointerCleanup = null;
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
  pulse(kind = 'manual', pageSide = 'both') {
    rendererController?.pulse?.({ strength: 0.9, kind, pageSide });
  },
  reveal(pageSide = 'right', strength = 1) {
    rendererController?.pulse?.({
      kind: 'revelation',
      revelation: true,
      strength: clamp01(strength),
      pageSide: normalisePageSide(pageSide, 'right'),
    });
  },
});

globalThis.addEventListener?.('pagehide', () => {
  resizeObserver?.disconnect?.();
  mountObserver?.disconnect?.();
  rootObserver?.disconnect?.();
  pointerCleanup?.();
  pointerCleanup = null;
  rendererController?.destroy?.();
  rendererController = null;
}, { once: true });
