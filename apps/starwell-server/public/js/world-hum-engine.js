/**
 * World Hum Engine — Hearthgate Observatory soundscape
 *
 * Each world has a tonal identity (World Hum) defined by its root frequency,
 * harmonic series, filter character, and reverb depth.
 * PREMAQ axes modulate the sound in real time — P/M/A/Q shift filter, gain, and texture.
 *
 * NOTE: Harmonic ratios for Luna's three moons (Mawr/Aurel/Glaswren) are working values
 * pending Rowan's confirmation. Current: Mawr=0.5×root, Aurel=1.0×root, Glaswren=φ×root.
 *
 * Security constraints carried forward:
 * - No "collapse" or "descending" language in state descriptions
 * - A = Agency, Q = Qualia throughout
 * - No subsystem reads DEEP directly — reads PREMAQ packet only
 */

const PHI = 1.6180339887;

const WORLD_PROFILES = {
  terra: {
    name: 'Terra Aeterna',
    rootHz: 220,
    harmonics: [
      { ratio: 1.0,       gain: 0.50, type: 'sine' },
      { ratio: 2.0,       gain: 0.20, type: 'sine' },
      { ratio: 3.0,       gain: 0.10, type: 'sine' },
      { ratio: 5.0,       gain: 0.05, type: 'sine' },
    ],
    filter: {
      type: 'lowpass',
      baseHz: 580,
      premaqAxis: 'P',
      premaqDepth: 520,
    },
    lfo: { rate: 1 / 22, depth: 30 },
    reverb: { delay: 0.12, feedback: 0.38, mix: 0.25 },
    masterGain: 0.38,
    breatheSeconds: 90,
    identity: 'Measured. Grounded. The geometry is revealed, not painted.',
  },

  luna: {
    name: 'The Luna Who Called Down the Moon',
    rootHz: 432,
    harmonics: [
      // Mawr — sub-octave, deep mauve, cracked. Bass. (working ratio: 0.5×root)
      { ratio: 0.5,    gain: 0.44, type: 'sine',     label: 'Mawr' },
      // Aurel — root tone, pale gold with rings. Mid. (working ratio: 1.0×root)
      { ratio: 1.0,    gain: 0.36, type: 'sine',     label: 'Aurel' },
      // Glaswren — phi above root, green agate. High. (working ratio: φ×root ≈ 699 Hz)
      // Phi ratio to root means this interference pattern never repeats.
      { ratio: PHI,    gain: 0.20, type: 'sine',     label: 'Glaswren' },
    ],
    filter: {
      type: 'lowpass',
      baseHz: 680,
      premaqAxis: 'M',
      premaqDepth: 480,
    },
    lfo: { rate: 1 / 72, depth: 45 },   // 72s quasi-period of three-moon interference
    reverb: { delay: 0.22, feedback: 0.52, mix: 0.42 },
    masterGain: 0.34,
    breatheSeconds: 72,
    identity: 'Tidal. Three-pulled. The sky holds three lights that never align twice.',
  },

  taaveren: {
    name: "T'averen Vaen",
    rootHz: 120,
    harmonics: [
      { ratio: 1.0, gain: 0.55, type: 'sine' },
      { ratio: 2.0, gain: 0.26, type: 'triangle' },
      { ratio: 3.0, gain: 0.12, type: 'sine' },
      { ratio: 6.0, gain: 0.06, type: 'sine' },
    ],
    filter: {
      type: 'lowpass',
      baseHz: 360,
      premaqAxis: 'A',
      premaqDepth: 320,
    },
    lfo: { rate: 1 / 60, depth: 25 },
    reverb: { delay: 0.30, feedback: 0.60, mix: 0.50 },
    masterGain: 0.40,
    breatheSeconds: 60,
    identity: 'The Wheel turns. Ta\'veren bends the Pattern. Weight without end.',
  },

  starsong: {
    name: 'Starsong: Friendship Is Magic',
    rootHz: 528,
    harmonics: [
      { ratio: 1.0,  gain: 0.38, type: 'sine' },
      { ratio: 1.5,  gain: 0.26, type: 'sine' },    // perfect fifth
      { ratio: 2.0,  gain: 0.16, type: 'sine' },
      { ratio: 2.5,  gain: 0.10, type: 'sine' },
      { ratio: 4.0,  gain: 0.05, type: 'sine' },
    ],
    filter: {
      type: 'lowpass',
      baseHz: 1600,
      premaqAxis: 'Q',
      premaqDepth: 1400,
    },
    lfo: { rate: 1 / 45, depth: 60 },
    reverb: { delay: 0.08, feedback: 0.30, mix: 0.28 },
    masterGain: 0.32,
    breatheSeconds: 45,
    identity: 'Open. Relational. Friendship is not metaphor here — it is the law of how things hold together.',
  },

  // Feather & Flame — post-flood Earth; Copperhead Strike Force; VL-BB / soul-chip bonds
  // Source: lore_chat Discord server (Rowan). Spectral shape: warm (copper-fire + oceanic depth).
  'feather-flame': {
    name: 'Feather & Flame',
    rootHz: 174,
    harmonics: [
      // The ocean / VL-BB's network — the archive beneath everything
      { ratio: 1.0,  gain: 0.46, type: 'sine',     label: 'Ocean-archive' },
      // Sub-bass — the weight of all that water; the whale-folk Archangels
      { ratio: 0.5,  gain: 0.28, type: 'sine',     label: 'Deep' },
      // Copper-fire — the Crownfire, Roan's sparking hair, the Copperhead brand
      { ratio: 3.0,  gain: 0.18, type: 'triangle', label: 'Crownfire' },
      // Silver-starlight — VL-BB's network, encoded souls
      { ratio: 5.0,  gain: 0.06, type: 'sine',     label: 'Archive-light' },
    ],
    filter: {
      type: 'lowpass',
      baseHz: 680,    // warm; the ocean filters the upper frequencies; copper comes through
      premaqAxis: 'M',
      premaqDepth: 480,
    },
    lfo: { rate: 1 / 64, depth: 38 },
    reverb: { delay: 0.28, feedback: 0.48, mix: 0.38 },   // oceanic reverb — space and depth
    masterGain: 0.36,
    breatheSeconds: 64,
    identity: 'The Crownfire still burns. It means someone is home. The soul-chip pulses with the other person\'s heartbeat.',
  },

  // Dreaming Grove / Templehouse — interior, held space; loosest sync (0.25); harmonic_links: 0
  'dreaming-grove': {
    name: 'Dreaming Grove / Templehouse',
    rootHz: 174,
    harmonics: [
      // Root drone — the grove floor; the weight that holds everything
      { ratio: 1.0,  gain: 0.52, type: 'sine' },
      // Sub-octave — deeper root; the stone beneath the forest floor
      { ratio: 0.5,  gain: 0.30, type: 'sine' },
      // Second harmonic — very gentle; canopy breathing
      { ratio: 2.0,  gain: 0.12, type: 'sine' },
    ],
    filter: {
      type: 'lowpass',
      baseHz: 320,    // low cutoff — canopy filters everything; interior space
      premaqAxis: 'Q',
      premaqDepth: 260,
    },
    lfo: { rate: 1 / 80, depth: 16 },   // slowest breathe; the grove does not sync to you
    reverb: { delay: 0.20, feedback: 0.32, mix: 0.18 },
    masterGain: 0.28,
    breatheSeconds: 80,
    identity: 'The held space. Making happens here. The grove does not synchronise to you — you sync to it, if you stay.',
  },

  // A Momento Creationis — 432 Hz (shares root with Luna); 60s cycle; spiral harmonic motion
  'momento-creationis': {
    name: 'A Momento Creationis',
    rootHz: 432,
    harmonics: [
      // Root — the fact of beginning
      { ratio: 1.0,   gain: 0.36, type: 'sine' },
      // A fourth — 4:3 ratio; the first interval of becoming
      { ratio: 1.333, gain: 0.26, type: 'sine' },
      // A major sixth — 5:3 ratio; the interval of arriving
      { ratio: 1.667, gain: 0.18, type: 'sine' },
      // Octave — return and continuation
      { ratio: 2.0,   gain: 0.12, type: 'sine' },
      // Upper fourth — 8:3; the spiral step; beginning again from where you left off
      { ratio: 2.667, gain: 0.06, type: 'sine' },
    ],
    filter: {
      type: 'lowpass',
      baseHz: 1100,
      premaqAxis: 'R',
      premaqDepth: 800,
    },
    lfo: { rate: 1 / 60, depth: 52 },   // exactly 60s — one minute; the world's recurring first moment
    reverb: { delay: 0.06, feedback: 0.24, mix: 0.16 },
    masterGain: 0.34,
    breatheSeconds: 60,
    identity: 'At the moment creation recurs. One minute. Something is being made right now.',
  },
};

class WorldHumEngine {
  constructor() {
    this._ctx = null;
    this._playing = false;
    this._world = 'terra';
    this._volume = 0.30;
    this._metrics = { P: 0.46, C: 0.54, R: 0.48, E: 0.18, M: 0.42, A: 0.38, Q: 0.32 };

    this._nodes = {};   // active audio nodes for the current world
    this._lfoFrame = null;
    this._lfoPhase = 0;
    this._lastLfoTick = null;

    this._onStatusChange = null;
  }

  get profile() { return WORLD_PROFILES[this._world]; }

  // ── Public API ─────────────────────────────────────────────────────────────

  play() {
    this._ensureContext();
    if (this._playing) return;
    this._playing = true;
    this._buildChain();
    this._startLfo();
    this._emit('playing');
  }

  pause() {
    this._playing = false;
    this._teardownChain();
    this._stopLfo();
    this._emit('paused');
  }

  toggle() {
    if (this._playing) this.pause();
    else this.play();
  }

  setWorld(worldId) {
    if (!WORLD_PROFILES[worldId] || worldId === this._world) return;
    const wasPlaying = this._playing;
    if (wasPlaying) this._teardownChain(true); // crossfade out
    this._world = worldId;
    this._lfoPhase = 0;
    this._updateWorldDisplay();
    this._applyToneMap(); // refresh tone palette for new world context
    if (wasPlaying) {
      setTimeout(() => { if (this._playing || wasPlaying) { this._playing = true; this._buildChain(); this._startLfo(); } }, 600);
    }
  }

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._nodes.master) {
      const target = this._volume * this.profile.masterGain;
      this._nodes.master.gain.setTargetAtTime(target, this._ctx.currentTime, 0.15);
    }
  }

  updatePREMAQ(metrics) {
    this._metrics = { ...this._metrics, ...metrics };
    // Tone palette renders regardless of play state
    this._applyToneMap();
    if (this._playing) this._applyPREMAQ();
  }

  onStatus(fn) { this._onStatusChange = fn; }

  // ── Internal ───────────────────────────────────────────────────────────────

  _ensureContext() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') this._ctx.resume();
  }

  _buildChain() {
    const ctx = this._ctx;
    const p = this.profile;
    const nodes = {};

    // master gain → destination
    nodes.master = ctx.createGain();
    nodes.master.gain.value = 0;
    nodes.master.connect(ctx.destination);

    // dynamics compressor
    nodes.comp = ctx.createDynamicsCompressor();
    nodes.comp.threshold.value = -20;
    nodes.comp.knee.value = 10;
    nodes.comp.ratio.value = 5;
    nodes.comp.attack.value = 0.04;
    nodes.comp.release.value = 0.35;
    nodes.comp.connect(nodes.master);

    // main filter
    nodes.filter = ctx.createBiquadFilter();
    nodes.filter.type = p.filter.type;
    nodes.filter.frequency.value = this._filterHz();
    nodes.filter.Q.value = 1.6;

    // dry path
    const dry = ctx.createGain();
    dry.gain.value = 1 - p.reverb.mix * 0.5;
    nodes.filter.connect(dry);
    dry.connect(nodes.comp);

    // reverb: feedback delay
    nodes.reverbDelay = ctx.createDelay(6.0);
    nodes.reverbDelay.delayTime.value = p.reverb.delay;
    nodes.reverbFb = ctx.createGain();
    nodes.reverbFb.gain.value = p.reverb.feedback;
    const reverbOut = ctx.createGain();
    reverbOut.gain.value = p.reverb.mix;

    nodes.filter.connect(nodes.reverbDelay);
    nodes.reverbDelay.connect(nodes.reverbFb);
    nodes.reverbFb.connect(nodes.reverbDelay);
    nodes.reverbDelay.connect(reverbOut);
    reverbOut.connect(nodes.comp);

    // oscillator bank
    nodes.oscillators = p.harmonics.map((h) => {
      const osc = ctx.createOscillator();
      osc.type = h.type || 'sine';
      osc.frequency.value = p.rootHz * h.ratio;

      const g = ctx.createGain();
      g.gain.value = h.gain * 0.20;

      osc.connect(g);
      g.connect(nodes.filter);
      osc.start();
      return { osc, gain: g, config: h };
    });

    this._nodes = nodes;

    // fade in
    nodes.master.gain.setTargetAtTime(
      this._volume * p.masterGain,
      ctx.currentTime,
      0.8,
    );
  }

  _teardownChain(quick = false) {
    const nodes = this._nodes;
    const ctx = this._ctx;
    if (!nodes.master || !ctx) return;

    // fade out
    const fadeTime = quick ? 0.35 : 0.8;
    nodes.master.gain.setTargetAtTime(0, ctx.currentTime, fadeTime);

    const oscs = nodes.oscillators || [];
    const delay = quick ? 700 : 1600;
    setTimeout(() => {
      for (const { osc } of oscs) { try { osc.stop(); } catch {} }
    }, delay);

    this._nodes = {};
  }

  _filterHz() {
    const p = this.profile;
    const axisVal = this._metrics[p.filter.premaqAxis] ?? 0.5;
    return p.filter.baseHz + axisVal * p.filter.premaqDepth;
  }

  _applyPREMAQ() {
    if (!this._nodes.filter || !this._ctx) return;
    const hz = this._filterHz();
    this._nodes.filter.frequency.setTargetAtTime(hz, this._ctx.currentTime, 0.9);
  }

  _applyToneMap() {
    if (!window.ToneMap) return;
    const tone = window.ToneMap.deriveToneMap(this._metrics);
    this._renderTonePalette(tone);
    if (!this._nodes.filter || !this._ctx) return;
    const dsp = window.ToneMap.toneToDSP(tone, this.profile);

    // Blend filter Q from tone map
    this._nodes.filter.Q.setTargetAtTime(dsp.filterQ, this._ctx.currentTime, 1.2);

    // Subtle detune on each oscillator from movement/weight
    if (this._nodes.oscillators) {
      this._nodes.oscillators.forEach(({ osc }, i) => {
        const spread = (i % 2 === 0 ? 1 : -1) * dsp.detuneCents * (1 + i * 0.3);
        osc.detune.setTargetAtTime(spread, this._ctx.currentTime, 1.5);
      });
    }

    // Gain from tone sparkle/weight
    if (this._nodes.master) {
      const targetGain = this._volume * this.profile.masterGain * dsp.gainMod;
      this._nodes.master.gain.setTargetAtTime(
        Math.max(0, Math.min(1, targetGain)),
        this._ctx.currentTime,
        1.0,
      );
    }
  }

  _startLfo() {
    this._stopLfo();
    this._lastLfoTick = performance.now();
    const tick = (now) => {
      if (!this._playing) return;
      const elapsed = (now - this._lastLfoTick) / 1000;
      this._lastLfoTick = now;
      const p = this.profile;
      this._lfoPhase = (this._lfoPhase + elapsed * p.lfo.rate) % 1;
      // LFO modulates filter cutoff — very subtly, like breathing
      if (this._nodes.filter && this._ctx) {
        const lfoMod = Math.sin(Math.PI * 2 * this._lfoPhase) * p.lfo.depth;
        const baseHz = this._filterHz();
        this._nodes.filter.frequency.setTargetAtTime(baseHz + lfoMod, this._ctx.currentTime, 2.5);
      }
      this._lfoFrame = requestAnimationFrame(tick);
    };
    this._lfoFrame = requestAnimationFrame(tick);
  }

  _stopLfo() {
    if (this._lfoFrame) { cancelAnimationFrame(this._lfoFrame); this._lfoFrame = null; }
  }

  _renderTonePalette(tone) {
    const el = document.getElementById('tone-palette');
    if (!el || !tone) return;
    el.innerHTML = Object.entries(tone).map(([key, val]) => `
      <div class="tone-cell">
        <span class="tone-cell-label">${key}</span>
        <div class="tone-cell-bar"><div class="tone-cell-fill" style="width:${(val * 100).toFixed(1)}%"></div></div>
        <span class="tone-cell-val">${val.toFixed(2)}</span>
      </div>
    `).join('');
  }

  _updateWorldDisplay() {
    const p = this.profile;
    const nameEl = document.getElementById('world-hum-name');
    if (nameEl) nameEl.textContent = p.name;
    document.querySelectorAll('.world-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.world === this._world);
    });
    const identEl = document.getElementById('world-hum-identity');
    if (identEl) identEl.textContent = p.identity;
  }

  _emit(status) {
    const statusEl = document.getElementById('world-hum-status');
    if (statusEl) statusEl.textContent = status === 'playing' ? 'Breathing' : 'Paused';
    const btn = document.getElementById('world-hum-play');
    if (btn) btn.classList.toggle('playing', status === 'playing');
    if (this._onStatusChange) this._onStatusChange(status);
  }
}

// ── Initialise ────────────────────────────────────────────────────────────────

const worldHumEngine = new WorldHumEngine();
window.worldHumEngine = worldHumEngine;

// Render tone palette with default metrics on load
worldHumEngine._applyToneMap();

// Wire controls once DOM is ready (this script loads at end of body)
(function wireControls() {
  const playBtn = document.getElementById('world-hum-play');
  const volSlider = document.getElementById('world-hum-volume');
  const worldBtns = document.querySelectorAll('.world-btn');

  if (playBtn) {
    playBtn.addEventListener('click', () => worldHumEngine.toggle());
  }

  if (volSlider) {
    volSlider.addEventListener('input', () => {
      worldHumEngine.setVolume(parseFloat(volSlider.value));
    });
  }

  worldBtns.forEach((btn) => {
    btn.addEventListener('click', () => worldHumEngine.setWorld(btn.dataset.world));
  });
})();
