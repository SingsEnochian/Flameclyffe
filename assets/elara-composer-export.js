'use strict';

/*
  Elara Composer Export Renderer v0.2

  Exports the deterministic score contract without changing canonical source:
  - Standard MIDI File, format 1, with movement/year/lyric metadata
  - Offline stereo PCM WAV for scores up to five minutes

  FLAC and long-form chunked rendering remain deferred. Export is user-initiated.
*/
(function () {
  if (window.ElaraComposerExport) return;

  const VERSION = '0.2.0';
  const TICKS_PER_QUARTER = 480;
  const SAMPLE_RATE = 32000;
  const MAX_WAV_SECONDS = 300;
  const MAX_AUDIBLE_HZ = 6200;
  const CARRIER_HZ = 73;

  const TRACKS = Object.freeze({
    foundation: { name: 'Foundation', channel: 0, program: 42 },
    inner: { name: 'Inner Motion', channel: 1, program: 25 },
    narrative: { name: 'Narrative Voice', channel: 2, program: 40 },
    luminous: { name: 'Luminous Colour', channel: 3, program: 52 },
    crown: { name: 'Crown', channel: 4, program: 48 },
    percussion: { name: 'Percussion', channel: 9, program: null }
  });

  const textEncoder = new TextEncoder();
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const ascii = (text) => [...String(text)].map((character) => character.charCodeAt(0) & 0x7f);
  const u16 = (value) => [(value >>> 8) & 0xff, value & 0xff];
  const u32 = (value) => [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];

  function variableLength(value) {
    let buffer = Number(value) & 0x7f;
    const bytes = [];
    while ((value >>= 7)) { buffer <<= 8; buffer |= ((value & 0x7f) | 0x80); }
    while (true) { bytes.push(buffer & 0xff); if (buffer & 0x80) buffer >>= 8; else break; }
    return bytes;
  }

  function metaEvent(type, data) {
    const bytes = Array.isArray(data) ? data : [...textEncoder.encode(String(data))];
    return [0xff, type, ...variableLength(bytes.length), ...bytes];
  }

  function midiChunk(id, bytes) {
    return [...ascii(id), ...u32(bytes.length), ...bytes];
  }

  function secondsToTicks(seconds, bpm) {
    return Math.max(0, Math.round(Number(seconds) * Number(bpm) * TICKS_PER_QUARTER / 60));
  }

  function frequencyToMidi(frequency) {
    return clamp(Math.round(69 + 12 * Math.log2(Math.max(1, Number(frequency)) / 440)), 0, 127);
  }

  function velocityFromGain(gain) {
    return clamp(Math.round(28 + Math.sqrt(clamp(gain, 0, 1)) * 92), 1, 118);
  }

  function metreBytes(metre) {
    if (metre === '6/8') return [6, 3, 24, 8];
    if (metre === '9/8') return [9, 3, 24, 8];
    return [3, 2, 24, 8];
  }

  function serialiseTrack(events) {
    const ordered = [...events].sort((left, right) => left.tick - right.tick || left.order - right.order);
    const bytes = [];
    let previousTick = 0;
    ordered.forEach((event) => {
      bytes.push(...variableLength(Math.max(0, event.tick - previousTick)), ...event.bytes);
      previousTick = event.tick;
    });
    bytes.push(0x00, 0xff, 0x2f, 0x00);
    return midiChunk('MTrk', bytes);
  }

  function markerEvents(score) {
    const events = [];
    const markers = score.events.filter((event) => event.kind === 'marker');
    const tempo = Math.round(60000000 / score.bpm);
    events.push({ tick: 0, order: 0, bytes: metaEvent(0x03, 'Elara Harmonic Composer') });
    events.push({ tick: 0, order: 1, bytes: metaEvent(0x51, [(tempo >>> 16) & 0xff, (tempo >>> 8) & 0xff, tempo & 0xff]) });
    events.push({ tick: 0, order: 2, bytes: metaEvent(0x01, `schema=${score.schema}; version=${score.version}; seed=${score.seed}`) });

    markers.forEach((marker, index) => {
      const tick = secondsToTicks(marker.start, score.bpm);
      const nextStart = markers[index + 1]?.start ?? score.duration;
      const title = `${marker.year.year} · ${marker.movement.roman}. ${marker.movement.title}`;
      events.push({ tick, order: 3, bytes: metaEvent(0x06, title) });
      events.push({ tick, order: 4, bytes: metaEvent(0x58, metreBytes(marker.movement.metre)) });
      events.push({ tick, order: 5, bytes: metaEvent(0x01, `yearMultiplier=${marker.year.multiplier}; metre=${marker.movement.metre}; cadence=${marker.movement.cadence}`) });

      const lyrics = marker.lyric || [];
      const span = Math.max(1, nextStart - marker.start);
      lyrics.forEach((line, lyricIndex) => {
        const lyricTick = secondsToTicks(marker.start + span * (lyricIndex + 0.5) / Math.max(1, lyrics.length), score.bpm);
        events.push({ tick: lyricTick, order: 6, bytes: metaEvent(0x05, `[${line.role}/${line.language}] ${line.text}`) });
      });
    });

    events.push({ tick: secondsToTicks(score.duration, score.bpm), order: 9, bytes: metaEvent(0x06, 'Elara resolution') });
    return events;
  }

  function musicalTrackEvents(score, voice, track) {
    const events = [
      { tick: 0, order: 0, bytes: metaEvent(0x03, track.name) }
    ];
    if (track.program != null) events.push({ tick: 0, order: 1, bytes: [0xc0 | track.channel, track.program] });

    if (voice === 'percussion') {
      score.events.filter((event) => event.kind === 'pulse').forEach((event) => {
        const start = secondsToTicks(event.start, score.bpm);
        const end = Math.max(start + 20, secondsToTicks(event.end, score.bpm));
        const velocity = velocityFromGain(event.gain);
        events.push({ tick: start, order: 4, bytes: [0x90 | track.channel, 36, velocity] });
        events.push({ tick: end, order: 2, bytes: [0x80 | track.channel, 36, 0] });
      });
      return events;
    }

    score.events.filter((event) => event.kind === 'note' && event.voice === voice).forEach((event) => {
      const note = frequencyToMidi(event.frequency);
      const start = secondsToTicks(event.start, score.bpm);
      const end = Math.max(start + 24, secondsToTicks(event.end, score.bpm));
      const velocity = velocityFromGain(event.gain);
      events.push({ tick: start, order: 4, bytes: [0x90 | track.channel, note, velocity] });
      events.push({ tick: end, order: 2, bytes: [0x80 | track.channel, note, 0] });
    });
    return events;
  }

  function encodeMidi(score) {
    if (!score?.events?.length) throw new Error('A score with events is required for MIDI export.');
    const activeTracks = Object.entries(TRACKS).filter(([voice]) => voice === 'percussion'
      ? score.events.some((event) => event.kind === 'pulse')
      : score.events.some((event) => event.kind === 'note' && event.voice === voice));
    const chunks = [serialiseTrack(markerEvents(score))];
    activeTracks.forEach(([voice, track]) => chunks.push(serialiseTrack(musicalTrackEvents(score, voice, track))));
    const header = [...ascii('MThd'), ...u32(6), ...u16(1), ...u16(chunks.length), ...u16(TICKS_PER_QUARTER)];
    return new Uint8Array([...header, ...chunks.flat()]);
  }

  function writeAscii(view, offset, text) {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  }

  function encodeWav(audioBuffer) {
    if (!audioBuffer || !Number.isFinite(audioBuffer.length) || !Number.isFinite(audioBuffer.sampleRate)) throw new Error('A rendered AudioBuffer is required.');
    const channels = Math.max(1, Math.min(2, audioBuffer.numberOfChannels || 1));
    const frames = audioBuffer.length;
    const bytesPerSample = 2;
    const blockAlign = channels * bytesPerSample;
    const dataSize = frames * blockAlign;
    const output = new ArrayBuffer(44 + dataSize);
    const view = new DataView(output);
    writeAscii(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(view, 8, 'WAVE');
    writeAscii(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(28, audioBuffer.sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeAscii(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    const channelData = Array.from({ length: channels }, (_, channel) => audioBuffer.getChannelData(channel));
    let offset = 44;
    for (let frame = 0; frame < frames; frame += 1) {
      for (let channel = 0; channel < channels; channel += 1) {
        const sample = clamp(channelData[channel][frame], -1, 1);
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }
    return new Uint8Array(output);
  }

  function buildOfflineGraph(ctx, selection) {
    const audible = ctx.createGain();
    const temporal = ctx.createGain();
    const lowpass = ctx.createBiquadFilter();
    const master = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = MAX_AUDIBLE_HZ;
    lowpass.Q.value = 0.18;
    master.gain.value = clamp(selection.masterGain, 0.01, 0.24);
    limiter.threshold.value = -12;
    limiter.knee.value = 18;
    limiter.ratio.value = 4;
    limiter.attack.value = 0.006;
    limiter.release.value = 0.22;
    audible.connect(lowpass);
    lowpass.connect(master);
    temporal.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);
    return { audible, temporal };
  }

  function envelope(param, start, end, peak, attack = 0.04, release = 0.22) {
    const safeEnd = Math.max(start + 0.05, end);
    param.setValueAtTime(0.00001, start);
    param.exponentialRampToValueAtTime(Math.max(0.00002, peak), start + Math.min(attack, (safeEnd - start) * 0.33));
    param.setValueAtTime(Math.max(0.00002, peak), Math.max(start + attack, safeEnd - release));
    param.exponentialRampToValueAtTime(0.00001, safeEnd);
  }

  function renderNote(ctx, graph, event) {
    if (event.frequency <= 0 || event.frequency > MAX_AUDIBLE_HZ) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    osc.type = event.waveform || 'sine';
    osc.frequency.setValueAtTime(event.frequency, event.start);
    if (event.glideTo && event.glideTo < MAX_AUDIBLE_HZ) osc.frequency.linearRampToValueAtTime(event.glideTo, Math.min(event.end, event.start + 0.7));
    envelope(gain.gain, event.start, event.end, event.gain, event.voice === 'foundation' ? 0.12 : 0.045, event.voice === 'foundation' ? 0.42 : 0.24);
    osc.connect(gain);
    if (pan) { pan.pan.value = clamp(event.pan || 0, -0.75, 0.75); gain.connect(pan); pan.connect(graph.audible); }
    else gain.connect(graph.audible);
    osc.start(event.start); osc.stop(event.end + 0.03);
  }

  function renderPulse(ctx, graph, event) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(72, event.start);
    osc.frequency.exponentialRampToValueAtTime(48, event.end);
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    envelope(gain.gain, event.start, event.end, event.gain, 0.008, 0.08);
    osc.connect(filter); filter.connect(gain); gain.connect(graph.audible);
    osc.start(event.start); osc.stop(event.end + 0.02);
  }

  function renderSeam(ctx, graph, event) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 108;
    envelope(gain.gain, event.start, event.end, 0.006, 0.8, 0.9);
    osc.connect(gain); gain.connect(graph.audible);
    osc.start(event.start); osc.stop(event.end + 0.04);
  }

  function renderTemporal(ctx, graph, event, selection) {
    if (selection.infraMode === 'true-infra') {
      if (event.infraFrequency <= 0 || event.infraFrequency >= 20) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(event.infraFrequency, event.start);
      envelope(gain.gain, event.start, event.end, clamp(selection.infraGain, 0, 0.05), 0.35, 0.55);
      osc.connect(gain); gain.connect(graph.temporal);
      osc.start(event.start); osc.stop(event.end + 0.04);
    } else if (selection.infraMode === 'carrier') {
      const carrier = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      const gain = ctx.createGain();
      carrier.type = 'sine'; carrier.frequency.value = CARRIER_HZ;
      lfo.type = 'sine'; lfo.frequency.value = event.infraFrequency;
      depth.gain.value = clamp(selection.infraGain, 0, 0.04) * 0.42;
      gain.gain.value = clamp(selection.infraGain, 0, 0.04) * 0.58;
      lfo.connect(depth); depth.connect(gain.gain); carrier.connect(gain); gain.connect(graph.temporal);
      carrier.start(event.start); lfo.start(event.start); carrier.stop(event.end + 0.04); lfo.stop(event.end + 0.04);
    }
  }

  async function renderWav(score, selection) {
    if (score.duration > MAX_WAV_SECONDS) throw new Error(`This score is ${Math.ceil(score.duration)} seconds. WAV v0.2 is bounded to ${MAX_WAV_SECONDS} seconds; export separate years or movements.`);
    const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineContext) throw new Error('OfflineAudioContext is unavailable in this browser.');
    const frameCount = Math.ceil((score.duration + 0.5) * SAMPLE_RATE);
    const ctx = new OfflineContext(2, frameCount, SAMPLE_RATE);
    const graph = buildOfflineGraph(ctx, selection);
    score.events.forEach((event) => {
      if (event.kind === 'note') renderNote(ctx, graph, event);
      else if (event.kind === 'pulse') renderPulse(ctx, graph, event);
      else if (event.kind === 'seam') renderSeam(ctx, graph, event);
      else if (event.kind === 'temporal') renderTemporal(ctx, graph, event, selection);
    });
    const rendered = await ctx.startRendering();
    return encodeWav(rendered);
  }

  function safeSlug(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72) || 'elara';
  }

  function downloadBytes(bytes, mime, filename) {
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function currentScore() {
    const core = window.ElaraComposerCore;
    if (!core) throw new Error('Elara Composer Core is unavailable.');
    const selection = core.getState().selection;
    return { core, selection, score: core.buildInterpretation(selection) };
  }

  function filenameFor(score, selection, extension) {
    return `elara-${safeSlug(selection.key)}-${safeSlug(selection.language)}-${safeSlug(selection.movement)}-${safeSlug(selection.temporal)}-${safeSlug(selection.seed)}.${extension}`;
  }

  function addExportUi() {
    const card = document.querySelector('[data-elara-composer-card]');
    if (!card || card.querySelector('[data-composer-export-midi]')) return false;
    const controls = card.querySelector('.controls');
    const status = card.querySelector('[data-composer-status]');
    if (!controls || !status) return false;

    const midi = document.createElement('button');
    midi.type = 'button';
    midi.dataset.composerExportMidi = 'true';
    midi.textContent = 'Export MIDI';

    const wav = document.createElement('button');
    wav.type = 'button';
    wav.dataset.composerExportWav = 'true';
    wav.textContent = 'Render WAV';

    controls.append(midi, wav);

    midi.addEventListener('click', () => {
      try {
        const { selection, score } = currentScore();
        downloadBytes(encodeMidi(score), 'audio/midi', filenameFor(score, selection, 'mid'));
        status.textContent = `MIDI exported · ${score.key.label} · ${score.language} · ${Math.round(score.duration)} seconds.`;
      } catch (error) {
        status.textContent = `MIDI export error: ${error.message}`;
      }
    });

    wav.addEventListener('click', async () => {
      let original = wav.textContent;
      try {
        wav.disabled = true;
        wav.textContent = 'Rendering WAV…';
        const { selection, score } = currentScore();
        status.textContent = `Rendering ${Math.round(score.duration)} seconds offline. No live sound is required.`;
        const bytes = await renderWav(score, selection);
        downloadBytes(bytes, 'audio/wav', filenameFor(score, selection, 'wav'));
        status.textContent = `WAV rendered · ${score.key.label} · ${score.language} · ${Math.round(score.duration)} seconds.`;
      } catch (error) {
        status.textContent = `WAV render error: ${error.message}`;
      } finally {
        wav.disabled = false;
        wav.textContent = original;
      }
    });

    return true;
  }

  window.ElaraComposerExport = {
    version: VERSION,
    ticksPerQuarter: TICKS_PER_QUARTER,
    sampleRate: SAMPLE_RATE,
    maximumWavSeconds: MAX_WAV_SECONDS,
    encodeMidi,
    encodeWav,
    renderWav,
    scoreDurationWithinWavLimit(score) { return Boolean(score && score.duration <= MAX_WAV_SECONDS); }
  };

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (addExportUi() || attempts > 400) window.clearInterval(timer);
  }, 50);
})();
