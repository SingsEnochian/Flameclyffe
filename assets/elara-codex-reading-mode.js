'use strict';

/*
  Elara Codex Reading Mode v0.1
  Lets the source instrument switch between literal source order and the
  labelled narrative-spiral interpretation while keeping both in the receipt.
*/

(function () {
  const KEY = 'starwell.elaraCodex.v0.1.readingMode';
  const MODES = {
    'source-order': {
      id: 'source-order',
      label: 'Source order',
      description: 'The active tones in the order stated or enacted by the original chapter.'
    },
    'narrative-spiral': {
      id: 'narrative-spiral',
      label: 'Narrative spiral order',
      description: 'A labelled structural reading of ground, path, impulse, relation, weave, and crown.'
    }
  };

  let mode = 'source-order';

  function source() {
    return window.ElaraCodexSource || null;
  }

  function chapters() {
    return source()?.chapters || [];
  }

  function read() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && MODES[saved]) return saved;
    } catch (error) {}
    return 'source-order';
  }

  function save(value) {
    try { localStorage.setItem(KEY, value); } catch (error) {}
  }

  function selectedSequence(chapter) {
    if (!chapter) return [];
    return mode === 'narrative-spiral'
      ? (chapter.narrativeToneSequence || chapter.sourceToneSequence || [])
      : (chapter.sourceToneSequence || chapter.toneSequence || []);
  }

  function apply(value = mode) {
    mode = MODES[value] ? value : 'source-order';
    chapters().forEach((chapter) => {
      chapter.toneSequence = selectedSequence(chapter);
      chapter.activeReadingMode = mode;
    });
    save(mode);
    try {
      window.dispatchEvent(new CustomEvent('elara-codex:reading-mode', {
        detail: { mode, definition: MODES[mode] }
      }));
    } catch (error) {}
    return mode;
  }

  function formatTone(tone) {
    return `${tone.label} ${Number(tone.frequencyHz).toFixed(Number.isInteger(Number(tone.frequencyHz)) ? 0 : 2)} Hz`;
  }

  function secondaryText(chapter) {
    const groups = [
      ['Ambient field', chapter?.ambientTones || []],
      ['Awaited response', chapter?.awaitedTones || []],
      ['Next phrase', chapter?.nextTones || []]
    ].filter(([, tones]) => tones.length);
    if (!groups.length) return 'No separate ambient, awaited, or next-phrase tones are marked for this chapter.';
    return groups.map(([label, tones]) => `${label}: ${tones.map(formatTone).join(' → ')}`).join('\n');
  }

  function currentChapter(root) {
    const id = root.querySelector('[data-codex-chapter]')?.value;
    return chapters().find((chapter) => chapter.id === id) || null;
  }

  function rerender(root) {
    const select = root.querySelector('[data-codex-chapter]');
    if (!select) return;
    const chapter = currentChapter(root);
    if (chapter) chapter.toneSequence = selectedSequence(chapter);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function correctReceipt(root, event) {
    const button = event.target.closest?.('[data-codex-copy-math]');
    if (!button || !root.contains(button)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const chapter = currentChapter(root);
    const projection = window.MobiusTemporalProjection?.getState?.() || null;
    const multiplier = Number(projection?.profile?.multiplier || 1);
    const transform = (tones) => (tones || []).map((tone) => ({
      ...tone,
      canonicalHz: tone.frequencyHz,
      renderedHz: Number(tone.frequencyHz) * multiplier,
      harmonics: (projection?.harmonics || []).map((harmonic) => ({
        harmonic,
        frequencyHz: Number(tone.frequencyHz) * multiplier * harmonic
      }))
    }));
    const receipt = {
      schema: 'elara-codex-transformation-receipt/v1',
      source: source()?.source || null,
      chapter: chapter ? {
        id: chapter.id,
        number: chapter.number,
        title: chapter.title,
        pdfPageStart: chapter.pdfPageStart,
        sourceStatus: chapter.sourceStatus,
        mappingStatus: chapter.mappingStatus
      } : null,
      readingMode: MODES[mode],
      sourceToneSequence: transform(chapter?.sourceToneSequence),
      narrativeToneSequence: transform(chapter?.narrativeToneSequence),
      selectedToneSequence: transform(selectedSequence(chapter)),
      ambientTones: transform(chapter?.ambientTones),
      awaitedTones: transform(chapter?.awaitedTones),
      nextTones: transform(chapter?.nextTones),
      projection,
      baseMode: window.ElaraCodexBridge?.readBaseMode?.() || null,
      generatedAt: new Date().toISOString()
    };
    const status = root.querySelector('[data-codex-status]');
    navigator.clipboard?.writeText(JSON.stringify(receipt, null, 2)).then(() => {
      if (status) status.textContent = 'Source, narrative, mathematics, and playback receipt copied.';
    }).catch(() => {
      if (status) status.textContent = 'Could not copy the receipt in this browser.';
    });
  }

  function bind(root) {
    if (!root || root.dataset.codexReadingModeBound === 'true') return false;
    const stack = root.querySelector('.codex-source-card .stack');
    const chapterSelect = root.querySelector('[data-codex-chapter]');
    const mathCard = root.querySelector('.codex-source-math-card');
    if (!stack || !chapterSelect || !mathCard) return false;
    root.dataset.codexReadingModeBound = 'true';

    const label = document.createElement('label');
    label.textContent = 'Tone reading';
    const select = document.createElement('select');
    select.dataset.codexReadingMode = 'true';
    Object.values(MODES).forEach((entry) => {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.label;
      select.appendChild(option);
    });
    select.value = mode;
    label.appendChild(select);

    const baseModeLabel = root.querySelector('[data-codex-base-mode]')?.closest('label');
    if (baseModeLabel) stack.insertBefore(label, baseModeLabel);
    else stack.insertBefore(label, stack.firstChild);

    const modeNote = document.createElement('p');
    modeNote.className = 'tiny';
    modeNote.dataset.codexReadingNote = 'true';
    stack.insertBefore(modeNote, label.nextSibling);

    const secondary = document.createElement('pre');
    secondary.className = 'tiny';
    secondary.dataset.codexSecondaryTones = 'true';
    mathCard.appendChild(secondary);

    function updateSidecar() {
      const chapter = currentChapter(root);
      modeNote.textContent = `${MODES[mode].description} Source order and narrative order remain stored separately.`;
      secondary.textContent = secondaryText(chapter);
    }

    select.addEventListener('change', () => {
      apply(select.value);
      updateSidecar();
      try { window.mobiusAudioBus?.feather?.(); } catch (error) {}
      rerender(root);
    });

    chapterSelect.addEventListener('change', () => {
      const chapter = currentChapter(root);
      if (chapter) chapter.toneSequence = selectedSequence(chapter);
      window.setTimeout(updateSidecar, 0);
    }, true);

    root.addEventListener('click', (event) => correctReceipt(root, event), true);
    window.addEventListener('mobius-temporal-projection:state', updateSidecar);
    window.addEventListener('elara-codex:curated', () => {
      apply(mode);
      rerender(root);
    });

    apply(mode);
    updateSidecar();
    rerender(root);
    return true;
  }

  function boot() {
    mode = read();
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const roots = [...document.querySelectorAll('[data-elara-codex-reader]')];
      const ready = window.ElaraCodexSource?.curationVersion === '0.1.0';
      if (ready) roots.forEach((root) => bind(root));
      if ((ready && roots.length && roots.every((root) => root.dataset.codexReadingModeBound === 'true')) || attempts > 150) {
        window.clearInterval(timer);
      }
    }, 40);
  }

  window.ElaraCodexReadingMode = {
    modes: MODES,
    current: () => mode,
    apply,
    selectedSequence
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
