let audioContext = null;

function getAudioContext() {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass({ latencyHint: 'interactive' });
  return audioContext;
}

export async function emitInteractionCue(kind = 'switch') {
  try {
    if (typeof navigator?.vibrate === 'function') {
      navigator.vibrate(kind === 'handoff' ? [9, 22, 9] : 8);
    }
  } catch {}

  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === 'suspended') await context.resume();
    const osc = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(kind === 'ooc' ? 420 : kind === 'handoff' ? 510 : 620, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.018, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    osc.connect(gain).connect(context.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  } catch {}
}
