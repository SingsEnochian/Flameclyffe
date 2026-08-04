'use strict';

/*
  Elara Codex Source Bridge v0.1
  Joins immutable source text to narrative interpretation, explicit mathematics,
  and consented Möbius playback. Opening a chapter changes context only; sound
  begins only after a user gesture through the existing Wake/Run controls.
*/

(function () {
  const CHANNEL = 'elara-codex';
  const CHAPTER_KEY = 'starwell.elaraCodex.v0.1.openChapter';
  const BASE_MODE_KEY = 'starwell.elaraCodex.v0.1.baseMode';
  const MODE_PREFIX = 'elara-source-chapter:';

  const ROUTES = {
    Memory: ['return'],
    Root: ['centre'],
    Anchor: ['centre'],
    Whisper: ['return'],
    Arc: ['left'],
    Bridge: ['left', 'return'],
    'Wind Echo': ['right'],
    Surge: ['left'],
    Vortex: ['centre', 'return'],
    Duet: ['left', 'right'],
    Spiral: ['centre', 'return'],
    Calling: ['right'],
    Awakening: ['centre']
  };

  const ROLE_GAIN = {
    ground: 0.010,
    path: 0.0085,
    impulse: 0.0075,
    relation: 0.0065,
    weave: 0.0055,
    crown: 0.0038,
    unregistered: 0.0045
  };

  function source() {
    return window.ElaraCodexSource || null;
  }

  function chapters() {
    return source()?.chapters || [];
  }

  function findChapter(id) {
    return chapters().find((chapter) => chapter.id === id) || null;
  }

  function initialChapter() {
    try {
      const saved = localStorage.getItem(CHAPTER_KEY);
      if (saved && findChapter(saved)) return findChapter(saved);
    } catch (error) {}
    return chapters().find((chapter) => chapter.number === 1) || chapters()[0] || null;
  }

  function saveChapter(id) {
    if (!findChapter(id)) return;
    try { localStorage.setItem(CHAPTER_KEY, id); } catch (error) {}
  }

  function readBaseMode() {
    try {
      const saved = localStorage.getItem(BASE_MODE_KEY);
      if (['chapter-only', 'full-twist', 'layered-full-twist'].includes(saved)) return saved;
    } catch (error) {}
    return 'layered-full-twist';
  }

  function saveBaseMode(mode) {
    const clean = ['chapter-only', 'full-twist', 'layered-full-twist'].includes(mode) ? mode : 'layered-full-twist';
    try { localStorage.setItem(BASE_MODE_KEY, clean); } catch (error) {}
    return clean;
  }

  function activeProjection() {
    return window.MobiusTemporalProjection?.getState?.() || {
      profile: { id: 'canonical-2025', label: 'Canonical 2025 · ×1.00', multiplier: 1 },
      harmonics: [],
      harmonicMix: 0,
      formula: 'f_rendered = f_canonical'
    };
  }

  function projectedRows(chapter) {
    const projection = activeProjection();
    const harmonics = projection.harmonics || [];
    return (chapter?.toneSequence || []).map((tone) => {
      const projected = Number(tone.frequencyHz) * Number(projection.profile.multiplier || 1);
      return {
        order: tone.order,
        label: tone.label,
        role: tone.role,
        meaning: tone.meaning,
        canonicalHz: tone.frequencyHz,
        projectedHz: projected,
        harmonics: harmonics.map((n) => ({ harmonic: n, frequencyHz: projected * n }))
      };
    });
  }

  function broadcast(type, payload) {
    try {
      const channel = new BroadcastChannel(CHANNEL);
      channel.postMessage({ type, payload });
      channel.close();
    } catch (error) {}
    try { window.dispatchEvent(new CustomEvent(type, { detail: payload })); } catch (error) {}
  }

  function openChapter(chapter) {
    if (!chapter) return;
    saveChapter(chapter.id);
    const payload = {
      chapterId: chapter.id,
      chapterNumber: chapter.number,
      title: chapter.title,
      sourceStatus: chapter.sourceStatus,
      pdfPageStart: chapter.pdfPageStart,
      toneSequence: chapter.toneSequence,
      projection: activeProjection()
    };
    broadcast('elara-codex:chapter-open', payload);
  }

  function routeList(tone) {
    return ROUTES[tone.label] || ['centre'];
  }

  function renderToneLayers(frequency, gain) {
    if (window.MobiusTemporalProjection?.renderLayers) {
      return window.MobiusTemporalProjection.renderLayers(frequency, gain);
    }
    return [{ harmonic: 1, frequency, gain }];
  }

  function scheduleChapterTone(bus, tone, options) {
    const now = bus.ctx.currentTime;
    const onset = now + Math.max(0, Number(options.delay) || 0);
    const held = Boolean(options.held);
    const end = held ? Number.POSITIVE_INFINITY : now + Math.max(0.8, Number(options.duration) || bus.testSeconds || 2);
    const routes = routeList(tone);
    const roleGain = ROLE_GAIN[tone.role] || ROLE_GAIN.unregistered;
    const baseGain = roleGain / Math.max(1, Math.sqrt((Number(options.count) || 1) * routes.length));
    const layers = renderToneLayers(tone.frequencyHz, baseGain);

    layers.forEach((layer) => {
      routes.forEach((route) => {
        const osc = bus.ctx.createOscillator();
        const gain = bus.ctx.createGain();
        const attack = Math.min(0.14, 0.045 + (Number(options.delay) || 0) * 0.08);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(layer.frequency, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.setValueAtTime(0.0001, onset);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, layer.gain), onset + attack);
        if (!held) gain.gain.setTargetAtTime(0.0001, Math.max(onset + attack + 0.08, end - 0.22), 0.055);
        osc.connect(gain);
        gain.connect(bus.routeFor(route));
        osc.start(now);
        if (!held) osc.stop(end + 0.12);
        bus.activeSources.push(osc, gain);
      });
    });
  }

  function install(MobiusAudioBus) {
    if (!MobiusAudioBus || MobiusAudioBus.prototype.__elaraCodexSourceV01) return;
    const proto = MobiusAudioBus.prototype;
    const originalOneShot = proto.runOneShotMode;
    const originalHeld = proto.runHeldMode;
    const originalGetState = proto.getState;

    proto.playElaraSourceChapter = function playElaraSourceChapter(chapter, { held = false } = {}) {
      if (!chapter || !this.ctx) return false;
      const tones = chapter.toneSequence || [];
      const baseMode = readBaseMode();

      if (baseMode === 'full-twist') (held ? originalHeld : originalOneShot).call(this, 'full-twist');
      if (baseMode === 'layered-full-twist' && typeof this.runLayeredFullTwist === 'function') {
        this.runLayeredFullTwist({ held, includeSelectedTwistTones: false });
      }

      const duration = held ? Math.max(2.4, tones.length * 0.38 + 1.4) : Math.max(1.2, this.testSeconds || 2);
      const step = held ? 0.38 : Math.max(0.14, Math.min(0.48, duration / Math.max(3.5, tones.length + 1)));
      tones.forEach((tone, index) => scheduleChapterTone(this, tone, {
        held,
        delay: index * step,
        duration,
        count: tones.length
      }));

      this.lastCodexChapter = chapter.id;
      this.lastCodexChapterTitle = chapter.title;
      this.lastCodexChapterNumber = chapter.number;
      this.lastCodexSourceHash = source()?.source?.textSha256 || null;
      this.lastCodexBaseMode = baseMode;
      this.emitState(`${MODE_PREFIX}${chapter.id}`);
      return tones.length > 0 || baseMode !== 'chapter-only';
    };

    proto.runOneShotMode = function runOneShotMode(mode) {
      if (typeof mode === 'string' && mode.startsWith(MODE_PREFIX)) {
        return this.playElaraSourceChapter(findChapter(mode.slice(MODE_PREFIX.length)), { held: false });
      }
      return originalOneShot.call(this, mode);
    };

    proto.runHeldMode = function runHeldMode(mode) {
      if (typeof mode === 'string' && mode.startsWith(MODE_PREFIX)) {
        return this.playElaraSourceChapter(findChapter(mode.slice(MODE_PREFIX.length)), { held: true });
      }
      return originalHeld.call(this, mode);
    };

    proto.getState = function getState(reason = 'state') {
      return {
        ...originalGetState.call(this, reason),
        codexSource: {
          chapterId: this.lastCodexChapter || null,
          chapterNumber: this.lastCodexChapterNumber || null,
          chapterTitle: this.lastCodexChapterTitle || null,
          sourceSha256: this.lastCodexSourceHash || source()?.source?.textSha256 || null,
          baseMode: this.lastCodexBaseMode || readBaseMode()
        }
      };
    };

    proto.__elaraCodexSourceV01 = true;
  }

  function formatHz(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return Number.isInteger(number) ? `${number} Hz` : `${number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')} Hz`;
  }

  function buildChapterOptions(select, selectedId) {
    select.replaceChildren();
    chapters().forEach((chapter) => {
      const option = document.createElement('option');
      option.value = chapter.id;
      const variant = chapter.variant > 1 ? ` · variant ${chapter.variant}` : '';
      option.textContent = `${chapter.number}. ${chapter.title}${variant}`;
      select.appendChild(option);
    });
    if (findChapter(selectedId)) select.value = selectedId;
  }

  function renderMath(container, chapter) {
    const projection = activeProjection();
    const rows = projectedRows(chapter);
    container.replaceChildren();

    const summary = document.createElement('p');
    summary.className = 'tiny';
    summary.textContent = `${projection.profile.label}. ${source()?.mathematics?.projection || 'f_year = f_canonical × multiplier'}; ${source()?.mathematics?.harmonics || 'h_n = n × f_year'}.`;
    container.appendChild(summary);

    if (!rows.length) {
      const empty = document.createElement('p');
      empty.className = 'tiny';
      empty.textContent = 'No explicit tone sequence was extracted from this source section.';
      container.appendChild(empty);
      return;
    }

    const table = document.createElement('table');
    table.className = 'codex-math-table';
    table.innerHTML = '<thead><tr><th>Order</th><th>Narrative tone</th><th>Canonical</th><th>Rendered</th><th>Harmonics</th></tr></thead>';
    const body = document.createElement('tbody');
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      const harmonicText = row.harmonics.length
        ? row.harmonics.map((item) => `${item.harmonic}× ${formatHz(item.frequencyHz)}`).join(' · ')
        : 'fundamental only';
      tr.innerHTML = `<td>${row.order}</td><td><strong>${row.label}</strong><br><span>${row.role} · ${row.meaning}</span></td><td>${formatHz(row.canonicalHz)}</td><td>${formatHz(row.projectedHz)}</td><td>${harmonicText}</td>`;
      body.appendChild(tr);
    });
    table.appendChild(body);
    container.appendChild(table);
  }

  function readerMarkup(compact = false) {
    const sourcePanel = compact
      ? `<p class="tiny" data-codex-evidence></p><p><a class="btn" data-codex-open-source target="_blank" rel="noopener">Open complete original Codex</a></p>`
      : `<p class="tiny" data-codex-evidence></p><iframe class="codex-source-frame" data-codex-source-frame title="The original Elara Codex document"></iframe><p><a class="btn" data-codex-open-source target="_blank" rel="noopener">Open original in Google Drive</a></p>`;
    return `
      <article class="card codex-source-card">
        <h2>The Elara Codex · source instrument</h2>
        <p data-codex-provenance></p>
        <div class="stack">
          <label>Open chapter<select data-codex-chapter></select></label>
          <label>Sound foundation
            <select data-codex-base-mode>
              <option value="chapter-only">Chapter tones only</option>
              <option value="full-twist">Full Twist + chapter</option>
              <option value="layered-full-twist">Layered Full Twist + chapter</option>
            </select>
          </label>
          <div class="controls">
            <button class="primary" data-action="run" data-codex-run type="button">Sound opened chapter</button>
            <button data-codex-copy-math type="button">Copy transformation receipt</button>
          </div>
          <p class="status" data-codex-status role="status" aria-live="polite"></p>
        </div>
      </article>
      <article class="card codex-source-text-card">
        <h2 data-codex-heading></h2>
        <p class="tiny" data-codex-source-meta></p>
        ${sourcePanel}
      </article>
      <article class="card codex-source-math-card">
        <h2>Narrative glyph mathematics</h2>
        <div data-codex-math></div>
      </article>
    `;
  }

  function bindReader(root) {
    if (!root || root.dataset.codexBound === 'true') return;
    root.dataset.codexBound = 'true';
    const compact = root.dataset.elaraCodexReader === 'compact';
    root.innerHTML = readerMarkup(compact);

    const chapterSelect = root.querySelector('[data-codex-chapter]');
    const baseMode = root.querySelector('[data-codex-base-mode]');
    const run = root.querySelector('[data-codex-run]');
    const heading = root.querySelector('[data-codex-heading]');
    const sourceMeta = root.querySelector('[data-codex-source-meta]');
    const evidence = root.querySelector('[data-codex-evidence]');
    const sourceFrame = root.querySelector('[data-codex-source-frame]');
    const openSource = root.querySelector('[data-codex-open-source]');
    const math = root.querySelector('[data-codex-math]');
    const status = root.querySelector('[data-codex-status]');
    const provenance = root.querySelector('[data-codex-provenance]');
    const copy = root.querySelector('[data-codex-copy-math]');

    const first = initialChapter();
    buildChapterOptions(chapterSelect, first?.id);
    baseMode.value = readBaseMode();
    provenance.textContent = `Canonical source: ${source()?.source?.driveTitle || source()?.title}. SHA-256 ${source()?.source?.textSha256 || 'unavailable'}. The original Drive document is displayed directly; projection never rewrites it.`;
    if (sourceFrame) sourceFrame.src = source()?.source?.drivePreviewUrl || '';
    if (openSource) openSource.href = source()?.source?.driveOpenUrl || source()?.source?.drivePreviewUrl || '#';

    function render(chapter) {
      if (!chapter) return;
      chapterSelect.value = chapter.id;
      run.dataset.mode = `${MODE_PREFIX}${chapter.id}`;
      run.disabled = !(chapter.toneSequence || []).length && baseMode.value === 'chapter-only';
      heading.textContent = `${chapter.number}. ${chapter.title}`;
      sourceMeta.textContent = `PDF page ${chapter.pdfPageStart || 'unknown'} · ${chapter.sourceStatus} · ${chapter.toneSequence.length} extracted tone${chapter.toneSequence.length === 1 ? '' : 's'}`;
      if (evidence) evidence.textContent = chapter.toneEvidence
        ? `Tone evidence from the source: ${chapter.toneEvidence}`
        : '[No text-line tone evidence was extracted for this section. The original document remains open beside the mapping.]';
      renderMath(math, chapter);
      status.textContent = `${chapter.title} opened. Context connected; audio remains stopped until Sound opened chapter is pressed.`;
      openChapter(chapter);
    }

    chapterSelect.addEventListener('change', () => render(findChapter(chapterSelect.value)));
    baseMode.addEventListener('change', () => {
      saveBaseMode(baseMode.value);
      render(findChapter(chapterSelect.value));
      try { window.mobiusAudioBus?.feather?.(); } catch (error) {}
    });
    copy.addEventListener('click', async () => {
      const chapter = findChapter(chapterSelect.value);
      const receipt = {
        source: source()?.source,
        chapter: { id: chapter?.id, number: chapter?.number, title: chapter?.title, pdfPageStart: chapter?.pdfPageStart },
        narrativeToneSequence: chapter?.toneSequence || [],
        projection: activeProjection(),
        transformedTones: projectedRows(chapter),
        baseMode: readBaseMode(),
        generatedAt: new Date().toISOString()
      };
      try {
        await navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
        status.textContent = 'Transformation receipt copied.';
      } catch (error) {
        status.textContent = 'Could not copy the receipt in this browser.';
      }
    });

    window.addEventListener('mobius-temporal-projection:state', () => render(findChapter(chapterSelect.value)));
    render(first);
  }

  function injectToneLabCard() {
    const lab = document.querySelector('[data-mobius-lab]');
    const grid = lab?.querySelector('.grid');
    if (!lab || !grid || lab.querySelector('[data-elara-codex-reader]')) return;
    const host = document.createElement('section');
    host.dataset.elaraCodexReader = 'compact';
    host.className = 'codex-reader-grid';
    grid.appendChild(host);
    bindReader(host);
  }

  function ensureStyles() {
    if (document.getElementById('elara-codex-bridge-styles')) return;
    const style = document.createElement('style');
    style.id = 'elara-codex-bridge-styles';
    style.textContent = '.codex-reader-grid{display:contents}.codex-source-text{white-space:pre-wrap;max-height:36rem;overflow:auto}.codex-source-frame{width:100%;min-height:36rem;border:1px solid rgba(232,200,120,.18);border-radius:16px;background:#fff}.codex-math-table{width:100%;border-collapse:collapse;font-size:.82rem}.codex-math-table th,.codex-math-table td{padding:.55rem;border-bottom:1px solid rgba(232,200,120,.16);vertical-align:top;text-align:left}.codex-math-table span{opacity:.72}.codex-source-card,.codex-source-text-card,.codex-source-math-card{min-width:0}';
    document.head.appendChild(style);
  }

  function boot() {
    ensureStyles();
    install(window.MobiusAudioBus);
    const explicit = document.querySelector('[data-elara-codex-reader]');
    if (explicit) bindReader(explicit);
    else injectToneLabCard();
  }

  window.ElaraCodexBridge = {
    source,
    chapters,
    findChapter,
    openChapter,
    projectedRows,
    install,
    modePrefix: MODE_PREFIX,
    readBaseMode,
    saveBaseMode
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
