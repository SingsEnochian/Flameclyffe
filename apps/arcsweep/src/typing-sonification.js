const SCALE = Object.freeze([0, 2, 3, 5, 7, 9, 10, 12]);
const CADENCE = Object.freeze({ ' ': -12, '\t': -7, '\n': -5, '.': 0, ',': -2, ';': -3, ':': 2, '!': 7, '?': 5, '…': -5 });
const SENTENCE_BOUNDARY = /[.!?…\n]/u;
const WORD_PATTERN = /[\p{L}\p{N}'’_-]+/gu;

function positive(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${field} must be positive and finite`);
  return n;
}

function fold(frequency, rootHz) {
  const root = positive(rootHz, 'rootHz');
  let hz = positive(frequency, 'frequency');
  const low = Math.max(20, root / 2);
  const high = Math.min(8000, root * 4);
  while (hz < low) hz *= 2;
  while (hz > high) hz /= 2;
  return hz;
}

export function typingDelta(previousText = '', nextText = '') {
  const previous = String(previousText);
  const next = String(nextText);
  let start = 0;
  while (start < Math.min(previous.length, next.length) && previous[start] === next[start]) start += 1;
  let previousEnd = previous.length;
  let nextEnd = next.length;
  while (previousEnd > start && nextEnd > start && previous[previousEnd - 1] === next[nextEnd - 1]) {
    previousEnd -= 1;
    nextEnd -= 1;
  }
  return Object.freeze({ start, inserted: next.slice(start, nextEnd), deleted: previous.slice(start, previousEnd) });
}

export function keystrokeTone(character, rootHz) {
  const root = positive(rootHz, 'rootHz');
  const text = String(character ?? '');
  if (!text) return Object.freeze({ character: '', role: 'delete', semitones: -12, frequency_hz: fold(root / 2, root) });
  const char = [...text][0];
  if (Object.hasOwn(CADENCE, char)) {
    const semitones = CADENCE[char];
    return Object.freeze({ character: char, role: /\s/u.test(char) ? 'space-cadence' : 'punctuation-cadence', semitones, frequency_hz: fold(root * 2 ** (semitones / 12), root) });
  }
  const canonical = char.normalize('NFKC').toLocaleLowerCase('en-US');
  const codePoint = canonical.codePointAt(0) ?? 0;
  const semitones = SCALE[codePoint % SCALE.length] + (Math.floor(codePoint / SCALE.length) % 2) * 12;
  return Object.freeze({ character: char, role: 'printable-key', semitones, frequency_hz: fold(root * 2 ** (semitones / 12), root) });
}

export function wordTone(word, rootHz) {
  const root = positive(rootHz, 'rootHz');
  const characters = [...String(word || '').normalize('NFKC')].filter((char) => !/\s/u.test(char));
  if (!characters.length) return null;
  const keys = characters.map((char) => keystrokeTone(char, root));
  let weighted = 0;
  let totalWeight = 0;
  keys.forEach((key, index) => {
    const weight = index + 1;
    weighted += weight * Math.log(key.frequency_hz / root);
    totalWeight += weight;
  });
  const lengthLift = ((characters.length % 5) - 2) / 24;
  const frequency = fold(root * Math.exp(weighted / totalWeight) * 2 ** lengthLift, root);
  return Object.freeze({ word: characters.join(''), frequency_hz: frequency, root_hz: root, key_frequencies_hz: Object.freeze(keys.map((key) => key.frequency_hz)), first_key_hz: keys[0].frequency_hz, last_key_hz: keys.at(-1).frequency_hz, algorithm: 'weighted-log-key-composition/v1' });
}

export function sentenceTone(sentence, rootHz) {
  const root = positive(rootHz, 'rootHz');
  const source = String(sentence || '').normalize('NFKC').trim();
  const words = [...source.matchAll(WORD_PATTERN)].map((match) => match[0]);
  if (!words.length) return null;
  const wordTones = words.map((word) => wordTone(word, root));
  let weighted = 0;
  let totalWeight = 0;
  wordTones.forEach((tone, index) => {
    const weight = index + 1;
    weighted += weight * Math.log(tone.frequency_hz / root);
    totalWeight += weight;
  });
  const terminal = [...source].at(-1) || '.';
  const cadenceSemitones = Object.hasOwn(CADENCE, terminal) ? CADENCE[terminal] : 0;
  const cadencePull = cadenceSemitones / 48;
  const frequency = fold(root * Math.exp(weighted / totalWeight) * 2 ** cadencePull, root);
  const firstWordHz = wordTones[0].frequency_hz;
  const lastWordHz = wordTones.at(-1).frequency_hz;
  return Object.freeze({
    sentence: source,
    words: Object.freeze([...words]),
    frequency_hz: frequency,
    root_hz: root,
    word_frequencies_hz: Object.freeze(wordTones.map((tone) => tone.frequency_hz)),
    voice_frequencies_hz: Object.freeze([frequency, firstWordHz, lastWordHz]),
    terminal,
    cadence_semitones: cadenceSemitones,
    algorithm: 'weighted-log-word-composition/v1',
  });
}

export function completedWordsFromInsertion(previousText, nextText) {
  const delta = typingDelta(previousText, nextText);
  if (!delta.inserted) return Object.freeze([]);
  const prefix = String(previousText).slice(0, delta.start);
  let token = prefix.match(/[\p{L}\p{N}'’_-]+$/u)?.[0] || '';
  const completed = [];
  for (const char of [...delta.inserted]) {
    if (/[\p{L}\p{N}'’_-]/u.test(char)) token += char;
    else if (token) { completed.push(token); token = ''; }
  }
  return Object.freeze(completed);
}

export function completedSentencesFromInsertion(previousText, nextText) {
  const delta = typingDelta(previousText, nextText);
  if (!delta.inserted) return Object.freeze([]);
  const prefix = String(previousText).slice(0, delta.start);
  const lastBoundary = Math.max(
    prefix.lastIndexOf('.'), prefix.lastIndexOf('!'), prefix.lastIndexOf('?'),
    prefix.lastIndexOf('…'), prefix.lastIndexOf('\n'),
  );
  let sentence = prefix.slice(lastBoundary + 1);
  const completed = [];
  for (const char of [...delta.inserted]) {
    sentence += char;
    if (SENTENCE_BOUNDARY.test(char)) {
      const resolved = sentence.trim();
      if (/[\p{L}\p{N}]/u.test(resolved)) completed.push(resolved);
      sentence = '';
    }
  }
  return Object.freeze(completed);
}
