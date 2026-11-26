import { activeStorySoundscape } from './story-soundscape-singleton-bridge.js';

export const MUSIC_VISUALIZER_VERSION = 'arcsweep.music-visualizer/v1';
const MODES = Object.freeze(['spectrum', 'radial', 'kaleidoscope', 'cells']);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function installStyles() {
  if (document.querySelector('[data-music-visualizer-styles]')) return;
  const style = document.createElement('style');
  style.dataset.musicVisualizerStyles = MUSIC_VISUALIZER_VERSION;
  style.textContent = `
    .music-visualizer{display:grid;gap:.65rem;margin:.8rem 0;padding:.8rem;border:1px solid color-mix(in srgb,var(--accent,#c89b62) 38%,transparent);border-radius:1rem;background:linear-gradient(145deg,#101b19ee,#101311dd);color:var(--text,#f0eadb)}
    .music-visualizer__head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem}
    .music-visualizer__controls{display:flex;flex-wrap:wrap;gap:.4rem}
    .music-visualizer button{min-height:40px;padding:.45rem .7rem;border:1px solid #65786d;border-radius:.65rem;background:#17231f;color:inherit;font:inherit;cursor:pointer}
    .music-visualizer button[aria-pressed="true"]{border-color:var(--accent,#d8b56a);background:#293b33;color:#f5d995}
    .music-visualizer__stage{position:relative;overflow:hidden;min-height:180px;aspect-ratio:16/7;border-radius:.75rem;background:radial-gradient(ellipse at 50% 48%,#263b39,#080d0d 72%)}
    .music-visualizer canvas{display:block;width:100%;height:100%;min-height:180px}
    .music-visualizer__status{font-size:.78rem;opacity:.72}
    @media(prefers-reduced-motion:reduce){.music-visualizer canvas{image-rendering:auto}}
  `;
  document.head.append(style);
}

function drawSpectrum(ctx, data, width, height, time) {
  const count = Math.min(64, data.length);
  const gap = 3;
  const barWidth = Math.max(1, (width - gap * (count - 1)) / count);
  for (let i = 0; i < count; i++) {
    const value = data[i] / 255;
    const h = Math.max(2, value * height * .82);
    const x = i * (barWidth + gap);
    const hue = 155 + i / count * 95 + Math.sin(time * .0003 + i * .08) * 10;
    const gradient = ctx.createLinearGradient(0, height - h, 0, height);
    gradient.addColorStop(0, `hsla(${hue},82%,82%,.95)`);
    gradient.addColorStop(1, `hsla(${hue - 35},70%,42%,.22)`);
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 12;
    ctx.shadowColor = `hsla(${hue},90%,70%,.55)`;
    ctx.beginPath();
    ctx.roundRect(x, height - h, barWidth, h, Math.min(5, barWidth / 2));
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawRadial(ctx, data, width, height, time) {
  const cx = width / 2, cy = height / 2;
  const radius = Math.min(width, height) * .18;
  const count = Math.min(96, data.length);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * .00008);
  for (let i = 0; i < count; i++) {
    const angle = i / count * Math.PI * 2;
    const value = data[i] / 255;
    const inner = radius + value * Math.min(width, height) * .08;
    const outer = inner + 5 + value * Math.min(width, height) * .2;
    const hue = 165 + i / count * 110;
    ctx.strokeStyle = `hsla(${hue},80%,${62 + value * 25}%,.8)`;
    ctx.lineWidth = 1 + value * 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();
  ctx.shadowBlur = 0;
}

function drawKaleidoscope(ctx, data, width, height, time) {
  const cx = width / 2, cy = height / 2;
  const radius = Math.min(width, height) * .36;
  const count = 48;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * .00004);
  for (let i = 0; i < count; i++) {
    const value = data[i % data.length] / 255;
    const angle = i / count * Math.PI * 2;
    const r = radius * (.25 + value * .75);
    const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
    ctx.fillStyle = `hsla(${155 + i * 3.4},78%,${48 + value * 32}%,.58)`;
    ctx.shadowBlur = 14;
    ctx.shadowColor = ctx.fillStyle;
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + value * 12, 7 + value * 22, angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,245,230,.15)';
    ctx.stroke();
  }
  ctx.restore();
  ctx.shadowBlur = 0;
}

function drawCells(ctx, data, width, height, time) {
  const cols = 12, rows = 6;
  const cellW = width / cols, cellH = height / rows;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const index = (y * cols + x) % data.length;
    const value = data[index] / 255;
    const drift = Math.sin(time * .00025 + x * .7 + y * .9) * 4;
    const inset = 2 + value * 9;
    const hue = 155 + value * 95 + (x + y) * 2;
    ctx.fillStyle = `hsla(${hue},62%,${18 + value * 48}%,.78)`;
    ctx.strokeStyle = `hsla(${hue + 20},80%,80%,.38)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x * cellW + inset + drift, y * cellH + inset, cellW - inset * 2, cellH - inset * 2, 8 + value * 12);
    ctx.fill();
    ctx.stroke();
  }
}

function createPanel(host) {
  const panel = document.createElement('section');
  panel.className = 'music-visualizer';
  panel.dataset.musicVisualizer = MUSIC_VISUALIZER_VERSION;
  panel.innerHTML = `
    <div class="music-visualizer__head"><div><strong>Living Sound Visualiser</strong><div class="music-visualizer__status" data-visualizer-status>Waiting for the World Sound Mixer</div></div>
      <div class="music-visualizer__controls" role="group" aria-label="Visualisation style">
        ${MODES.map((mode) => `<button type="button" data-visualizer-mode="${mode}" aria-pressed="${mode === 'kaleidoscope'}">${mode[0].toUpperCase() + mode.slice(1)}</button>`).join('')}
      </div>
    </div>
    <div class="music-visualizer__stage"><canvas aria-label="Audio-reactive visualisation" role="img"></canvas></div>
  `;
  host.append(panel);
  return panel;
}

export function mountMusicVisualizer(host = document.querySelector('[data-story-soundscape]')) {
  if (!host || host.querySelector('[data-music-visualizer]')) return null;
  installStyles();
  const panel = createPanel(host);
  const canvas = panel.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const status = panel.querySelector('[data-visualizer-status]');
  let mode = 'kaleidoscope';
  let analyser = null;
  let buffer = null;
  let frame = 0;
  let disposed = false;
  const reducedMotion = () => document.documentElement.dataset.reduceMotion === 'true'
    || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

  panel.addEventListener('click', (event) => {
    const button = event.target.closest('[data-visualizer-mode]');
    if (!button) return;
    mode = button.dataset.visualizerMode;
    panel.querySelectorAll('[data-visualizer-mode]').forEach((node) => node.setAttribute('aria-pressed', String(node === button)));
  });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = clamp(globalThis.devicePixelRatio || 1, 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  function connectAnalyser() {
    const soundscape = activeStorySoundscape();
    if (!soundscape?.context || !soundscape?.master || analyser) return;
    analyser = soundscape.context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = .82;
    soundscape.master.connect(analyser);
    buffer = new Uint8Array(analyser.frequencyBinCount);
    status.textContent = 'Connected to the existing World Sound Mixer output';
  }

  function draw(time) {
    if (disposed) return;
    connectAnalyser();
    const rect = canvas.getBoundingClientRect();
    const width = rect.width, height = rect.height;
    ctx.fillStyle = 'rgba(5,12,12,.24)';
    ctx.fillRect(0, 0, width, height);
    if (analyser && buffer) {
      analyser.getByteFrequencyData(buffer);
      if (reducedMotion()) {
        ctx.globalAlpha = .8;
        drawSpectrum(ctx, buffer, width, height, 0);
        ctx.globalAlpha = 1;
      } else if (mode === 'spectrum') drawSpectrum(ctx, buffer, width, height, time);
      else if (mode === 'radial') drawRadial(ctx, buffer, width, height, time);
      else if (mode === 'cells') drawCells(ctx, buffer, width, height, time);
      else drawKaleidoscope(ctx, buffer, width, height, time);
    } else {
      const pulse = 1 + Math.sin(time * .001) * .025;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(pulse, pulse);
      const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, Math.min(width, height) * .32);
      gradient.addColorStop(0, 'rgba(220,198,135,.72)');
      gradient.addColorStop(.35, 'rgba(82,154,135,.24)');
      gradient.addColorStop(1, 'rgba(10,20,20,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(-width / 2, -height / 2, width, height);
      ctx.restore();
    }
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);

  return {
    panel,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (analyser) { try { analyser.disconnect(); } catch {} }
      panel.remove();
    },
  };
}

let mounted = null;
function boot() {
  if (mounted || !document.querySelector('[data-story-soundscape]')) return;
  mounted = mountMusicVisualizer();
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  const observer = new MutationObserver(boot);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  globalThis.addEventListener?.('beforeunload', () => { observer.disconnect(); mounted?.dispose(); }, { once: true });
}
