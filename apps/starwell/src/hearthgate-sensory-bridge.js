import { readActiveDualAspectPacket } from './hearthweave-kernel/activation.js';
import { assertCrossRuntimeActivation } from './hearthweave-kernel/cross-runtime.js';

const HASH_PATTERN = /^[0-9a-f]{64}$/;
const REQUIRED_TONE_ROLES = ['anchor', 'bind', 'living'];

function invariant(condition, message) {
  if (!condition) throw new Error(`HEARTHGATE_SENSORY_INTEGRITY: ${message}`);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function copyPacket(packet) {
  if (typeof structuredClone === 'function') return structuredClone(packet);
  return JSON.parse(JSON.stringify(packet));
}

export function verifySensoryPacket(input) {
  invariant(input && typeof input === 'object', 'packet must be an object');
  const packet = deepFreeze(copyPacket(input));
  invariant(packet.schema === 'hearthgate.dual-aspect-packet.v1', 'unsupported packet schema');
  invariant(typeof packet.identity === 'string' && packet.identity.length > 0, 'identity is missing');
  invariant(typeof packet.house_id === 'string' && packet.house_id.length > 0, 'House is missing');
  invariant(packet.bridge?.centre === 'hearthweave', 'bridge centre is not Hearthweave');
  invariant(packet.bridge?.destination_house === packet.house_id, 'bridge destination diverges from House');

  const basisHash = packet.correspondence?.basis_hash;
  invariant(HASH_PATTERN.test(basisHash || ''), 'basis hash is invalid');
  invariant(packet.sensory?.source_state_hash === basisHash, 'sensory state diverges from shared basis');

  const receipts = Array.isArray(packet.receipts) ? packet.receipts : [];
  invariant(receipts.length > 0, 'verified packet requires a receipt');
  const receipt = receipts.at(-1);
  invariant(receipt.status === 'VERIFIED', 'receipt is not VERIFIED');
  invariant(HASH_PATTERN.test(receipt.packet_hash || ''), 'receipt packet hash is invalid');
  invariant(
    Object.values(receipt.claims || {}).every((claim) => claim === 'VERIFIED'),
    'receipt contains an unverified claim',
  );

  const tones = Array.isArray(packet.sensory?.tones) ? packet.sensory.tones : [];
  const toneRoles = tones.map((tone) => tone.role).sort();
  invariant(
    JSON.stringify(toneRoles) === JSON.stringify(REQUIRED_TONE_ROLES),
    'tone stack must contain exactly anchor, living, and bind',
  );
  for (const tone of tones) {
    invariant(Number.isFinite(tone.frequency_hz) && tone.frequency_hz > 0, `${tone.role} frequency is invalid`);
    invariant(Number.isFinite(tone.gain) && tone.gain >= 0 && tone.gain <= 0.25, `${tone.role} gain is invalid`);
  }

  const hapticRoles = new Set((packet.sensory?.haptics || []).map((pulse) => pulse.role));
  invariant(hapticRoles.has('call') && hapticRoles.has('answer'), 'haptics require call and answer');
  const answered = Boolean(packet.bridge?.reception_witness);
  invariant(Boolean(packet.sensory?.glyph?.complete) === answered, 'glyph answer state diverges from bridge');
  invariant(Boolean(packet.sensory?.glyph?.reception_stroke) === answered, 'glyph reception stroke diverges');
  return packet;
}

export function packetToCssVariables(packetInput) {
  const packet = verifySensoryPacket(packetInput);
  const visual = packet.sensory.visual;
  const palette = visual.palette || [];
  return {
    '--hg-basis-hash': `"${packet.correspondence.basis_hash}"`,
    '--hg-palette-0': palette[0] || '#0d1218',
    '--hg-palette-1': palette[1] || '#e4c88f',
    '--hg-palette-2': palette[2] || '#9ab2b4',
    '--hg-palette-3': palette[3] || palette[1] || '#f3ead8',
    '--hg-motion': String(visual.motion),
    '--hg-luminance': String(visual.luminance),
    '--hg-structure-weight': String(visual.structure_weight),
    '--hg-atmosphere-weight': String(visual.atmosphere_weight),
    '--hg-glyph-activation': String(packet.sensory.glyph.activation),
  };
}

export function packetToHapticPlan(packetInput) {
  const packet = verifySensoryPacket(packetInput);
  const pulses = packet.sensory.haptics.map((pulse) => ({
    role: pulse.role,
    duration_ms: pulse.duration_ms,
    intensity: pulse.intensity,
    gap_after_ms: pulse.gap_after_ms,
  }));
  const webVibrationPattern = [];
  for (const pulse of pulses) {
    // The Web Vibration API exposes duration, not amplitude. Zero intensity must remain silence.
    webVibrationPattern.push(Math.max(0, Math.round(pulse.duration_ms * pulse.intensity)));
    if (pulse.gap_after_ms > 0) webVibrationPattern.push(pulse.gap_after_ms);
  }
  return deepFreeze({
    schema: 'hearthgate.haptic-plan.v1',
    basis_hash: packet.correspondence.basis_hash,
    fidelity: 'web-vibration-duration-proxy',
    pulses,
    web_vibration_pattern: webVibrationPattern,
  });
}

function setAudioParam(parameter, value, now) {
  if (typeof parameter?.setValueAtTime === 'function') parameter.setValueAtTime(value, now);
  else if (parameter) parameter.value = value;
}

function connectChain(...nodes) {
  for (let index = 0; index < nodes.length - 1; index += 1) nodes[index].connect(nodes[index + 1]);
}

export class HearthgateSensoryBridge extends EventTarget {
  constructor({
    root = globalThis.document?.documentElement || null,
    glyphElement = null,
    audioContextFactory = null,
    vibrate = globalThis.navigator?.vibrate?.bind(globalThis.navigator) || null,
    storage = globalThis.sessionStorage ?? null,
  } = {}) {
    super();
    this.root = root;
    this.glyphElement = glyphElement;
    this.audioContextFactory = audioContextFactory;
    this.vibrate = vibrate;
    this.storage = storage;
    this.packet = null;
    this.crossRuntimeActivation = null;
    this.audioContext = null;
    this.audioNodes = [];
    this.active = false;
  }

  receive(packetInput, {
    hearthweavePacket,
    correspondenceReceipt = null,
  } = {}) {
    const nextPacket = verifySensoryPacket(packetInput);
    const activeHearthweavePacket = hearthweavePacket === undefined
      ? readActiveDualAspectPacket({ storage:this.storage })
      : hearthweavePacket;
    const nextCrossRuntimeActivation = assertCrossRuntimeActivation({
      kernelPacket:nextPacket,
      hearthweavePacket:activeHearthweavePacket,
      correspondenceReceipt,
    });
    const teardownRequired = this.active || this.audioContext || this.audioNodes.length > 0;
    if (teardownRequired) {
      return this.replaceAfterStop(nextPacket, nextCrossRuntimeActivation);
    }
    return this.installPacket(nextPacket, nextCrossRuntimeActivation);
  }

  async replaceAfterStop(nextPacket, nextCrossRuntimeActivation) {
    await this.stop();
    return this.installPacket(nextPacket, nextCrossRuntimeActivation);
  }

  installPacket(nextPacket, nextCrossRuntimeActivation) {
    this.packet = nextPacket;
    this.crossRuntimeActivation = nextCrossRuntimeActivation;
    this.applyVisualState();
    this.dispatchEvent(new CustomEvent('hearthgate:sensory-received', {
      detail: this.receiptDetail('received'),
    }));
    return this.packet;
  }

  receiptDetail(
    action,
    packet = this.packet,
    crossRuntimeActivation = this.crossRuntimeActivation,
  ) {
    invariant(packet, 'no packet has been received');
    return deepFreeze({
      schema: 'hearthgate.browser-sensory-receipt.v1',
      action,
      identity: packet.identity,
      house_id: packet.house_id,
      basis_hash: packet.correspondence.basis_hash,
      packet_hash: packet.receipts.at(-1).packet_hash,
      cross_runtime: copyPacket(crossRuntimeActivation),
      created_at: new Date().toISOString(),
    });
  }

  applyVisualState() {
    invariant(this.packet, 'no packet has been received');
    const variables = packetToCssVariables(this.packet);
    if (this.root?.style) {
      for (const [name, value] of Object.entries(variables)) this.root.style.setProperty(name, value);
      if (this.root.dataset) {
        this.root.dataset.hearthgateHouse = this.packet.house_id;
        this.root.dataset.hearthgateBasis = this.packet.correspondence.basis_hash;
        this.root.dataset.hearthgateRuntimeMode = this.crossRuntimeActivation?.mode ?? 'unknown';
      }
    }
    if (this.glyphElement) {
      const glyph = this.packet.sensory.glyph;
      this.glyphElement.dataset.state = glyph.complete ? 'bound' : 'waiting';
      this.glyphElement.dataset.arrivalStroke = glyph.arrival_stroke;
      this.glyphElement.dataset.receptionStroke = glyph.reception_stroke || '';
      this.glyphElement.dataset.hearthweaveBind = glyph.hearthweave_bind;
      this.glyphElement.setAttribute(
        'aria-label',
        glyph.complete ? 'Answered Hearthweave glyph' : 'Waiting Hearthweave glyph',
      );
    }
  }

  createAudioContext() {
    if (this.audioContextFactory) return this.audioContextFactory();
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    invariant(Context, 'Web Audio is not available');
    return new Context();
  }

  async activate({ sound = true, haptics = true } = {}) {
    invariant(this.packet, 'receive a verified packet before activation');
    invariant(
      this.crossRuntimeActivation?.status === 'VERIFIED',
      'cross-runtime activation has not been verified',
    );
    if (this.active) return this.receiptDetail('already-active');

    if (sound) await this.activateSound();
    if (haptics) this.activateHaptics();
    this.active = true;
    if (this.glyphElement?.dataset) this.glyphElement.dataset.activation = 'active';
    const receipt = this.receiptDetail('activated');
    this.dispatchEvent(new CustomEvent('hearthgate:sensory-activated', { detail: receipt }));
    return receipt;
  }

  async activateSound() {
    this.audioContext = this.createAudioContext();
    if (typeof this.audioContext.resume === 'function') await this.audioContext.resume();
    const context = this.audioContext;
    const now = context.currentTime || 0;
    const master = context.createGain();
    setAudioParam(master.gain, 0.0001, now);
    if (typeof master.gain?.exponentialRampToValueAtTime === 'function') {
      master.gain.exponentialRampToValueAtTime(0.72, now + 1.2);
    } else {
      master.gain.value = 0.72;
    }
    master.connect(context.destination);
    this.audioNodes.push(master);

    for (const layer of this.packet.sensory.tones) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = layer.waveform;
      setAudioParam(oscillator.frequency, layer.frequency_hz, now);
      if (oscillator.detune) setAudioParam(oscillator.detune, layer.detune_cents || 0, now);
      setAudioParam(gain.gain, layer.gain, now);

      let output = gain;
      if (typeof context.createStereoPanner === 'function') {
        const panner = context.createStereoPanner();
        setAudioParam(panner.pan, layer.pan || 0, now);
        connectChain(oscillator, gain, panner, master);
        output = panner;
        this.audioNodes.push(panner);
      } else {
        connectChain(oscillator, gain, master);
      }

      if (layer.modulation_hz > 0 && typeof context.createOscillator === 'function') {
        const modulation = context.createOscillator();
        const depth = context.createGain();
        modulation.type = 'sine';
        setAudioParam(modulation.frequency, layer.modulation_hz, now);
        setAudioParam(depth.gain, Math.min(layer.gain * 0.2, 0.02), now);
        connectChain(modulation, depth, gain.gain);
        modulation.start(now);
        this.audioNodes.push(modulation, depth);
      }

      oscillator.start(now);
      this.audioNodes.push(oscillator, gain, output);
    }
  }

  activateHaptics() {
    const plan = packetToHapticPlan(this.packet);
    if (this.vibrate) this.vibrate(plan.web_vibration_pattern);
    return plan;
  }

  async stop() {
    const stoppedNodes = [...new Set(this.audioNodes)];
    const stoppedContext = this.audioContext;
    const stoppedPacket = this.packet;
    const stoppedCrossRuntimeActivation = this.crossRuntimeActivation;
    const wasActive = this.active;

    this.audioNodes = [];
    this.audioContext = null;
    this.active = false;
    if (this.glyphElement?.dataset) this.glyphElement.dataset.activation = 'resting';

    for (const node of stoppedNodes) {
      try { node.stop?.(); } catch {}
      try { node.disconnect?.(); } catch {}
    }
    if (this.vibrate) {
      try { this.vibrate(0); } catch {}
    }
    if (stoppedContext) {
      try { await stoppedContext.close?.(); } catch {}
    }
    if (wasActive && stoppedPacket) {
      this.dispatchEvent(new CustomEvent('hearthgate:sensory-stopped', {
        detail: this.receiptDetail(
          'feather-stop',
          stoppedPacket,
          stoppedCrossRuntimeActivation,
        ),
      }));
    }
  }
}
