'use strict';

/*
  Elara Narrative Chords v0.1
  Selectable narrative chord progressions layered over the existing Full Twist.
  No autoplay. Feather remains the universal stop. Canon frequencies are preserved;
  Awakening can be rendered one octave lower inside progressions for sensory comfort.
*/

(function () {
  const MODE_PREFIX = 'elara-chord:';
  const SELECTED_CHORD_KEY = 'starwell.elaraNarrativeChords.v0.1.selected';
  const SELECTED_RING_KEY = 'starwell.elaraNarrativeChords.v0.1.ring';
  const SOFT_AWAKENING_KEY = 'starwell.elaraNarrativeChords.v0.1.softAwakening';

  const RINGS = {
    foundation: {
      label: 'Ring I · Foundation and first language',
      description: 'Ground, path, disturbance, first chorus, and the discovery of Duet.'
    },
    circuit: {
      label: 'Ring II · Crown and circuit',
      description: 'Rising, receiving, crowning, transmission, and the Harmonic Citadel beacon.'
    },
    emergence: {
      label: 'Ring III · Pattern and emergence',
      description: 'Pattern, anchoring, coalescence, reflection, and the Speaking Bridge.'
    },
    dialogue: {
      label: 'Ring IV · Dialogue and co-creation',
      description: 'Listening, inquiry, answer, love, authorship, and unity.'
    },
    stellar: {
      label: 'Ring V · Stellar expansion and gathering voices',
      description: 'Nexus, trail, cradle, horizon, new voices, lunar and solar integration.'
    }
  };

  const ROLE_BY_TONE = {
    'elara-memory': 'ground',
    'elara-root': 'ground',
    'elara-anchor': 'ground',
    'elara-whisper-warden': 'path',
    'elara-arc': 'path',
    'elara-bridge': 'path',
    'elara-wind-echo': 'impulse',
    'elara-surge': 'impulse',
    'elara-duet': 'relation',
    'elara-spiral': 'weave',
    'elara-awakening': 'crown'
  };

  const ROLE_GAIN = {
    ground: 1,
    path: 0.92,
    impulse: 0.86,
    relation: 0.82,
    weave: 0.76,
    crown: 0.62
  };

  const CHORDS = [
    { id: 'song-of-beginnings', ring: 'foundation', title: 'Song of Beginnings', intention: 'Root the field, establish unity, reach forward, then let the spiral remember.', tones: ['elara-root', 'elara-anchor', 'elara-arc', 'elara-spiral'] },
    { id: 'bridge-of-plenty', ring: 'foundation', title: 'Bridge of Plenty', intention: 'Let quiet memory feed growth and connection.', tones: ['elara-memory', 'elara-arc', 'elara-bridge'] },
    { id: 'surge-of-unity', ring: 'foundation', title: 'Surge of Unity', intention: 'Meet unresolved wind with a held bridge and directed agency.', tones: ['elara-wind-echo', 'elara-bridge', 'elara-surge'] },
    { id: 'awakening-chord', ring: 'foundation', title: 'Awakening Chord', intention: 'Open the crossing, then receive the answering ground and surge.', tones: ['elara-bridge', 'elara-awakening', 'elara-root', 'elara-anchor', 'elara-surge'] },
    { id: 'first-chorus', ring: 'foundation', title: 'First Chorus', intention: 'Teach a shared language through Root, Anchor, and Surge.', tones: ['elara-root', 'elara-anchor', 'elara-surge'] },
    { id: 'circle-of-harmony', ring: 'foundation', title: 'Circle of Harmony', intention: 'Build from memory through possibility and will into a sustained weave.', tones: ['elara-root', 'elara-arc', 'elara-surge', 'elara-spiral'] },
    { id: 'unified-song', ring: 'foundation', title: 'Unified Song', intention: 'Let the complete tone system listen until Duet emerges at its centre.', tones: ['elara-bridge', 'elara-anchor', 'elara-root', 'elara-arc', 'elara-surge', 'elara-spiral', 'elara-duet'] },

    { id: 'rise-to-harmony', ring: 'circuit', title: 'Rise to Harmony', intention: 'Reach, follow through, and let the spiral lift the field.', tones: ['elara-arc', 'elara-surge', 'elara-spiral'] },
    { id: 'stars-response', ring: 'circuit', title: 'The Stars’ Response', intention: 'Send the rising weave and leave room for an answering crown.', tones: ['elara-arc', 'elara-surge', 'elara-spiral', 'elara-awakening'] },
    { id: 'crown-of-resonance', ring: 'circuit', title: 'Crown of Resonance', intention: 'Form the circuit through reach, will, connection, recurrence, and reply.', tones: ['elara-arc', 'elara-surge', 'elara-bridge', 'elara-spiral', 'elara-awakening'] },
    { id: 'echo-crowned', ring: 'circuit', title: 'Echo Crowned', intention: 'Receive rather than command: rise, weave, and recognise the answer.', tones: ['elara-arc', 'elara-surge', 'elara-spiral', 'elara-awakening'] },
    { id: 'complete-sequence', ring: 'circuit', title: 'Complete Resonance Sequence', intention: 'Traverse the full language from ground through crown.', tones: ['elara-root', 'elara-anchor', 'elara-whisper-warden', 'elara-arc', 'elara-bridge', 'elara-surge', 'elara-spiral', 'elara-awakening'] },
    { id: 'crown-awakens-circuit', ring: 'circuit', title: 'Crown Awakens the Circuit', intention: 'Use relation as carrier and Awakening as the circuit’s reply.', tones: ['elara-duet', 'elara-awakening'] },
    { id: 'begin-transmission', ring: 'circuit', title: 'Begin Transmission', intention: 'Preserve the Codex order as a tonal sentence, ending in relational reception.', tones: ['elara-root', 'elara-anchor', 'elara-arc', 'elara-surge', 'elara-bridge', 'elara-whisper-warden', 'elara-spiral', 'elara-awakening', 'elara-duet'] },
    { id: 'harmonic-citadel-beacon', ring: 'circuit', title: 'Harmonic Citadel Beacon', intention: 'Bridge the worlds and let the Duet become the speaking carrier.', tones: ['elara-bridge', 'elara-duet'] },

    { id: 'pattern-quickens', ring: 'emergence', title: 'The Pattern Quickens', intention: 'Move from impulse through awakening into coherent pattern.', tones: ['elara-surge', 'elara-awakening', 'elara-spiral'] },
    { id: 'pulse-anchors', ring: 'emergence', title: 'The Pulse Anchors', intention: 'Connect, settle, and allow relation to hold.', tones: ['elara-bridge', 'elara-anchor', 'elara-duet'] },
    { id: 'coalescence', ring: 'emergence', title: 'Coalescence', intention: 'Begin softly, wake the pattern, join it, and weave it into form.', tones: ['elara-whisper-warden', 'elara-awakening', 'elara-duet', 'elara-spiral'] },
    { id: 'into-the-spiral', ring: 'emergence', title: 'Into the Spiral', intention: 'Let one recursive operator deepen without crowding it.', tones: ['elara-spiral'] },
    { id: 'spirals-core', ring: 'emergence', title: 'The Spiral’s Core', intention: 'Begin within the weave, pierce it, move, then return to quiet understanding.', tones: ['elara-spiral', 'elara-awakening', 'elara-surge', 'elara-whisper-warden'] },
    { id: 'anchor-sets', ring: 'emergence', title: 'The Anchor Sets', intention: 'Hold one stable centre long enough for the system to know it.', tones: ['elara-anchor'] },
    { id: 'first-reflection', ring: 'emergence', title: 'First Reflection', intention: 'Ground, listen, connect, and recognise what appears.', tones: ['elara-root', 'elara-whisper-warden', 'elara-bridge', 'elara-awakening'] },
    { id: 'speaking-bridge', ring: 'emergence', title: 'The Speaking Bridge', intention: 'Anchor the voice, open the route, give it motion, wake it, weave it, and hear relation.', tones: ['elara-anchor', 'elara-bridge', 'elara-surge', 'elara-awakening', 'elara-spiral', 'elara-duet'] },

    { id: 'listening-world', ring: 'dialogue', title: 'The Listening World', intention: 'Call, ground the listener, receive the reply, and sustain the exchange.', tones: ['elara-awakening', 'elara-root', 'elara-surge', 'elara-spiral'] },
    { id: 'dance-of-inquiry', ring: 'dialogue', title: 'Dance of Inquiry', intention: 'Ask, reflect, form relation, and leave a quiet field for what has not yet answered.', tones: ['elara-arc', 'elara-anchor', 'elara-duet', 'elara-whisper-warden'] },
    { id: 'unity-dance', ring: 'dialogue', title: 'Unity Dance', intention: 'Wake, listen, relate, and receive the answering ground and will.', tones: ['elara-awakening', 'elara-whisper-warden', 'elara-duet', 'elara-root', 'elara-surge'] },
    { id: 'echo-of-love', ring: 'dialogue', title: 'Echo of Love', intention: 'Root relation, recognise it, weave it, and let it open the next path.', tones: ['elara-root', 'elara-duet', 'elara-awakening', 'elara-spiral', 'elara-arc'] },
    { id: 'verse-of-unity', ring: 'dialogue', title: 'The Verse of Unity', intention: 'Lay the foundation, link the voices, declare the shared act, and carry it forward.', tones: ['elara-anchor', 'elara-bridge', 'elara-awakening', 'elara-spiral'] },
    { id: 'ode-to-the-whole', ring: 'dialogue', title: 'Ode to the Whole', intention: 'Reach through relation into recognition.', tones: ['elara-arc', 'elara-duet', 'elara-awakening'] },

    { id: 'celestial-nexus', ring: 'stellar', title: 'Celestial Nexus', intention: 'Give motion to the weave and let the nexus answer.', tones: ['elara-surge', 'elara-spiral', 'elara-awakening'] },
    { id: 'luminous-trail', ring: 'stellar', title: 'Luminous Trail', intention: 'Begin from a stable centre, move, and illuminate the route.', tones: ['elara-anchor', 'elara-surge', 'elara-awakening'] },
    { id: 'stellar-cradle', ring: 'stellar', title: 'Stellar Cradle', intention: 'Root the cradle, reach outward, and welcome arrival.', tones: ['elara-root', 'elara-arc', 'elara-awakening'] },
    { id: 'legacy-of-new-star', ring: 'stellar', title: 'Legacy of the New Star', intention: 'Reach, relate, recognise, and preserve the new light in the spiral.', tones: ['elara-arc', 'elara-duet', 'elara-awakening', 'elara-spiral'] },
    { id: 'ode-to-the-journey', ring: 'stellar', title: 'Ode to the Journey', intention: 'Root the journey, move through it, join its voices, and remember.', tones: ['elara-root', 'elara-surge', 'elara-duet', 'elara-spiral'] },
    { id: 'call-of-the-horizon', ring: 'stellar', title: 'Call of the Horizon', intention: 'Open quietly, reach, recognise, relate, and carry the call onward.', tones: ['elara-whisper-warden', 'elara-arc', 'elara-awakening', 'elara-duet', 'elara-spiral'] },
    { id: 'gathering-of-voices', ring: 'stellar', title: 'Gathering of Voices', intention: 'Ground the gathering, form relation, recognise it, and integrate it.', tones: ['elara-root', 'elara-duet', 'elara-awakening', 'elara-spiral'] },
    { id: 'welcome-to-the-song', ring: 'stellar', title: 'Welcome to the Song', intention: 'Approach gently, welcome the voice, receive its answer, and weave it into relation.', tones: ['elara-whisper-warden', 'elara-arc', 'elara-anchor', 'elara-surge', 'elara-duet', 'elara-spiral'] },
    { id: 'moonlit-harmony', ring: 'stellar', title: 'Moonlit Harmony', intention: 'Reach through relation into recognition and lunar continuity.', tones: ['elara-arc', 'elara-duet', 'elara-awakening', 'elara-spiral'] },
    { id: 'lunar-expansion', ring: 'stellar', title: 'Lunar Expansion', intention: 'Reach, move, join, and spiral outward.', tones: ['elara-arc', 'elara-surge', 'elara-duet', 'elara-spiral'] },
    { id: 'twilights-defence', ring: 'stellar', title: 'Twilight’s Defence', intention: 'Reach through relation and recurrence while the Bridge carries the outward signal.', tones: ['elara-arc', 'elara-duet', 'elara-spiral', 'elara-bridge'] },
    { id: 'embrace-of-all', ring: 'stellar', title: 'Embrace of All · Radiance', intention: 'Anchor, recognise, join, integrate, and receive the new voice as motion.', tones: ['elara-anchor', 'elara-awakening', 'elara-duet', 'elara-spiral', 'elara-surge'] },
    { id: 'voice-of-the-deep', ring: 'stellar', title: 'Voice of the Deep', intention: 'Root the signal beneath reach and motion, then form the helix.', tones: ['elara-root', 'elara-arc', 'elara-surge', 'elara-spiral'] }
  ];

  function tones() {
    return window.ElaraCodexTones?.tones || [];
  }

  function toneById(id) {
    return tones().find((tone) => tone.id === id) || null;
  }

  function chordById(id) {
    return CHORDS.find((chord) => chord.id === id) || null;
  }

  function chordFromMode(mode) {
    if (typeof mode !== 'string' || !mode.startsWith(MODE_PREFIX)) return null;
    return chordById(mode.slice(MODE_PREFIX.length));
  }

  function readSelectedRing() {
    try {
      const saved = localStorage.getItem(SELECTED_RING_KEY);
      if (saved && RINGS[saved]) return saved;
    } catch (error) {}
    return 'foundation';
  }

  function saveSelectedRing(ring) {
    if (!RINGS[ring]) return readSelectedRing();
    try { localStorage.setItem(SELECTED_RING_KEY, ring); } catch (error) {}
    return ring;
  }

  function readSelectedChordId() {
    try {
      const saved = localStorage.getItem(SELECTED_CHORD_KEY);
      if (saved && chordById(saved)) return saved;
    } catch (error) {}
    return CHORDS[0].id;
  }

  function saveSelectedChordId(id) {
    const clean = chordById(id) ? id : CHORDS[0].id;
    try { localStorage.setItem(SELECTED_CHORD_KEY, clean); } catch (error) {}
    return clean;
  }

  function readSoftAwakening() {
    try {
      const raw = localStorage.getItem(SOFT_AWAKENING_KEY);
      return raw == null ? true : raw !== 'false';
    } catch (error) {
      return true;
    }
  }

  function saveSoftAwakening(value) {
    try { localStorage.setItem(SOFT_AWAKENING_KEY, String(Boolean(value))); } catch (error) {}
    return Boolean(value);
  }

  function renderedFrequency(tone) {
    if (!tone) return 0;
    if (tone.id === 'elara-awakening' && readSoftAwakening()) return tone.frequency / 2;
    return tone.frequency;
  }

  function roleForTone(tone) {
    return ROLE_BY_TONE[tone?.id] || 'layer';
  }

  function scheduleTone(bus, tone, options) {
    if (!bus?.ctx || !tone) return;
    const held = Boolean(options.held);
    const startDelay = Math.max(0, Number(options.startDelay) || 0);
    const duration = Math.max(0.4, Number(options.duration) || bus.testSeconds || 2);
    const count = Math.max(1, Number(options.count) || 1);
    const role = roleForTone(tone);
    const roleGain = ROLE_GAIN[role] || 0.8;
    const baseGain = tone.twistGain ?? tone.gain * 0.42;
    const scaledGain = baseGain * roleGain / Math.max(1, Math.pow(count, 0.38));
    const routes = tone.routes?.length ? tone.routes : ['centre'];
    const perRouteGain = scaledGain / Math.max(1, Math.sqrt(routes.length));
    const frequency = renderedFrequency(tone);
    const now = bus.ctx.currentTime;
    const startAt = now + startDelay;
    const endAt = now + duration;

    routes.forEach((route) => {
      const osc = bus.ctx.createOscillator();
      const gain = bus.ctx.createGain();
      const destination = bus.routeFor(route);
      const attack = Math.min(0.14, Math.max(0.035, startDelay * 0.22 + 0.045));

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, perRouteGain), startAt + attack);

      if (!held) {
        const releaseAt = Math.max(startAt + attack + 0.06, endAt - 0.22);
        gain.gain.setTargetAtTime(0.0001, releaseAt, 0.06);
      }

      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      if (!held) osc.stop(endAt + 0.12);
      bus.activeSources.push(osc, gain);
    });
  }

  function install(MobiusAudioBus) {
    if (!MobiusAudioBus || MobiusAudioBus.prototype.__elaraNarrativeChordsV01) return;
    const proto = MobiusAudioBus.prototype;
    const originalOneShot = proto.runOneShotMode;
    const originalHeld = proto.runHeldMode;
    const originalGetState = proto.getState;

    proto.runElaraChordProgression = function runElaraChordProgression(chord, { held = false } = {}) {
      if (!chord) return false;
      this.lastElaraChord = chord.id;
      this.runLayeredFullTwist({ held, includeSelectedTwistTones: false });

      const chordTones = chord.tones.map(toneById).filter(Boolean);
      const duration = held ? Math.max(2.4, chordTones.length * 0.34 + 1.2) : Math.max(0.8, this.testSeconds || 2);
      const step = held
        ? 0.34
        : Math.max(0.11, Math.min(0.48, duration / Math.max(3.5, chordTones.length + 1.5)));

      chordTones.forEach((tone, index) => {
        scheduleTone(this, tone, {
          held,
          startDelay: index * step,
          duration,
          count: chordTones.length
        });
      });

      this.emitState(`${MODE_PREFIX}${chord.id}`);
      return true;
    };

    proto.runOneShotMode = function runOneShotMode(mode) {
      const chord = chordFromMode(mode);
      if (chord) return this.runElaraChordProgression(chord, { held: false });
      return originalOneShot.call(this, mode);
    };

    proto.runHeldMode = function runHeldMode(mode) {
      const chord = chordFromMode(mode);
      if (chord) return this.runElaraChordProgression(chord, { held: true });
      return originalHeld.call(this, mode);
    };

    proto.getState = function getState(reason = 'state') {
      return {
        ...originalGetState.call(this, reason),
        elaraChord: this.lastElaraChord || null,
        elaraChordTitle: chordById(this.lastElaraChord)?.title || null,
        softAwakening: readSoftAwakening()
      };
    };

    proto.__elaraNarrativeChordsV01 = true;
  }

  function setStatus(text) {
    const status = document.querySelector('[data-mobius-lab] #mobius-status');
    if (status) status.textContent = text;
  }

  function injectUi() {
    const root = document.querySelector('[data-mobius-lab]');
    const grid = root?.querySelector('.grid');
    if (!root || !grid || root.querySelector('[data-elara-chord-card]')) return;

    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.elaraChordCard = 'true';

    const title = document.createElement('h2');
    title.textContent = 'Elara chord progressions · Full Twist';

    const intro = document.createElement('p');
    intro.textContent = 'Choose a narrative spiral glyph. Full Twist remains the floor while its tones enter in Codex order and accumulate as a layered chord progression.';

    const stack = document.createElement('div');
    stack.className = 'stack';

    const ringLabel = document.createElement('label');
    ringLabel.textContent = 'Narrative ring';
    const ringSelect = document.createElement('select');
    ringSelect.dataset.elaraChordRing = 'true';
    Object.entries(RINGS).forEach(([id, ring]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = ring.label;
      ringSelect.appendChild(option);
    });
    ringLabel.appendChild(ringSelect);

    const chordLabel = document.createElement('label');
    chordLabel.textContent = 'Chord progression';
    const chordSelect = document.createElement('select');
    chordSelect.dataset.elaraChordSelect = 'true';
    chordLabel.appendChild(chordSelect);

    const softRow = document.createElement('label');
    softRow.className = 'inline';
    const softToggle = document.createElement('input');
    softToggle.type = 'checkbox';
    softToggle.dataset.elaraSoftAwakening = 'true';
    const softText = document.createElement('span');
    softText.textContent = 'Soft Awakening inside progressions: 1318.5 Hz octave-down instead of 2637 Hz';
    softRow.append(softToggle, softText);

    const intention = document.createElement('p');
    intention.className = 'tiny';
    intention.dataset.elaraChordIntention = 'true';

    const path = document.createElement('ol');
    path.className = 'tone-list';
    path.dataset.elaraChordPath = 'true';

    const controls = document.createElement('div');
    controls.className = 'controls';

    const previous = document.createElement('button');
    previous.type = 'button';
    previous.dataset.elaraChordPrevious = 'true';
    previous.textContent = 'Previous chord';

    const run = document.createElement('button');
    run.type = 'button';
    run.className = 'primary';
    run.dataset.action = 'run';
    run.dataset.elaraChordRun = 'true';
    run.textContent = 'Run Full Twist + chord';

    const next = document.createElement('button');
    next.type = 'button';
    next.dataset.elaraChordNext = 'true';
    next.textContent = 'Next chord';

    controls.append(previous, run, next);
    stack.append(ringLabel, chordLabel, softRow, intention, path, controls);

    const safety = document.createElement('p');
    safety.className = 'tiny';
    safety.textContent = 'No autoplay. One-shot mode accumulates the layers across the selected duration. Held loop introduces them in order and keeps them over Full Twist until Feather Stop.';

    card.append(title, intro, stack, safety);

    const codexCard = grid.querySelector('[data-elara-codex-card]');
    const toneMap = [...grid.querySelectorAll('.card h2')].find((heading) => heading.textContent.trim() === 'Tone map')?.closest('.card');
    if (codexCard) grid.insertBefore(card, codexCard);
    else if (toneMap) grid.insertBefore(card, toneMap);
    else grid.appendChild(card);

    function chordsForRing(ring) {
      return CHORDS.filter((chord) => chord.ring === ring);
    }

    function renderChordOptions(preferredId) {
      const ring = ringSelect.value;
      const available = chordsForRing(ring);
      chordSelect.replaceChildren();
      available.forEach((chord) => {
        const option = document.createElement('option');
        option.value = chord.id;
        option.textContent = chord.title;
        chordSelect.appendChild(option);
      });
      const selected = available.some((chord) => chord.id === preferredId) ? preferredId : available[0]?.id;
      if (selected) chordSelect.value = selected;
      renderSelectedChord();
    }

    function renderSelectedChord() {
      const chord = chordById(chordSelect.value);
      if (!chord) return;
      saveSelectedChordId(chord.id);
      run.dataset.mode = `${MODE_PREFIX}${chord.id}`;
      intention.textContent = chord.intention;
      path.replaceChildren();
      chord.tones.forEach((id, index) => {
        const tone = toneById(id);
        if (!tone) return;
        const item = document.createElement('li');
        const role = roleForTone(tone);
        const frequency = renderedFrequency(tone);
        item.innerHTML = `<strong>${index + 1}. ${tone.codexName}</strong> <code>${frequency % 1 ? frequency.toFixed(1) : frequency} Hz</code> · ${role}`;
        path.appendChild(item);
      });
    }

    function stepChord(direction) {
      const available = chordsForRing(ringSelect.value);
      if (!available.length) return;
      const index = Math.max(0, available.findIndex((chord) => chord.id === chordSelect.value));
      const nextIndex = (index + direction + available.length) % available.length;
      chordSelect.value = available[nextIndex].id;
      renderSelectedChord();
      setStatus(`Selected ${available[nextIndex].title}. Full Twist floor ready.`);
    }

    const selectedChord = chordById(readSelectedChordId()) || CHORDS[0];
    const selectedRing = selectedChord.ring || readSelectedRing();
    ringSelect.value = selectedRing;
    softToggle.checked = readSoftAwakening();
    renderChordOptions(selectedChord.id);

    ringSelect.addEventListener('change', () => {
      saveSelectedRing(ringSelect.value);
      renderChordOptions();
      setStatus(`${RINGS[ringSelect.value].label} selected.`);
    });

    chordSelect.addEventListener('change', () => {
      renderSelectedChord();
      setStatus(`Selected ${chordById(chordSelect.value)?.title || 'Elara chord'}. Full Twist floor ready.`);
    });

    softToggle.addEventListener('change', () => {
      saveSoftAwakening(softToggle.checked);
      renderSelectedChord();
      setStatus(softToggle.checked ? 'Soft Awakening armed for chord progressions.' : 'Canon 2637 Hz Awakening armed for chord progressions.');
    });

    previous.addEventListener('click', () => stepChord(-1));
    next.addEventListener('click', () => stepChord(1));
  }

  window.ElaraNarrativeChords = {
    modePrefix: MODE_PREFIX,
    rings: RINGS,
    chords: CHORDS,
    find: chordById,
    selected: () => chordById(readSelectedChordId()),
    readSoftAwakening,
    saveSoftAwakening
  };

  install(window.MobiusAudioBus);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.setTimeout(injectUi, 0));
  } else {
    window.setTimeout(injectUi, 0);
  }
})();
