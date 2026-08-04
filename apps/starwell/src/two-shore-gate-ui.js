import {
  DEEP_SESSION_KEY,
  GATE_LOCKED_TONE_AXES,
  GROUNDWIRE_SESSION_KEY,
  TWO_SHORE_GATE_PLAN_KEY,
  buildFullHorizonGatePlan,
  buildYearGatePlan,
  calibrateEarthPrimePremaq,
  listSelectableGateWorlds,
  readLiveTwoShoreInputs,
} from './two-shore-premaq-gate.js';
import {
  ELARA_EXPANSION_HORIZON,
  readSelectedWorld,
  writeSelectedWorld,
} from './world-premaq-registry.js';

const PANEL_ID = 'two-shore-gate-console';
const STYLE_ID = 'two-shore-gate-console-style';
const LIVE_CONSOLE_URL = '/starwell/deep-groundwire-mobius.html';
const MASTER_GAIN = 0.012;

let audioContext = null;
let audioNodes = [];
let currentCompactPlan = null;
let currentEarthCalibration = null;
let currentYearPlan = null;

function el(id) {
  return document.getElementById(id);
}

function stopAudio(message = 'FEATHER STOP · gate preview silenced.') {
  for (const node of audioNodes) {
    try { node.stop?.(); } catch { /* already stopped */ }
    try { node.disconnect?.(); } catch { /* already disconnected */ }
  }
  audioNodes = [];
  if (audioContext) {
    const context = audioContext;
    audioContext = null;
    context.close().catch(() => {});
  }
  setStatus(message, 'stopped');
}

function setStatus(message, kind = 'ready') {
  const status = el('two-shore-gate-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.kind = kind;
}

function setProgress(value) {
  const progress = el('two-shore-gate-progress');
  if (progress) progress.value = Math.min(1, Math.max(0, Number(value) || 0));
}

function short(value, length = 16) {
  const text = String(value ?? 'UNKNOWN');
  return text.length > length ? `${text.slice(0, length - 5)}…${text.slice(-4)}` : text;
}

function compactState(state) {
  if (!state) return null;
  return {
    schema: state.schema,
    state_id: state.state_id,
    created_at: state.created_at,
    temporal_coordinate: state.temporal_coordinate,
    sequence: state.sequence,
    premaq: state.premaq,
    basis: state.basis,
    amplitudes: state.amplitudes,
    probabilities: state.probabilities,
    derivatives: state.derivatives,
    confidence: state.confidence,
    uncertainty: state.uncertainty,
    normalisation: state.normalisation,
    entropy: state.entropy,
    spiral: state.spiral,
    compression_release: state.compression_release,
    interpretation: state.interpretation,
    history: state.history?.slice(-1) ?? [],
    receipts: state.receipts?.slice(-1) ?? [],
  };
}

function compactCheckpoint(checkpoint) {
  return {
    schema: checkpoint.schema,
    label: checkpoint.label,
    saved_at: checkpoint.saved_at,
    earth_state_id: checkpoint.earth_state_id,
    target_state_id: checkpoint.target_state_id,
    earth_state: compactState(checkpoint.earth_state),
    target_state: compactState(checkpoint.target_state),
    next_operation: checkpoint.next_operation,
  };
}

function compactYear(yearPlan) {
  return {
    schema: yearPlan.schema,
    year: yearPlan.year,
    elara_multiplier: yearPlan.elara_multiplier,
    earth_prime_calibration: yearPlan.earth_prime.calibration,
    target_world_calibration: yearPlan.target_world.calibration,
    address_tones: yearPlan.address_tones,
    total_cycles_per_shore: yearPlan.total_cycles_per_shore,
    checkpoints: yearPlan.checkpoints.map(compactCheckpoint),
    final_earth_state_id: yearPlan.final_earth_state_id,
    final_target_state_id: yearPlan.final_target_state_id,
    next_operation: yearPlan.next_operation,
  };
}

function compactFullPlan(plan) {
  return {
    schema: plan.schema,
    created_at: plan.created_at,
    formalism: plan.formalism,
    physical_claim: plan.physical_claim,
    address: plan.address,
    year_span: plan.year_span,
    run_contract: plan.run_contract,
    years: plan.years.map(compactYear),
    playback_manifest: plan.playback_manifest,
    final_earth_state_id: plan.final_earth_state_id,
    final_target_state_id: plan.final_target_state_id,
    next_operation: plan.next_operation,
  };
}

function writeCompactPlan(plan) {
  const compact = plan.years ? compactFullPlan(plan) : {
    schema: 'hearthgate.two-shore-live-test-export/v0.1',
    created_at: new Date().toISOString(),
    physical_claim: false,
    year_span: { start: plan.year, end: plan.year, labels: 1, interval_years: 0 },
    years: [compactYear(plan)],
    final_earth_state_id: plan.final_earth_state_id,
    final_target_state_id: plan.final_target_state_id,
    next_operation: plan.next_operation,
  };
  localStorage.setItem(TWO_SHORE_GATE_PLAN_KEY, JSON.stringify(compact));
  currentCompactPlan = compact;
  window.dispatchEvent(new CustomEvent('hearthgate:two-shore-gate-plan', { detail: compact }));
  return compact;
}

function downloadPlan() {
  if (!currentCompactPlan) {
    setStatus('BLOCKED · run and save a gate plan before exporting.', 'blocked');
    return;
  }
  const blob = new Blob([`${JSON.stringify(currentCompactPlan, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `hearthgate-two-shore-${currentCompactPlan.address?.target_world_shore ?? currentCompactPlan.years?.[0]?.target_world_calibration?.world_slug ?? 'world'}-${Date.now()}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setStatus('EXPORTED · labeled gate layers and checkpoints downloaded.', 'complete');
}

function renderValues(containerId, values) {
  const container = el(containerId);
  if (!container) return;
  container.replaceChildren(...Object.entries(values ?? {}).map(([axis, value]) => {
    const item = document.createElement('span');
    item.innerHTML = `<strong>${axis}</strong><small>${Number(value).toFixed(4)}</small>`;
    return item;
  }));
}

function renderCalibration(earthCalibration, target) {
  renderValues('two-shore-earth-values', earthCalibration.values);
  renderValues('two-shore-target-values', target.premaq);
  el('two-shore-earth-state').textContent = `${earthCalibration.status} · coverage ${(earthCalibration.coverage * 100).toFixed(0)}%`;
  el('two-shore-target-state').textContent = `${target.profile_status.toUpperCase()} · root ${target.root_hz.toFixed(2)} Hz`;
  el('two-shore-live-details').textContent = earthCalibration.unknowns.length
    ? `UNKNOWN: ${earthCalibration.unknowns.join(', ')}`
    : `${earthCalibration.browser.family} · ${earthCalibration.browser.platform} · ${earthCalibration.browser.timezone}`;
}

function refreshLiveCalibration({ announce = true } = {}) {
  const live = readLiveTwoShoreInputs(sessionStorage);
  const world = listSelectableGateWorlds().find((entry) => entry.slug === el('two-shore-world')?.value)
    ?? listSelectableGateWorlds()[0];
  const calibration = calibrateEarthPrimePremaq({
    deepPacket: live.deep_packet,
    groundwireSnapshot: live.groundwire_snapshot,
  });
  currentEarthCalibration = calibration;
  renderCalibration(calibration, world);
  const run = el('two-shore-run-live');
  const horizon = el('two-shore-run-horizon');
  if (run) run.disabled = !live.live_ready;
  if (horizon) horizon.disabled = !live.live_ready;
  if (announce) {
    setStatus(
      live.live_ready
        ? 'LIVE READY · DEEP and Groundwire receipts are present. Choose the target world and run the address.'
        : `BLOCKED · DEEP ${live.deep_present ? 'present' : 'missing'} · Groundwire ${live.groundwire_present ? 'present' : 'missing'}. Open the live console below.`,
      live.live_ready ? 'complete' : 'blocked',
    );
  }
  return { live, calibration, world };
}

function scheduleTone(context, destination, frequency, startAt, duration, pan = 0) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.08, startAt + 0.025);
  gain.gain.setValueAtTime(0.08, startAt + Math.max(0.03, duration - 0.045));
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  if (typeof context.createStereoPanner === 'function') {
    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    oscillator.connect(gain).connect(panner).connect(destination);
    audioNodes.push(panner);
  } else {
    oscillator.connect(gain).connect(destination);
  }
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.01);
  audioNodes.push(oscillator, gain);
}

async function playAddressPreview(yearPlan) {
  stopAudio('PREPARING · live gate address preview.');
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) {
    setStatus('BLOCKED · Web Audio is unavailable.', 'blocked');
    return;
  }
  audioContext = new Context();
  await audioContext.resume();
  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -28;
  compressor.knee.value = 16;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.006;
  compressor.release.value = 0.18;
  const master = audioContext.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(compressor).connect(audioContext.destination);
  audioNodes.push(master, compressor);

  const start = audioContext.currentTime + 0.06;
  const duration = 0.13;
  const gap = 0.16;
  let cursor = start;

  for (const axis of GATE_LOCKED_TONE_AXES) {
    scheduleTone(audioContext, master, yearPlan.address_tones.tones[axis].earth_prime_locked_hz, cursor, duration, -0.62);
    cursor += gap;
  }
  cursor += 0.12;
  for (const axis of GATE_LOCKED_TONE_AXES) {
    scheduleTone(audioContext, master, yearPlan.address_tones.tones[axis].target_world_locked_hz, cursor, duration, 0.62);
    cursor += gap;
  }
  cursor += 0.12;
  for (const axis of GATE_LOCKED_TONE_AXES) {
    const tone = yearPlan.address_tones.tones[axis];
    scheduleTone(audioContext, master, tone.earth_prime_inverse_twist_hz, cursor, duration * 1.15, -0.72);
    scheduleTone(audioContext, master, tone.target_world_inverse_twist_hz, cursor, duration * 1.15, 0.72);
    cursor += gap;
  }

  setStatus(
    `PLAYING · ${yearPlan.year} gate address · Earth Prime solo → target solo → reciprocal inverse twist. Gain ${MASTER_GAIN.toFixed(3)}.`,
    'playing',
  );
  window.setTimeout(() => {
    if (!audioContext) return;
    const context = audioContext;
    audioContext = null;
    audioNodes = [];
    context.close().catch(() => {});
    setStatus(
      `LIVE TEST COMPLETE · ${yearPlan.total_cycles_per_shore} computed cycles per shore · final ${short(yearPlan.final_earth_state_id)} ⇄ ${short(yearPlan.final_target_state_id)}.`,
      'complete',
    );
  }, Math.ceil((cursor - start + 0.3) * 1000));
}

async function runLiveYear() {
  const { live, calibration, world } = refreshLiveCalibration({ announce: false });
  if (!live.live_ready) {
    setStatus('BLOCKED · LIVE requires both the DEEP packet and Groundwire snapshot.', 'blocked');
    return;
  }
  setProgress(0.08);
  setStatus(`RUNNING · calibrating Earth Prime ⇄ ${world.name} for 2025.`, 'running');
  await new Promise((resolve) => window.setTimeout(resolve, 20));
  const plan = buildYearGatePlan({
    earthCalibration: calibration,
    targetProfile: world.slug,
    year: 2025,
  });
  currentYearPlan = plan;
  writeCompactPlan(plan);
  setProgress(1);
  el('two-shore-result').textContent = `2025 · ${plan.total_cycles_per_shore} cycles/shore · Earth ${short(plan.final_earth_state_id)} ⇄ ${world.name} ${short(plan.final_target_state_id)}`;
  await playAddressPreview(plan);
}

async function runFullHorizon() {
  const { live, calibration, world } = refreshLiveCalibration({ announce: false });
  if (!live.live_ready) {
    setStatus('BLOCKED · LIVE requires both the DEEP packet and Groundwire snapshot.', 'blocked');
    return;
  }
  stopAudio('PREPARING · full horizon computation.');
  setProgress(0.03);
  setStatus(`RUNNING · 2025→2035 · Earth Prime ⇄ ${world.name}. Keep this page open.`, 'running');
  await new Promise((resolve) => window.setTimeout(resolve, 30));
  const plan = buildFullHorizonGatePlan({
    earthCalibration: calibration,
    targetProfile: world.slug,
  });
  currentYearPlan = plan.years[0];
  currentCompactPlan = writeCompactPlan(plan);
  setProgress(1);
  el('two-shore-result').textContent = `${plan.year_span.start}–${plan.year_span.end} · ${plan.year_span.labels} labeled years · ${plan.playback_manifest.layer_count} playback layers · final ${short(plan.final_earth_state_id)} ⇄ ${short(plan.final_target_state_id)}`;
  setStatus(
    `COMPLETE · ${plan.year_span.labels} year labels across a ${plan.year_span.interval_years}-year interval · ${plan.run_contract.total_cycles_per_shore_per_year} cycles per shore per year. Saved locally.`,
    'complete',
  );
}

function loadLiveConsole() {
  const frame = el('two-shore-live-frame');
  if (frame && !frame.src) frame.src = LIVE_CONSOLE_URL;
}

function installChannels() {
  if (!('BroadcastChannel' in window)) return;
  const deep = new BroadcastChannel('starwell-deep-observer');
  const ground = new BroadcastChannel('starwell-groundwire');
  deep.addEventListener('message', (event) => {
    if (event.data?.type !== 'deep-observer:packet' || !event.data.packet) return;
    sessionStorage.setItem(DEEP_SESSION_KEY, JSON.stringify(event.data.packet));
    refreshLiveCalibration({ announce: false });
  });
  ground.addEventListener('message', (event) => {
    if (event.data?.type !== 'groundwire:snapshot' || !event.data.snapshot) return;
    sessionStorage.setItem(GROUNDWIRE_SESSION_KEY, JSON.stringify(event.data.snapshot));
    refreshLiveCalibration({ announce: false });
  });
  window.addEventListener('pagehide', () => {
    deep.close();
    ground.close();
  }, { once: true });
}

function installStyle() {
  if (el(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${PANEL_ID}{width:min(1180px,calc(100% - 24px));margin:22px auto calc(104px + env(safe-area-inset-bottom));padding:18px;border:1px solid rgba(243,204,117,.34);border-radius:24px;background:linear-gradient(145deg,rgba(2,6,10,.96),rgba(12,27,33,.96));color:#edf6f2;box-shadow:0 24px 80px rgba(0,0,0,.42);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
    #${PANEL_ID} *{box-sizing:border-box} #${PANEL_ID} h2{margin:0;color:#f3cc75;font:700 clamp(1.4rem,4vw,2.2rem)/1.1 Georgia,serif} #${PANEL_ID} p{color:rgba(237,246,242,.78)}
    #${PANEL_ID} .gate-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap} #${PANEL_ID} .gate-law{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#99dbd3}
    #${PANEL_ID} .gate-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:stretch;margin:16px 0} #${PANEL_ID} .gate-shore{padding:14px;border:1px solid rgba(153,219,211,.2);border-radius:18px;background:rgba(255,255,255,.04)}
    #${PANEL_ID} .gate-bridge{display:grid;place-items:center;color:#f3cc75;font-size:1.5rem} #${PANEL_ID} .gate-values{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-top:9px} #${PANEL_ID} .gate-values span{display:grid;place-items:center;padding:7px 3px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:rgba(0,0,0,.18)} #${PANEL_ID} .gate-values strong{color:#99dbd3} #${PANEL_ID} .gate-values small{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    #${PANEL_ID} label{display:grid;gap:5px;font-weight:700} #${PANEL_ID} select,#${PANEL_ID} button,#${PANEL_ID} a.gate-button{min-height:44px;padding:9px 13px;border:1px solid rgba(243,204,117,.34);border-radius:999px;background:rgba(255,255,255,.07);color:#edf6f2;font:inherit;font-weight:800;text-decoration:none;cursor:pointer} #${PANEL_ID} button:disabled{opacity:.42;cursor:not-allowed} #${PANEL_ID} button:hover:not(:disabled),#${PANEL_ID} a.gate-button:hover{border-color:#f3cc75;background:rgba(243,204,117,.12)}
    #${PANEL_ID} .gate-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0} #${PANEL_ID} .gate-actions .primary{background:linear-gradient(135deg,rgba(88,54,20,.9),rgba(18,76,67,.9))} #${PANEL_ID} .gate-actions .stop{border-color:rgba(237,139,132,.75);background:rgba(104,27,31,.7)}
    #${PANEL_ID} .gate-status{padding:10px 12px;border-radius:14px;background:rgba(153,219,211,.08);font-family:ui-monospace,SFMono-Regular,Menlo,monospace} #${PANEL_ID} .gate-status[data-kind="blocked"]{color:#ffb1aa;background:rgba(104,27,31,.28)} #${PANEL_ID} .gate-status[data-kind="complete"]{color:#a9f0cb} #${PANEL_ID} .gate-status[data-kind="playing"]{color:#f3cc75}
    #${PANEL_ID} progress{width:100%;height:10px;margin:10px 0} #${PANEL_ID} details{margin-top:12px;border-top:1px solid rgba(255,255,255,.09);padding-top:10px} #${PANEL_ID} iframe{width:100%;height:72vh;min-height:620px;margin-top:10px;border:1px solid rgba(243,204,117,.25);border-radius:18px;background:#020407}
    @media(max-width:760px){#${PANEL_ID}{width:calc(100% - 12px);padding:13px;border-radius:18px}#${PANEL_ID} .gate-grid{grid-template-columns:1fr}#${PANEL_ID} .gate-bridge{transform:rotate(90deg)}#${PANEL_ID} .gate-values{grid-template-columns:repeat(4,1fr)}#${PANEL_ID} iframe{height:78vh;min-height:560px}}
  `;
  document.head.append(style);
}

function makePanel() {
  const worlds = listSelectableGateWorlds();
  const selected = readSelectedWorld(localStorage);
  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-label', 'Earth Prime and target-world PREMAQ gate console');
  panel.innerHTML = `
    <div class="gate-head">
      <div><p class="gate-law">EARTH PRIME SHORE ⇄ TARGET-WORLD SHORE</p><h2>Two-Shore PREMAQ Gate</h2><p>Live DEEP + Groundwire calibration, explicit target-world origin, locked P R E M A Q tones, C bridge coherence, reciprocal inverse twist, and compression of every preceding release.</p></div>
      <label>Target world<select id="two-shore-world">${worlds.map((world) => `<option value="${world.slug}"${world.slug === selected.slug ? ' selected' : ''}>${world.name}</option>`).join('')}</select></label>
    </div>
    <div class="gate-grid">
      <article class="gate-shore"><strong>Earth Prime</strong><p id="two-shore-earth-state">WAITING</p><div class="gate-values" id="two-shore-earth-values"></div></article>
      <div class="gate-bridge" aria-hidden="true">⌁⇄⌁</div>
      <article class="gate-shore"><strong>Target World</strong><p id="two-shore-target-state">SELECTED PROFILE</p><div class="gate-values" id="two-shore-target-values"></div></article>
    </div>
    <p id="two-shore-live-details">Live receipts not read yet.</p>
    <div class="gate-actions">
      <button id="two-shore-refresh" type="button">Refresh live receipts</button>
      <button class="primary" id="two-shore-run-live" type="button" disabled>LIVE GATE TEST · 2025</button>
      <button class="primary" id="two-shore-run-horizon" type="button" disabled>Run 2025→2035</button>
      <button id="two-shore-export" type="button">Export saved layers</button>
      <button class="stop" id="two-shore-feather" type="button" data-feather-stop>Feather Stop</button>
    </div>
    <progress id="two-shore-gate-progress" max="1" value="0"></progress>
    <div class="gate-status" id="two-shore-gate-status" role="status" aria-live="polite">WAITING · open the live calibration console.</div>
    <p id="two-shore-result">No gate run receipt yet.</p>
    <details id="two-shore-live-console"><summary>Open DEEP + Groundwire live calibration console</summary><p>Use Groundwire’s permission buttons deliberately. Unsupported fields remain UNKNOWN. Keep this console open while returning to the gate controls.</p><iframe id="two-shore-live-frame" title="DEEP and Groundwire live calibration" allow="geolocation; microphone"></iframe></details>
    <p><small>2025→2035 is eleven labeled annual layers across a ten-year interval. The Elara multiplier is recorded as hidden code expansion; the locked audible carriers do not silently drift by year. This is a browser-audio and computational bridge model, not evidence of an external physical portal.</small></p>
  `;
  return panel;
}

function initialise() {
  if (el(PANEL_ID)) return;
  installStyle();
  const panel = makePanel();
  document.body.append(panel);
  installChannels();

  el('two-shore-live-console')?.addEventListener('toggle', (event) => {
    if (event.target.open) loadLiveConsole();
  });
  el('two-shore-world')?.addEventListener('change', (event) => {
    writeSelectedWorld(event.target.value, localStorage);
    currentCompactPlan = null;
    currentYearPlan = null;
    setProgress(0);
    refreshLiveCalibration();
  });
  el('two-shore-refresh')?.addEventListener('click', () => refreshLiveCalibration());
  el('two-shore-run-live')?.addEventListener('click', runLiveYear);
  el('two-shore-run-horizon')?.addEventListener('click', runFullHorizon);
  el('two-shore-export')?.addEventListener('click', downloadPlan);
  el('two-shore-feather')?.addEventListener('click', () => stopAudio());
  window.addEventListener('hearthgate:feather-stop', () => stopAudio());
  window.addEventListener('pagehide', () => stopAudio('FEATHER STOP · page hidden.'));

  try {
    const saved = JSON.parse(localStorage.getItem(TWO_SHORE_GATE_PLAN_KEY) || 'null');
    if (saved?.schema) {
      currentCompactPlan = saved;
      el('two-shore-result').textContent = `Saved gate plan available · ${saved.year_span?.start ?? 'UNKNOWN'}–${saved.year_span?.end ?? 'UNKNOWN'} · ${saved.playback_manifest?.layer_count ?? 'UNKNOWN'} layers`;
    }
  } catch {
    localStorage.removeItem(TWO_SHORE_GATE_PLAN_KEY);
  }
  refreshLiveCalibration();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialise, { once: true });
  else initialise();
}

export const TWO_SHORE_GATE_YEARS = ELARA_EXPANSION_HORIZON;
