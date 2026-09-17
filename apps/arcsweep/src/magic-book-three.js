import * as THREE from 'three';

export const MAGIC_BOOK_VERSION = 'arcsweep.magic-book-three/v1';
const RECEIPT_EVENT = 'arcsweep:magic-book-receipt';
const STORAGE_KEY = 'hearthgate.arcsweep.magic-book.v1';

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID?.() || `book-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function emitReceipt(action, detail = {}) {
  const receipt = Object.freeze({
    schema: 'arcsweep.magic-book-receipt/1',
    receipt_id: id(),
    occurred_at: now(),
    object_id: 'arcsweep:magic-book',
    renderer: 'three',
    version: MAGIC_BOOK_VERSION,
    action,
    ...detail,
  });
  window.dispatchEvent(new CustomEvent(RECEIPT_EVENT, { detail: receipt }));
  return receipt;
}

function readState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

function writeState(next) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
}

function makePage(material, x) {
  const geometry = new THREE.PlaneGeometry(1.38, 1.84, 24, 6);
  geometry.userData.rest = Float32Array.from(geometry.attributes.position.array);
  const page = new THREE.Mesh(geometry, material);
  page.position.set(x, 0, 0.035);
  return page;
}

function curlPage(page, progress) {
  const position = page.geometry.attributes.position;
  const rest = page.geometry.userData.rest;
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  for (let i = 0; i < position.count; i += 1) {
    const offset = i * 3;
    const x = rest[offset];
    const y = rest[offset + 1];
    const u = (x + .69) / 1.38;
    const fold = Math.sin(u * Math.PI) * p;
    position.setXYZ(i, x - .13 * fold * u, y, rest[offset + 2] + .34 * fold);
  }
  position.needsUpdate = true;
  page.geometry.computeVertexNormals();
}

export function mountMagicBook({ host = document.body } = {}) {
  if (!host || document.getElementById('arcsweep-magic-book-three')) return null;

  const shell = document.createElement('section');
  shell.id = 'arcsweep-magic-book-three';
  shell.setAttribute('aria-label', 'Arcsweep Magic Book');
  shell.innerHTML = `
    <canvas aria-label="Interactive Magic Book"></canvas>
    <div class="magic-book-copy">
      <small>STARSONG · ARCSWEEP</small>
      <strong>The Book is the bridge.</strong>
      <span data-book-status>Touch the cover to open.</span>
    </div>`;
  host.prepend(shell);

  const style = document.createElement('style');
  style.textContent = `
    #arcsweep-magic-book-three{position:fixed;inset:0;z-index:2;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 35%,#243b35 0,#0b100f 68%);transition:opacity .45s ease}
    #arcsweep-magic-book-three canvas{width:100%;height:100%;touch-action:none}
    .magic-book-copy{position:absolute;bottom:max(1.25rem,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);display:grid;gap:.2rem;text-align:center;color:#eadfbf;pointer-events:none;text-shadow:0 2px 16px #000}
    .magic-book-copy small{letter-spacing:.18em}.magic-book-copy strong{font:600 clamp(1.15rem,3vw,1.7rem)/1.2 Georgia,serif}.magic-book-copy span{opacity:.72;font-size:.82rem}
    #arcsweep-magic-book-three[data-open="true"]{pointer-events:none;opacity:.16}
    @media(prefers-reduced-motion:reduce){#arcsweep-magic-book-three{transition:none}}
  `;
  document.head.append(style);

  const canvas = shell.querySelector('canvas');
  const status = shell.querySelector('[data-book-status]');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  camera.position.set(0, .05, 5.2);

  scene.add(new THREE.HemisphereLight(0xf3d9a0, 0x10201c, 2.2));
  const warm = new THREE.PointLight(0xe9b55f, 18, 8);
  warm.position.set(-2, 2.4, 3);
  scene.add(warm);

  const book = new THREE.Group();
  book.rotation.x = -.08;
  scene.add(book);

  const coverMat = new THREE.MeshStandardMaterial({ color: 0x3b1714, roughness: .72, metalness: .08 });
  const pageMat = new THREE.MeshStandardMaterial({ color: 0xe7d6aa, roughness: .92, side: THREE.DoubleSide });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xc49a4b, roughness: .38, metalness: .7 });

  const back = new THREE.Mesh(new THREE.BoxGeometry(3.08, 2.08, .12), coverMat);
  back.position.z = -.08;
  book.add(back);

  const leftPage = makePage(pageMat, -.72);
  const rightPage = makePage(pageMat, .72);
  book.add(leftPage, rightPage);

  const frontPivot = new THREE.Group();
  frontPivot.position.x = -1.54;
  const front = new THREE.Mesh(new THREE.BoxGeometry(3.08, 2.08, .1), coverMat);
  front.position.x = 1.54;
  frontPivot.add(front);
  book.add(frontPivot);

  const sigil = new THREE.Mesh(new THREE.TorusGeometry(.36, .025, 12, 64), goldMat);
  sigil.position.set(0, 0, .08);
  front.add(sigil);

  let state = readState();
  let phase = state.open ? 'open' : 'closed';
  let target = state.open ? Math.PI * .985 : 0;
  let coverAngle = target;
  let dragging = false;
  let startX = 0;
  let startAngle = 0;
  const reducedMotion = matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  const persist = (action) => {
    state = { ...state, open: phase === 'open', phase, coverAngle, updated_at: now() };
    writeState(state);
    emitReceipt(action, { phase, open: state.open, cover_angle: Number(coverAngle.toFixed(4)) });
  };

  const setPhase = (next, action) => {
    if (phase === next) return;
    phase = next;
    shell.dataset.open = String(next === 'open');
    status.textContent = next === 'open' ? 'Book open · ArcSweep continues beneath the page.' : 'Touch the cover to open.';
    persist(action);
  };

  function resize() {
    const { clientWidth:w, clientHeight:h } = canvas;
    const width = Math.max(1, w), height = Math.max(1, h);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const pointerX = (event) => event.clientX / Math.max(1, innerWidth);
  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    dragging = true;
    startX = pointerX(event);
    startAngle = coverAngle;
    emitReceipt('interaction-started', { phase, pointer_type: event.pointerType });
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const delta = (pointerX(event) - startX) * Math.PI * 1.5;
    coverAngle = THREE.MathUtils.clamp(startAngle + delta, 0, Math.PI);
    target = coverAngle;
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    target = coverAngle > Math.PI * .32 ? Math.PI * .985 : 0;
    emitReceipt('interaction-released', { target: target > 1 ? 'open' : 'closed' });
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  const clock = new THREE.Clock();
  function frame() {
    resize();
    if (!dragging) {
      const step = reducedMotion ? 1 : 1 - Math.exp(-clock.getDelta() * 8);
      coverAngle = THREE.MathUtils.lerp(coverAngle, target, step);
      if (target > 1 && coverAngle > Math.PI * .94) setPhase('open', 'opened');
      if (target === 0 && coverAngle < .04) setPhase('closed', 'closed');
    } else clock.getDelta();
    frontPivot.rotation.y = -coverAngle;
    curlPage(rightPage, Math.sin(Math.min(1, coverAngle / Math.PI) * Math.PI));
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  shell.dataset.open = String(phase === 'open');
  emitReceipt('mounted', { restored_phase: phase, restored: Boolean(state.updated_at) });
  frame();

  return { shell, scene, book, renderer, getState: () => ({ phase, coverAngle }) };
}

if (typeof window !== 'undefined') {
  window.addEventListener('arcsweep:core-ready', () => mountMagicBook(), { once: true });
}
