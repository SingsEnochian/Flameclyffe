import './magic-book-leaf-drag.css';

import {
  leafDirectionalVelocity,
  leafDragProgress,
  leafTurnTarget,
  physicalLeafDragSnapshot,
  shouldCommitLeafDrag,
} from './codex/codex-physical-leaf-drag.js';

export const MAGIC_BOOK_LEAF_DRAG_SIDECAR_SCHEMA = 'arcsweep.magic-book-leaf-drag-sidecar/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
const HANDLE_SELECTOR = '[data-magic-book-leaf-handle]';
const TAP_DISTANCE_PX = 6;

let session = null;
let observer = null;
let resizeObserver = null;
let booted = false;
let suppressClick = false;

const rootNode = () => document.getElementById(ROOT_ID);
const bookBridge = () => globalThis.__arcsweepMagicBook || null;
const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

function emitLeaf(detail) {
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:codex-physical-leaf', {
    detail: Object.freeze({ schema: MAGIC_BOOK_LEAF_DRAG_SIDECAR_SCHEMA, ...detail }),
  }));
}

function stateAndTarget() {
  const bridge = bookBridge();
  const state = bridge?.state?.() || null;
  return { bridge, state, target: state ? leafTurnTarget(state, 'forward') : null };
}

function positionHandle() {
  const root = rootNode();
  const spread = root?.querySelector('.magic-book-spread');
  const page = root?.querySelector('.magic-book-right');
  const handle = root?.querySelector(HANDLE_SELECTOR);
  if (!root || !spread || !page || !handle || root.hidden) return false;
  const spreadRect = spread.getBoundingClientRect();
  const pageRect = page.getBoundingClientRect();
  handle.style.left = `${Math.round(pageRect.right - spreadRect.left - 15)}px`;
  handle.style.top = `${Math.round(pageRect.top - spreadRect.top + pageRect.height / 2 - 48)}px`;
  return true;
}

function refreshHandle() {
  const root = rootNode();
  const handle = root?.querySelector(HANDLE_SELECTOR);
  if (!root || !handle) return;
  const { target } = stateAndTarget();
  handle.hidden = !target;
  handle.disabled = !target;
  handle.dataset.reducedMotion = reducedMotion() ? 'true' : 'false';
  handle.setAttribute('aria-label', target ? `Turn to ${target.label}` : 'No next Codex leaf');
  if (target) handle.title = `Drag, flick, tap, or press Enter to turn to ${target.label}`;
  positionHandle();
}

function ensureHandle() {
  const root = rootNode();
  const spread = root?.querySelector('.magic-book-spread');
  if (!root || !spread) return null;
  let handle = spread.querySelector(HANDLE_SELECTOR);
  if (handle) return handle;
  handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'magic-book-leaf-handle';
  handle.dataset.magicBookLeafHandle = 'forward';
  handle.setAttribute('aria-label', 'Turn to next Codex leaf');
  spread.append(handle);
  bindHandle(handle);
  refreshHandle();
  return handle;
}

function cloneLeaf() {
  const root = rootNode();
  const spread = root?.querySelector('.magic-book-spread');
  const page = root?.querySelector('.magic-book-right');
  if (!root || !spread || !page) return null;
  const spreadRect = spread.getBoundingClientRect();
  const pageRect = page.getBoundingClientRect();
  const leaf = page.cloneNode(true);
  leaf.removeAttribute('id');
  leaf.removeAttribute('data-magic-book-right');
  leaf.classList.add('magic-book-drag-leaf');
  leaf.setAttribute('aria-hidden', 'true');
  leaf.inert = true;
  leaf.querySelectorAll?.('[id]').forEach((node) => node.removeAttribute('id'));
  leaf.querySelectorAll?.('button, input, select, textarea, a, [tabindex]').forEach((node) => {
    node.setAttribute?.('tabindex', '-1');
  });
  leaf.style.left = `${pageRect.left - spreadRect.left}px`;
  leaf.style.top = `${pageRect.top - spreadRect.top}px`;
  leaf.style.width = `${pageRect.width}px`;
  leaf.style.height = `${pageRect.height}px`;
  spread.append(leaf);
  return leaf;
}

function leafTransform(progress) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  const lift = Math.sin(Math.PI * p) * 34;
  const twist = Math.sin(Math.PI * p) * -1.4;
  const pinch = 1 - Math.sin(Math.PI * p) * 0.025;
  return `perspective(1400px) translateZ(${lift}px) rotateY(${-178 * p}deg) rotateZ(${twist}deg) scaleX(${pinch})`;
}

function paintLeaf(leaf, progress) {
  if (!leaf) return;
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  leaf.style.transform = leafTransform(p);
  leaf.style.setProperty('--leaf-back-opacity', String(Math.max(0, Math.min(1, (p - .46) * 2.15))));
  leaf.style.filter = `brightness(${1 - Math.sin(Math.PI * p) * .07})`;
}

function animateLeaf(leaf, from, to, duration) {
  if (!leaf || reducedMotion() || typeof leaf.animate !== 'function') {
    paintLeaf(leaf, to);
    return Promise.resolve();
  }
  const animation = leaf.animate([
    { transform: leafTransform(from) },
    { transform: leafTransform(to) },
  ], {
    duration: Math.max(80, Number(duration) || 80),
    easing: 'cubic-bezier(.18,.72,.24,1)',
    fill: 'forwards',
  });
  return animation.finished.catch(() => undefined).then(() => paintLeaf(leaf, to));
}

function cleanupSession() {
  const root = rootNode();
  session?.leaf?.remove?.();
  if (session?.handle) delete session.handle.dataset.dragging;
  root?.classList.remove('magic-book-leaf-dragging', 'magic-book-leaf-drag-commit');
  session = null;
  queueMicrotask(refreshHandle);
}

async function finishSession({ cancelled = false } = {}) {
  const active = session;
  if (!active) return;
  const travelPx = Math.abs(active.lastX - active.startX);
  const tapped = !cancelled && travelPx <= TAP_DISTANCE_PX;
  const commit = !cancelled && (tapped || shouldCommitLeafDrag({
    progress: active.progress,
    velocity: active.velocity,
    travelPx,
  }));

  emitLeaf({
    phase: commit ? 'commit' : 'cancel',
    ...physicalLeafDragSnapshot({
      binding: active.state,
      direction: 'forward',
      progress: active.progress,
      pointerType: active.pointerType,
    }),
    travel_px: travelPx,
    velocity: active.velocity,
  });

  if (!commit) {
    await animateLeaf(active.leaf, active.progress, 0, 220 + active.progress * 140);
    cleanupSession();
    return;
  }

  const currentState = bookBridge()?.state?.();
  const stillTarget = currentState ? leafTurnTarget(currentState, 'forward') : null;
  if (!stillTarget || stillTarget.id !== active.target.id) {
    await animateLeaf(active.leaf, active.progress, 0, 180);
    cleanupSession();
    return;
  }

  rootNode()?.classList.add('magic-book-leaf-drag-commit');
  const remaining = Math.max(0, 1 - active.progress);
  const visual = animateLeaf(active.leaf, active.progress, 1, 180 + remaining * 380);
  const turn = Promise.resolve(bookBridge()?.turn?.(active.target.id));
  await Promise.allSettled([visual, turn]);
  cleanupSession();
}

function updateFromPointer(event) {
  if (!session || event.pointerId !== session.pointerId) return;
  const now = Number(event.timeStamp) || performance.now();
  session.progress = leafDragProgress({
    startX: session.startX,
    currentX: event.clientX,
    width: session.width,
    direction: 'forward',
  });
  session.velocity = leafDirectionalVelocity({
    previousX: session.lastX,
    currentX: event.clientX,
    previousAt: session.lastAt,
    currentAt: now,
    direction: 'forward',
  });
  session.lastX = event.clientX;
  session.lastAt = now;
  paintLeaf(session.leaf, session.progress);
  emitLeaf({
    phase: 'drag',
    ...physicalLeafDragSnapshot({
      binding: session.state,
      direction: 'forward',
      progress: session.progress,
      pointerType: session.pointerType,
    }),
    velocity: session.velocity,
  });
}

function beginPointer(event, handle) {
  if (event.button > 0 || session || reducedMotion()) return;
  const { bridge, state, target } = stateAndTarget();
  if (!bridge || !state || !target) return;
  const page = rootNode()?.querySelector('.magic-book-right');
  if (!page) return;
  const leaf = cloneLeaf();
  if (!leaf) return;
  event.preventDefault();
  handle.setPointerCapture?.(event.pointerId);
  const now = Number(event.timeStamp) || performance.now();
  session = {
    pointerId: event.pointerId,
    pointerType: event.pointerType || 'pointer',
    state,
    target,
    handle,
    leaf,
    width: Math.max(1, page.getBoundingClientRect().width),
    startX: event.clientX,
    lastX: event.clientX,
    lastAt: now,
    progress: 0,
    velocity: 0,
  };
  handle.dataset.dragging = 'true';
  rootNode()?.classList.add('magic-book-leaf-dragging');
  paintLeaf(leaf, 0);
  emitLeaf({
    phase: 'start',
    ...physicalLeafDragSnapshot({ binding: state, direction: 'forward', progress: 0, pointerType: session.pointerType }),
  });
}

function bindHandle(handle) {
  handle.addEventListener('pointerdown', (event) => beginPointer(event, handle));
  handle.addEventListener('pointermove', (event) => {
    if (!session) return;
    event.preventDefault();
    const samples = event.getCoalescedEvents?.() || [event];
    samples.forEach(updateFromPointer);
  });
  handle.addEventListener('pointerup', (event) => {
    if (!session || event.pointerId !== session.pointerId) return;
    event.preventDefault();
    updateFromPointer(event);
    if (handle.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    suppressClick = true;
    void finishSession();
  });
  handle.addEventListener('pointercancel', (event) => {
    if (!session || event.pointerId !== session.pointerId) return;
    if (handle.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    suppressClick = false;
    void finishSession({ cancelled: true });
  });
  handle.addEventListener('click', (event) => {
    if (suppressClick) {
      event.preventDefault();
      suppressClick = false;
      return;
    }
    event.preventDefault();
    const { bridge, target } = stateAndTarget();
    if (bridge && target) void bridge.turn?.(target.id);
  });
}

function install() {
  if (booted) return true;
  const root = rootNode();
  if (!root || !bookBridge()) return false;
  const handle = ensureHandle();
  if (!handle) return false;
  booted = true;
  observer = new MutationObserver(() => {
    ensureHandle();
    refreshHandle();
  });
  const page = root.querySelector('.magic-book-right');
  if (page) observer.observe(page, { childList: true, subtree: false });
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(positionHandle);
    resizeObserver.observe(root.querySelector('.magic-book-spread'));
    resizeObserver.observe(page);
  }
  globalThis.addEventListener?.('arcsweep:magic-book-receipt', refreshHandle);
  globalThis.addEventListener?.('arcsweep:magic-book-ready', refreshHandle);
  queueMicrotask(refreshHandle);
  return true;
}

if (!install()) {
  const waiting = new MutationObserver(() => {
    if (install()) waiting.disconnect();
  });
  waiting.observe(document.body, { childList: true, subtree: true });
  globalThis.addEventListener?.('arcsweep:magic-book-ready', () => {
    if (install()) waiting.disconnect();
  }, { once: true });
}

globalThis.addEventListener?.('pagehide', () => {
  observer?.disconnect?.();
  resizeObserver?.disconnect?.();
  globalThis.removeEventListener?.('arcsweep:magic-book-receipt', refreshHandle);
  globalThis.removeEventListener?.('arcsweep:magic-book-ready', refreshHandle);
  session?.leaf?.remove?.();
  session = null;
}, { once: true });
