// Worldweave atmospheres share the existing StorySoundscape AudioContext and ambience bus.
// These are intentionally modest procedural studies, not recordings of real environments.
export const WORLDWEAVE_ACOUSTIC_SCHEMA = 'arcsweep.worldweave-acoustics/v1';
export const WORLDWEAVE_MOTIF_ID = 'moonmere-sealed-door-echo/v1';
export const WORLDWEAVE_MOTIF_SEMITONES = Object.freeze([0, 3, 7]);

const profiles = [
  {
    id: 'windmere', worldId: 'luna', name: 'Windmere · Eira',
    description: 'Moonmere water, reed-wind and a low, held nocturnal resonance.',
    textures: [
      { id: 'moonmere-water', filter: 'lowpass', frequency: 480, q: 0.6, gain: 0.13, drift: 0.10 },
      { id: 'reeds', filter: 'bandpass', frequency: 1850, q: 0.8, gain: 0.045, drift: 0.19 },
    ],
    drone: { ratio: 0.5, gain: 0.014, waveform: 'sine' },
  },
  {
    id: 'third-city', worldId: 'terra-aeterna', name: 'Terra Aeterna · Falka',
    description: 'The immense quiet of the Third City: stone, ventilation and distant structure.',
    textures: [
      { id: 'city-air', filter: 'bandpass', frequency: 220, q: 0.45, gain: 0.12, drift: 0.06 },
      { id: 'stone-air', filter: 'lowpass', frequency: 770, q: 0.7, gain: 0.065, drift: 0.12 },
    ],
    drone: { ratio: 1, gain: 0.011, waveform: 'triangle' },
  },
  {
    id: 'starsong', worldId: 'equestria-starsong', name: 'Starsong · Equestria',
    description: 'Meadow air, light leaves and a warm musical resonance.',
    textures: [
      { id: 'meadow-breeze', filter: 'bandpass', frequency: 1070, q: 0.48, gain: 0.09, drift: 0.11 },
      { id: 'high-grass', filter: 'highpass', frequency: 2200, q: 0.7, gain: 0.025, drift: 0.17 },
    ],
    drone: { ratio: 0.5, gain: 0.012, waveform: 'sine' },
  },
];
export const WORLDWEAVE_ACOUSTIC_PROFILES = Object.freeze(
  profiles.map((p) => Object.freeze({ ...p, textures: Object.freeze(p.textures.map((t) => Object.freeze({ ...t }))), drone: Object.freeze({ ...p.drone }) })),
);
const byId = new Map(WORLDWEAVE_ACOUSTIC_PROFILES.map((p) => [p.id, p]));
const aliases = Object.freeze({
  luna: 'windmere',
  windmere: 'windmere',
  'the-luna-who-called-down-the-moon': 'windmere',
  'terra-aeterna': 'third-city',
  'third-city': 'third-city',
  starsong: 'starsong',
  'equestria-starsong': 'starsong',
  'starsong-friendship-is-magic': 'starsong',
});

export function resolveWorldweaveAcousticProfile(world) {
  const names = typeof world === 'string' ? [world] : [
    world?.houseSourceKey, world?.id, world?.worldId, world?.world_id,
  ];
  for (const name of names) {
    const key = String(name || '').trim().toLowerCase().replace(/^house-world-/, '');
    const profile = byId.get(aliases[key] || key);
    if (profile) return profile;
  }
  return null;
}

export function worldweaveMotifFrequencies(rootHz) {
  const root = Number(rootHz);
  if (!Number.isFinite(root) || root < 20 || root > 8000) throw new RangeError('A usable audible root is required.');
  return WORLDWEAVE_MOTIF_SEMITONES.map((semitones) => root * 2 ** (semitones / 12));
}

function seedFor(text) {
  let value = 2166136261;
  for (const ch of text) value = Math.imul(value ^ ch.charCodeAt(0), 16777619) >>> 0;
  return value || 1;
}

function noiseBuffer(context, seed) {
  const frames = Math.ceil(context.sampleRate * 2);
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let value = seedFor(seed);
  for (let i = 0; i < samples.length; i += 1) {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    samples[i] = ((value >>> 0) / 2147483648 - 1) * 0.5;
  }
  return buffer;
}

function record(id, action, sceneId, reason = 'user-action') {
  return Object.freeze({
    schema: WORLDWEAVE_ACOUSTIC_SCHEMA,
    event_id: 'worldweave-' + id + '-' + Date.now(),
    action,
    scene_id: sceneId,
    reason,
    source: 'procedural-audio-preview',
    canon_effect: false,
    at: new Date().toISOString(),
  });
}

export class WorldweaveAcoustics {
  constructor(soundscape, { storage } = {}) {
    this.soundscape = soundscape;
    this.active = null;
    this.receipts = [];
    this.storage = storage;
    if (storage === undefined) {
      try { this.storage = globalThis.localStorage || null; } catch { this.storage = null; }
    }
    this.lastSceneId = null;
    try {
      const saved = JSON.parse(this.storage?.getItem('arcsweep.worldweave-acoustic-intent/v1') || 'null');
      if (byId.has(saved?.sceneId)) this.lastSceneId = saved.sceneId;
    } catch { /* storage is optional */ }
  }

  _remember(sceneId) {
    this.lastSceneId = sceneId;
    try { this.storage?.setItem('arcsweep.worldweave-acoustic-intent/v1', JSON.stringify({ sceneId, resume: 'user-gesture-required' })); } catch {}
  }

  _receipt(action, profile, reason) {
    const item = record(profile.worldId, action, profile.id, reason);
    this.receipts.unshift(item);
    this.receipts.length = Math.min(this.receipts.length, 20);
    return item;
  }

  _build(profile) {
    const context = this.soundscape.context;
    const destination = this.soundscape.buses?.ambience;
    if (!context || !destination) throw new Error('Arm the existing World Sound Mixer before starting an atmosphere.');
    const now = context.currentTime;
    const output = context.createGain();
    output.gain.setValueAtTime(0.0001, now);
    output.gain.linearRampToValueAtTime(0.62, now + 1.5);
    output.connect(destination);
    const voices = [];
    for (const layer of profile.textures) {
      const noise = context.createBufferSource();
      noise.buffer = noiseBuffer(context, profile.id + ':' + layer.id);
      noise.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = layer.filter;
      filter.frequency.value = layer.frequency;
      filter.Q.value = layer.q;
      const gain = context.createGain();
      gain.gain.value = layer.gain;
      const sway = context.createOscillator();
      sway.type = 'sine';
      sway.frequency.value = layer.drift;
      const depth = context.createGain();
      depth.gain.value = layer.gain * 0.22;
      sway.connect(depth).connect(gain.gain);
      noise.connect(filter).connect(gain).connect(output);
      noise.start(now);
      sway.start(now);
      voices.push(noise, sway);
    }
    const drone = context.createOscillator();
    drone.type = profile.drone.waveform;
    drone.frequency.value = this.soundscape.world.rootHz * profile.drone.ratio;
    const droneGain = context.createGain();
    droneGain.gain.value = profile.drone.gain;
    drone.connect(droneGain).connect(output);
    drone.start(now);
    voices.push(drone);
    return { profile, output, voices };
  }

  _release(graph, seconds = 1.3) {
    if (!graph) return;
    const now = this.soundscape.context.currentTime;
    graph.output.gain.cancelScheduledValues(now);
    if (seconds === 0) graph.output.gain.setValueAtTime(0, now);
    else {
      graph.output.gain.setValueAtTime(graph.output.gain.value, now);
      graph.output.gain.linearRampToValueAtTime(0.0001, now + seconds);
    }
    let remaining = graph.voices.length;
    for (const source of graph.voices) {
      const previous = source.onended;
      source.onended = () => {
        try { previous?.(); source.disconnect(); } catch {}
        if (--remaining === 0) { try { graph.output.disconnect(); } catch {} }
      };
      try { source.stop(seconds === 0 ? now : now + seconds + 0.05); } catch {}
    }
  }

  start(world) {
    const profile = resolveWorldweaveAcousticProfile(world);
    if (!profile) throw new Error('This world has no Worldweave acoustic profile yet.');
    if (!this.soundscape.armed) throw new Error('Audio must be armed by a user action.');
    if (this.active?.profile.id === profile.id) return this.snapshot();
    if (this.active) this._release(this.active);
    this.active = this._build(profile);
    this._remember(profile.id);
    this._receipt('started', profile);
    return this.snapshot();
  }

  transition(world) {
    if (!this.active) return null; // Never autoplay on a world change or a restart.
    const profile = resolveWorldweaveAcousticProfile(world);
    if (!profile) return this.stop('world-without-profile');
    if (this.active.profile.id === profile.id) return null;
    return this.start(world); // Crossfade: the old graph fades out as the next fades in.
  }

  stop(reason = 'user-action') {
    if (!this.active) return null;
    const graph = this.active;
    this.active = null;
    this._release(graph, reason === 'feather-stop' ? 0 : 0.65);
    return this._receipt('stopped', graph.profile, reason);
  }

  playEcho(world) {
    if (!this.soundscape.armed || !this.soundscape.context || !this.soundscape.buses?.tones) {
      throw new Error('Arm the mixer before auditioning the shared melody.');
    }
    const profile = resolveWorldweaveAcousticProfile(world);
    if (!profile) throw new Error('The current world has no echo motif.');
    const context = this.soundscape.context;
    const now = context.currentTime + 0.03;
    const notes = worldweaveMotifFrequencies(this.soundscape.world.rootHz);
    for (let i = 0; i < notes.length; i += 1) {
      const oscillator = context.createOscillator();
      oscillator.type = profile.id === 'third-city' ? 'triangle' : 'sine';
      oscillator.frequency.value = notes[i];
      const gain = context.createGain();
      const at = now + i * 0.35;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(0.045, at + 0.045);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
      oscillator.connect(gain).connect(this.soundscape.buses.tones);
      oscillator.onended = () => { try { oscillator.disconnect(); gain.disconnect(); } catch {} };
      oscillator.start(at);
      oscillator.stop(at + 0.51);
    }
    return this._receipt('motif-audition', profile, WORLDWEAVE_MOTIF_ID);
  }

  snapshot() {
    return {
      active: Boolean(this.active),
      sceneId: this.active?.profile.id || null,
      rememberedSceneId: this.lastSceneId,
      resumedAutomatically: false,
      motifId: WORLDWEAVE_MOTIF_ID,
      receipts: this.receipts.slice(0, 5),
    };
  }
}
