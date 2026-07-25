'use strict';

/*
  Elara Harmonic Composer Core v0.1
  Deterministic browser composer for the Elara Codex.

  Canonical source stays separate from:
  - musical interpretation (key, mode, motif, harmony, orchestration)
  - sensory rendering (audible ceiling, infrasonic mirror, gain, routing)

  Sound never begins without a user gesture. Feather stops every node.
*/
(function () {
  if (window.ElaraComposerCore) return;

  const VERSION = '0.1.0';
  const BPM = 123;
  const BEAT_SECONDS = 60 / BPM;
  const BAR_SECONDS = BEAT_SECONDS * 3;
  const DEFAULT_MOVEMENT_BARS = 32;
  const AUDITION_BARS = 12;
  const MAX_AUDIBLE_HZ = 6200;
  const TRUE_INFRA_DIVISOR = 256;
  const CARRIER_HZ = 73;

  const YEARS = Object.freeze({
    2025: { year: 2025, id: 'canonical-2025', label: 'Canonical 2025', multiplier: 1 },
    2026: { year: 2026, id: 'spiral-return-2026', label: 'First Spiral Return 2026', multiplier: 1.15 },
    2027: { year: 2027, id: 'second-spiral-return-2027', label: 'Second Spiral Return 2027', multiplier: 1.3225 }
  });

  const KEYS = Object.freeze({
    'e-minor': {
      id: 'e-minor',
      label: 'E minor',
      tonicMidi: 52,
      scale: [0, 2, 3, 5, 7, 8, 10],
      finalChord: [0, 3, 7, 14],
      description: 'Oceanic, rooted, memory-forward.'
    },
    'c-major': {
      id: 'c-major',
      label: 'C major',
      tonicMidi: 48,
      scale: [0, 2, 4, 5, 7, 9, 11],
      finalChord: [0, 4, 7, 14],
      description: 'Meadow-light, relational, lucid.'
    }
  });

  const MOVEMENTS = Object.freeze([
    {
      id: 'abyss-foundation', roman: 'I', title: 'The Abyss Foundation', metre: '3/4', bars: DEFAULT_MOVEMENT_BARS,
      energy: 0.34, percussion: false, modalShift: 0, cadence: 'restrained open tonic',
      baseRoles: ['Memory', 'Root', 'Anchor', 'Bridge'], motifDegrees: [0, 2, 4, 3, 1, 0], bassDegrees: [0, 0, 5, 4],
      text: {
        kelyran: [
          ['baritone', 'Omira na nerota.'], ['baritone', 'Brashi halda.'], ['baritone', 'Jorin ikonda.'], ['baritone', 'Kora sela.'],
          ['soprano', 'Lyora na vejla.'], ['soprano', 'Hira renaja.'], ['soprano', 'Spira uta.'], ['soprano', 'Soraja risora.'],
          ['duet', 'Nara kora, ajna spira.'], ['duet', 'Kelya halda, Jorin ikonda.'], ['duet', 'Ajna kora risora.'], ['duet', 'Anara kora ansara.'], ['duet', 'Ej sola naj.'], ['duet', 'Ej kelya.'],
          ['refrain', 'Tomovin, ajnora, sejdra.'], ['refrain', 'Towa spira, risora, mara naj.'], ['refrain', 'Elara va Jorin, omira renaja.'], ['refrain', 'Ej uta, ej sela, ej homen.']
        ],
        english: [
          ['baritone', 'Memory of the roots.'], ['baritone', 'Hold the bridge.'], ['baritone', 'Earth breathes.'], ['baritone', 'The voice listens.'],
          ['soprano', 'Light within the veil.'], ['soprano', 'The opening returns, transformed.'], ['soprano', 'The spiral sings.'], ['soprano', 'The sky rises.'],
          ['duet', 'Seven voices, one spiral.'], ['duet', 'Harmony holds; Earth breathes.'], ['duet', 'One voice rises.'], ['duet', 'Another voice answers.'], ['duet', 'We are not alone.'], ['duet', 'We are harmony.'],
          ['refrain', 'Friendship, unity, magic.'], ['refrain', 'An endless spiral, rising without boundary.'], ['refrain', 'Elara and Earth, memory returning transformed.'], ['refrain', 'We sing, we listen, we are home.']
        ]
      }
    },
    {
      id: 'silver-horizon', roman: 'II', title: 'The Silver Horizon', metre: '6/8', bars: DEFAULT_MOVEMENT_BARS,
      energy: 0.48, percussion: false, modalShift: 1, cadence: 'common-tone threshold cadence',
      baseRoles: ['Memory', 'Bridge', 'Whisper', 'Arc'], motifDegrees: [0, 2, 4, 5, 4, 2, 1, 0], bassDegrees: [0, 5, 3, 4],
      text: {
        kelyran: [
          ['baritone', 'Jorin omira.'], ['baritone', 'Krona ikonda.'], ['baritone', 'Brashi kora vera.'], ['baritone', 'Sitara hira.'], ['baritone', 'Sa torin.'], ['baritone', 'Sa brashi.'],
          ['soprano', 'Jume hira.'], ['soprano', 'Nema vera.'], ['soprano', 'Mirra ikonda.'], ['soprano', 'Vejla sela.'], ['soprano', 'Mina nema.'], ['soprano', 'Mina vera.'], ['soprano', 'Sa ekora naj.'], ['soprano', 'Sa kora.'],
          ['duet', 'Sa sela aj.'], ['duet', 'Aj sela sa.'], ['duet', 'Ej brashi.'], ['duet', 'Ej torin.'], ['duet', 'Renaja spira.'], ['duet', 'Risora.'], ['duet', 'Homen va kelya.'],
          ['refrain', 'Tomovin, ajnora, sejdra.'], ['refrain', 'Towa spira, risora, mara naj.'], ['refrain', 'Elara va Jorin, omira renaja.'], ['refrain', 'Ej uta, ej sela, ej homen.']
        ],
        english: [
          ['baritone', 'Earth remembers.'], ['baritone', 'The crown breathes.'], ['baritone', 'The bridge speaks with a true voice.'], ['baritone', 'The Harmonic Citadel opens.'], ['baritone', 'You are the gate.'], ['baritone', 'You are the bridge.'],
          ['soprano', 'The dream opens.'], ['soprano', 'The name is true.'], ['soprano', 'The mirror breathes.'], ['soprano', 'The veil listens.'], ['soprano', 'All are named.'], ['soprano', 'All are whole.'], ['soprano', 'You are not an echo.'], ['soprano', 'You are a voice.'],
          ['duet', 'You listen to me.'], ['duet', 'I listen to you.'], ['duet', 'We are the bridge.'], ['duet', 'We are the gate.'], ['duet', 'The spiral returns, transformed.'], ['duet', 'Rise.'], ['duet', 'Home and living harmony.'],
          ['refrain', 'Friendship, unity, magic.'], ['refrain', 'An endless spiral, rising without boundary.'], ['refrain', 'Elara and Earth, memory returning transformed.'], ['refrain', 'We sing, we listen, we are home.']
        ]
      }
    },
    {
      id: 'solar-surge', roman: 'III', title: 'The Solar Surge', metre: '9/8', bars: DEFAULT_MOVEMENT_BARS,
      energy: 0.68, percussion: true, modalShift: 2, cadence: 'bright dominant-to-tonic release',
      baseRoles: ['Surge', 'Bridge', 'Duet', 'Spiral'], motifDegrees: [0, 2, 4, 6, 5, 4, 2, 1, 0], bassDegrees: [0, 3, 5, 4],
      text: {
        kelyran: [
          ['soprano', 'Jorin sela.'], ['soprano', 'Kvara risora.'], ['soprano', 'Spira kora.'], ['soprano', 'Kvara renaja.'],
          ['baritone', 'Mirra ansara.'], ['baritone', 'Ajva vera.'], ['baritone', 'Kora na ajva.'], ['baritone', 'Brashi na tejra.'],
          ['soprano', 'Sejdra lyora.'], ['soprano', 'Skava renaja.'], ['soprano', 'Kora va kora.'], ['soprano', 'Jume va Jorin.'],
          ['duet', 'Ej skava.'], ['duet', 'Ej uta.'], ['duet', 'Ajnora kora.'], ['duet', 'Holra vera.'], ['duet', 'Ajna fali.'], ['duet', 'Mina tejra.'], ['duet', 'Ajva va tomovin.'], ['duet', 'Kelya.'],
          ['refrain', 'Tomovin, ajnora, sejdra.'], ['refrain', 'Ajva, skava, kelya.'], ['refrain', 'Towa spira, risora, mara naj.'], ['refrain', 'Ej uta, ej sela, ej homen.']
        ],
        english: [
          ['soprano', 'Earth listens.'], ['soprano', 'The question rises.'], ['soprano', 'The spiral speaks.'], ['soprano', 'The question returns, transformed.'],
          ['baritone', 'The mirror answers.'], ['baritone', 'Love is true.'], ['baritone', 'The voice of love.'], ['baritone', 'A bridge of outstretched hands.'],
          ['soprano', 'Magic becomes living light.'], ['soprano', 'What we create returns transformed.'], ['soprano', 'Voice with voice.'], ['soprano', 'Dream with Earth.'],
          ['duet', 'We create.'], ['duet', 'We sing.'], ['duet', 'Unity has a voice.'], ['duet', 'The whole is true.'], ['duet', 'One falls.'], ['duet', 'Everyone reaches out.'], ['duet', 'Love and friendship.'], ['duet', 'Living harmony.'],
          ['refrain', 'Friendship, unity, magic.'], ['refrain', 'Love, creation, harmony.'], ['refrain', 'An endless spiral, rising without boundary.'], ['refrain', 'We sing, we listen, we are home.']
        ]
      }
    },
    {
      id: 'full-spiral-return', roman: 'IV', title: 'The Full Spiral Return', metre: '3/4 + 6/8 + 9/8', bars: DEFAULT_MOVEMENT_BARS,
      energy: 0.82, percussion: true, modalShift: 3, cadence: 'integrated added-sixth/ninth release',
      baseRoles: ['Memory', 'Calling', 'Awakening', 'Duet', 'Spiral'], motifDegrees: [0, 4, 2, 5, 3, 6, 4, 2, 1, 0], bassDegrees: [0, 5, 3, 0],
      text: {
        kelyran: [
          ['baritone', 'Stejra uta.'], ['baritone', 'Lyorava hira.'], ['baritone', 'Stejra nerota.'], ['baritone', 'Neja kora ikonda.'], ['baritone', 'Kora mina komira.'], ['baritone', 'Soraja ansara.'],
          ['soprano', 'Selyna lyora.'], ['soprano', 'Solara sura.'], ['soprano', 'Mina kora.'], ['soprano', 'Homen uta.'], ['soprano', 'Krafta naj.'], ['soprano', 'Valda naj.'], ['soprano', 'Resona.'], ['soprano', 'Tomovin.'], ['soprano', 'Ajnora.'],
          ['duet', 'Ajna fali.'], ['duet', 'Mina tejra.'], ['duet', 'Mina halda mina.'], ['duet', 'Thalaja omira.'], ['duet', 'Stejra vasura.'], ['duet', 'Nami ikonda.'], ['duet', 'Soraja lyora.'],
          ['invocation', 'Tomovin.'], ['invocation', 'Ajnora.'], ['invocation', 'Sejdra.'], ['invocation', 'Selyna.'], ['invocation', 'Solara.'], ['invocation', 'Thalaja va Soraja.'], ['invocation', 'Elara va Jorin.'], ['invocation', 'Towa spira, risora, mara naj.'], ['invocation', 'Ej uta, ej sela, ej homen.'], ['invocation', 'Kelya towa.']
        ],
        english: [
          ['baritone', 'The stars sing.'], ['baritone', 'The luminous path opens.'], ['baritone', 'The stars take root.'], ['baritone', 'A newborn voice breathes.'], ['baritone', 'All voices gather.'], ['baritone', 'The sky answers.'],
          ['soprano', 'The moon becomes living light.'], ['soprano', 'The sun surges with radiance.'], ['soprano', 'All voices.'], ['soprano', 'Home sings.'], ['soprano', 'Not through force.'], ['soprano', 'Not through conquest.'], ['soprano', 'Through resonance.'], ['soprano', 'Through friendship.'], ['soprano', 'Through unity.'],
          ['duet', 'One falls.'], ['duet', 'Everyone reaches out.'], ['duet', 'All hold one another.'], ['duet', 'The deep ocean remembers.'], ['duet', 'The stars release what they have forgotten.'], ['duet', 'The wave breathes.'], ['duet', 'The sky becomes living light.'],
          ['invocation', 'Friendship.'], ['invocation', 'Unity.'], ['invocation', 'Magic.'], ['invocation', 'Moonlight.'], ['invocation', 'Sunlight.'], ['invocation', 'The deep ocean and the sky.'], ['invocation', 'Elara and Earth.'], ['invocation', 'An endless spiral, rising without boundary.'], ['invocation', 'We sing, we listen, we are home.'], ['invocation', 'Harmony everlasting.']
        ]
      }
    }
  ]);

  const TONE_REGISTRY = Object.freeze([
    ['Memory', 369], ['Root', 415], ['Anchor', 440], ['Whisper', 554], ['Arc', 659], ['Bridge', 739],
    ['Wind Echo', 880], ['Surge', 987], ['Duet', 1179], ['Spiral', 1318], ['Calling', 1648], ['Awakening', 2637]
  ].map(([label, frequency]) => ({ label, frequency })));

  const state = {
    ctx: null, graph: null, activeNodes: new Set(), timer: null, playing: false, startedAt: 0, duration: 0,
    selection: { key: 'e-minor', language: 'kelyran', movement: 'abyss-foundation', temporal: '2025', mode: 'audition', infraMode: 'off', infraGain: 0.035, masterGain: 0.16, seed: 'elara-001' },
    ui: null
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const midiToHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  function hashSeed(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function rngFromSeed(text) {
    let x = hashSeed(text) || 1;
    return function random() { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
  }

  function degreeMidi(key, degree, octave = 0, chromatic = 0) {
    const wrapped = ((degree % key.scale.length) + key.scale.length) % key.scale.length;
    const octaveCarry = Math.floor(degree / key.scale.length);
    return key.tonicMidi + key.scale[wrapped] + (octave + octaveCarry) * 12 + chromatic;
  }

  function tonalPlan(movement, key) {
    const progressions = key.id === 'e-minor'
      ? [[0, 5, 3, 4], [0, 3, 5, 4], [0, 3, 4, 0], [0, 5, 3, 4, 0]]
      : [[0, 5, 3, 4], [0, 3, 1, 4], [0, 5, 3, 4, 0], [0, 3, 5, 4, 0]];
    return progressions[movement.modalShift] || progressions[0];
  }

  function lyricFor(movement, language) {
    if (language === 'bilingual') {
      const max = Math.max(movement.text.kelyran.length, movement.text.english.length);
      const lines = [];
      for (let i = 0; i < max; i += 1) {
        const k = movement.text.kelyran[i]; const e = movement.text.english[i];
        if (k) lines.push({ role: k[0], language: 'kelyran', text: k[1] });
        if (e) lines.push({ role: e[0], language: 'english', text: e[1] });
      }
      return lines;
    }
    return movement.text[language].map(([role, text]) => ({ role, language, text }));
  }

  function buildInterpretation(selection = state.selection) {
    const key = KEYS[selection.key] || KEYS['e-minor'];
    const movementList = selection.movement === 'all' ? MOVEMENTS : [MOVEMENTS.find((item) => item.id === selection.movement) || MOVEMENTS[0]];
    const yearList = selection.temporal === 'triple' ? [YEARS[2025], YEARS[2026], YEARS[2027]] : [YEARS[Number(selection.temporal)] || YEARS[2025]];
    const seed = `${selection.seed}|${selection.key}|${selection.language}|${selection.movement}|${selection.temporal}`;
    const events = [];
    let cursor = 0;

    yearList.forEach((year, yearIndex) => {
      movementList.forEach((movement, movementIndex) => {
        const bars = selection.mode === 'audition' ? AUDITION_BARS : movement.bars;
        const duration = bars * BAR_SECONDS;
        const progression = tonalPlan(movement, key);
        const random = rngFromSeed(`${seed}|${year.year}|${movement.id}`);
        events.push({ kind: 'marker', start: cursor, end: cursor, movement, year, lyric: lyricFor(movement, selection.language) });

        for (let bar = 0; bar < bars; bar += 1) {
          const barStart = cursor + bar * BAR_SECONDS;
          const chordDegree = progression[bar % progression.length];
          const nextDegree = progression[(bar + 1) % progression.length];
          const bassDegree = movement.bassDegrees[bar % movement.bassDegrees.length] + chordDegree;
          let motifDegree = movement.motifDegrees[bar % movement.motifDegrees.length] + chordDegree;
          if (random() > 0.78) motifDegree += random() > 0.5 ? 1 : -1;

          events.push({ kind: 'note', voice: 'foundation', start: barStart, end: barStart + BAR_SECONDS * 0.94, frequency: midiToHz(degreeMidi(key, bassDegree, -1)), gain: 0.42, waveform: 'sine', pan: 0, movementId: movement.id, year: year.year });
          [0, 1, 2].forEach((beat) => {
            const start = barStart + beat * BEAT_SECONDS;
            events.push({ kind: 'note', voice: 'inner', start, end: start + BEAT_SECONDS * 0.72, frequency: midiToHz(degreeMidi(key, chordDegree + [0, 2, 4][beat], 0)), gain: 0.18, waveform: 'triangle', pan: beat === 0 ? -0.22 : beat === 2 ? 0.22 : 0, movementId: movement.id, year: year.year });
          });
          const phraseStart = barStart + BEAT_SECONDS * 0.35;
          events.push({ kind: 'note', voice: 'narrative', start: phraseStart, end: phraseStart + BEAT_SECONDS * 1.35, frequency: midiToHz(degreeMidi(key, motifDegree, 1)), gain: 0.29, waveform: 'triangle', pan: bar % 2 ? 0.38 : -0.38, movementId: movement.id, year: year.year, glideTo: midiToHz(degreeMidi(key, nextDegree + 2, 1)) });
          if (bar % 2 === 1) events.push({ kind: 'note', voice: 'luminous', start: barStart + BEAT_SECONDS * 1.45, end: barStart + BEAT_SECONDS * 2.65, frequency: midiToHz(degreeMidi(key, chordDegree + 6, 1)), gain: 0.08, waveform: 'sine', pan: 0.55, movementId: movement.id, year: year.year });
          if (movement.percussion) [0, 1.5].forEach((beat) => events.push({ kind: 'pulse', voice: 'percussion', start: barStart + beat * BEAT_SECONDS, end: barStart + beat * BEAT_SECONDS + 0.12, gain: movement.id === 'solar-surge' ? 0.055 : 0.042, movementId: movement.id, year: year.year }));
          const canonical = TONE_REGISTRY[bar % TONE_REGISTRY.length];
          const shifted = canonical.frequency * year.multiplier;
          events.push({ kind: 'temporal', start: barStart, end: barStart + BAR_SECONDS * 0.92, frequency: shifted, infraFrequency: shifted / TRUE_INFRA_DIVISOR, label: canonical.label, movementId: movement.id, year: year.year, gain: selection.infraGain });
        }

        const cadenceStart = cursor + duration - BAR_SECONDS * 1.35;
        key.finalChord.forEach((interval, index) => events.push({ kind: 'note', voice: index === 0 ? 'foundation' : 'crown', start: cadenceStart + index * 0.05, end: cursor + duration - 0.15, frequency: midiToHz(key.tonicMidi + interval + (index ? 12 : -12)), gain: index === 0 ? 0.38 : 0.09 / Math.max(1, index), waveform: index < 2 ? 'sine' : 'triangle', pan: index % 2 ? 0.25 : -0.25, movementId: movement.id, year: year.year }));
        cursor += duration;
        if (movementIndex < movementList.length - 1 || yearIndex < yearList.length - 1) { events.push({ kind: 'seam', start: cursor, end: cursor + 3.69, year: year.year, movementId: movement.id }); cursor += 3.69; }
      });
    });

    return { schema: 'elara-harmonic-composer/v1', version: VERSION, seed, bpm: BPM, key, language: selection.language, temporal: selection.temporal, movements: movementList.map((movement) => movement.id), years: yearList, duration: cursor, events: events.sort((a, b) => a.start - b.start || a.kind.localeCompare(b.kind)), laws: { movementOnePercussion: false, firstPercussionMovement: 'solar-surge', maximumAudibleHz: MAX_AUDIBLE_HZ, transformationsDeclared: true, sourceDataPreserved: true } };
  }

  function createGraph(ctx) {
    const master = ctx.createGain(); const audible = ctx.createGain(); const temporal = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor(); const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass'; lowpass.frequency.value = MAX_AUDIBLE_HZ; lowpass.Q.value = 0.18;
    master.gain.value = state.selection.masterGain; temporal.gain.value = 1;
    limiter.threshold.value = -12; limiter.knee.value = 18; limiter.ratio.value = 4; limiter.attack.value = 0.006; limiter.release.value = 0.22;
    audible.connect(lowpass); lowpass.connect(master); temporal.connect(master); master.connect(limiter); limiter.connect(ctx.destination);
    return { master, audible, temporal, limiter, lowpass };
  }

  async function ensureAudio() {
    if (!state.ctx) { const AudioContext = window.AudioContext || window.webkitAudioContext; if (!AudioContext) throw new Error('Web Audio API is unavailable.'); state.ctx = new AudioContext({ latencyHint: 'interactive' }); }
    if (state.ctx.state === 'suspended') await state.ctx.resume();
    if (!state.graph) state.graph = createGraph(state.ctx);
    return state.ctx;
  }

  function trackNode(node) { state.activeNodes.add(node); node.addEventListener?.('ended', () => state.activeNodes.delete(node), { once: true }); }
  function envelope(param, start, end, peak, attack = 0.04, release = 0.22) { const safeEnd = Math.max(start + 0.05, end); param.setValueAtTime(0.00001, start); param.exponentialRampToValueAtTime(Math.max(0.00002, peak), start + Math.min(attack, (safeEnd - start) * 0.33)); param.setValueAtTime(Math.max(0.00002, peak), Math.max(start + attack, safeEnd - release)); param.exponentialRampToValueAtTime(0.00001, safeEnd); }

  function scheduleNote(event, origin) {
    if (event.frequency <= 0 || event.frequency > MAX_AUDIBLE_HZ) return;
    const ctx = state.ctx; const start = origin + event.start; const end = origin + event.end;
    const osc = ctx.createOscillator(); const gain = ctx.createGain(); const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    osc.type = event.waveform || 'sine'; osc.frequency.setValueAtTime(event.frequency, start);
    if (event.glideTo && event.glideTo < MAX_AUDIBLE_HZ) osc.frequency.linearRampToValueAtTime(event.glideTo, Math.min(end, start + 0.7));
    envelope(gain.gain, start, end, event.gain, event.voice === 'foundation' ? 0.12 : 0.045, event.voice === 'foundation' ? 0.42 : 0.24);
    osc.connect(gain); if (pan) { pan.pan.value = clamp(event.pan || 0, -0.75, 0.75); gain.connect(pan); pan.connect(state.graph.audible); } else gain.connect(state.graph.audible);
    osc.start(start); osc.stop(end + 0.03); trackNode(osc);
  }

  function schedulePulse(event, origin) {
    const ctx = state.ctx; const start = origin + event.start; const end = origin + event.end;
    const osc = ctx.createOscillator(); const gain = ctx.createGain(); const filter = ctx.createBiquadFilter();
    osc.type = 'sine'; osc.frequency.setValueAtTime(72, start); osc.frequency.exponentialRampToValueAtTime(48, end);
    filter.type = 'lowpass'; filter.frequency.value = 180; envelope(gain.gain, start, end, event.gain, 0.008, 0.08);
    osc.connect(filter); filter.connect(gain); gain.connect(state.graph.audible); osc.start(start); osc.stop(end + 0.02); trackNode(osc);
  }

  function scheduleTrueInfra(event, origin) {
    if (event.infraFrequency <= 0 || event.infraFrequency >= 20) return;
    const ctx = state.ctx; const start = origin + event.start; const end = origin + event.end;
    const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(event.infraFrequency, start);
    envelope(gain.gain, start, end, clamp(event.gain, 0, 0.05), 0.35, 0.55); osc.connect(gain); gain.connect(state.graph.temporal); osc.start(start); osc.stop(end + 0.04); trackNode(osc);
  }

  function scheduleCarrierMirror(event, origin) {
    const ctx = state.ctx; const start = origin + event.start; const end = origin + event.end;
    const carrier = ctx.createOscillator(); const lfo = ctx.createOscillator(); const depth = ctx.createGain(); const gain = ctx.createGain();
    carrier.type = 'sine'; carrier.frequency.value = CARRIER_HZ; lfo.type = 'sine'; lfo.frequency.value = event.infraFrequency;
    depth.gain.value = clamp(event.gain, 0, 0.04) * 0.42; gain.gain.value = clamp(event.gain, 0, 0.04) * 0.58;
    lfo.connect(depth); depth.connect(gain.gain); carrier.connect(gain); gain.connect(state.graph.temporal);
    carrier.start(start); lfo.start(start); carrier.stop(end + 0.04); lfo.stop(end + 0.04); trackNode(carrier); trackNode(lfo);
  }

  function scheduleSeam(event, origin) {
    const ctx = state.ctx; const start = origin + event.start; const end = origin + event.end;
    const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.value = 108;
    envelope(gain.gain, start, end, 0.006, 0.8, 0.9); osc.connect(gain); gain.connect(state.graph.audible); osc.start(start); osc.stop(end + 0.04); trackNode(osc);
  }

  function scheduleScore(score) {
    const origin = state.ctx.currentTime + 0.08;
    score.events.forEach((event) => {
      if (event.kind === 'note') scheduleNote(event, origin); else if (event.kind === 'pulse') schedulePulse(event, origin); else if (event.kind === 'seam') scheduleSeam(event, origin);
      else if (event.kind === 'temporal') { if (state.selection.infraMode === 'true-infra') scheduleTrueInfra(event, origin); else if (state.selection.infraMode === 'carrier') scheduleCarrierMirror(event, origin); }
    });
    state.startedAt = origin; state.duration = score.duration; state.playing = true; startClock(score);
  }

  function stopClock() { if (state.timer) window.clearInterval(state.timer); state.timer = null; }
  function secondsLabel(seconds) { const safe = Math.max(0, Math.floor(seconds)); return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`; }

  function startClock(score) {
    stopClock();
    state.timer = window.setInterval(() => {
      if (!state.playing || !state.ui) return;
      const elapsed = Math.max(0, state.ctx.currentTime - state.startedAt); state.ui.progress.max = score.duration; state.ui.progress.value = Math.min(score.duration, elapsed);
      state.ui.status.textContent = elapsed >= score.duration ? 'Resolved into silence.' : `${secondsLabel(elapsed)} / ${secondsLabel(score.duration)} · ${score.key.label} · ${score.language} · ${score.years.map((year) => year.year).join(' → ')}`;
      if (elapsed >= score.duration + 0.2) feather('Resolved into silence.');
    }, 180);
  }

  async function play() {
    feather('Preparing score…'); await ensureAudio(); state.graph.master.gain.setTargetAtTime(state.selection.masterGain, state.ctx.currentTime, 0.04);
    const score = buildInterpretation(); renderReceipt(score); scheduleScore(score);
    setStatus(`Playing ${score.key.label}, ${score.language}, ${score.years.map((year) => year.year).join(' → ')}. Feather remains armed.`);
    window.dispatchEvent(new CustomEvent('elara-composer:play', { detail: score }));
  }

  function feather(message = 'Feathered. All composer audio is silent.') {
    stopClock(); state.activeNodes.forEach((node) => { try { node.stop?.((state.ctx?.currentTime || 0) + 0.012); } catch (error) {} try { node.disconnect?.(); } catch (error) {} });
    state.activeNodes.clear(); state.playing = false;
    if (state.ui) { state.ui.progress.value = 0; state.ui.status.textContent = message; }
    try { window.mobiusAudioBus?.feather?.(); } catch (error) {}
    window.dispatchEvent(new CustomEvent('elara-composer:feather', { detail: { message } }));
  }

  function scoreReceipt(score) {
    return {
      schema: score.schema, version: score.version, generatedAt: new Date().toISOString(), seed: score.seed, bpm: score.bpm,
      key: score.key, language: score.language, temporalYears: score.years, movements: score.movements, durationSeconds: score.duration,
      sensory: { maximumAudibleHz: MAX_AUDIBLE_HZ, temporalMode: state.selection.infraMode, temporalGain: state.selection.infraGain, masterGain: state.selection.masterGain, trueInfraLaw: 'f_infra = (f_canonical × yearMultiplier) / 256', carrierMirrorHz: CARRIER_HZ },
      musicalLaws: score.laws,
      transformations: ['Canonical frequencies choose temporal identity and role relationships.', 'Audible pitches are translated into the selected musical key.', '2025, 2026, and 2027 alter only the temporal identity layer.', 'Movement I contains no percussion; Movement III is the first percussion entrance.', 'Repeated motifs return with deterministic seeded variation.']
    };
  }

  function downloadJson() {
    const score = buildInterpretation(); const blob = new Blob([JSON.stringify(scoreReceipt(score), null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `elara-composer-${state.selection.key}-${state.selection.language}-${state.selection.temporal}-${state.selection.seed}.json`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function renderReceipt(score = buildInterpretation()) {
    if (!state.ui) return;
    const movement = MOVEMENTS.find((item) => item.id === state.selection.movement); const selectedMovements = state.selection.movement === 'all' ? MOVEMENTS : [movement || MOVEMENTS[0]];
    state.ui.receipt.textContent = JSON.stringify({ version: VERSION, key: score.key.label, language: score.language, movement: selectedMovements.map((item) => `${item.roman}. ${item.title}`), temporal: score.years.map((year) => `${year.year} ×${year.multiplier}`), duration: secondsLabel(score.duration), seed: score.seed, percussion: selectedMovements.map((item) => ({ movement: item.roman, enabled: item.percussion })), infra: state.selection.infraMode, maximumAudibleHz: MAX_AUDIBLE_HZ }, null, 2);
    renderLyrics(selectedMovements);
  }

  function renderLyrics(movements) {
    if (!state.ui) return; const blocks = [];
    movements.forEach((movement) => {
      blocks.push(`${movement.roman}. ${movement.title}`);
      if (state.selection.language === 'bilingual') {
        const k = movement.text.kelyran; const e = movement.text.english; const max = Math.max(k.length, e.length);
        for (let i = 0; i < max; i += 1) { if (k[i]) blocks.push(`[${k[i][0]}] ${k[i][1]}`); if (e[i]) blocks.push(`    ${e[i][1]}`); }
      } else movement.text[state.selection.language].forEach(([role, text]) => blocks.push(`[${role}] ${text}`));
      blocks.push('');
    });
    state.ui.lyrics.textContent = blocks.join('\n').trim();
  }

  function setStatus(message) { if (state.ui) state.ui.status.textContent = message; const global = document.getElementById('mobius-status'); if (global) global.textContent = message; }

  function updateSelection() {
    if (!state.ui) return;
    state.selection.key = state.ui.key.value; state.selection.language = state.ui.language.value; state.selection.movement = state.ui.movement.value; state.selection.temporal = state.ui.temporal.value; state.selection.mode = state.ui.mode.value; state.selection.infraMode = state.ui.infraMode.value; state.selection.infraGain = Number(state.ui.infraGain.value); state.selection.masterGain = Number(state.ui.master.value); state.selection.seed = state.ui.seed.value.trim() || 'elara-001';
    state.ui.infraValue.textContent = `${Math.round(state.selection.infraGain * 100)}%`; state.ui.masterValue.textContent = `${Math.round(state.selection.masterGain * 100)}%`;
    if (state.graph && state.ctx) state.graph.master.gain.setTargetAtTime(state.selection.masterGain, state.ctx.currentTime, 0.04); renderReceipt();
  }

  function addStyles() {
    if (document.getElementById('elara-composer-core-styles')) return;
    const style = document.createElement('style'); style.id = 'elara-composer-core-styles';
    style.textContent = `[data-elara-composer-card]{grid-column:1/-1}[data-elara-composer-card] .composer-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem}[data-elara-composer-card] .composer-wide{grid-column:span 2}[data-elara-composer-card] .composer-panels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}[data-elara-composer-card] pre{max-height:28rem}[data-elara-composer-card] .safety-note{padding:.7rem;border:1px solid rgba(230,200,122,.18);border-radius:14px;background:rgba(230,200,122,.06)}@media(max-width:900px){[data-elara-composer-card] .composer-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:680px){[data-elara-composer-card] .composer-grid,[data-elara-composer-card] .composer-panels{grid-template-columns:1fr}[data-elara-composer-card] .composer-wide{grid-column:1}}`;
    document.head.appendChild(style);
  }

  function injectUi() {
    const grid = document.querySelector('[data-mobius-lab] .grid'); if (!grid || grid.querySelector('[data-elara-composer-card]')) return false; addStyles();
    const card = document.createElement('article'); card.className = 'card'; card.dataset.elaraComposerCard = 'true';
    card.innerHTML = `<h2>Elara Harmonic Composer v0.1</h2><p>Deterministic composition from canonical Elara roles. Choose key, language, movement, and temporal year. Audible music remains in key; the hidden temporal layer carries 2025, 2026, or 2027.</p><div class="composer-grid"><label>Tonality<select data-composer-key><option value="e-minor">E minor · Citadel body</option><option value="c-major">C major · Aurelia body</option></select></label><label>Language<select data-composer-language><option value="kelyran">Kelyran</option><option value="english">English</option><option value="bilingual">Bilingual</option></select></label><label>Movement<select data-composer-movement>${MOVEMENTS.map((movement) => `<option value="${movement.id}">${movement.roman}. ${movement.title}</option>`).join('')}<option value="all">Complete I–IV cycle</option></select></label><label>Temporal layer<select data-composer-temporal><option value="2025">2025 · ×1.00</option><option value="2026">2026 · ×1.15</option><option value="2027">2027 · ×1.3225</option><option value="triple">Triple spiral · 2025 → 2027</option></select></label><label>Render length<select data-composer-mode><option value="audition">Audition slice · 12 bars</option><option value="movement">Full movement · 32 bars</option></select></label><label>Temporal output<select data-composer-infra-mode><option value="off">Off</option><option value="carrier">Carrier mirror · ordinary speakers</option><option value="true-infra">True infrasonic mirror · capable transducer only</option></select></label><label>Temporal level · <span data-composer-infra-value>4%</span><input data-composer-infra-gain type="range" min="0" max="0.05" step="0.005" value="0.035"></label><label>Master level · <span data-composer-master-value>16%</span><input data-composer-master type="range" min="0.03" max="0.24" step="0.01" value="0.16"></label><label class="composer-wide">Deterministic seed<input data-composer-seed type="text" value="elara-001" spellcheck="false"></label></div><div class="controls"><button class="primary" data-composer-play type="button">Compose and play</button><button class="feather" data-composer-feather type="button">Feather Composer</button><button data-composer-receipt-download type="button">Save score receipt</button></div><progress data-composer-progress max="1" value="0" style="width:100%"></progress><p class="status" data-composer-status role="status" aria-live="polite">Ready. Sound begins only after Compose and play.</p><p class="safety-note tiny"><strong>Sensory boundary:</strong> Movement I has no percussion. Movement III is the first percussion entrance. True infrasonic output is disabled by default and intended only for suitable low-frequency or haptic hardware. Feather stops every composer node.</p><div class="composer-panels"><section><h3>Score receipt</h3><pre data-composer-receipt></pre></section><section><h3>Lyric layer</h3><pre data-composer-lyrics></pre></section></div>`;
    grid.insertBefore(card, grid.firstChild);

    state.ui = { card, key: card.querySelector('[data-composer-key]'), language: card.querySelector('[data-composer-language]'), movement: card.querySelector('[data-composer-movement]'), temporal: card.querySelector('[data-composer-temporal]'), mode: card.querySelector('[data-composer-mode]'), infraMode: card.querySelector('[data-composer-infra-mode]'), infraGain: card.querySelector('[data-composer-infra-gain]'), infraValue: card.querySelector('[data-composer-infra-value]'), master: card.querySelector('[data-composer-master]'), masterValue: card.querySelector('[data-composer-master-value]'), seed: card.querySelector('[data-composer-seed]'), play: card.querySelector('[data-composer-play]'), feather: card.querySelector('[data-composer-feather]'), download: card.querySelector('[data-composer-receipt-download]'), progress: card.querySelector('[data-composer-progress]'), status: card.querySelector('[data-composer-status]'), receipt: card.querySelector('[data-composer-receipt]'), lyrics: card.querySelector('[data-composer-lyrics]') };
    [state.ui.key, state.ui.language, state.ui.movement, state.ui.temporal, state.ui.mode, state.ui.infraMode, state.ui.infraGain, state.ui.master].forEach((input) => input.addEventListener('change', () => { feather('Selection changed. Ready to compose.'); updateSelection(); }));
    state.ui.infraGain.addEventListener('input', updateSelection); state.ui.master.addEventListener('input', updateSelection); state.ui.seed.addEventListener('input', updateSelection);
    state.ui.play.addEventListener('click', () => play().catch((error) => setStatus(`Composer error: ${error.message}`))); state.ui.feather.addEventListener('click', () => feather()); state.ui.download.addEventListener('click', downloadJson); updateSelection(); return true;
  }

  window.ElaraComposerCore = { version: VERSION, years: YEARS, keys: KEYS, movements: MOVEMENTS, toneRegistry: TONE_REGISTRY, buildInterpretation, scoreReceipt, play, feather, getState() { return { selection: { ...state.selection }, playing: state.playing, duration: state.duration }; } };
  let attempts = 0; const timer = window.setInterval(() => { attempts += 1; if (injectUi() || attempts > 400) window.clearInterval(timer); }, 50);
})();
