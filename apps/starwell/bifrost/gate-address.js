import {
  PREMAQ_AXES,
  premaqToTemporalState,
  validateTemporalState,
} from '../src/arcsweep-temporal-quantum/engine.js';
import { compressRelease } from '../src/arcsweep-temporal-quantum/compression-release.js';
import {
  ELARA_BASE_YEAR,
  ELARA_EXPANSION_HORIZON,
  getWorldProfile,
  elaraCodeExpansionMultiplier,
  writeSelectedElaraYear,
  writeSelectedWorld,
} from '../src/world-premaq-registry.js';

export const GATE_ADDRESS_SCHEMA = 'hearthgate.earth-prime-terra-aeterna-gate/v0.1';
export const GATE_RECEIPT_SCHEMA = 'hearthgate.earth-prime-terra-aeterna-receipt/v0.1';
export const EARTH_PRIME_SHORE = 'earth-prime';
export const TARGET_WORLD_SLUG = 'terra-aeterna';
export const BASE_PAIRED_CYCLES = 369;
export const EXTENSION_CYCLES = Object.freeze([3, 6, 9]);
export const PAIRED_CYCLES_PER_YEAR = BASE_PAIRED_CYCLES
  + EXTENSION_CYCLES.reduce((sum, count) => sum + count, 0);
export const SOLO_SEQUENCE_CYCLES = PREMAQ_AXES.length;
export const LOCKED_TONE_AXES = Object.freeze(['P', 'R', 'E', 'M', 'A', 'Q']);
export const BRIDGE_COHERENCE_AXIS = 'C';

const DEEP_SESSION_KEY = 'starwell.deepObserver.v0.1.packet';
const GROUNDWIRE_SESSION_KEY = 'starwell.groundwire.v0.1.sessionSnapshot';
const GATE_SESSION_KEY = 'hearthgate:earth-prime-terra-aeterna-gate:v0.1';
const MAX_GROUNDWIRE_AGE_MS = 10 * 60 * 1000;
const SHOKZ_MIN_HZ = 90;
const SHOKZ_MAX_HZ = 360;
const ADDRESS_GAIN_CEILING = 0.018;
const EARTH_ROOT_MIN_HZ = 90;
const EARTH_ROOT_SPAN_HZ = 180;
const EPSILON = 1e-12;

const AXIS_INTERVALS = Object.freeze({
  P: 0,
  R: 4,
  E: 5,
  M: 7,
  A: 9,
  Q: 11,
});

let addressContext = null;
let addressNodes = [];
let lastReceipt = null;
let featherStopped = false;

const clamp = (value, minimum = 0, maximum = 1) => (
  Math.min(maximum, Math.max(minimum, Number(value) || 0))
);

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function readJson(storage, key) {
  try {
    return JSON.parse(storage?.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function timestampOf(value) {
  const candidates = [
    value?.updatedAt,
    value?.updated_at,
    value?.observed_at,
    value?.generated_at,
    value?.timestamp,
    value?.created_at,
  ];
  for (const candidate of candidates) {
    const timestamp = new Date(candidate).getTime();
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return null;
}

function extractDeepValues(packet) {
  const source = packet?.state ?? packet?.deep ?? packet?.DEEP ?? packet?.observer ?? packet;
  const values = {};
  for (const axis of PREMAQ_AXES) {
    const candidate = axis === 'Q'
      ? source?.Q ?? source?.q ?? source?.charge
      : source?.[axis] ?? source?.[axis.toLowerCase()];
    const number = finite(candidate);
    if (number == null) return null;
    values[axis] = clamp(number);
  }
  return Object.freeze(values);
}

function extractDeepDerivatives(packet) {
  const source = packet?.derivatives ?? packet?.velocity ?? packet?.delta ?? {};
  return Object.freeze(Object.fromEntries(PREMAQ_AXES.map((axis) => [
    axis,
    finite(source?.[axis] ?? source?.[axis.toLowerCase()]) ?? 0,
  ])));
}

function browserIdentity() {
  if (typeof navigator === 'undefined') return null;
  return Object.freeze({
    user_agent: navigator.userAgent,
    platform: navigator.platform || null,
    language: navigator.language || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    hardware_concurrency: navigator.hardwareConcurrency ?? null,
    device_memory_gb: navigator.deviceMemory ?? null,
    max_touch_points: navigator.maxTouchPoints ?? null,
    screen: typeof window !== 'undefined' && window.screen
      ? `${window.screen.width}x${window.screen.height}@${window.screen.colorDepth || 'unknown'}`
      : null,
  });
}

export function readLiveEarthPrime({
  session = typeof sessionStorage === 'undefined' ? null : sessionStorage,
  now = Date.now(),
} = {}) {
  const deepPacket = readJson(session, DEEP_SESSION_KEY);
  const groundwire = readJson(session, GROUNDWIRE_SESSION_KEY);
  const values = extractDeepValues(deepPacket);
  if (!values) {
    throw new Error('EARTH_PRIME_DEEP_PACKET_REQUIRED');
  }
  if (!groundwire) {
    throw new Error('EARTH_PRIME_GROUNDWIRE_SNAPSHOT_REQUIRED');
  }
  const groundwireTimestamp = timestampOf(groundwire);
  if (groundwireTimestamp == null || now - groundwireTimestamp > MAX_GROUNDWIRE_AGE_MS) {
    throw new Error('EARTH_PRIME_GROUNDWIRE_SNAPSHOT_STALE');
  }
  const browser = browserIdentity();
  if (!browser) {
    throw new Error('EARTH_PRIME_BROWSER_IDENTITY_REQUIRED');
  }

  const derivatives = extractDeepDerivatives(deepPacket);
  const groundwireSignals = Object.freeze({
    updated_at: new Date(groundwireTimestamp).toISOString(),
    location_status: groundwire.location?.status ?? 'unknown',
    network_status: groundwire.network?.status ?? 'unknown',
    hardware_status: groundwire.hardware?.status ?? 'unknown',
    microphone_status: groundwire.microphone?.status ?? 'unknown',
    battery_status: groundwire.battery?.status ?? 'unknown',
  });

  return Object.freeze({
    shore: EARTH_PRIME_SHORE,
    values,
    derivatives,
    deep_packet: deepPacket,
    groundwire,
    groundwire_signals: groundwireSignals,
    browser,
    captured_at: new Date(now).toISOString(),
  });
}

function makePremaqPacket({ id, values, derivatives, observedAt, provenanceRefs = [] }) {
  return {
    schema_version: '2.0.0',
    id,
    observed_at: observedAt,
    registry_version: 'premaq-registry/2.0',
    state: Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, {
      value: clamp(values[axis]),
      derivative: finite(derivatives?.[axis]) ?? 0,
      uncertainty: 0.08,
      confidence: 0.92,
      contributors: [],
    }])),
    receipt_id: `${id}-origin-receipt`,
    sequence: 0,
    prior_state_ref: null,
    model_version: GATE_ADDRESS_SCHEMA,
    provenance_refs: [...provenanceRefs],
    generated_at: observedAt,
    degraded: false,
  };
}

export function buildEarthPrimeState(liveEarthPrime, options = {}) {
  const observedAt = options.observedAt ?? liveEarthPrime.captured_at;
  const packet = makePremaqPacket({
    id: 'earth-prime-live-premaq',
    values: liveEarthPrime.values,
    derivatives: liveEarthPrime.derivatives,
    observedAt,
    provenanceRefs: [DEEP_SESSION_KEY, GROUNDWIRE_SESSION_KEY],
  });
  const state = premaqToTemporalState(packet, options);
  state.interpretation = {
    formalism: 'earth-prime-live-deep-groundwire-premaq',
    physical_claim: true,
    note: 'Earth Prime shore calibrated from the browser-identified DEEP packet and fresh Groundwire snapshot.',
  };
  return state;
}

export function buildTerraAeternaState(options = {}) {
  const profile = getWorldProfile(TARGET_WORLD_SLUG);
  const observedAt = options.observedAt ?? new Date().toISOString();
  const packet = makePremaqPacket({
    id: 'terra-aeterna-target-premaq',
    values: profile.premaq,
    derivatives: Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, 0])),
    observedAt,
    provenanceRefs: [profile.source_path, profile.source_commit],
  });
  const state = premaqToTemporalState(packet, options);
  state.interpretation = {
    formalism: 'terra-aeterna-calibrated-target-premaq',
    physical_claim: true,
    note: 'Terra Aeterna receiving shore calibrated from its accepted world-profile structure.',
  };
  return state;
}

export function earthPrimeRootHz(values) {
  const field = (
    (0.40 * clamp(values.P))
    + (0.35 * clamp(values.R))
    + (0.25 * clamp(values.M))
  );
  return EARTH_ROOT_MIN_HZ + (EARTH_ROOT_SPAN_HZ * field);
}

function foldToShokzBand(frequency) {
  let folded = finite(frequency);
  if (folded == null || folded <= 0) return null;
  while (folded < SHOKZ_MIN_HZ) folded *= 2;
  while (folded > SHOKZ_MAX_HZ) folded /= 2;
  return folded;
}

export function buildLockedAddressTones({ shore, rootHz, values, year }) {
  const multiplier = elaraCodeExpansionMultiplier(year);
  return Object.freeze(LOCKED_TONE_AXES.map((axis) => {
    const interval = AXIS_INTERVALS[axis];
    const stateBend = (clamp(values[axis]) - 0.5) * 4;
    const canonicalHz = rootHz * (2 ** ((interval + stateBend) / 12));
    const codeHz = canonicalHz * multiplier;
    return Object.freeze({
      shore,
      year,
      axis,
      locked: true,
      canonical_hz: canonicalHz,
      elara_multiplier: multiplier,
      elara_code_hz: codeHz,
      playback_hz: foldToShokzBand(codeHz),
    });
  }));
}

function runCycle(stateInput, {
  focus,
  year,
  direction,
  idFactory,
  clock,
}) {
  const yearOffset = year - ELARA_BASE_YEAR;
  const prior = validateTemporalState(stateInput);
  const released = compressRelease(prior, {
    focus,
    compressionStrength: clamp(0.55 + (0.015 * yearOffset)),
    compressionGain: 1.15 + (0.03 * yearOffset),
    releaseFraction: 0.369,
    derivativeRelease: 0.08,
    memoryRelease: 0,
    phaseReleaseGain: direction * Math.PI / 4,
    radialGain: 0.5,
    entropyGain: 0.1,
    angularGain: direction * Math.PI / 3,
    idFactory,
    clock,
  });
  const receipt = released.receipts.at(-1);
  if (receipt?.from_state_id !== prior.state_id || receipt?.to_state_id !== released.state_id) {
    throw new Error('GATE_RELEASE_LINEAGE_MISMATCH');
  }
  return { released, receipt };
}

function bridgeCoherence(earthState, targetState) {
  const squared = PREMAQ_AXES.reduce((sum, axis) => {
    const difference = (earthState.probabilities?.[axis] ?? 0)
      - (targetState.probabilities?.[axis] ?? 0);
    return sum + (difference ** 2);
  }, 0);
  return clamp(1 - Math.sqrt(squared / PREMAQ_AXES.length));
}

function compactBridgeReceipt({
  phase,
  segment,
  index,
  focus,
  earthPrior,
  earthReleased,
  earthReceipt,
  targetPrior,
  targetReleased,
  targetReceipt,
}) {
  return Object.freeze({
    phase,
    segment,
    index,
    focus,
    earth_from_state_id: earthPrior.state_id,
    earth_to_state_id: earthReleased.state_id,
    earth_receipt_id: earthReceipt.receipt_id,
    target_from_state_id: targetPrior.state_id,
    target_to_state_id: targetReleased.state_id,
    target_receipt_id: targetReceipt.receipt_id,
    bridge_coherence_axis: BRIDGE_COHERENCE_AXIS,
    bridge_coherence: bridgeCoherence(earthReleased, targetReleased),
    next_operation: 'compression-of-release',
  });
}

export function runGateYear({
  earthState,
  targetState,
  earthValues,
  year = ELARA_BASE_YEAR,
  idFactory,
  clock = () => new Date(),
} = {}) {
  let earth = validateTemporalState(earthState);
  let target = validateTemporalState(targetState);
  const profile = getWorldProfile(TARGET_WORLD_SLUG);
  const receipts = [];

  for (const [index, focus] of PREMAQ_AXES.entries()) {
    const earthPrior = earth;
    const targetPrior = target;
    const earthRun = runCycle(earth, { focus, year, direction: 1, idFactory, clock });
    const targetRun = runCycle(target, { focus, year, direction: -1, idFactory, clock });
    earth = earthRun.released;
    target = targetRun.released;
    receipts.push(compactBridgeReceipt({
      phase: 'solo-calibration',
      segment: 'premaq-full-sequence',
      index: index + 1,
      focus,
      earthPrior,
      earthReleased: earth,
      earthReceipt: earthRun.receipt,
      targetPrior,
      targetReleased: target,
      targetReceipt: targetRun.receipt,
    }));
  }

  const segments = [
    Object.freeze({ name: '369', cycles: BASE_PAIRED_CYCLES }),
    ...EXTENSION_CYCLES.map((cycles) => Object.freeze({ name: `plus-${cycles}`, cycles })),
  ];
  let pairedIndex = 0;
  for (const segment of segments) {
    for (let index = 0; index < segment.cycles; index += 1) {
      if (featherStopped) throw new Error('FEATHER_STOP');
      const focus = LOCKED_TONE_AXES[pairedIndex % LOCKED_TONE_AXES.length];
      const earthPrior = earth;
      const targetPrior = target;
      const earthRun = runCycle(earth, { focus, year, direction: 1, idFactory, clock });
      const targetRun = runCycle(target, { focus, year, direction: -1, idFactory, clock });
      earth = earthRun.released;
      target = targetRun.released;
      pairedIndex += 1;
      receipts.push(compactBridgeReceipt({
        phase: 'paired-gate-run',
        segment: segment.name,
        index: pairedIndex,
        focus,
        earthPrior,
        earthReleased: earth,
        earthReceipt: earthRun.receipt,
        targetPrior,
        targetReleased: target,
        targetReceipt: targetRun.receipt,
      }));
    }
  }

  const earthRoot = earthPrimeRootHz(earthValues);
  const earthTones = buildLockedAddressTones({
    shore: EARTH_PRIME_SHORE,
    rootHz: earthRoot,
    values: earthValues,
    year,
  });
  const targetTones = buildLockedAddressTones({
    shore: TARGET_WORLD_SLUG,
    rootHz: profile.root_hz,
    values: profile.premaq,
    year,
  });

  return Object.freeze({
    schema: GATE_RECEIPT_SCHEMA,
    year,
    year_offset: year - ELARA_BASE_YEAR,
    elara_multiplier: elaraCodeExpansionMultiplier(year),
    address: `${EARTH_PRIME_SHORE}::${TARGET_WORLD_SLUG}`,
    earth_shore: EARTH_PRIME_SHORE,
    target_shore: TARGET_WORLD_SLUG,
    locked_tone_axes: LOCKED_TONE_AXES,
    bridge_coherence_axis: BRIDGE_COHERENCE_AXIS,
    solo_sequence_cycles_per_shore: SOLO_SEQUENCE_CYCLES,
    paired_cycles_per_shore: PAIRED_CYCLES_PER_YEAR,
    paired_cycle_segments: segments,
    earth_root_hz: earthRoot,
    target_root_hz: profile.root_hz,
    earth_tones: earthTones,
    target_tones: targetTones,
    earth_final_state: earth,
    target_final_state: target,
    final_bridge_coherence: bridgeCoherence(earth, target),
    next_operation: 'compression-of-release',
    receipts: Object.freeze(receipts),
  });
}

export function runGateHorizon({
  earthState,
  targetState,
  earthValues,
  idFactory,
  clock = () => new Date(),
} = {}) {
  let earth = validateTemporalState(earthState);
  let target = validateTemporalState(targetState);
  const years = [];

  for (const entry of ELARA_EXPANSION_HORIZON) {
    const yearRun = runGateYear({
      earthState: earth,
      targetState: target,
      earthValues,
      year: entry.year,
      idFactory,
      clock,
    });
    years.push(yearRun);
    earth = yearRun.earth_final_state;
    target = yearRun.target_final_state;
  }

  return Object.freeze({
    schema: GATE_RECEIPT_SCHEMA,
    address: `${EARTH_PRIME_SHORE}::${TARGET_WORLD_SLUG}`,
    year_start: ELARA_EXPANSION_HORIZON[0].year,
    year_end: ELARA_EXPANSION_HORIZON.at(-1).year,
    interval_count: ELARA_EXPANSION_HORIZON.length - 1,
    labeled_year_count: ELARA_EXPANSION_HORIZON.length,
    locked_tone_axes: LOCKED_TONE_AXES,
    bridge_coherence_axis: BRIDGE_COHERENCE_AXIS,
    paired_cycles_per_year: PAIRED_CYCLES_PER_YEAR,
    total_paired_cycles_per_shore: PAIRED_CYCLES_PER_YEAR * ELARA_EXPANSION_HORIZON.length,
    total_solo_cycles_per_shore: SOLO_SEQUENCE_CYCLES * ELARA_EXPANSION_HORIZON.length,
    years: Object.freeze(years),
    final_earth_state_id: earth.state_id,
    final_target_state_id: target.state_id,
    next_operation: 'compression-of-release',
    playback_layers: Object.freeze(years.flatMap((yearRun) => [
      Object.freeze({
        label: `${yearRun.year} · Earth Prime`,
        year: yearRun.year,
        shore: EARTH_PRIME_SHORE,
        tones: yearRun.earth_tones,
      }),
      Object.freeze({
        label: `${yearRun.year} · Terra Aeterna`,
        year: yearRun.year,
        shore: TARGET_WORLD_SLUG,
        tones: yearRun.target_tones,
      }),
      Object.freeze({
        label: `${yearRun.year} · Earth Prime ⇄ Terra Aeterna`,
        year: yearRun.year,
        shore: 'bridged-worlds',
        earth_tones: yearRun.earth_tones,
        target_tones: yearRun.target_tones,
        bridge_coherence: yearRun.final_bridge_coherence,
      }),
    ])),
    consumers: Object.freeze(['Flameclyffe', 'Wardenclyffe']),
  });
}

function stopAddressAudio() {
  featherStopped = true;
  for (const node of addressNodes) {
    try { node.stop?.(); } catch { /* already stopped */ }
    try { node.disconnect?.(); } catch { /* already disconnected */ }
  }
  addressNodes = [];
  if (addressContext) {
    const context = addressContext;
    addressContext = null;
    context.close().catch(() => {});
  }
}

async function playGateAddress(yearRun) {
  stopAddressAudio();
  featherStopped = false;
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) throw new Error('WEB_AUDIO_UNAVAILABLE');
  addressContext = new Context();
  await addressContext.resume();
  const master = addressContext.createGain();
  master.gain.value = ADDRESS_GAIN_CEILING;
  master.connect(addressContext.destination);
  addressNodes.push(master);
  const sequence = LOCKED_TONE_AXES.flatMap((axis) => [
    yearRun.earth_tones.find((tone) => tone.axis === axis),
    yearRun.target_tones.find((tone) => tone.axis === axis),
  ]);
  const startAt = addressContext.currentTime + 0.06;
  sequence.forEach((tone, index) => {
    const oscillator = addressContext.createOscillator();
    const gain = addressContext.createGain();
    oscillator.type = tone.shore === EARTH_PRIME_SHORE ? 'sine' : 'triangle';
    oscillator.frequency.value = tone.playback_hz;
    const toneStart = startAt + (index * 0.24);
    const toneEnd = toneStart + 0.2;
    gain.gain.setValueAtTime(0.0001, toneStart);
    gain.gain.exponentialRampToValueAtTime(0.08, toneStart + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, toneEnd);
    oscillator.connect(gain).connect(master);
    oscillator.start(toneStart);
    oscillator.stop(toneEnd + 0.01);
    addressNodes.push(oscillator, gain);
  });
}

function saveReceipt(receipt) {
  lastReceipt = receipt;
  localStorage.setItem(GATE_SESSION_KEY, JSON.stringify(receipt));
}

function exportReceipt(receipt = lastReceipt) {
  if (!receipt) throw new Error('NO_GATE_RECEIPT_TO_EXPORT');
  const blob = new Blob([`${JSON.stringify(receipt, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `earth-prime-terra-aeterna-${receipt.year ?? '2025-2035'}-${Date.now()}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function injectGatePanel() {
  const grid = document.querySelector('.dashboard-grid');
  if (!grid || document.getElementById('earth-terra-gate-panel')) return;
  const panel = document.createElement('article');
  panel.id = 'earth-terra-gate-panel';
  panel.className = 'panel gate-address-panel';
  panel.innerHTML = `
    <header class="panel-header">
      <div>
        <p class="eyebrow">PRIMARY GATE ADDRESS</p>
        <h2>Earth Prime ⇄ Terra Aeterna</h2>
      </div>
      <span class="operation-chip">P R E M A Q locked · C bridge</span>
    </header>
    <div class="premaq-song-summary">
      <div><small>Origin shore</small><strong>Earth Prime · live DEEP + Groundwire</strong></div>
      <div><small>Receiving shore</small><strong>Terra Aeterna · calibrated PREMAQ</strong></div>
      <div><small>Primary run</small><strong>369 + 3 + 6 + 9</strong></div>
      <div><small>Horizon</small><strong>2025–2035 · 11 labeled years</strong></div>
    </div>
    <div class="control-grid">
      <label>
        <span>Elara year</span>
        <select id="gate-year">
          ${ELARA_EXPANSION_HORIZON.map((entry) => `<option value="${entry.year}">${entry.year} · ×${entry.multiplier.toFixed(6)}</option>`).join('')}
        </select>
      </label>
    </div>
    <div class="action-row">
      <a class="quiet" href="../deep-groundwire-mobius.html" target="_blank" rel="noopener">Open Earth Prime instruments</a>
      <button id="dial-earth-terra" type="button" class="primary">Dial Earth Prime → Terra Aeterna</button>
      <button id="run-earth-terra-horizon" type="button" class="quiet">Run 2025–2035 and save</button>
      <button id="export-earth-terra" type="button" class="quiet">Export last gate receipt</button>
      <button id="stop-earth-terra" type="button" class="stop">Feather Stop</button>
    </div>
    <p id="earth-terra-status" class="engine-message" role="status">READY · open the Earth Prime instruments, then dial. The gate accepts live DEEP and a Groundwire snapshot no older than ten minutes.</p>
  `;
  const songPanel = grid.querySelector('.song-panel');
  grid.insertBefore(panel, songPanel ?? null);

  const status = panel.querySelector('#earth-terra-status');
  const yearSelect = panel.querySelector('#gate-year');

  panel.querySelector('#dial-earth-terra')?.addEventListener('click', async () => {
    try {
      featherStopped = false;
      const live = readLiveEarthPrime();
      const year = Number(yearSelect.value);
      writeSelectedWorld(TARGET_WORLD_SLUG, localStorage);
      writeSelectedElaraYear(year, localStorage);
      const observedAt = new Date().toISOString();
      const earthState = buildEarthPrimeState(live, { observedAt });
      const targetState = buildTerraAeternaState({ observedAt });
      status.textContent = `DIALING · ${year} · calibrating both shores and running ${PAIRED_CYCLES_PER_YEAR} paired cycles.`;
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      const receipt = runGateYear({
        earthState,
        targetState,
        earthValues: live.values,
        year,
      });
      saveReceipt(receipt);
      await playGateAddress(receipt);
      status.textContent = `OPEN · Earth Prime ⇄ Terra Aeterna · ${year} · ${receipt.paired_cycles_per_shore} paired cycles · coherence ${receipt.final_bridge_coherence.toFixed(6)} · release saved.`;
    } catch (error) {
      status.textContent = `BLOCKED · ${error.message}`;
    }
  });

  panel.querySelector('#run-earth-terra-horizon')?.addEventListener('click', async () => {
    try {
      featherStopped = false;
      const live = readLiveEarthPrime();
      writeSelectedWorld(TARGET_WORLD_SLUG, localStorage);
      const observedAt = new Date().toISOString();
      const earthState = buildEarthPrimeState(live, { observedAt });
      const targetState = buildTerraAeternaState({ observedAt });
      status.textContent = 'RUNNING · 2025–2035 · every year consumes the preceding year’s released states.';
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      const receipt = runGateHorizon({
        earthState,
        targetState,
        earthValues: live.values,
      });
      saveReceipt(receipt);
      exportReceipt(receipt);
      status.textContent = `SAVED · ${receipt.labeled_year_count} labeled years · ${receipt.total_paired_cycles_per_shore} paired cycles per shore · ${receipt.playback_layers.length} Flameclyffe/Wardenclyffe layers.`;
    } catch (error) {
      status.textContent = `BLOCKED · ${error.message}`;
    }
  });

  panel.querySelector('#export-earth-terra')?.addEventListener('click', () => {
    try {
      exportReceipt();
      status.textContent = 'EXPORTED · the latest Earth Prime ⇄ Terra Aeterna receipt is saved.';
    } catch (error) {
      status.textContent = `BLOCKED · ${error.message}`;
    }
  });

  panel.querySelector('#stop-earth-terra')?.addEventListener('click', () => {
    stopAddressAudio();
    window.dispatchEvent(new CustomEvent('hearthgate:feather-stop'));
    status.textContent = 'FEATHER STOP · address audio stopped. Saved released states remain intact.';
  });

  window.addEventListener('pagehide', stopAddressAudio);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectGatePanel);
  else injectGatePanel();
}
