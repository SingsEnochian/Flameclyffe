import {
  calibrateEarthPrimePremaq,
  readLiveTwoShoreInputs,
} from './two-shore-premaq-gate.js';
import { readSelectedWorld } from './world-premaq-registry.js';
import { ELEVEN_YEAR_SEQUENCE_KEY } from './two-shore-eleven-year-wav.js';
import {
  buildCompleteMythframeElevenYearSequence,
  compactMythframeElevenYearReceipt,
  renderCompleteMythframeElevenYearWav,
} from './two-shore-mythframe-wav.js';

const CONTROL_IDS = Object.freeze(new Set([
  'two-shore-build-wav',
  'two-shore-play-wav',
  'two-shore-save-wav',
  'two-shore-stop-wav',
  'two-shore-verify-shokz',
]));
const PREVIEW_ID = 'two-shore-mythframe-preview';
const STYLE_ID = 'two-shore-mythframe-wav-style';
const LOOP_ID = 'two-shore-loop-wav';
const SHOKZ_STATE_ID = 'two-shore-shokz-state';
const VISUAL_ID = 'two-shore-coil-release-visual';
const VISUAL_CANVAS_ID = 'two-shore-coil-release-canvas';
const SHOKZ_CONFIRM_ID = 'premaq-shokz-confirm';
const AXIS_COLOURS = Object.freeze({
  P: '#f3cc75',
  C: '#99dbd3',
  R: '#d8c6ff',
  E: '#ffb1aa',
  M: '#a9f0cb',
  A: '#ffc88f',
  Q: '#eab7ff',
});

let currentSequence = null;
let currentWav = null;
let currentUrl = null;
let currentAudio = null;
let animationFrameId = null;
let lastPlaybackSecond = 0;
let loopCount = 0;

function el(id) {
  return document.getElementById(id);
}

function setStatus(message, kind = 'ready') {
  const status = el('two-shore-wav-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.kind = kind;
}

function loopEnabled() {
  return Boolean(el(LOOP_ID)?.checked);
}

function shokzConfirmation() {
  return el(SHOKZ_CONFIRM_ID);
}

function shokzVerified() {
  return Boolean(shokzConfirmation()?.checked);
}

function updateShokzState() {
  const state = el(SHOKZ_STATE_ID);
  if (!state) return;
  const verified = shokzVerified();
  state.textContent = verified
    ? 'SHOKZ VERIFIED · user-confirmed output'
    : 'SHOKZ UNVERIFIED · confirmation required before playback';
  state.dataset.verified = String(verified);
}

function openShokzVerification() {
  const confirm = shokzConfirmation();
  if (!confirm) {
    setStatus('BLOCKED · the Shokz verification dock is not available on this page.', 'blocked');
    return false;
  }
  const details = confirm.closest('details');
  if (details) details.open = true;
  confirm.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  confirm.focus?.({ preventScroll: true });
  updateShokzState();
  if (confirm.checked) {
    setStatus('SHOKZ VERIFIED · manual iPad output confirmation is active.', 'complete');
    return true;
  }
  setStatus('VERIFY SHOKZ · select Shokz as the iPad audio output, then tick the confirmation box in the sound dock.', 'blocked');
  return false;
}

function stopAnimation() {
  if (animationFrameId != null) cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
}

function stopPlayback(message = 'FEATHER STOP · Mythframe and eleven-year WAV playback stopped.') {
  stopAnimation();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.src = '';
    currentAudio = null;
  }
  lastPlaybackSecond = 0;
  loopCount = 0;
  drawCoilRelease({ progress: 0, phase: 'resting', axis: 'C', year: 2025 });
  setStatus(message, 'stopped');
}

function revokeCurrentUrl() {
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = null;
}

function liveCalibration() {
  const live = readLiveTwoShoreInputs(sessionStorage);
  if (!live.live_ready) {
    throw new Error(`LIVE_DATA_REQUIRED:DEEP_${live.deep_present ? 'PRESENT' : 'MISSING'}:GROUNDWIRE_${live.groundwire_present ? 'PRESENT' : 'MISSING'}`);
  }
  return calibrateEarthPrimePremaq({
    deepPacket: live.deep_packet,
    groundwireSnapshot: live.groundwire_snapshot,
  });
}

function targetWorld() {
  const selector = el('two-shore-world');
  return readSelectedWorld({
    getItem(key) {
      if (key === 'hearthgate:selected-world-profile:v0.1' && selector?.value) return selector.value;
      return localStorage.getItem(key);
    },
  });
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  return value >= 1024 * 1024
    ? `${(value / (1024 * 1024)).toFixed(1)} MB`
    : `${(value / 1024).toFixed(1)} KB`;
}

function ensurePlaybackControls() {
  const panel = el('two-shore-eleven-year-wav-panel');
  const actions = panel?.querySelector('.wav-actions');
  if (!panel || !actions || el(LOOP_ID)) return;

  const verify = document.createElement('button');
  verify.id = 'two-shore-verify-shokz';
  verify.type = 'button';
  verify.textContent = 'Verify Shokz';
  actions.insertBefore(verify, el('two-shore-stop-wav'));

  const options = document.createElement('div');
  options.className = 'mythframe-playback-options';
  options.innerHTML = `
    <label class="mythframe-loop-control">
      <input id="${LOOP_ID}" type="checkbox" />
      <span>Loop all eleven years</span>
    </label>
    <span id="${SHOKZ_STATE_ID}" class="mythframe-shokz-state" data-verified="false">SHOKZ UNVERIFIED · confirmation required before playback</span>
  `;
  actions.insertAdjacentElement('afterend', options);
  el(LOOP_ID)?.addEventListener('change', () => {
    if (currentAudio) currentAudio.loop = loopEnabled();
    setStatus(
      loopEnabled()
        ? 'LOOP ENABLED · playback will return from the 2035 release to the 2025 compression source.'
        : 'LOOP DISABLED · playback will stop after the 2035 release.',
      'ready',
    );
  });
  updateShokzState();
}

function ensureVisual(preview) {
  let visual = el(VISUAL_ID);
  if (visual) return visual;
  visual = document.createElement('section');
  visual.id = VISUAL_ID;
  visual.setAttribute('aria-label', 'Coil compression, release, and upward spiral animation');
  visual.innerHTML = `
    <div class="coil-visual-heading">
      <strong>COIL → RELEASE → UPWARD SPIRAL</strong>
      <span id="two-shore-coil-release-caption">Resting · C · 2025</span>
    </div>
    <canvas id="${VISUAL_CANVAS_ID}" width="900" height="420"></canvas>
    <p>The lower coil tightens during compression. Its carried release rises without reset as the next outward spiral.</p>
  `;
  preview.insertBefore(visual, preview.querySelector('.mythframe-axes'));
  drawCoilRelease({ progress: 0, phase: 'resting', axis: 'C', year: 2025 });
  return visual;
}

function ensurePreview() {
  let preview = el(PREVIEW_ID);
  if (preview) {
    ensureVisual(preview);
    return preview;
  }
  preview = document.createElement('article');
  preview.id = PREVIEW_ID;
  preview.innerHTML = `
    <p class="mythframe-law">MATH STATE → MYTHFRAME → TONE EVENT</p>
    <h4>Mythframe is waiting for the eleven-year build.</h4>
    <p class="mythframe-opening">Each shore will speak from its generated PREMAQ, mathematical spine, geometry, and exact tone bindings.</p>
    <p class="mythframe-bridge"></p>
    <p class="mythframe-closing"></p>
    <div class="mythframe-axes" aria-label="Mythframe PREMAQ axis phrases"></div>
  `;
  const summary = el('two-shore-wav-summary');
  summary?.insertAdjacentElement('afterend', preview);
  ensureVisual(preview);
  return preview;
}

function renderChapter(chapter) {
  if (!chapter) return;
  const preview = ensurePreview();
  preview.querySelector('h4').textContent = `${chapter.year} · Earth Prime ⇄ ${chapter.target_world.name}`;
  preview.querySelector('.mythframe-opening').textContent = chapter.opening_line;
  preview.querySelector('.mythframe-bridge').textContent = chapter.bridge.line;
  preview.querySelector('.mythframe-closing').textContent = chapter.closing_line;
  const axes = preview.querySelector('.mythframe-axes');
  axes.replaceChildren(...Object.keys(chapter.earth_prime.axes).map((axis) => {
    const earth = chapter.earth_prime.axes[axis];
    const target = chapter.target_world.axes[axis];
    const item = document.createElement('details');
    item.innerHTML = `
      <summary>${axis} · ${earth.axis_name} · ${earth.tone.locked_hz.toFixed(3)} Hz ⇄ ${target.tone.locked_hz.toFixed(3)} Hz</summary>
      <p><strong>Earth Prime:</strong> ${earth.full_line}</p>
      <p><strong>${chapter.target_world.name}:</strong> ${target.full_line}</p>
    `;
    return item;
  }));
}

function updateSummary() {
  const summary = el('two-shore-wav-summary');
  if (!summary || !currentSequence || !currentWav) return;
  summary.textContent = [
    'COMPLETE',
    `${currentSequence.year_span.labels} years`,
    `${currentSequence.total_cycles_per_shore.toLocaleString()} cycles per shore`,
    `${currentSequence.mythframe.chapter_count} Mythframe chapters`,
    `${currentSequence.mythframe.axis_frame_count} shore-axis frames`,
    `${currentWav.mythframe_tone_event_count.toLocaleString()} framed tone events`,
    `${currentWav.duration_seconds.toFixed(1)} seconds`,
    formatBytes(currentWav.byte_length),
  ].join(' · ');
}

function eventAtTime(seconds) {
  const events = currentSequence?.audio_plan?.events;
  if (!events?.length) return null;
  let low = 0;
  let high = events.length - 1;
  let selected = events[0];
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const event = events[middle];
    if (event.start_seconds <= seconds) {
      selected = event;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return selected;
}

function cueAtTime(seconds) {
  if (!currentSequence) return null;
  let selected = currentSequence.audio_plan.cues[0];
  for (const cue of currentSequence.audio_plan.cues) {
    if (cue.start_seconds <= seconds) selected = cue;
    else break;
  }
  return selected;
}

function drawPath(context, points) {
  if (!points.length) return;
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index][0], points[index][1]);
  }
  context.stroke();
}

function drawCoilRelease({ progress, phase, axis, year }) {
  const canvas = el(VISUAL_CANVAS_ID);
  const caption = el('two-shore-coil-release-caption');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const width = canvas.clientWidth || 900;
  const height = canvas.clientHeight || 420;
  const pixelWidth = Math.round(width * ratio);
  const pixelHeight = Math.round(height * ratio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const safeProgress = Math.min(1, Math.max(0, Number(progress) || 0));
  const compression = safeProgress < 0.5 ? safeProgress * 2 : 1;
  const release = safeProgress <= 0.5 ? 0 : (safeProgress - 0.5) * 2;
  const colour = AXIS_COLOURS[axis] || AXIS_COLOURS.C;
  const centerX = width / 2;
  const groundY = height * 0.78;
  const coilRadius = Math.max(18, width * (0.13 - (0.07 * compression)));
  const coilHeight = Math.max(10, height * (0.11 - (0.055 * compression)));

  const gradient = context.createLinearGradient(0, height, 0, 0);
  gradient.addColorStop(0, 'rgba(153,219,211,.08)');
  gradient.addColorStop(0.55, 'rgba(216,198,255,.16)');
  gradient.addColorStop(1, 'rgba(243,204,117,.06)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = 'rgba(255,255,255,.08)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(width * 0.08, groundY + 24);
  context.lineTo(width * 0.92, groundY + 24);
  context.stroke();

  const coilPoints = [];
  const coilTurns = 7;
  for (let index = 0; index <= 180; index += 1) {
    const t = (index / 180) * Math.PI * 2 * coilTurns;
    const envelope = 0.78 + (0.22 * Math.sin((index / 180) * Math.PI));
    coilPoints.push([
      centerX + (Math.cos(t) * coilRadius * envelope),
      groundY + (Math.sin(t) * coilHeight) - (release * 12),
    ]);
  }
  context.save();
  context.shadowColor = colour;
  context.shadowBlur = 12 + (compression * 18);
  context.strokeStyle = colour;
  context.globalAlpha = 0.78 + (compression * 0.22);
  context.lineWidth = 2.5 + (compression * 2.5);
  drawPath(context, coilPoints);
  context.restore();

  const spiralPoints = [];
  const visibleTurns = 4.8 * release;
  const samples = Math.max(1, Math.floor(240 * release));
  for (let index = 0; index <= samples; index += 1) {
    const u = index / Math.max(1, samples);
    const t = u * Math.PI * 2 * visibleTurns;
    const radius = 4 + (u * width * 0.2);
    const rise = u * height * 0.66;
    spiralPoints.push([
      centerX + (Math.sin(t) * radius),
      groundY - rise + (Math.cos(t) * radius * 0.18),
    ]);
  }
  context.save();
  context.shadowColor = colour;
  context.shadowBlur = 18;
  context.strokeStyle = colour;
  context.globalAlpha = 0.92;
  context.lineWidth = 3;
  drawPath(context, spiralPoints);
  context.restore();

  if (spiralPoints.length) {
    const [tipX, tipY] = spiralPoints.at(-1);
    const pulse = 5 + (Math.sin(performance.now() / 120) * 2);
    context.beginPath();
    context.arc(tipX, tipY, Math.max(2, pulse * release), 0, Math.PI * 2);
    context.fillStyle = colour;
    context.shadowColor = colour;
    context.shadowBlur = 22;
    context.fill();
    context.shadowBlur = 0;
  }

  context.font = '700 14px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.fillStyle = 'rgba(237,246,242,.9)';
  context.fillText(`${year} · ${axis} · ${phase.toUpperCase()}`, 18, 28);
  context.font = '500 12px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.fillStyle = 'rgba(237,246,242,.62)';
  context.fillText(
    release > 0
      ? `release carried upward ${(release * 100).toFixed(0)}%`
      : `compression ${(compression * 100).toFixed(0)}%`,
    18,
    48,
  );
  if (caption) caption.textContent = `${phase} · ${axis} · ${year}`;
}

function animationStep() {
  if (!currentAudio || !currentSequence) {
    animationFrameId = null;
    return;
  }
  const seconds = currentAudio.currentTime;
  if (currentAudio.loop && seconds + 0.1 < lastPlaybackSecond) {
    loopCount += 1;
    renderChapter(currentSequence.mythframe.chapters[0]);
  }
  lastPlaybackSecond = seconds;
  const event = eventAtTime(seconds);
  const cue = cueAtTime(seconds);
  if (event) {
    const duration = Math.max(0.000001, event.duration_seconds);
    const progress = Math.min(1, Math.max(0, (seconds - event.start_seconds) / duration));
    const phase = progress < 0.5 ? 'compression' : 'release';
    drawCoilRelease({ progress, phase, axis: event.axis, year: event.year });
  }
  if (cue) {
    const chapter = currentSequence.mythframe.chapters.find((candidate) => candidate.year === cue.year);
    const heading = ensurePreview().querySelector('h4');
    if (chapter && heading?.textContent?.startsWith(String(cue.year)) === false) renderChapter(chapter);
  }
  animationFrameId = requestAnimationFrame(animationStep);
}

function startAnimation() {
  stopAnimation();
  animationFrameId = requestAnimationFrame(animationStep);
}

async function buildAllYears() {
  const build = el('two-shore-build-wav');
  const play = el('two-shore-play-wav');
  const save = el('two-shore-save-wav');
  try {
    stopPlayback('PREPARING · clearing the prior Mythframe and eleven-year playback.');
    revokeCurrentUrl();
    currentSequence = null;
    currentWav = null;
    if (build) build.disabled = true;
    if (play) play.disabled = true;
    if (save) save.disabled = true;
    const calibration = liveCalibration();
    const world = targetWorld();
    setStatus(
      `BUILDING · 2025 through 2035 · Earth Prime ⇄ ${world.name} · live PREMAQ, math spine, geometry, Mythframe, tone, and visual lineage must all complete.`,
      'running',
    );
    await new Promise((resolve) => window.setTimeout(resolve, 20));
    currentSequence = buildCompleteMythframeElevenYearSequence({
      earthCalibration: calibration,
      targetProfile: world,
    });
    renderChapter(currentSequence.mythframe.chapters[0]);
    drawCoilRelease({ progress: 0, phase: 'ready', axis: 'P', year: 2025 });
    setStatus('RENDERING · every tone event has passed through its state-bound Mythframe.', 'running');
    await new Promise((resolve) => window.setTimeout(resolve, 20));
    currentWav = renderCompleteMythframeElevenYearWav(currentSequence);
    const blob = new Blob([currentWav.bytes], { type: 'audio/wav' });
    currentUrl = URL.createObjectURL(blob);
    const compact = compactMythframeElevenYearReceipt(currentSequence, currentWav);
    localStorage.setItem(ELEVEN_YEAR_SEQUENCE_KEY, JSON.stringify(compact));
    if (play) play.disabled = false;
    if (save) save.disabled = false;
    updateSummary();
    updateShokzState();
    setStatus(
      `READY TO PLAY · all eleven Mythframes, ${currentWav.mythframe_tone_event_count.toLocaleString()} bound tone events, and the coil-release visual are prepared.`,
      'complete',
    );
  } catch (error) {
    currentSequence = null;
    currentWav = null;
    revokeCurrentUrl();
    setStatus(`BLOCKED · ${error.message}`, 'blocked');
  } finally {
    if (build) build.disabled = false;
  }
}

async function playAllYears() {
  if (!currentUrl || !currentWav || !currentSequence) {
    setStatus('BLOCKED · build the complete eleven-year Mythframe sequence first.', 'blocked');
    return;
  }
  if (!shokzVerified()) {
    openShokzVerification();
    return;
  }
  stopAnimation();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.src = '';
  }
  currentAudio = new Audio(currentUrl);
  currentAudio.preload = 'auto';
  currentAudio.playsInline = true;
  currentAudio.loop = loopEnabled();
  lastPlaybackSecond = 0;
  loopCount = 0;
  let displayedYear = null;
  currentAudio.addEventListener('timeupdate', () => {
    const cue = cueAtTime(currentAudio.currentTime);
    if (!cue) return;
    if (displayedYear !== cue.year) {
      displayedYear = cue.year;
      renderChapter(currentSequence.mythframe.chapters.find((chapter) => chapter.year === cue.year));
    }
    const loopText = currentAudio.loop ? ` · loop ${loopCount + 1}` : '';
    setStatus(
      `PLAYING · ${cue.label}${loopText} · ${currentAudio.currentTime.toFixed(1)} / ${currentWav.duration_seconds.toFixed(1)} seconds.`,
      'playing',
    );
  });
  currentAudio.addEventListener('ended', () => {
    stopAnimation();
    currentAudio = null;
    renderChapter(currentSequence.mythframe.chapters.at(-1));
    drawCoilRelease({ progress: 1, phase: 'release', axis: 'Q', year: 2035 });
    setStatus('PLAYBACK COMPLETE · all eleven mathematical, Mythframe, tonal, and visual chapters played in order.', 'complete');
  });
  currentAudio.addEventListener('error', () => {
    stopAnimation();
    setStatus('BLOCKED · the browser could not play the generated Mythframe WAV.', 'blocked');
  });
  try {
    await currentAudio.play();
    startAnimation();
  } catch (error) {
    currentAudio = null;
    stopAnimation();
    setStatus(`BLOCKED · playback requires a deliberate browser gesture: ${error.message}`, 'blocked');
  }
}

async function saveWav() {
  if (!currentWav || !currentSequence) {
    setStatus('BLOCKED · build the complete eleven-year Mythframe sequence before saving.', 'blocked');
    return;
  }
  const slug = currentSequence.target_world.slug;
  const fileName = `hearthgate-bifrost-mythframe-earth-prime-${slug}-2025-2035.wav`;
  const file = new File([currentWav.bytes], fileName, { type: 'audio/wav' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Hearthgate Bifröst Mythframe · 2025–2035',
        text: `Earth Prime ⇄ ${currentSequence.target_world.name} · eleven state-bound Mythframe and PREMAQ compositions`,
      });
      setStatus(`SAVED / SHARED · ${fileName}`, 'complete');
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = currentUrl;
    anchor.download = fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setStatus(`SAVE REQUESTED · ${fileName}`, 'complete');
  } catch (error) {
    if (error?.name === 'AbortError') {
      setStatus('SAVE CANCELLED · the completed Mythframe WAV remains available.', 'ready');
      return;
    }
    setStatus(`BLOCKED · Mythframe WAV save failed: ${error.message}`, 'blocked');
  }
}

function installStyle() {
  if (el(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${PREVIEW_ID}{margin:12px 0;padding:14px;border:1px solid rgba(199,166,255,.32);border-radius:18px;background:linear-gradient(145deg,rgba(20,12,35,.78),rgba(7,28,33,.82))}
    #${PREVIEW_ID} h4{margin:.2rem 0 .7rem;color:#f3cc75;font:700 clamp(1.1rem,3vw,1.55rem)/1.15 Georgia,serif}
    #${PREVIEW_ID} p{line-height:1.55}
    #${PREVIEW_ID} .mythframe-law{color:#99dbd3;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.76rem;letter-spacing:.08em}
    #${PREVIEW_ID} .mythframe-bridge{color:#d8c6ff}
    #${PREVIEW_ID} .mythframe-closing{color:#a9f0cb}
    #${PREVIEW_ID} .mythframe-axes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
    #${PREVIEW_ID} details{padding:8px 10px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(0,0,0,.18)}
    #${PREVIEW_ID} summary{cursor:pointer;color:#f3cc75;font-weight:750}
    #${PREVIEW_ID} details p{margin:.55rem 0 0;font-size:.8rem}
    .mythframe-playback-options{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:8px 0 12px;padding:9px 11px;border-radius:14px;background:rgba(153,219,211,.07);border:1px solid rgba(153,219,211,.16)}
    .mythframe-loop-control{display:inline-flex;gap:8px;align-items:center;color:#edf6f2;font-weight:750}
    .mythframe-loop-control input{width:1.15rem;height:1.15rem;accent-color:#99dbd3}
    .mythframe-shokz-state{font:700 .72rem/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;color:#ffb1aa}
    .mythframe-shokz-state[data-verified="true"]{color:#a9f0cb}
    #${VISUAL_ID}{margin:14px 0;padding:12px;border:1px solid rgba(153,219,211,.22);border-radius:16px;background:rgba(0,0,0,.22);overflow:hidden}
    #${VISUAL_ID} .coil-visual-heading{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;color:#99dbd3;font:700 .72rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em}
    #${VISUAL_ID} canvas{display:block;width:100%;height:min(46vw,340px);min-height:220px;margin-top:8px;border-radius:12px;background:#050b11}
    #${VISUAL_ID} p{margin:.65rem 0 0;color:rgba(237,246,242,.7);font-size:.78rem}
    @media(max-width:700px){#${PREVIEW_ID} .mythframe-axes{grid-template-columns:1fr}}
    @media(prefers-reduced-motion:reduce){#${VISUAL_ID} canvas{opacity:.82}}
  `;
  document.head.append(style);
}

function interceptControl(event) {
  const control = event.target instanceof Element
    ? event.target.closest('button')
    : null;
  if (!control || !CONTROL_IDS.has(control.id)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (control.id === 'two-shore-build-wav') buildAllYears();
  if (control.id === 'two-shore-play-wav') playAllYears();
  if (control.id === 'two-shore-save-wav') saveWav();
  if (control.id === 'two-shore-verify-shokz') openShokzVerification();
  if (control.id === 'two-shore-stop-wav') {
    stopPlayback();
    window.dispatchEvent(new CustomEvent('hearthgate:feather-stop'));
  }
}

function install() {
  if (window.__HEARTHGATE_MYTHFRAME_WAV_UI__) return;
  Object.defineProperty(window, '__HEARTHGATE_MYTHFRAME_WAV_UI__', {
    value: true,
    configurable: false,
  });
  installStyle();
  ensurePlaybackControls();
  ensurePreview();
  document.addEventListener('click', interceptControl, { capture: true });
  document.addEventListener('change', (event) => {
    if (event.target?.id === SHOKZ_CONFIRM_ID) updateShokzState();
  });
  window.addEventListener('resize', () => {
    if (!currentAudio) drawCoilRelease({ progress: 0, phase: 'resting', axis: 'C', year: 2025 });
  });
  window.addEventListener('hearthgate:feather-stop', () => stopPlayback());
  window.addEventListener('pagehide', () => {
    stopPlayback('FEATHER STOP · page hidden.');
    revokeCurrentUrl();
  });
}

if (typeof document !== 'undefined') {
  const begin = () => window.setTimeout(install, 0);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin, { once: true });
  else begin();
}
