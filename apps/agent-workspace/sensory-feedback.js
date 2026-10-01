const STORAGE_KEY = 'hearthweave.sensory-feedback/v0.1';
const DEFAULT_STATE = Object.freeze({ audio: true, haptics: true });

let state = loadState();
let audioContext = null;
let masterGain = null;

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_STATE };
    return {
      audio: parsed.audio !== false,
      haptics: parsed.haptics !== false,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function ensureAudio() {
  if (!state.audio) return null;
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Audio) return null;
  if (!audioContext) {
    audioContext = new Audio();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.055;
    masterGain.connect(audioContext.destination);
  }
  if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {});
  return audioContext;
}

function chirp({ frequency = 620, endFrequency = null, duration = 0.045, gain = 0.5, type = 'sine' } = {}) {
  const context = ensureAudio();
  if (!context || !masterGain) return false;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), now + Math.min(0.012, duration / 3));
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(envelope);
  envelope.connect(masterGain);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.01);
  return true;
}

function vibrate(pattern = 8) {
  if (!state.haptics || typeof navigator?.vibrate !== 'function') return false;
  return navigator.vibrate(pattern);
}

const gestures = Object.freeze({
  tap() {
    chirp({ frequency: 540, endFrequency: 620, duration: 0.035, gain: 0.34 });
    vibrate(6);
  },
  select() {
    chirp({ frequency: 610, endFrequency: 760, duration: 0.05, gain: 0.38 });
    vibrate(8);
  },
  open() {
    chirp({ frequency: 420, endFrequency: 720, duration: 0.09, gain: 0.42 });
    vibrate([7, 18, 9]);
  },
  send() {
    chirp({ frequency: 470, endFrequency: 840, duration: 0.075, gain: 0.44, type: 'triangle' });
    vibrate([9, 16, 12]);
  },
  success() {
    chirp({ frequency: 660, endFrequency: 920, duration: 0.08, gain: 0.42 });
    setTimeout(() => chirp({ frequency: 920, endFrequency: 1120, duration: 0.055, gain: 0.28 }), 42);
    vibrate([7, 22, 7]);
  },
  warning() {
    chirp({ frequency: 330, endFrequency: 250, duration: 0.095, gain: 0.36, type: 'triangle' });
    vibrate([18, 28, 18]);
  },
});

function toggle(kind) {
  if (!['audio', 'haptics'].includes(kind)) return;
  state = { ...state, [kind]: !state[kind] };
  saveState();
  renderControl();
  if (kind === 'audio' && state.audio) gestures.select();
  if (kind === 'haptics' && state.haptics) vibrate(12);
}

function controlMarkup() {
  const audio = state.audio ? 'sound on' : 'sound off';
  const haptics = state.haptics ? 'haptics on' : 'haptics off';
  return `<span class="crow-nest-chip sensory-control" data-sensory-control>
    <button type="button" data-sensory-toggle="audio" aria-pressed="${state.audio}">${audio}</button>
    <button type="button" data-sensory-toggle="haptics" aria-pressed="${state.haptics}">${haptics}</button>
  </span>`;
}

function renderControl() {
  const telemetry = document.querySelector('[data-nest-telemetry]');
  if (!telemetry || telemetry.querySelector('[data-sensory-control]')) return;
  telemetry.insertAdjacentHTML('beforeend', controlMarkup());
}

function gestureForElement(target) {
  const button = target?.closest?.('button, [role="button"], a');
  if (!button) return null;
  if (button.matches('[data-sensory-toggle]')) return null;
  if (button.matches('[data-nest-launch]')) return 'open';
  if (button.matches('[data-nest-send], .house-chat-compose button[type="submit"]')) return 'send';
  if (button.matches('[data-nest-target], [data-agent-id], [data-view], select')) return 'select';
  return 'tap';
}

document.addEventListener('pointerdown', (event) => {
  const kind = gestureForElement(event.target);
  if (kind) gestures[kind]?.();
}, { passive: true });

document.addEventListener('click', (event) => {
  const toggleButton = event.target?.closest?.('[data-sensory-toggle]');
  if (toggleButton) {
    event.preventDefault();
    toggle(toggleButton.dataset.sensoryToggle);
  }
});

document.addEventListener('house:sensory-feedback', (event) => {
  const kind = String(event.detail?.kind || 'tap');
  gestures[kind]?.();
});

const observer = new MutationObserver(() => renderControl());
observer.observe(document.documentElement, { childList: true, subtree: true });
queueMicrotask(renderControl);

globalThis.HouseSensoryFeedback = Object.freeze({
  emit(kind = 'tap') { gestures[String(kind)]?.(); },
  getState() { return Object.freeze({ ...state }); },
  set({ audio = state.audio, haptics = state.haptics } = {}) {
    state = { audio: Boolean(audio), haptics: Boolean(haptics) };
    saveState();
    renderControl();
    return Object.freeze({ ...state });
  },
});
