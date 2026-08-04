'use strict';

/*
  The Elara Codex · Complete Double-Spiral Song v0.1

  One continuous composition:
    Pass I  · Canonical 2025, Chapter 1 through Chapter 57
    Pass II · First Spiral Return 2026, the same score at ×1.15

  Musical law:
    - 123 BPM
    - 3/4 → 6/8 → 9/8 → interlocked 3-6-9 movement structure
    - 9:36 per pass; 19:12 for the complete double spiral
    - fundamental + 2× + 3× + 4× + 5× pure sine layers throughout
    - movement harmonic intensity 15% → 30% → 50% → 75%
    - very quiet Möbius twist and rhythmically gated white-noise bed
    - phase-inverted left-return and phase-inverted both-return masters
    - nine-second final fade

  The source chapter mappings remain in ElaraCodexSource. This file is the
  single playable score, renderer, player, and export surface.
*/

(function () {
  const BPM = 123;
  const BEAT_SECONDS = 60 / BPM;
  const PASS_SECONDS = 576;
  const TOTAL_SECONDS = PASS_SECONDS * 2;
  const SAMPLE_RATE = 32000;
  const FIVE_LAYERS = Object.freeze([1, 2, 3, 4, 5]);
  const TWIST_MIX_DEFAULT = 0.10;
  const MASTER_LEVEL_DEFAULT = 0.15;
  const FINAL_FADE_SECONDS = 9;
  const SEAM_SECONDS = 3.69;
  const SCORE_VERSION = '0.1.0';
  const RETURN_MODES = Object.freeze({
    'left-inverted': {
      id: 'left-inverted',
      label: 'Phase-inverted left-ear return',
      fileSlug: 'left-return'
    },
    'both-inverted': {
      id: 'both-inverted',
      label: 'Phase-inverted both-ear return',
      fileSlug: 'both-ear-return'
    }
  });

  const HARMONIC_WEIGHT = Object.freeze({
    1: 1,
    2: 0.30,
    3: 0.18,
    4: 0.10,
    5: 0.065
  });

  const MOVEMENTS = Object.freeze([
    {
      id: 'abyss-foundation',
      title: 'The Abyss Foundation',
      start: 0,
      end: 138,
      cycleBeats: 3,
      metre: '3/4',
      harmonicMix: 0.15,
      chapters: [1, 14],
      motif: [369, 415],
      texture: 'Cold oceanic foundation; clean three-beat intervals.'
    },
    {
      id: 'silver-horizon',
      title: 'The Silver Horizon',
      start: 138,
      end: 276,
      cycleBeats: 6,
      metre: '6/8',
      harmonicMix: 0.30,
      chapters: [15, 28],
      motif: [554, 659],
      texture: 'Silver return-bus swells; six-beat crossing patterns.'
    },
    {
      id: 'solar-surge',
      title: 'The Solar Surge',
      start: 276,
      end: 432,
      cycleBeats: 9,
      metre: '9/8',
      harmonicMix: 0.50,
      chapters: [29, 43],
      motif: [987, 1179],
      texture: 'Warm pressure and nine-beat ignition.'
    },
    {
      id: 'full-spiral-return',
      title: 'The Full Spiral Return',
      start: 432,
      end: 576,
      cycleBeats: 9,
      metre: '3/4 + 6/8 + 9/8',
      harmonicMix: 0.75,
      chapters: [44, 57],
      motif: [415, 440, 659, 739, 987, 1179, 1318, 2637],
      texture: 'All 3-6-9 pulses interlock; full chord and nine-second release.'
    }
  ]);

  const PASSES = Object.freeze([
    {
      id: 'canonical-2025',
      title: 'Pass I · The Original Codex',
      year: 2025,
      multiplier: 1,
      offset: 0
    },
    {
      id: 'spiral-return-2026',
      title: 'Pass II · First Spiral Return',
      year: 2026,
      multiplier: 1.15,
      offset: PASS_SECONDS
    }
  ]);

  const ROUTES = Object.freeze({
    Memory: ['return'],
    Root: ['centre'],
    Anchor: ['centre'],
    Whisper: ['return'],
    Arc: ['left'],
    Bridge: ['left', 'return'],
    'Wind Echo': ['right'],
    Surge: ['right'],
    Vortex: ['centre', 'return'],
    Duet: ['left', 'right'],
    Spiral: ['centre', 'return'],
    Calling: ['right'],
    Awakening: ['centre']
  });

  const ROLE_BASE_GAIN = Object.freeze({
    ground: 0.0078,
    path: 0.0068,
    impulse: 0.0064,
    relation: 0.0058,
    weave: 0.0050,
    crown: 0.0035,
    unregistered: 0.0048
  });

  const formatState = {
    ffmpeg: null,
    ffmpegLoaded: false,
    rendering: false,
    playing: false,
    playbackToken: 0,
    buffers: new Map(),
    currentSources: [],
    movementTimer: null
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const source = () => window.ElaraCodexSource || null;
  const chapters = () => source()?.chapters || [];

  function selectedChapterSequence(chapter) {
    return chapter?.narrativeToneSequence?.length
      ? chapter.narrativeToneSequence
      : chapter?.sourceToneSequence?.length
        ? chapter.sourceToneSequence
        : chapter?.toneSequence || [];
  }

  function chapterSetForMovement(movement) {
    const [first, last] = movement.chapters;
    return chapters()
      .filter((chapter) => chapter.number >= first && chapter.number <= last)
      .sort((left, right) => (left.sequenceIndex || 0) - (right.sequenceIndex || 0));
  }

  function passCacheKey(pass, returnMode, twistMix) {
    return `${pass.id}:${returnMode}:${SAMPLE_RATE}:${twistMix.toFixed(3)}:${source()?.curationVersion || 'raw'}`;
  }

  function addToChannelMerger(node, merger, input) {
    node.connect(merger, 0, input);
  }

  function buildBus(ctx, returnMode) {
    const left = ctx.createGain();
    const right = ctx.createGain();
    const centre = ctx.createGain();
    const returnBus = ctx.createGain();
    const centreLeft = ctx.createGain();
    const centreRight = ctx.createGain();
    const returnPhase = ctx.createGain();
    const returnLeft = ctx.createGain();
    const returnRight = ctx.createGain();
    const merger = ctx.createChannelMerger(2);
    const master = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();

    centreLeft.gain.value = Math.SQRT1_2;
    centreRight.gain.value = Math.SQRT1_2;
    returnPhase.gain.value = -1;
    returnLeft.gain.value = returnMode === 'left-inverted' || returnMode === 'both-inverted'
      ? (returnMode === 'both-inverted' ? Math.SQRT1_2 : 1)
      : 0;
    returnRight.gain.value = returnMode === 'both-inverted' ? Math.SQRT1_2 : 0;
    master.gain.value = 0.92;
    limiter.threshold.value = -10;
    limiter.knee.value = 18;
    limiter.ratio.value = 7;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.18;

    addToChannelMerger(left, merger, 0);
    addToChannelMerger(right, merger, 1);
    centre.connect(centreLeft);
    centre.connect(centreRight);
    addToChannelMerger(centreLeft, merger, 0);
    addToChannelMerger(centreRight, merger, 1);
    returnBus.connect(returnPhase);
    returnPhase.connect(returnLeft);
    returnPhase.connect(returnRight);
    addToChannelMerger(returnLeft, merger, 0);
    addToChannelMerger(returnRight, merger, 1);
    merger.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);

    return { left, right, centre, return: returnBus, master, limiter };
  }

  function routeNodes(bus, tone) {
    const names = ROUTES[tone.label] || ['centre'];
    return names.map((name) => bus[name] || bus.centre);
  }

  function scheduleEnvelope(gainParam, start, end, peak, attack = 0.08, release = 0.42) {
    const safeStart = Math.max(0, start);
    const safeEnd = Math.max(safeStart + 0.12, end);
    gainParam.setValueAtTime(0.00001, safeStart);
    gainParam.exponentialRampToValueAtTime(Math.max(0.00002, peak), safeStart + Math.min(attack, (safeEnd - safeStart) * 0.25));
    gainParam.setValueAtTime(Math.max(0.00002, peak), Math.max(safeStart + attack, safeEnd - release));
    gainParam.exponentialRampToValueAtTime(0.00001, safeEnd);
  }

  function scheduleSine(ctx, destination, frequency, start, end, gain, options = {}) {
    const nyquistLimit = ctx.sampleRate * 0.495;
    if (!Number.isFinite(frequency) || frequency <= 0 || frequency >= nyquistLimit) return;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, Math.max(0, start));
    scheduleEnvelope(
      envelope.gain,
      start,
      end,
      Math.max(0.00002, gain),
      options.attack ?? 0.08,
      options.release ?? 0.42
    );
    oscillator.connect(envelope);
    envelope.connect(destination);
    oscillator.start(Math.max(0, start));
    oscillator.stop(Math.max(start + 0.13, end + 0.04));
  }

  function schedulePureFiveLayerStack(ctx, bus, tone, start, end, baseGain, multiplier, harmonicMix) {
    const routes = routeNodes(bus, tone);
    const routeGain = baseGain / Math.max(1, Math.sqrt(routes.length));
    FIVE_LAYERS.forEach((harmonic) => {
      const layerGain = harmonic === 1
        ? routeGain
        : routeGain * HARMONIC_WEIGHT[harmonic] * harmonicMix;
      const frequency = Number(tone.frequencyHz) * multiplier * harmonic;
      routes.forEach((route) => scheduleSine(ctx, route, frequency, start, end, layerGain, {
        attack: harmonic === 1 ? 0.09 : 0.14,
        release: harmonic === 1 ? 0.46 : 0.62
      }));
    });
  }

  function motifTone(frequency, label = 'Motif', role = 'weave') {
    return { frequencyHz: frequency, label, role };
  }

  function movementChapterWindows(movement) {
    const movementChapters = chapterSetForMovement(movement);
    if (!movementChapters.length) return [];
    const duration = movement.end - movement.start;
    const totalBeats = Math.floor(duration / BEAT_SECONDS);
    const totalCycles = Math.max(movementChapters.length, Math.floor(totalBeats / movement.cycleBeats));
    const baseCycles = Math.max(1, Math.floor(totalCycles / movementChapters.length));
    let remainder = Math.max(0, totalCycles - baseCycles * movementChapters.length);
    let cycleCursor = 0;

    return movementChapters.map((chapter, index) => {
      const cycles = baseCycles + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      const start = movement.start + cycleCursor * movement.cycleBeats * BEAT_SECONDS;
      cycleCursor += cycles;
      const naturalEnd = movement.start + cycleCursor * movement.cycleBeats * BEAT_SECONDS;
      const end = index === movementChapters.length - 1
        ? movement.end
        : Math.min(movement.end, naturalEnd);
      return { chapter, start, end, cycles };
    });
  }

  function scheduleMovementMotif(ctx, bus, movement, multiplier) {
    const motifGain = movement.id === 'full-spiral-return' ? 0.0019 : 0.0026;
    movement.motif.forEach((frequency, index) => {
      const label = index % 3 === 0 ? 'Spiral' : index % 3 === 1 ? 'Anchor' : 'Arc';
      const tone = motifTone(frequency, label, index < 2 ? 'ground' : 'weave');
      schedulePureFiveLayerStack(
        ctx,
        bus,
        tone,
        movement.start + index * 0.06,
        movement.end,
        motifGain / Math.max(1, Math.sqrt(movement.motif.length)),
        multiplier,
        movement.harmonicMix
      );
    });

    const pulseFrequency = BPM / 60 / movement.cycleBeats;
    const pulseCarrier = 108 * multiplier;
    const oscillator = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    const envelope = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = pulseCarrier;
    lfo.type = 'sine';
    lfo.frequency.value = pulseFrequency;
    lfoDepth.gain.value = 0.00022;
    envelope.gain.value = 0.00030;
    lfo.connect(lfoDepth);
    lfoDepth.connect(envelope.gain);
    oscillator.connect(envelope);
    envelope.connect(bus.centre);
    oscillator.start(movement.start);
    lfo.start(movement.start);
    oscillator.stop(movement.end);
    lfo.stop(movement.end);
  }

  function scheduleChapterProgressions(ctx, bus, movement, multiplier) {
    movementChapterWindows(movement).forEach(({ chapter, start, end }) => {
      const sequence = selectedChapterSequence(chapter);
      if (!sequence.length || end - start < 0.4) return;
      const entrySpan = Math.min(
        Math.max(BEAT_SECONDS, movement.cycleBeats * BEAT_SECONDS * 0.62),
        Math.max(BEAT_SECONDS, (end - start) * 0.34)
      );
      const step = sequence.length > 1 ? entrySpan / (sequence.length - 1) : 0;
      const chordEnd = Math.max(start + 0.5, end - 0.08);
      const chordSizeScale = 1 / Math.max(1, Math.pow(sequence.length, 0.34));

      sequence.forEach((tone, index) => {
        const roleGain = ROLE_BASE_GAIN[tone.role] || ROLE_BASE_GAIN.unregistered;
        const onset = start + index * step;
        schedulePureFiveLayerStack(
          ctx,
          bus,
          tone,
          onset,
          chordEnd,
          roleGain * chordSizeScale,
          multiplier,
          movement.harmonicMix
        );
      });
    });
  }

  function createWhiteNoiseBuffer(ctx) {
    const frames = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frames; index += 1) data[index] = Math.random() * 2 - 1;
    return buffer;
  }

  function scheduleNoisePulse(gainParam, panParam, time, kind, gain) {
    const floor = 0.000001;
    if (kind === 3) {
      gainParam.setValueAtTime(floor, time);
      gainParam.linearRampToValueAtTime(gain, time + 0.035);
      gainParam.exponentialRampToValueAtTime(floor, time + 0.24);
      panParam.setValueAtTime(-0.86, time);
      panParam.linearRampToValueAtTime(0.86, time + 0.22);
    } else if (kind === 6) {
      gainParam.setValueAtTime(floor, time);
      gainParam.linearRampToValueAtTime(gain * 0.82, time + 0.28);
      gainParam.exponentialRampToValueAtTime(floor, time + 0.82);
      panParam.setValueAtTime(0, time);
    } else {
      gainParam.setValueAtTime(floor, time);
      gainParam.linearRampToValueAtTime(gain * 0.52, time + 0.025);
      gainParam.exponentialRampToValueAtTime(floor, time + 0.11);
      gainParam.setValueAtTime(floor, time + 0.15);
      panParam.setValueAtTime(0, time);
    }
  }

  function scheduleQuietTwist(ctx, bus, pass, twistMix) {
    const multiplier = pass.multiplier;
    const end = PASS_SECONDS;
    const base = clamp(twistMix, 0.02, 0.15);
    const toneGain = 0.0042 * base;
    const noiseGain = 0.0034 * base;

    scheduleSine(ctx, bus.centre, 108 * multiplier, 0, end, toneGain * 0.75, { attack: 2.2, release: 2.2 });
    scheduleSine(ctx, bus.left, 369 * multiplier, 0, end, toneGain, { attack: 2.2, release: 2.2 });
    scheduleSine(ctx, bus.right, 363.5 * multiplier, 0, end, toneGain, { attack: 2.2, release: 2.2 });
    scheduleSine(ctx, bus.left, 369 * multiplier, 0, end, toneGain * 0.48, { attack: 2.2, release: 2.2 });
    scheduleSine(ctx, bus.return, 369 * multiplier, 0, end, toneGain * 0.62, { attack: 2.2, release: 2.2 });

    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gate = ctx.createGain();
    const panner = ctx.createStereoPanner();
    noise.buffer = createWhiteNoiseBuffer(ctx);
    noise.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 920;
    filter.Q.value = 0.42;
    gate.gain.value = 0.000001;
    panner.pan.value = 0;
    noise.connect(filter);
    filter.connect(gate);
    gate.connect(panner);
    panner.connect(bus.master);

    const totalBeats = Math.floor(PASS_SECONDS / BEAT_SECONDS);
    for (let beat = 3; beat <= totalBeats; beat += 3) {
      const kind = beat % 9 === 0 ? 9 : beat % 6 === 0 ? 6 : 3;
      scheduleNoisePulse(gate.gain, panner.pan, beat * BEAT_SECONDS, kind, noiseGain);
    }
    noise.start(0);
    noise.stop(PASS_SECONDS);
  }

  function scheduleSeamAndFinalFade(bus, pass) {
    if (pass.id === 'canonical-2025') {
      const seamStart = PASS_SECONDS - SEAM_SECONDS;
      bus.master.gain.setValueAtTime(0.92, seamStart);
      bus.master.gain.linearRampToValueAtTime(0.77, PASS_SECONDS - 0.02);
      return;
    }
    bus.master.gain.setValueAtTime(0.77, 0);
    bus.master.gain.linearRampToValueAtTime(0.92, SEAM_SECONDS);
    const fadeStart = PASS_SECONDS - FINAL_FADE_SECONDS;
    bus.master.gain.setValueAtTime(0.92, fadeStart);
    bus.master.gain.exponentialRampToValueAtTime(0.00001, PASS_SECONDS);
  }

  async function renderPass(pass, returnMode, twistMix, onStatus) {
    const key = passCacheKey(pass, returnMode, twistMix);
    if (formatState.buffers.has(key)) return formatState.buffers.get(key);
    const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Offline) throw new Error('OfflineAudioContext is unavailable in this browser.');
    onStatus?.(`Rendering ${pass.title} · ${RETURN_MODES[returnMode].label}…`);
    const ctx = new Offline(2, Math.ceil(PASS_SECONDS * SAMPLE_RATE), SAMPLE_RATE);
    const bus = buildBus(ctx, returnMode);
    scheduleQuietTwist(ctx, bus, pass, twistMix);
    MOVEMENTS.forEach((movement) => {
      scheduleMovementMotif(ctx, bus, movement, pass.multiplier);
      scheduleChapterProgressions(ctx, bus, movement, pass.multiplier);
    });
    scheduleSeamAndFinalFade(bus, pass);
    const buffer = await ctx.startRendering();
    formatState.buffers.set(key, buffer);
    return buffer;
  }

  async function renderPair(returnMode, twistMix, onStatus) {
    const rendered = [];
    for (let index = 0; index < PASSES.length; index += 1) {
      const pass = PASSES[index];
      onStatus?.(`Rendering pass ${index + 1} of ${PASSES.length}: ${pass.title}`);
      rendered.push(await renderPass(pass, returnMode, twistMix, onStatus));
    }
    onStatus?.('The complete double spiral is rendered.');
    return rendered;
  }

  function stopSong() {
    formatState.playbackToken += 1;
    formatState.playing = false;
    if (formatState.movementTimer) window.clearInterval(formatState.movementTimer);
    formatState.movementTimer = null;
    formatState.currentSources.forEach((node) => {
      try { node.stop(); } catch (error) {}
      try { node.disconnect(); } catch (error) {}
    });
    formatState.currentSources = [];
    try { window.mobiusAudioBus?.feather?.(0.18); } catch (error) {}
  }

  function movementAtElapsed(seconds) {
    const withinPass = ((seconds % PASS_SECONDS) + PASS_SECONDS) % PASS_SECONDS;
    return MOVEMENTS.find((movement) => withinPass >= movement.start && withinPass < movement.end) || MOVEMENTS[MOVEMENTS.length - 1];
  }

  async function playSong(options, onStatus, onClock) {
    stopSong();
    const returnMode = RETURN_MODES[options.returnMode] ? options.returnMode : 'left-inverted';
    const twistMix = clamp(options.twistMix, 0.02, 0.15);
    const loop = Boolean(options.loop);
    const pair = await renderPair(returnMode, twistMix, onStatus);
    const bus = window.mobiusAudioBus;
    if (!bus) throw new Error('The Möbius sound engine is not available.');
    await bus.ensure();
    bus.setMaster(MASTER_LEVEL_DEFAULT);
    bus.setLoopRamp?.(SEAM_SECONDS);
    const masterSlider = document.getElementById('master-level');
    if (masterSlider) masterSlider.value = String(MASTER_LEVEL_DEFAULT);

    const token = ++formatState.playbackToken;
    formatState.playing = true;

    function startPair() {
      if (token !== formatState.playbackToken) return;
      const now = bus.ctx.currentTime + 0.08;
      const first = bus.ctx.createBufferSource();
      const second = bus.ctx.createBufferSource();
      first.buffer = pair[0];
      second.buffer = pair[1];
      first.connect(bus.nodes.master);
      second.connect(bus.nodes.master);
      first.start(now);
      second.start(now + PASS_SECONDS);
      bus.activeSources.push(first, second);
      formatState.currentSources = [first, second];
      const wallStart = performance.now();
      if (formatState.movementTimer) window.clearInterval(formatState.movementTimer);
      formatState.movementTimer = window.setInterval(() => {
        if (token !== formatState.playbackToken) return;
        const elapsed = (performance.now() - wallStart) / 1000;
        const pass = elapsed < PASS_SECONDS ? PASSES[0] : PASSES[1];
        const movement = movementAtElapsed(elapsed);
        onClock?.({ elapsed, pass, movement, total: TOTAL_SECONDS });
      }, 500);
      second.onended = () => {
        if (token !== formatState.playbackToken) return;
        if (loop) {
          onStatus?.('The Twist closes the double spiral and turns it back to the original pass.');
          startPair();
        } else {
          formatState.playing = false;
          onStatus?.('The complete Elara Codex song has resolved into silence.');
        }
      };
      onStatus?.(`Playing the complete 19:12 double spiral · ${RETURN_MODES[returnMode].label}.`);
    }

    startPair();
  }

  function writeAscii(view, offset, text) {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  }

  function wavHeader(totalFrames, sampleRate, channels = 2, bitsPerSample = 16) {
    const blockAlign = channels * bitsPerSample / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = totalFrames * blockAlign;
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    writeAscii(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(view, 8, 'WAVE');
    writeAscii(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeAscii(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    return buffer;
  }

  function floatToInt16(value) {
    const sample = clamp(value, -1, 1);
    return sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767);
  }

  function encodeWav(buffers, onStatus) {
    const totalFrames = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
    const parts = [wavHeader(totalFrames, SAMPLE_RATE)];
    const chunkFrames = 65536;
    let written = 0;
    buffers.forEach((buffer, bufferIndex) => {
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let start = 0; start < buffer.length; start += chunkFrames) {
        const end = Math.min(buffer.length, start + chunkFrames);
        const pcm = new Int16Array((end - start) * 2);
        let cursor = 0;
        for (let frame = start; frame < end; frame += 1) {
          pcm[cursor++] = floatToInt16(left[frame]);
          pcm[cursor++] = floatToInt16(right[frame]);
        }
        parts.push(pcm.buffer);
        written += end - start;
        if (written % (chunkFrames * 16) === 0) onStatus?.(`Writing WAV master · ${Math.round(written / totalFrames * 100)}%`);
      }
      onStatus?.(`WAV pass ${bufferIndex + 1} of ${buffers.length} written.`);
    });
    return new Blob(parts, { type: 'audio/wav' });
  }

  async function loadLame() {
    const module = await import('https://cdn.jsdelivr.net/npm/@breezystack/lamejs@1.2.7/+esm');
    const candidate = module.default || module;
    const Mp3Encoder = candidate.Mp3Encoder || module.Mp3Encoder;
    if (!Mp3Encoder) throw new Error('The MP3 encoder did not expose Mp3Encoder.');
    return { Mp3Encoder };
  }

  async function encodeMp3(buffers, onStatus) {
    onStatus?.('Loading the MP3 encoder…');
    const { Mp3Encoder } = await loadLame();
    const encoder = new Mp3Encoder(2, SAMPLE_RATE, 192);
    const mp3 = [];
    const chunkFrames = 1152 * 12;
    const totalFrames = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
    let written = 0;

    for (const buffer of buffers) {
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let start = 0; start < buffer.length; start += chunkFrames) {
        const end = Math.min(buffer.length, start + chunkFrames);
        const left16 = new Int16Array(end - start);
        const right16 = new Int16Array(end - start);
        for (let frame = start; frame < end; frame += 1) {
          const local = frame - start;
          left16[local] = floatToInt16(left[frame]);
          right16[local] = floatToInt16(right[frame]);
        }
        const encoded = encoder.encodeBuffer(left16, right16);
        if (encoded.length) mp3.push(encoded);
        written += end - start;
        if (written % (chunkFrames * 20) === 0) {
          onStatus?.(`Encoding MP3 · ${Math.round(written / totalFrames * 100)}%`);
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
      }
    }
    const flushed = encoder.flush();
    if (flushed.length) mp3.push(flushed);
    return new Blob(mp3, { type: 'audio/mpeg' });
  }

  async function loadFfmpeg(onStatus) {
    if (formatState.ffmpegLoaded && formatState.ffmpeg) return formatState.ffmpeg;
    onStatus?.('Loading the local FFmpeg converter core. This is the heavy bit…');
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/+esm'),
      import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.2/+esm')
    ]);
    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      if (/time=|error|failed/i.test(message)) onStatus?.(`Converter: ${message}`);
    });
    const coreBase = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${coreBase}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, 'application/wasm')
    });
    formatState.ffmpeg = ffmpeg;
    formatState.ffmpegLoaded = true;
    return ffmpeg;
  }

  const TRANSCODE = Object.freeze({
    flac: { ext: 'flac', mime: 'audio/flac', args: ['-c:a', 'flac'] },
    ogg: { ext: 'ogg', mime: 'audio/ogg', args: ['-c:a', 'libvorbis', '-q:a', '6'] },
    opus: { ext: 'opus', mime: 'audio/opus', args: ['-c:a', 'libopus', '-b:a', '192k'] },
    webm: { ext: 'webm', mime: 'audio/webm', args: ['-c:a', 'libopus', '-b:a', '192k'] },
    m4a: { ext: 'm4a', mime: 'audio/mp4', args: ['-c:a', 'aac', '-b:a', '192k'] },
    aac: { ext: 'aac', mime: 'audio/aac', args: ['-c:a', 'aac', '-b:a', '192k', '-f', 'adts'] }
  });

  async function transcodeWav(wavBlob, format, onStatus) {
    const profile = TRANSCODE[format];
    if (!profile) throw new Error(`Unsupported conversion format: ${format}`);
    const ffmpeg = await loadFfmpeg(onStatus);
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const input = `elara-${stamp}.wav`;
    const output = `elara-${stamp}.${profile.ext}`;
    const bytes = new Uint8Array(await wavBlob.arrayBuffer());
    await ffmpeg.writeFile(input, bytes);
    onStatus?.(`Converting WAV to ${profile.ext.toUpperCase()}…`);
    await ffmpeg.exec(['-i', input, ...profile.args, output]);
    const data = await ffmpeg.readFile(output);
    try { await ffmpeg.deleteFile(input); } catch (error) {}
    try { await ffmpeg.deleteFile(output); } catch (error) {}
    return new Blob([data], { type: profile.mime });
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function scoreReceipt(returnMode, twistMix) {
    return {
      schema: 'elara-codex-complete-song/v1',
      version: SCORE_VERSION,
      title: 'The Elara Codex · Complete Double-Spiral Song',
      sourceSha256: source()?.source?.textSha256 || null,
      bpm: BPM,
      beatSeconds: BEAT_SECONDS,
      passSeconds: PASS_SECONDS,
      totalSeconds: TOTAL_SECONDS,
      totalDuration: '19:12',
      seamSeconds: SEAM_SECONDS,
      layers: FIVE_LAYERS.map((harmonic) => ({ harmonic, pureWaveform: 'sine', weight: HARMONIC_WEIGHT[harmonic] })),
      twistMix,
      twistLaw: 'Very quiet 108 centre floor, 369/363.5 offset pair, 369 return split, and 3-6-9 gated white noise; temporal multiplier follows each pass.',
      returnMode: RETURN_MODES[returnMode],
      passes: PASSES,
      movements: MOVEMENTS,
      chapters: chapters().map((chapter) => ({
        sequenceIndex: chapter.sequenceIndex,
        number: chapter.number,
        variant: chapter.variant,
        title: chapter.title,
        tones: selectedChapterSequence(chapter)
      }))
    };
  }

  function secondsLabel(seconds) {
    const safe = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safe / 60);
    return `${minutes}:${String(safe % 60).padStart(2, '0')}`;
  }

  function ensureFiveLayerUi() {
    try { window.MobiusTemporalProjection?.setHarmonics?.([2, 3, 4, 5]); } catch (error) {}
    document.querySelectorAll('[data-temporal-harmonic]').forEach((input) => { input.checked = true; });
  }

  function injectStyles() {
    if (document.getElementById('elara-full-song-styles')) return;
    const style = document.createElement('style');
    style.id = 'elara-full-song-styles';
    style.textContent = `
      [data-elara-full-song-card]{grid-column:span 6;min-width:0}
      [data-elara-full-song-card] .song-score{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}
      [data-elara-full-song-card] .song-movement{min-width:0;padding:.7rem;border:1px solid rgba(232,200,120,.16);border-radius:15px;background:rgba(2,6,10,.28)}
      [data-elara-full-song-card] .song-movement strong{display:block;color:var(--gold-bright,#ffe7a4)}
      [data-elara-full-song-card] progress{width:100%;height:1rem;accent-color:var(--gold,#e8c878)}
      [data-elara-full-song-card] .song-clock{font-variant-numeric:tabular-nums}
      [data-elara-full-song-card] .song-warning{padding:.65rem;border:1px solid rgba(232,200,120,.16);border-radius:14px;background:rgba(232,200,120,.06)}
      @media(max-width:900px){[data-elara-full-song-card]{grid-column:1/-1}}
      @media(max-width:680px){[data-elara-full-song-card] .song-score{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function cardMarkup() {
    return `
      <h2>The Elara Codex · Full Song</h2>
      <p>The player composes every chapter into one double spiral: the complete original 2025 song first, then the complete 2026 ×1.15 return. The Twist turns beneath both passes at a barely audible level.</p>
      <div class="stack">
        <label>Return master
          <select data-song-return>
            <option value="left-inverted">Phase-inverted left-ear return</option>
            <option value="both-inverted">Phase-inverted both-ear return</option>
          </select>
        </label>
        <label>Twist floor · <span data-song-twist-value>10%</span>
          <input data-song-twist type="range" min="0.02" max="0.15" step="0.01" value="${TWIST_MIX_DEFAULT}">
        </label>
        <label class="inline"><input data-song-loop type="checkbox" checked> Loop the double spiral; the Twist carries the ending back to Pass I</label>
        <div class="controls">
          <button class="primary" data-song-play type="button">Play complete 19:12 song</button>
          <button class="feather" data-song-stop type="button">Feather Song</button>
          <button data-song-receipt type="button">Save score receipt</button>
        </div>
        <label>Save format
          <select data-song-format>
            <option value="wav">WAV · lossless native master</option>
            <option value="mp3">MP3 · 192 kbps</option>
            <option value="flac">FLAC · lossless</option>
            <option value="ogg">OGG Vorbis</option>
            <option value="opus">Opus</option>
            <option value="webm">WebM Opus</option>
            <option value="m4a">M4A AAC</option>
            <option value="aac">AAC</option>
          </select>
        </label>
        <div class="controls">
          <button data-song-export type="button">Render and save selected master</button>
        </div>
        <progress data-song-progress max="${TOTAL_SECONDS}" value="0"></progress>
        <p class="status song-clock" data-song-status role="status" aria-live="polite">Ready. All five pure sine layers are present. Rendering and sound begin only after a tap.</p>
        <div class="song-score">
          ${MOVEMENTS.map((movement) => `
            <div class="song-movement">
              <strong>${secondsLabel(movement.start)}–${secondsLabel(movement.end)} · ${movement.title}</strong>
              <span>${movement.metre} · ${movement.cycleBeats}-beat gate · harmonics ${Math.round(movement.harmonicMix * 100)}%</span>
              <small>${movement.texture}</small>
            </div>
          `).join('')}
        </div>
        <p class="tiny song-warning">Export renders two 9:36 passes at 32 kHz stereo. WAV and MP3 are direct. FLAC, OGG, Opus, WebM, M4A, and AAC use the optional in-browser FFmpeg converter and may require substantial memory on long masters.</p>
      </div>
    `;
  }

  function injectCard() {
    const root = document.querySelector('[data-mobius-lab]');
    const grid = root?.querySelector('.grid');
    if (!grid || grid.querySelector('[data-elara-full-song-card]')) return false;
    injectStyles();
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.elaraFullSongCard = 'true';
    card.innerHTML = cardMarkup();
    const liveState = [...grid.querySelectorAll('.card h2')]
      .find((heading) => heading.textContent.trim() === 'Live state')?.closest('.card');
    if (liveState) grid.insertBefore(card, liveState);
    else grid.appendChild(card);

    const returnSelect = card.querySelector('[data-song-return]');
    const twist = card.querySelector('[data-song-twist]');
    const twistValue = card.querySelector('[data-song-twist-value]');
    const loop = card.querySelector('[data-song-loop]');
    const play = card.querySelector('[data-song-play]');
    const stop = card.querySelector('[data-song-stop]');
    const receipt = card.querySelector('[data-song-receipt]');
    const format = card.querySelector('[data-song-format]');
    const exportButton = card.querySelector('[data-song-export]');
    const progress = card.querySelector('[data-song-progress]');
    const status = card.querySelector('[data-song-status]');

    const setStatus = (text) => { status.textContent = text; };
    const options = () => ({
      returnMode: returnSelect.value,
      twistMix: Number(twist.value),
      loop: loop.checked
    });

    twist.addEventListener('input', () => {
      twistValue.textContent = `${Math.round(Number(twist.value) * 100)}%`;
    });

    play.addEventListener('click', async () => {
      if (formatState.rendering) return;
      formatState.rendering = true;
      play.disabled = true;
      exportButton.disabled = true;
      ensureFiveLayerUi();
      try {
        await playSong(options(), setStatus, ({ elapsed, pass, movement, total }) => {
          progress.value = Math.min(total, elapsed);
          setStatus(`${secondsLabel(elapsed)} / 19:12 · ${pass.title} · ${movement.title}`);
        });
      } catch (error) {
        console.error('[Elara Full Song]', error);
        setStatus(`Song error: ${error.message}`);
      } finally {
        formatState.rendering = false;
        play.disabled = false;
        exportButton.disabled = false;
      }
    });

    stop.addEventListener('click', () => {
      stopSong();
      progress.value = 0;
      setStatus('Feathered. The complete song and Twist are silent.');
    });

    receipt.addEventListener('click', () => {
      const current = options();
      const blob = new Blob([JSON.stringify(scoreReceipt(current.returnMode, current.twistMix), null, 2)], { type: 'application/json' });
      download(blob, `the-elara-codex-complete-song-${RETURN_MODES[current.returnMode].fileSlug}.json`);
      setStatus('The complete score receipt was saved.');
    });

    exportButton.addEventListener('click', async () => {
      if (formatState.rendering) return;
      formatState.rendering = true;
      play.disabled = true;
      exportButton.disabled = true;
      ensureFiveLayerUi();
      const current = options();
      const selectedFormat = format.value;
      try {
        const pair = await renderPair(current.returnMode, current.twistMix, setStatus);
        let blob;
        if (selectedFormat === 'wav') {
          blob = encodeWav(pair, setStatus);
        } else if (selectedFormat === 'mp3') {
          blob = await encodeMp3(pair, setStatus);
        } else {
          const wav = encodeWav(pair, setStatus);
          blob = await transcodeWav(wav, selectedFormat, setStatus);
        }
        const profile = RETURN_MODES[current.returnMode];
        download(blob, `the-elara-codex-complete-double-spiral-${profile.fileSlug}.${selectedFormat}`);
        setStatus(`${selectedFormat.toUpperCase()} master saved · ${profile.label}.`);
      } catch (error) {
        console.error('[Elara Full Song Export]', error);
        setStatus(`Export error: ${error.message}`);
      } finally {
        formatState.rendering = false;
        play.disabled = false;
        exportButton.disabled = false;
      }
    });

    ensureFiveLayerUi();
    return true;
  }

  function boot() {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const ready = window.ElaraCodexSource?.curationVersion === '0.1.0';
      if (ready && injectCard()) window.clearInterval(timer);
      if (attempts > 250) window.clearInterval(timer);
    }, 40);
  }

  window.ElaraCodexFullSong = {
    version: SCORE_VERSION,
    bpm: BPM,
    beatSeconds: BEAT_SECONDS,
    passSeconds: PASS_SECONDS,
    totalSeconds: TOTAL_SECONDS,
    movements: MOVEMENTS,
    passes: PASSES,
    fiveLayers: FIVE_LAYERS,
    returnModes: RETURN_MODES,
    renderPass,
    renderPair,
    playSong,
    stopSong,
    encodeWav,
    encodeMp3,
    scoreReceipt
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
