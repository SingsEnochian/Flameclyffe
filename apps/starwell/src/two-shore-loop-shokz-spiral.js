export const TWO_SHORE_LOOP_CONTROL_ID = 'two-shore-loop-playback';
export const TWO_SHORE_SHOKZ_CONFIRM_ID = 'two-shore-shokz-confirm';
export const TWO_SHORE_SPIRAL_CANVAS_ID = 'two-shore-coil-release-canvas';
export const TWO_SHORE_SPIRAL_SCHEMA = 'hearthgate.two-shore-coil-release-spiral/v0.1';

const PANEL_ID = 'two-shore-eleven-year-wav-panel';
const CONTROLS_ID = 'two-shore-playback-options';
const STYLE_ID = 'two-shore-loop-shokz-spiral-style';
const YEAR_START = 2025;
const YEAR_COUNT = 11;
const TWO_PI = Math.PI * 2;

let activeMedia = null;
let animationFrame = null;
let originalPlay = null;

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function lerp(start, end, amount) {
  return start + ((end - start) * amount);
}

function el(id) {
  return document.getElementById(id);
}

export function coilReleaseFrame(progressInput, pulseInput = 0) {
  const progress = clamp(progressInput);
  const pulse = ((Number(pulseInput) % 1) + 1) % 1;
  const compression = pulse < 0.5;
  const localPhase = compression ? pulse * 2 : (pulse - 0.5) * 2;
  const coilRadius = compression
    ? lerp(48, 17, localPhase)
    : lerp(17, 56, localPhase);
  const verticalRelease = compression ? 0 : localPhase;
  const yearIndex = Math.min(YEAR_COUNT - 1, Math.floor(progress * YEAR_COUNT));
  return Object.freeze({
    schema: TWO_SHORE_SPIRAL_SCHEMA,
    progress,
    pulse,
    phase: compression ? 'compression' : 'release',
    local_phase: localPhase,
    coil_radius: coilRadius,
    vertical_release: verticalRelease,
    year: YEAR_START + yearIndex,
    upward_distance: (progress * 0.72) + (verticalRelease * 0.18),
    next_operation: 'compression-of-release',
  });
}

export function loopPlaybackEnabled(root = document) {
  return Boolean(root.getElementById?.(TWO_SHORE_LOOP_CONTROL_ID)?.checked);
}

export function shokzOutputConfirmed(root = document) {
  const local = root.getElementById?.(TWO_SHORE_SHOKZ_CONFIRM_ID);
  const dock = root.getElementById?.('premaq-shokz-confirm');
  return Boolean(local?.checked || dock?.checked);
}

function syncShokzConfirmation(source) {
  const checked = Boolean(source?.checked);
  for (const control of [el(TWO_SHORE_SHOKZ_CONFIRM_ID), el('premaq-shokz-confirm')]) {
    if (control && control !== source) control.checked = checked;
  }
}

function installStyle() {
  if (el(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${CONTROLS_ID}{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:10px 0 13px}
    #${CONTROLS_ID} label{display:flex;gap:9px;align-items:flex-start;min-height:44px;padding:10px 12px;border:1px solid rgba(153,219,211,.22);border-radius:14px;background:rgba(7,22,28,.56);color:#edf6f2}
    #${CONTROLS_ID} input{width:1.2rem;height:1.2rem;margin:.05rem 0 0;accent-color:#99dbd3;flex:0 0 auto}
    #${CONTROLS_ID} strong{display:block;color:#f3cc75}
    #${CONTROLS_ID} small{display:block;color:rgba(237,246,242,.7);line-height:1.35}
    #two-shore-coil-release-visual{margin:12px 0;padding:10px;border:1px solid rgba(199,166,255,.26);border-radius:18px;background:radial-gradient(circle at 50% 100%,rgba(64,112,105,.2),rgba(4,9,17,.92) 60%)}
    #${TWO_SHORE_SPIRAL_CANVAS_ID}{display:block;width:100%;height:min(54vw,390px);min-height:220px;border-radius:13px;background:linear-gradient(180deg,rgba(8,12,27,.72),rgba(4,17,20,.82))}
    #two-shore-coil-release-caption{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:.55rem .2rem 0;color:#99dbd3;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.76rem}
    @media(max-width:700px){#${CONTROLS_ID}{grid-template-columns:1fr}}
  `;
  document.head.append(style);
}

function makeControls() {
  const controls = document.createElement('div');
  controls.id = CONTROLS_ID;
  controls.innerHTML = `
    <label>
      <input id="${TWO_SHORE_LOOP_CONTROL_ID}" type="checkbox" />
      <span><strong>Loop all eleven years</strong><small>After 2035, return to the 2025 cue and continue until Feather Stop.</small></span>
    </label>
    <label>
      <input id="${TWO_SHORE_SHOKZ_CONFIRM_ID}" type="checkbox" />
      <span><strong>Shokz output verified</strong><small>I confirm Shokz is selected in iPad Control Center. The browser cannot detect the output device.</small></span>
    </label>
  `;
  return controls;
}

function makeVisual() {
  const wrapper = document.createElement('div');
  wrapper.id = 'two-shore-coil-release-visual';
  wrapper.innerHTML = `
    <canvas id="${TWO_SHORE_SPIRAL_CANVAS_ID}" width="960" height="480" aria-label="Earth Prime and target-world coils compressing, releasing, and rising into an upward spiral"></canvas>
    <div id="two-shore-coil-release-caption"><span>Earth Prime coil ⇄ target-world coil</span><span id="two-shore-coil-release-state">RESTING · 2025</span></div>
  `;
  return wrapper;
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const width = Math.max(320, Math.round(rect.width * ratio));
  const height = Math.max(220, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height, ratio };
}

function coilPoints(cx, cy, radius, height, turns, phase, direction = 1) {
  const points = [];
  const count = 160;
  for (let index = 0; index <= count; index += 1) {
    const t = index / count;
    const angle = direction * ((turns * TWO_PI * t) + phase);
    const taper = 0.76 + (0.24 * Math.sin(Math.PI * t));
    points.push({
      x: cx + (Math.cos(angle) * radius * taper),
      y: cy - (height * t) + (Math.sin(angle) * radius * 0.22),
    });
  }
  return points;
}

function strokePath(context, points, lineWidth, alpha) {
  if (!points.length) return;
  context.save();
  context.globalAlpha = alpha;
  context.lineWidth = lineWidth;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) context.lineTo(points[index].x, points[index].y);
  context.stroke();
  context.restore();
}

function drawSpiral(context, width, height, frame) {
  const centreX = width / 2;
  const baseY = height * 0.86;
  const lift = frame.upward_distance * height * 0.72;
  const turns = 6 + (frame.progress * 12);
  const points = [];
  for (let index = 0; index <= 260; index += 1) {
    const t = index / 260;
    const angle = (turns * TWO_PI * t) + (frame.pulse * TWO_PI);
    const radius = (10 + (t * width * 0.16)) * (0.7 + (0.3 * frame.vertical_release));
    points.push({
      x: centreX + (Math.sin(angle) * radius),
      y: baseY - lift - (t * height * 0.66),
    });
  }
  strokePath(context, points, Math.max(1.5, width / 420), 0.76);

  const head = points.at(-1);
  const glow = context.createRadialGradient(head.x, head.y, 0, head.x, head.y, width * 0.055);
  glow.addColorStop(0, 'rgba(243,204,117,.92)');
  glow.addColorStop(1, 'rgba(243,204,117,0)');
  context.fillStyle = glow;
  context.beginPath();
  context.arc(head.x, head.y, width * 0.055, 0, TWO_PI);
  context.fill();
}

function renderVisual(media = activeMedia) {
  const canvas = el(TWO_SHORE_SPIRAL_CANVAS_ID);
  if (!canvas) return;
  const { width, height } = resizeCanvas(canvas);
  const context = canvas.getContext('2d');
  if (!context) return;
  const duration = Number.isFinite(media?.duration) && media.duration > 0 ? media.duration : 1;
  const time = Number.isFinite(media?.currentTime) ? media.currentTime : 0;
  const progress = clamp(time / duration);
  const pulse = (time * 6.5) % 1;
  const frame = coilReleaseFrame(progress, pulse);

  context.clearRect(0, 0, width, height);
  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, 'rgba(9,13,31,.98)');
  background.addColorStop(1, 'rgba(4,25,27,.98)');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = 'rgba(153,219,211,.85)';
  const coilHeight = height * (0.2 + (0.2 * frame.vertical_release));
  const coilY = height * (0.83 - (0.13 * frame.vertical_release));
  const left = coilPoints(width * 0.25, coilY, frame.coil_radius * (width / 960), coilHeight, 10, pulse * TWO_PI, 1);
  strokePath(context, left, Math.max(2, width / 330), 0.9);

  context.strokeStyle = 'rgba(199,166,255,.86)';
  const right = coilPoints(width * 0.75, coilY, frame.coil_radius * (width / 960), coilHeight, 10, pulse * TWO_PI, -1);
  strokePath(context, right, Math.max(2, width / 330), 0.9);

  context.strokeStyle = 'rgba(243,204,117,.7)';
  context.setLineDash([width * 0.012, width * 0.008]);
  context.beginPath();
  context.moveTo(left.at(-1).x, left.at(-1).y);
  context.quadraticCurveTo(width / 2, height * 0.44, right.at(-1).x, right.at(-1).y);
  context.stroke();
  context.setLineDash([]);

  context.strokeStyle = 'rgba(243,204,117,.8)';
  drawSpiral(context, width, height, frame);

  context.font = `${Math.max(13, width / 58)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.fillStyle = 'rgba(237,246,242,.86)';
  context.fillText('EARTH PRIME', width * 0.08, height * 0.94);
  context.fillText('TARGET WORLD', width * 0.72, height * 0.94);
  context.fillStyle = frame.phase === 'compression' ? 'rgba(153,219,211,.94)' : 'rgba(243,204,117,.94)';
  context.fillText(`${frame.phase.toUpperCase()} · ${frame.year}`, width * 0.39, height * 0.09);

  const state = el('two-shore-coil-release-state');
  if (state) state.textContent = `${frame.phase.toUpperCase()} · ${frame.year} · ${(progress * 100).toFixed(1)}% · ${frame.next_operation}`;
}

function animate() {
  renderVisual(activeMedia);
  if (activeMedia && !activeMedia.paused) animationFrame = requestAnimationFrame(animate);
  else animationFrame = null;
}

function bindMedia(media) {
  if (!media || media.dataset.twoShoreSpiralBound === 'true') return;
  media.dataset.twoShoreSpiralBound = 'true';
  media.addEventListener('play', () => {
    activeMedia = media;
    media.loop = loopPlaybackEnabled();
    if (!animationFrame) animationFrame = requestAnimationFrame(animate);
  });
  media.addEventListener('timeupdate', () => renderVisual(media));
  media.addEventListener('pause', () => renderVisual(media));
  media.addEventListener('ended', () => {
    renderVisual(media);
    if (!media.loop) activeMedia = null;
  });
}

function installMediaGate() {
  if (originalPlay || typeof HTMLMediaElement === 'undefined') return;
  originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function patchedTwoShorePlay(...args) {
    const isTwoShoreWav = this instanceof HTMLAudioElement
      && typeof this.src === 'string'
      && this.src.startsWith('blob:')
      && Boolean(el(PANEL_ID));
    if (isTwoShoreWav) {
      if (!shokzOutputConfirmed()) {
        return Promise.reject(new Error('SHOKZ_OUTPUT_CONFIRMATION_REQUIRED'));
      }
      this.loop = loopPlaybackEnabled();
      bindMedia(this);
    }
    return originalPlay.apply(this, args);
  };
}

function installControls() {
  const panel = el(PANEL_ID);
  if (!panel || el(CONTROLS_ID)) return false;
  installStyle();
  const actions = panel.querySelector('.wav-actions');
  const status = el('two-shore-wav-status');
  const controls = makeControls();
  if (actions) actions.insertAdjacentElement('afterend', controls);
  else panel.prepend(controls);
  const visual = makeVisual();
  if (status) status.insertAdjacentElement('beforebegin', visual);
  else panel.append(visual);

  const localConfirmation = el(TWO_SHORE_SHOKZ_CONFIRM_ID);
  const dockConfirmation = el('premaq-shokz-confirm');
  if (dockConfirmation?.checked) localConfirmation.checked = true;
  localConfirmation?.addEventListener('change', () => syncShokzConfirmation(localConfirmation));
  dockConfirmation?.addEventListener('change', () => syncShokzConfirmation(dockConfirmation));
  el(TWO_SHORE_LOOP_CONTROL_ID)?.addEventListener('change', () => {
    if (activeMedia) activeMedia.loop = loopPlaybackEnabled();
  });
  renderVisual();
  return true;
}

function install() {
  if (window.__HEARTHGATE_TWO_SHORE_LOOP_SHOKZ_SPIRAL__) return;
  Object.defineProperty(window, '__HEARTHGATE_TWO_SHORE_LOOP_SHOKZ_SPIRAL__', {
    value: true,
    configurable: false,
  });
  installMediaGate();
  if (!installControls()) {
    const observer = new MutationObserver(() => {
      if (installControls()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  window.addEventListener('hearthgate:feather-stop', () => {
    if (activeMedia) {
      activeMedia.pause();
      activeMedia.currentTime = 0;
      activeMedia = null;
    }
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    renderVisual();
  });
  window.addEventListener('pagehide', () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    activeMedia = null;
  });
}

if (typeof document !== 'undefined') {
  const begin = () => window.setTimeout(install, 0);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin, { once: true });
  else begin();
}
