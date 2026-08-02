import assert from 'node:assert/strict';
import test from 'node:test';

import { createKernelAuthorityProof } from '../src/hearthweave-kernel/cross-runtime.js';

import {
  HearthgateSensoryBridge,
  packetToCssVariables,
  packetToHapticPlan,
  verifySensoryPacket,
} from '../src/hearthgate-sensory-bridge.js';

if (typeof globalThis.CustomEvent !== 'function') {
  globalThis.CustomEvent = class CustomEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this.detail = options.detail;
    }
  };
}

const BASIS = 'a'.repeat(64);
const PACKET_HASH = 'b'.repeat(64);

function packet({ answered = true, identity = 'test:templehouse' } = {}) {
  return {
    schema: 'hearthgate.dual-aspect-packet.v1',
    identity,
    house_id: 'templehouse',
    bridge: {
      origin_house: 'terra-prime',
      destination_house: 'templehouse',
      centre: 'hearthweave',
      origin_witness: 'traveller',
      reception_witness: answered ? 'resident-host' : null,
      state: answered ? 'bound' : 'waiting',
    },
    correspondence: {
      basis_hash: BASIS,
      observable_hash: 'c'.repeat(64),
      experiential_hash: 'd'.repeat(64),
      transfer_function: 'templehouse.dual-aspect.v1',
      house_profile_version: 'templehouse.v1',
    },
    sensory: {
      source_state_hash: BASIS,
      tones: [
        { role:'anchor', frequency_hz:174, gain:.02, waveform:'triangle', detune_cents:0, pan:-.22, modulation_hz:.55 },
        { role:'living', frequency_hz:217.5, gain:.025, waveform:'sine', detune_cents:0, pan:.22, modulation_hz:.65 },
        { role:'bind', frequency_hz:261, gain:.016, waveform:'sine', detune_cents:0, pan:0, modulation_hz:.55 },
      ],
      haptics: [
        { role:'call', duration_ms:80, intensity:.8, gap_after_ms:90 },
        { role:'answer', duration_ms:130, intensity:answered ? .75 : 0, gap_after_ms:120 },
        ...(answered ? [{ role:'bind', duration_ms:210, intensity:.82, gap_after_ms:0 }] : []),
      ],
      glyph: {
        arrival_stroke:'porch-lantern',
        reception_stroke:answered ? 'open-door' : null,
        hearthweave_bind:'shared-fire',
        activation:answered ? .78 : .42,
        complete:answered,
      },
      visual: {
        geometry:'open-hearth-and-lantern-path',
        palette:['#17120f','#b56d3b','#d9bd82','#5e806b'],
        motion:.775,
        luminance:.84,
        structure_weight:.91,
        atmosphere_weight:.815,
      },
    },
    receipts: [{
      receipt_id:'hearthgate-test',
      packet_hash:PACKET_HASH,
      engine_version:'hearthgate-kernel.v0.1',
      status:'VERIFIED',
      claims:{
        shared_state:'VERIFIED',
        dual_aspect:'VERIFIED',
        sound_image_glyph_shared_state:'VERIFIED',
      },
      created_at:'2026-08-02T06:00:00Z',
    }],
  };
}


function trustedKernelVerifier(packet) {
  return Promise.resolve(createKernelAuthorityProof(
    packet,
    {
      schema:'hearthgate.integrity-audit.v1',
      identity:packet.identity,
      house_id:packet.house_id,
      status:'VERIFIED',
      claims:{shared_state:'VERIFIED',receipt_integrity:'VERIFIED'},
    },
    {
      schema:'hearthgate.replay-result.v1',
      packet_hash:packet.receipts.at(-1).packet_hash,
      verified:true,
    },
    {authority:'synthetic-test-verifier'},
  ));
}

class FakeParam {
  constructor() { this.value = 0; this.events = []; }
  setValueAtTime(value, at) { this.value = value; this.events.push(['set',value,at]); }
  exponentialRampToValueAtTime(value, at) { this.value = value; this.events.push(['ramp',value,at]); }
}

class FakeNode {
  constructor(kind) {
    this.kind = kind;
    this.connections = [];
    this.started = false;
    this.stopped = false;
    this.disconnected = false;
  }
  connect(target) { this.connections.push(target); return target; }
  disconnect() { this.disconnected = true; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}

class FakeAudioContext {
  constructor({ closeGate = null } = {}) {
    this.currentTime = 1;
    this.destination = new FakeNode('destination');
    this.gains = [];
    this.oscillators = [];
    this.panners = [];
    this.resumed = false;
    this.closed = false;
    this.closeGate = closeGate;
  }
  createGain() {
    const node = new FakeNode('gain');
    node.gain = new FakeParam();
    this.gains.push(node);
    return node;
  }
  createOscillator() {
    const node = new FakeNode('oscillator');
    node.frequency = new FakeParam();
    node.detune = new FakeParam();
    this.oscillators.push(node);
    return node;
  }
  createStereoPanner() {
    const node = new FakeNode('panner');
    node.pan = new FakeParam();
    this.panners.push(node);
    return node;
  }
  async resume() { this.resumed = true; }
  async close() {
    if (this.closeGate) await this.closeGate;
    this.closed = true;
  }
}

function fakeElement() {
  return {
    dataset:{},
    attributes:{},
    setAttribute(name,value) { this.attributes[name] = value; },
  };
}

function fakeRoot() {
  return {
    dataset:{},
    style:{
      values:{},
      setProperty(name,value) { this.values[name] = value; },
    },
  };
}

test('verified packets are cloned, frozen, and bind every renderer to one basis', () => {
  const input = packet();
  const verified = verifySensoryPacket(input);
  const css = packetToCssVariables(input);
  const haptic = packetToHapticPlan(input);

  assert.notEqual(verified, input);
  assert.equal(Object.isFrozen(verified), true);
  assert.equal(verified.sensory.source_state_hash, verified.correspondence.basis_hash);
  assert.equal(css['--hg-palette-1'], '#b56d3b');
  assert.equal(haptic.basis_hash, BASIS);
  assert.deepEqual(haptic.pulses.map((pulse) => pulse.role), ['call','answer','bind']);
});

test('hidden state divergence and failed receipts are rejected before rendering', () => {
  const divergent = packet();
  divergent.sensory.source_state_hash = '0'.repeat(64);
  assert.throws(() => verifySensoryPacket(divergent), /sensory state diverges/);

  const failed = packet();
  failed.receipts[0].claims.shared_state = 'FAILED';
  assert.throws(() => verifySensoryPacket(failed), /unverified claim/);
});

test('waiting glyph preserves a zero-intensity answer as physical silence', () => {
  const waiting = verifySensoryPacket(packet({ answered:false }));
  const plan = packetToHapticPlan(waiting);

  assert.equal(waiting.sensory.glyph.complete, false);
  assert.equal(waiting.sensory.glyph.reception_stroke, null);
  assert.equal(plan.pulses.find((pulse) => pulse.role === 'answer').intensity, 0);
  assert.deepEqual(plan.web_vibration_pattern, [64, 90, 0, 120]);
});

test('activation renders packet frequencies, visual state and haptics then Feather Stop closes all', async () => {
  const context = new FakeAudioContext();
  const vibrations = [];
  const root = fakeRoot();
  const glyph = fakeElement();
  const bridge = new HearthgateSensoryBridge({
    root,
    glyphElement:glyph,
    audioContextFactory:() => context,
    vibrate:(pattern) => vibrations.push(pattern),
    kernelVerifier:trustedKernelVerifier,
  });

  const received = await bridge.receive(packet());
  assert.equal(received.correspondence.basis_hash, BASIS);
  assert.equal(root.dataset.hearthgateBasis, BASIS);
  assert.equal(glyph.dataset.state, 'bound');

  const receipt = await bridge.activate();
  assert.equal(receipt.basis_hash, BASIS);
  assert.equal(context.resumed, true);
  assert.equal(context.oscillators.length, 6); // three voices and three modulation oscillators
  assert.deepEqual(
    context.oscillators.slice(0, 1).map((oscillator) => oscillator.frequency.value),
    [174],
  );
  const activationPattern = vibrations.find((value) => Array.isArray(value));
  assert.equal(Array.isArray(activationPattern), true);
  assert.equal(glyph.dataset.activation, 'active');

  await bridge.stop();
  assert.equal(context.closed, true);
  assert.equal(glyph.dataset.activation, 'resting');
  assert.equal(vibrations.at(-1), 0);
  assert.equal(context.oscillators.every((node) => node.stopped), true);
});

test('replacement reception waits for prior AudioContext teardown', async () => {
  let releaseClose;
  const closeGate = new Promise((resolve) => { releaseClose = resolve; });
  const firstContext = new FakeAudioContext({ closeGate });
  const bridge = new HearthgateSensoryBridge({
    root:fakeRoot(),
    glyphElement:fakeElement(),
    audioContextFactory:() => firstContext,
    vibrate:() => true,
    kernelVerifier:trustedKernelVerifier,
  });

  await bridge.receive(packet({ identity:'first-packet' }));
  await bridge.activate({ haptics:false });
  const replacement = bridge.receive(packet({ identity:'second-packet' }));

  await Promise.resolve();
  assert.equal(bridge.packet.identity, 'first-packet');
  assert.equal(firstContext.closed, false);

  releaseClose();
  const received = await replacement;
  assert.equal(firstContext.closed, true);
  assert.equal(received.identity, 'second-packet');
  assert.equal(bridge.packet.identity, 'second-packet');
  assert.equal(bridge.active, false);
});
