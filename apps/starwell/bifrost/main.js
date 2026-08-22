import {
  PREMAQ_AXES,
  premaqToTemporalState,
  validateTemporalState,
} from '../src/arcsweep-temporal-quantum/engine.js';
import {
  compressRelease,
  mapCompressionReleaseFrequencies,
} from '../src/arcsweep-temporal-quantum/compression-release.js';
import {
  readActiveDualAspectPacket,
  subscribeToDualAspectActivation,
} from '../src/hearthweave-kernel/activation.js';
import { enforceBifrostNativeAction } from './bifrost-native-action-guard.js';

const SESSION_SCHEMA = 'bifrost.current-interface-session/v0.4';
const SESSION_KEY = 'bifrost:current-interface-session:v0.4';
const MAX_WINDOW_CYCLES = 8;
const AUDIO_GAIN_CEILING = 0.03;
const PROXY_MIN_HZ = 90;
const PROXY_MAX_HZ = 360;

const axisNames = Object.freeze({
  P: 'Presence',
  C: 'Coherence',
  R: 'Resonance',
  E: 'Entropy',
  M: 'Memory',
  A: 'Agency',
  Q: 'Qualia',
});

const referenceValues = Object.freeze({
  P: 0.72,
  C: 0.81,
  R: 0.67,
  E: 0.31,
  M: 0.76,
  A: 0.84,
  Q: 0.79,
});

const elements = Object.fromEntries([
  'manifest-version', 'formalism', 'physical-claim', 'source-status',
  'world-id', 'house-id', 'packet-id', 'packet-fingerprint', 'shared-fingerprint',
  'premaq-id', 'source-receipt', 'binding-note', 'bind-active',
  'focus-axis', 'compression-strength', 'strength-value', 'compression-gain',
  'gain-value', 'release-fraction', 'release-value', 'cycle-count', 'run-window',
  'reset-state', 'feather-stop', 'engine-message', 'cycle-number', 'spiral-canvas',
  'spiral-radius', 'entropy-value', 'normalisation-value', 'outward-distance',
  'next-operation', 'state-id', 'premaq-bars', 'root-hz', 'compression-hz',
  'release-hz', 'tone-invariant', 'sound-pair', 'audio-status', 'receipt-list',
  'export-receipts',
].map((id) => [id, document.getElementById(id)]));

let manifest = null;
let activePacket = null;
let sourceState = null;
let currentState = null;
let sourceMode = 'reference';
let cycleReceipts = [];
let audioContext = null;
let activeOscillators = new Set();
let featherStopped = false;

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function numberFrom(element, fallback) {
  const value = Number(element?.value);
  return Number.isFinite(value) ? value : fallback;
}

function short(value, length = 18) {
  const text = String(value ?? 'UNKNOWN');
  if (text.length <= length) return text;
  return `${text.slice(0, Math.max(6, length - 7))}…${text.slice(-6)}`;
}

function makeReferencePacket() {
  const now = new Date().toISOString();
  const state = Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, {
    value: referenceValues[axis],
    derivative: axis === 'P' ? 0.12 : axis === 'R' ? 0.06 : 0.02,
    uncertainty: 0.08,
    confidence: 0.86,
    contributors: [],
  }]));
  return {
    schema_version: '2.0.0',
    id: 'bifrost-interface-reference',
    observed_at: now,
    registry_version: 'premaq-registry/2.0',
    state,
    receipt_id: 'bifrost-interface-reference-receipt',
    sequence: 0,
    prior_state_ref: null,
    model_version: 'bifrost-interface/0.4',
    provenance_refs: [],
    generated_at: now,
    degraded: true,
  };
}

function buildReferenceState() {
  const state = premaqToTemporalState(makeReferencePacket());
  state.interpretation = {
    formalism: 'temporal-compression-release-state-machine',
    physical_claim: false,
    note: 'Declared local reference state. It is not external evidence and writes no canon.',
  };
  return state;
}

function readPacket() {
  try {
    return readActiveDualAspectPacket({ storage: sessionStorage });
  } catch {
    return null;
  }
}

function stateFromActivePacket(packet) {
  const candidate = packet?.temporal?.targetside;
  if (!candidate) return null;
  try {
    return validateTemporalState(candidate);
  } catch {
    return null;
  }
}

function sourceFingerprint(packet) {
  return packet?.packet_fingerprint ?? null;
}

function readSavedSession() {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (value?.schema !== SESSION_SCHEMA) return null;
    return value;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function restoreSavedSession(packet) {
  const saved = readSavedSession();
  if (!saved?.state) return false;
  if (saved.source_mode === 'active-packet' && saved.packet_fingerprint !== sourceFingerprint(packet)) {
    return false;
  }
  try {
    currentState = validateTemporalState(saved.state);
    sourceState = validateTemporalState(saved.source_state ?? saved.state);
    sourceMode = saved.source_mode === 'active-packet' ? 'active-packet' : 'reference';
    cycleReceipts = Array.isArray(saved.receipts) ? clone(saved.receipts).slice(-128) : [];
    return true;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
}

function saveSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      schema: SESSION_SCHEMA,
      saved_at: new Date().toISOString(),
      source_mode: sourceMode,
      packet_fingerprint: sourceMode === 'active-packet' ? sourceFingerprint(activePacket) : null,
      source_state: sourceState,
      state: currentState,
      receipts: cycleReceipts.slice(-128),
    }));
  } catch {
    setMessage('The engine ran, but this browser refused session persistence.', 'error');
  }
}

function setMessage(message, kind = 'ready') {
  elements['engine-message'].textContent = message;
  elements['engine-message'].className = `engine-message${kind === 'error' ? ' error' : ''}`;
}

function setAudioStatus(message) {
  elements['audio-status'].textContent = message;
}

function enforceNativeAction(actionId, target = 'engine') {
  return enforceBifrostNativeAction({
    actionId,
    packetReader: readPacket,
    setStatus: target === 'audio'
      ? (message) => setAudioStatus(message)
      : (message) => setMessage(message, 'error'),
    notes: ['main.js native engine action guard'],
  });
}

function packetTonePair(packet) {
  return packet?.experiential?.tone?.compression_release_sequence?.source_pair ?? null;
}

function resolveToneCalibration() {
  const activePair = packetTonePair(activePacket);
  const rootHz = Number(activePair?.root_hz);
  const resolvedRoot = Number.isFinite(rootHz) && rootHz > 0 ? rootHz : 220;
  const recordedStrength = Number(activePair?.compression_strength);
  const compressionHz = Number(activePair?.compression_hz);
  let excursion = 1.5;
  if (
    Number.isFinite(recordedStrength)
    && recordedStrength > 0
    && Number.isFinite(compressionHz)
    && compressionHz > 0
  ) {
    excursion = Math.abs(Math.log(compressionHz / resolvedRoot) / recordedStrength);
  }
  return { rootHz: resolvedRoot, excursion: clamp(excursion, 0, 8) };
}

function currentTonePair() {
  const { rootHz, excursion } = resolveToneCalibration();
  const strength = clamp(numberFrom(elements['compression-strength'], 0.65), 0, 1);
  return mapCompressionReleaseFrequencies(rootHz, strength, excursion);
}

function bindSource({ forceReference = false, preserveSaved = false } = {}) {
  activePacket = readPacket();
  const packetState = forceReference ? null : stateFromActivePacket(activePacket);
  sourceMode = packetState ? 'active-packet' : 'reference';
  sourceState = packetState ?? buildReferenceState();
  currentState = clone(sourceState);
  cycleReceipts = [];
  featherStopped = false;

  if (preserveSaved && restoreSavedSession(activePacket)) {
    setMessage(`RESTORED · cycle ${currentState.spiral?.cycle ?? 0} remains the next compression source.`);
  } else if (sourceMode === 'active-packet') {
    setMessage(`BOUND · ${activePacket.packet_id} supplies the released source state.`);
  } else {
    setMessage('REFERENCE · no active DualAspectPacket was found. The local reference state is explicitly labelled.');
  }
  saveSession();
  renderAll();
}

function runWindow() {
  const gate = enforceNativeAction('run-window');
  if (!gate.allowed) return;
  featherStopped = false;
  const focus = elements['focus-axis'].value;
  const compressionStrength = clamp(numberFrom(elements['compression-strength'], 0.65), 0, 1);
  const compressionGain = clamp(numberFrom(elements['compression-gain'], 1.2), 0, 2);
  const releaseFraction = clamp(numberFrom(elements['release-fraction'], 0.35), 0, 1);
  const cycles = clamp(Math.trunc(numberFrom(elements['cycle-count'], 1)), 1, MAX_WINDOW_CYCLES);
  elements['cycle-count'].value = String(cycles);

  try {
    for (let index = 0; index < cycles; index += 1) {
      if (featherStopped) break;
      const prior = currentState;
      const released = compressRelease(prior, {
        focus,
        compressionStrength,
        compressionGain,
        releaseFraction,
        derivativeRelease: 0.08,
        memoryRelease: 0,
        phaseReleaseGain: Math.PI / 4,
        radialGain: 0.5,
        entropyGain: 0.1,
        angularGain: Math.PI / 3,
      });
      const receipt = released.receipts.at(-1);
      if (receipt?.from_state_id !== prior.state_id || receipt?.to_state_id !== released.state_id) {
        throw new Error('BIFROST_RELEASE_LINEAGE_MISMATCH');
      }
      currentState = released;
      cycleReceipts.push(receipt);
    }
    cycleReceipts = cycleReceipts.slice(-128);
    saveSession();
    renderAll();
    setMessage(
      `VERIFIED · cycle ${currentState.spiral.cycle} released from its immediate predecessor. Next: compression-of-release.`,
    );
  } catch (error) {
    setMessage(`BLOCKED · ${error.message}`, 'error');
  }
}

function resetState() {
  stopAudio('RESTING · source state restored.');
  currentState = clone(sourceState);
  cycleReceipts = [];
  featherStopped = false;
  saveSession();
  renderAll();
  setMessage('RESET TO SOURCE · no cycle receipt was retained in this local interface session.');
}

function stopAudio(message = 'FEATHER STOP · all scheduled sound has been torn down.') {
  featherStopped = true;
  for (const oscillator of activeOscillators) {
    try { oscillator.stop(); } catch { /* already stopped */ }
    try { oscillator.disconnect(); } catch { /* already disconnected */ }
  }
  activeOscillators.clear();
  if (audioContext) {
    const context = audioContext;
    audioContext = null;
    context.close().catch(() => {});
  }
  elements['audio-status'].textContent = message;
}

function octaveFold(frequency) {
  let folded = frequency;
  if (!Number.isFinite(folded) || folded <= 0) return null;
  while (folded < PROXY_MIN_HZ) folded *= 2;
  while (folded > PROXY_MAX_HZ) folded /= 2;
  return folded;
}

function scheduleTone(context, destination, frequency, startAt, duration) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(AUDIO_GAIN_CEILING, startAt + 0.035);
  gain.gain.setValueAtTime(AUDIO_GAIN_CEILING, startAt + Math.max(0.04, duration - 0.06));
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain).connect(destination);
  activeOscillators.add(oscillator);
  oscillator.addEventListener('ended', () => {
    activeOscillators.delete(oscillator);
    try { oscillator.disconnect(); } catch { /* disconnected */ }
    try { gain.disconnect(); } catch { /* disconnected */ }
  });
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.01);
}

async function soundPair() {
  const gate = enforceNativeAction('sound-pair', 'audio');
  if (!gate.allowed) return;
  stopAudio('PREPARING · deliberate browser-audio proxy.');
  featherStopped = false;
  const PairContext = window.AudioContext || window.webkitAudioContext;
  if (!PairContext) {
    elements['audio-status'].textContent = 'BLOCKED · Web Audio is unavailable in this browser.';
    return;
  }
  const pair = currentTonePair();
  const compressionProxy = octaveFold(pair.compression_hz);
  const releaseProxy = octaveFold(pair.release_hz);
  if (!compressionProxy || !releaseProxy) {
    elements['audio-status'].textContent = 'BLOCKED · the tone pair is not finite.';
    return;
  }

  try {
    audioContext = new PairContext();
    await audioContext.resume();
    const startAt = audioContext.currentTime + 0.04;
    scheduleTone(audioContext, audioContext.destination, compressionProxy, startAt, 0.32);
    scheduleTone(audioContext, audioContext.destination, releaseProxy, startAt + 0.39, 0.36);
    elements['audio-status'].textContent = `PLAYING · ${compressionProxy.toFixed(2)} Hz → ${releaseProxy.toFixed(2)} Hz proxy · gain ${AUDIO_GAIN_CEILING.toFixed(2)}`;
    window.setTimeout(() => {
      if (audioContext && activeOscillators.size === 0) {
        const context = audioContext;
        audioContext = null;
        context.close().catch(() => {});
        elements['audio-status'].textContent = 'RESTING · source frequencies remain in the receipt.';
      }
    }, 1000);
  } catch (error) {
    stopAudio(`BLOCKED · ${error.message}`);
  }
}

function renderLineage() {
  const packet = sourceMode === 'active-packet' ? activePacket : null;
  const sourceReceipt = packet?.provenance?.compression_release_receipt_id
    ?? sourceState?.receipts?.at(-1)?.receipt_id
    ?? 'NOT YET CREATED';
  elements['source-status'].textContent = packet ? 'ACTIVE PACKET' : 'LOCAL REFERENCE';
  elements['world-id'].textContent = packet?.identity?.world_slug ?? 'reference-world';
  elements['house-id'].textContent = packet?.identity?.house_id ?? 'reference-house';
  elements['packet-id'].textContent = packet?.packet_id ?? 'REFERENCE';
  elements['packet-fingerprint'].textContent = packet?.packet_fingerprint ?? 'LOCAL REFERENCE';
  elements['shared-fingerprint'].textContent = packet?.correspondence?.shared_state_fingerprint ?? 'LOCAL REFERENCE';
  elements['premaq-id'].textContent = packet?.observable?.premaq?.id ?? sourceState?.premaq?.id ?? 'UNKNOWN';
  elements['source-receipt'].textContent = sourceReceipt;
  elements['binding-note'].textContent = packet
    ? `Every local cycle begins from packet ${short(packet.packet_id, 28)}. This interface does not mutate the packet or write canon.`
    : 'No active packet is bound. Reference mode is declared, local, non-canon, and replaceable by the Continuity Gate.';
  elements['bind-active'].textContent = packet ? 'Rebind active packet' : 'Check for active packet';
}

function renderState() {
  elements['cycle-number'].textContent = String(currentState?.spiral?.cycle ?? 0);
  elements['spiral-radius'].textContent = Number(currentState?.spiral?.radius ?? 0).toFixed(4);
  elements['entropy-value'].textContent = Number(currentState?.entropy ?? 0).toFixed(4);
  elements['normalisation-value'].textContent = Number(currentState?.normalisation ?? 0).toFixed(6);
  const lastReceipt = cycleReceipts.at(-1) ?? currentState?.receipts?.at(-1) ?? null;
  elements['outward-distance'].textContent = Number(lastReceipt?.outward_distance ?? 0).toFixed(4);
  elements['next-operation'].textContent = currentState?.compression_release?.next_operation ?? 'compression-of-release';
  elements['state-id'].textContent = short(currentState?.state_id, 34);
}

function renderBars() {
  const fragment = document.createDocumentFragment();
  for (const axis of PREMAQ_AXES) {
    const probability = clamp(Number(currentState?.probabilities?.[axis] ?? 0), 0, 1);
    const row = document.createElement('div');
    row.className = 'axis-row';

    const label = document.createElement('span');
    label.className = 'axis-label';
    label.textContent = axis;
    label.title = axisNames[axis];

    const track = document.createElement('span');
    track.className = 'axis-track';
    const fill = document.createElement('span');
    fill.className = 'axis-fill';
    fill.style.width = `${(probability * 100).toFixed(3)}%`;
    track.append(fill);

    const value = document.createElement('span');
    value.className = 'axis-value';
    value.textContent = probability.toFixed(4);

    row.append(label, track, value);
    fragment.append(row);
  }
  elements['premaq-bars'].replaceChildren(fragment);
}

function resizeCanvas(canvas) {
  const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.round(rect.width * ratio));
  const height = Math.max(280, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height, ratio };
}

function renderSpiral() {
  const canvas = elements['spiral-canvas'];
  const context = canvas.getContext('2d');
  const { width, height, ratio } = resizeCanvas(canvas);
  context.clearRect(0, 0, width, height);
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) * 0.42;

  context.lineWidth = ratio;
  for (let ring = 1; ring <= 5; ring += 1) {
    context.beginPath();
    context.arc(centerX, centerY, (maxRadius * ring) / 5, 0, Math.PI * 2);
    context.strokeStyle = `rgba(153, 219, 211, ${0.035 + ring * 0.012})`;
    context.stroke();
  }

  const cycles = Math.max(1, currentState?.spiral?.cycle ?? 0);
  const angleEnd = Number(currentState?.spiral?.angle ?? 0) + (Math.PI * 2 * Math.max(1, cycles / 2));
  const points = 160 + cycles * 20;
  context.beginPath();
  for (let index = 0; index <= points; index += 1) {
    const progress = index / points;
    const angle = progress * angleEnd;
    const radius = maxRadius * (0.06 + 0.9 * progress);
    const ripple = 1 + 0.025 * Math.sin(index * 0.43);
    const x = centerX + Math.cos(angle) * radius * ripple;
    const y = centerY + Math.sin(angle) * radius * ripple;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(131, 239, 217, 0.72)');
  gradient.addColorStop(0.52, 'rgba(243, 204, 117, 0.9)');
  gradient.addColorStop(1, 'rgba(199, 166, 255, 0.82)');
  context.strokeStyle = gradient;
  context.lineWidth = 2.2 * ratio;
  context.stroke();

  const tipRadius = maxRadius * 0.96;
  const tipX = centerX + Math.cos(angleEnd) * tipRadius;
  const tipY = centerY + Math.sin(angleEnd) * tipRadius;
  context.beginPath();
  context.arc(tipX, tipY, 5 * ratio, 0, Math.PI * 2);
  context.fillStyle = 'rgba(243, 204, 117, 0.95)';
  context.fill();
}

function renderTone() {
  const pair = currentTonePair();
  elements['root-hz'].textContent = `${pair.root_hz.toFixed(3)} Hz`;
  elements['compression-hz'].textContent = `${pair.compression_hz.toFixed(3)} Hz · ${pair.compression_class}`;
  elements['release-hz'].textContent = `${pair.release_hz.toFixed(3)} Hz · ${pair.release_class}`;
  elements['tone-invariant'].textContent = `${pair.reciprocal_product.toFixed(3)} = ${pair.root_hz.toFixed(3)}²`;
}

function renderReceipts() {
  if (!cycleReceipts.length) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'No local cycle receipts yet.';
    elements['receipt-list'].replaceChildren(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const receipt of [...cycleReceipts].reverse().slice(0, 32)) {
    const item = document.createElement('li');
    const cycle = document.createElement('span');
    cycle.className = 'receipt-cycle';
    cycle.textContent = `cycle ${receipt.cycle}`;
    const body = document.createElement('span');
    body.className = 'receipt-body';
    const id = document.createElement('strong');
    id.textContent = receipt.receipt_id;
    const detail = document.createElement('small');
    detail.textContent = `${short(receipt.from_state_id)} → ${short(receipt.to_state_id)} · outward ${Number(receipt.outward_distance).toFixed(5)} · next ${receipt.next_operation}`;
    body.append(id, detail);
    item.append(cycle, body);
    fragment.append(item);
  }
  elements['receipt-list'].replaceChildren(fragment);
}

function renderContract() {
  elements['manifest-version'].textContent = manifest
    ? `${manifest.displayName} ${manifest.version}`
    : 'Bifröst Arcsweep v0.4';
  elements['formalism'].textContent = manifest?.engine?.formalism ?? 'temporal-compression-release-state-machine';
  elements['physical-claim'].textContent = String(manifest?.engine?.physicalClaim ?? false);
}

function renderAll() {
  renderContract();
  renderLineage();
  renderState();
  renderBars();
  renderSpiral();
  renderTone();
  renderReceipts();
}

function exportReceipts() {
  const gate = enforceNativeAction('export-receipts');
  if (!gate.allowed) return;
  const pair = currentTonePair();
  const payload = {
    schema: 'bifrost.current-interface-export/v0.4',
    exported_at: new Date().toISOString(),
    manifest: manifest ? {
      module_id: manifest.moduleId,
      version: manifest.version,
      formalism: manifest.engine?.formalism,
      physical_claim: manifest.engine?.physicalClaim,
    } : null,
    source: {
      mode: sourceMode,
      packet_id: activePacket?.packet_id ?? null,
      packet_fingerprint: activePacket?.packet_fingerprint ?? null,
      shared_state_fingerprint: activePacket?.correspondence?.shared_state_fingerprint ?? null,
      source_state_id: sourceState?.state_id ?? null,
    },
    bifrost_runtime: {
      runtime_state: gate.runtimeState,
      execution_policy: gate.policy,
      native_action_receipt: gate.receipt,
    },
    current_state: currentState,
    tone_pair: pair,
    cycle_receipts: cycleReceipts,
    authority: {
      canon_write_performed: false,
      tone_approval_performed: false,
      physical_device_test_performed: false,
    },
  };
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `bifrost-compression-release-cycle-${currentState.spiral?.cycle ?? 0}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setMessage(`EXPORTED · ${cycleReceipts.length} local cycle receipt${cycleReceipts.length === 1 ? '' : 's'}.`);
}

async function loadManifest() {
  try {
    const response = await fetch('../modules/bifrost-arcsweep.module.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const value = await response.json();
    if (value?.engine?.formalism !== 'temporal-compression-release-state-machine') {
      throw new Error('BIFROST_FORMALISM_MISMATCH');
    }
    if (value?.authorityContract?.collapseExists !== false) {
      throw new Error('BIFROST_AUTHORITY_MISMATCH');
    }
    manifest = value;
  } catch (error) {
    manifest = null;
    setMessage(`BLOCKED CONTRACT RECEIPT · ${error.message}`, 'error');
  }
  renderContract();
}

for (const [inputId, outputId, digits] of [
  ['compression-strength', 'strength-value', 2],
  ['compression-gain', 'gain-value', 2],
  ['release-fraction', 'release-value', 2],
]) {
  elements[inputId].addEventListener('input', () => {
    elements[outputId].textContent = numberFrom(elements[inputId], 0).toFixed(digits);
    renderTone();
  });
}

elements['run-window'].addEventListener('click', runWindow);
elements['reset-state'].addEventListener('click', resetState);
elements['feather-stop'].addEventListener('click', () => {
  stopAudio();
  setMessage('FEATHER STOP · sound stopped immediately. The released state and its receipts remain intact.');
});
elements['bind-active'].addEventListener('click', () => bindSource());
elements['sound-pair'].addEventListener('click', soundPair);
elements['export-receipts'].addEventListener('click', exportReceipts);
window.addEventListener('resize', renderSpiral);
window.addEventListener('pagehide', () => stopAudio('FEATHER STOP · page hidden.'));

subscribeToDualAspectActivation((packet) => {
  activePacket = packet;
  elements['source-status'].textContent = 'ACTIVE PACKET AVAILABLE';
  elements['binding-note'].textContent = `Packet ${short(packet.packet_id, 28)} is available. Press “Bind active packet” to replace the current local source deliberately.`;
}, { storage: sessionStorage, eventTarget: window, emitCurrent: false });

loadManifest();
bindSource({ preserveSaved: true });
