import {
  calibrateEarthPrimePremaq,
  readLiveTwoShoreInputs,
} from './two-shore-premaq-gate.js';
import { readSelectedWorld } from './world-premaq-registry.js';
import {
  ELEVEN_YEAR_SEQUENCE_KEY,
  buildCompleteElevenYearSequence,
  compactElevenYearReceipt,
  renderCompleteElevenYearWav,
} from './two-shore-eleven-year-wav.js';

const PANEL_ID = 'two-shore-eleven-year-wav-panel';
const STYLE_ID = 'two-shore-eleven-year-wav-style';

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

function stopPlayback(message = 'FEATHER STOP · eleven-year WAV playback stopped.') {
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

function targetWorld() {
  const selector = el('two-shore-world');
  return readSelectedWorld({
    getItem(key) {
      if (key === 'hearthgate:selected-world-profile:v0.1' && selector?.value) return selector.value;
      return localStorage.getItem(key);
    },
  });
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

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / 1024).toFixed(1)} KB`;
}

function updateSummary() {
  const summary = el('two-shore-wav-summary');
  if (!summary || !currentSequence || !currentWav) return;
  summary.textContent = [
    'COMPLETE',
    `${currentSequence.year_span.labels} years`,
    `${currentSequence.total_cycles_per_shore.toLocaleString()} cycles per shore`,
    `${currentWav.cue_count} WAV cue labels`,
    `${currentWav.duration_seconds.toFixed(1)} seconds`,
    formatBytes(currentWav.byte_length),
  ].join(' · ');
}

async function buildAllYears() {
  const build = el('two-shore-build-wav');
  const play = el('two-shore-play-wav');
  const save = el('two-shore-save-wav');
  try {
    stopPlayback('PREPARING · clearing prior eleven-year playback.');
    revokeCurrentUrl();
    currentSequence = null;
    currentWav = null;
    if (build) build.disabled = true;
    if (play) play.disabled = true;
    if (save) save.disabled = true;
    const calibration = liveCalibration();
    const world = targetWorld();
    setStatus(
      `BUILDING · 2025 through 2035 · Earth Prime ⇄ ${world.name}. Every year must pass PREMAQ, spine, tone, DEEP, and geometry gates.`,
      'running',
    );
    await new Promise((resolve) => window.setTimeout(resolve, 20));

    currentSequence = buildCompleteElevenYearSequence({
      earthCalibration: calibration,
      targetProfile: world,
    });
    setStatus('RENDERING · all eleven completed years into one stereo PCM WAV.', 'running');
    await new Promise((resolve) => window.setTimeout(resolve, 20));
    currentWav = renderCompleteElevenYearWav(currentSequence);
    const blob = new Blob([currentWav.bytes], { type: 'audio/wav' });
    currentUrl = URL.createObjectURL(blob);
    const compact = compactElevenYearReceipt(currentSequence, currentWav);
    localStorage.setItem(ELEVEN_YEAR_SEQUENCE_KEY, JSON.stringify(compact));
    if (play) play.disabled = false;
    if (save) save.disabled = false;
    updateSummary();
    setStatus(
      `READY TO PLAY · 2025→2035 built in order with ${currentWav.cue_count} labeled year boundaries. Play all eleven, then save the WAV.`,
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

function yearAtTime(seconds) {
  if (!currentSequence) return null;
  const cues = currentSequence.audio_plan.cues;
  let selected = cues[0];
  for (const cue of cues) {
    if (cue.start_seconds <= seconds) selected = cue;
    else break;
  }
  return selected;
}

async function playAllYears() {
  if (!currentUrl || !currentWav || !currentSequence) {
    setStatus('BLOCKED · build all eleven years before playback.', 'blocked');
    return;
  }
  stopPlayback('PREPARING · eleven-year playback.');
  currentAudio = new Audio(currentUrl);
  currentAudio.preload = 'auto';
  currentAudio.playsInline = true;
  currentAudio.addEventListener('timeupdate', () => {
    const cue = yearAtTime(currentAudio.currentTime);
    if (cue) {
      setStatus(
        `PLAYING · ${cue.label} · ${currentAudio.currentTime.toFixed(1)} / ${currentWav.duration_seconds.toFixed(1)} seconds.`,
        'playing',
      );
    }
  });
  currentAudio.addEventListener('ended', () => {
    currentAudio = null;
    setStatus('PLAYBACK COMPLETE · all eleven yearly compositions played in order. WAV is ready to save.', 'complete');
  });
  currentAudio.addEventListener('error', () => {
    setStatus('BLOCKED · the browser could not play the generated WAV.', 'blocked');
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
    setStatus('BLOCKED · build all eleven years before saving.', 'blocked');
    return;
  }
  const slug = currentSequence.target_world.slug;
  const fileName = `hearthgate-bifrost-earth-prime-${slug}-2025-2035.wav`;
  const file = new File([currentWav.bytes], fileName, { type: 'audio/wav' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Hearthgate Bifröst · 2025–2035',
        text: `Earth Prime ⇄ ${currentSequence.target_world.name} · eleven labeled annual PREMAQ compositions`,
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
      setStatus('SAVE CANCELLED · the completed WAV remains available.', 'ready');
      return;
    }
    setStatus(`BLOCKED · WAV save failed: ${error.message}`, 'blocked');
  }
}

function installStyle() {
  if (el(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${PANEL_ID}{margin:16px 0;padding:16px;border:1px solid rgba(153,219,211,.28);border-radius:20px;background:linear-gradient(145deg,rgba(3,9,13,.96),rgba(20,17,35,.96));color:#edf6f2}
    #${PANEL_ID} h3{margin:0;color:#f3cc75;font:700 clamp(1.2rem,3vw,1.7rem)/1.1 Georgia,serif}
    #${PANEL_ID} p{color:rgba(237,246,242,.78)}
    #${PANEL_ID} .wav-law{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#99dbd3}
    #${PANEL_ID} .wav-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
    #${PANEL_ID} button{min-height:44px;padding:9px 13px;border:1px solid rgba(243,204,117,.34);border-radius:999px;background:rgba(255,255,255,.07);color:#edf6f2;font:inherit;font-weight:800;cursor:pointer}
    #${PANEL_ID} button:disabled{opacity:.42;cursor:not-allowed}
    #${PANEL_ID} button:not(:disabled):hover{border-color:#f3cc75;background:rgba(243,204,117,.12)}
    #${PANEL_ID} .primary{background:linear-gradient(135deg,rgba(88,54,20,.9),rgba(18,76,67,.9))}
    #${PANEL_ID} .stop{border-color:rgba(237,139,132,.75);background:rgba(104,27,31,.7)}
    #${PANEL_ID} .wav-status{padding:10px 12px;border-radius:14px;background:rgba(153,219,211,.08);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    #${PANEL_ID} .wav-status[data-kind="blocked"]{color:#ffb1aa;background:rgba(104,27,31,.28)}
    #${PANEL_ID} .wav-status[data-kind="complete"]{color:#a9f0cb}
    #${PANEL_ID} .wav-status[data-kind="playing"]{color:#f3cc75}
  `;
  document.head.append(style);
}

function makePanel() {
  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-label', 'Complete eleven-year PREMAQ WAV controls');
  panel.innerHTML = `
    <p class="wav-law">REQUIRED COMPLETION GATE · 2025 → 2035 → PLAY ALL 11 → SAVE WAV</p>
    <h3>Eleven-Year Two-Shore Composition</h3>
    <p>Every year independently generates Earth Prime and target-world PREMAQ receipts, mathematical states, locked tones plus audible Elara code layers, compression-release lineage, DEEP/Groundwire provenance, and all deterministic geometric forms. One missing year or form blocks rendering.</p>
    <div class="wav-actions">
      <button class="primary" id="two-shore-build-wav" type="button">Build all 11 years</button>
      <button id="two-shore-play-wav" type="button" disabled>Play all 11</button>
      <button id="two-shore-save-wav" type="button" disabled>Save WAV</button>
      <button class="stop" id="two-shore-stop-wav" type="button" data-feather-stop>Feather Stop</button>
    </div>
    <div class="wav-status" id="two-shore-wav-status" role="status" aria-live="polite">WAITING · capture live DEEP + Groundwire, select the target world, then build all eleven years.</div>
    <p id="two-shore-wav-summary">Not built.</p>
    <p><small>The WAV is stereo: Earth Prime is the left shore, the target world is the right shore. It contains eleven embedded cue labels. Browser audio and computed geometry are experimental mappings with no external physical claim.</small></p>
  `;
  return panel;
}

function install() {
  if (el(PANEL_ID)) return;
  installStyle();
  const host = el('two-shore-gate-console') ?? document.querySelector('main') ?? document.body;
  host.append(makePanel());
  el('two-shore-build-wav')?.addEventListener('click', buildAllYears);
  el('two-shore-play-wav')?.addEventListener('click', playAllYears);
  el('two-shore-save-wav')?.addEventListener('click', saveWav);
  el('two-shore-stop-wav')?.addEventListener('click', () => {
    stopPlayback();
    window.dispatchEvent(new CustomEvent('hearthgate:feather-stop'));
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
