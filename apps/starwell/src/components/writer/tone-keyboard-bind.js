// Writing room tone keyboard contract + Web Audio engine.
// Mirrors apps/starwell-server/lib/tone-keyboard.js for the renderer context.
// Frequencies and volumes are taken directly from tone-store.js PRESETS.

export const WRITER_TONES = [
  { id: 'dreaming', label: 'Between the Dreaming', shortLabel: 'Dreaming', key: '1', freqHz: 174,   overtoneHz: 417,    volume: 0.08 },
  { id: 'loch',     label: 'Lochflame',            shortLabel: 'Loch',     key: '2', freqHz: 136.1, overtoneHz: 272.2,  volume: 0.07 },
  { id: 'hearth',   label: 'Hearthfire',           shortLabel: 'Hearth',   key: '3', freqHz: 220,   overtoneHz: 330,    volume: 0.07 },
  { id: 'starfall', label: 'Starfall',             shortLabel: 'Starfall', key: '4', freqHz: 196,   overtoneHz: 523.25, volume: 0.05 },
  { id: 'obsidian', label: 'Black Glass',          shortLabel: 'Obsidian', key: '5', freqHz: 110,   overtoneHz: 220,    volume: 0.05 },
];

class WritingToneEngine {
  constructor() {
    this.ctx = null;
    this.nodes = null;
    this.activeToneId = null;
  }

  _context() {
    if (!this.ctx || this.ctx.state === 'closed') this.ctx = new AudioContext();
    return this.ctx;
  }

  async play(toneId) {
    const tone = WRITER_TONES.find((t) => t.id === toneId);
    if (!tone) return null;

    await this._stop(0.08);

    const ctx = this._context();
    await ctx.resume();

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(tone.volume, ctx.currentTime + 0.6);
    master.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = tone.freqHz;
    osc1.connect(master);
    osc1.start();

    const gain2 = ctx.createGain();
    gain2.gain.value = 0.38;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = tone.overtoneHz;
    osc2.connect(gain2);
    gain2.connect(master);
    osc2.start();

    this.nodes = { master, osc1, osc2, gain2 };
    this.activeToneId = toneId;
    return toneId;
  }

  async _stop(fadeTime = 0.9) {
    if (!this.nodes) return;
    const { master, osc1, osc2 } = this.nodes;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + fadeTime);
    const nodes = this.nodes;
    this.nodes = null;
    this.activeToneId = null;
    setTimeout(() => {
      try { nodes.osc1.stop(); } catch {}
      try { nodes.osc2.stop(); } catch {}
    }, (fadeTime + 0.15) * 1000);
  }

  async stop() { await this._stop(0.9); }
  async feather() { await this._stop(3.2); }

  adjustVolume(delta) {
    if (!this.nodes) return;
    const gain = this.nodes.master.gain;
    const next = Math.max(0, Math.min(0.35, gain.value + delta));
    gain.setValueAtTime(next, this.ctx.currentTime);
  }
}

let _engine = null;
function engine() {
  if (!_engine) _engine = new WritingToneEngine();
  return _engine;
}

export async function playTone(toneId) { return engine().play(toneId); }
export async function stopTone()       { return engine().stop(); }
export async function featherTone()    { return engine().feather(); }
export function adjustToneVolume(d)    { engine().adjustVolume(d); }
export function getActiveToneId()      { return _engine?.activeToneId ?? null; }

function hasModifiers(e) {
  return e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey;
}

export function attachToneKeyboard(onStateChange) {
  async function onKeyDown(e) {
    if (!hasModifiers(e)) return;

    const patch = WRITER_TONES.find((t) => e.key === t.key);
    if (patch) {
      e.preventDefault();
      await playTone(patch.id);
      onStateChange?.(patch.id);
      return;
    }

    if (e.key === '0') { e.preventDefault(); await stopTone();    onStateChange?.(null); return; }
    if (e.key.toLowerCase() === 'f') { e.preventDefault(); await featherTone(); onStateChange?.(null); return; }
    if (e.key === ']') { e.preventDefault(); adjustToneVolume(+0.02); return; }
    if (e.key === '[') { e.preventDefault(); adjustToneVolume(-0.02); return; }
  }

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
