import {
  candidateHash,
  mapWorldFoldFrequencies,
  sha256Hex,
  validateWorldToneCandidate,
} from './world-tone-fold-approval.js';

const EPSILON = 0.0001;
const SOMATIC_RECEIPT_STORAGE_KEY = 'hearthgate.ipad-somatic-receipts.v1';
const DECISIONS = new Set(['approved', 'adjust', 'rejected']);

function invariant(condition, message) {
  if (!condition) throw new Error(`IPAD_SOMATIC_HAPTICS: ${message}`);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function copy(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function setAudioValue(parameter, value, at) {
  if (typeof parameter?.setValueAtTime === 'function') parameter.setValueAtTime(value, at);
  else if (parameter) parameter.value = value;
}

function rampAudioValue(parameter, value, at) {
  if (typeof parameter?.linearRampToValueAtTime === 'function') {
    parameter.linearRampToValueAtTime(value, at);
  } else if (parameter) {
    parameter.value = value;
  }
}

function requireDate(value, field) {
  const date = value instanceof Date ? value : new Date(value);
  invariant(!Number.isNaN(date.getTime()), `${field} must be a valid date`);
  return date;
}

export const SOMATIC_DEVICE_PROFILES = deepFreeze({
  'body-transducer': {
    id: 'body-transducer',
    label: 'Body transducer · Woojer / tactile audio device',
    transport: 'selected-system-audio-output',
    body_region: 'user-selected-placement',
    minimum_hz: 35,
    maximum_hz: 120,
    default_gain: 0.022,
    maximum_gain: 0.06,
    default_cycles: 3,
    fidelity: 'external-body-audio-somatic-transduction',
    requires_placement_confirmation: true,
  },
  'shokz-bone-conduction': {
    id: 'shokz-bone-conduction',
    label: 'Shokz · cranial bone-conduction cue',
    transport: 'selected-system-audio-output',
    body_region: 'cheekbones',
    minimum_hz: 90,
    maximum_hz: 360,
    default_gain: 0.03,
    maximum_gain: 0.06,
    default_cycles: 3,
    fidelity: 'bone-conduction-audio-somatic-proxy',
    requires_placement_confirmation: false,
  },
  'native-controller-bridge': {
    id: 'native-controller-bridge',
    label: 'Native iPad controller bridge · external haptic controller',
    transport: 'webkit-native-message-bridge',
    body_region: 'controller-locality',
    minimum_hz: 35,
    maximum_hz: 180,
    default_gain: 0.2,
    maximum_gain: 0.55,
    default_cycles: 3,
    fidelity: 'external-controller-core-haptics',
    requires_placement_confirmation: false,
  },
});

export const SOMATIC_BODY_PLACEMENTS = deepFreeze([
  { id: 'sternum', label: 'Sternum / upper chest' },
  { id: 'waist', label: 'Waist / abdomen' },
  { id: 'upper-back', label: 'Upper back' },
  { id: 'lower-back', label: 'Lower back' },
  { id: 'handheld', label: 'Held in hand' },
  { id: 'cheekbones', label: 'Cheekbones / Shokz' },
  { id: 'controller', label: 'Controller actuators' },
]);

export function detectIPadSomaticCapabilities({
  navigatorObject = globalThis.navigator,
  target = globalThis,
  matchMediaFunction = globalThis.matchMedia,
} = {}) {
  const userAgent = String(navigatorObject?.userAgent ?? '');
  const platform = String(navigatorObject?.platform ?? '');
  const maxTouchPoints = Number(navigatorObject?.maxTouchPoints ?? 0);
  const isIPad = /iPad/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const nativeBridge = Boolean(target?.webkit?.messageHandlers?.hearthgateSomatic?.postMessage);
  const standalone = Boolean(
    navigatorObject?.standalone
      || matchMediaFunction?.('(display-mode: standalone)')?.matches,
  );

  return deepFreeze({
    schema: 'hearthgate.ipad-somatic-capabilities/v1',
    ipad: isIPad,
    standalone,
    internal_haptic_actuator: false,
    web_vibration_api: typeof navigatorObject?.vibrate === 'function',
    external_audio_transport: true,
    native_controller_bridge: nativeBridge,
    governing_boundary: 'iPad renders somatic feedback through an external device; it does not claim an internal haptic actuator.',
  });
}

export function foldFrequencyIntoDeviceBand(
  frequencyHz,
  { minimumHz, maximumHz },
) {
  invariant(Number.isFinite(frequencyHz) && frequencyHz > 0, 'source frequency must be positive');
  invariant(Number.isFinite(minimumHz) && minimumHz > 0, 'minimumHz must be positive');
  invariant(Number.isFinite(maximumHz) && maximumHz > minimumHz, 'maximumHz must exceed minimumHz');

  let folded = frequencyHz;
  let guard = 0;
  while (folded > maximumHz && guard < 128) {
    folded /= 2;
    guard += 1;
  }
  while (folded < minimumHz && guard < 256) {
    folded *= 2;
    guard += 1;
  }
  invariant(guard < 256 && Number.isFinite(folded), 'frequency folding failed');
  return folded;
}

function validateDeviceProfile(profileId) {
  const profile = SOMATIC_DEVICE_PROFILES[profileId];
  invariant(profile, `unknown somatic device profile: ${profileId}`);
  return profile;
}

function validateCycles(cycles) {
  invariant(Number.isInteger(cycles) && cycles >= 1 && cycles <= 8, 'cycles must be an integer from 1 to 8');
  return cycles;
}

export function buildSomaticCompressionReleasePlan(
  candidateInput,
  foldIndex,
  {
    deviceProfileId = 'body-transducer',
    cycles = null,
    baseGain = null,
  } = {},
) {
  const candidate = validateWorldToneCandidate(candidateInput);
  invariant(Number.isFinite(foldIndex) && foldIndex >= 0 && foldIndex <= 1, 'fold index must lie within 0..1');
  const device = validateDeviceProfile(deviceProfileId);
  const renderCycles = validateCycles(cycles ?? device.default_cycles);
  const gain = baseGain ?? device.default_gain;
  invariant(Number.isFinite(gain) && gain > 0 && gain <= device.maximum_gain, `base gain must lie within 0..${device.maximum_gain}`);

  const pair = mapWorldFoldFrequencies(candidate.root_hz, foldIndex, {
    enterThreshold: candidate.enter_threshold,
    excursion: candidate.excursion,
  });
  const band = { minimumHz: device.minimum_hz, maximumHz: device.maximum_hz };
  const rootProxy = foldFrequencyIntoDeviceBand(candidate.root_hz, band);
  const compressionProxy = foldFrequencyIntoDeviceBand(pair.direct_hz, band);
  const releaseProxy = foldFrequencyIntoDeviceBand(pair.inverse_hz, band);
  const strength = pair.fold_strength;

  const events = [{
    event_id: 'world-root',
    role: 'world-root',
    phase: 'anchor',
    cycle: 0,
    frequency_hz: rootProxy,
    source_frequency_hz: candidate.root_hz,
    duration_ms: 260,
    gap_after_ms: 180,
    start_gain: Math.max(EPSILON, gain * 0.32),
    peak_gain: Math.min(device.maximum_gain, gain * 0.72),
    end_gain: Math.max(EPSILON, gain * 0.32),
    seed_from_release_event: null,
  }];

  let priorReleaseGain = Math.max(EPSILON, gain * 0.28);
  for (let cycle = 1; cycle <= renderCycles; cycle += 1) {
    const memory = cycle / renderCycles;
    const compressionGain = Math.min(
      device.maximum_gain,
      gain * (0.72 + 0.42 * strength + 0.08 * memory) + priorReleaseGain * 0.22,
    );
    const releaseGain = Math.max(
      EPSILON,
      Math.min(device.maximum_gain, compressionGain * (0.54 + 0.14 * (1 - strength))),
    );
    const compressionEventId = `compression-${cycle}`;
    const releaseEventId = `release-${cycle}`;

    events.push({
      event_id: compressionEventId,
      role: 'compression',
      phase: 'compression',
      cycle,
      frequency_hz: compressionProxy,
      source_frequency_hz: pair.direct_hz,
      duration_ms: Math.max(150, 270 - cycle * 12),
      gap_after_ms: 70,
      start_gain: priorReleaseGain,
      peak_gain: compressionGain,
      end_gain: compressionGain,
      seed_from_release_event: cycle === 1 ? 'world-root' : `release-${cycle - 1}`,
    });

    events.push({
      event_id: releaseEventId,
      role: 'release',
      phase: 'release',
      cycle,
      frequency_hz: releaseProxy,
      source_frequency_hz: pair.inverse_hz,
      duration_ms: 320 + cycle * 24,
      gap_after_ms: cycle === renderCycles ? 0 : 170,
      start_gain: compressionGain,
      peak_gain: compressionGain,
      end_gain: releaseGain,
      seed_from_compression_event: compressionEventId,
    });

    priorReleaseGain = releaseGain;
  }

  const totalDurationMs = events.reduce(
    (sum, event) => sum + event.duration_ms + event.gap_after_ms,
    0,
  );

  return deepFreeze({
    schema: 'hearthgate.ipad-somatic-plan/v1',
    world_id: candidate.world_id,
    tone_layer_id: candidate.tone_layer_id,
    device_profile: device,
    fold_index: foldIndex,
    fold_strength: strength,
    source_pair: pair,
    proxy_frequencies: {
      root_hz: rootProxy,
      compression_hz: compressionProxy,
      release_hz: releaseProxy,
    },
    recurrence: {
      law: 'compression -> release -> compression of the release -> release -> infinite continuation',
      rendered_cycles: renderCycles,
      continuation: 'the final release state seeds the next bounded render window',
      final_release_gain: priorReleaseGain,
    },
    events,
    total_duration_ms: totalDurationMs,
    limits: {
      minimum_hz: device.minimum_hz,
      maximum_hz: device.maximum_hz,
      maximum_gain: device.maximum_gain,
      maximum_cycles: 8,
    },
  });
}

export class IPadSomaticHapticSession extends EventTarget {
  constructor({
    audioContextFactory = null,
    storage = globalThis.localStorage || null,
    now = () => new Date(),
    signer = 'rowan',
    nativeBridge = globalThis.webkit?.messageHandlers?.hearthgateSomatic || null,
  } = {}) {
    super();
    this.audioContextFactory = audioContextFactory;
    this.storage = storage;
    this.now = now;
    this.signer = signer;
    this.nativeBridge = nativeBridge;
    this.candidate = null;
    this.candidateHash = null;
    this.context = null;
    this.nodes = [];
    this.active = false;
    this.auditionReceipt = null;
    this.completedAudition = null;
    this.currentPlan = null;
  }

  createAudioContext() {
    if (this.audioContextFactory) return this.audioContextFactory();
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    invariant(Context, 'Web Audio is unavailable');
    return new Context();
  }

  async closeTransport(reason, { clearCompletion = false } = {}) {
    const nodes = [...new Set(this.nodes)];
    const context = this.context;
    const plan = this.currentPlan;
    this.nodes = [];
    this.context = null;
    this.currentPlan = null;
    this.active = false;
    if (clearCompletion) this.completedAudition = null;

    for (const node of nodes) {
      try { node.stop?.(); } catch {}
      try { node.disconnect?.(); } catch {}
    }
    if (context) {
      try { await context.close?.(); } catch {}
    }
    if (plan?.device_profile?.transport === 'webkit-native-message-bridge') {
      try {
        this.nativeBridge?.postMessage?.({
          schema: 'hearthgate.ipad-somatic-native-command/v1',
          action: 'stop',
          reason,
        });
      } catch {}
    }
  }

  async loadCandidate(candidateInput) {
    await this.stop('candidate-replaced');
    this.candidate = validateWorldToneCandidate(candidateInput);
    this.candidateHash = await candidateHash(this.candidate);
    this.auditionReceipt = null;
    this.completedAudition = null;
    return this.candidate;
  }

  validateActivation({
    deviceProfileId,
    outputConfirmed,
    placement,
    placementClearanceConfirmed,
    startLowConfirmed,
  }) {
    const device = validateDeviceProfile(deviceProfileId);
    invariant(outputConfirmed === true, 'explicit external-output confirmation is required');
    invariant(startLowConfirmed === true, 'start-low confirmation is required');
    if (device.requires_placement_confirmation) {
      invariant(typeof placement === 'string' && placement.trim(), 'body placement is required');
      invariant(placementClearanceConfirmed === true, 'placement clearance confirmation is required');
    }
    if (device.transport === 'webkit-native-message-bridge') {
      invariant(typeof this.nativeBridge?.postMessage === 'function', 'native controller bridge is unavailable');
    }
    return device;
  }

  scheduleAudioPlan(plan) {
    const context = this.createAudioContext();
    this.context = context;
    const master = context.createGain();
    const start = (context.currentTime || 0) + 0.035;
    setAudioValue(master.gain, 1, start);
    master.connect(context.destination);
    this.nodes.push(master);

    let cursor = start;
    for (const event of plan.events) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = 'sine';
      setAudioValue(oscillator.frequency, event.frequency_hz, cursor);
      setAudioValue(envelope.gain, EPSILON, cursor);
      const attackEnd = cursor + Math.min(0.045, event.duration_ms / 5000);
      const releaseStart = cursor + Math.max(0.06, event.duration_ms / 1000 - 0.055);
      rampAudioValue(envelope.gain, event.start_gain, attackEnd);
      rampAudioValue(envelope.gain, event.peak_gain, cursor + event.duration_ms / 2000);
      setAudioValue(envelope.gain, event.peak_gain, releaseStart);
      rampAudioValue(envelope.gain, Math.max(EPSILON, event.end_gain), cursor + event.duration_ms / 1000);
      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.start(cursor);
      oscillator.stop(cursor + event.duration_ms / 1000);
      this.nodes.push(oscillator, envelope);
      cursor += (event.duration_ms + event.gap_after_ms) / 1000;
    }
    return context;
  }

  async audition({
    foldIndex,
    deviceProfileId = 'body-transducer',
    cycles = null,
    baseGain = null,
    outputConfirmed = false,
    placement = '',
    placementClearanceConfirmed = false,
    startLowConfirmed = false,
  } = {}) {
    invariant(this.candidate && this.candidateHash, 'load a world-tone candidate before audition');
    const device = this.validateActivation({
      deviceProfileId,
      outputConfirmed,
      placement,
      placementClearanceConfirmed,
      startLowConfirmed,
    });
    await this.stop('audition-replaced');

    const plan = buildSomaticCompressionReleasePlan(this.candidate, foldIndex, {
      deviceProfileId,
      cycles,
      baseGain,
    });
    this.currentPlan = plan;

    if (device.transport === 'webkit-native-message-bridge') {
      this.nativeBridge.postMessage({
        schema: 'hearthgate.ipad-somatic-native-command/v1',
        action: 'play',
        plan,
      });
    } else {
      const context = this.scheduleAudioPlan(plan);
      if (typeof context.resume === 'function') await context.resume();
    }

    this.active = true;
    const startedAt = requireDate(this.now(), 'started_at');
    this.auditionReceipt = deepFreeze({
      schema: 'hearthgate.ipad-somatic-audition-receipt/v1',
      candidate_hash: this.candidateHash,
      world_id: this.candidate.world_id,
      profile_version: this.candidate.profile_version,
      tone_layer_id: this.candidate.tone_layer_id,
      interface: 'ipad-pwa',
      internal_haptic_actuator: false,
      output_device_detected: false,
      output_confirmation: 'user-confirmed',
      device_profile_id: device.id,
      device_fidelity: device.fidelity,
      placement: placement || device.body_region,
      placement_clearance_confirmed: Boolean(placementClearanceConfirmed),
      start_low_confirmed: true,
      fold_index: foldIndex,
      plan,
      started_at: startedAt.toISOString(),
      completes_at: new Date(startedAt.getTime() + plan.total_duration_ms).toISOString(),
      status: 'scheduled',
    });
    this.completedAudition = null;
    this.dispatchEvent(new CustomEvent('hearthgate:ipad-somatic-auditioned', { detail: this.auditionReceipt }));
    return this.auditionReceipt;
  }

  async markAuditionComplete() {
    invariant(this.auditionReceipt, 'no somatic audition is scheduled');
    const completedAt = requireDate(this.now(), 'completed_at');
    const requiredCompletion = requireDate(this.auditionReceipt.completes_at, 'completes_at');
    invariant(completedAt.getTime() >= requiredCompletion.getTime(), 'somatic audition has not reached its completion time');

    const completion = {
      ...copy(this.auditionReceipt),
      status: 'completed',
      completed_at: completedAt.toISOString(),
    };
    const receiptHash = await sha256Hex(completion);
    this.completedAudition = deepFreeze({ ...completion, receipt_hash: receiptHash });
    await this.closeTransport('window-complete', { clearCompletion: false });
    this.dispatchEvent(new CustomEvent('hearthgate:ipad-somatic-complete', { detail: this.completedAudition }));
    return this.completedAudition;
  }

  async stop(reason = 'feather-stop') {
    await this.closeTransport(reason, { clearCompletion: true });
    this.dispatchEvent(new CustomEvent('hearthgate:ipad-somatic-stopped', { detail: { reason } }));
  }

  async decide({
    decision,
    feltAndIdentified = false,
    comfortable = false,
    outputConfirmed = false,
    note = '',
  } = {}) {
    invariant(this.candidate && this.candidateHash, 'load a candidate before deciding');
    invariant(DECISIONS.has(decision), 'decision must be approved, adjust, or rejected');
    invariant(outputConfirmed === true, 'external output must remain confirmed');
    invariant(this.completedAudition?.candidate_hash === this.candidateHash, 'the current candidate has no completed somatic audition');
    if (decision === 'approved') {
      invariant(feltAndIdentified === true, 'approval requires felt-and-identified confirmation');
      invariant(comfortable === true, 'approval requires explicit comfort confirmation');
    }

    const receipt = {
      schema: 'hearthgate.ipad-somatic-decision-receipt/v1',
      candidate_hash: this.candidateHash,
      world_id: this.candidate.world_id,
      world_name: this.candidate.world_name,
      profile_version: this.candidate.profile_version,
      tone_layer_id: this.candidate.tone_layer_id,
      root_hz: this.candidate.root_hz,
      decision,
      signer: this.signer,
      signer_authority: 'human-calibration-owner',
      felt_and_identified: Boolean(feltAndIdentified),
      comfortable: Boolean(comfortable),
      output_confirmed: true,
      interface: 'ipad-pwa',
      somatic_audition_receipt: this.completedAudition,
      note: String(note || ''),
      created_at: requireDate(this.now(), 'created_at').toISOString(),
    };
    const receiptHash = await sha256Hex(receipt);
    const finalReceipt = deepFreeze({ ...receipt, receipt_hash: receiptHash });
    this.persistReceipt(finalReceipt);
    this.dispatchEvent(new CustomEvent('hearthgate:ipad-somatic-decision', { detail: finalReceipt }));
    return finalReceipt;
  }

  persistReceipt(receipt) {
    if (!this.storage) return;
    let existing = [];
    try {
      const parsed = JSON.parse(this.storage.getItem(SOMATIC_RECEIPT_STORAGE_KEY) || '[]');
      if (Array.isArray(parsed)) existing = parsed;
    } catch {}
    existing.push(receipt);
    this.storage.setItem(SOMATIC_RECEIPT_STORAGE_KEY, JSON.stringify(existing));
  }

  readReceipts() {
    if (!this.storage) return [];
    try {
      const parsed = JSON.parse(this.storage.getItem(SOMATIC_RECEIPT_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
