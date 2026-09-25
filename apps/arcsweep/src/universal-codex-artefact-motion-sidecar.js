import './universal-codex-artefact-motion.css';

import {
  ARTEFACT_EFFECTS,
  UNIVERSAL_CODEX_ARTEFACT_MOTION_SCHEMA,
  artefactEffectForReceipt,
  artefactMotionDuration,
  hashArtefactSeed,
  liquidInkSample,
  shouldRunArtefactFrame,
  sigilSegments,
} from './universal-codex-artefact-motion-model.js';

const BOOK_ID = 'arcsweep-magic-book';
const CANVAS_CLASS = 'universal-codex-artefact-canvas';
const PAGE_SELECTORS = Object.freeze({ left: '.magic-book-left', right: '.magic-book-right' });
const MAX_INK = 160;
const MAX_EFFECTS = 28;
const POINTER_SAMPLE_MS = 18;

let root = null;
let stage = null;
let canvas = null;
let context = null;
let resizeObserver = null;
let mountObserver = null;
let raf = 0;
let dpr = 1;
let ink = [];
let effects = [];
let lastFrameAt = 0;
let lastPointerSampleAt = 0;
let lastPointer = null;
let pointerDown = false;
let lastAttentionSignature = '';

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

function reducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

function css(name, fallback) {
  const value = root ? getComputedStyle(root).getPropertyValue(name).trim() : '';
  return value || fallback;
}

function palette() {
  return {
    teal: css('--codex-teal-500', '#2BA59A'),
    seafoam: css('--codex-seafoam-300', '#67C6C1'),
    gold: css('--codex-old-gold', '#C7A963'),
    champagne: css('--codex-champagne', '#E4CF9B'),
    copper: css('--codex-copper', '#A86842'),
    lilac: css('--codex-lilac-300', '#B6A7CE'),
    foam: css('--codex-foam-100', '#EBF5F2'),
  };
}

function stageRect() {
  return stage?.getBoundingClientRect?.() || null;
}

function contentOffset() {
  return {
    x: Number(stage?.scrollLeft) || 0,
    y: Number(stage?.scrollTop) || 0,
  };
}

function pageElement(side = 'right') {
  return root?.querySelector?.(PAGE_SELECTORS[side === 'left' ? 'left' : 'right']) || null;
}

function pageRect(side = 'right') {
  const host = stageRect();
  const page = pageElement(side);
  if (!host || !page) return null;
  const rect = page.getBoundingClientRect();
  const offset = contentOffset();
  return {
    left: rect.left - host.left + offset.x,
    top: rect.top - host.top + offset.y,
    right: rect.right - host.left + offset.x,
    bottom: rect.bottom - host.top + offset.y,
    width: rect.width,
    height: rect.height,
  };
}

function sideForPoint(clientX, clientY) {
  for (const side of ['left', 'right']) {
    const page = pageElement(side);
    if (!page) continue;
    const rect = page.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return side;
  }
  return null;
}

function resize() {
  if (!canvas || !stage) return;
  const rect = stage.getBoundingClientRect();
  dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(Math.max(rect.width, stage.scrollWidth || 0)));
  const height = Math.max(1, Math.round(Math.max(rect.height, stage.scrollHeight || 0)));
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context = canvas.getContext('2d', { alpha: true });
  context?.setTransform?.(dpr, 0, 0, dpr, 0, 0);
}

function setMotionState(active) {
  if (!root) return;
  root.dataset.codexArtefactMotion = active ? 'active' : 'quiet';
}

function ensureLoop() {
  if (reducedMotion() || raf) return;
  raf = requestAnimationFrame(frame);
}

function pointOnPerimeter(rect, progress) {
  const p = ((progress % 1) + 1) % 1;
  const perimeter = 2 * (rect.width + rect.height);
  let distance = p * perimeter;
  if (distance <= rect.width) return { x: rect.left + distance, y: rect.top };
  distance -= rect.width;
  if (distance <= rect.height) return { x: rect.right, y: rect.top + distance };
  distance -= rect.height;
  if (distance <= rect.width) return { x: rect.right - distance, y: rect.bottom };
  distance -= rect.width;
  return { x: rect.left, y: rect.bottom - distance };
}

function addInkParticle({ clientX, clientY, pressure = 0.22, velocity = 0, seed = 'pointer', pageSide = null } = {}) {
  if (!stage || reducedMotion()) return;
  const side = pageSide || sideForPoint(clientX, clientY);
  if (!side) return;
  const host = stageRect();
  const page = pageElement(side)?.getBoundingClientRect?.();
  if (!host || !page) return;
  const x = clamp01((clientX - page.left) / Math.max(1, page.width));
  const y = clamp01((clientY - page.top) / Math.max(1, page.height));
  const sample = liquidInkSample({ x, y, pressure, velocity, seed });
  const offset = contentOffset();
  const localX = clientX - host.left + offset.x;
  const localY = clientY - host.top + offset.y;
  const now = performance.now();
  ink.push({
    ...sample,
    x: localX,
    y: localY,
    px: localX,
    py: localY,
    bornAt: now,
    side,
    seed: hashArtefactSeed(seed),
  });
  if (ink.length > MAX_INK) ink.splice(0, ink.length - MAX_INK);
  const pageNode = pageElement(side);
  if (pageNode) {
    pageNode.dataset.codexInkTouched = 'true';
    clearTimeout(pageNode.__codexInkTouchedTimer);
    pageNode.__codexInkTouchedTimer = setTimeout(() => delete pageNode.dataset.codexInkTouched, 620);
  }
  setMotionState(true);
  ensureLoop();
}

function pushEffect(effect = {}) {
  if (reducedMotion()) return;
  const durationMs = artefactMotionDuration(effect, false);
  if (!durationMs) return;
  effects.push({
    ...effect,
    id: `${effect.id || 'artefact'}:${performance.now()}:${Math.random().toString(16).slice(2)}`,
    startedAt: performance.now(),
    durationMs,
    strength: clamp01(effect.strength == null ? 0.7 : effect.strength),
    seed: hashArtefactSeed(effect.seed || effect.kind || effect.id || 'codex'),
  });
  if (effects.length > MAX_EFFECTS) effects.splice(0, effects.length - MAX_EFFECTS);

  const sides = effect.pageSide === 'both' ? ['left', 'right'] : [effect.pageSide === 'left' ? 'left' : 'right'];
  if (effect.id === ARTEFACT_EFFECTS.pageWake.id) {
    for (const side of sides) {
      const page = pageElement(side);
      if (!page) continue;
      page.dataset.codexPageWake = 'true';
      clearTimeout(page.__codexPageWakeTimer);
      page.__codexPageWakeTimer = setTimeout(() => delete page.dataset.codexPageWake, durationMs);
    }
  }

  setMotionState(true);
  ensureLoop();
}

function fadeCurve(progress) {
  const p = clamp01(progress);
  const enter = Math.min(1, p / 0.18);
  const leave = Math.min(1, (1 - p) / 0.32);
  return Math.sin(Math.min(1, enter) * Math.PI * 0.5) * Math.sin(Math.min(1, leave) * Math.PI * 0.5);
}

function drawInk(now, delta, colors) {
  if (!context) return;
  const next = [];
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (const particle of ink) {
    const age = now - particle.bornAt;
    if (age >= particle.lifeMs) continue;
    const life = 1 - age / particle.lifeMs;
    particle.px = particle.x;
    particle.py = particle.y;
    const damping = Math.pow(0.968, delta / 16.67);
    particle.vx *= damping;
    particle.vy *= damping;
    particle.vy += 0.0009 * delta;
    particle.x += particle.vx * delta * 0.09;
    particle.y += particle.vy * delta * 0.09;

    const shimmer = 0.55 + particle.seed * 0.45;
    context.globalAlpha = particle.opacity * life * 0.54;
    const gradient = context.createLinearGradient(particle.px, particle.py, particle.x, particle.y);
    gradient.addColorStop(0, colors.teal);
    gradient.addColorStop(0.62, shimmer > 0.72 ? colors.seafoam : colors.copper);
    gradient.addColorStop(1, colors.gold);
    context.strokeStyle = gradient;
    context.lineWidth = Math.max(0.55, particle.radius * (0.34 + life * 0.42));
    context.beginPath();
    context.moveTo(particle.px, particle.py);
    const bendX = (particle.px + particle.x) * 0.5 + Math.sin(age * 0.008 + particle.seed * 8) * 1.8;
    const bendY = (particle.py + particle.y) * 0.5 + Math.cos(age * 0.007 + particle.seed * 6) * 1.2;
    context.quadraticCurveTo(bendX, bendY, particle.x, particle.y);
    context.stroke();

    context.globalAlpha = particle.opacity * life * 0.18;
    context.fillStyle = shimmer > 0.65 ? colors.champagne : colors.teal;
    context.beginPath();
    context.arc(particle.x, particle.y, Math.max(0.5, particle.radius * life * 0.34), 0, Math.PI * 2);
    context.fill();
    next.push(particle);
  }
  context.restore();
  ink = next;
}

function drawEdgeGlint(effect, progress, alpha, colors) {
  const sides = effect.pageSide === 'both' ? ['left', 'right'] : [effect.pageSide === 'left' ? 'left' : 'right'];
  for (const side of sides) {
    const rect = pageRect(side);
    if (!rect) continue;
    const head = pointOnPerimeter(rect, progress * 0.78 + effect.seed * 0.22);
    const tail = pointOnPerimeter(rect, progress * 0.78 + effect.seed * 0.22 - 0.032);
    const gradient = context.createLinearGradient(tail.x, tail.y, head.x, head.y);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.55, colors.copper);
    gradient.addColorStop(1, colors.champagne);
    context.globalAlpha = alpha * (0.34 + effect.strength * 0.42);
    context.strokeStyle = gradient;
    context.lineWidth = 1.15 + effect.strength * 0.85;
    context.beginPath();
    context.moveTo(tail.x, tail.y);
    context.lineTo(head.x, head.y);
    context.stroke();
  }
}

function drawPageWake(effect, progress, alpha, colors) {
  const sides = effect.pageSide === 'both' ? ['left', 'right'] : [effect.pageSide === 'left' ? 'left' : 'right'];
  for (const side of sides) {
    const rect = pageRect(side);
    if (!rect) continue;
    const direction = side === 'left' ? -1 : 1;
    const gutterX = side === 'left' ? rect.right : rect.left;
    const distance = rect.width * (0.08 + progress * 0.82) * direction;
    const x = gutterX + distance;
    const bow = Math.sin(progress * Math.PI) * rect.width * 0.045 * direction;
    context.globalAlpha = alpha * (0.18 + effect.strength * 0.24);
    const gradient = context.createLinearGradient(x - 18, rect.top, x + 18, rect.bottom);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.48, colors.teal);
    gradient.addColorStop(0.52, colors.gold);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.strokeStyle = gradient;
    context.lineWidth = 1.1 + effect.strength * 1.4;
    context.beginPath();
    context.moveTo(x, rect.top + rect.height * 0.08);
    context.bezierCurveTo(
      x + bow,
      rect.top + rect.height * 0.32,
      x - bow,
      rect.top + rect.height * 0.68,
      x,
      rect.bottom - rect.height * 0.08,
    );
    context.stroke();
  }
}

function drawGlyphBloom(effect, progress, alpha, colors) {
  const side = effect.pageSide === 'left' ? 'left' : 'right';
  const rect = pageRect(side);
  if (!rect) return;
  const radius = Math.min(rect.width, rect.height) * (0.055 + 0.055 * Math.sin(progress * Math.PI));
  const cx = rect.left + rect.width * (0.52 + (effect.seed - 0.5) * 0.28);
  const cy = rect.top + rect.height * (0.42 + (0.5 - effect.seed) * 0.24);
  const segments = sigilSegments(effect.kind || effect.id || String(effect.seed), 8);

  context.save();
  context.translate(cx, cy);
  context.globalAlpha = alpha * (0.32 + effect.strength * 0.34);
  context.strokeStyle = progress < 0.55 ? colors.seafoam : colors.gold;
  context.lineWidth = 0.75 + effect.strength * 0.8;
  context.shadowColor = colors.teal;
  context.shadowBlur = 6 * alpha;
  for (const segment of segments) {
    context.beginPath();
    context.moveTo((segment.x1 - 0.5) * radius * 2, (segment.y1 - 0.5) * radius * 2);
    context.lineTo((segment.x2 - 0.5) * radius * 2, (segment.y2 - 0.5) * radius * 2);
    context.stroke();
  }
  context.restore();
}

function drawTraceThread(effect, progress, alpha, colors) {
  const left = pageRect('left');
  const right = pageRect('right');
  if (!left || !right) return;
  const from = {
    x: left.left + left.width * (0.64 + (effect.seed - 0.5) * 0.2),
    y: left.top + left.height * (0.28 + effect.seed * 0.42),
  };
  const to = {
    x: right.left + right.width * (0.22 + (1 - effect.seed) * 0.26),
    y: right.top + right.height * (0.3 + (1 - effect.seed) * 0.38),
  };
  const midX = (from.x + to.x) * 0.5;
  const lift = Math.sin(progress * Math.PI) * 18;
  context.globalAlpha = alpha * (0.18 + effect.strength * 0.28);
  context.strokeStyle = effect.seed > 0.58 ? colors.lilac : colors.seafoam;
  context.lineWidth = 0.72 + effect.strength * 0.65;
  context.setLineDash([2.2, 5.4]);
  context.lineDashOffset = -progress * 18;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.bezierCurveTo(midX - 24, from.y - lift, midX + 24, to.y + lift, to.x, to.y);
  context.stroke();
  context.setLineDash([]);
}

function drawAfterimage(effect, progress, alpha, colors) {
  const points = Array.isArray(effect.points) ? effect.points : [];
  if (points.length < 2) return;
  context.globalAlpha = alpha * 0.22;
  context.strokeStyle = colors.seafoam;
  context.lineWidth = 0.8;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    context.lineTo(point.x, point.y - progress * 4.5);
  }
  context.stroke();
}

function drawEffects(now, colors) {
  const next = [];
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const effect of effects) {
    const progress = clamp01((now - effect.startedAt) / effect.durationMs);
    if (progress >= 1) continue;
    const alpha = fadeCurve(progress);
    if (effect.id.startsWith(ARTEFACT_EFFECTS.edgeGlint.id)) drawEdgeGlint(effect, progress, alpha, colors);
    else if (effect.id.startsWith(ARTEFACT_EFFECTS.pageWake.id)) drawPageWake(effect, progress, alpha, colors);
    else if (effect.id.startsWith(ARTEFACT_EFFECTS.glyphBloom.id)) drawGlyphBloom(effect, progress, alpha, colors);
    else if (effect.id.startsWith(ARTEFACT_EFFECTS.traceThread.id)) drawTraceThread(effect, progress, alpha, colors);
    else if (effect.id.startsWith(ARTEFACT_EFFECTS.afterimage.id)) drawAfterimage(effect, progress, alpha, colors);
    else if (effect.id.startsWith(ARTEFACT_EFFECTS.liquidInk.id)) drawEdgeGlint(effect, progress, alpha * 0.42, colors);
    next.push(effect);
  }
  context.restore();
  effects = next;
}

function frame(now) {
  raf = 0;
  if (!context || !canvas || !root || root.hidden || !document.body.contains(root)) {
    setMotionState(false);
    return;
  }
  const delta = lastFrameAt ? Math.min(42, Math.max(1, now - lastFrameAt)) : 16.67;
  lastFrameAt = now;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  context.clearRect(0, 0, width, height);
  const colors = palette();
  drawInk(now, delta, colors);
  drawEffects(now, colors);

  const running = shouldRunArtefactFrame({ effects: effects.length, ink: ink.length, pointerActive: pointerDown });
  setMotionState(running);
  if (running) raf = requestAnimationFrame(frame);
  else lastFrameAt = 0;
}

function eventEffect(detail = {}) {
  const effect = artefactEffectForReceipt(detail);
  pushEffect({ ...effect, seed: detail.traceId || detail.trace_id || detail.pageId || detail.page_id || detail.kind || effect.id, kind: detail.kind || effect.id });
}

function attentionEffect(event) {
  const snapshot = event.detail || {};
  const attention = Array.isArray(snapshot.attention) ? snapshot.attention : [];
  if (!attention.length) return;
  const signature = attention
    .slice(0, 4)
    .map((row) => row?.manifestation?.id || row?.manifestation?.traceId || row?.id || row?.traceId || '')
    .filter(Boolean)
    .join('|');
  if (!signature || signature === lastAttentionSignature) return;
  lastAttentionSignature = signature;
  pushEffect({ ...ARTEFACT_EFFECTS.traceThread, pageSide: 'both', strength: 0.58, seed: signature, kind: 'attention-memory' });
}

function pointerMove(event) {
  if (!stage || reducedMotion()) return;
  const side = sideForPoint(event.clientX, event.clientY);
  if (!side) {
    lastPointer = null;
    return;
  }
  const now = performance.now();
  const previous = lastPointer;
  const elapsed = previous ? Math.max(1, now - previous.at) : 16;
  const distance = previous ? Math.hypot(event.clientX - previous.x, event.clientY - previous.y) : 0;
  const velocity = Math.min(5000, distance / elapsed * 1000);
  const pressure = event.pointerType === 'pen'
    ? Math.max(0.08, event.pressure || 0.08)
    : event.pointerType === 'touch'
      ? Math.max(0.16, event.pressure || 0.22)
      : pointerDown ? 0.24 : 0.08;

  if (now - lastPointerSampleAt >= POINTER_SAMPLE_MS && (pointerDown || event.pointerType === 'pen' || velocity > 42)) {
    addInkParticle({
      clientX: event.clientX,
      clientY: event.clientY,
      pressure,
      velocity,
      seed: `${event.pointerId}:${Math.round(now / 28)}`,
      pageSide: side,
    });
    lastPointerSampleAt = now;
  }
  lastPointer = { x: event.clientX, y: event.clientY, at: now, side };
}

function pointerDownEvent(event) {
  pointerDown = true;
  pointerMove(event);
}

function pointerUpEvent() {
  pointerDown = false;
  if (lastPointer) {
    const host = stageRect();
    if (host) {
      const offset = contentOffset();
      pushEffect({
        ...ARTEFACT_EFFECTS.afterimage,
        pageSide: lastPointer.side,
        strength: 0.42,
        seed: `${lastPointer.x}:${lastPointer.y}:${lastPointer.at}`,
        kind: 'gesture-afterimage',
        points: [
          { x: lastPointer.x - host.left + offset.x - 12, y: lastPointer.y - host.top + offset.y + 4 },
          { x: lastPointer.x - host.left + offset.x - 4, y: lastPointer.y - host.top + offset.y },
          { x: lastPointer.x - host.left + offset.x + 6, y: lastPointer.y - host.top + offset.y - 3 },
        ],
      });
    }
  }
  lastPointer = null;
}

function clickEffect(event) {
  const target = event.target?.closest?.('button, [role="button"], a, [data-magic-book-page], [data-magic-book-nav]');
  if (!target) return;
  const rect = target.getBoundingClientRect?.();
  if (!rect) return;
  const side = sideForPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) || 'both';
  pushEffect({ ...ARTEFACT_EFFECTS.edgeGlint, pageSide: side, strength: 0.54, seed: target.textContent || target.getAttribute?.('aria-label') || 'control', kind: 'control-touch' });
}

function installEvents() {
  root.addEventListener('pointermove', pointerMove, { passive: true });
  root.addEventListener('pointerdown', pointerDownEvent, { passive: true });
  root.addEventListener('pointerup', pointerUpEvent, { passive: true });
  root.addEventListener('pointercancel', pointerUpEvent, { passive: true });
  root.addEventListener('click', clickEffect, { passive: true });
  globalThis.addEventListener('arcsweep:magic-book-receipt', onReceipt);
  globalThis.addEventListener('arcsweep:codex-motion', onCodexMotion);
  document.addEventListener('arcsweep:universal-codex-alive-changed', attentionEffect);
}

function removeEvents() {
  root?.removeEventListener('pointermove', pointerMove);
  root?.removeEventListener('pointerdown', pointerDownEvent);
  root?.removeEventListener('pointerup', pointerUpEvent);
  root?.removeEventListener('pointercancel', pointerUpEvent);
  root?.removeEventListener('click', clickEffect);
  globalThis.removeEventListener('arcsweep:magic-book-receipt', onReceipt);
  globalThis.removeEventListener('arcsweep:codex-motion', onCodexMotion);
  document.removeEventListener('arcsweep:universal-codex-alive-changed', attentionEffect);
}

function onReceipt(event) {
  eventEffect(event.detail || {});
}

function onCodexMotion(event) {
  const detail = event.detail || {};
  const kind = String(detail.kind || detail.family || 'event');
  if (detail.revelation === true || kind.includes('reveal')) {
    pushEffect({ ...ARTEFACT_EFFECTS.glyphBloom, pageSide: detail.pageSide || detail.page_side || 'right', strength: detail.strength ?? 0.82, seed: kind, kind });
    return;
  }
  eventEffect(detail);
}

function mount() {
  if (reducedMotion()) return;
  const found = document.getElementById(BOOK_ID);
  if (!found || found.dataset.codexArtefactMotionMounted === 'true') return;
  const foundStage = found.querySelector('.magic-book-stage');
  if (!foundStage) return;
  root = found;
  stage = foundStage;
  root.dataset.codexArtefactMotionMounted = 'true';
  root.dataset.codexArtefactMotion = 'quiet';
  canvas = document.createElement('canvas');
  canvas.className = CANVAS_CLASS;
  canvas.dataset.codexArtefactMotion = UNIVERSAL_CODEX_ARTEFACT_MOTION_SCHEMA;
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  resize();
  installEvents();
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
  }
}

function findAndMount() {
  if (!root || !document.body.contains(root)) mount();
}

findAndMount();
globalThis.addEventListener?.('arcsweep:magic-book-ready', findAndMount);

if ((!root || !document.body.contains(root)) && typeof MutationObserver !== 'undefined') {
  mountObserver = new MutationObserver(findAndMount);
  mountObserver.observe(document.body, { childList: true, subtree: true });
}

globalThis.__universalCodexArtefactMotion = Object.freeze({
  schema: UNIVERSAL_CODEX_ARTEFACT_MOTION_SCHEMA,
  liquidInk({ clientX, clientY, pressure = 0.35, velocity = 0, pageSide = null } = {}) {
    addInkParticle({ clientX, clientY, pressure, velocity, pageSide, seed: 'api' });
  },
  glint(pageSide = 'both', strength = 0.7) {
    pushEffect({ ...ARTEFACT_EFFECTS.edgeGlint, pageSide, strength, seed: 'api-glint', kind: 'manual-glint' });
  },
  reveal(pageSide = 'right', strength = 0.82, seed = 'revelation') {
    pushEffect({ ...ARTEFACT_EFFECTS.glyphBloom, pageSide, strength, seed, kind: 'manual-revelation' });
  },
  memoryThread(seed = 'memory-thread') {
    pushEffect({ ...ARTEFACT_EFFECTS.traceThread, pageSide: 'both', strength: 0.62, seed, kind: 'manual-memory' });
  },
  pageWake(pageSide = 'both', strength = 0.72) {
    pushEffect({ ...ARTEFACT_EFFECTS.pageWake, pageSide, strength, seed: 'api-page-wake', kind: 'manual-page-wake' });
  },
  quiet() {
    ink = [];
    effects = [];
    pointerDown = false;
    cancelAnimationFrame(raf);
    raf = 0;
    context?.clearRect?.(0, 0, canvas ? canvas.width / dpr : 0, canvas ? canvas.height / dpr : 0);
    setMotionState(false);
  },
});

globalThis.addEventListener?.('pagehide', () => {
  cancelAnimationFrame(raf);
  raf = 0;
  resizeObserver?.disconnect?.();
  mountObserver?.disconnect?.();
  removeEvents();
  canvas?.remove?.();
  canvas = null;
  context = null;
  root = null;
  stage = null;
}, { once: true });
