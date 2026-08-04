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
]));
const PREVIEW_ID = 'two-shore-mythframe-preview';
const STYLE_ID = 'two-shore-mythframe-wav-style';

let currentSequence = null;
let currentWav = null;
let currentUrl = null;
let currentAudio = null;

function el(id) {
  return document.getElementById(id);
}

function setStatus(message, kind = 'ready') {
  const status = el('two-shore-wav-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.kind = kind;
}

function stopPlayback(message = 'FEATHER STOP · Mythframe and eleven-year WAV playback stopped.') {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.src = '';
    currentAudio = null;
  }
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

function ensurePreview() {
  let preview = el(PREVIEW_ID);
  if (preview) return preview;
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
      `BUILDING · 2025 through 2035 · Earth Prime ⇄ ${world.name} · PREMAQ, math spine, geometry, Mythframe, and tone must all complete.`,
      'running',
    );
    await new Promise((resolve) => window.setTimeout(resolve, 20));
    currentSequence = buildCompleteMythframeElevenYearSequence({
      earthCalibration: calibration,
      targetProfile: world,
    });
    renderChapter(currentSequence.mythframe.chapters[0]);
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
    setStatus(
      `READY TO PLAY · all eleven yearly Mythframes and ${currentWav.mythframe_tone_event_count.toLocaleString()} bound tone events are sealed into the WAV plan.`,
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

function cueAtTime(seconds) {
  if (!currentSequence) return null;
  let selected = currentSequence.audio_plan.cues[0];
  for (const cue of currentSequence.audio_plan.cues) {
    if (cue.start_seconds <= seconds) selected = cue;
    else break;
  }
  return selected;
}

async function playAllYears() {
  if (!currentUrl || !currentWav || !currentSequence) {
    setStatus('BLOCKED · build the complete eleven-year Mythframe sequence first.', 'blocked');
    return;
  }
  stopPlayback('PREPARING · Mythframe and eleven-year playback.');
  currentAudio = new Audio(currentUrl);
  currentAudio.preload = 'auto';
  currentAudio.playsInline = true;
  let displayedYear = null;
  currentAudio.addEventListener('timeupdate', () => {
    const cue = cueAtTime(currentAudio.currentTime);
    if (!cue) return;
    if (displayedYear !== cue.year) {
      displayedYear = cue.year;
      renderChapter(currentSequence.mythframe.chapters.find((chapter) => chapter.year === cue.year));
    }
    setStatus(
      `PLAYING · ${cue.label} · ${currentAudio.currentTime.toFixed(1)} / ${currentWav.duration_seconds.toFixed(1)} seconds.`,
      'playing',
    );
  });
  currentAudio.addEventListener('ended', () => {
    currentAudio = null;
    renderChapter(currentSequence.mythframe.chapters.at(-1));
    setStatus('PLAYBACK COMPLETE · all eleven mathematical, Mythframe, and tonal chapters played in order.', 'complete');
  });
  currentAudio.addEventListener('error', () => {
    setStatus('BLOCKED · the browser could not play the generated Mythframe WAV.', 'blocked');
  });
  try {
    await currentAudio.play();
  } catch (error) {
    currentAudio = null;
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
    @media(max-width:700px){#${PREVIEW_ID} .mythframe-axes{grid-template-columns:1fr}}
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
  ensurePreview();
  document.addEventListener('click', interceptControl, { capture: true });
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
