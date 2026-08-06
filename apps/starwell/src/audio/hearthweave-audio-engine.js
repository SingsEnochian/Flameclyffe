// Hearthweave Audio Engine — World Soundscapes + Two-Shore Architecture
//
// Hearthside = Observer audio control vector (Section 15, New Mathematics)
// Targetside = World-native soundscape: procedural synthesis from nature textures
//
// Each world is acoustically distinct. Not tones — environments.
// Pink noise (1/f — sounds like nature) shaped by world-specific filter chains.
// LFO rates drawn from natural cycles: geological, tidal, breath, Schumann.

const SMOOTH_TAU  = 0.08;   // exponential smoothing time constant
const FADE_TIME   = 0.04;   // Stop & Close hard fade

// ── Pink Noise Generator ─────────────────────────────────────────────────────
// Voss-McCartney algorithm. 1/f spectrum — sounds like rain, wind, earth.

function createPinkNoiseSource(ctx) {
  const bufSize = ctx.sampleRate * 4; // 4-second loop (prime with sample rate for less obvious looping)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const d   = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufSize; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.96900 * b2 + w * 0.1538520;
    b3 = 0.86650 * b3 + w * 0.3104856;
    b4 = 0.55000 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5  - w * 0.0168980;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) / 7.0;
    b6 = w * 0.115926;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop   = true;
  return src;
}

// LFO utility
function startLFO(ctx, { freq, depth, type = 'sine', target, offset = 0 }) {
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type            = type;
  osc.frequency.value = freq;
  g.gain.value        = depth;
  osc.connect(g);
  g.connect(target);
  if (offset !== 0) target.value = (target.value || 0) + offset;
  osc.start();
  return { osc, g };
}

// ── World Soundscape Builders ─────────────────────────────────────────────────
//
// Each returns { master (GainNode → ctx.destination), setGain(n), stop() }
// Caller connects master to ctx.destination and controls volume via setGain.

// Terra Aeterna — geological stone, Schumann resonance (7.83Hz Earth EM field)
// Character: slow, heavy, patient. The earth shifting weight.
function buildTerra(ctx) {
  const all = [];

  const noise = createPinkNoiseSource(ctx);
  noise.start();
  all.push(noise);

  // Sub-bass stone rumble (40–100Hz) — felt more than heard
  const rumbleLP = ctx.createBiquadFilter();
  rumbleLP.type = 'lowpass'; rumbleLP.frequency.value = 90; rumbleLP.Q.value = 0.5;

  // Mid-earth resonance — stone chamber (200–500Hz)
  const chamberBP = ctx.createBiquadFilter();
  chamberBP.type = 'bandpass'; chamberBP.frequency.value = 320; chamberBP.Q.value = 1.4;

  // Schumann resonance — 7.83Hz amplitude modulation on rumble
  // Earth's electromagnetic cavity resonance; subconsciously familiar
  const schumann = ctx.createOscillator();
  schumann.type = 'sine'; schumann.frequency.value = 7.83;
  const schumannG = ctx.createGain(); schumannG.gain.value = 0.4;
  schumann.connect(schumannG);
  schumann.start(); all.push(schumann);

  const rumbleGain   = ctx.createGain(); rumbleGain.gain.value   = 0.45;
  const chamberGain  = ctx.createGain(); chamberGain.gain.value  = 0.18;
  schumannG.connect(rumbleGain.gain); // Schumann modulates the rumble

  // Very slow geological LFO (0.02Hz ≈ 50-second swell — tectonic patience)
  const geoLFO = ctx.createOscillator();
  geoLFO.type = 'sine'; geoLFO.frequency.value = 0.02;
  const geoLFOG = ctx.createGain(); geoLFOG.gain.value = 0.25;
  geoLFO.connect(geoLFOG); geoLFOG.connect(chamberBP.frequency);
  geoLFO.start(); all.push(geoLFO);

  // Cave delay — long echo, low feedback
  const delay = ctx.createDelay(5.0); delay.delayTime.value = 2.2;
  const delFB = ctx.createGain(); delFB.gain.value = 0.28;

  const master = ctx.createGain(); master.gain.value = 0;

  noise.connect(rumbleLP);   rumbleLP.connect(rumbleGain);   rumbleGain.connect(master);
  noise.connect(chamberBP);  chamberBP.connect(chamberGain); chamberGain.connect(master);
  master.connect(delay);     delay.connect(delFB);            delFB.connect(delay);
  delay.connect(master);

  return {
    master,
    setGain: (g) => { master.gain.value = g * 0.2; },
    stop: () => { all.forEach(n => { try { n.stop(); } catch {} }); },
  };
}

// Luna Mooncalled — three overlapping tidal pulls, quasiperiodic interference
// Character: never the same twice. Three voices that eventually resolve into
// something impossible to predict and impossible to doubt.
function buildLuna(ctx) {
  const all = [];

  // Three oscillators at irrational frequency ratios — perpetual interference
  // These approximate the lunar synodic, anomalistic, and draconic months' beat
  const tidalFreqs  = [432.0, 434.7, 436.1]; // Hz — tiny detuning = ocean like beating
  const tidalRates  = [0.031, 0.047, 0.073]; // LFO Hz — never align (irrational ratios)

  const master = ctx.createGain(); master.gain.value = 0;

  // Long ocean delay for spaciousness
  const delay = ctx.createDelay(4.0); delay.delayTime.value = 1.4;
  const delFB = ctx.createGain(); delFB.gain.value = 0.42;
  const delOut = ctx.createGain(); delOut.gain.value = 0.5;
  master.connect(delay); delay.connect(delFB); delFB.connect(delay); delay.connect(delOut); delOut.connect(master);

  tidalFreqs.forEach((freq, i) => {
    const osc  = ctx.createOscillator();
    osc.type   = 'sine'; osc.frequency.value = freq;
    const g    = ctx.createGain(); g.gain.value = 0.0;

    // Tidal LFO — each wave crests at a different pace
    const lfo  = ctx.createOscillator();
    lfo.type   = 'sine'; lfo.frequency.value = tidalRates[i];
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.09;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    g.gain.value = 0.07;

    osc.connect(g); g.connect(master);
    osc.start(); lfo.start();
    all.push(osc, lfo);
  });

  // Ocean surface hiss — highpass pink noise
  const noise = createPinkNoiseSource(ctx);
  noise.start(); all.push(noise);
  const hp    = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3200;
  const hpG   = ctx.createGain(); hpG.gain.value = 0.10;
  noise.connect(hp); hp.connect(hpG); hpG.connect(master);

  // Low stone underwater undertow — low bandpass
  const subBP = ctx.createBiquadFilter(); subBP.type = 'bandpass'; subBP.frequency.value = 55; subBP.Q.value = 0.8;
  const subG  = ctx.createGain(); subG.gain.value = 0.15;
  noise.connect(subBP); subBP.connect(subG); subG.connect(master);

  return {
    master,
    setGain: (g) => { master.gain.value = g * 0.22; },
    stop: () => { all.forEach(n => { try { n.stop(); } catch {} }); },
  };
}

// T'averen/Vaen — the Wheel, inevitable low rhythm, Pattern resonance
// Character: felt as inevitability rather than rhythm.
// When a ta'veren walks through, events distort around them.
function buildTaveren(ctx) {
  const all = [];
  const master = ctx.createGain(); master.gain.value = 0;

  // Deep sub-bass drone — the Wheel's axis (felt, not heard)
  const bass = ctx.createOscillator(); bass.type = 'sine'; bass.frequency.value = 41.2;
  const bassLP = ctx.createBiquadFilter(); bassLP.type = 'lowpass'; bassLP.frequency.value = 120;
  const bassG  = ctx.createGain(); bassG.gain.value = 0.4;
  bass.connect(bassLP); bassLP.connect(bassG); bassG.connect(master); bass.start(); all.push(bass);

  // The Wheel turning — extremely slow AM envelope (0.008Hz ≈ 2-minute cycle)
  const wheelLFO = ctx.createOscillator(); wheelLFO.type = 'sine'; wheelLFO.frequency.value = 0.008;
  const wheelG   = ctx.createGain(); wheelG.gain.value = 0.3;
  wheelLFO.connect(wheelG); wheelG.connect(bassG.gain); wheelLFO.start(); all.push(wheelLFO);

  // Mid resonance — the Pattern's hum (narrow bandpass, creates "organized" feeling)
  const noise  = createPinkNoiseSource(ctx); noise.start(); all.push(noise);
  const patBP  = ctx.createBiquadFilter(); patBP.type = 'bandpass'; patBP.frequency.value = 108; patBP.Q.value = 3.5;
  const patBP2 = ctx.createBiquadFilter(); patBP2.type = 'bandpass'; patBP2.frequency.value = 216; patBP2.Q.value = 2.8;
  const patG   = ctx.createGain(); patG.gain.value = 0.12;
  const patG2  = ctx.createGain(); patG2.gain.value = 0.08;
  noise.connect(patBP); patBP.connect(patG); patG.connect(master);
  noise.connect(patBP2); patBP2.connect(patG2); patG2.connect(master);

  // Slight event-distortion delay
  const delay = ctx.createDelay(3.0); delay.delayTime.value = 0.6;
  const delFB = ctx.createGain(); delFB.gain.value = 0.22;
  master.connect(delay); delay.connect(delFB); delFB.connect(delay); delay.connect(master);

  return {
    master,
    setGain: (g) => { master.gain.value = g * 0.24; },
    stop: () => { all.forEach(n => { try { n.stop(); } catch {} }); },
  };
}

// Starsong: Friendship is Magic — warm, social, bell-shimmer, room alive with people
// Character: the heartbeat of a room where everyone you love is present.
function buildStarsong(ctx) {
  const all = [];
  const master = ctx.createGain(); master.gain.value = 0;

  // Bell partials — triangle waves with slow shimmer (finger bell character)
  const bellData = [
    { freq: 440,  gain: 0.07, lfoR: 0.09 },
    { freq: 880,  gain: 0.04, lfoR: 0.11 },
    { freq: 1320, gain: 0.025, lfoR: 0.13 },
    { freq: 1760, gain: 0.015, lfoR: 0.07 },
  ];
  bellData.forEach(({ freq, gain: gv, lfoR }) => {
    const osc  = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = freq;
    const g    = ctx.createGain(); g.gain.value = gv;
    const lfo  = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = lfoR;
    const lfoG = ctx.createGain(); lfoG.gain.value = gv * 0.35;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    osc.connect(g); g.connect(master);
    osc.start(); lfo.start(); all.push(osc, lfo);
  });

  // Warm "room" — pink noise shaped to vocal range (conversation texture)
  const noise  = createPinkNoiseSource(ctx); noise.start(); all.push(noise);
  const roomBP = ctx.createBiquadFilter(); roomBP.type = 'bandpass'; roomBP.frequency.value = 700; roomBP.Q.value = 0.35;
  const roomG  = ctx.createGain(); roomG.gain.value = 0.06;
  noise.connect(roomBP); roomBP.connect(roomG); roomG.connect(master);

  // Presence shimmer — very high gentle sine (sense of aliveness)
  const shimmer  = ctx.createOscillator(); shimmer.type = 'sine'; shimmer.frequency.value = 9600;
  const shimmerG = ctx.createGain(); shimmerG.gain.value = 0.008;
  shimmer.connect(shimmerG); shimmerG.connect(master); shimmer.start(); all.push(shimmer);

  // Warm reverb character
  const delay = ctx.createDelay(2.0); delay.delayTime.value = 0.35;
  const delFB = ctx.createGain(); delFB.gain.value = 0.25;
  master.connect(delay); delay.connect(delFB); delFB.connect(delay); delay.connect(master);

  return {
    master,
    setGain: (g) => { master.gain.value = g * 0.19; },
    stop: () => { all.forEach(n => { try { n.stop(); } catch {} }); },
  };
}

// Feather and Flame — two-layer world: deep ocean below, Crownfire above
// Character: pressure from the deep, then cherry-red warmth arrives above it.
function buildFeatherFlame(ctx) {
  const all = [];
  const master = ctx.createGain(); master.gain.value = 0;

  // DEEP LAYER — ocean/VL-BB's archive: heavy water
  const deepNoise = createPinkNoiseSource(ctx); deepNoise.start(); all.push(deepNoise);
  const oceanLP   = ctx.createBiquadFilter(); oceanLP.type = 'lowpass'; oceanLP.frequency.value = 85;
  const oceanBP   = ctx.createBiquadFilter(); oceanBP.type = 'bandpass'; oceanBP.frequency.value = 140; oceanBP.Q.value = 0.9;
  const deepDelay = ctx.createDelay(4.0); deepDelay.delayTime.value = 1.9;
  const deepFB    = ctx.createGain(); deepFB.gain.value = 0.45;
  const deepG     = ctx.createGain(); deepG.gain.value = 0.35;
  const deepG2    = ctx.createGain(); deepG2.gain.value = 0.2;

  deepNoise.connect(oceanLP);   oceanLP.connect(deepG);   deepG.connect(master);
  deepNoise.connect(oceanBP);   oceanBP.connect(deepG2);  deepG2.connect(master);
  master.connect(deepDelay); deepDelay.connect(deepFB); deepFB.connect(deepDelay); deepDelay.connect(master);

  // Slow deep swell LFO
  const deepLFO  = ctx.createOscillator(); deepLFO.type = 'sine'; deepLFO.frequency.value = 0.04;
  const deepLFOG = ctx.createGain(); deepLFOG.gain.value = 0.3;
  deepLFO.connect(deepLFOG); deepLFOG.connect(deepG.gain); deepLFO.start(); all.push(deepLFO);

  // UPPER LAYER — Crownfire: alive, high-frequency, cherry-red warmth
  // Crackling synthesis: bandpass noise bursts in upper-mid range
  const fireNoise = createPinkNoiseSource(ctx); fireNoise.start(); all.push(fireNoise);
  const fireHP    = ctx.createBiquadFilter(); fireHP.type = 'highpass'; fireHP.frequency.value = 2000;
  const fireBP    = ctx.createBiquadFilter(); fireBP.type = 'bandpass'; fireBP.frequency.value = 3200; fireBP.Q.value = 0.8;
  const fireG     = ctx.createGain(); fireG.gain.value = 0.12;

  // Crownfire flicker — fast irregular AM (0.8–2Hz, life + unpredictability)
  const fireLFO  = ctx.createOscillator(); fireLFO.type = 'sawtooth'; fireLFO.frequency.value = 1.4;
  const fireLFOG = ctx.createGain(); fireLFOG.gain.value = 0.09;
  fireLFO.connect(fireLFOG); fireLFOG.connect(fireG.gain); fireLFO.start(); all.push(fireLFO);

  // Crownfire warmth tone — warm sine, alive
  const crownTone = ctx.createOscillator(); crownTone.type = 'sine'; crownTone.frequency.value = 660;
  const crownG    = ctx.createGain(); crownG.gain.value = 0.04;
  crownTone.connect(crownG); crownG.connect(master); crownTone.start(); all.push(crownTone);

  fireNoise.connect(fireHP); fireHP.connect(fireBP); fireBP.connect(fireG); fireG.connect(master);

  return {
    master,
    setGain: (g) => { master.gain.value = g * 0.21; },
    stop: () => { all.forEach(n => { try { n.stop(); } catch {} }); },
  };
}

// Dreaming Grove — the room settling, work-breath, intimate creative space
// Character: the silence between keystrokes when you read something back and it is right.
function buildDreamingGrove(ctx) {
  const all = [];
  const master = ctx.createGain(); master.gain.value = 0;

  // Room tone — mid-frequency pink noise, very low amplitude (you feel it, not hear it)
  const noise  = createPinkNoiseSource(ctx); noise.start(); all.push(noise);
  const roomLP = ctx.createBiquadFilter(); roomLP.type = 'bandpass'; roomLP.frequency.value = 500; roomLP.Q.value = 0.3;
  const roomG  = ctx.createGain(); roomG.gain.value = 0.06;
  noise.connect(roomLP); roomLP.connect(roomG); roomG.connect(master);

  // Breathing — slow AM at breath pace (~0.23Hz ≈ one breath per 4.3 seconds)
  const breathLFO  = ctx.createOscillator(); breathLFO.type = 'sine'; breathLFO.frequency.value = 0.23;
  const breathLFOG = ctx.createGain(); breathLFOG.gain.value = 0.04;
  breathLFO.connect(breathLFOG); breathLFOG.connect(roomG.gain); breathLFO.start(); all.push(breathLFO);

  // Warm desk resonance — gentle low fundamental
  const deskOsc  = ctx.createOscillator(); deskOsc.type = 'triangle'; deskOsc.frequency.value = 196;
  const deskG    = ctx.createGain(); deskG.gain.value = 0.018;
  deskOsc.connect(deskG); deskG.connect(master); deskOsc.start(); all.push(deskOsc);

  // Occasional settle — very slow LFO on desk tone to simulate structure creaking
  const settleLFO  = ctx.createOscillator(); settleLFO.type = 'sine'; settleLFO.frequency.value = 0.06;
  const settleLFOG = ctx.createGain(); settleLFOG.gain.value = 0.008;
  settleLFO.connect(settleLFOG); settleLFOG.connect(deskG.gain); settleLFO.start(); all.push(settleLFO);

  // Short intimate delay — not a cave, a room
  const delay = ctx.createDelay(1.0); delay.delayTime.value = 0.08;
  const delFB = ctx.createGain(); delFB.gain.value = 0.12;
  master.connect(delay); delay.connect(delFB); delFB.connect(delay); delay.connect(master);

  return {
    master,
    setGain: (g) => { master.gain.value = g * 0.18; },
    stop: () => { all.forEach(n => { try { n.stop(); } catch {} }); },
  };
}

// A Momento Creationis — before the first sound, potential before form
// Character: the instant before the word. Silence that is not void.
function buildMomentoCreationis(ctx) {
  const all = [];
  const master = ctx.createGain(); master.gain.value = 0;

  // Sub-threshold white noise — not silence, but potential
  const noise  = createPinkNoiseSource(ctx); noise.start(); all.push(noise);
  const voidLP = ctx.createBiquadFilter(); voidLP.type = 'lowpass'; voidLP.frequency.value = 40;
  const voidG  = ctx.createGain(); voidG.gain.value = 0.03;
  noise.connect(voidLP); voidLP.connect(voidG); voidG.connect(master);

  // The first vibration — so quiet it barely exists (fundamental of the Sevenfold: Root 415Hz)
  const firstOsc = ctx.createOscillator(); firstOsc.type = 'sine'; firstOsc.frequency.value = 415;
  const firstG   = ctx.createGain(); firstG.gain.value = 0.008;
  firstOsc.connect(firstG); firstG.connect(master); firstOsc.start(); all.push(firstOsc);

  // Infinite decay — maximum reverb time
  const delay = ctx.createDelay(6.0); delay.delayTime.value = 3.8;
  const delFB = ctx.createGain(); delFB.gain.value = 0.65;
  firstG.connect(delay); delay.connect(delFB); delFB.connect(delay); delay.connect(master);

  // Very slow fade in and out — pulse of potential
  const pulseLFO  = ctx.createOscillator(); pulseLFO.type = 'sine'; pulseLFO.frequency.value = 0.003;
  const pulseLFOG = ctx.createGain(); pulseLFOG.gain.value = 0.006;
  pulseLFO.connect(pulseLFOG); pulseLFOG.connect(firstG.gain); pulseLFO.start(); all.push(pulseLFO);

  return {
    master,
    setGain: (g) => { master.gain.value = g * 0.14; },
    stop: () => { all.forEach(n => { try { n.stop(); } catch {} }); },
  };
}

const WORLD_SOUNDSCAPE_BUILDERS = {
  'terra-aeterna':                buildTerra,
  'luna-mooncalled':              buildLuna,
  'taveren-vaen':                 buildTaveren,
  'starsong-friendship-is-magic': buildStarsong,
  'feather-and-flame':            buildFeatherFlame,
  'dreaming-grove':               buildDreamingGrove,
  'a-momento-creationis':         buildMomentoCreationis,
};

// ── Hearthweave Audio Engine ──────────────────────────────────────────────────

export class HearthweaveAudioEngine {
  constructor() {
    this._ctx        = null;
    this._hs         = null;   // Hearthside nodes
    this._soundscape = null;   // current world soundscape
    this._worldSlug  = null;   // which world is loaded
    this._playing    = false;
    this._consent    = 'idle'; // 'idle' | 'active' | 'paused' | 'stopped'
  }

  _ensureContext() {
    if (!this._ctx || this._ctx.state === 'closed') {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  _buildHearthsideNodes(ctx) {
    // Binaural oscillators — f_L left ear, f_R right ear (Section 15 formulas)
    const osc_L  = ctx.createOscillator();
    const osc_R  = ctx.createOscillator();
    const gain_L = ctx.createGain();
    const gain_R = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const master = ctx.createGain();
    const merger = ctx.createChannelMerger(2);
    const delay  = ctx.createDelay(2.0);
    const delFB  = ctx.createGain();

    osc_L.type = 'sine'; osc_R.type = 'sine';
    filter.type = 'lowpass';
    gain_L.gain.value = 0; gain_R.gain.value = 0;
    master.gain.value = 0;
    delay.delayTime.value = 0.25; delFB.gain.value = 0;

    osc_L.connect(gain_L); osc_R.connect(gain_R);
    gain_L.connect(filter); gain_R.connect(filter);
    filter.connect(master); master.connect(ctx.destination);
    filter.connect(delay);  delay.connect(delFB); delFB.connect(delay); delay.connect(master);

    osc_L.start(); osc_R.start();
    return { osc_L, osc_R, gain_L, gain_R, filter, master, delay, delFB };
  }

  // Smoothly apply the Section 15 audio control vector to Hearthside
  applyHearthsideControl(control) {
    if (!this._hs || !this._ctx) return;
    const { ctx, hs } = { ctx: this._ctx, hs: this._hs };
    const t = ctx.currentTime;

    const setExp = (param, v) => { param.setTargetAtTime(Math.max(0.001, v), t, SMOOTH_TAU); };
    const setLin = (param, v) => { param.setTargetAtTime(v, t, SMOOTH_TAU); };

    setExp(hs.osc_L.frequency, control.f_L);
    setExp(hs.osc_R.frequency, control.f_R);
    setExp(hs.filter.frequency, control.f_filter);
    setLin(hs.delFB.gain, control.g_return);
    setLin(hs.master.gain, control.g_master);

    const stereo = Math.max(0, Math.min(1, control.W_stereo));
    setLin(hs.gain_L.gain, Math.cos(stereo * Math.PI / 2));
    setLin(hs.gain_R.gain, Math.sin(stereo * Math.PI / 2));
  }

  // Apply/switch world soundscape
  applyWorldSoundscape(worldSlug, gain = 1.0) {
    if (!this._ctx) return;
    const ctx = this._ctx;

    // Same world — just update gain
    if (this._worldSlug === worldSlug && this._soundscape) {
      this._soundscape.setGain(gain);
      return;
    }

    // Fade out + stop old soundscape
    if (this._soundscape) {
      const old = this._soundscape;
      old.setGain(0);
      setTimeout(() => old.stop(), 500);
    }

    const builder = WORLD_SOUNDSCAPE_BUILDERS[worldSlug];
    if (!builder) { this._soundscape = null; this._worldSlug = null; return; }

    const scape = builder(ctx);
    scape.master.connect(ctx.destination);
    scape.setGain(gain);
    this._soundscape = scape;
    this._worldSlug  = worldSlug;
  }

  // DSP profile is still used for PREMAQ modulation; soundscape is world-acoustic layer
  applyTargetsideProfile(profile, premaqState, worldSlug) {
    // Update soundscape gain based on PREMAQ Resonance
    const R = premaqState?.R?.value ?? 0.5;
    this.applyWorldSoundscape(worldSlug || profile?.world_slug, 0.4 + R * 0.6);
  }

  start(hearthsideControl, targetsideProfile, premaqState, worldSlug) {
    if (this._consent === 'stopped') return;
    this._consent = 'active';
    this._playing = true;

    const ctx = this._ensureContext();
    if (!this._hs) this._hs = this._buildHearthsideNodes(ctx);

    if (hearthsideControl) this.applyHearthsideControl(hearthsideControl);
    if (worldSlug || targetsideProfile?.world_slug) {
      this.applyTargetsideProfile(targetsideProfile, premaqState, worldSlug || targetsideProfile?.world_slug);
    }
  }

  feather() {
    if (!this._hs) return;
    this._consent = 'paused';
    this._playing = false;
    const t = this._ctx.currentTime;
    this._hs.master.gain.setTargetAtTime(0, t, SMOOTH_TAU * 5);
    if (this._soundscape) this._soundscape.setGain(0);
  }

  resume() {
    if (this._consent !== 'paused') return;
    this._consent = 'active';
    this._playing = true;
    if (this._ctx?.state === 'suspended') this._ctx.resume();
  }

  stopAndClose() {
    this._consent = 'stopped';
    this._playing = false;

    if (this._hs && this._ctx) {
      const t = this._ctx.currentTime;
      this._hs.master.gain.linearRampToValueAtTime(0, t + FADE_TIME);
    }
    if (this._soundscape) {
      this._soundscape.setGain(0);
      setTimeout(() => { try { this._soundscape?.stop(); } catch {} }, 200);
      this._soundscape = null;
      this._worldSlug  = null;
    }
    setTimeout(() => { try { this._ctx?.suspend(); } catch {} }, (FADE_TIME + 0.1) * 1000);
  }

  // Short UI feedback sound — one note, instant
  playUIEvent({ frequency = 440, duration = 0.06, type = 'sine', gain = 0.06 } = {}) {
    try {
      const ctx = this._ensureContext();
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = type; osc.frequency.value = frequency;
      g.gain.value = gain;
      g.gain.setTargetAtTime(0, ctx.currentTime + duration * 0.3, duration * 0.2);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + duration + 0.12);
    } catch {}
  }

  get isPlaying() { return this._playing && this._consent === 'active'; }
  get consentState() { return this._consent; }
}

export const audioEngine = new HearthweaveAudioEngine();

// Sevenfold Chorus tones — Elara Codex (Hz)
export const CHORUS_TONES = {
  Root: 415, Anchor: 440, Whisper: 554, Arc: 659,
  Bridge: 739, Surge: 987, Spiral: 1318, Awakening: 2637,
};

// Each organ gets a Chorus tone for UI events
export const ORGAN_TONE = {
  'observatory':          CHORUS_TONES.Root,
  'arcsweep':             CHORUS_TONES.Anchor,
  'glyph-studio':         CHORUS_TONES.Whisper,
  'brush-foundry':        CHORUS_TONES.Arc,
  'living-glyph':         CHORUS_TONES.Bridge,
  'echo-index':           CHORUS_TONES.Surge,
  'canon-studio':         CHORUS_TONES.Spiral,
  'resonance-bridge':     CHORUS_TONES.Awakening,
  'arcsweep-continuity':  CHORUS_TONES.Root,
  'hearthroom':           CHORUS_TONES.Anchor,
};
