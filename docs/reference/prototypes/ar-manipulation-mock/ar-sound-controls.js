import { AR_SOUND_DEFAULTS, AR_SOUND_EVENTS, AR_SOUND_LIMITS } from './ar-sound.model.js';

function clampVolume(value) {
  return Math.max(AR_SOUND_LIMITS.minVolume, Math.min(AR_SOUND_LIMITS.maxVolume, Number(value)));
}

export function createARSoundControls(options = {}) {
  let state = { ...AR_SOUND_DEFAULTS };
  let audioContext = null;
  const onChange = options.onChange ?? (() => {});

  function emit() {
    onChange({ ...state });
  }

  async function enable() {
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    state.enabled = true;
    emit();
  }

  function disable() {
    state.enabled = false;
    emit();
  }

  function setVolume(value) {
    state.volume = clampVolume(value);
    emit();
  }

  function play(name) {
    if (!state.enabled || !audioContext) return;
    const event = AR_SOUND_EVENTS[name];
    if (!event) return;

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(event.frequency, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(state.volume * event.gain, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + event.durationMs / 1000);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + event.durationMs / 1000 + 0.02);
  }

  function getState() {
    return { ...state };
  }

  emit();

  return {
    getState,
    enable,
    disable,
    setVolume,
    play,
  };
}
