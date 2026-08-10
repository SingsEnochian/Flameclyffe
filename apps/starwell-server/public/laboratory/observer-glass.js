import { THREE } from './glass-material-manager.js';
import { AdvancedGlassManager } from './advanced-glass-manager.js';
import { GlassRenderPipeline } from './glass-render-pipeline.js';
import { generateScratchTexture } from './scratch-generator.js';
import { loadHDREnvironment } from './hdr-environment.js';
import { injectVertexRipples } from './vertex-ripples.js';
import { optimizePipelineForDevice } from './mobile-performance.js';

const canvas = document.getElementById('glass-instrument');
if (canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  // Glass is the lens edge, not the subject of the instrument.
  const manager = new AdvancedGlassManager(null, 'clear');
  const scratchMap = generateScratchTexture(512, 70);
  manager.material.roughnessMap = scratchMap;
  manager.material.clearcoatRoughnessMap = scratchMap;
  manager.material.opacity = 0.42;
  manager.material.depthWrite = false;
  injectVertexRipples(manager.material, 0.004, 1.1);
  const geometry = new THREE.RingGeometry(2.22, 2.29, 128);
  const lensEdge = new THREE.Mesh(geometry, manager.material);
  scene.add(lensEdge);

  const draftingMaterial = new THREE.LineBasicMaterial({ color: 0x54d9a1, transparent: true, opacity: 0.23 });
  const goldMaterial = new THREE.LineBasicMaterial({ color: 0xd7b464, transparent: true, opacity: 0.25 });
  const draftingObjects = [];
  for (const radius of [0.68, 1.35, 2.05]) {
    const points = Array.from({ length: 97 }, (_, index) => {
      const angle = index / 96 * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, -0.12);
    });
    const loop = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), draftingMaterial);
    draftingObjects.push(loop); scene.add(loop);
  }
  const axisPoints = [];
  for (let index = 0; index < 14; index += 1) {
    const angle = index / 14 * Math.PI * 2;
    axisPoints.push(new THREE.Vector3(Math.cos(angle) * .72, Math.sin(angle) * .72, -.1));
    axisPoints.push(new THREE.Vector3(Math.cos(angle) * 2.02, Math.sin(angle) * 2.02, -.1));
  }
  const axes = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(axisPoints), goldMaterial);
  draftingObjects.push(axes); scene.add(axes);

  const starPositions = [];
  for (let index = 0; index < 72; index += 1) {
    const angle = index * 2.3999632297, radius = .4 + (index % 19) / 19 * 2.1;
    starPositions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, -1.8 - (index % 5) * .08);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const starMaterial = new THREE.PointsMaterial({ color: 0xc9f9e5, size: .025, transparent: true, opacity: .42, sizeAttenuation: true });
  const stars = new THREE.Points(starGeometry, starMaterial); scene.add(stars);
  scene.add(new THREE.HemisphereLight(0xc9f9e5, 0x111612, 0.8));
  const key = new THREE.PointLight(0xffd392, 8, 16); key.position.set(3, 3, 4); scene.add(key);

  const pipeline = new GlassRenderPipeline(renderer, scene, camera, canvas);
  const performance = optimizePipelineForDevice(renderer, pipeline, manager.material);
  const glassStatus = document.getElementById('glass-status');
  if (glassStatus) glassStatus.textContent = performance.constrained ? 'Drafting lens · mobile glass budget' : 'Drafting lens · restrained glass field';
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); cancelAnimationFrame(frame); if (glassStatus) glassStatus.textContent = 'Observer lens paused: WebGL context lost.'; });
  canvas.addEventListener('webglcontextrestored', () => { if (glassStatus) glassStatus.textContent = 'Observer lens restored.'; frame = requestAnimationFrame(render); });
  const resize = () => { const box = canvas.getBoundingClientRect(); const size = Math.max(1, Math.floor(Math.min(box.width, box.height))); renderer.setSize(size, size, false); camera.aspect = 1; camera.updateProjectionMatrix(); pipeline.resize(); };
  new ResizeObserver(resize).observe(canvas.parentElement); resize();
  let pointerX = 0, pointerY = 0, dragX = 0, dragY = 0, dragging = false, priorX = 0, priorY = 0;
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', event => { dragging = true; priorX = event.clientX; priorY = event.clientY; canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing'; });
  canvas.addEventListener('pointermove', event => { const box = canvas.getBoundingClientRect(); pointerX = ((event.clientX - box.left) / box.width - .5) * 2; pointerY = ((event.clientY - box.top) / box.height - .5) * 2; if (dragging) { dragX += (event.clientX - priorX) * .004; dragY += (event.clientY - priorY) * .004; priorX = event.clientX; priorY = event.clientY; } });
  canvas.addEventListener('pointerup', event => { dragging = false; canvas.releasePointerCapture(event.pointerId); canvas.style.cursor = 'grab'; });
  canvas.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });
  canvas.addEventListener('wheel', event => { event.preventDefault(); camera.position.z = THREE.MathUtils.clamp(camera.position.z + Math.sign(event.deltaY) * .35, 5.8, 10); }, { passive: false });
  canvas.addEventListener('dblclick', () => { dragX = 0; dragY = 0; camera.position.set(0, 0, 8); });
  let frame = 0;
  const render = time => { if (!document.hidden) { if (manager.material.userData.uRippleTime) manager.material.userData.uRippleTime.value = time * .001; camera.position.x += (pointerX * .16 - camera.position.x) * .035; camera.position.y += (-pointerY * .16 - camera.position.y) * .035; lensEdge.rotation.x += (dragY - lensEdge.rotation.x) * .08; lensEdge.rotation.y += (dragX - lensEdge.rotation.y) * .08; draftingObjects.forEach((object,index)=>{object.rotation.x=lensEdge.rotation.x*.32;object.rotation.y=lensEdge.rotation.y*.32;object.rotation.z=(index===draftingObjects.length-1?-time*.000004:0)+dragX*.08}); stars.rotation.z = time * .000008 + dragX*.04; pipeline.render(lensEdge); } frame = requestAnimationFrame(render); };
  frame = requestAnimationFrame(render);
  addEventListener('hearthgate:glass-theme', event => { manager.setTheme(event.detail?.theme, event.detail?.duration ?? 1.2); manager.material.opacity = .42; manager.material.depthWrite = false; setTimeout(() => optimizePipelineForDevice(renderer, pipeline, manager.material), 1300); });
  addEventListener('hearthgate:ripple', event => { if (Number.isFinite(event.detail?.amplitude) && manager.material.userData.uRippleAmplitude) manager.material.userData.uRippleAmplitude.value = Math.min(event.detail.amplitude, .012); if (Number.isFinite(event.detail?.frequency) && manager.material.userData.uRippleFrequency) manager.material.userData.uRippleFrequency.value = event.detail.frequency; });
  let environmentTarget = null;
  addEventListener('hearthgate:hdr', async event => { try { glassStatus.textContent = `Loading ${event.detail.file.name}…`; environmentTarget?.dispose(); environmentTarget = await loadHDREnvironment(renderer, scene, event.detail.file); manager.material.envMap = environmentTarget.texture; manager.material.needsUpdate = true; glassStatus.textContent = `Drafting lens environment · ${event.detail.file.name}`; } catch (error) { glassStatus.textContent = `HDR load failed: ${error.message}`; } });
  addEventListener('pagehide', () => { cancelAnimationFrame(frame); environmentTarget?.dispose(); scratchMap.dispose(); geometry.dispose(); starGeometry.dispose(); starMaterial.dispose(); draftingObjects.forEach(object => object.geometry.dispose()); draftingMaterial.dispose(); goldMaterial.dispose(); manager.dispose(); pipeline.dispose(); renderer.dispose(); }, { once: true });
}
