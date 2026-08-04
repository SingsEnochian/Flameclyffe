'use strict';

/*
  Elara Narrative Chord Temporal Adapter v0.2
  Replaces the chord scheduler only, leaving canonical chord definitions intact.
  Every chord layer uses the shared 2025/2026 projection and selected harmonics.
*/

(function () {
  const ROLE_GAIN = {
    ground: 1,
    path: 0.92,
    impulse: 0.86,
    relation: 0.82,
    weave: 0.76,
    crown: 0.62,
    layer: 0.78
  };

  const ROLE_BY_TONE = {
    'elara-memory': 'ground',
    'elara-root': 'ground',
    'elara-anchor': 'ground',
    'elara-whisper-warden': 'path',
    'elara-arc': 'path',
    'elara-bridge': 'path',
    'elara-wind-echo': 'impulse',
    'elara-surge': 'impulse',
    'elara-duet': 'relation',
    'elara-spiral': 'weave',
    'elara-awakening': 'crown'
  };

  function chords() {
    return window.ElaraNarrativeChords?.chords || [];
  }

  function toneRegistry() {
    return window.ElaraCodexTones?.tones || [];
  }

  function toneById(id) {
    return toneRegistry().find((tone) => tone.id === id) || null;
  }

  function chordById(id) {
    return chords().find((chord) => chord.id === id) || null;
  }

  function roleFor(tone) {
    return ROLE_BY_TONE[tone?.id] || 'layer';
  }

  function safetyFrequency(tone) {
    if (!tone) return 0;
    const soft = window.ElaraNarrativeChords?.readSoftAwakening?.() !== false;
    if (tone.id === 'elara-awakening' && soft) return tone.frequency / 2;
    return tone.frequency;
  }

  function projectedLayers(frequency, gain) {
    return window.MobiusTemporalProjection?.renderLayers
      ? window.MobiusTemporalProjection.renderLayers(frequency, gain)
      : [{ harmonic: 1, frequency, gain }];
  }

  function schedule(bus, tone, { held, onset, end, chordSize }) {
    const routes = tone.routes?.length ? tone.routes : ['centre'];
    const role = roleFor(tone);
    const baseGain = tone.twistGain ?? tone.gain * 0.42;
    const scaledGain = baseGain * (ROLE_GAIN[role] || ROLE_GAIN.layer) / Math.max(1, Math.pow(chordSize, 0.38));
    const perRouteGain = scaledGain / Math.max(1, Math.sqrt(routes.length));
    const rendered = safetyFrequency(tone);

    projectedLayers(rendered, perRouteGain).forEach((layer) => {
      routes.forEach((route) => {
        const now = bus.ctx.currentTime;
        const osc = bus.ctx.createOscillator();
        const gain = bus.ctx.createGain();
        const attack = Math.min(0.14, Math.max(0.04, onset - now > 0 ? (onset - now) * 0.22 + 0.045 : 0.045));

        osc.type = 'sine';
        osc.frequency.setValueAtTime(layer.frequency, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.setValueAtTime(0.0001, onset);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, layer.gain), onset + attack);

        if (!held) {
          const releaseAt = Math.max(onset + attack + 0.06, end - 0.22);
          gain.gain.setTargetAtTime(0.0001, releaseAt, 0.06);
        }

        osc.connect(gain);
        gain.connect(bus.routeFor(route));
        osc.start(now);
        if (!held) osc.stop(end + 0.12);
        bus.activeSources.push(osc, gain);
      });
    });
  }

  function install(MobiusAudioBus) {
    if (!MobiusAudioBus || MobiusAudioBus.prototype.__elaraChordTemporalV02) return;
    const proto = MobiusAudioBus.prototype;
    const originalGetState = proto.getState;

    proto.runElaraChordProgression = function runElaraChordProgression(chord, { held = false } = {}) {
      if (!chord) return false;
      this.lastElaraChord = chord.id;

      if (typeof this.runLayeredFullTwist === 'function') {
        this.runLayeredFullTwist({ held, includeSelectedTwistTones: false });
      }

      const chordTones = (chord.tones || []).map(toneById).filter(Boolean);
      const duration = held
        ? Math.max(2.4, chordTones.length * 0.34 + 1.2)
        : Math.max(0.8, this.testSeconds || 2);
      const step = held
        ? 0.34
        : Math.max(0.11, Math.min(0.48, duration / Math.max(3.5, chordTones.length + 1.5)));
      const now = this.ctx.currentTime;
      const end = now + duration;

      chordTones.forEach((tone, index) => {
        schedule(this, tone, {
          held,
          onset: now + index * step,
          end,
          chordSize: chordTones.length
        });
      });

      const projection = window.MobiusTemporalProjection?.getState?.() || null;
      this.lastElaraChordReceipt = {
        chordId: chord.id,
        title: chord.title,
        canonicalOrder: chordTones.map((tone) => ({
          id: tone.id,
          name: tone.codexName,
          canonicalHz: tone.frequency,
          safetyHz: safetyFrequency(tone),
          role: roleFor(tone)
        })),
        projection
      };
      this.emitState(`elara-chord:${chord.id}`);
      return true;
    };

    proto.getState = function getState(reason = 'state') {
      return {
        ...originalGetState.call(this, reason),
        elaraChordReceipt: this.lastElaraChordReceipt || null
      };
    };

    proto.__elaraChordTemporalV01 = true;
    proto.__elaraChordTemporalV02 = true;
  }

  window.ElaraChordTemporalAdapter = {
    install,
    chordById,
    safetyFrequency
  };

  install(window.MobiusAudioBus);
})();
