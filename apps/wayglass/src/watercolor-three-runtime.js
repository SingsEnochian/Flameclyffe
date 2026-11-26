import * as THREE from 'three';
import {
  BatchedRenderer, ParticleSystem, ConstantValue, IntervalValue,
  ConstantColor, PointEmitter, RenderMode,
} from 'three.quarks';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect,
} from 'postprocessing';

export const WATERCOLOR_THREE_RUNTIME_SCHEMA = 'wayglass.watercolor-three-runtime/v0.1';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function validateWatercolorSplatUrl(url) {
  if (typeof url !== 'string' || url.length > 2048 || !/^https:\/\//i.test(url)) {
    throw new TypeError('A bounded absolute HTTPS splat URL is required');
  }
  return new URL(url).href;
}

/**
 * One opt-in Three.js layer owned by the existing Watercolour surface.
 * The surface's existing animation frame calls render(); this module never
 * creates a second requestAnimationFrame loop.
 */
export function createWatercolorThreeRuntime({ stage, onStatus = () => {} } = {}) {
  if (!stage?.appendChild) throw new TypeError('Watercolour stage element required');
  const canvas = document.createElement('canvas');
  canvas.className = 'wc-three-overlay';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.renderer = 'three';
  stage.appendChild(canvas);

  let renderer, composer, scene, camera, batchRenderer, particleSystem, spark;
  let resizeObserver = null;
  let disposed = false;
  let paused = false;
  let lastTime = 0;
  const splats = new Set();

  const status = message => { try { onStatus(String(message)); } catch { /* status observers are non-owning */ } };
  const resize = () => {
    if (disposed || !renderer || !composer) return;
    const width = Math.max(1, Math.round(stage.clientWidth || 1));
    const height = Math.max(1, Math.round(stage.clientHeight || 1));
    const pixelRatio = clamp(globalThis.devicePixelRatio || 1, 1, 1.5);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  try {
    renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: false, powerPreference: 'low-power',
      stencil: false, depth: true,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 1, 0.05, 200);
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    const key = new THREE.PointLight(0xc9f5e4, 18, 30);
    key.position.set(-2, 2.5, 4);
    scene.add(key);

    // Quarks owns particle simulation and batching; the scene owns the single renderer.
    batchRenderer = new BatchedRenderer();
    scene.add(batchRenderer);
    particleSystem = new ParticleSystem({
      duration: 4,
      looping: true,
      startLife: new IntervalValue(1.1, 2.3),
      startSpeed: new ConstantValue(0.16),
      startSize: new IntervalValue(0.025, 0.085),
      startColor: new ConstantColor(new THREE.Vector4(0.63, 0.91, 0.82, 0.82)),
      maxParticle: 180,
      emissionOverTime: new ConstantValue(18),
      shape: new PointEmitter(),
      material: new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.78,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }),
      renderMode: RenderMode.BillBoard,
    });
    scene.add(particleSystem.emitter);
    batchRenderer.addSystem(particleSystem);

    // Spark is a scene participant, not a second renderer or animation loop.
    spark = new SparkRenderer({ renderer });
    scene.add(spark);

    composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new EffectPass(camera, new BloomEffect({ intensity: 0.42 })));

    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(stage);
    }
    resize();
    status('Three.js scene ready · Quarks particles active · Spark available');
  } catch (error) {
    resizeObserver?.disconnect();
    try { composer?.dispose?.(); } catch {}
    try { renderer?.dispose?.(); } catch {}
    canvas.remove();
    throw error;
  }

  async function loadSplat(url) {
    if (disposed) throw new Error('Three.js runtime disposed');
    const safeUrl = validateWatercolorSplatUrl(url);
    const splat = new SplatMesh({ url: safeUrl });
    splats.add(splat);
    scene.add(splat);
    status('Splat scene requested · asset loading is external');
    return splat;
  }

  function render(timestamp = 0, { animate = true } = {}) {
    if (disposed) return;
    const delta = lastTime ? clamp((timestamp - lastTime) / 1000, 0, 0.05) : 0;
    lastTime = timestamp;
    if (animate && !paused && !disposed) batchRenderer.update(delta);
    composer.render(delta);
  }

  function pause() { paused = true; }
  function resume() { if (!disposed) paused = false; }
  function destroy() {
    if (disposed) return;
    disposed = true;
    resizeObserver?.disconnect();
    if (particleSystem) {
      batchRenderer?.deleteSystem?.(particleSystem);
      scene?.remove(particleSystem.emitter);
      particleSystem.emitter?.traverse?.(object => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach(material => material.dispose?.());
        else object.material?.dispose?.();
      });
    }
    for (const splat of splats) {
      scene?.remove(splat);
      splat.dispose?.();
    }
    splats.clear();
    scene?.remove(spark, batchRenderer);
    composer?.dispose?.();
    renderer?.dispose?.();
    canvas.remove();
    status('Three.js scene disposed');
  }

  return Object.freeze({
    schema: WATERCOLOR_THREE_RUNTIME_SCHEMA,
    canvas,
    loadSplat,
    render,
    pause,
    resume,
    destroy,
    snapshot: () => Object.freeze({
      schema: WATERCOLOR_THREE_RUNTIME_SCHEMA,
      active: !disposed,
      paused,
      splatCount: splats.size,
      ownsAnimationLoop: false,
      ownsRenderer: true,
      disposed,
    }),
  });
}
