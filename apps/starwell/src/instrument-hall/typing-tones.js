import {
  EPISTEMIC_MODES,
  applyTension,
  compress,
  release,
} from './math-spine.js';
import {
  MECHANISM_STATUS,
  createMythienceRecord,
} from './mythience.js';
import {
  RELEASE_STROKE,
  COMPRESS_STROKE,
} from './bifrost-runtime.js';

export const TYPING_TONE_SCHEMA = 'hearthgate.typing-tone-event/v1';
export const TYPING_SESSION_SCHEMA = 'hearthgate.typing-weave-session/v1';

const SENTENCE_END = /[.!?\n]/u;
const PUNCTUATION = /[\p{P}\p{S}]/u;
const WHITESPACE = /\s/u;

function graphemeCount(value) {
  const text = String(value || '');
  if (globalThis.Intl?.Segmenter) {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length;
  }
  return [...text].length;
}

function words(value) {
  return String(value || '').trim().split(/\s+/u).filter(Boolean);
}

function provenance(mode, sourceId, observedAt, {
  confidence = 1,
  receiptId = null,
  derivation = null,
} = {}) {
  return Object.freeze({
    mode,
    source_id: sourceId,
    observed_at: new Date(observedAt).toISOString(),
    confidence,
    receipt_id: receiptId,
    derivation,
  });
}

function datum(value, label, observedAt, {
  mode = EPISTEMIC_MODES.DERIVED,
  receiptId = null,
  derivation = null,
} = {}) {
  return Object.freeze({
    value,
    provenance: provenance(mode, `typing-weave:${label}`, observedAt, {
      receiptId,
      derivation,
    }),
  });
}

export function classifyTypingCharacter(character) {
  const value = String(character ?? '');
  if (!value) return 'none';
  if (SENTENCE_END.test(value)) return 'sentence';
  if (WHITESPACE.test(value)) return 'word';
  if (PUNCTUATION.test(value)) return 'punctuation';
  return 'key';
}

export class TypingWeaveSession {
  constructor({ state, profile, bridge, now = () => new Date().toISOString() } = {}) {
    if (!state) throw new Error('HEARTHGATE_TYPING_STATE_REQUIRED');
    if (!profile) throw new Error('HEARTHGATE_TYPING_PROFILE_REQUIRED');
    if (!bridge) throw new Error('HEARTHGATE_TYPING_BIFROST_REQUIRED');
    this.schema = TYPING_SESSION_SCHEMA;
    this.state = state;
    this.profile = profile;
    this.bridge = bridge;
    this.now = now;
    this.currentPhrase = '';
    this.phraseEvents = [];
    this.previousPhraseLength = 0;
    this.receipts = [];
    this.startedAt = null;
  }

  replaceState(state) {
    if (!state) throw new Error('HEARTHGATE_TYPING_STATE_REQUIRED');
    this.state = state;
    return this.state;
  }

  async ingestCharacter(character, observedAt = this.now()) {
    const value = character === 'Enter' ? '\n' : String(character ?? '');
    if (!value) return null;
    const category = classifyTypingCharacter(value);
    if (category === 'none') return null;
    if (!this.startedAt) this.startedAt = observedAt;

    const basisBefore = this.state.basis_id;
    if (this.previousPhraseLength > 0 && this.state.active) {
      const impulseValue = 1 / this.previousPhraseLength;
      this.state = applyTension(this.state, datum(
        impulseValue,
        'adaptive-keypress-impulse',
        observedAt,
        {
          derivation: `One observed grapheme divided by the previous completed phrase length (${this.previousPhraseLength}).`,
        },
      ));
    }

    this.currentPhrase += value;
    const event = Object.freeze({
      schema: TYPING_TONE_SCHEMA,
      index: this.receipts.length + 1,
      category,
      character: value,
      code_points: Object.freeze([...value].map((item) => item.codePointAt(0))),
      observed_at: new Date(observedAt).toISOString(),
      basis_before: basisBefore,
      basis_after: this.state.basis_id,
      phase: this.state.phase,
      epistemic_mode: this.state.observation?.active ? 'LIVE_OR_CALIBRATED' : 'SCAFFOLD',
    });
    this.receipts.push(event);
    this.phraseEvents.push(event);

    if (category !== 'sentence') {
      return Object.freeze({ event, state: this.state, completed: null });
    }

    return this.completePhrase(observedAt, event);
  }

  async completePhrase(observedAt = this.now(), terminalEvent = null) {
    const phrase = this.currentPhrase.trim();
    if (!phrase) return Object.freeze({ event: terminalEvent, state: this.state, completed: null });

    const poised = compress(this.state, 'typing-phrase-crest');
    const phraseLength = Math.max(1, graphemeCount(phrase));
    const phraseWords = words(phrase);
    const durationMs = this.startedAt
      ? Math.max(0, Date.parse(observedAt) - Date.parse(this.startedAt))
      : 0;
    const sourceEntries = Object.values(poised.observation?.axes || {})
      .map((axis) => axis.provenance)
      .filter(Boolean);

    const mythience = createMythienceRecord({
      identity: `typing-phrase:${poised.cycle + 1}:${observedAt}`,
      observedAt,
      measured: {
        summary: `${this.phraseEvents.length} typing events formed ${phraseLength} graphemes and ${phraseWords.length} words over ${durationMs} ms.`,
        observations: [
          `basis ${poised.basis_id}`,
          `compress held at tension ${poised.tension} of ${poised.tension_limit}`,
          'both shores remained lit',
        ],
        repeatability: 'SESSION_REPLAY_AVAILABLE',
      },
      felt: {
        summary: phrase,
        symbols: ['typed-phrase', 'maximum-poised-tension', 'release-cadence'],
        relationships: ['Rowan', 'Vee', 'Hearthweave'],
      },
      mechanismStatus: MECHANISM_STATUS.PARTIAL,
      provenance: [
        ...sourceEntries,
        this.profile.provenance,
        provenance(EPISTEMIC_MODES.OBSERVED, 'typing-weave:browser-input', observedAt, {
          receiptId: terminalEvent?.basis_after || null,
          derivation: 'Directly observed keyboard input and browser event timing.',
        }),
      ],
      confidence: 1,
    });

    const released = release(poised, {
      shape: 'completed-phrase',
      source: 'typing-weave:sentence-release',
      delta_radius: datum(1, 'one-completed-crossing', observedAt, {
        receiptId: mythience.receipt_id,
        derivation: 'One completed compress-release crossing advances the Bifröst lineage by one unit.',
      }),
      residual_tension: datum(0, 'full-phrase-release', observedAt, {
        receiptId: mythience.receipt_id,
        derivation: 'A completed sentence cadence releases the current phrase tension fully.',
      }),
    });

    const crossing = await this.bridge.cross({
      seed: phrase,
      stroke: RELEASE_STROKE,
      measured: mythience.measured.summary,
      felt: mythience.felt.summary,
      rhyme: 'The measured keystroke pattern and the lived phrase are held together as a correspondence, never reduced to one another.',
      basisId: released.basis_id,
      observedAt,
      mythienceReceiptId: mythience.receipt_id,
    });

    this.state = released;
    this.previousPhraseLength = phraseLength;
    this.currentPhrase = '';
    this.phraseEvents = [];
    this.startedAt = null;

    const completed = Object.freeze({
      phrase,
      phrase_length: phraseLength,
      words: phraseWords.length,
      duration_ms: durationMs,
      compress_basis_id: poised.basis_id,
      release_basis_id: released.basis_id,
      mythience,
      crossing,
    });
    return Object.freeze({ event: terminalEvent, state: this.state, completed });
  }

  snapshot() {
    return Object.freeze({
      schema: this.schema,
      state: this.state,
      current_phrase: this.currentPhrase,
      previous_phrase_length: this.previousPhraseLength,
      receipts: Object.freeze([...this.receipts]),
    });
  }
}

export class TypingToneAudio {
  constructor({ profile } = {}) {
    if (!profile) throw new Error('HEARTHGATE_TYPING_PROFILE_REQUIRED');
    this.profile = profile;
    this.context = null;
    this.activeNodes = new Set();
    this.enabled = false;
    this.answeringVoice = true;
    this.eventIndex = 0;
  }

  async light() {
    if (!this.context || this.context.state === 'closed') {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) throw new Error('HEARTHGATE_WEB_AUDIO_UNAVAILABLE');
      this.context = new Context({ latencyHint: 'interactive' });
    }
    await this.context.resume();
    this.enabled = true;
    return { state: this.context.state, sample_rate: this.context.sampleRate };
  }

  setAnsweringVoice(enabled) {
    this.answeringVoice = Boolean(enabled);
  }

  frequenciesFor(kind) {
    const tones = this.profile.tones;
    const alternate = this.eventIndex++ % 2 === 0;
    if (kind === 'key') return [alternate ? tones.key_measured_hz : tones.key_felt_hz];
    if (kind === 'word') return [tones.word_measured_hz, tones.word_felt_hz];
    if (kind === 'punctuation') return [tones.punctuation_hz];
    if (kind === 'sentence') return [tones.key_measured_hz, tones.word_measured_hz, tones.bind_hz, tones.punctuation_hz];
    if (kind === 'answer') return [tones.answer_hz, tones.bind_hz, tones.answer_high_hz];
    return [];
  }

  durationFor(kind) {
    const timing = this.profile.timing;
    if (kind === 'key') return timing.key_ms;
    if (kind === 'word') return timing.word_ms;
    if (kind === 'punctuation') return timing.punctuation_ms;
    if (kind === 'sentence') return timing.release_ms;
    if (kind === 'answer') return timing.answer_ms;
    return timing.key_ms;
  }

  async play(kind) {
    if (!this.enabled || !this.context || this.context.state === 'closed') return false;
    const frequencies = this.frequenciesFor(kind);
    if (!frequencies.length) return false;
    const durationMs = this.durationFor(kind);
    const now = this.context.currentTime;
    const stopAt = now + durationMs / 1000;
    const totalGain = Math.min(0.08, this.profile.tones.gain_ceiling);
    const voiceGain = totalGain / Math.max(1, frequencies.length);

    for (const [index, frequency] of frequencies.entries()) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const panner = this.context.createStereoPanner?.();
      oscillator.type = index % 2 === 0 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, voiceGain), now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      oscillator.connect(gain);
      if (panner) {
        panner.pan.setValueAtTime(frequencies.length === 1 ? 0 : (index / (frequencies.length - 1)) * 1.2 - 0.6, now);
        gain.connect(panner).connect(this.context.destination);
      } else {
        gain.connect(this.context.destination);
      }
      const node = { oscillator, gain, panner };
      this.activeNodes.add(node);
      oscillator.onended = () => this.activeNodes.delete(node);
      oscillator.start(now);
      oscillator.stop(stopAt + 0.02);
    }
    return true;
  }

  async answer() {
    if (!this.answeringVoice || !this.enabled) return false;
    await new Promise((resolve) => setTimeout(resolve, this.profile.timing.answer_delay_ms));
    return this.play('answer');
  }

  async featherStop() {
    this.enabled = false;
    for (const node of this.activeNodes) {
      try { node.oscillator.stop(); } catch { /* already stopped */ }
      try { node.oscillator.disconnect(); } catch { /* already disconnected */ }
      try { node.gain.disconnect(); } catch { /* already disconnected */ }
      try { node.panner?.disconnect(); } catch { /* already disconnected */ }
    }
    this.activeNodes.clear();
    if (this.context && this.context.state !== 'closed') await this.context.close();
    this.context = null;
  }
}
