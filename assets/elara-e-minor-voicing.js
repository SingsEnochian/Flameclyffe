'use strict';

(function () {
  const SCALE = new Set([0, 2, 4, 6, 7, 9, 11]);
  const MIN_HZ = 164.8138;
  const MAX_HZ = 987.7666;
  const state = { enabled: true };

  const hzToMidi = (hz) => 69 + 12 * Math.log2(Math.max(1, hz) / 440);
  const midiToHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  function nearestEMinorMidi(hz) {
    let folded = Number(hz) || 0;
    if (folded <= 180) return null;
    while (folded > MAX_HZ) folded /= 2;
    while (folded < MIN_HZ) folded *= 2;

    const centre = Math.round(hzToMidi(folded));
    let best = centre;
    let distance = Infinity;
    for (let offset = -12; offset <= 12; offset += 1) {
      const midi = centre + offset;
      const pitchClass = ((midi % 12) + 12) % 12;
      if (!SCALE.has(pitchClass)) continue;
      const candidateDistance = Math.abs(midi - hzToMidi(folded));
      if (candidateDistance < distance) {
        best = midi;
        distance = candidateDistance;
      }
    }
    while (midiToHz(best) > MAX_HZ) best -= 12;
    while (midiToHz(best) < MIN_HZ) best += 12;
    return best;
  }

  function voice(hz) {
    if (!state.enabled || !Number.isFinite(Number(hz)) || Number(hz) <= 180) return Number(hz);
    const midi = nearestEMinorMidi(Number(hz));
    return midi == null ? Number(hz) : midiToHz(midi);
  }

  function wrapContext(Context) {
    if (!Context?.prototype || Context.prototype.__elaraEMinorWrapped) return;
    const original = Context.prototype.createOscillator;
    if (typeof original !== 'function') return;

    Context.prototype.createOscillator = function (...args) {
      const oscillator = original.apply(this, args);
      const frequency = oscillator.frequency;
      ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime'].forEach((method) => {
        if (typeof frequency[method] !== 'function') return;
        const native = frequency[method].bind(frequency);
        try {
          frequency[method] = function (value, ...rest) {
            return native(voice(value), ...rest);
          };
        } catch (error) {}
      });
      return oscillator;
    };
    Context.prototype.__elaraEMinorWrapped = true;
  }

  function addControl() {
    const card = document.querySelector('[data-elara-full-song-card]');
    if (!card || card.querySelector('[data-e-minor-voicing]')) return false;
    const label = document.createElement('label');
    label.className = 'inline';
    label.innerHTML = '<input data-e-minor-voicing type="checkbox" checked> E natural minor voicing · top note B5 (987.77 Hz)';
    const stack = card.querySelector('.stack');
    if (stack) stack.prepend(label);
    else card.appendChild(label);
    label.querySelector('input').addEventListener('change', (event) => {
      state.enabled = event.currentTarget.checked;
      try { window.ElaraLiveSmoothing?.feather?.(); } catch (error) {}
      const status = card.querySelector('[data-song-status]');
      if (status) status.textContent = state.enabled
        ? 'E natural minor voicing active. Restart song to hear the new register.'
        : 'Canonical frequency voicing restored. Restart song to hear it.';
    });
    return true;
  }

  wrapContext(window.AudioContext);
  wrapContext(window.webkitAudioContext);

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (addControl() || attempts > 400) window.clearInterval(timer);
  }, 50);

  window.ElaraEMinorVoicing = {
    version: '0.1.0',
    setEnabled(value) { state.enabled = Boolean(value); },
    getState() { return { enabled: state.enabled, key: 'E natural minor', maximumHz: MAX_HZ }; },
    voice
  };
})();
