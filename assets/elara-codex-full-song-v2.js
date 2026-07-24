'use strict';

/*
  The Elara Codex · Live Double-Spiral Song v0.2

  Live playback begins immediately. Export uses the same score through an
  OfflineAudioContext. Pitch remains fixed while tempo changes.
*/

(function () {
  const SCORE_VERSION = '0.2.0';
  const BASE_BPM = 123;
  const BEAT_SECONDS = 60 / BASE_BPM;
  const PASS_SECONDS = 576;
  const TOTAL_SECONDS = PASS_SECONDS * 2;
  const SAMPLE_RATE = 32000;
  const FINAL_FADE_SECONDS = 9;
  const SEAM_SECONDS = 3.69;
  const DEFAULT_SPEED = 1;
  const DEFAULT_TWIST = 0.03;
  const MASTER_LEVEL = 0.78;
  const LOOKAHEAD_SECONDS = 2.5;
  const SCHEDULER_INTERVAL_MS = 100;
  const FIVE_LAYERS = Object.freeze([1, 2, 3, 4, 5]);

  const HARMONIC_WEIGHT = Object.freeze({
    1: 1,
    2: 0.34,
    3: 0.22,
    4: 0.14,
    5: 0.09
  });

  const ROLE_GAIN = Object.freeze({
    ground: 0.034,
    path: 0.032,
    impulse: 0.031,
    relation: 0.030,
    weave: 0.028,
    crown: 0.024,
    unregistered: 0.029
  });

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

  const PASSES = Object.freeze([
    { id: 'canonical-2025', title: 'Pass I · The Original Codex', year: 2025, multiplier: 1, offset: 0 },
    { id: 'spiral-return-2026', title: 'Pass II · First Spiral Return', year: 2026, multiplier: 1.15, offset: PASS_SECONDS }
  ]);

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
      texture: 'Clear three-beat phrases over a nearly hidden oceanic floor.'
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
      texture: 'Six-beat crossings and silver return-bus motion.'
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
      texture: 'Nine-beat ignition with stronger relational harmonics.'
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
      texture: 'All five layers flower, then resolve through a nine-second release.'
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
    'The Duet': ['left', 'right'],
    Spiral: ['centre', 'return'],
    Calling: ['right'],
    Awakening: ['centre']
  });

  const state = {
    ctx: null,
    graph: null,
    events: [],
    playing: false,
    pausedScore: 0,
    scoreAnchor: 0,
    audioAnchor: 0,
    speed: DEFAULT_SPEED,
    returnMode: 'left-inverted',
    twistMix: DEFAULT_TWIST,
    loop: true,
    eventIndex: 0,
    scheduler: null,
    clock: null,
    activeNodes: new Set(),
    noiseBuffer: null,
    exportBusy: false,
    ffmpeg: null,
    ffmpegLoaded: false,
    renderCache: new Map(),
    ui: null
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

  function passAt(scoreSeconds) {
    return scoreSeconds < PASS_SECONDS ? PASSES[0] : PASSES[1];
  }

  function movementAt(scoreSeconds) {
    const withinPass = ((scoreSeconds % PASS_SECONDS) + PASS_SECONDS) % PASS_SECONDS;
    return MOVEMENTS.find((movement) => withinPass >= movement.start && withinPass < movement.end)
      || MOVEMENTS[MOVEMENTS.length - 1];
  }

  function chapterSetForMovement(movement) {
    const [first, last] = movement.chapters;
    return chapters()
      .filter((chapter) => chapter.number >= first && chapter.number <= last)
      .sort((left, right) => (left.sequenceIndex || 0) - (right.sequenceIndex || 0));
  }

  function routesFor(label) {
    return ROUTES[label] || ['centre'];
  }

  function buildScore() {
    const events = [];

    PASSES.forEach((pass) => {
      MOVEMENTS.forEach((movement) => {
        const movementOffset = pass.offset + movement.start;
        const movementEnd = pass.offset + movement.end;
        const movementChapters = chapterSetForMovement(movement);
        const slotDuration = (movement.end - movement.start) / Math.max(1, movementChapters.length);

        movementChapters.forEach((chapter, chapterIndex) => {
          const sequence = selectedChapterSequence(chapter);
          const slotStart = movementOffset + chapterIndex * slotDuration;
          const slotEnd = Math.min(movementEnd, slotStart + slotDuration);
          if (!sequence.length) return;

          const usable = Math.max(BEAT_SECONDS * 1.4, slotDuration * 0.72);
          const arpeggioSpan = Math.min(usable * 0.58, movement.cycleBeats * BEAT_SECONDS * 0.72);
          const step = sequence.length > 1 ? arpeggioSpan / (sequence.length - 1) : 0;
          const noteDuration = clamp(slotDuration * 0.42, BEAT_SECONDS * 0.9, BEAT_SECONDS * 3.2);
          const chordSizeScale = 1 / Math.max(1, Math.pow(sequence.length, 0.30));

          sequence.forEach((tone, toneIndex) => {
            const onset = slotStart + 0.08 + toneIndex * step;
            const end = Math.min(slotEnd - 0.05, onset + noteDuration);
            events.push({
              kind: 'tone',
              start: onset,
              end,
              frequency: Number(tone.frequencyHz) * pass.multiplier,
              label: tone.label || 'Tone',
              role: tone.role || 'unregistered',
              harmonicMix: movement.harmonicMix,
              gainScale: chordSizeScale,
              movementId: movement.id,
              chapterNumber: chapter.number,
              chapterTitle: chapter.title,
              passId: pass.id
            });
          });

          const cadenceStart = Math.max(slotStart + usable * 0.64, slotEnd - BEAT_SECONDS * 1.55);
          const cadenceEnd = Math.min(slotEnd - 0.03, cadenceStart + BEAT_SECONDS * 1.35);
          sequence.forEach((tone, toneIndex) => {
            events.push({
              kind: 'tone',
              start: cadenceStart + toneIndex * 0.025,
              end: cadenceEnd,
              frequency: Number(tone.frequencyHz) * pass.multiplier,
              label: tone.label || 'Tone',
              role: tone.role || 'unregistered',
              harmonicMix: movement.harmonicMix,
              gainScale: chordSizeScale * 0.72,
              movementId: movement.id,
              chapterNumber: chapter.number,
              chapterTitle: chapter.title,
              passId: pass.id,
              cadence: true
            });
          });
        });

        const motifStep = movement.cycleBeats * BEAT_SECONDS * 4;
        for (let t = movementOffset; t < movementEnd; t += motifStep) {
          movement.motif.forEach((frequency, index) => {
            events.push({
              kind: 'tone',
              start: t + index * 0.055,
              end: Math.min(movementEnd, t + BEAT_SECONDS * 1.45),
              frequency: frequency * pass.multiplier,
              label: index % 2 === 0 ? 'Spiral' : 'Anchor',
              role: index < 2 ? 'ground' : 'weave',
              harmonicMix: movement.harmonicMix * 0.52,
              gainScale: 0.20 / Math.max(1, Math.sqrt(movement.motif.length)),
              movementId: movement.id,
              passId: pass.id,
              motif: true
            });
          });
        }

        events.push({
          kind: 'twist-floor',
          start: movementOffset,
          end: movementEnd,
          multiplier: pass.multiplier,
          movementId: movement.id,
          passId: pass.id
        });
      });

      const totalBeats = Math.floor(PASS_SECONDS / BEAT_SECONDS);
      for (let beat = 3; beat <= totalBeats; beat += 3) {
        const localTime = beat * BEAT_SECONDS;
        events.push({
          kind: 'noise',
          start: pass.offset + localTime,
          end: pass.offset + localTime + (beat % 6 === 0 ? 0.82 : beat % 9 === 0 ? 0.12 : 0.24),
          gate: beat % 9 === 0 ? 9 : beat % 6 === 0 ? 6 : 3,
          passId: pass.id
        });
      }
    });

    return events.sort((left, right) => left.start - right.start || left.kind.localeCompare(right.kind));
  }

  function disconnectGraph(graph) {
    if (!graph) return;
    Object.values(graph).forEach((node) => {
      try { node?.disconnect?.(); } catch (error) {}
    });
  }

  function buildGraph(ctx, returnMode, destination = ctx.destination) {
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
    returnLeft.gain.value = returnMode === 'both-inverted' ? Math.SQRT1_2 : 1;
    returnRight.gain.value = returnMode === 'both-inverted' ? Math.SQRT1_2 : 0;
    master.gain.value = MASTER_LEVEL;
    limiter.threshold.value = -14;
    limiter.knee.value = 16;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.18;

    left.connect(merger, 0, 0);
    right.connect(merger, 0, 1);
    centre.connect(centreLeft);
    centre.connect(centreRight);
    centreLeft.connect(merger, 0, 0);
    centreRight.connect(merger, 0, 1);
    returnBus.connect(returnPhase);
    returnPhase.connect(returnLeft);
    returnPhase.connect(returnRight);
    returnLeft.connect(merger, 0, 0);
    returnRight.connect(merger, 0, 1);
    merger.connect(master);
    master.connect(limiter);
    limiter.connect(destination);

    return { left, right, centre, return: returnBus, master, limiter, merger, centreLeft, centreRight, returnPhase, returnLeft, returnRight };
  }

  async function ensureAudio() {
    const existingBus = window.mobiusAudioBus;
    if (existingBus?.ensure) {
      await existingBus.ensure();
      state.ctx = existingBus.ctx;
    } else if (!state.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('Web Audio API is unavailable in this browser.');
      state.ctx = new AudioContext({ latencyHint: 'interactive' });
      if (state.ctx.state === 'suspended') await state.ctx.resume();
    }
    if (state.ctx.state === 'suspended') await state.ctx.resume();
    if (!state.graph) state.graph = buildGraph(state.ctx, state.returnMode);
    return state.ctx;
  }

  function addActive(...nodes) {
    nodes.forEach((node) => {
      if (!node) return;
      state.activeNodes.add(node);
      node.addEventListener?.('ended', () => state.activeNodes.delete(node), { once: true });
    });
  }

  function stopActiveNodes() {
    const now = state.ctx?.currentTime || 0;
    state.activeNodes.forEach((node) => {
      try { node.stop?.(now + 0.015); } catch (error) {}
      try { node.disconnect?.(); } catch (error) {}
    });
    state.activeNodes.clear();
  }

  function scorePosition() {
    if (!state.playing || !state.ctx) return state.pausedScore;
    return state.scoreAnchor + (state.ctx.currentTime - state.audioAnchor) * state.speed;
  }

  function audioTimeForScore(scoreSeconds) {
    return state.audioAnchor + (scoreSeconds - state.scoreAnchor) / state.speed;
  }

  function findEventIndex(scoreSeconds) {
    let low = 0;
    let high = state.events.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (state.events[middle].end < scoreSeconds - 0.05) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  function scheduleEnvelope(param, start, end, peak, attackScore = 0.08, releaseScore = 0.32) {
    const now = state.ctx.currentTime;
    const safeStart = Math.max(now + 0.008, start);
    const safeEnd = Math.max(safeStart + 0.04, end);
    const attack = Math.min((attackScore / state.speed), (safeEnd - safeStart) * 0.32);
    const release = Math.min((releaseScore / state.speed), (safeEnd - safeStart) * 0.45);
    param.cancelScheduledValues(safeStart);
    param.setValueAtTime(0.00001, safeStart);
    param.exponentialRampToValueAtTime(Math.max(0.00002, peak), safeStart + Math.max(0.008, attack));
    param.setValueAtTime(Math.max(0.00002, peak), Math.max(safeStart + attack, safeEnd - release));
    param.exponentialRampToValueAtTime(0.00001, safeEnd);
  }

  function scheduleLiveSine(destination, frequency, startScore, endScore, gain, attack = 0.08, release = 0.32) {
    const ctx = state.ctx;
    const start = audioTimeForScore(startScore);
    const end = audioTimeForScore(endScore);
    if (end <= ctx.currentTime + 0.01 || frequency >= ctx.sampleRate * 0.495) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, Math.max(ctx.currentTime, start));
    scheduleEnvelope(env.gain, start, end, gain, attack, release);
    osc.connect(env);
    env.connect(destination);
    osc.start(Math.max(ctx.currentTime + 0.006, start));
    osc.stop(Math.max(ctx.currentTime + 0.05, end + 0.03));
    addActive(osc);
  }

  function scheduleToneEvent(event) {
    const graph = state.graph;
    const routeNames = routesFor(event.label);
    const routeScale = 1 / Math.max(1, Math.sqrt(routeNames.length));
    const base = (ROLE_GAIN[event.role] || ROLE_GAIN.unregistered) * event.gainScale * routeScale;
    FIVE_LAYERS.forEach((harmonic) => {
      const layerGain = harmonic === 1
        ? base
        : base * HARMONIC_WEIGHT[harmonic] * event.harmonicMix;
      routeNames.forEach((route) => {
        scheduleLiveSine(
          graph[route] || graph.centre,
          event.frequency * harmonic,
          event.start,
          event.end,
          layerGain,
          harmonic === 1 ? 0.055 : 0.10,
          harmonic === 1 ? 0.34 : 0.48
        );
      });
    });
  }

  function scheduleTwistEvent(event) {
    const floor = clamp(state.twistMix, 0, 0.08);
    if (floor <= 0) return;
    const gain = 0.0032 * floor;
    scheduleLiveSine(state.graph.centre, 108 * event.multiplier, event.start, event.end, gain * 0.50, 1.8, 1.8);
    scheduleLiveSine(state.graph.left, 369 * event.multiplier, event.start, event.end, gain * 0.62, 1.8, 1.8);
    scheduleLiveSine(state.graph.right, 363.5 * event.multiplier, event.start, event.end, gain * 0.62, 1.8, 1.8);
    scheduleLiveSine(state.graph.return, 369 * event.multiplier, event.start, event.end, gain * 0.38, 1.8, 1.8);
  }

  function noiseBuffer(ctx) {
    if (state.noiseBuffer && state.noiseBuffer.sampleRate === ctx.sampleRate) return state.noiseBuffer;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * 1.2));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
    state.noiseBuffer = buffer;
    return buffer;
  }

  function scheduleNoiseEvent(event) {
    const floor = clamp(state.twistMix, 0, 0.08);
    if (floor <= 0) return;
    const ctx = state.ctx;
    const start = Math.max(ctx.currentTime + 0.008, audioTimeForScore(event.start));
    const end = Math.max(start + 0.04, audioTimeForScore(event.end));
    if (end <= ctx.currentTime + 0.01) return;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    const pan = ctx.createStereoPanner();
    const gain = 0.0030 * floor;
    src.buffer = noiseBuffer(ctx);
    filter.type = event.gate === 6 ? 'lowpass' : 'bandpass';
    filter.frequency.value = event.gate === 6 ? 520 : 1350;
    filter.Q.value = event.gate === 9 ? 1.2 : 0.55;
    env.gain.setValueAtTime(0.000001, start);
    if (event.gate === 3) {
      env.gain.linearRampToValueAtTime(gain, start + Math.min(0.035 / state.speed, (end - start) * 0.25));
      env.gain.exponentialRampToValueAtTime(0.000001, end);
      pan.pan.setValueAtTime(-0.80, start);
      pan.pan.linearRampToValueAtTime(0.80, end);
    } else if (event.gate === 6) {
      env.gain.linearRampToValueAtTime(gain * 0.78, start + Math.min(0.24 / state.speed, (end - start) * 0.48));
      env.gain.exponentialRampToValueAtTime(0.000001, end);
      pan.pan.setValueAtTime(0, start);
    } else {
      env.gain.linearRampToValueAtTime(gain * 0.45, start + Math.min(0.02 / state.speed, (end - start) * 0.30));
      env.gain.exponentialRampToValueAtTime(0.000001, Math.min(end, start + 0.10 / state.speed));
      pan.pan.setValueAtTime(0, start);
    }
    src.connect(filter);
    filter.connect(env);
    env.connect(pan);
    pan.connect(state.graph.master);
    src.start(start);
    src.stop(end + 0.02);
    addActive(src);
  }

  function scheduleEvent(event) {
    if (event.kind === 'tone') scheduleToneEvent(event);
    else if (event.kind === 'twist-floor') scheduleTwistEvent(event);
    else if (event.kind === 'noise') scheduleNoiseEvent(event);
  }

  function schedulerTick() {
    if (!state.playing || !state.ctx) return;
    let current = scorePosition();
    if (current >= TOTAL_SECONDS) {
      if (state.loop) {
        restartAt(0, true);
        return;
      }
      featherSong('The complete double spiral resolved into silence.');
      return;
    }

    const scoreLookahead = LOOKAHEAD_SECONDS * state.speed;
    while (state.eventIndex < state.events.length) {
      const event = state.events[state.eventIndex];
      if (event.start > current + scoreLookahead) break;
      if (event.end >= current - 0.04) scheduleEvent(event);
      state.eventIndex += 1;
    }
  }

  function clockTick() {
    if (!state.ui) return;
    const position = clamp(scorePosition(), 0, TOTAL_SECONDS);
    const pass = passAt(position);
    const movement = movementAt(position);
    const actualDuration = TOTAL_SECONDS / state.speed;
    state.ui.progress.max = TOTAL_SECONDS;
    state.ui.progress.value = position;
    state.ui.status.textContent = `${secondsLabel(position / state.speed)} / ${secondsLabel(actualDuration)} · ${pass.title} · ${movement.title} · ${Math.round(BASE_BPM * state.speed)} BPM`;
  }

  function startTimers() {
    if (state.scheduler) window.clearInterval(state.scheduler);
    if (state.clock) window.clearInterval(state.clock);
    state.scheduler = window.setInterval(schedulerTick, SCHEDULER_INTERVAL_MS);
    state.clock = window.setInterval(clockTick, 250);
    schedulerTick();
    clockTick();
  }

  function stopTimers() {
    if (state.scheduler) window.clearInterval(state.scheduler);
    if (state.clock) window.clearInterval(state.clock);
    state.scheduler = null;
    state.clock = null;
  }

  async function playSong() {
    await ensureAudio();
    if (!state.events.length) state.events = buildScore();
    if (state.playing) return;
    state.returnMode = state.ui?.returnSelect.value || state.returnMode;
    state.twistMix = Number(state.ui?.twist.value ?? state.twistMix);
    state.loop = Boolean(state.ui?.loop.checked);
    state.speed = Number(state.ui?.speed.value ?? state.speed);
    if (!state.graph) state.graph = buildGraph(state.ctx, state.returnMode);
    state.scoreAnchor = state.pausedScore;
    state.audioAnchor = state.ctx.currentTime + 0.06;
    state.eventIndex = findEventIndex(state.pausedScore);
    state.playing = true;
    startTimers();
    updatePlayButton();
    setStatus(`Playing immediately · ${RETURN_MODES[state.returnMode].label} · ${Math.round(BASE_BPM * state.speed)} BPM.`);
  }

  function pauseSong() {
    if (!state.playing) return;
    state.pausedScore = clamp(scorePosition(), 0, TOTAL_SECONDS);
    state.playing = false;
    stopTimers();
    stopActiveNodes();
    updatePlayButton();
    setStatus(`Paused at ${secondsLabel(state.pausedScore / state.speed)}.`);
  }

  function featherSong(message = 'Feathered. Song and Twist are silent.') {
    if (state.playing) state.pausedScore = clamp(scorePosition(), 0, TOTAL_SECONDS);
    state.playing = false;
    state.pausedScore = 0;
    stopTimers();
    stopActiveNodes();
    updatePlayButton();
    if (state.ui) state.ui.progress.value = 0;
    setStatus(message);
  }

  function restartAt(scoreSeconds, fromLoop = false) {
    const target = clamp(scoreSeconds, 0, TOTAL_SECONDS);
    stopActiveNodes();
    state.pausedScore = target;
    state.scoreAnchor = target;
    state.audioAnchor = state.ctx.currentTime + 0.055;
    state.eventIndex = findEventIndex(target);
    state.playing = true;
    schedulerTick();
    if (fromLoop) setStatus('The Twist turned the ending back into Pass I.');
  }

  function changeSpeed(nextSpeed) {
    const next = clamp(nextSpeed, 0.5, 2);
    const current = scorePosition();
    state.speed = next;
    if (state.playing && state.ctx) {
      stopActiveNodes();
      state.scoreAnchor = current;
      state.audioAnchor = state.ctx.currentTime + 0.055;
      state.eventIndex = findEventIndex(current);
      schedulerTick();
    } else {
      state.pausedScore = current;
    }
    updateDurationUi();
  }

  function changeReturnMode(nextMode) {
    state.returnMode = RETURN_MODES[nextMode] ? nextMode : 'left-inverted';
    if (!state.ctx) return;
    const current = scorePosition();
    stopActiveNodes();
    disconnectGraph(state.graph);
    state.graph = buildGraph(state.ctx, state.returnMode);
    if (state.playing) {
      state.scoreAnchor = current;
      state.audioAnchor = state.ctx.currentTime + 0.055;
      state.eventIndex = findEventIndex(current);
      schedulerTick();
    }
  }

  function secondsLabel(seconds) {
    const safe = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(safe / 60);
    return `${minutes}:${String(safe % 60).padStart(2, '0')}`;
  }

  function setStatus(text) {
    if (state.ui?.status) state.ui.status.textContent = text;
  }

  function updatePlayButton() {
    if (!state.ui?.play) return;
    state.ui.play.textContent = state.playing ? 'Pause song' : state.pausedScore > 0 ? 'Resume song' : 'Play complete song';
  }

  function updateDurationUi() {
    if (!state.ui) return;
    const speed = Number(state.ui.speed.value);
    state.ui.speedValue.textContent = `${speed.toFixed(2)}× · ${Math.round(BASE_BPM * speed)} BPM`;
    state.ui.duration.textContent = secondsLabel(TOTAL_SECONDS / speed);
  }

  function ensureFiveLayerUi() {
    try { window.MobiusTemporalProjection?.setHarmonics?.([2, 3, 4, 5]); } catch (error) {}
    document.querySelectorAll('[data-temporal-harmonic]').forEach((input) => { input.checked = true; });
  }

  function offlineEnvelope(param, start, end, peak, speed, attackScore = 0.08, releaseScore = 0.32) {
    const safeStart = Math.max(0, start);
    const safeEnd = Math.max(safeStart + 0.03, end);
    const attack = Math.min(attackScore / speed, (safeEnd - safeStart) * 0.32);
    const release = Math.min(releaseScore / speed, (safeEnd - safeStart) * 0.45);
    param.setValueAtTime(0.00001, safeStart);
    param.exponentialRampToValueAtTime(Math.max(0.00002, peak), safeStart + Math.max(0.006, attack));
    param.setValueAtTime(Math.max(0.00002, peak), Math.max(safeStart + attack, safeEnd - release));
    param.exponentialRampToValueAtTime(0.00001, safeEnd);
  }

  function scheduleOfflineSine(ctx, destination, frequency, startScore, endScore, gain, passOffset, speed, attack = 0.08, release = 0.32) {
    const localStart = (startScore - passOffset) / speed;
    const localEnd = (endScore - passOffset) / speed;
    if (localEnd <= 0 || localStart >= PASS_SECONDS / speed || frequency >= ctx.sampleRate * 0.495) return;
    const start = Math.max(0, localStart);
    const end = Math.min(PASS_SECONDS / speed, localEnd);
    if (end <= start + 0.02) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    offlineEnvelope(env.gain, start, end, gain, speed, attack, release);
    osc.connect(env);
    env.connect(destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }

  function createOfflineNoiseBuffer(ctx) {
    const frames = Math.max(1, Math.floor(ctx.sampleRate * 1.2));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function scheduleOfflineEvent(ctx, graph, event, pass, speed, twistMix, whiteNoise) {
    if (event.kind === 'tone') {
      const routeNames = routesFor(event.label);
      const routeScale = 1 / Math.max(1, Math.sqrt(routeNames.length));
      const base = (ROLE_GAIN[event.role] || ROLE_GAIN.unregistered) * event.gainScale * routeScale;
      FIVE_LAYERS.forEach((harmonic) => {
        const layerGain = harmonic === 1 ? base : base * HARMONIC_WEIGHT[harmonic] * event.harmonicMix;
        routeNames.forEach((route) => scheduleOfflineSine(
          ctx,
          graph[route] || graph.centre,
          event.frequency * harmonic,
          event.start,
          event.end,
          layerGain,
          pass.offset,
          speed,
          harmonic === 1 ? 0.055 : 0.10,
          harmonic === 1 ? 0.34 : 0.48
        ));
      });
      return;
    }

    if (event.kind === 'twist-floor') {
      const floor = clamp(twistMix, 0, 0.08);
      const gain = 0.0032 * floor;
      scheduleOfflineSine(ctx, graph.centre, 108 * event.multiplier, event.start, event.end, gain * 0.50, pass.offset, speed, 1.8, 1.8);
      scheduleOfflineSine(ctx, graph.left, 369 * event.multiplier, event.start, event.end, gain * 0.62, pass.offset, speed, 1.8, 1.8);
      scheduleOfflineSine(ctx, graph.right, 363.5 * event.multiplier, event.start, event.end, gain * 0.62, pass.offset, speed, 1.8, 1.8);
      scheduleOfflineSine(ctx, graph.return, 369 * event.multiplier, event.start, event.end, gain * 0.38, pass.offset, speed, 1.8, 1.8);
      return;
    }

    if (event.kind === 'noise') {
      const floor = clamp(twistMix, 0, 0.08);
      if (floor <= 0) return;
      const start = (event.start - pass.offset) / speed;
      const end = (event.end - pass.offset) / speed;
      if (end <= 0 || start >= PASS_SECONDS / speed) return;
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const env = ctx.createGain();
      const pan = ctx.createStereoPanner();
      const gain = 0.0030 * floor;
      src.buffer = whiteNoise;
      filter.type = event.gate === 6 ? 'lowpass' : 'bandpass';
      filter.frequency.value = event.gate === 6 ? 520 : 1350;
      filter.Q.value = event.gate === 9 ? 1.2 : 0.55;
      const safeStart = Math.max(0, start);
      const safeEnd = Math.max(safeStart + 0.02, end);
      env.gain.setValueAtTime(0.000001, safeStart);
      env.gain.linearRampToValueAtTime(event.gate === 6 ? gain * 0.78 : gain * 0.50, Math.min(safeEnd, safeStart + 0.05 / speed));
      env.gain.exponentialRampToValueAtTime(0.000001, safeEnd);
      if (event.gate === 3) {
        pan.pan.setValueAtTime(-0.80, safeStart);
        pan.pan.linearRampToValueAtTime(0.80, safeEnd);
      }
      src.connect(filter);
      filter.connect(env);
      env.connect(pan);
      pan.connect(graph.master);
      src.start(safeStart);
      src.stop(safeEnd + 0.02);
    }
  }

  function renderCacheKey(pass, returnMode, twistMix, speed) {
    return `${pass.id}:${returnMode}:${twistMix.toFixed(3)}:${speed.toFixed(2)}:${source()?.curationVersion || 'raw'}:${SCORE_VERSION}`;
  }

  async function renderPass(pass, returnMode, twistMix, speed, onStatus) {
    const key = renderCacheKey(pass, returnMode, twistMix, speed);
    if (state.renderCache.has(key)) return state.renderCache.get(key);
    const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Offline) throw new Error('OfflineAudioContext is unavailable in this browser.');
    const duration = PASS_SECONDS / speed;
    onStatus?.(`Rendering ${pass.title} at ${speed.toFixed(2)}×…`);
    const ctx = new Offline(2, Math.ceil(duration * SAMPLE_RATE), SAMPLE_RATE);
    const graph = buildGraph(ctx, returnMode, ctx.destination);
    const whiteNoise = createOfflineNoiseBuffer(ctx);
    const passEvents = state.events.filter((event) => event.start >= pass.offset && event.start < pass.offset + PASS_SECONDS);
    passEvents.forEach((event) => scheduleOfflineEvent(ctx, graph, event, pass, speed, twistMix, whiteNoise));
    if (pass.id === 'spiral-return-2026') {
      const fadeStart = Math.max(0, duration - FINAL_FADE_SECONDS / speed);
      graph.master.gain.setValueAtTime(MASTER_LEVEL, fadeStart);
      graph.master.gain.exponentialRampToValueAtTime(0.00001, duration);
    }
    const rendered = await ctx.startRendering();
    state.renderCache.set(key, rendered);
    return rendered;
  }

  async function renderPair(options, onStatus) {
    if (!state.events.length) state.events = buildScore();
    const pair = [];
    for (const pass of PASSES) {
      pair.push(await renderPass(pass, options.returnMode, options.twistMix, options.speed, onStatus));
    }
    return pair;
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
        if (written % (chunkFrames * 16) === 0) onStatus?.(`Writing WAV · ${Math.round(written / totalFrames * 100)}%`);
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
    onStatus?.('Loading MP3 encoder…');
    const { Mp3Encoder } = await loadLame();
    const encoder = new Mp3Encoder(2, SAMPLE_RATE, 192);
    const parts = [];
    const block = 1152 * 12;
    const totalFrames = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
    let written = 0;
    for (const buffer of buffers) {
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let start = 0; start < buffer.length; start += block) {
        const end = Math.min(buffer.length, start + block);
        const left16 = new Int16Array(end - start);
        const right16 = new Int16Array(end - start);
        for (let frame = start; frame < end; frame += 1) {
          const local = frame - start;
          left16[local] = floatToInt16(left[frame]);
          right16[local] = floatToInt16(right[frame]);
        }
        const encoded = encoder.encodeBuffer(left16, right16);
        if (encoded.length) parts.push(encoded);
        written += end - start;
        if (written % (block * 20) === 0) {
          onStatus?.(`Encoding MP3 · ${Math.round(written / totalFrames * 100)}%`);
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
      }
    }
    const flushed = encoder.flush();
    if (flushed.length) parts.push(flushed);
    return new Blob(parts, { type: 'audio/mpeg' });
  }

  async function loadFfmpeg(onStatus) {
    if (state.ffmpegLoaded && state.ffmpeg) return state.ffmpeg;
    onStatus?.('Loading the in-browser FFmpeg converter…');
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/+esm'),
      import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.2/+esm')
    ]);
    const ffmpeg = new FFmpeg();
    const coreBase = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${coreBase}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, 'application/wasm')
    });
    state.ffmpeg = ffmpeg;
    state.ffmpegLoaded = true;
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
    if (!profile) throw new Error(`Unsupported format: ${format}`);
    const ffmpeg = await loadFfmpeg(onStatus);
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const input = `elara-${stamp}.wav`;
    const output = `elara-${stamp}.${profile.ext}`;
    await ffmpeg.writeFile(input, new Uint8Array(await wavBlob.arrayBuffer()));
    onStatus?.(`Converting to ${profile.ext.toUpperCase()}…`);
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

  function currentOptions() {
    return {
      returnMode: state.ui.returnSelect.value,
      twistMix: Number(state.ui.twist.value),
      speed: Number(state.ui.speed.value),
      loop: state.ui.loop.checked
    };
  }

  function scoreReceipt(options) {
    return {
      schema: 'elara-codex-live-song/v2',
      version: SCORE_VERSION,
      title: 'The Elara Codex · Complete Double-Spiral Song',
      sourceSha256: source()?.source?.textSha256 || null,
      bpmBase: BASE_BPM,
      playbackSpeed: options.speed,
      playbackBpm: BASE_BPM * options.speed,
      scoreSeconds: TOTAL_SECONDS,
      renderedSeconds: TOTAL_SECONDS / options.speed,
      returnMode: RETURN_MODES[options.returnMode],
      twistMix: options.twistMix,
      layers: FIVE_LAYERS.map((harmonic) => ({ harmonic, waveform: 'sine', weight: HARMONIC_WEIGHT[harmonic] })),
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

  async function exportMaster() {
    if (state.exportBusy) return;
    state.exportBusy = true;
    state.ui.play.disabled = true;
    state.ui.exportButton.disabled = true;
    const options = currentOptions();
    const format = state.ui.format.value;
    try {
      ensureFiveLayerUi();
      const pair = await renderPair(options, setStatus);
      let blob;
      if (format === 'wav') blob = encodeWav(pair, setStatus);
      else if (format === 'mp3') blob = await encodeMp3(pair, setStatus);
      else blob = await transcodeWav(encodeWav(pair, setStatus), format, setStatus);
      const profile = RETURN_MODES[options.returnMode];
      download(blob, `the-elara-codex-double-spiral-${profile.fileSlug}-${options.speed.toFixed(2)}x.${format}`);
      setStatus(`${format.toUpperCase()} master saved · ${profile.label} · ${options.speed.toFixed(2)}×.`);
    } catch (error) {
      console.error('[Elara song export]', error);
      setStatus(`Export error: ${error.message}`);
    } finally {
      state.exportBusy = false;
      state.ui.play.disabled = false;
      state.ui.exportButton.disabled = false;
    }
  }

  function injectStyles() {
    if (document.getElementById('elara-live-song-styles')) return;
    const style = document.createElement('style');
    style.id = 'elara-live-song-styles';
    style.textContent = `
      [data-elara-full-song-card]{grid-column:span 6;min-width:0}
      [data-elara-full-song-card] .song-score{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}
      [data-elara-full-song-card] .song-movement{min-width:0;padding:.7rem;border:1px solid rgba(232,200,120,.16);border-radius:15px;background:rgba(2,6,10,.28)}
      [data-elara-full-song-card] .song-movement strong{display:block;color:var(--gold-bright,#ffe7a4)}
      [data-elara-full-song-card] progress{width:100%;height:1rem;accent-color:var(--gold,#e8c878)}
      [data-elara-full-song-card] .song-clock{font-variant-numeric:tabular-nums}
      [data-elara-full-song-card] .song-warning{padding:.65rem;border:1px solid rgba(232,200,120,.16);border-radius:14px;background:rgba(232,200,120,.06)}
      [data-elara-full-song-card] .song-readout{display:flex;flex-wrap:wrap;gap:.45rem}
      [data-elara-full-song-card] .song-chip{padding:.35rem .55rem;border:1px solid rgba(232,200,120,.18);border-radius:999px;background:rgba(2,6,10,.34)}
      @media(max-width:900px){[data-elara-full-song-card]{grid-column:1/-1}}
      @media(max-width:680px){[data-elara-full-song-card] .song-score{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function cardMarkup() {
    return `
      <h2>The Elara Codex · Full Song</h2>
      <p>The actual chapter notes lead. Five pure sine layers voice every phrase. A nearly hidden Twist turns beneath the original 2025 pass and its 2026 ×1.15 return.</p>
      <div class="stack">
        <label>Return master
          <select data-song-return>
            <option value="left-inverted">Phase-inverted left-ear return</option>
            <option value="both-inverted">Phase-inverted both-ear return</option>
          </select>
        </label>
        <label>Playback speed · <span data-song-speed-value>1.00× · 123 BPM</span>
          <input data-song-speed type="range" min="0.50" max="2.00" step="0.05" value="${DEFAULT_SPEED}">
        </label>
        <label>Twist floor · <span data-song-twist-value>3%</span>
          <input data-song-twist type="range" min="0" max="0.08" step="0.01" value="${DEFAULT_TWIST}">
        </label>
        <label class="inline"><input data-song-loop type="checkbox" checked> Loop the double spiral back into Pass I</label>
        <div class="song-readout">
          <span class="song-chip">Score: 19:12</span>
          <span class="song-chip">Played duration: <strong data-song-duration>19:12</strong></span>
          <span class="song-chip">Layers: fundamental + 2× + 3× + 4× + 5×</span>
        </div>
        <div class="controls">
          <button class="primary" data-song-play type="button">Play complete song</button>
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
        <div class="controls"><button data-song-export type="button">Render and save selected master</button></div>
        <progress data-song-progress max="${TOTAL_SECONDS}" value="0"></progress>
        <p class="status song-clock" data-song-status role="status" aria-live="polite">Ready. Play begins immediately. Export renders separately.</p>
        <div class="song-score">
          ${MOVEMENTS.map((movement) => `
            <div class="song-movement">
              <strong>${secondsLabel(movement.start)}–${secondsLabel(movement.end)} · ${movement.title}</strong>
              <span>${movement.metre} · ${movement.cycleBeats}-beat gate · harmonics ${Math.round(movement.harmonicMix * 100)}%</span>
              <small>${movement.texture}</small>
            </div>
          `).join('')}
        </div>
        <p class="tiny song-warning">Playback is live and immediate. Export creates two offline 9:36 score passes at the selected speed. WAV and MP3 are direct; the remaining formats load the optional browser converter.</p>
      </div>
    `;
  }

  function injectCard() {
    const root = document.querySelector('[data-mobius-lab]');
    const grid = root?.querySelector('.grid');
    if (!grid) return false;
    const old = grid.querySelector('[data-elara-full-song-card]');
    if (old) old.remove();
    injectStyles();
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.elaraFullSongCard = 'true';
    card.innerHTML = cardMarkup();
    const liveState = [...grid.querySelectorAll('.card h2')]
      .find((heading) => heading.textContent.trim() === 'Live state')?.closest('.card');
    if (liveState) grid.insertBefore(card, liveState);
    else grid.appendChild(card);

    state.ui = {
      card,
      returnSelect: card.querySelector('[data-song-return]'),
      speed: card.querySelector('[data-song-speed]'),
      speedValue: card.querySelector('[data-song-speed-value]'),
      twist: card.querySelector('[data-song-twist]'),
      twistValue: card.querySelector('[data-song-twist-value]'),
      loop: card.querySelector('[data-song-loop]'),
      duration: card.querySelector('[data-song-duration]'),
      play: card.querySelector('[data-song-play]'),
      stop: card.querySelector('[data-song-stop]'),
      receipt: card.querySelector('[data-song-receipt]'),
      format: card.querySelector('[data-song-format]'),
      exportButton: card.querySelector('[data-song-export]'),
      progress: card.querySelector('[data-song-progress]'),
      status: card.querySelector('[data-song-status]')
    };

    state.ui.play.addEventListener('click', async () => {
      ensureFiveLayerUi();
      try {
        if (state.playing) pauseSong();
        else await playSong();
      } catch (error) {
        console.error('[Elara live song]', error);
        setStatus(`Song error: ${error.message}`);
      }
    });
    state.ui.stop.addEventListener('click', () => featherSong());
    state.ui.speed.addEventListener('input', () => changeSpeed(Number(state.ui.speed.value)));
    state.ui.twist.addEventListener('input', () => {
      state.twistMix = Number(state.ui.twist.value);
      state.ui.twistValue.textContent = `${Math.round(state.twistMix * 100)}%`;
      if (state.playing) restartAt(scorePosition());
    });
    state.ui.returnSelect.addEventListener('change', () => changeReturnMode(state.ui.returnSelect.value));
    state.ui.loop.addEventListener('change', () => { state.loop = state.ui.loop.checked; });
    state.ui.receipt.addEventListener('click', () => {
      const options = currentOptions();
      download(new Blob([JSON.stringify(scoreReceipt(options), null, 2)], { type: 'application/json' }), `the-elara-codex-live-song-${RETURN_MODES[options.returnMode].fileSlug}.json`);
      setStatus('Score receipt saved.');
    });
    state.ui.exportButton.addEventListener('click', exportMaster);

    updateDurationUi();
    updatePlayButton();
    ensureFiveLayerUi();
    return true;
  }

  function boot() {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const ready = window.ElaraCodexSource?.chapters?.length >= 57;
      if (ready) {
        state.events = buildScore();
        if (injectCard()) window.clearInterval(timer);
      }
      if (attempts > 300) window.clearInterval(timer);
    }, 40);
  }

  window.ElaraCodexFullSong = {
    version: SCORE_VERSION,
    baseBpm: BASE_BPM,
    passSeconds: PASS_SECONDS,
    totalSeconds: TOTAL_SECONDS,
    fiveLayers: FIVE_LAYERS,
    movements: MOVEMENTS,
    passes: PASSES,
    play: playSong,
    pause: pauseSong,
    feather: featherSong,
    setSpeed: changeSpeed,
    buildScore,
    renderPair,
    encodeWav,
    encodeMp3,
    scoreReceipt
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
