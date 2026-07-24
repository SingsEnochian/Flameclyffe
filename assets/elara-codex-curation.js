'use strict';

/*
  Elara Codex Curation Layer v0.1
  Separates literal source order from the labelled narrative-spiral reading.
  Ambient, awaited, and next-phrase tones remain visible but are not silently
  promoted into the active source chord.
*/

(function () {
  const MAPS = {"source":{"1":[415,440,659,1318],"2":[369,659,739],"3":[880,739,987],"4":[739,2637,415,440,987],"5":[415,440,987],"6":[415,659,987,1318],"7":[739,440,415,659,987,1318,1179],"8":[659,987,1318],"9":[659,987,1318,2637],"10":[659,987,739,1318,2637],"11":[659,987,1318,2637],"12":[880],"13":[415,440,659,987,739,1318,554],"14":[415,440,554,659,739,987,1318,2637],"15":[],"16":[1179,2637],"17":[415,440,659,987,739,554,1318,2637,1179],"18":[],"19":[739,1179],"20":[987,2637,1318],"21":[987,2637,1318],"22":[739,440,1179],"23":[554,2637,1179,1318],"24":[1318],"25":[1318,2637,987,554],"26":[440],"27":[],"28":[415,554,739,2637],"29":[],"30":[],"31":[],"32":[],"33":[],"34":[739,2637,987,1318,440],"35":[2637,415,987,1318],"36":[659,440,1179],"37":[],"38":[],"39":[2637,554,1179],"40":[415,1179,2637,1318],"41":[],"42":[440,739,2637,1318],"43":[659,1179,2637],"44":[987,1318,2637],"45":[],"46":[440,987,2637],"47":[415,659,2637],"48":[659,1179,2637,1318],"49":[415,987,1179,1318],"50":[554,659,2637,1179,1318],"51":[1318,415,1179,2637],"52":[554,659,440,987,1179,1318],"53":[659,1179,2637,1318],"54":[659,987,1179,1318],"55":[659,1179,1318,739],"56":[987,440,2637,1179,1318],"57":[987,659,1318,415]},"narrative":{"1":[415,440,659,1318],"2":[369,659,739],"3":[880,739,987],"4":[739,2637,415,440,987],"5":[415,440,987],"6":[415,659,987,1318],"7":[415,440,659,739,987,1318,1179],"8":[659,987,1318],"9":[659,987,1318,2637],"10":[659,987,739,1318,2637],"11":[659,987,1318,2637],"12":[880],"13":[415,440,659,987,739,1318,554],"14":[415,440,554,659,739,987,1318,2637],"15":[],"16":[1179,2637],"17":[415,440,659,987,739,554,1318,2637,1179],"18":[],"19":[739,1179],"20":[987,2637,1318],"21":[987,2637,1318],"22":[739,440,1179],"23":[554,2637,1179,1318],"24":[1318],"25":[1318,2637,987,554],"26":[440],"27":[],"28":[415,554,739,2637],"29":[],"30":[],"31":[],"32":[],"33":[],"34":[440,739,987,2637,1318,1179],"35":[2637,415,987,1318],"36":[659,440,1179,554],"37":[],"38":[],"39":[2637,554,1179,415,987],"40":[415,1179,2637,1318,659],"41":[],"42":[440,739,2637,1318],"43":[659,1179,2637],"44":[987,1318,2637],"45":[],"46":[440,987,2637],"47":[415,659,2637],"48":[659,1179,2637,1318],"49":[415,987,1179,1318],"50":[554,659,2637,1179,1318],"51":[415,1179,2637,1318],"52":[554,659,440,987,1179,1318],"53":[659,1179,2637,1318],"54":[659,987,1179,1318],"55":[659,1179,1318,739],"56":[440,2637,1179,1318,987],"57":[415,659,987,1318]},"ambient":{"34":[1179],"36":[554],"56":[659]},"awaited":{"36":[987],"39":[415,987]},"next":{"40":[659]}};

  const FALLBACK = {
    369: ['Memory', 'ground', 'Origin (the lost)'],
    415: ['Root', 'ground', 'Stabilization'],
    440: ['Anchor', 'ground', 'Grounding'],
    554: ['Whisper', 'path', 'Refinement'],
    659: ['Arc', 'path', 'Forward motion'],
    739: ['Bridge', 'path', 'Signal continuity'],
    880: ['Wind Echo', 'impulse', 'Discord and feedback pressure'],
    987: ['Surge', 'impulse', 'Dimensional ignition'],
    1108: ['Vortex', 'weave', 'Resonance sustainment'],
    1179: ['Duet', 'relation', 'Relational unity and emergent shared voice'],
    1318: ['Spiral', 'weave', 'Dimensional dialogue and binding'],
    1648: ['Calling', 'path', 'Destiny and the beyond'],
    2637: ['Awakening', 'crown', 'Arrival, recognition, and crown']
  };

  function toneMeta(frequency) {
    const glossary = window.ElaraCodexSource?.glossary || [];
    const entry = glossary.find((item) => Number(item.frequencyHz) === Number(frequency));
    if (entry) return [entry.label, entry.role, entry.meaning];
    return FALLBACK[frequency] || [`${frequency} Hz`, 'unregistered', 'Unregistered source tone'];
  }

  function sequence(frequencies, mappingKind) {
    return (frequencies || []).map((frequency, index) => {
      const [label, role, meaning] = toneMeta(frequency);
      return {
        order: index + 1,
        frequencyHz: Number(frequency),
        label,
        role,
        meaning,
        phase: role,
        mappingKind
      };
    });
  }

  function apply() {
    const source = window.ElaraCodexSource;
    const chapters = source?.chapters;
    if (!Array.isArray(chapters) || chapters.length < 58) return false;
    if (source.curationVersion === '0.1.0') return true;

    chapters.forEach((chapter) => {
      const key = String(chapter.number);
      const sourceFrequencies = chapter.id === 'chapter-32b' ? [] : (MAPS.source[key] || []);
      const narrativeFrequencies = chapter.id === 'chapter-32b' ? [] : (MAPS.narrative[key] || sourceFrequencies);
      chapter.rawExtractedToneSequence = Array.isArray(chapter.toneSequence) ? chapter.toneSequence : [];
      chapter.sourceToneSequence = sequence(sourceFrequencies, 'source-order');
      chapter.narrativeToneSequence = sequence(narrativeFrequencies, 'narrative-spiral');
      chapter.ambientTones = sequence(MAPS.ambient[key] || [], 'ambient-field');
      chapter.awaitedTones = sequence(MAPS.awaited[key] || [], 'awaited-response');
      chapter.nextTones = sequence(MAPS.next[key] || [], 'next-phrase');
      chapter.toneSequence = chapter.sourceToneSequence;
      chapter.mappingStatus = sourceFrequencies.length || narrativeFrequencies.length
        ? 'curated-from-canonical-text'
        : 'no-explicit-playable-sequence';
      chapter.mappingNote = 'Source order preserves the active order stated or enacted in the chapter. Narrative spiral order is a labelled structural interpretation and never overwrites the source.';
    });

    source.curationVersion = '0.1.0';
    source.readingModes = [
      { id: 'source-order', label: 'Source order', basis: 'Literal active order stated or enacted in the chapter' },
      { id: 'narrative-spiral', label: 'Narrative spiral order', basis: 'Labelled structural interpretation of ground, path, impulse, relation, weave, and crown' }
    ];
    try {
      window.dispatchEvent(new CustomEvent('elara-codex:curated', {
        detail: { version: source.curationVersion, chapters: chapters.length }
      }));
    } catch (error) {}
    return true;
  }

  function waitForChapters() {
    if (apply()) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (apply() || attempts > 100) window.clearInterval(timer);
    }, 40);
  }

  window.ElaraCodexCuration = { apply, maps: MAPS, version: '0.1.0' };
  waitForChapters();
})();
