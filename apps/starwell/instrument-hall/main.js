import {
  EPISTEMIC_MODES,
  createInstrumentState,
  standingWavePlan,
  supplantWithObservation,
} from '../src/instrument-hall/math-spine.js';
import {
  TERRA_AETERNA_INSTRUMENT_PROFILE,
  profileCalibration,
  profileObservationSource,
  profileStandingWaveCalibration,
} from '../src/instrument-hall/instrument-profile.js';
import { BifrostRuntime } from '../src/instrument-hall/bifrost-runtime.js';
import { TypingToneAudio, TypingWeaveSession } from '../src/instrument-hall/typing-tones.js';

const profile = TERRA_AETERNA_INSTRUMENT_PROFILE;
const bridge = new BifrostRuntime();
const audio = new TypingToneAudio({ profile });
const $ = (selector) => document.querySelector(selector);

function calibratedState({ radius = 0, cycle = 0 } = {}) {
  return createInstrumentState({
    premaq: profile.baseline_premaq,
    observation: profileObservationSource(profile),
    calibration: profileCalibration(profile),
    houseId: profile.house_id,
    radius,
    cycle,
  });
}

let state = calibratedState();
let wavePlan = standingWavePlan(state, profileStandingWaveCalibration(profile));
let session = new TypingWeaveSession({ state, profile, bridge });
let lastCompleted = null;

function numeric(value, digits = 2) {
  return Number(value).toFixed(digits);
}

function sourceMode() {
  const modes = new Set(Object.values(state.observation.axes).map((axis) => axis.provenance.mode));
  return [...modes].join(' / ');
}

function renderState(message = '') {
  const ratio = state.tension_limit ? state.tension / state.tension_limit : 0;
  document.documentElement.style.setProperty('--tension', String(Math.max(0, Math.min(1, ratio))));
  document.body.dataset.phase = state.phase;
  $('#state-mode').textContent = sourceMode();
  $('#state-phase').textContent = state.phase.toUpperCase();
  $('#state-basis').textContent = state.basis_id;
  $('#state-radius').textContent = numeric(bridge.radius, 0);
  $('#state-cycle').textContent = String(state.cycle);
  $('#tension-value').textContent = `${numeric(state.tension, 3)} / ${numeric(state.tension_limit, 3)}`;
  $('#tension-meter').value = ratio;
  $('#source-status').textContent = message || `${sourceMode()} · ${profile.name}`;
  $('#premaq-grid').replaceChildren(...Object.entries(state.premaq).map(([axis, value]) => {
    const item = document.createElement('div');
    item.className = 'axis';
    item.innerHTML = `<strong>${axis}</strong><span>${numeric(value, 3)}</span>`;
    return item;
  }));
  renderSpiral();
}

function renderSpiral() {
  const canvas = $('#spiral');
  const context = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 520;
  const height = canvas.clientHeight || 360;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  const ratio = state.tension_limit ? state.tension / state.tension_limit : 0;
  const compression = state.phase === 'collapse' ? 0.68 : 1 - ratio * 0.22;
  const turns = 3 + Math.min(bridge.radius * 0.16, 7);
  const maxRadius = Math.min(width, height) * 0.43 * compression;
  const styles = [
    ['rgba(134,197,216,.92)', 0],
    ['rgba(224,164,92,.92)', Math.PI],
  ];
  context.lineWidth = 2;
  for (const [stroke, offset] of styles) {
    context.beginPath();
    for (let index = 0; index <= 480; index += 1) {
      const fraction = index / 480;
      const angle = offset + fraction * turns * Math.PI * 2;
      const radius = fraction * maxRadius;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius * 0.66;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = stroke;
    context.stroke();
  }
  context.beginPath();
  context.arc(cx, cy, 7 + ratio * 8, 0, Math.PI * 2);
  context.fillStyle = 'rgba(229,198,125,.96)';
  context.shadowColor = 'rgba(229,198,125,.8)';
  context.shadowBlur = 22 + ratio * 28;
  context.fill();
  context.shadowBlur = 0;
}

function renderCompleted(completed) {
  if (!completed) return;
  lastCompleted = completed;
  $('#measured-copy').textContent = completed.mythience.measured.summary;
  $('#felt-copy').textContent = completed.mythience.felt.summary;
  $('#mythience-class').textContent = completed.mythience.classification;
  $('#mythience-mechanism').textContent = completed.mythience.mythient.mechanism_status;
  $('#mythience-copy').textContent = completed.mythience.mythient.wonder;
  $('#mythience-boundary').textContent = completed.mythience.boundary;
  $('#last-receipt').textContent = completed.crossing.receipt_id;
  renderLineage();
}

function renderLineage() {
  const list = $('#lineage');
  if (!bridge.lineage.length) {
    list.innerHTML = '<li class="empty">No crossings remembered yet.</li>';
    return;
  }
  list.replaceChildren(...[...bridge.lineage].reverse().map((crossing) => {
    const item = document.createElement('li');
    item.innerHTML = `<strong>${crossing.index}. r=${crossing.radius}</strong><span>${crossing.seed}</span><small>${crossing.receipt_id}</small>`;
    return item;
  }));
}

async function connectObserver() {
  $('#connect-observer').disabled = true;
  $('#source-status').textContent = 'LISTENING · contacting the Observer…';
  const candidates = [
    '/api/observer/rowan',
    'http://127.0.0.1:3841/api/observer/rowan',
  ];
  let lastError = null;
  for (const endpoint of candidates) {
    try {
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const payload = await response.json();
      if (!payload.ok || !payload.vectors) throw new Error(payload.error || 'Observer did not return vectors.');
      for (const axis of ['P', 'C', 'R', 'E', 'M', 'A', 'Q']) {
        if (!Number.isFinite(Number(payload.vectors[axis]))) throw new Error(`Observer vector ${axis} is absent.`);
      }
      const observedAt = new Date(payload.collected_utc || Date.now()).toISOString();
      const observation = {
        mode: EPISTEMIC_MODES.OBSERVED,
        source_id: String(payload.source || 'Observer Glyph Laboratory'),
        observed_at: observedAt,
        confidence: 1,
        receipt_id: `observer-rowan-${observedAt}`,
        derivation: 'Direct local read from the latest Rowan/Earth observation record.',
      };
      state = supplantWithObservation(state, {
        premaq: payload.vectors,
        observation,
        calibration: profileCalibration(profile),
      });
      wavePlan = standingWavePlan(state, profileStandingWaveCalibration(profile));
      session.replaceState(state);
      renderState(`OBSERVED · ${payload.source} · ${observedAt}`);
      $('#connect-observer').disabled = false;
      return;
    } catch (error) {
      lastError = error;
    }
  }
  $('#connect-observer').disabled = false;
  renderState(`CALIBRATED · Observer resting · ${lastError?.message || 'no local observation'}`);
}

async function handleCharacter(character) {
  const result = await session.ingestCharacter(character);
  if (!result) return;
  state = result.state;
  await audio.play(result.event.category);
  renderState();
  if (result.completed) {
    renderCompleted(result.completed);
    void audio.answer();
  }
}

function downloadJson(name, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function awaken() {
  await bridge.awaken();
  state = calibratedState({ radius: bridge.radius, cycle: bridge.lineage.length });
  wavePlan = standingWavePlan(state, profileStandingWaveCalibration(profile));
  session = new TypingWeaveSession({ state, profile, bridge });
  renderLineage();
  renderState('CALIBRATED · ready to be supplanted by the local Observer');
  $('#tone-plan').textContent = [
    `Measured key ${wavePlan.frequencies_hz.anchor} Hz`,
    `Word ${wavePlan.frequencies_hz.living} Hz`,
    `Bind ${wavePlan.frequencies_hz.bind} Hz`,
    `Pulse ${wavePlan.pulse_hz} Hz`,
    `Gain ceiling ${wavePlan.gain_ceiling}`,
  ].join(' · ');
}

$('#light-hall').addEventListener('click', async () => {
  try {
    const result = await audio.light();
    $('#audio-status').textContent = `LIT · ${result.sample_rate} Hz audio context · explicit activation`;
    $('#light-hall').disabled = true;
    $('#feather-stop').disabled = false;
    $('#typing-hearth').focus();
  } catch (error) {
    $('#audio-status').textContent = `RESTING · ${error.message}`;
  }
});

$('#feather-stop').addEventListener('click', async () => {
  await audio.featherStop();
  $('#audio-status').textContent = 'FEATHER STOP · all voices closed';
  $('#light-hall').disabled = false;
  $('#feather-stop').disabled = true;
});

$('#answering-voice').addEventListener('change', (event) => {
  audio.setAnsweringVoice(event.target.checked);
});

$('#typing-hearth').addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const character = event.key === 'Enter' ? '\n' : (event.key.length === 1 ? event.key : null);
  if (character) {
    void handleCharacter(character).catch((error) => {
      $('#audio-status').textContent = `DEGRADED · ${error.message}`;
    });
  }
});

$('#connect-observer').addEventListener('click', () => void connectObserver());

$('#forget-lineage').addEventListener('click', async () => {
  await bridge.forget();
  state = calibratedState();
  session = new TypingWeaveSession({ state, profile, bridge });
  lastCompleted = null;
  $('#typing-hearth').value = '';
  $('#measured-copy').textContent = 'No released phrase yet.';
  $('#felt-copy').textContent = 'The Felt shore is waiting.';
  $('#mythience-class').textContent = 'WAITING';
  $('#mythience-mechanism').textContent = '—';
  $('#mythience-copy').textContent = 'Wonder appears where a measured event and lived meaning meet without reduction.';
  $('#last-receipt').textContent = '—';
  renderLineage();
  renderState('CALIBRATED · lineage released · exits remain open');
});

$('#export-session').addEventListener('click', () => {
  downloadJson(`hearthgate-instrument-session-${new Date().toISOString().replaceAll(':', '-')}.json`, {
    schema: 'hearthgate.instrument-session-export/v1',
    exported_at: new Date().toISOString(),
    profile,
    wave_plan: wavePlan,
    typing: session.snapshot(),
    bifrost: bridge.snapshot(),
    last_mythience: lastCompleted?.mythience || null,
  });
});

$('#launch-python').addEventListener('click', async () => {
  if (!window.electronAPI?.launchBifrostTerminal) {
    $('#python-status').textContent = 'The Python bridge is bundled with the Windows House; launch is available inside the installed desktop app.';
    return;
  }
  const result = await window.electronAPI.launchBifrostTerminal();
  $('#python-status').textContent = result.ok
    ? `OPEN · ${result.command}`
    : `RESTING · ${result.error}`;
});

window.addEventListener('resize', renderSpiral);
window.addEventListener('beforeunload', () => void audio.featherStop());

void awaken().catch((error) => {
  $('#source-status').textContent = `DEGRADED · ${error.message}`;
});
