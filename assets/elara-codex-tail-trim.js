'use strict';

(function () {
  const BEAT = 60 / 123;

  function rebuildWithTrimmedTails() {
    const api = window.ElaraLiveSmoothing;
    if (!api?.rebuildScore) return false;

    try { api.feather?.(); } catch (error) {}

    const captured = [];
    const originalPush = Array.prototype.push;
    Array.prototype.push = function (...items) {
      items.forEach((item) => {
        if (item && typeof item === 'object' && item.kind === 'tone' && item.chapterNumber != null) captured.push(item);
      });
      return originalPush.apply(this, items);
    };

    try {
      api.rebuildScore();
    } finally {
      Array.prototype.push = originalPush;
    }

    const groups = new Map();
    captured.forEach((event) => {
      const key = `${event.passId || 'pass'}:${event.chapterNumber}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    });

    groups.forEach((events) => {
      const handoffs = events.filter((event) => event.handoff);
      handoffs.forEach((event) => {
        event.end = Math.min(event.end, event.start + BEAT * 0.52);
        event.gainScale *= 0.72;
      });

      const phrase = events
        .filter((event) => !event.handoff)
        .sort((left, right) => left.start - right.start);
      const finalNote = phrase[phrase.length - 1];
      if (finalNote) {
        finalNote.end = Math.min(finalNote.end, finalNote.start + BEAT * 1.08);
        finalNote.gainScale *= 0.84;
      }
    });

    const card = document.querySelector('[data-elara-full-song-card]');
    if (card) card.dataset.elaraTailTrim = 'true';
    const status = card?.querySelector('[data-song-status]');
    if (status) status.textContent = 'E minor voicing ready. Chapter-final notes now release quickly; legato body preserved.';
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    const card = document.querySelector('[data-elara-full-song-card]');
    if (card?.dataset.smoothingHotfix === 'true' && rebuildWithTrimmedTails()) window.clearInterval(timer);
    if (attempts > 400) window.clearInterval(timer);
  }, 50);

  window.ElaraTailTrim = { version: '0.1.0', rebuild: rebuildWithTrimmedTails };
})();
