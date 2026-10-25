import './toybox.css';
import {
  listSensoryProfiles,
  listToyboxToys,
  resolveSensoryProfile,
  toyboxSnapshot,
} from '../toybox-model.js';

const PROFILE_KEY = 'wayglass.toybox.sensory-profile/v1';

function safeReadProfile() {
  try {
    const value = globalThis.localStorage?.getItem(PROFILE_KEY);
    return ['quiet', 'balanced', 'sparkly'].includes(value) ? value : 'balanced';
  } catch {
    return 'balanced';
  }
}

function safeWriteProfile(value) {
  try { globalThis.localStorage?.setItem(PROFILE_KEY, value); } catch {}
}

function pointerPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height,
  };
}

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

function createNoiseBuffer(context, colour = 'pink') {
  const seconds = 2;
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);

  if (colour === 'brown') {
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.3;
    }
    return buffer;
  }

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

export async function mountWayglassToybox(root) {
  let disposed = false;
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const audioAvailable = Boolean(globalThis.AudioContext || globalThis.webkitAudioContext);
  const hapticsAvailable = typeof globalThis.navigator?.vibrate === 'function';
  let profileId = safeReadProfile();
  let profile = resolveSensoryProfile(profileId, { reducedMotion });
  const toys = listToyboxToys();

  root.innerHTML = [
    '<section class="wg-surface wg-toybox" data-surface="wayglass-toybox" data-sensory="' + profile.id + '">',
      '<nav class="wg-deck-nav glass-panel" aria-label="Wayglass rooms">',
        '<button type="button" class="glass-chip" data-wayglass-room="arcsweep:writing-room">Writing Room</button>',
        '<button type="button" class="glass-chip" data-wayglass-room="wayglass:systems">Organs</button>',
        '<button type="button" class="glass-chip" data-wayglass-room="wayglass:video-atelier">Video Atelier</button>',
        '<button type="button" class="glass-chip" data-wayglass-room="wayglass:living-observer">Living Observer</button>',
        '<button type="button" class="glass-chip active" aria-current="page">Toybox</button>',
      '</nav>',
      '<header class="glass-panel toybox-head">',
        '<div><p class="eyebrow">Wayglass OS · sensory play room</p><h1>Toybox</h1>',
        '<p class="lede">Things to poke, trace, click, hear, stack and stare at. No points. No streaks. No productivity score.</p></div>',
        '<p class="toybox-oath"><strong>Ship rule:</strong> the same toy may whisper or sparkle. Sensory profile changes expression, not meaning, and nothing here diagnoses or infers an internal state.</p>',
      '</header>',
      '<section class="glass-panel toybox-profile" aria-label="Toybox sensory profile">',
        '<span>Sensory texture</span>',
        listSensoryProfiles().map(item =>
          '<button type="button" class="glass-chip" data-toy-profile="' + item.id + '" aria-pressed="' + (item.id === profile.id) + '">' + item.label + '</button>'
        ).join(''),
        '<small data-toy-profile-copy>' + profile.description + '</small>',
      '</section>',
      '<section class="toy-grid" aria-label="Wayglass sensory toys">',
        '<article class="toy-card glass-panel" data-toy="mote-herd">',
          '<p class="eyebrow">Visual · kinetic</p><h2>Mote Herd</h2><p class="toy-copy">Pull a little constellation toward your hand, or push it away. It has no destination.</p>',
          '<div class="toy-stage"><canvas data-mote-canvas width="640" height="360" aria-label="Interactive field of luminous motes"></canvas></div>',
          '<div class="toy-actions"><button type="button" class="glass-chip" data-mote-mode="attract" aria-pressed="true">Attract</button><button type="button" class="glass-chip" data-mote-mode="repel" aria-pressed="false">Repel</button><button type="button" class="glass-chip" data-mote-reset>Scatter</button></div>',
        '</article>',
        '<article class="toy-card glass-panel" data-toy="ghost-trace">',
          '<p class="eyebrow">Visual · trace</p><h2>Ghost Trace</h2><p class="toy-copy">Draw luminous wakes. Quiet mode lets them linger; Sparkly lets them evaporate faster.</p>',
          '<div class="toy-stage"><canvas data-trace-canvas width="640" height="360" aria-label="Luminous free-drawing trail surface"></canvas></div>',
          '<div class="toy-actions"><button type="button" class="glass-chip" data-trace-clear>Clear the glass</button></div>',
        '</article>',
        '<article class="toy-card glass-panel" data-toy="click-garden">',
          '<p class="eyebrow">Tactile · toggles</p><h2>Click Garden</h2><p class="toy-copy">Press jewel-seeds into whatever pattern is satisfying. They are not tasks and they never become overdue.</p>',
          '<div class="toy-stage click-garden" data-click-garden>',
            Array.from({ length: 30 }, (_, index) => '<button type="button" class="click-seed" aria-label="Jewel seed ' + (index + 1) + '" aria-pressed="false"></button>').join(''),
          '</div>',
          '<div class="toy-actions"><button type="button" class="glass-chip" data-garden-clear>Reset garden</button></div>',
        '</article>',
        '<article class="toy-card glass-panel" data-toy="vibe-stone">',
          '<p class="eyebrow">Haptic · optional</p><h2>Vibe Stone</h2><p class="toy-copy">Tap a rhythm into supported hardware. Nothing vibrates until you ask.</p>',
          '<div class="toy-stage vibe-stone" data-vibe-stage><div class="vibe-stone-core" aria-hidden="true"></div></div>',
          '<div class="toy-actions"><button type="button" class="glass-chip" data-vibe="pulse">Pulse</button><button type="button" class="glass-chip" data-vibe="wave">Wave</button><button type="button" class="glass-chip" data-vibe="heartbeat">Heartbeat</button></div>',
          '<p class="toy-status" data-vibe-status role="status">' + (hapticsAvailable ? 'Haptics available on this device.' : 'No browser vibration API detected; the stone still lights when pressed.') + '</p>',
        '</article>',
        '<article class="toy-card glass-panel" data-toy="sound-nest">',
          '<p class="eyebrow">Audio · local</p><h2>Sound Nest</h2><p class="toy-copy">A tiny browser-made bed of hum or coloured noise. No microphone. No autoplay. Stop is always one button away.</p>',
          '<div class="toy-stage sound-nest" data-sound-stage><div class="sound-orbit" aria-hidden="true"></div></div>',
          '<div class="toy-actions"><button type="button" class="glass-chip" data-sound="hum">Soft hum</button><button type="button" class="glass-chip" data-sound="pink">Pink noise</button><button type="button" class="glass-chip" data-sound="brown">Brown noise</button><button type="button" class="glass-chip" data-sound="stop">Stop</button></div>',
          '<p class="toy-status" data-sound-status role="status">' + (audioAvailable ? 'Sound sleeps until activated.' : 'Web Audio is unavailable; visual toys remain fully usable.') + '</p>',
        '</article>',
        '<article class="toy-card glass-panel" data-toy="time-puddle">',
          '<p class="eyebrow">Time · visual</p><h2>Time Puddle</h2><p class="toy-copy">Give a span of time a shape. It drains quietly; it does not judge what happened inside it.</p>',
          '<div class="toy-stage time-puddle"><div class="time-puddle-core" data-puddle data-time="10:00" style="--puddle-progress:1"></div></div>',
          '<div class="toy-actions"><label class="tiny">Minutes <input data-puddle-minutes type="range" min="1" max="30" step="1" value="10" aria-label="Time puddle minutes"></label><span class="tiny" data-puddle-minute-label>10 min</span><button type="button" class="glass-chip" data-puddle-start>Start</button><button type="button" class="glass-chip" data-puddle-pause>Pause</button><button type="button" class="glass-chip" data-puddle-reset>Reset</button></div>',
        '</article>',
      '</section>',
      '<footer class="wg-receipt tiny">Toybox v0.1 · local browser play only · no telemetry · no scoring · sound and haptics require explicit user action · reduced-motion is honoured.</footer>',
    '</section>'
  ].join('');

  const surface = root.querySelector('.wg-toybox');
  const wake = (strength = .45, intent = .35) => globalThis.dispatchEvent?.(
    new CustomEvent('wayglass:material-wake', { detail: { strength, intent } })
  );

  function applyProfile(nextId) {
    profileId = ['quiet', 'balanced', 'sparkly'].includes(nextId) ? nextId : 'balanced';
    profile = resolveSensoryProfile(profileId, { reducedMotion });
    safeWriteProfile(profileId);
    surface.dataset.sensory = profile.id;
    surface.style.setProperty('--toy-motion', profile.motion);
    surface.style.setProperty('--toy-density', profile.particle_density);
    surface.style.setProperty('--toy-glow', profile.glow);
    surface.style.setProperty('--toy-contrast', profile.contrast);
    root.querySelectorAll('[data-toy-profile]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.toyProfile === profile.id));
    });
    root.querySelector('[data-toy-profile-copy]').textContent = profile.description;
    syncMotes();
    drawMotes();
    updateSoundGain();
    wake(.38 + profile.glow * .18, .28);
  }

  root.querySelectorAll('[data-wayglass-room]').forEach(button => {
    button.addEventListener('click', () => globalThis.__wayglassOS?.mount(button.dataset.wayglassRoom));
  });
  root.querySelectorAll('[data-toy-profile]').forEach(button => {
    button.addEventListener('click', () => applyProfile(button.dataset.toyProfile));
  });

  // Mote Herd
  const moteCanvas = root.querySelector('[data-mote-canvas]');
  const moteContext = moteCanvas.getContext('2d');
  let moteMode = 'attract';
  let motePointer = { x: moteCanvas.width / 2, y: moteCanvas.height / 2, active: false };
  let motes = [];
  let moteFrame = 0;

  function newMote() {
    return {
      x: Math.random() * moteCanvas.width,
      y: Math.random() * moteCanvas.height,
      vx: (Math.random() - .5) * 1.2,
      vy: (Math.random() - .5) * 1.2,
      size: 1.4 + Math.random() * 2.8,
      hue: Math.random() > .5 ? 168 : 267,
    };
  }

  function syncMotes() {
    const target = Math.max(16, Math.round(18 + 54 * profile.particle_density));
    while (motes.length < target) motes.push(newMote());
    if (motes.length > target) motes.length = target;
  }

  function drawMotes() {
    if (!moteContext || disposed) return;
    const g = moteContext;
    g.clearRect(0, 0, moteCanvas.width, moteCanvas.height);
    const wash = g.createRadialGradient(motePointer.x, motePointer.y, 8, motePointer.x, motePointer.y, 210);
    wash.addColorStop(0, 'rgba(134, 242, 223,' + (.06 + .08 * profile.glow) + ')');
    wash.addColorStop(1, 'rgba(90, 70, 160, 0)');
    g.fillStyle = wash;
    g.fillRect(0, 0, moteCanvas.width, moteCanvas.height);
    for (const mote of motes) {
      const light = 66 + profile.glow * 18;
      g.fillStyle = 'hsla(' + mote.hue + ', 72%, ' + light + '%, ' + (.28 + profile.glow * .52) + ')';
      g.shadowColor = 'hsla(' + mote.hue + ', 80%, 72%, .75)';
      g.shadowBlur = 4 + profile.glow * 12;
      g.beginPath();
      g.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
      g.fill();
    }
    g.shadowBlur = 0;
  }

  function stepMotes() {
    if (disposed) return;
    const speed = profile.motion;
    if (speed <= 0) { drawMotes(); return; }
    for (const mote of motes) {
      if (motePointer.active) {
        const dx = motePointer.x - mote.x;
        const dy = motePointer.y - mote.y;
        const distance = Math.max(22, Math.hypot(dx, dy));
        const sign = moteMode === 'repel' ? -1 : 1;
        const force = sign * (0.42 + profile.glow * .42) / distance;
        mote.vx += dx * force * speed;
        mote.vy += dy * force * speed;
      }
      mote.vx += (Math.random() - .5) * .018 * speed;
      mote.vy += (Math.random() - .5) * .018 * speed;
      mote.vx *= .978;
      mote.vy *= .978;
      const max = 2.4 * Math.max(.35, speed);
      mote.vx = Math.max(-max, Math.min(max, mote.vx));
      mote.vy = Math.max(-max, Math.min(max, mote.vy));
      mote.x += mote.vx;
      mote.y += mote.vy;
      if (mote.x < -8) mote.x = moteCanvas.width + 8;
      if (mote.x > moteCanvas.width + 8) mote.x = -8;
      if (mote.y < -8) mote.y = moteCanvas.height + 8;
      if (mote.y > moteCanvas.height + 8) mote.y = -8;
    }
    drawMotes();
    moteFrame = requestAnimationFrame(stepMotes);
  }

  function restartMotes() {
    cancelAnimationFrame(moteFrame);
    if (profile.motion > 0) moteFrame = requestAnimationFrame(stepMotes);
    else drawMotes();
  }

  function setMotePointer(event, active = true) {
    const point = pointerPoint(event, moteCanvas);
    if (!point) return;
    motePointer = { ...point, active };
    if (profile.motion <= 0) drawMotes();
  }

  moteCanvas.addEventListener('pointerdown', event => { moteCanvas.setPointerCapture?.(event.pointerId); setMotePointer(event, true); wake(.42, .5); });
  moteCanvas.addEventListener('pointermove', event => setMotePointer(event, event.buttons > 0 || event.pointerType === 'touch'));
  moteCanvas.addEventListener('pointerup', event => { setMotePointer(event, false); moteCanvas.releasePointerCapture?.(event.pointerId); });
  moteCanvas.addEventListener('pointerleave', () => { motePointer.active = false; });
  root.querySelectorAll('[data-mote-mode]').forEach(button => button.addEventListener('click', () => {
    moteMode = button.dataset.moteMode;
    root.querySelectorAll('[data-mote-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    wake(.4, .46);
  }));
  root.querySelector('[data-mote-reset]').addEventListener('click', () => {
    motes = motes.map(() => newMote());
    drawMotes();
    wake(.55, .5);
  });

  // Ghost Trace
  const traceCanvas = root.querySelector('[data-trace-canvas]');
  const traceContext = traceCanvas.getContext('2d');
  let tracing = false;
  let lastTrace = null;
  let traceFrame = 0;

  function clearTrace() {
    traceContext?.clearRect(0, 0, traceCanvas.width, traceCanvas.height);
  }

  function drawTraceSegment(from, to) {
    if (!traceContext || !from || !to) return;
    const g = traceContext;
    const gradient = g.createLinearGradient(from.x, from.y, to.x, to.y);
    gradient.addColorStop(0, 'rgba(126, 233, 215,' + (.42 + .34 * profile.glow) + ')');
    gradient.addColorStop(1, 'rgba(192, 148, 250,' + (.34 + .38 * profile.glow) + ')');
    g.strokeStyle = gradient;
    g.lineWidth = 2.2 + profile.glow * 3.1;
    g.lineCap = 'round';
    g.shadowColor = 'rgba(142, 236, 221,.7)';
    g.shadowBlur = 7 + profile.glow * 15;
    g.beginPath();
    g.moveTo(from.x, from.y);
    g.lineTo(to.x, to.y);
    g.stroke();
    g.shadowBlur = 0;
  }

  function fadeTrace() {
    if (disposed) return;
    if (profile.motion > 0 && traceContext) {
      const alpha = Math.max(.004, (1 - profile.trail_persistence) * .075);
      traceContext.fillStyle = 'rgba(3, 8, 17, ' + alpha + ')';
      traceContext.fillRect(0, 0, traceCanvas.width, traceCanvas.height);
      traceFrame = requestAnimationFrame(fadeTrace);
    }
  }

  traceCanvas.addEventListener('pointerdown', event => {
    tracing = true;
    traceCanvas.setPointerCapture?.(event.pointerId);
    lastTrace = pointerPoint(event, traceCanvas);
    wake(.36, .52);
  });
  traceCanvas.addEventListener('pointermove', event => {
    if (!tracing) return;
    const next = pointerPoint(event, traceCanvas);
    drawTraceSegment(lastTrace, next);
    lastTrace = next;
  });
  const endTrace = event => {
    tracing = false;
    lastTrace = null;
    traceCanvas.releasePointerCapture?.(event.pointerId);
  };
  traceCanvas.addEventListener('pointerup', endTrace);
  traceCanvas.addEventListener('pointercancel', endTrace);
  root.querySelector('[data-trace-clear]').addEventListener('click', () => { clearTrace(); wake(.28, .25); });

  // Click Garden
  function vibrate(pattern) {
    const scale = profile.haptic_scale;
    if (!hapticsAvailable || scale <= 0) return false;
    const scaled = (Array.isArray(pattern) ? pattern : [pattern]).map((duration, index) =>
      index % 2 === 0 ? Math.max(1, Math.round(duration * scale)) : Math.max(1, Math.round(duration))
    );
    try { return globalThis.navigator.vibrate(scaled); } catch { return false; }
  }

  root.querySelectorAll('.click-seed').forEach(seed => seed.addEventListener('click', () => {
    const next = seed.getAttribute('aria-pressed') !== 'true';
    seed.setAttribute('aria-pressed', String(next));
    vibrate(next ? 18 : 8);
    wake(next ? .38 : .24, .42);
  }));
  root.querySelector('[data-garden-clear]').addEventListener('click', () => {
    root.querySelectorAll('.click-seed').forEach(seed => seed.setAttribute('aria-pressed', 'false'));
    vibrate([12, 24, 12]);
    wake(.28, .25);
  });

  // Vibe Stone
  const vibeStage = root.querySelector('[data-vibe-stage]');
  const vibeStatus = root.querySelector('[data-vibe-status]');
  const patterns = {
    pulse: [38],
    wave: [24, 32, 42, 32, 62],
    heartbeat: [46, 72, 74, 210, 46, 72, 74],
  };
  root.querySelectorAll('[data-vibe]').forEach(button => button.addEventListener('click', () => {
    const pattern = patterns[button.dataset.vibe] || [30];
    const worked = vibrate(pattern);
    vibeStage.dataset.vibing = 'true';
    globalThis.setTimeout(() => { if (vibeStage.isConnected) vibeStage.dataset.vibing = 'false'; }, 240);
    vibeStatus.textContent = worked
      ? button.textContent + ' sent to this device.'
      : 'No vibration response detected; the visual stone still answered.';
    wake(.48, .58);
  }));

  // Sound Nest
  let audioContext = null;
  let audioGain = null;
  let soundNodes = [];
  let activeSound = null;
  const soundStage = root.querySelector('[data-sound-stage]');
  const soundStatus = root.querySelector('[data-sound-status]');

  function stopSound(update = true) {
    for (const node of soundNodes) {
      try { node.stop?.(); } catch {}
      try { node.disconnect?.(); } catch {}
    }
    soundNodes = [];
    activeSound = null;
    soundStage.dataset.sounding = 'false';
    root.querySelectorAll('[data-sound]').forEach(button => button.setAttribute('aria-pressed', 'false'));
    if (update) soundStatus.textContent = 'Sound stopped.';
  }

  function updateSoundGain() {
    if (audioGain && audioContext) {
      const target = 0.045 * profile.audio_gain;
      audioGain.gain.setTargetAtTime(target, audioContext.currentTime, .04);
    }
  }

  async function startSound(kind) {
    if (!audioAvailable) {
      soundStatus.textContent = 'Web Audio is unavailable in this browser.';
      return;
    }
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!audioContext) {
        audioContext = new Audio();
        audioGain = audioContext.createGain();
        audioGain.connect(audioContext.destination);
      }
      if (audioContext.state === 'suspended') await audioContext.resume();
      stopSound(false);
      updateSoundGain();
      if (kind === 'hum') {
        const oscillator = audioContext.createOscillator();
        const overtone = audioContext.createOscillator();
        const localGain = audioContext.createGain();
        oscillator.type = 'sine';
        overtone.type = 'sine';
        oscillator.frequency.value = 110;
        overtone.frequency.value = 220;
        localGain.gain.value = .68;
        oscillator.connect(localGain);
        overtone.connect(localGain);
        localGain.connect(audioGain);
        oscillator.start();
        overtone.start();
        soundNodes.push(oscillator, overtone, localGain);
      } else {
        const source = audioContext.createBufferSource();
        source.buffer = createNoiseBuffer(audioContext, kind);
        source.loop = true;
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = kind === 'brown' ? 1150 : 4200;
        source.connect(filter).connect(audioGain);
        source.start();
        soundNodes.push(source, filter);
      }
      activeSound = kind;
      soundStage.dataset.sounding = 'true';
      root.querySelectorAll('[data-sound]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.sound === kind));
      });
      soundStatus.textContent = (kind === 'hum' ? 'Soft hum' : kind[0].toUpperCase() + kind.slice(1) + ' noise') + ' playing locally.';
      wake(.34 + profile.glow * .15, .3);
    } catch {
      soundStatus.textContent = 'Sound could not start; visual toys remain available.';
    }
  }

  root.querySelectorAll('[data-sound]').forEach(button => button.addEventListener('click', () => {
    const kind = button.dataset.sound;
    if (kind === 'stop') stopSound();
    else if (activeSound === kind) stopSound();
    else startSound(kind);
  }));

  // Time Puddle
  const puddle = root.querySelector('[data-puddle]');
  const minuteInput = root.querySelector('[data-puddle-minutes]');
  const minuteLabel = root.querySelector('[data-puddle-minute-label]');
  let puddleDuration = Number(minuteInput.value) * 60_000;
  let puddleRemaining = puddleDuration;
  let puddleRunning = false;
  let puddleLast = 0;
  let puddleFrame = 0;

  function renderPuddle() {
    const ratio = puddleDuration > 0 ? Math.max(0, Math.min(1, puddleRemaining / puddleDuration)) : 0;
    puddle.style.setProperty('--puddle-progress', ratio);
    puddle.dataset.time = formatTime(puddleRemaining);
  }

  function resetPuddle() {
    puddleDuration = Number(minuteInput.value) * 60_000;
    puddleRemaining = puddleDuration;
    puddleRunning = false;
    puddleLast = 0;
    cancelAnimationFrame(puddleFrame);
    renderPuddle();
  }

  function stepPuddle(now) {
    if (disposed || !puddleRunning) return;
    if (!puddleLast) puddleLast = now;
    const delta = now - puddleLast;
    puddleLast = now;
    puddleRemaining = Math.max(0, puddleRemaining - delta);
    renderPuddle();
    if (puddleRemaining <= 0) {
      puddleRunning = false;
      vibrate([28, 50, 28]);
      wake(.48, .22);
      return;
    }
    puddleFrame = requestAnimationFrame(stepPuddle);
  }

  minuteInput.addEventListener('input', () => {
    minuteLabel.textContent = minuteInput.value + ' min';
    resetPuddle();
  });
  root.querySelector('[data-puddle-start]').addEventListener('click', () => {
    if (puddleRemaining <= 0) resetPuddle();
    if (puddleRunning) return;
    puddleRunning = true;
    puddleLast = 0;
    puddleFrame = requestAnimationFrame(stepPuddle);
    wake(.28, .32);
  });
  root.querySelector('[data-puddle-pause]').addEventListener('click', () => {
    puddleRunning = false;
    puddleLast = 0;
    cancelAnimationFrame(puddleFrame);
  });
  root.querySelector('[data-puddle-reset]').addEventListener('click', resetPuddle);

  applyProfile(profileId);
  syncMotes();
  drawMotes();
  restartMotes();
  if (profile.motion > 0) traceFrame = requestAnimationFrame(fadeTrace);
  renderPuddle();

  const snapshot = toyboxSnapshot({ profile: profileId, reducedMotion, hapticsAvailable, audioAvailable });
  surface.dataset.toyCount = String(snapshot.toys.length);

  return () => {
    disposed = true;
    cancelAnimationFrame(moteFrame);
    cancelAnimationFrame(traceFrame);
    cancelAnimationFrame(puddleFrame);
    try { globalThis.navigator?.vibrate?.(0); } catch {}
    stopSound(false);
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
  };
}
