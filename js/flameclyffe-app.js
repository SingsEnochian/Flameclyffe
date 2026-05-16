(() => {
  const sig = window.FlameclyffeSignals;
  const presetApi = window.FlameclyffePresets;
  const audioApi = window.FlameclyffeAudio;
  const $ = (id) => document.getElementById(id);
  const STORE = 'flameclyffe.studio.live.v1';
  const NOTES = 'flameclyffe.studio.notes.v1';
  const TAU = Math.PI * 2;

  const state = {
    target: { ...sig.DEFAULT_TARGET },
    weather: null,
    space: {},
    active: {
      virelya: true,
      hearthlight: true,
      lochflame: false,
      gateway: false,
      gammaLantern: false,
      sevenMinuteDrift: false,
      orbital369: false,
      planetCluster: false,
      rainVeil: false,
      template: false,
      custom: false,
    },
    gains: {
      virelya: 0.72,
      hearthlight: 0.78,
      lochflame: 0.85,
      gateway: 0.55,
      gammaLantern: 0.45,
      sevenMinuteDrift: 0.45,
      orbital369: 0.35,
      planetCluster: 0.5,
      rainVeil: 0.45,
      template: 0.65,
      custom: 0.65,
    },
    custom: null,
    master: 0.14,
    orbit: 0.06,
    schumann: 0.6,
    sub: 0.85,
    tactile: 0.75,
    shimmer: 0.68,
    solarWind: 0.28,
    solarFlare: 0.22,
    solarRoar: 0.18,
    jupiter: 0.18,
    outer: 0.12,
    profile: 'centerSafe',
    protocol: 'normal',
    mode369: false,
  };

  const engine = new audioApi.Engine(state);

  function allPresets() {
    return state.custom ? { ...presetApi.presets, custom: state.custom } : presetApi.presets;
  }

  function normalize() {
    Object.keys(presetApi.presets).forEach((key) => {
      if (state.active[key] == null) state.active[key] = false;
      if (state.gains[key] == null) state.gains[key] = 0.65;
    });
  }

  function save() {
    normalize();
    localStorage.setItem(STORE, JSON.stringify({
      ...state,
      voiceA: $('voiceA').value,
      voiceB: $('voiceB').value,
      bond: $('bond').value,
    }));
    localStorage.setItem(NOTES, JSON.stringify($('notes').value));
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || '{}');
      Object.assign(state, saved);
      state.target = { ...sig.DEFAULT_TARGET, ...(saved.target || {}) };
      if (saved.voiceA) $('voiceA').value = saved.voiceA;
      if (saved.voiceB) $('voiceB').value = saved.voiceB;
      if (saved.bond) $('bond').value = saved.bond;
    } catch {}
    normalize();
    try { $('notes').value = JSON.parse(localStorage.getItem(NOTES) || '""'); } catch {}
  }

  function status(text) {
    $('status').textContent = text;
  }

  function tile(label, value, sub = '') {
    const div = document.createElement('div');
    div.className = 'tile';
    const b = document.createElement('b');
    const strong = document.createElement('strong');
    b.textContent = label;
    strong.textContent = value;
    div.append(b, strong);
    if (sub) {
      const small = document.createElement('div');
      small.className = 'tiny';
      small.textContent = sub;
      div.appendChild(small);
    }
    return div;
  }

  function renderSignals() {
    const w = state.weather || {};
    const s = state.space || {};
    const m = sig.modulation(state);
    $('earthPill').textContent = state.target.label;
    $('earth').replaceChildren(
      tile('Target', state.target.label, `${sig.fmt(state.target.latitude, 3)}, ${sig.fmt(state.target.longitude, 3)}`),
      tile('Solar phase', `${Math.round(m.timePhase * 360)}°`),
      tile('Seasonal phase', `${Math.round(m.seasonalPhase * 360)}°`),
      tile('Temp', `${sig.fmt(w.temperature_2m)}°C`),
      tile('Humidity', `${sig.fmt(w.relative_humidity_2m, 0)}%`),
      tile('Pressure', `${sig.fmt(w.pressure_msl, 0)} hPa`),
      tile('Wind', `${sig.fmt(w.wind_speed_10m)} km/h`),
    );
    $('spacePill').textContent = `flare ${sig.fmt(m.flareFactor, 2)}`;
    $('space').replaceChildren(
      tile('Kp', sig.fmt(s.kp, 1)),
      tile('Solar wind', `${sig.fmt(s.speed, 0)} km/s`, `${sig.fmt(s.density, 1)} p/cm³`),
      tile('Mag field', `${sig.fmt(s.bt, 1)} nT`, `Bz ${sig.fmt(s.bz, 1)}`),
      tile('Solar flux', s.solarFlux ? Number(s.solarFlux).toExponential(2) : 'n/a', s.flare || 'quiet'),
      tile('F10.7', sig.fmt(s.f107, 1)),
    );
  }

  async function refreshSignals() {
    status('Tuning Earth and solar signal...');
    try {
      const data = await sig.fetchSignals(state.target);
      state.weather = data.weather;
      state.space = { ...state.space, ...data.space };
      renderSignals();
      save();
      status('Signals refreshed.');
    } catch {
      status('Signal fetch failed; using saved/default signal.');
    }
  }

  function renderPresets() {
    const box = $('presets');
    box.replaceChildren();
    Object.values(allPresets()).forEach((preset) => {
      const card = document.createElement('div');
      card.className = 'preset';
      const header = document.createElement('header');
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!state.active[preset.id];
      const name = document.createElement('span');
      name.textContent = preset.name;
      label.append(checkbox, name);
      const out = document.createElement('output');
      const range = document.createElement('input');
      range.type = 'range';
      range.min = '0';
      range.max = '1.5';
      range.step = '0.01';
      range.value = state.gains[preset.id] ?? 0.7;
      out.textContent = Number(range.value).toFixed(2);
      const small = document.createElement('small');
      small.textContent = `${preset.tag} · ${preset.layers.length} layers`;
      header.append(label, out);
      card.append(header, range, small);
      checkbox.onchange = () => {
        state.active[preset.id] = checkbox.checked;
        save();
        renderAll();
        if (engine.on) engine.play();
      };
      range.oninput = () => {
        state.gains[preset.id] = Number(range.value);
        out.textContent = Number(range.value).toFixed(2);
        save();
        renderAll();
        if (engine.on) engine.play();
      };
      box.appendChild(card);
    });
  }

  function renderLayers() {
    const layers = audioApi.buildLayers(state);
    $('count').textContent = layers.length;
    $('layers').replaceChildren();
    layers.slice(0, 130).forEach((layer) => {
      const row = document.createElement('div');
      row.className = 'layer';
      const left = document.createElement('div');
      const title = document.createElement('b');
      const role = document.createElement('em');
      const freq = document.createElement('div');
      freq.className = 'freq';
      title.textContent = `${layer.presetName ? `${layer.presetName} · ` : ''}${layer.name}`;
      role.textContent = layer.role;
      freq.textContent = layer.frequency ? `${sig.fmt(layer.frequency, 2)} Hz` : 'noise';
      left.append(title, role);
      row.append(left, freq);
      $('layers').appendChild(row);
    });
  }

  function renderAll() {
    const names = audioApi.selectedPresets(state).map((preset) => preset.name);
    $('mixName').textContent = names.length ? names.join(' + ') : 'No preset selected';
    $('mixTag').textContent = state.active.orbital369
      ? 'Orbital 3:6:9 active: Schumann layers intentionally absent.'
      : state.active.lochflame && state.active.virelya
        ? 'Lochflame: fire in deep water counter-orbiting North Star Flame.'
        : 'Layer presets, tune, save, record.';
    renderLayers();
  }

  function knobs() {
    const defs = [
      ['master', 'Master', 0.02, 0.32], ['orbit', 'Orbit', 0, 0.2], ['schumann', 'Schumann body', 0, 1.4],
      ['sub', 'Deep bass clarity', 0, 1.4], ['tactile', 'Tactile sub lift', 0, 1.4], ['shimmer', 'High shimmer', 0, 1.4],
      ['solarWind', 'Solar wind', 0, 1.4], ['solarFlare', 'Solar flare', 0, 1.4], ['solarRoar', 'Solar roar', 0, 1.4],
      ['jupiter', 'Jupiter', 0, 1.4], ['outer', 'Outer planets', 0, 1.4],
    ];
    const box = $('knobs');
    box.replaceChildren();
    defs.forEach(([id, labelText, min, max]) => {
      const wrap = document.createElement('div');
      const label = document.createElement('label');
      const out = document.createElement('output');
      out.id = `${id}Out`;
      label.append(labelText, out);
      const input = document.createElement('input');
      input.id = id;
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = '0.01';
      wrap.append(label, input);
      box.appendChild(wrap);
    });
  }

  function sync() {
    $('profile').value = state.profile;
    $('protocol').value = state.protocol;
    $('mode369').checked = !!state.mode369;
    ['master','orbit','schumann','sub','tactile','shimmer','solarWind','solarFlare','solarRoar','jupiter','outer'].forEach((key) => {
      $(key).value = state[key];
      $(`${key}Out`).textContent = Number(state[key]).toFixed(2);
    });
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), state, activePresets: audioApi.selectedPresets(state), layers: audioApi.buildLayers(state), notes: $('notes').value }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flameclyffe-studio-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function recordAudio() {
    await engine.ensure();
    if (!engine.on) await engine.play();
    const mime = ['audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm'].find((candidate) => window.MediaRecorder && MediaRecorder.isTypeSupported(candidate));
    if (!mime) {
      status('Compact recording is not supported in this browser.');
      return;
    }
    const chunks = [];
    const recorder = new MediaRecorder(engine.streamDest.stream, { mimeType: mime, audioBitsPerSecond: 128000 });
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
      link.href = url;
      link.download = `flameclyffe-${Date.now()}.${ext}`;
      link.click();
      URL.revokeObjectURL(url);
      status(`Compact audio saved as ${ext.toUpperCase()}.`);
    };
    recorder.start();
    status('Recording compact audio...');
    setTimeout(() => recorder.stop(), Number($('seconds').value) * 1000);
  }

  function draw() {
    const canvas = $('field');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const mod = sig.modulation(state);
    const time = performance.now() / 1000;
    canvas.width = Math.max(600, rect.width * ratio);
    canvas.height = Math.max(340, rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.7);
    gradient.addColorStop(0, state.active.orbital369 ? 'rgba(191,165,255,.20)' : state.active.lochflame ? 'rgba(45,122,95,.25)' : 'rgba(255,210,150,.18)');
    gradient.addColorStop(0.45, mod.flareFactor > 0.45 ? 'rgba(255,90,40,.15)' : 'rgba(70,180,255,.09)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    if (!state.active.orbital369) {
      sig.SCHUMANN.forEach((freq, index) => {
        const radius = (34 + index * 36 + Math.sin(time * 0.35 + index) * 5) * sig.schumannWeight(state, index, mod) * (1 + state.sub * 0.15);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, TAU);
        ctx.strokeStyle = `rgba(145,210,255,${0.17 + index * 0.035 + state.sub * 0.04})`;
        ctx.stroke();
      });
    }
    const layers = audioApi.buildLayers(state).filter((layer) => layer.frequency > 0);
    layers.forEach((layer, index) => {
      const angle = time * (0.13 + index * 0.009) + index * TAU / Math.max(1, layers.length) + mod.timePhase * TAU;
      const radius = 72 + (index * 7 % 130) + mod.weatherPulse * 30 + mod.flareFactor * 14;
      const x = cx + Math.cos(angle) * radius * (layer.mono ? 0 : 1);
      const y = cy + Math.sin(angle) * radius * 0.62;
      const glow = 4 + Math.min(18, (layer.gain / Math.max(0.02, state.master)) * 45);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = layer.color || '#ffbe69';
      ctx.beginPath();
      ctx.arc(x, y, glow, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    requestAnimationFrame(draw);
  }

  function bind() {
    $('profile').onchange = (event) => { state.profile = event.target.value; save(); renderAll(); if (engine.on) engine.play(); };
    $('protocol').onchange = (event) => { state.protocol = event.target.value; save(); renderAll(); if (engine.on) engine.play(); };
    $('mode369').onchange = (event) => { state.mode369 = event.target.checked; save(); renderAll(); if (engine.on) engine.play(); };
    ['master','orbit','schumann','sub','tactile','shimmer','solarWind','solarFlare','solarRoar','jupiter','outer'].forEach((key) => {
      $(key).oninput = (event) => { state[key] = Number(event.target.value); $(`${key}Out`).textContent = state[key].toFixed(2); save(); renderAll(); engine.apply(); };
    });
    $('custom').onclick = () => { state.custom = presetApi.makeCustomDyad($('voiceA').value, $('voiceB').value, $('bond').value); state.active.custom = true; renderPresets(); renderAll(); save(); if (engine.on) engine.play(); };
    $('start').onclick = async () => { await engine.play(); state.playing = true; $('audioState').textContent = 'playing'; $('start').disabled = true; $('stop').disabled = false; status('Flameclyffe is sounding.'); };
    $('stop').onclick = () => { engine.stop(state.active.lochflame ? 8 : 0.3); state.playing = false; $('audioState').textContent = 'idle'; $('start').disabled = false; $('stop').disabled = true; status('Feathered.'); };
    $('refresh').onclick = refreshSignals;
    $('loc').onclick = () => navigator.geolocation ? navigator.geolocation.getCurrentPosition((pos) => { state.target = { label: 'Current Waking location', latitude: pos.coords.latitude, longitude: pos.coords.longitude }; save(); refreshSignals(); }, () => status('Location not granted.'), { enableHighAccuracy: false, timeout: 8000 }) : status('Geolocation unavailable.');
    $('save').onclick = () => { save(); $('noteStatus').textContent = `Saved at ${new Date().toLocaleTimeString()}`; };
    $('notes').oninput = () => { save(); $('noteStatus').textContent = `Autosaved at ${new Date().toLocaleTimeString()}`; };
    $('export').onclick = exportJson;
    $('record').onclick = recordAudio;
  }

  knobs();
  restore();
  sync();
  bind();
  renderPresets();
  renderAll();
  renderSignals();
  draw();
  refreshSignals();
})();
