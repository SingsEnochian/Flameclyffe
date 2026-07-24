'use strict';

/* Elara Narrative Chord Temporal Adapter v0.1
   Routes the existing chord library through the shared 2025/2026 projection and
   harmonic renderer without changing the canonical chord definitions. */

(function () {
  function projectedLayers(frequency, gain) {
    return window.MobiusTemporalProjection?.renderLayers
      ? window.MobiusTemporalProjection.renderLayers(frequency, gain)
      : [{ harmonic: 1, frequency, gain }];
  }

  function schedule(bus, layer, { held, onset, end, chordSize }) {
    const tone = layer.tone;
    const routes = tone.routes?.length ? tone.routes : ['centre'];
    const baseGain = tone.twistGain ?? tone.gain * 0.4;
    const awakeningScale = tone.id === 'elara-awakening' ? 0.64 : 1;
    const gain = Math.min(0.012, baseGain * awakeningScale) / Math.max(1, Math.sqrt(chordSize * routes.length));

    projectedLayers(layer.renderedFrequency, gain).forEach((projected) => {
      routes.forEach((route) => {
        const osc = bus.ctx.createOscillator();
        const env = bus.ctx.createGain();
        const now = bus.ctx.currentTime;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(projected.frequency, Math.max(now, onset));
        env.gain.setValueAtTime(0.0001, now);
        env.gain.setValueAtTime(0.0001, Math.max(now, onset));
        env.connect(bus.routeFor(route));
        osc.connect(env);

        if (held) {
          env.gain.setTargetAtTime(Math.max(0.0002, projected.gain), onset, Math.max(0.035, bus.loopRamp));
          osc.start(onset);
        } else {
          const fadeInEnd = Math.min(end - 0.24, onset + 0.085);
          env.gain.exponentialRampToValueAtTime(Math.max(0.0002, projected.gain), Math.max(onset + 0.02, fadeInEnd));
          env.gain.setTargetAtTime(0.0001, Math.max(onset + 0.12, end - 0.22), 0.055);
          osc.start(onset);
          osc.stop(end + 0.08);
        }
        bus.activeSources.push(osc, env);
      });
    });
  }

  function install(MobiusAudioBus) {
    if (!MobiusAudioBus || MobiusAudioBus.prototype.__elaraChordTemporalV01) return;
    const proto = MobiusAudioBus.prototype;
    const original = proto.playNarrativeChord;
    if (typeof original !== 'function') return;

    proto.playNarrativeChord = function playNarrativeChord(chord, { held = false } = {}) {
      if (!chord || !this.ctx) return false;
      const layers = window.ElaraNarrativeChords?.layersFor?.(chord.id) || [];
      if (!layers.length) return original.call(this, chord, { held });

      const now = this.ctx.currentTime;
      const step = held ? 0.34 : Math.min(0.42, Math.max(0.18, this.testSeconds / Math.max(4, layers.length + 1)));
      const finalOnset = now + step * Math.max(0, layers.length - 1);
      const end = held ? Number.POSITIVE_INFINITY : Math.max(now + this.testSeconds, finalOnset + 0.82);
      layers.forEach((layer, index) => schedule(this, layer, {
        held,
        onset: now + step * index,
        end,
        chordSize: layers.length
      }));

      const projection = window.MobiusTemporalProjection?.getState?.();
      this.lastNarrativeChord = chord.id;
      this.lastNarrativeChordTitle = chord.title;
      this.lastNarrativeChordLayers = layers.map((layer) => ({
        tone: layer.tone.codexName,
        canonicalHz: layer.tone.frequency,
        safetyRenderedHz: layer.renderedFrequency,
        temporalRenderedHz: window.MobiusTemporalProjection?.projectFrequency?.(layer.renderedFrequency) ?? layer.renderedFrequency,
        harmonics: projection?.harmonics || [],
        role: layer.role
      }));
      this.emitState(`elara-chord:${chord.id}`);
      return true;
    };

    proto.__elaraChordTemporalV01 = true;
  }

  window.ElaraChordTemporalAdapter = { install };
  install(window.MobiusAudioBus);
})();
