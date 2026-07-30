'use strict';

/*
  Elara Continuous Phrasing v0.2
  Corrects the narrative-chord scheduler without changing canonical tones.
  Later entries receive their own full sounding duration, fixed attacks, and
  close overlapping entrances so the Codex reads as one continuous phrase.
*/

(function installContinuousElaraPhrasing() {
  const MODE_PREFIX = 'elara-chord:';
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
  const ROLE_GAIN = { ground: 1, path: 0.92, impulse: 0.86, relation: 0.82, weave: 0.76, crown: 0.62 };

  function toneById(id) {
    return window.ElaraCodexTones?.tones?.find((tone) => tone.id === id) || null;
  }

  function renderedFrequency(tone) {
    const soft = window.ElaraNarrativeChords?.readSoftAwakening?.() ?? true;
    return tone?.id === 'elara-awakening' && soft ? tone.frequency / 2 : tone.frequency;
  }

  function scheduleTone(bus, tone, { held, startDelay, sustain, count }) {
    if (!bus?.ctx || !tone) return;
    const role = ROLE_BY_TONE[tone.id] || 'layer';
    const roleGain = ROLE_GAIN[role] || 0.8;
    const baseGain = tone.twistGain ?? tone.gain * 0.42;
    const scaledGain = baseGain * roleGain / Math.max(1, Math.pow(count, 0.38));
    const routes = tone.routes?.length ? tone.routes : ['centre'];
    const perRouteGain = scaledGain / Math.max(1, Math.sqrt(routes.length));
    const now = bus.ctx.currentTime;
    const startAt = now + startDelay;
    const endAt = startAt + sustain;
    const attack = held ? 0.12 : 0.065;

    routes.forEach((route) => {
      const oscillator = bus.ctx.createOscillator();
      const gain = bus.ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(renderedFrequency(tone), now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, perRouteGain), startAt + attack);

      if (!held) {
        const releaseAt = Math.max(startAt + attack + 0.18, endAt - 0.28);
        gain.gain.setTargetAtTime(0.0001, releaseAt, 0.075);
      }

      oscillator.connect(gain);
      gain.connect(bus.routeFor(route));
      oscillator.start(now);
      if (!held) oscillator.stop(endAt + 0.16);
      bus.activeSources.push(oscillator, gain);
    });
  }

  function install() {
    const proto = window.MobiusAudioBus?.prototype;
    if (!proto || proto.__elaraContinuousPhrasingV02) return false;

    proto.runElaraChordProgression = function runElaraChordProgression(chord, { held = false } = {}) {
      if (!chord) return false;
      this.lastElaraChord = chord.id;
      this.runLayeredFullTwist({ held, includeSelectedTwistTones: false });

      const chordTones = chord.tones.map(toneById).filter(Boolean);
      const count = chordTones.length;
      const step = held ? 0.16 : Math.max(0.105, Math.min(0.18, 0.92 / Math.max(4, count)));
      const phraseSpan = Math.max(0, count - 1) * step;
      const requested = Math.max(1.6, Number(this.testSeconds) || 2);
      const sustain = held ? Math.max(3.2, phraseSpan + 2.4) : Math.max(1.35, requested - phraseSpan * 0.35);

      chordTones.forEach((tone, index) => scheduleTone(this, tone, {
        held,
        startDelay: index * step,
        sustain,
        count
      }));

      this.emitState(`${MODE_PREFIX}${chord.id}`);
      return true;
    };

    proto.__elaraContinuousPhrasingV02 = true;
    return true;
  }

  if (!install()) {
    window.addEventListener('load', install, { once: true });
  }
})();
