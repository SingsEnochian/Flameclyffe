import { WorkletSynthesizer } from 'spessasynth_lib';
import { SoundBankLoader } from 'spessasynth_core';
import { SYNAPTIC_HEARTFIELD_PROFILE, createHeartfieldReceipt, validateHeartfieldProfile } from './synaptic-heartfield.js';
import { BLUEBIRD_WEIGHTED_HOME, createBluebirdWeightedHomeReceipt, validateBluebirdWeightedHome } from './bluebird-weighted-home.js';


const SPESSASYNTH_WORKLET_URL = new URL('../../../node_modules/spessasynth_lib/dist/spessasynth_processor.min.js', import.meta.url).href;

export const STORY_SOUND_CUES = Object.freeze([
  { id: 'branch-snap', label: 'Branch snap', pattern: /\b(?:(?:branch|twig|stick|wood)\s+(?:snapped|cracked|broke)|(?:snapped|cracked|broke)\s+(?:a\s+|the\s+)?(?:branch|twig|stick))\b/giu },
  { id: 'door-knock', label: 'Door / knock', pattern: /\b(?:knock(?:ed|ing)?|door\s+(?:slammed|closed|opened|creaked))\b/giu },
  { id: 'thunder', label: 'Thunder', pattern: /\b(?:thunder(?:ed|ing)?|lightning\s+(?:struck|flashed)|storm\s+roared)\b/giu },
  { id: 'rain', label: 'Rain', pattern: /\b(?:rain(?:ed|ing)?|downpour|raindrops?)\b/giu },
  { id: 'wind', label: 'Wind', pattern: /\b(?:wind\s+(?:rose|howled|whispered|blew)|gust(?:ed)?|gale)\b/giu },
  { id: 'fire', label: 'Fire / hearth', pattern: /\b(?:fire\s+(?:crackled|roared)|hearth\s+(?:crackled|answered)|flames?\s+(?:caught|leapt|flickered))\b/giu },
  { id: 'footsteps', label: 'Footsteps', pattern: /\b(?:footsteps?|hoofbeats?|boots?\s+(?:struck|crossed)|(?:walked|ran)\s+(?:across|down|toward))\b/giu },
  { id: 'bell', label: 'Bell / chime', pattern: /\b(?:bells?\s+(?:rang|chimed)|chimes?\s+(?:rang|sounded)|a\s+bell\s+rang)\b/giu },
  { id: 'water', label: 'Water', pattern: /\b(?:waves?\s+(?:broke|crashed|answered)|water\s+(?:flowed|rushed|lapped)|stream\s+(?:ran|sang))\b/giu },
  { id: 'heartbeat', label: 'Heartbeat', pattern: /\b(?:heart\s+(?:beat|pounded|hammered)|heartbeat|pulse\s+(?:quickened|thudded))\b/giu },
]);

const WORLD_ROOTS = Object.freeze({
  'terra-aeterna': 220,
  luna: 432,
  'taveren-vaen': 120,
  'ta-veren-vaen': 120,
  starsong: 528,
  'equestria-starsong': 528,
  'hearthweave-foundation': 144,
});

export const WORLD_SOUNDFONT_MAPS = Object.freeze({
  'taveren-vaen': Object.freeze({
    id: 'taveren-vaen-greyspan-v1',
    title: 'Greyspan · Two Currents',
    tuning: Object.freeze({ rootHz: 120, referenceNote: 47, referencePitchHz: 123.47, centsFromReference: -49.4 }),
    voices: Object.freeze([
      Object.freeze({ id: 'tavian', label: 'Tavian · bearing line', channel: 0, bankMSB: 0, bankLSB: 0, program: 42, gmName: 'Cello', register: 'C2–C4', rootRatio: 0.5, velocity: 82, purpose: 'Earth-led load, restraint, endurance without glorification' }),
      Object.freeze({ id: 'kestrelle', label: 'Kestrelle · living thread', channel: 1, bankMSB: 0, bankLSB: 0, program: 15, gmName: 'Dulcimer', register: 'C4–C6', rootRatio: 2, velocity: 76, purpose: 'Medicine, memory, movement, precise restorative touch' }),
      Object.freeze({ id: 'dream', label: 'Tel’aran’rhiod · remembered span', channel: 2, bankMSB: 0, bankLSB: 0, program: 89, gmName: 'Warm Pad', register: 'C3–C6', rootRatio: 1.5, velocity: 54, purpose: 'The intact remembered structure behind waking failure' }),
      Object.freeze({ id: 'greyspan', label: 'Greyspan · field company', channel: 3, bankMSB: 0, bankLSB: 0, program: 60, gmName: 'French Horn', register: 'C3–C5', rootRatio: 1, velocity: 68, purpose: 'Collective arrival, warning, and transfer of command' }),
      Object.freeze({ id: 'resonant-bonding', label: 'Resonant Bonding · chosen confluence', channel: 4, bankMSB: 0, bankLSB: 0, program: 48, gmName: 'String Ensemble 1', register: 'C3–C6', rootRatio: 1, velocity: 72, purpose: 'Two audible lines in correspondence; never collapsed to unison' }),
      Object.freeze({ id: 'failure', label: 'Imminent failure · interference', channel: 9, bankMSB: 128, bankLSB: 0, program: 0, gmName: 'Standard Drum Kit', notes: [41, 45, 47], velocity: 46, purpose: 'Low frame/tom triplet for structural stress, never a heroic impact boom' }),
    ]),
    intervals: Object.freeze({ tavian: [1, 1.5, 2], kestrelle: [2, 2.5, 3], confluence: [1, 1.5, 2, 2.5, 3], warningBeatSeconds: [0, 0.36, 0.96] }),
  }),
});

const BUS_DEFAULTS = Object.freeze({ master: 0.72, hum: 0.22, tones: 0.48, effects: 0.72, ambience: 0.5 });
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number(value) || 0));

export function resolveWorldTone(world = {}) {
  const key = String(world.houseSourceKey || world.id || '').replace(/^house-world-/, '').toLowerCase();
  const supplied = Number(world.soundscape?.rootHz ?? world.root_hz ?? world.rootHz);
  return Object.freeze({
    worldId: world.id || key || 'unassigned-world',
    worldName: world.name || 'Unassigned World',
    rootHz: Number.isFinite(supplied) && supplied > 0 ? supplied : (WORLD_ROOTS[key] || 369),
    waveform: world.soundscape?.waveform || 'triangle',
    overtones: Math.max(1, Math.min(6, Number(world.soundscape?.overtones) || 3)),
  });
}

export function resolveWorldSoundfontMap(world = {}) {
  const key = String(world.houseSourceKey || world.id || '').replace(/^house-world-/, '').toLowerCase();
  return WORLD_SOUNDFONT_MAPS[key] || null;
}

export function findStorySoundCues(text, { fromIndex = 0 } = {}) {
  const source = String(text || '');
  const matches = [];
  for (const cue of STORY_SOUND_CUES) {
    cue.pattern.lastIndex = 0;
    for (const match of source.matchAll(cue.pattern)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (end <= fromIndex) continue;
      matches.push({ cue_id: cue.id, label: cue.label, text: match[0], start, end });
    }
  }
  return matches.sort((left, right) => left.start - right.start || left.cue_id.localeCompare(right.cue_id));
}

function noteForFrequency(frequency) {
  return Math.max(0, Math.min(127, Math.round(69 + 12 * Math.log2(frequency / 440))));
}

export class StorySoundscape {
  constructor() {
    this.context = null;
    this.master = null;
    this.buses = {};
    this.busValues = { ...BUS_DEFAULTS };
    this.world = resolveWorldTone();
    this.humSources = [];
    this.humActive = false;
    this.tracks = new Map();
    this.lastText = '';
    this.seenTextEvents = new Set();
    this.turnReceipts = [];
    this.recentReceipts = [];
    this.haptics = false;
    this.midiAccess = null;
    this.soundfontSynth = null;
    this.soundfontBanks = new Map();
    this.soundfontPresets = [];
    this.selectedSoundfontPreset = null;
    this.recording = null;
    this.captureDestination = null;
    this.heartfieldActive = false;
    this.heartfieldNodes = [];
    this.heartfieldOutput = null;
    this.heartfieldMasterValue = .25;
    this.heartfieldLayerState = Object.fromEntries(SYNAPTIC_HEARTFIELD_PROFILE.layers.map((layer) => [layer.id, { enabled: layer.enabled !== false, gain: layer.gain }]));
    this.heartfieldReceipts = [];
    this.bluebirdActive = false;
    this.bluebirdNodes = [];
    this.bluebirdOutput = null;
    this.bluebirdTimer = null;
    this.bluebirdMode = 'stereo';
    this.bluebirdSomaticProxy = false;
    this.bluebirdReceipts = [];
  }

  get armed() { return Boolean(this.context); }

  setWorld(world) {
    const previousRoot = this.world.rootHz;
    this.world = { ...this.world, ...resolveWorldTone(world) };
    this.soundfontMap = resolveWorldSoundfontMap(world);
    if (this.humActive && previousRoot !== this.world.rootHz) this.restartHum();
    return this.snapshot();
  }

  async arm(world) {
    this.setWorld(world);
    if (!this.context) {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio is unavailable in this browser.');
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = this.busValues.master;
      this.master.connect(this.context.destination);
      for (const name of ['hum', 'tones', 'effects', 'ambience']) {
        const node = this.context.createGain();
        node.gain.value = this.busValues[name];
        node.connect(this.master);
        this.buses[name] = node;
      }
      if (typeof this.context.createMediaStreamDestination === 'function') {
        this.captureDestination = this.context.createMediaStreamDestination();
        this.master.connect(this.captureDestination);
      }
    }
    if (this.context.state === 'suspended') await this.context.resume();
    return this.snapshot();
  }

  setBus(name, value) {
    if (!(name in this.busValues)) return;
    this.busValues[name] = clamp(value);
    const node = name === 'master' ? this.master : this.buses[name];
    if (node && this.context) node.gain.setTargetAtTime(this.busValues[name], this.context.currentTime, 0.015);
  }

  setRoot(value) {
    const root = Number(value);
    if (!Number.isFinite(root) || root < 20 || root > 20000) return;
    this.world.rootHz = root;
    if (this.humActive) this.restartHum();
  }

  setWaveform(value) {
    if (!['sine', 'triangle', 'sawtooth', 'square'].includes(value)) return;
    this.world.waveform = value;
    if (this.humActive) this.restartHum();
  }

  setOvertones(value) {
    this.world.overtones = Math.max(1, Math.min(6, Number(value) || 1));
    if (this.humActive) this.restartHum();
  }

  setHeartfieldLayer(id, value) {
    if (!this.heartfieldLayerState[id]) return;
    this.heartfieldLayerState[id].gain = clamp(value);
    const active = this.heartfieldActive;
    if (active) { this.stopHeartfield(); this.startHeartfield(); }
  }

  toggleHeartfieldLayer(id) {
    if (!this.heartfieldLayerState[id]) return;
    this.heartfieldLayerState[id].enabled = !this.heartfieldLayerState[id].enabled;
    const active = this.heartfieldActive;
    if (active) { this.stopHeartfield(); this.startHeartfield(); }
  }

  setHeartfieldMaster(value) {
    this.heartfieldMasterValue = Math.min(SYNAPTIC_HEARTFIELD_PROFILE.output_ceiling, clamp(value));
    if (this.heartfieldOutput && this.context) this.heartfieldOutput.gain.setTargetAtTime(this.heartfieldMasterValue, this.context.currentTime, .08);
  }

  heartfieldOscillator(frequency, destination, gainValue, pan = 0) {
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const panner = typeof this.context.createStereoPanner === 'function' ? this.context.createStereoPanner() : null;
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(Math.max(.0002, gainValue), now + .5);
    if (panner) { panner.pan.value = pan; oscillator.connect(gain).connect(panner).connect(destination); }
    else oscillator.connect(gain).connect(destination);
    oscillator.start(now); this.heartfieldNodes.push({ source: oscillator, gain, extras: panner ? [panner] : [] });
    return { oscillator, gain, panner };
  }

  heartfieldAmplitudeModulated(layer, destination, gainValue) {
    const voice = this.heartfieldOscillator(layer.carrierHz, destination, gainValue * .55);
    const modulator = this.context.createOscillator(); const depth = this.context.createGain();
    modulator.type = 'sine'; modulator.frequency.value = layer.modulationHz; depth.gain.value = gainValue * .45;
    modulator.connect(depth).connect(voice.gain.gain); modulator.start();
    voice.extras = [...(voice.extras || []), modulator, depth];
    this.heartfieldNodes.push({ source: modulator, gain: null, extras: [depth] });
  }

  heartfieldPinkNoise(destination, gainValue) {
    if (!this.context.createBufferSource) return;
    const seconds = 4, length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate); const data = buffer.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i=0;i<length;i+=1) { const w=Math.random()*2-1; b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;data[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.06;b6=w*.115926; }
    const source=this.context.createBufferSource(), gain=this.context.createGain(); source.buffer=buffer;source.loop=true;gain.gain.value=gainValue;source.connect(gain).connect(destination);source.start();this.heartfieldNodes.push({source,gain,extras:[]});
  }

  startHeartfield({ world = {}, premaqc = null, qualia = null, qualiaText = '' } = {}) {
    if (!this.context || this.heartfieldActive) return null;
    const validation = validateHeartfieldProfile(); if (!validation.valid) throw new Error(validation.errors.join('; '));
    this.heartfieldActive = true;
    const now = this.context.currentTime;
    this.heartfieldOutput = this.context.createGain();
    this.heartfieldOutput.gain.setValueAtTime(.0001, now);
    this.heartfieldOutput.gain.exponentialRampToValueAtTime(Math.max(.0002, this.heartfieldMasterValue), now + SYNAPTIC_HEARTFIELD_PROFILE.entry_ramp_seconds);
    this.heartfieldOutput.connect(this.buses.ambience);
    for (const layer of SYNAPTIC_HEARTFIELD_PROFILE.layers) {
      const state = this.heartfieldLayerState[layer.id]; if (!state.enabled || state.gain <= 0) continue;
      if (layer.kind === 'binaural') { this.heartfieldOscillator(layer.leftHz, this.heartfieldOutput, state.gain, -1); this.heartfieldOscillator(layer.rightHz, this.heartfieldOutput, state.gain, 1); }
      if (layer.kind === 'am') this.heartfieldAmplitudeModulated(layer, this.heartfieldOutput, state.gain);
      if (layer.kind === 'harmonic-bank') layer.frequencies.forEach((hz, index) => this.heartfieldOscillator(hz, this.heartfieldOutput, state.gain / Math.sqrt(layer.frequencies.length), index % 2 ? .55 : -.55));
      if (layer.kind === 'pink-noise') this.heartfieldPinkNoise(this.heartfieldOutput, state.gain);
    }
    const receipt=createHeartfieldReceipt({world,premaqc,qualia,qualiaText,layerState:this.heartfieldLayerState});this.heartfieldReceipts.unshift(receipt);this.heartfieldReceipts=this.heartfieldReceipts.slice(0,12);return receipt;
  }

  stopHeartfield() {
    const now=this.context?.currentTime||0;
    try { this.heartfieldOutput?.gain?.setTargetAtTime(.0001,now,.03); } catch {}
    for(const node of this.heartfieldNodes){try{node.gain?.gain?.setTargetAtTime(.0001,now,.05);node.source?.stop(now+.25);}catch{} for(const extra of node.extras||[]){try{extra.disconnect?.();}catch{}}}
    const output=this.heartfieldOutput; setTimeout(()=>{try{output?.disconnect?.();}catch{}},300);
    this.heartfieldNodes=[];this.heartfieldOutput=null;this.heartfieldActive=false;
  }

  setBluebirdMode(mode) {
    if (!['stereo', 'mono'].includes(mode) || this.bluebirdActive) return false;
    this.bluebirdMode = mode;
    return true;
  }

  setBluebirdSomaticProxy(enabled) {
    if (this.bluebirdActive) return false;
    this.bluebirdSomaticProxy = Boolean(enabled);
    return true;
  }

  bluebirdSoundfontLayer() {
    if (!this.soundfontSynth || !this.soundfontPresets.length) return [];
    const sounding = [];
    for (const voice of BLUEBIRD_WEIGHTED_HOME.soundfontVoices) {
      const preset = this.soundfontPresets.find((item) => !item.isDrum && item.program === voice.program);
      if (!preset) continue;
      this.soundfontSynth.midiChannels[voice.channel]?.setDrums(false);
      this.soundfontSynth.sendMessage([0xb0 | voice.channel, 0, preset.bankMSB]);
      this.soundfontSynth.sendMessage([0xb0 | voice.channel, 32, preset.bankLSB]);
      this.soundfontSynth.programChange(voice.channel, preset.program);
      this.soundfontSynth.noteOn(voice.channel, voice.midiNote, voice.velocity);
      sounding.push(voice.id);
    }
    return sounding;
  }

  startBluebirdWeightedHome() {
    if (!this.context || this.bluebirdActive) return null;
    const validation = validateBluebirdWeightedHome();
    if (!validation.valid) throw new Error(validation.errors.join('; '));
    this.bluebirdActive = true;
    const now = this.context.currentTime;
    this.bluebirdOutput = this.context.createGain();
    this.bluebirdOutput.gain.setValueAtTime(.0001, now);
    this.bluebirdOutput.gain.exponentialRampToValueAtTime(BLUEBIRD_WEIGHTED_HOME.outputCeiling, now + BLUEBIRD_WEIGHTED_HOME.entryRampSeconds);
    this.bluebirdOutput.connect(this.buses.ambience);
    const nodeStart = this.heartfieldNodes.length;
    if (this.bluebirdMode === 'stereo') {
      this.heartfieldOscillator(BLUEBIRD_WEIGHTED_HOME.stereo.leftHz, this.bluebirdOutput, .07, -1);
      this.heartfieldOscillator(BLUEBIRD_WEIGHTED_HOME.stereo.rightHz, this.bluebirdOutput, .07, 1);
    } else {
      this.heartfieldAmplitudeModulated(BLUEBIRD_WEIGHTED_HOME.monoFallback, this.bluebirdOutput, .11);
    }
    if (this.bluebirdSomaticProxy) this.heartfieldAmplitudeModulated({
      carrierHz: BLUEBIRD_WEIGHTED_HOME.somaticProxy.carrierHz,
      modulationHz: BLUEBIRD_WEIGHTED_HOME.somaticProxy.pulseHz,
    }, this.bluebirdOutput, .08);
    this.bluebirdNodes = this.heartfieldNodes.splice(nodeStart);
    const soundfontVoiceIds = this.bluebirdSoundfontLayer();
    const receipt = createBluebirdWeightedHomeReceipt({ mode: this.bluebirdMode, soundfontVoiceIds, somaticProxy: this.bluebirdSomaticProxy });
    this.bluebirdReceipts.unshift(receipt);
    this.bluebirdReceipts = this.bluebirdReceipts.slice(0, 12);
    this.bluebirdTimer = globalThis.setTimeout(() => this.stopBluebirdWeightedHome('bounded-duration-complete'), BLUEBIRD_WEIGHTED_HOME.durationSeconds * 1000);
    return receipt;
  }

  stopBluebirdWeightedHome() {
    if (this.bluebirdTimer) globalThis.clearTimeout(this.bluebirdTimer);
    this.bluebirdTimer = null;
    const now = this.context?.currentTime || 0;
    try { this.bluebirdOutput?.gain?.setTargetAtTime(.0001, now, BLUEBIRD_WEIGHTED_HOME.exitRampSeconds / 4); } catch {}
    for (const voice of BLUEBIRD_WEIGHTED_HOME.soundfontVoices) this.soundfontSynth?.noteOff(voice.channel, voice.midiNote);
    for (const node of this.bluebirdNodes) {
      try { node.gain?.gain?.setTargetAtTime(.0001, now, .05); node.source?.stop(now + BLUEBIRD_WEIGHTED_HOME.exitRampSeconds); } catch {}
      for (const extra of node.extras || []) { try { extra.disconnect?.(); } catch {} }
    }
    const output = this.bluebirdOutput;
    globalThis.setTimeout(() => { try { output?.disconnect?.(); } catch {} }, (BLUEBIRD_WEIGHTED_HOME.exitRampSeconds * 1000) + 50);
    this.bluebirdNodes = [];
    this.bluebirdOutput = null;
    this.bluebirdActive = false;
  }

  startHum() {
    if (!this.context || this.humActive) return;
    this.humActive = true;
    const now = this.context.currentTime;
    const ratios = [1, 1.5, 2, 3, 4, 5].slice(0, this.world.overtones);
    this.humSources = ratios.map((ratio, index) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = index === 0 ? this.world.waveform : 'sine';
      oscillator.frequency.value = this.world.rootHz * ratio;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.002, 0.08 / (index + 1)), now + 0.25);
      oscillator.connect(gain).connect(this.buses.hum);
      oscillator.start(now);
      return { oscillator, gain };
    });
  }

  stopHum() {
    const now = this.context?.currentTime || 0;
    for (const { oscillator, gain } of this.humSources) {
      try { gain.gain.setTargetAtTime(0.0001, now, 0.05); oscillator.stop(now + 0.25); } catch {}
    }
    this.humSources = [];
    this.humActive = false;
  }

  restartHum() {
    const active = this.humActive;
    this.stopHum();
    if (active) this.startHum();
  }

  playWorldTone(frequency = this.world.rootHz, duration = 1.2) {
    if (!this.context) return;
    const now = this.context.currentTime;
    [1, 1.5, 2].forEach((ratio, index) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = index ? 'sine' : this.world.waveform;
      oscillator.frequency.setValueAtTime(frequency * ratio, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18 / (index + 1), now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain).connect(this.buses.tones);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.03);
    });
    this.playSoundfontNote(frequency, duration, 108);
    this.sendMidi(frequency, Math.round(duration * 1000));
  }

  async ensureSoundfontSynth() {
    if (this.soundfontSynth) return this.soundfontSynth;
    if (!this.context?.audioWorklet) throw new Error('AudioWorklet is required for SoundFont playback in this browser.');
    await this.context.audioWorklet.addModule(SPESSASYNTH_WORKLET_URL);
    const { WorkletSynthesizer } = await import('spessasynth_lib');
    const synth = new WorkletSynthesizer(this.context);
    synth.connect(this.buses.tones);
    this.soundfontSynth = synth;
    return synth;
  }

  presetKey(preset) {
    return [preset.isDrum ? 'D' : 'M', preset.bankMSB, preset.bankLSB, preset.program].join(':');
  }

  selectSoundfontPreset(key) {
    const preset = this.soundfontPresets.find((item) => this.presetKey(item) === key);
    if (!preset || !this.soundfontSynth) return false;
    const channel = preset.isDrum ? 9 : 0;
    this.soundfontSynth.midiChannels[channel]?.setDrums(Boolean(preset.isDrum));
    this.soundfontSynth.sendMessage([0xb0 | channel, 0, preset.bankMSB]);
    this.soundfontSynth.sendMessage([0xb0 | channel, 32, preset.bankLSB]);
    this.soundfontSynth.programChange(channel, preset.program);
    this.selectedSoundfontPreset = { ...preset, key: this.presetKey(preset), channel };
    return true;
  }

  async loadSoundfontFiles(files) {
    if (!this.context) throw new Error('Arm the soundscape before loading a SoundFont.');
    const synth = await this.ensureSoundfontSynth();
    const loaded = [];
    for (const file of [...files]) {
      if (!/\.(?:sf2|sf3|sfogg|dls)$/iu.test(file.name)) throw new Error(`${file.name} is not an SF2, SF3, SFOGG, or DLS bank.`);
      const id = `soundfont-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const buffer = await file.arrayBuffer();
      let parsed;
      try {
        parsed = SoundBankLoader.fromArrayBuffer(buffer.slice(0));
      } catch (error) {
        throw new Error(`${file.name} could not be parsed as a SoundFont bank: ${error.message}`);
      }
      await synth.soundBankManager.addSoundBank(buffer, id);
      await synth.isReady;
      this.soundfontBanks.set(id, {
        id,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        presetCount: parsed.presets?.length || 0,
      });
      loaded.push(id);
    }
    this.soundfontPresets = synth.presetList.map((preset) => ({ ...preset }));
    if (!this.selectedSoundfontPreset && this.soundfontPresets.length) {
      const first = this.soundfontPresets.find((preset) => !preset.isDrum) || this.soundfontPresets[0];
      this.selectSoundfontPreset(this.presetKey(first));
    }
    return loaded;
  }

  playSoundfontNote(frequency = this.world.rootHz, duration = 1, velocity = 108) {
    if (!this.soundfontSynth || !this.selectedSoundfontPreset) return false;
    const note = noteForFrequency(frequency);
    const channel = this.selectedSoundfontPreset.channel;
    this.soundfontSynth.noteOn(channel, note, Math.max(1, Math.min(127, velocity)));
    globalThis.setTimeout(() => this.soundfontSynth?.noteOff(channel, note), Math.max(30, duration * 1000));
    return true;
  }

  noise(duration) {
    const length = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    return buffer;
  }

  noiseBurst({ duration = 0.12, frequency = 1800, type = 'bandpass', peak = 0.6, attack = 0.002 } = {}) {
    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noise(duration);
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = type === 'bandpass' ? 1.3 : 0.7;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(this.buses.effects);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  thump(frequency = 110, duration = 0.18, peak = 0.5, delay = 0) {
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * 0.45), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.buses.effects);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  playCue(cueId) {
    if (!this.context) return;
    if (cueId === 'branch-snap') { this.noiseBurst({ duration: 0.075, frequency: 2400, peak: 0.8 }); this.thump(155, 0.09, 0.45, 0.008); }
    if (cueId === 'door-knock') { this.thump(95, 0.16, 0.65); this.thump(82, 0.17, 0.5, 0.16); }
    if (cueId === 'thunder') { this.noiseBurst({ duration: 1.3, frequency: 190, type: 'lowpass', peak: 0.7, attack: 0.03 }); this.thump(48, 1.1, 0.6); }
    if (cueId === 'rain') this.noiseBurst({ duration: 2.2, frequency: 4100, type: 'highpass', peak: 0.32, attack: 0.18 });
    if (cueId === 'wind') this.noiseBurst({ duration: 1.8, frequency: 620, type: 'bandpass', peak: 0.38, attack: 0.2 });
    if (cueId === 'fire') { [0, .08, .2, .31].forEach((delay, index) => globalThis.setTimeout(() => this.noiseBurst({ duration: .045, frequency: 1600 + index * 430, peak: .34 }), delay * 1000)); }
    if (cueId === 'footsteps') { this.thump(72, .15, .45); this.thump(66, .15, .4, .32); }
    if (cueId === 'bell') { this.playWorldTone(this.world.rootHz * 2, 1.8); this.playWorldTone(this.world.rootHz * 3, 1.45); }
    if (cueId === 'water') this.noiseBurst({ duration: 1.4, frequency: 900, type: 'bandpass', peak: .3, attack: .12 });
    if (cueId === 'heartbeat') { this.thump(58, .18, .52); this.thump(52, .16, .38, .22); }
    const soundfontRatios = { 'branch-snap': 2, 'door-knock': .5, thunder: .25, rain: 2.5, wind: 1, fire: 1.5, footsteps: .5, bell: 3, water: 1.25, heartbeat: .25 };
    this.playSoundfontNote(this.world.rootHz * (soundfontRatios[cueId] || 1), cueId === 'thunder' ? 1.2 : .32, cueId === 'thunder' ? 118 : 96);
    if (this.haptics && globalThis.navigator?.vibrate) globalThis.navigator.vibrate(cueId === 'thunder' ? [80, 40, 160] : [18, 24, 34]);
    this.sendMidi(this.world.rootHz * (cueId === 'branch-snap' ? 2 : 1), cueId === 'thunder' ? 900 : 180);
  }

  async enableMidi() {
    if (!globalThis.navigator?.requestMIDIAccess) throw new Error('Web MIDI is unavailable in this browser.');
    this.midiAccess = await globalThis.navigator.requestMIDIAccess();
  }

  sendMidi(frequency, duration = 180) {
    if (!this.midiAccess) return;
    const note = noteForFrequency(frequency);
    for (const output of this.midiAccess.outputs.values()) {
      output.send([0x90, note, 92]);
      output.send([0x80, note, 0], globalThis.performance.now() + duration);
    }
  }

  seedText(text = '') {
    this.lastText = String(text);
  }

  triggerMatches(matches, origin = 'live-writing') {
    if (!this.armed) return [];
    const triggered = [];
    for (const match of matches) {
      const signature = `${match.cue_id}:${match.start}:${match.end}`;
      if (this.seenTextEvents.has(signature)) continue;
      this.seenTextEvents.add(signature);
      this.playCue(match.cue_id);
      const receipt = Object.freeze({
        schema: 'arcsweep.story-sound-event/v1',
        event_id: `sound-${Date.now()}-${match.start}-${match.cue_id}`,
        world_id: this.world.worldId,
        cue_id: match.cue_id,
        cue_label: match.label,
        source_text: match.text,
        source_span: [match.start, match.end],
        origin,
        root_hz: this.world.rootHz,
        waveform: this.world.waveform,
        outputs: { audio: true, soundfont: Boolean(this.selectedSoundfontPreset), haptic: this.haptics, midi: Boolean(this.midiAccess) },
        soundfont_preset: this.selectedSoundfontPreset ? { ...this.selectedSoundfontPreset } : null,
        fired_at: new Date().toISOString(),
      });
      this.turnReceipts.push(receipt);
      this.recentReceipts.unshift(receipt);
      this.recentReceipts = this.recentReceipts.slice(0, 12);
      triggered.push(receipt);
    }
    return triggered;
  }

  handleText(text) {
    const source = String(text || '');
    const extendsPrevious = source.startsWith(this.lastText);
    const fromIndex = extendsPrevious ? Math.max(0, this.lastText.length - 80) : 0;
    if (source.length < this.lastText.length) {
      for (const signature of this.seenTextEvents) {
        const start = Number(signature.split(':')[1]);
        if (start >= source.length) this.seenTextEvents.delete(signature);
      }
    }
    const matches = findStorySoundCues(source, { fromIndex }).filter((match) => !extendsPrevious || match.end > this.lastText.length);
    this.lastText = source;
    return this.triggerMatches(matches);
  }

  auditionText(text) {
    this.seenTextEvents.clear();
    return this.triggerMatches(findStorySoundCues(text), 'audition');
  }

  async loadFiles(files) {
    if (!this.context) throw new Error('Arm the soundscape before loading audio.');
    const loaded = [];
    for (const file of [...files]) {
      const buffer = await this.context.decodeAudioData(await file.arrayBuffer());
      const id = `track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const gain = this.context.createGain();
      gain.gain.value = 0.65;
      gain.connect(this.buses.ambience);
      this.tracks.set(id, { id, name: file.name, buffer, gain, source: null, playing: false, loop: true, level: 0.65 });
      loaded.push(id);
    }
    return loaded;
  }

  toggleTrack(id) {
    const track = this.tracks.get(id);
    if (!track) return;
    if (track.playing) {
      try { track.source.stop(); } catch {}
      track.source = null;
      track.playing = false;
      return;
    }
    const source = this.context.createBufferSource();
    source.buffer = track.buffer;
    source.loop = track.loop;
    source.connect(track.gain);
    source.start();
    source.onended = () => { if (!source.loop) track.playing = false; };
    track.source = source;
    track.playing = true;
  }

  setTrackLevel(id, value) {
    const track = this.tracks.get(id);
    if (!track) return;
    track.level = clamp(value);
    track.gain.gain.setTargetAtTime(track.level, this.context.currentTime, 0.015);
  }

  removeTrack(id) {
    const track = this.tracks.get(id);
    if (!track) return;
    if (track.playing) { try { track.source.stop(); } catch {} }
    track.gain.disconnect();
    this.tracks.delete(id);
  }

  async startRecording() {
    if (!this.captureDestination || typeof globalThis.MediaRecorder !== 'function') throw new Error('Mix recording is unavailable in this browser.');
    const chunks = [];
    const recorder = new MediaRecorder(this.captureDestination.stream);
    recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data); });
    recorder.start();
    this.recording = { recorder, chunks };
  }

  stopRecording() {
    if (!this.recording) return Promise.resolve(null);
    const { recorder, chunks } = this.recording;
    return new Promise((resolve) => {
      recorder.addEventListener('stop', () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        this.recording = null;
        resolve(blob);
      }, { once: true });
      recorder.stop();
    });
  }

  featherStop() {
    this.stopHum();
    this.stopHeartfield();
    this.stopBluebirdWeightedHome('Feather');
    for (const track of this.tracks.values()) {
      if (!track.playing) continue;
      try { track.source.stop(); } catch {}
      track.source = null;
      track.playing = false;
    }
    this.soundfontSynth?.stopAll(true);
    if (this.context?.state === 'running') void this.context.suspend();
  }

  getTurnReceipts() { return structuredClone(this.turnReceipts); }
  clearTurn(text = '') { this.turnReceipts = []; this.seenTextEvents.clear(); this.lastText = String(text); }

  snapshot() {
    return {
      armed: this.armed,
      humActive: this.humActive,
      recording: Boolean(this.recording),
      haptics: this.haptics,
      midi: Boolean(this.midiAccess),
      soundfont: Boolean(this.soundfontSynth),
      soundfontBanks: [...this.soundfontBanks.values()].map((bank) => ({ ...bank })),
      soundfontPresets: this.soundfontPresets.map((preset) => ({ ...preset, key: this.presetKey(preset) })),
      soundfontMap: this.soundfontMap,
      selectedSoundfontPreset: this.selectedSoundfontPreset ? { ...this.selectedSoundfontPreset } : null,
      world: { ...this.world },
      buses: { ...this.busValues },
      tracks: [...this.tracks.values()].map(({ id, name, playing, loop, level }) => ({ id, name, playing, loop, level })),
      recentReceipts: structuredClone(this.recentReceipts),
      heartfield: { profile: SYNAPTIC_HEARTFIELD_PROFILE, active: this.heartfieldActive, master: this.heartfieldMasterValue, layers: structuredClone(this.heartfieldLayerState), receipts: structuredClone(this.heartfieldReceipts) },
      bluebird: { profile: BLUEBIRD_WEIGHTED_HOME, active: this.bluebirdActive, mode: this.bluebirdMode, somaticProxy: this.bluebirdSomaticProxy, soundfontPrograms: this.soundfontPresets.filter((preset) => !preset.isDrum).map((preset) => preset.program), receipts: structuredClone(this.bluebirdReceipts) },
    };
  }
}
