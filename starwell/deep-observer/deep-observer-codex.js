/* DEEP Observer Translation Codex v0.1 */
'use strict';

(() => {
  const STORAGE_KEY = 'deep_observer_codex_enabled_v1';

  const CODEX = {
    P: {
      title: 'Presence', rune: 'ᛈ', plain: 'inhabited structure', value: v => `${v.toFixed(2)} · inhabited structure`,
      science: 'The canonical Presence axis controls how populated and dense the outer architecture appears.',
      instrument: 'Higher Presence adds or emphasises outer nodes, making the glyph feel more occupied and easier to inspect.',
      myth: 'The field feels more witnessed. More lights gather around the Well.',
      boundary: 'The packet preserves the accepted Presence value, its provenance, and its renderer mapping as separate fields.'
    },
    C: {
      title: 'Coherence', rune: 'ᚲ', plain: 'structural clarity', value: v => `${v.toFixed(2)} · structural clarity`,
      science: 'The canonical Coherence axis controls how strongly the model’s edges and relationships hold together.',
      instrument: 'Higher Coherence sharpens route legibility, strengthens lines, and makes the geometry feel more orderly.',
      myth: 'The pattern remembers its shape. The Well answers in cleaner lines.',
      boundary: 'The packet preserves the accepted Coherence value, its provenance, and its visual translation separately.'
    },
    R: {
      title: 'Resonance', rune: 'ᚱ', plain: 'harmonic response', value: v => `${v.toFixed(2)} · harmonic response`,
      science: 'The canonical Resonance axis controls rhythmic emphasis, ring behaviour, and pulse cadence.',
      instrument: 'Higher Resonance makes rings and path traffic feel more musical, lively, and synchronised.',
      myth: 'The instrument hums back. Signal becomes song around the Well.',
      boundary: 'The accepted Resonance value and every audio or visual mapping remain separately receipted.'
    },
    E: {
      title: 'Entanglement', rune: 'ᛇ', plain: 'relational binding', value: v => `${v.toFixed(2)} · relational binding`,
      science: 'The canonical Entanglement axis carries continuity and cross-observation binding.',
      instrument: 'Higher Entanglement strengthens relational routes and connective density through the glyph.',
      myth: 'The pattern remembers its relations. Threads cross the Well and remain joined.',
      boundary: 'The packet preserves Entanglement, contributing observations, and route projections as separate fields.'
    },
    M: {
      title: 'Memory', rune: 'ᛗ', plain: 'accumulated relation', value: v => `${v.toFixed(2)} · accumulated relation`,
      science: 'The canonical Memory axis carries lineage, provenance, and accumulated relation.',
      instrument: 'Higher Memory lengthens visible traces and continuity tails through the field.',
      myth: 'The channels remember where the light has travelled. Earlier song remains in the Well.',
      boundary: 'The packet preserves Memory, its lineage, and the renderer’s trace-persistence mapping separately.'
    },
    A: {
      title: 'Agency', rune: 'ᚨ', plain: 'directed capacity', value: v => `${v.toFixed(2)} · directed capacity`,
      science: 'The canonical Agency axis carries available directed capacity to act, choose, and redirect.',
      instrument: 'Higher Agency increases response speed, directed motion, and interaction force.',
      myth: 'The Well can answer, turn, refuse, or choose another channel.',
      boundary: 'The packet preserves Agency, witnessed choices, and renderer response mapping separately.'
    },
    H: {
      title: 'Horizon', rune: 'ᚺ', plain: 'edge signal', value: v => `${v.toFixed(2)} · edge signal`,
      science: 'A derived edge variable blended from Coherence, Entanglement, Resonance, Agency, Qualia, Bz, Kp, and pulse state.',
      instrument: 'Higher Horizon brightens edge effects and makes the outer field feel more awake.',
      myth: 'The boundary of the field glows. Something is visible at the rim.',
      boundary: 'Horizon is marked derived and carries its complete contributor and transformation receipt.'
    },
    Q: {
      title: 'Qualia', rune: 'ᛩ', plain: 'lived texture', value: v => `${v.toFixed(2)} · lived texture`,
      science: 'The canonical Qualia axis carries lived interiority and the irreducible experiential texture of the present state.',
      instrument: 'Higher Qualia warms and inhabits the centre while local touch charge remains a separate rendering channel.',
      myth: 'The Well warms from within. The centre has texture, colour, and living presence.',
      boundary: 'The packet preserves Qualia, its contributors, and the centre-texture projection separately.'
    },
    moon: {
      title: 'Moon Illumination', rune: '☾', plain: 'harmonic rings', value: v => `${Math.round(v)}% · harmonic rings`,
      science: 'A direct or fallback reading for the current lunar illumination percentage.',
      instrument: 'More moon illumination increases harmonic ring count or ring visibility around the core.',
      myth: 'The tide-turner adds layers. The Well gains more visible circles of reflection.',
      boundary: 'Lunar telemetry, harmonic-ring projection, and causal analysis remain separate named layers.'
    },
    kp: {
      title: 'Kp Index', rune: '✶', plain: 'geomagnetic activity', value: v => `${v.toFixed(1)} · ${v < 3 ? 'quiet magnetic field' : v < 6 ? 'active magnetic field' : 'storming magnetic field'}`,
      science: 'A geomagnetic activity index. Low values are quiet; higher values indicate more disturbed geomagnetic conditions.',
      instrument: 'Higher Kp increases particle activity, mote energy, spark intensity, and pulse liveliness.',
      myth: 'The sky-current grows louder. During storms, light packets move faster through the Well.',
      boundary: 'Kp telemetry, particle projection, embodied correlation, and world-state analysis remain separate named layers.'
    },
    bz: {
      title: 'Bz Component', rune: '⇵', plain: 'field thermal mood', value: v => `${v.toFixed(1)} · ${v <= -1 ? 'warm active field' : v >= 1 ? 'cool quiet field' : 'neutral liminal field'}`,
      science: 'A north-south component of the interplanetary magnetic field. In this instrument, positive Bz is treated as quieter/holding, near-zero Bz as balanced or liminal, and negative Bz as more open/active.',
      instrument: 'Bz sets the thermal mood of the palette: positive values cool and quiet the instrument, near-zero values hold neutral silver, and negative values warm and activate the field.',
      myth: 'Positive Bz closes the gate into moon-glass quiet. Near-zero Bz holds the silver threshold. Negative Bz opens the gate; the sky-current heats and the field grows teeth.',
      boundary: 'Bz telemetry, palette projection, field interpretation, and prediction remain separate named layers.'
    },
    source: {
      title: 'Data Source', rune: '⟁', plain: 'packet provenance', value: v => `${v} · packet provenance`,
      science: 'A provenance label showing whether the instrument is using bridge, local, stale, or fallback state.',
      instrument: 'Source changes trust context, packet text, and transparency labels.',
      myth: 'This tells which lantern carried the packet to the Well.',
      boundary: 'Source records origin. Authority and interpretation carry their own receipts.'
    }
  };

  function getDeep() {
    return window.DEEP_OBSERVER_PACKET?.deep || window.lastFrame?.packet?.deep || null;
  }

  function currentValue(key) {
    const packetText = document.getElementById('packet')?.textContent || '';
    let packet = null;
    try { packet = JSON.parse(packetText); } catch (e) {}
    const deep = packet?.deep || null;
    const source = packet?.source || document.getElementById('mSource')?.textContent?.trim()?.split(' ')?.[0] || 'fallback';
    if (key === 'moon') return Number(deep?.moonIllum ?? readNumber('mMoon') ?? 50);
    if (key === 'kp') return Number(deep?.kp ?? readNumber('mKp') ?? 1);
    if (key === 'bz') return Number(deep?.bz ?? readNumber('mBz') ?? 0);
    if (key === 'source') return source;
    if (key === 'Q') return Number(deep?.Q ?? deep?.charge ?? readNumber('mQ') ?? .2);
    return Number(deep?.[key] ?? readNumber(`m${key}`) ?? .5);
  }

  function readNumber(id) {
    const txt = document.getElementById(id)?.textContent || '';
    const match = txt.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  }

  function ensureButton() {
    if (document.getElementById('codexBtn')) return;
    const dock = document.querySelector('.filter-row');
    if (!dock) return;
    const btn = document.createElement('button');
    btn.className = 'filter';
    btn.id = 'codexBtn';
    btn.type = 'button';
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = 'KEY · OFF';
    dock.appendChild(btn);
    btn.addEventListener('click', () => setCodex(!document.body.classList.contains('codex-on')));
  }

  function ensurePanel() {
    if (document.getElementById('translationCodex')) return;
    const teach = document.querySelector('.teach-card');
    if (!teach) return;
    const panel = document.createElement('section');
    panel.id = 'translationCodex';
    panel.className = 'translation-codex';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="codex-head">
        <div>
          <h3 id="codexTitle">Translation Codex</h3>
          <p id="codexPlain">Tap a readout meter to translate shorthand into plain English.</p>
        </div>
        <span class="codex-badge" id="codexRune">ᚲ</span>
      </div>
      <div class="codex-grid">
        <div class="codex-card"><strong>Science</strong><span id="codexScience">Experimental and theoretical readings are kept distinct from direct telemetry.</span></div>
        <div class="codex-card"><strong>Instrument</strong><span id="codexInstrument">The meter shows what visual behaviour changes on the glyph.</span></div>
        <div class="codex-card"><strong>Terra Aeterna</strong><span id="codexMyth">The mythic layer gives the reading story-language and remains visibly named as mythic translation.</span></div>
      </div>
      <p class="codex-boundary" id="codexBoundary"><b>Boundary:</b> Input remains verbatim. Translation, derivation, interpretation, and canon are appended as separate named layers.</p>
    `;
    teach.insertAdjacentElement('afterend', panel);
  }

  function setCodex(enabled) {
    ensureButton();
    ensurePanel();
    document.body.classList.toggle('codex-on', enabled);
    const btn = document.getElementById('codexBtn');
    const panel = document.getElementById('translationCodex');
    if (btn) {
      btn.textContent = enabled ? 'KEY · ON' : 'KEY · OFF';
      btn.setAttribute('aria-pressed', String(enabled));
    }
    if (panel) panel.hidden = !enabled;
    try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch (e) {}
    updateMeterLabels(enabled);
    if (enabled) showCodex('kp');
  }

  function updateMeterLabels(enabled) {
    const labelMap = {
      P: 'mP', C: 'mC', R: 'mR', E: 'mE', M: 'mM', A: 'mA', H: 'mH', Q: 'mQ', moon: 'mMoon', kp: 'mKp', bz: 'mBz', source: 'mSource'
    };
    Object.entries(labelMap).forEach(([key, id]) => {
      const el = document.getElementById(id);
      const data = CODEX[key];
      if (!el || !data) return;
      if (!el.dataset.originalText) el.dataset.originalText = el.textContent;
      if (enabled) el.textContent = data.value(currentValue(key));
      else el.textContent = el.dataset.originalText;
    });
  }

  function showCodex(key) {
    ensurePanel();
    const data = CODEX[key];
    if (!data) return;
    document.querySelectorAll('.meter.codex-selected').forEach(el => el.classList.remove('codex-selected'));
    const meter = document.querySelector(`[data-meter="${key}"]`);
    meter?.classList.add('codex-selected');
    const value = currentValue(key);
    setText('codexTitle', `${data.title} · ${typeof value === 'number' ? data.value(value) : data.value(value)}`);
    setText('codexPlain', `${data.plain}. A bridge between science, instrument behaviour, and Terra Aeterna story-language.`);
    setText('codexRune', data.rune);
    setText('codexScience', data.science);
    setText('codexInstrument', data.instrument);
    setText('codexMyth', data.myth);
    document.getElementById('codexBoundary').innerHTML = `<b>Boundary:</b> ${data.boundary} Input remains verbatim; this entry appends a named model layer.`;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function bindMeters() {
    document.addEventListener('click', event => {
      const meter = event.target.closest?.('[data-meter]');
      if (!meter || !document.body.classList.contains('codex-on')) return;
      const key = meter.dataset.meter;
      showCodex(key);
    });
    document.addEventListener('keydown', event => {
      if ((event.key !== 'Enter' && event.key !== ' ') || !document.body.classList.contains('codex-on')) return;
      const meter = document.activeElement?.closest?.('[data-meter]');
      if (!meter) return;
      showCodex(meter.dataset.meter);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureButton();
    ensurePanel();
    bindMeters();
    let saved = false;
    try { saved = localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) {}
    setCodex(saved);
    window.setInterval(() => {
      if (document.body.classList.contains('codex-on')) updateMeterLabels(true);
    }, 1500);
  });
})();
