import { StorySoundscape } from './story-soundscape.js';
import { completedWordsFromInsertion, keystrokeTone, typingDelta, wordTone } from './typing-sonification.js';

const MAX_KEYS_PER_INPUT = 48;
const MAX_WORDS_PER_INPUT = 12;
const MAX_TYPING_RECEIPTS = 96;
const KNOWN_WORLD_ROOTS = Object.freeze({
  'terra aeterna': 220,
  luna: 432,
  'ta’veren vaen': 120,
  "ta'veren vaen": 120,
  starsong: 528,
  'equestria starsong': 528,
  'hearthweave foundation': 144,
});

function transient(soundscape, frequency, { duration = 0.045, peak = 0.026, waveform = 'sine', delay = 0 } = {}) {
  if (!soundscape.context || !soundscape.buses?.tones) return false;
  const now = soundscape.context.currentTime + delay;
  const oscillator = soundscape.context.createOscillator();
  const gain = soundscape.context.createGain();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(Math.max(20, Math.min(12000, frequency)), now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + Math.min(0.012, duration / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(soundscape.buses.tones);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
  return true;
}

function remember(soundscape, receipt) {
  soundscape.typingReceipts ||= [];
  soundscape.typingReceipts.unshift(Object.freeze(receipt));
  soundscape.typingReceipts = soundscape.typingReceipts.slice(0, MAX_TYPING_RECEIPTS);
}

function liveWorldHint(soundscape) {
  const visibleName = document.querySelector('.sidebar-world strong')?.textContent?.trim() || soundscape.world.worldName || 'Unassigned World';
  const visibleRoot = Number(document.querySelector('[data-sound-root]')?.value);
  const knownRoot = KNOWN_WORLD_ROOTS[visibleName.toLocaleLowerCase('en-US')];
  const rootHz = Number.isFinite(visibleRoot) && visibleRoot > 0 ? visibleRoot : (knownRoot || soundscape.world.rootHz || 369);
  const existingId = soundscape.world.worldId && soundscape.world.worldId !== 'unassigned-world' ? soundscape.world.worldId : null;
  const slug = visibleName.toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unassigned-world';
  return { id: existingId || `typing-${slug}`, name: visibleName, rootHz, soundscape: { rootHz, waveform: soundscape.world.waveform, overtones: soundscape.world.overtones } };
}

function playKey(soundscape, character, index = 0) {
  const tone = keystrokeTone(character, soundscape.world.rootHz);
  const audible = transient(soundscape, tone.frequency_hz, {
    duration: tone.role === 'punctuation-cadence' ? 0.075 : 0.042,
    peak: tone.role === 'space-cadence' ? 0.016 : 0.026,
    waveform: tone.role === 'printable-key' ? 'triangle' : 'sine',
    delay: Math.min(index * 0.004, 0.08),
  });
  remember(soundscape, {
    schema: 'arcsweep.typing-key-tone/v1',
    role: tone.role,
    character: tone.character,
    frequency_hz: tone.frequency_hz,
    root_hz: soundscape.world.rootHz,
    world_id: soundscape.world.worldId,
    audible,
    created_at: new Date().toISOString(),
  });
}

function playWord(soundscape, word, index = 0) {
  const tone = wordTone(word, soundscape.world.rootHz);
  if (!tone) return;
  const delay = Math.min(index * 0.035, 0.18);
  const audible = transient(soundscape, tone.frequency_hz, { duration: 0.28, peak: 0.07, waveform: 'sine', delay });
  transient(soundscape, tone.first_key_hz, { duration: 0.18, peak: 0.018, waveform: 'sine', delay: delay + 0.01 });
  if (tone.last_key_hz !== tone.first_key_hz) transient(soundscape, tone.last_key_hz, { duration: 0.2, peak: 0.018, waveform: 'sine', delay: delay + 0.018 });
  soundscape.playSoundfontNote(tone.frequency_hz, 0.24, 74);
  soundscape.sendMidi(tone.frequency_hz, 220);
  remember(soundscape, {
    schema: 'arcsweep.typing-word-tone/v1',
    role: 'word-resolution',
    word: tone.word,
    frequency_hz: tone.frequency_hz,
    key_frequencies_hz: tone.key_frequencies_hz,
    algorithm: tone.algorithm,
    root_hz: tone.root_hz,
    world_id: soundscape.world.worldId,
    audible,
    created_at: new Date().toISOString(),
  });
}

function sonifyEdit(soundscape, previousText, nextText) {
  if (!soundscape.armed || soundscape.typingSonificationEnabled === false) return;
  const delta = typingDelta(previousText, nextText);
  if (delta.inserted) {
    [...delta.inserted].slice(0, MAX_KEYS_PER_INPUT).forEach((character, index) => playKey(soundscape, character, index));
    completedWordsFromInsertion(previousText, nextText).slice(-MAX_WORDS_PER_INPUT).forEach((word, index) => playWord(soundscape, word, index));
  }
  if (delta.deleted) {
    const tone = keystrokeTone('', soundscape.world.rootHz);
    transient(soundscape, tone.frequency_hz, { duration: 0.055, peak: 0.02, waveform: 'sine' });
    remember(soundscape, {
      schema: 'arcsweep.typing-key-tone/v1',
      role: 'delete',
      deleted_count: [...delta.deleted].length,
      frequency_hz: tone.frequency_hz,
      root_hz: soundscape.world.rootHz,
      world_id: soundscape.world.worldId,
      audible: true,
      created_at: new Date().toISOString(),
    });
  }
}

const originalHandleText = StorySoundscape.prototype.handleText;
const originalClearTurn = StorySoundscape.prototype.clearTurn;
const originalSnapshot = StorySoundscape.prototype.snapshot;

if (!StorySoundscape.prototype.__typingSonifierInstalled) {
  Object.defineProperty(StorySoundscape.prototype, '__typingSonifierInstalled', { value: true });

  StorySoundscape.prototype.handleText = function handleTextWithTypingSonification(text) {
    const previous = String(this.lastText || '');
    const next = String(text || '');
    if (!this.armed && this.typingSonificationEnabled !== false) {
      const world = liveWorldHint(this);
      this.setWorld(world);
      void this.arm(world).catch(() => null);
    }
    sonifyEdit(this, previous, next);
    return originalHandleText.call(this, next);
  };

  StorySoundscape.prototype.clearTurn = function clearTurnWithTypingSonification(text = '') {
    this.typingReceipts = [];
    return originalClearTurn.call(this, text);
  };

  StorySoundscape.prototype.snapshot = function snapshotWithTypingSonification() {
    const snapshot = originalSnapshot.call(this);
    return {
      ...snapshot,
      typingSonification: this.typingSonificationEnabled !== false,
      typingReceipts: structuredClone(this.typingReceipts || []),
    };
  };
}
