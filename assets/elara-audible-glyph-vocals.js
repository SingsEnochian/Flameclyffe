'use strict';

/*
  Elara Audible Glyph Vocal Guide v0.3

  Converts approved Kelyran word records and derived English syllable estimates
  into deterministic first-soprano and baritone guide events. Canonical source,
  musical interpretation, and guide rendering remain separately labelled.
*/
(function () {
  if (window.ElaraAudibleGlyphVocals) return;

  const VERSION = '0.3.0';
  const MANIFEST_PATH = '../data/elara/kelyran-audible-glyph-manifest-v0.2.json';
  const MAX_GUIDE_GAIN = 0.08;
  const state = {
    manifest: null,
    manifestPromise: null,
    ctx: null,
    activeNodes: new Set(),
    timer: null,
    ui: null
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const midiToHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  const hzToMidi = (hz) => 69 + 12 * Math.log2(Math.max(1, Number(hz)) / 440);

  function cleanWord(word) {
    return String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  }

  function englishSyllables(word) {
    const clean = cleanWord(word);
    if (!clean) return [];
    const reduced = clean.length > 3 && clean.endsWith('e') && !/[aeiouy]le$/.test(clean)
      ? clean.slice(0, -1)
      : clean;
    const nuclei = [...reduced.matchAll(/[aeiouy]+/g)];
    if (nuclei.length <= 1) return [clean];

    const boundaries = [0];
    for (let index = 0; index < nuclei.length - 1; index += 1) {
      const leftEnd = nuclei[index].index + nuclei[index][0].length;
      const rightStart = nuclei[index + 1].index;
      const clusterLength = Math.max(0, rightStart - leftEnd);
      const cut = clusterLength > 1 ? rightStart - 1 : leftEnd;
      boundaries.push(Math.max(boundaries[boundaries.length - 1] + 1, cut));
    }
    boundaries.push(clean.length);

    const syllables = [];
    for (let index = 0; index < boundaries.length - 1; index += 1) {
      const part = clean.slice(boundaries[index], boundaries[index + 1]);
      if (part) syllables.push(part);
    }
    return syllables.length ? syllables : [clean];
  }

  function roleVoices(role) {
    if (role === 'baritone') return ['baritone'];
    if (role === 'soprano') return ['soprano'];
    return ['baritone', 'soprano'];
  }

  function lineWords(line, manifest) {
    const tokens = String(line.text || '').split(/\s+/).filter(Boolean);
    const words = [];
    tokens.forEach((token, wordIndex) => {
      const key = cleanWord(token);
      if (!key) return;
      if (line.language === 'kelyran') {
        const record = manifest?.lexicon?.[key];
        if (!record) {
          words.push({
            word: key,
            wordIndex,
            quality: 'unregistered-kelyran',
            syllables: [{ text: key, units: 1, stressed: true, phonemeKey: key, crown: 'UNREGISTERED' }]
          });
          return;
        }
        words.push({
          word: key,
          wordIndex,
          quality: 'canonical-audible-glyph-v0.2',
          meaning: record.meaning,
          crown: record.crown,
          phonemeKey: record.phoneme_key,
          suno: record.suno,
          syllables: record.syllables.map((syllable, syllableIndex) => ({
            text: syllable,
            units: Number(record.duration_units?.[syllableIndex] ?? (syllableIndex === record.stress_index ? 1.25 : 0.75)),
            stressed: syllableIndex === record.stress_index,
            phonemeKey: record.phoneme_key,
            crown: record.crown,
            meaning: record.meaning
          }))
        });
      } else {
        const syllables = englishSyllables(key);
        const stressIndex = syllables.length <= 2 ? 0 : Math.max(0, syllables.length - 2);
        words.push({
          word: key,
          wordIndex,
          quality: 'derived-english-heuristic',
          syllables: syllables.map((syllable, syllableIndex) => ({
            text: syllable,
            units: syllableIndex === stressIndex ? 1.2 : 0.8,
            stressed: syllableIndex === stressIndex,
            phonemeKey: null,
            crown: null,
            meaning: null
          }))
        });
      }
    });
    return words;
  }

  function foldVoiceFrequency(sourceHz, voice) {
    let midi = hzToMidi(sourceHz);
    const minimum = voice === 'soprano' ? 57 : 47;
    const maximum = voice === 'soprano' ? 76 : 64;
    while (midi < minimum) midi += 12;
    while (midi > maximum) midi -= 12;
    if (voice === 'baritone' && midi > 59) midi -= 12;
    return midiToHz(Math.round(midi));
  }

  function melodicSourceEvents(score, start, end) {
    const narrative = score.events.filter((event) => event.kind === 'note' && event.voice === 'narrative' && event.start >= start && event.start < end);
    if (narrative.length) return narrative;
    return score.events.filter((event) => event.kind === 'note' && event.voice === 'inner' && event.start >= start && event.start < end);
  }

  function lineWeight(line, manifest) {
    return lineWords(line, manifest)
      .flatMap((word) => word.syllables)
      .reduce((sum, syllable) => sum + syllable.units, 0) || 1;
  }

  function buildVocalGuideScore(score, manifest) {
    if (!score?.events?.length) throw new Error('A composed Elara score is required.');
    if (!manifest?.lexicon) throw new Error('The Kelyran Audible Glyph manifest is required.');

    const markers = score.events.filter((event) => event.kind === 'marker');
    const guideEvents = [];
    const lines = [];

    markers.forEach((marker, markerIndex) => {
      const nextStart = markers[markerIndex + 1]?.start ?? score.duration;
      const span = Math.max(0.5, nextStart - marker.start);
      const phraseStart = marker.start + Math.min(2.2, span * 0.075);
      const phraseEnd = nextStart - Math.min(2.2, span * 0.075);
      const lyricLines = marker.lyric || [];
      const weights = lyricLines.map((line) => lineWeight(line, manifest));
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
      let lineCursor = phraseStart;

      lyricLines.forEach((line, lineIndex) => {
        const share = weights[lineIndex] / totalWeight;
        const lineSpan = Math.max(0.35, (phraseEnd - phraseStart) * share);
        const lineEnd = Math.min(phraseEnd, lineCursor + lineSpan);
        const words = lineWords(line, manifest);
        const syllables = words.flatMap((word) => word.syllables.map((syllable, syllableIndex) => ({
          ...syllable,
          word: word.word,
          wordIndex: word.wordIndex,
          wordQuality: word.quality,
          syllableIndex,
          suno: word.suno || null
        })));
        const syllableUnits = syllables.reduce((sum, syllable) => sum + syllable.units, 0) || 1;
        const sourceEvents = melodicSourceEvents(score, marker.start, nextStart);
        let syllableCursor = lineCursor;

        lines.push({
          movementId: marker.movement.id,
          movementTitle: marker.movement.title,
          year: marker.year.year,
          role: line.role,
          language: line.language,
          text: line.text,
          start: lineCursor,
          end: lineEnd,
          quality: line.language === 'kelyran' ? 'canonical-audible-glyph-v0.2' : 'derived-english-heuristic'
        });

        syllables.forEach((syllable, flatIndex) => {
          const duration = Math.max(0.08, (lineEnd - lineCursor) * syllable.units / syllableUnits);
          const source = sourceEvents[flatIndex % Math.max(1, sourceEvents.length)] || { frequency: score.key?.id === 'c-major' ? 523.251 : 493.883 };
          const voices = roleVoices(line.role);
          voices.forEach((voice) => {
            const baseFrequency = foldVoiceFrequency(source.frequency, voice);
            const duetLift = voices.length > 1 && voice === 'soprano' ? Math.pow(2, 3 / 12) : 1;
            const frequency = foldVoiceFrequency(baseFrequency * duetLift, voice);
            guideEvents.push({
              kind: 'vocal-guide',
              voice,
              start: syllableCursor,
              end: Math.max(syllableCursor + 0.07, syllableCursor + duration * 0.92),
              frequency,
              gain: voice === 'soprano' ? 0.044 : 0.052,
              waveform: voice === 'soprano' ? 'sine' : 'triangle',
              pan: voice === 'soprano' ? 0.22 : -0.22,
              syllable: syllable.text,
              word: syllable.word,
              wordIndex: syllable.wordIndex,
              syllableIndex: syllable.syllableIndex,
              stressed: syllable.stressed,
              units: syllable.units,
              phonemeKey: syllable.phonemeKey,
              crown: syllable.crown,
              meaning: syllable.meaning,
              suno: syllable.suno,
              language: line.language,
              sourceQuality: syllable.wordQuality,
              lineText: line.text,
              lineIndex,
              role: line.role,
              movementId: marker.movement.id,
              movementTitle: marker.movement.title,
              year: marker.year.year,
              yearMultiplier: marker.year.multiplier
            });
          });
          syllableCursor += duration;
        });
        lineCursor = lineEnd;
      });
    });

    return {
      schema: 'elara-audible-glyph-vocal-guide/v1',
      version: VERSION,
      sourceScoreSchema: score.schema,
      sourceScoreVersion: score.version,
      manifestVersion: manifest.version,
      seed: score.seed,
      bpm: score.bpm,
      key: score.key,
      language: score.language,
      temporal: score.temporal,
      years: score.years,
      movements: score.movements,
      duration: score.duration,
      lines,
      events: guideEvents.sort((left, right) => left.start - right.start || left.voice.localeCompare(right.voice)),
      provenance: {
        kelyran: 'canonical Kelyran Audible Glyph manifest v0.2',
        english: 'derived syllable estimate; not canonical pronunciation data',
        melody: 'derived from deterministic Elara narrative guide events'
      }
    };
  }

  function guideExportScore(sourceScore, guide, voiceMode) {
    const voices = voiceMode === 'duet' ? ['baritone', 'soprano'] : [voiceMode];
    const markerEvents = sourceScore.events.filter((event) => event.kind === 'marker');
    const noteEvents = guide.events
      .filter((event) => voices.includes(event.voice))
      .map((event) => ({
        kind: 'note',
        voice: event.voice === 'soprano' ? 'narrative' : 'foundation',
        start: event.start,
        end: event.end,
        frequency: event.frequency,
        gain: event.gain,
        waveform: event.waveform,
        pan: event.pan,
        guideVoice: event.voice,
        syllable: event.syllable,
        stressed: event.stressed,
        crown: event.crown,
        sourceQuality: event.sourceQuality
      }));

    return {
      ...sourceScore,
      schema: 'elara-audible-glyph-guide-export/v1',
      version: VERSION,
      events: [...markerEvents, ...noteEvents].sort((left, right) => left.start - right.start || left.kind.localeCompare(right.kind)),
      guideVoiceMode: voiceMode,
      guideManifestVersion: guide.manifestVersion
    };
  }

  async function loadManifest() {
    if (state.manifest) return state.manifest;
    if (state.manifestPromise) return state.manifestPromise;
    const current = document.currentScript?.src || '';
    const url = current ? new URL(MANIFEST_PATH, current).href : MANIFEST_PATH;
    state.manifestPromise = fetch(url, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) throw new Error(`Audible Glyph manifest could not be loaded (${response.status}).`);
        return response.json();
      })
      .then((manifest) => {
        state.manifest = manifest;
        return manifest;
      })
      .finally(() => { state.manifestPromise = null; });
    return state.manifestPromise;
  }

  function currentGuide() {
    const core = window.ElaraComposerCore;
    if (!core) throw new Error('Elara Composer Core is unavailable.');
    if (!state.manifest) throw new Error('Audible Glyph manifest is not ready.');
    const selection = core.getState().selection;
    const sourceScore = core.buildInterpretation(selection);
    const guide = buildVocalGuideScore(sourceScore, state.manifest);
    return { core, selection, sourceScore, guide };
  }

  function safeSlug(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72) || 'elara';
  }

  function downloadBytes(bytes, mime, filename) {
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function guideFilename(selection, voiceMode, extension) {
    return `elara-guide-${safeSlug(voiceMode)}-${safeSlug(selection.key)}-${safeSlug(selection.language)}-${safeSlug(selection.movement)}-${safeSlug(selection.temporal)}-${safeSlug(selection.seed)}.${extension}`;
  }

  async function ensureAudio() {
    if (window.mobiusAudioBus?.ensure) {
      await window.mobiusAudioBus.ensure();
      state.ctx = window.mobiusAudioBus.ctx;
    } else if (!state.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('Web Audio API is unavailable.');
      state.ctx = new AudioContext({ latencyHint: 'interactive' });
    }
    if (state.ctx.state === 'suspended') await state.ctx.resume();
    return state.ctx;
  }

  function trackNode(node) {
    state.activeNodes.add(node);
    node.addEventListener?.('ended', () => state.activeNodes.delete(node), { once: true });
  }

  function guideEnvelope(param, start, end, peak, stressed) {
    const safeEnd = Math.max(start + 0.05, end);
    param.setValueAtTime(0.00001, start);
    param.exponentialRampToValueAtTime(Math.max(0.00002, peak * (stressed ? 1.12 : 1)), start + Math.min(0.045, (safeEnd - start) * 0.3));
    param.setValueAtTime(Math.max(0.00002, peak), Math.max(start + 0.045, safeEnd - 0.1));
    param.exponentialRampToValueAtTime(0.00001, safeEnd);
  }

  async function playGuide(voiceMode = 'duet') {
    feather('Preparing vocal guide…');
    const ctx = await ensureAudio();
    const { guide } = currentGuide();
    const voices = voiceMode === 'duet' ? ['baritone', 'soprano'] : [voiceMode];
    const origin = ctx.currentTime + 0.08;
    guide.events.filter((event) => voices.includes(event.voice)).forEach((event) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const start = origin + event.start;
      const end = origin + event.end;
      osc.type = event.waveform;
      osc.frequency.setValueAtTime(event.frequency, start);
      guideEnvelope(gain.gain, start, end, clamp(event.gain, 0, MAX_GUIDE_GAIN), event.stressed);
      osc.connect(gain);
      if (pan) { pan.pan.value = event.pan; gain.connect(pan); pan.connect(ctx.destination); }
      else gain.connect(ctx.destination);
      osc.start(start); osc.stop(end + 0.03); trackNode(osc);
    });
    if (state.ui) state.ui.status.textContent = `Playing ${voiceMode} guide · ${guide.events.length} Audible Glyph events · ${guide.provenance.kelyran}.`;
  }

  function feather(message = 'Vocal guides feathered.') {
    state.activeNodes.forEach((node) => {
      try { node.stop?.((state.ctx?.currentTime || 0) + 0.01); } catch (error) {}
      try { node.disconnect?.(); } catch (error) {}
    });
    state.activeNodes.clear();
    if (state.ui) state.ui.status.textContent = message;
  }

  function renderGuideSummary() {
    if (!state.ui || !state.manifest) return;
    try {
      const { guide } = currentGuide();
      const canonical = guide.events.filter((event) => event.sourceQuality === 'canonical-audible-glyph-v0.2').length;
      const derived = guide.events.filter((event) => event.sourceQuality === 'derived-english-heuristic').length;
      const missing = guide.events.filter((event) => event.sourceQuality === 'unregistered-kelyran').length;
      state.ui.summary.textContent = JSON.stringify({
        schema: guide.schema,
        manifest: guide.manifestVersion,
        events: guide.events.length,
        firstSoprano: guide.events.filter((event) => event.voice === 'soprano').length,
        baritone: guide.events.filter((event) => event.voice === 'baritone').length,
        canonicalKelyranEvents: canonical,
        derivedEnglishEvents: derived,
        unregisteredKelyranEvents: missing,
        englishBoundary: guide.provenance.english
      }, null, 2);
    } catch (error) {
      state.ui.summary.textContent = `Guide summary unavailable: ${error.message}`;
    }
  }

  function addUi() {
    const card = document.querySelector('[data-elara-composer-card]');
    if (!card || card.querySelector('[data-audible-glyph-vocals]')) return false;
    const panel = document.createElement('section');
    panel.dataset.audibleGlyphVocals = 'true';
    panel.innerHTML = `<h3>Audible Glyph vocal guides</h3><p class="tiny">Kelyran timing comes from the approved v0.2 manifest. English syllables are explicitly labelled as derived estimates until a canonical English pronunciation contract is approved.</p><div class="composer-grid"><label>Guide voice<select data-guide-voice><option value="duet">First soprano + baritone</option><option value="soprano">First soprano</option><option value="baritone">Baritone</option></select></label></div><div class="controls"><button data-guide-play type="button" disabled>Play guide</button><button class="feather" data-guide-feather type="button">Feather guides</button><button data-guide-midi type="button" disabled>Export guide MIDI</button><button data-guide-wav type="button" disabled>Render guide WAV</button></div><p class="status" data-guide-status role="status" aria-live="polite">Loading the canonical Audible Glyph manifest…</p><pre data-guide-summary></pre>`;
    card.appendChild(panel);
    state.ui = {
      panel,
      voice: panel.querySelector('[data-guide-voice]'),
      play: panel.querySelector('[data-guide-play]'),
      feather: panel.querySelector('[data-guide-feather]'),
      midi: panel.querySelector('[data-guide-midi]'),
      wav: panel.querySelector('[data-guide-wav]'),
      status: panel.querySelector('[data-guide-status]'),
      summary: panel.querySelector('[data-guide-summary]')
    };

    state.ui.play.addEventListener('click', () => playGuide(state.ui.voice.value).catch((error) => { state.ui.status.textContent = `Guide playback error: ${error.message}`; }));
    state.ui.feather.addEventListener('click', () => feather());
    state.ui.voice.addEventListener('change', () => { feather('Guide voice changed. Ready.'); renderGuideSummary(); });

    state.ui.midi.addEventListener('click', () => {
      try {
        const exporter = window.ElaraComposerExport;
        if (!exporter) throw new Error('Composer export renderer is unavailable.');
        const { selection, sourceScore, guide } = currentGuide();
        const voiceMode = state.ui.voice.value;
        const exportScore = guideExportScore(sourceScore, guide, voiceMode);
        downloadBytes(exporter.encodeMidi(exportScore), 'audio/midi', guideFilename(selection, voiceMode, 'mid'));
        state.ui.status.textContent = `${voiceMode} guide MIDI exported with lyric and movement metadata.`;
      } catch (error) {
        state.ui.status.textContent = `Guide MIDI error: ${error.message}`;
      }
    });

    state.ui.wav.addEventListener('click', async () => {
      const original = state.ui.wav.textContent;
      try {
        const exporter = window.ElaraComposerExport;
        if (!exporter) throw new Error('Composer export renderer is unavailable.');
        state.ui.wav.disabled = true;
        state.ui.wav.textContent = 'Rendering guide WAV…';
        const { selection, sourceScore, guide } = currentGuide();
        const voiceMode = state.ui.voice.value;
        const exportScore = guideExportScore(sourceScore, guide, voiceMode);
        const bytes = await exporter.renderWav(exportScore, { ...selection, infraMode: 'off', infraGain: 0, masterGain: 0.12 });
        downloadBytes(bytes, 'audio/wav', guideFilename(selection, voiceMode, 'wav'));
        state.ui.status.textContent = `${voiceMode} guide WAV rendered. English timing remains derived when English is selected.`;
      } catch (error) {
        state.ui.status.textContent = `Guide WAV error: ${error.message}`;
      } finally {
        state.ui.wav.disabled = false;
        state.ui.wav.textContent = original;
      }
    });

    window.addEventListener('elara-composer:feather', () => feather('Composer and vocal guides feathered.'));
    card.addEventListener('change', () => window.setTimeout(renderGuideSummary, 0));

    loadManifest().then(() => {
      state.ui.play.disabled = false;
      state.ui.midi.disabled = false;
      state.ui.wav.disabled = false;
      state.ui.status.textContent = 'Canonical Kelyran Audible Glyph manifest v0.2 loaded. Guides are ready.';
      renderGuideSummary();
    }).catch((error) => {
      state.ui.status.textContent = `Audible Glyph manifest error: ${error.message}`;
    });
    return true;
  }

  window.ElaraAudibleGlyphVocals = {
    version: VERSION,
    manifestPath: MANIFEST_PATH,
    loadManifest,
    englishSyllables,
    buildVocalGuideScore,
    guideExportScore,
    playGuide,
    feather,
    getState() {
      return {
        manifestLoaded: Boolean(state.manifest),
        activeNodes: state.activeNodes.size,
        version: VERSION
      };
    }
  };

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (addUi() || attempts > 400) window.clearInterval(timer);
  }, 50);
})();
