import { normaliseCodexAnimationState } from './universal-codex-animation-model.js';

const MAX_SPARKS = 24;
const SPARK_LIFETIME = 420;

// Two physically bounded surfaces: the colophon well and the drawing leaf.
// There is intentionally no stage-space renderer, orbital geometry or scanline
// plane. Legacy preferences cannot bring back an overlay across the text.
export function createLocalCodexProjection(canvas, root, initialState) {
  const context = canvas.getContext('2d');
  const motion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce), (hover: none), (pointer: coarse), (max-width: 1180px)');
  let state = normaliseCodexAnimationState(initialState);
  let inkCanvas = null;
  let inkSource = null;
  let inkContext = null;
  let sparks = [];
  let pulseUntil = 0;
  let raf = 0;
  let destroyed = false;

  function allowed() {
    return !destroyed && !root.hidden && !document.hidden && !motion?.matches;
  }

  function clearInk() {
    sparks = [];
    inkContext?.clearRect(0, 0, inkCanvas.width, inkCanvas.height);
  }

  function removeInk() {
    clearInk();
    inkCanvas?.remove();
    inkCanvas = inkSource = inkContext = null;
  }

  function surface(target, ctx, width, height) {
    const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
    const pixelsWide = Math.max(1, Math.round(width * ratio));
    const pixelsHigh = Math.max(1, Math.round(height * ratio));
    if (target.width !== pixelsWide || target.height !== pixelsHigh) {
      target.width = pixelsWide;
      target.height = pixelsHigh;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
  }

  function draw(now = performance.now()) {
    raf = 0;
    if (!context || destroyed) return;
    const width = canvas.clientWidth || 112;
    const height = canvas.clientHeight || 44;
    surface(canvas, context, width, height);
    if (!allowed()) {
      pulseUntil = 0;
      clearInk();
      return;
    }

    if (state.holograms) {
      const pulse = Math.max(0, Math.min(1, (pulseUntil - now) / 700));
      // A warm pin of light seated on a stamped colophon, not a floating HUD.
      const x = width / 2;
      const y = height * .65;
      const breath = state.orbit ? Math.sin(now / 180) * pulse : 0;
      context.strokeStyle = `rgba(181,143,78,${.16 + state.intensity * .16})`;
      context.lineWidth = .7;
      context.beginPath();
      context.moveTo(x - 28, y);
      context.lineTo(x - 7, y);
      context.moveTo(x + 7, y);
      context.lineTo(x + 28, y);
      context.stroke();
      const glow = context.createRadialGradient(x, y - 3, 0, x, y - 3, 12);
      glow.addColorStop(0, `rgba(214,169,86,${.08 + state.intensity * .12 + pulse * .09})`);
      glow.addColorStop(1, 'rgba(214,169,86,0)');
      context.fillStyle = glow;
      context.fillRect(x - 12, y - 15, 24, 24);
      context.fillStyle = `rgba(222,188,116,${.24 + state.intensity * .22})`;
      context.beginPath();
      context.moveTo(x, y - 8 - pulse * 4 - breath);
      context.lineTo(x + 2.5, y - 1);
      context.lineTo(x, y + 2);
      context.lineTo(x - 2.5, y - 1);
      context.closePath();
      context.fill();
    }

    if (inkSource && (!inkSource.isConnected || !root.contains(inkSource))) removeInk();
    if (inkContext && inkSource) {
      const width = inkSource.clientWidth;
      const height = inkSource.clientHeight;
      // Match the actual drawing canvas, including after resize and page turns.
      inkCanvas.style.left = `${inkSource.offsetLeft}px`;
      inkCanvas.style.top = `${inkSource.offsetTop}px`;
      inkCanvas.style.width = `${width}px`;
      inkCanvas.style.height = `${height}px`;
      surface(inkCanvas, inkContext, width, height);
      sparks = sparks.filter((spark) => now - spark.born < SPARK_LIFETIME);
      if (state.inkAura) for (const spark of sparks) {
        const age = Math.max(0, (now - spark.born) / SPARK_LIFETIME);
        inkContext.fillStyle = `rgba(220,191,129,${(1 - age) * (.12 + state.intensity * .2)})`;
        inkContext.beginPath();
        inkContext.arc(spark.x * width, spark.y * height - age * 3, 1 + spark.energy, 0, Math.PI * 2);
        inkContext.fill();
      }
    }
    if ((state.holograms && pulseUntil > now) || sparks.length) raf = requestAnimationFrame(draw);
  }

  function refresh() {
    cancelAnimationFrame(raf);
    raf = 0;
    draw();
  }

  function addInkSpark(point) {
    if (!context || !state.inkAura || !allowed()) return;
    const source = root.querySelector('[data-magic-glyph-canvas]');
    if (!source || !source.clientWidth || !source.clientHeight) return;
    if (source !== inkSource) {
      removeInk();
      inkSource = source;
      inkCanvas = document.createElement('canvas');
      inkCanvas.className = 'universal-codex-fx universal-codex-ink-fx';
      inkCanvas.setAttribute('aria-hidden', 'true');
      source.parentElement.append(inkCanvas);
      inkContext = inkCanvas.getContext('2d');
      if (!inkContext) { removeInk(); return; }
    }
    sparks.push({ ...point, born: performance.now() });
    sparks = sparks.slice(-MAX_SPARKS);
    refresh();
  }

  function applyState(next) {
    state = normaliseCodexAnimationState(next);
    if (!state.inkAura) clearInk();
    refresh();
  }

  const visibility = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => {
    if (!allowed()) { pulseUntil = 0; clearInk(); }
    if (inkSource && !inkSource.isConnected) removeInk();
    refresh();
  });
  visibility?.observe(root, { attributes: true, attributeFilter: ['hidden'], childList: true, subtree: true });
  document.addEventListener('visibilitychange', refresh);
  motion?.addEventListener?.('change', refresh);
  refresh();

  return {
    mode: context ? 'page-local' : 'fallback',
    addInkSpark,
    applyState,
    resize: refresh,
    pulse(data) {
      if (!allowed() || !state.holograms) return;
      // Ink has its own exact origin. Other receipts wake only the margin wick.
      if (data?.family === 'ink') return;
      pulseUntil = performance.now() + 700;
      refresh();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      visibility?.disconnect();
      document.removeEventListener('visibilitychange', refresh);
      motion?.removeEventListener?.('change', refresh);
      removeInk();
      context?.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
