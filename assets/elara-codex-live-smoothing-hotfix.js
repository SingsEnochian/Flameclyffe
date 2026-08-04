'use strict';

/*
  Elara live-song continuity and high-tone softness hotfix v0.2

  Installs over the v0.2 player without touching export. It intercepts live
  Play/Pause/Feather and live controls, preserving the existing export surface.
*/

(function () {
  const BPM = 123;
  const BEAT = 60 / BPM;
  const PASS_SECONDS = 576;
  const TOTAL_SECONDS = 1152;
  const LOOKAHEAD_SECONDS = 3.2;
  const SCHEDULER_MS = 80;
  const LAYERS = Object.freeze([1, 2, 3, 4, 5]);
  const LAYER_WEIGHT = Object.freeze({ 1: 1, 2: 0.26, 3: 0.14, 4: 0.07, 5: 0.035 });
  const ROLE_GAIN = Object.freeze({
    ground: 0.036,
    path: 0.034,
    impulse: 0.032,
    relation: 0.031,
    weave: 0.029,
    crown: 0.020,
    unregistered: 0.030
  });

  const MOVEMENTS = Object.freeze([
    { id: 'abyss-foundation', title: 'The Abyss Foundation', start: 0, end: 138, chapters: [1, 14], harmonicMix: 0.15, motif: [369, 415] },
    { id: 'silver-horizon', title: 'The Silver Horizon', start: 138, end: 276, chapters: [15, 28], harmonicMix: 0.30, motif: [554, 659] },
    { id: 'solar-surge', title: 'The Solar Surge', start: 276, end: 432, chapters: [29, 43], harmonicMix: 0.50, motif: [987, 1179] },
    { id: 'full-spiral-return', title: 'The Full Spiral Return', start: 432, end: 576, chapters: [44, 57], harmonicMix: 0.75, motif: [415, 440, 659, 739, 987, 1179, 1318, 2637] }
  ]);

  const PASSES = Object.freeze([
    { id: 'canonical-2025', title: 'Pass I · The Original Codex', multiplier: 1, offset: 0 },
    { id: 'spiral-return-2026', title: 'Pass II · First Spiral Return', multiplier: 1.15, offset: PASS_SECONDS }
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
    active: new Set(),
    playing: false,
    pausedScore: 0,
    scoreAnchor: 0,
    audioAnchor: 0,
    speed: 1,
    twist: 0.03,
    softness: 0.78,
    returnMode: 'left-inverted',
    loop: true,
    eventIndex: 0,
    scheduler: null,
    clock: null,
    noiseBuffer: null,
    ui: null
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const source = () => window.ElaraCodexSource || null;
  const chapters = () => source()?.chapters || [];

  function sequenceFor(chapter) {
    return chapter?.narrativeToneSequence?.length
      ? chapter.narrativeToneSequence
      : chapter?.sourceToneSequence?.length
        ? chapter.sourceToneSequence
        : chapter?.toneSequence || [];
  }

  function movementChapters(movement) {
    const [first, last] = movement.chapters;
    return chapters()
      .filter((chapter) => chapter.number >= first && chapter.number <= last)
      .sort((left, right) => (left.sequenceIndex || 0) - (right.sequenceIndex || 0));
  }

  function fallbackTone(movement, chapterIndex, multiplier) {
    const frequency = movement.motif[chapterIndex % movement.motif.length] * multiplier;
    return {
      frequencyHz: frequency,
      label: chapterIndex % 2 ? 'Anchor' : 'Spiral',
      role: chapterIndex % 2 ? 'ground' : 'weave'
    };
  }

  function buildSmoothScore() {
    const events = [];

    PASSES.forEach((pass) => {
      MOVEMENTS.forEach((movement) => {
        const list = movementChapters(movement);
        const slot = (movement.end - movement.start) / Math.max(1, list.length);
        const movementStart = pass.offset + movement.start;
        const movementEnd = pass.offset + movement.end;

        list.forEach((chapter, chapterIndex) => {
          let sequence = sequenceFor(chapter).map((tone) => ({
            ...tone,
            frequencyHz: Number(tone.frequencyHz) * pass.multiplier
          }));
          if (!sequence.length) sequence = [fallbackTone(movement, chapterIndex, pass.multiplier)];

          const slotStart = movementStart + chapterIndex * slot;
          const slotEnd = chapterIndex === list.length - 1 ? movementEnd : slotStart + slot;
          const nextOverlap = Math.min(BEAT * 1.75, slot * 0.24);
          const phraseStart = slotStart + 0.03;
          const phraseEnd = Math.min(movementEnd, slotEnd + nextOverlap);
          const entrySpan = Math.min(slot * 0.46, movement.harmonicMix > 0.49 ? BEAT * 3.4 : BEAT * 2.8);
          const step = sequence.length > 1 ? entrySpan / (sequence.length - 1) : 0;
          const noteSustain = Math.max(BEAT * 2.4, slot * 0.88);
          const scale = 1 / Math.max(1, Math.pow(sequence.length, 0.34));

          sequence.forEach((tone, toneIndex) => {
            const start = phraseStart + toneIndex * step;
            const end = Math.min(phraseEnd, Math.max(start + BEAT * 1.8, start + noteSustain));
            events.push({
              kind: 'tone',
              start,
              end,
              frequency: Number(tone.frequencyHz),
              label: tone.label || 'Tone',
              role: tone.role || 'unregistered',
              harmonicMix: movement.harmonicMix,
              gainScale: scale,
              chapterNumber: chapter.number,
              chapterTitle: chapter.title,
              movementId: movement.id,
              passId: pass.id
            });
          });

          const finalTone = sequence[sequence.length - 1];
          events.push({
            kind: 'tone',
            start: Math.max(phraseStart, slotEnd - BEAT * 1.35),
            end: Math.min(movementEnd, slotEnd + nextOverlap),
            frequency: Number(finalTone.frequencyHz),
            label: finalTone.label || 'Tone',
            role: finalTone.role || 'unregistered',
            harmonicMix: movement.harmonicMix * 0.78,
            gainScale: scale * 0.62,
            handoff: true,
            chapterNumber: chapter.number,
            chapterTitle: chapter.title,
            movementId: movement.id,
            passId: pass.id
          });
        });

        const motifInterval = movement.harmonicMix >= 0.50 ? BEAT * 18 : BEAT * 24;
        for (let time = movementStart; time < movementEnd; time += motifInterval) {
          const frequency = movement.motif[Math.floor((time - movementStart) / motifInterval) % movement.motif.length] * pass.multiplier;
          events.push({
            kind: 'motif',
            start: time,
            end: Math.min(movementEnd, time + BEAT * 2.2),
            frequency,
            label: 'Spiral',
            role: 'weave',
            harmonicMix: movement.harmonicMix * 0.38,
            gainScale: 0.12,
            movementId: movement.id,
            passId: pass.id
          });
        }

        events.push({
          kind: 'twist',
          start: movementStart,
          end: movementEnd,
          multiplier: pass.multiplier,
          movementId: movement.id,
          passId: pass.id
        });
      });

      const totalBeats = Math.floor(PASS_SECONDS / BEAT);
      for (let beat = 3; beat <= totalBeats; beat += 3) {
        const local = beat * BEAT;
        const gate = beat % 9 === 0 ? 9 : beat % 6 === 0 ? 6 : 3;
        events.push({
          kind: 'noise',
          start: pass.offset + local,
          end: pass.offset + local + (gate === 6 ? 0.62 : gate === 9 ? 0.09 : 0.16),
          gate,
          passId: pass.id
        });
      }
    });

    return events.sort((left, right) => left.start - right.start || left.kind.localeCompare(right.kind));
  }

  function buildGraph(ctx, returnMode) {
    const left = ctx.createGain();
    const right = ctx.createGain();
    const centre = ctx.createGain();
    const returnBus = ctx.createGain();
    const musicBus = ctx.createGain();
    const highShelf = ctx.createBiquadFilter();
    const softLowpass = ctx.createBiquadFilter();
    const centreLeft = ctx.createGain();
    const centreRight = ctx.createGain();
    const returnPhase = ctx.createGain();
    const returnLeft = ctx.createGain();
    const returnRight = ctx.createGain();
    const merger = ctx.createChannelMerger(2);
    const master = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();

    highShelf.type = 'highshelf';
    highShelf.frequency.value = 3200;
    highShelf.gain.value = -10 * state.softness;
    softLowpass.type = 'lowpass';
    softLowpass.frequency.value = 11800 - state.softness * 3800;
    softLowpass.Q.value = 0.38;

    left.connect(musicBus);
    right.connect(musicBus);
    centre.connect(musicBus);
    returnBus.connect(musicBus);
    musicBus.connect(highShelf);
    highShelf.connect(softLowpass);

    centreLeft.gain.value = Math.SQRT1_2;
    centreRight.gain.value = Math.SQRT1_2;
    returnPhase.gain.value = -1;
    returnLeft.gain.value = returnMode === 'both-inverted' ? Math.SQRT1_2 : 1;
    returnRight.gain.value = returnMode === 'both-inverted' ? Math.SQRT1_2 : 0;
    master.gain.value = 0.74;
    limiter.threshold.value = -13;
    limiter.knee.value = 18;
    limiter.ratio.value = 7;
    limiter.attack.value = 0.006;
    limiter.release.value = 0.20;

    softLowpass.connect(centreLeft);
    softLowpass.connect(centreRight);
    centreLeft.connect(merger, 0, 0);
    centreRight.connect(merger, 0, 1);

    returnPhase.connect(returnLeft);
    returnPhase.connect(returnRight);
    returnLeft.connect(merger, 0, 0);
    returnRight.connect(merger, 0, 1);

    const leftDirect = ctx.createGain();
    const rightDirect = ctx.createGain();
    leftDirect.gain.value = 0.35;
    rightDirect.gain.value = 0.35;
    left.connect(leftDirect);
    right.connect(rightDirect);
    leftDirect.connect(merger, 0, 0);
    rightDirect.connect(merger, 0, 1);

    returnBus.connect(returnPhase);

    merger.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);

    return {
      left, right, centre, return: returnBus, musicBus, highShelf, softLowpass,
      centreLeft, centreRight, returnPhase, returnLeft, returnRight,
      leftDirect, rightDirect, merger, master, limiter
    };
  }

  function disconnectGraph(graph) {
    if (!graph) return;
    Object.values(graph).forEach((node) => {
      try { node?.disconnect?.(); } catch (error) {}
    });
  }

  async function ensureAudio() {
    const bus = window.mobiusAudioBus;
    if (bus?.ensure) {
      await bus.ensure();
      state.ctx = bus.ctx;
    } else if (!state.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('Web Audio API is unavailable.');
      state.ctx = new AudioContext({ latencyHint: 'interactive' });
    }
    if (state.ctx.state === 'suspended') await state.ctx.resume();
    if (!state.graph) state.graph = buildGraph(state.ctx, state.returnMode);
  }

  function scorePosition() {
    if (!state.playing || !state.ctx) return state.pausedScore;
    return state.scoreAnchor + (state.ctx.currentTime - state.audioAnchor) * state.speed;
  }

  function audioTime(scoreSeconds) {
    return state.audioAnchor + (scoreSeconds - state.scoreAnchor) / state.speed;
  }

  function findIndex(scoreSeconds) {
    let low = 0;
    let high = state.events.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (state.events[middle].end < scoreSeconds - 0.08) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  function spectralAttenuation(frequency) {
    const softness = state.softness;
    if (frequency <= 1800) return 1;
    if (frequency <= 3200) return 1 - softness * 0.22 * ((frequency - 1800) / 1400);
    if (frequency <= 6000) return 1 - softness * (0.22 + 0.45 * ((frequency - 3200) / 2800));
    if (frequency <= 9000) return Math.max(0.10, 1 - softness * (0.67 + 0.24 * ((frequency - 6000) / 3000)));
    return Math.max(0.025, 0.14 * (1 - softness * 0.75));
  }

  function addActive(node) {
    state.active.add(node);
    node.addEventListener?.('ended', () => state.active.delete(node), { once: true });
  }

  function stopActive() {
    const now = state.ctx?.currentTime || 0;
    state.active.forEach((node) => {
      try { node.stop?.(now + 0.015); } catch (error) {}
      try { node.disconnect?.(); } catch (error) {}
    });
    state.active.clear();
  }

  function scheduleEnvelope(param, start, end, peak, attackScore, releaseScore) {
    const now = state.ctx.currentTime;
    const safeStart = Math.max(now + 0.006, start);
    const safeEnd = Math.max(safeStart + 0.05, end);
    const attack = Math.min(attackScore / state.speed, (safeEnd - safeStart) * 0.35);
    const release = Math.min(releaseScore / state.speed, (safeEnd - safeStart) * 0.45);
    param.setValueAtTime(0.00001, safeStart);
    param.exponentialRampToValueAtTime(Math.max(0.00002, peak), safeStart + Math.max(0.012, attack));
    param.setValueAtTime(Math.max(0.00002, peak), Math.max(safeStart + attack, safeEnd - release));
    param.exponentialRampToValueAtTime(0.00001, safeEnd);
  }

  function scheduleSine(destination, frequency, startScore, endScore, gain, attack = 0.12, release = 0.50) {
    const ctx = state.ctx;
    const start = audioTime(startScore);
    const end = audioTime(endScore);
    if (end <= ctx.currentTime + 0.01 || frequency >= ctx.sampleRate * 0.49) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, Math.max(ctx.currentTime, start));
    scheduleEnvelope(env.gain, start, end, gain * spectralAttenuation(frequency), attack, release);
    osc.connect(env);
    env.connect(destination);
    osc.start(Math.max(ctx.currentTime + 0.004, start));
    osc.stop(Math.max(ctx.currentTime + 0.06, end + 0.03));
    addActive(osc);
  }

  function scheduleTone(event) {
    const names = ROUTES[event.label] || ['centre'];
    const routeScale = 1 / Math.max(1, Math.sqrt(names.length));
    const base = (ROLE_GAIN[event.role] || ROLE_GAIN.unregistered) * event.gainScale * routeScale;
    LAYERS.forEach((harmonic) => {
      const frequency = event.frequency * harmonic;
      const layerGain = harmonic === 1
        ? base
        : base * LAYER_WEIGHT[harmonic] * event.harmonicMix;
      names.forEach((name) => scheduleSine(
        state.graph[name] || state.graph.centre,
        frequency,
        event.start,
        event.end,
        layerGain,
        harmonic === 1 ? 0.10 : 0.18,
        harmonic === 1 ? 0.52 : 0.72
      ));
    });
  }

  function scheduleTwist(event) {
    const floor = clamp(state.twist, 0, 0.06);
    if (floor <= 0) return;
    const gain = 0.0024 * floor;
    scheduleSine(state.graph.centre, 108 * event.multiplier, event.start, event.end, gain * 0.42, 2.0, 2.0);
    scheduleSine(state.graph.left, 369 * event.multiplier, event.start, event.end, gain * 0.52, 2.0, 2.0);
    scheduleSine(state.graph.right, 363.5 * event.multiplier, event.start, event.end, gain * 0.52, 2.0, 2.0);
    scheduleSine(state.graph.return, 369 * event.multiplier, event.start, event.end, gain * 0.28, 2.0, 2.0);
  }

  function whiteNoise(ctx) {
    if (state.noiseBuffer?.sampleRate === ctx.sampleRate) return state.noiseBuffer;
    const frames = Math.floor(ctx.sampleRate * 0.9);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frames; index += 1) data[index] = Math.random() * 2 - 1;
    state.noiseBuffer = buffer;
    return buffer;
  }

  function scheduleNoise(event) {
    const floor = clamp(state.twist, 0, 0.06);
    if (floor <= 0) return;
    const ctx = state.ctx;
    const start = Math.max(ctx.currentTime + 0.006, audioTime(event.start));
    const end = Math.max(start + 0.03, audioTime(event.end));
    if (end <= ctx.currentTime + 0.01) return;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    const pan = ctx.createStereoPanner();
    const gain = 0.0018 * floor;
    src.buffer = whiteNoise(ctx);
    filter.type = 'lowpass';
    filter.frequency.value = event.gate === 6 ? 480 : 1100;
    filter.Q.value = 0.42;
    env.gain.setValueAtTime(0.000001, start);
    env.gain.linearRampToValueAtTime(gain * (event.gate === 6 ? 0.75 : 0.45), Math.min(end, start + 0.045 / state.speed));
    env.gain.exponentialRampToValueAtTime(0.000001, end);
    if (event.gate === 3) {
      pan.pan.setValueAtTime(-0.65, start);
      pan.pan.linearRampToValueAtTime(0.65, end);
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
    if (event.kind === 'tone' || event.kind === 'motif') scheduleTone(event);
    else if (event.kind === 'twist') scheduleTwist(event);
    else if (event.kind === 'noise') scheduleNoise(event);
  }

  function schedulerTick() {
    if (!state.playing || !state.ctx) return;
    const current = scorePosition();
    if (current >= TOTAL_SECONDS) {
      if (state.loop) {
        restartAt(0, true);
        return;
      }
      feather('The complete double spiral resolved into silence.');
      return;
    }

    const horizon = current + LOOKAHEAD_SECONDS * state.speed;
    while (state.eventIndex < state.events.length) {
      const event = state.events[state.eventIndex];
      if (event.start > horizon) break;
      if (event.end >= current - 0.08) scheduleEvent(event);
      state.eventIndex += 1;
    }
  }

  function formatSeconds(seconds) {
    const safe = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(safe / 60);
    return `${minutes}:${String(safe % 60).padStart(2, '0')}`;
  }

  function passAt(position) {
    return position < PASS_SECONDS ? PASSES[0] : PASSES[1];
  }

  function movementAt(position) {
    const local = ((position % PASS_SECONDS) + PASS_SECONDS) % PASS_SECONDS;
    return MOVEMENTS.find((movement) => local >= movement.start && local < movement.end) || MOVEMENTS[MOVEMENTS.length - 1];
  }

  function clockTick() {
    if (!state.ui) return;
    const position = clamp(scorePosition(), 0, TOTAL_SECONDS);
    const pass = passAt(position);
    const movement = movementAt(position);
    state.ui.progress.value = position;
    state.ui.status.textContent = `${formatSeconds(position / state.speed)} / ${formatSeconds(TOTAL_SECONDS / state.speed)} · ${pass.title} · ${movement.title} · ${Math.round(BPM * state.speed)} BPM`;
  }

  function startTimers() {
    stopTimers();
    state.scheduler = window.setInterval(schedulerTick, SCHEDULER_MS);
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

  function updateButton() {
    if (!state.ui?.play) return;
    state.ui.play.textContent = state.playing ? 'Pause song' : state.pausedScore > 0 ? 'Resume song' : 'Play complete song';
  }

  function setStatus(text) {
    if (state.ui?.status) state.ui.status.textContent = text;
  }

  async function play() {
    await ensureAudio();
    if (!state.events.length) state.events = buildSmoothScore();
    if (state.playing) return;
    state.speed = Number(state.ui.speed.value);
    state.twist = Number(state.ui.twist.value);
    state.softness = Number(state.ui.softness.value);
    state.returnMode = state.ui.returnSelect.value;
    state.loop = state.ui.loop.checked;
    if (!state.graph) state.graph = buildGraph(state.ctx, state.returnMode);
    state.scoreAnchor = state.pausedScore;
    state.audioAnchor = state.ctx.currentTime + 0.055;
    state.eventIndex = findIndex(state.pausedScore);
    state.playing = true;
    startTimers();
    updateButton();
    setStatus(`Playing smoothly · high-tone softness ${Math.round(state.softness * 100)}% · Twist ${Math.round(state.twist * 100)}%.`);
  }

  function pause() {
    if (!state.playing) return;
    state.pausedScore = clamp(scorePosition(), 0, TOTAL_SECONDS);
    state.playing = false;
    stopTimers();
    stopActive();
    updateButton();
    setStatus(`Paused at ${formatSeconds(state.pausedScore / state.speed)}.`);
  }

  function feather(message = 'Feathered. Song and Twist are silent.') {
    state.playing = false;
    state.pausedScore = 0;
    stopTimers();
    stopActive();
    updateButton();
    if (state.ui) state.ui.progress.value = 0;
    setStatus(message);
  }

  function restartAt(position, looped = false) {
    stopActive();
    state.pausedScore = clamp(position, 0, TOTAL_SECONDS);
    state.scoreAnchor = state.pausedScore;
    state.audioAnchor = state.ctx.currentTime + 0.05;
    state.eventIndex = findIndex(state.pausedScore);
    state.playing = true;
    schedulerTick();
    if (looped) setStatus('The Twist turned the ending back into Pass I.');
  }

  function rebuildGraph() {
    if (!state.ctx) return;
    const position = scorePosition();
    stopActive();
    disconnectGraph(state.graph);
    state.graph = buildGraph(state.ctx, state.returnMode);
    if (state.playing) {
      state.scoreAnchor = position;
      state.audioAnchor = state.ctx.currentTime + 0.05;
      state.eventIndex = findIndex(position);
      schedulerTick();
    }
  }

  function changeSpeed(value) {
    const position = scorePosition();
    state.speed = clamp(value, 0.5, 2);
    if (state.playing && state.ctx) {
      stopActive();
      state.scoreAnchor = position;
      state.audioAnchor = state.ctx.currentTime + 0.05;
      state.eventIndex = findIndex(position);
      schedulerTick();
    } else {
      state.pausedScore = position;
    }
    state.ui.speedValue.textContent = `${state.speed.toFixed(2)}× · ${Math.round(BPM * state.speed)} BPM`;
    state.ui.duration.textContent = formatSeconds(TOTAL_SECONDS / state.speed);
  }

  function installSoftnessControl(card) {
    let input = card.querySelector('[data-song-softness]');
    if (input) return input;
    const speedLabel = card.querySelector('[data-song-speed]')?.closest('label');
    const label = document.createElement('label');
    label.innerHTML = `High-tone softness · <span data-song-softness-value>78%</span><input data-song-softness type="range" min="0" max="1" step="0.05" value="0.78">`;
    if (speedLabel?.nextSibling) speedLabel.parentNode.insertBefore(label, speedLabel.nextSibling);
    else card.querySelector('.stack')?.prepend(label);
    return label.querySelector('[data-song-softness]');
  }

  function bind() {
    const card = document.querySelector('[data-elara-full-song-card]');
    if (!card || card.dataset.smoothingHotfix === 'true') return false;
    card.dataset.smoothingHotfix = 'true';

    try { window.ElaraCodexFullSong?.feather?.(); } catch (error) {}

    const softness = installSoftnessControl(card);
    state.ui = {
      card,
      play: card.querySelector('[data-song-play]'),
      stop: card.querySelector('[data-song-stop]'),
      status: card.querySelector('[data-song-status]'),
      progress: card.querySelector('[data-song-progress]'),
      speed: card.querySelector('[data-song-speed]'),
      speedValue: card.querySelector('[data-song-speed-value]'),
      duration: card.querySelector('[data-song-duration]'),
      twist: card.querySelector('[data-song-twist]'),
      twistValue: card.querySelector('[data-song-twist-value]'),
      softness,
      softnessValue: card.querySelector('[data-song-softness-value]'),
      returnSelect: card.querySelector('[data-song-return]'),
      loop: card.querySelector('[data-song-loop]')
    };

    const capture = (element, handler) => {
      element?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        handler(event);
      }, true);
    };

    capture(state.ui.play, async () => {
      try {
        if (state.playing) pause();
        else await play();
      } catch (error) {
        console.error('[Elara smoothing hotfix]', error);
        setStatus(`Song error: ${error.message}`);
      }
    });
    capture(state.ui.stop, () => feather());

    state.ui.speed?.addEventListener('input', (event) => {
      event.stopImmediatePropagation();
      changeSpeed(Number(state.ui.speed.value));
    }, true);
    state.ui.twist?.addEventListener('input', (event) => {
      event.stopImmediatePropagation();
      state.twist = Number(state.ui.twist.value);
      state.ui.twistValue.textContent = `${Math.round(state.twist * 100)}%`;
      if (state.playing) restartAt(scorePosition());
    }, true);
    state.ui.softness?.addEventListener('input', () => {
      state.softness = Number(state.ui.softness.value);
      state.ui.softnessValue.textContent = `${Math.round(state.softness * 100)}%`;
      rebuildGraph();
    });
    state.ui.returnSelect?.addEventListener('change', (event) => {
      event.stopImmediatePropagation();
      state.returnMode = state.ui.returnSelect.value;
      rebuildGraph();
    }, true);
    state.ui.loop?.addEventListener('change', (event) => {
      event.stopImmediatePropagation();
      state.loop = state.ui.loop.checked;
    }, true);

    state.events = buildSmoothScore();
    state.ui.progress.max = TOTAL_SECONDS;
    state.ui.twist.value = '0.03';
    state.ui.twistValue.textContent = '3%';
    setStatus('Smooth live player ready. Chapter phrases overlap; high-tone softness is 78%; Twist is 3%.');
    return true;
  }

  function boot() {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (chapters().length >= 57 && bind()) window.clearInterval(timer);
      if (attempts > 400) window.clearInterval(timer);
    }, 50);
  }

  window.ElaraLiveSmoothing = {
    version: '0.2.0',
    play,
    pause,
    feather,
    rebuildScore: () => { state.events = buildSmoothScore(); },
    setSoftness: (value) => {
      state.softness = clamp(value, 0, 1);
      if (state.ui?.softness) state.ui.softness.value = String(state.softness);
      rebuildGraph();
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
