const CUES = new Set(['invocation', 'offering', 'response', 'witness', 'return']);

function authorText(value, limit) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
}

function prose(title, paragraphs) {
  if (!authorText(title, 180) || !Array.isArray(paragraphs) || paragraphs.length < 1 ||
      paragraphs.length > 32 || !paragraphs.every(text => authorText(text, 4000))) {
    throw new TypeError('Prose requires a title and 1 to 32 nonempty paragraphs');
  }
  return { schema: 'wyrdrune.prose/v0.1', title, paragraphs, text: paragraphs.join('\n\n') };
}

function utterance(kind, voice, text) {
  if (!CUES.has(kind) || !authorText(voice, 180) || !authorText(text, 4000)) {
    throw new TypeError('Ritual utterance requires a cue, attributed voice and authored text');
  }
  return { kind, voice, text };
}

function silence(milliseconds) {
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 1 || milliseconds > 60000) {
    throw new RangeError('Ritual silence requires 1 to 60000 whole milliseconds');
  }
  return { kind: 'silence', milliseconds };
}

function ritual(title, cues) {
  if (!authorText(title, 180) || !Array.isArray(cues) || cues.length < 1 || cues.length > 32) {
    throw new TypeError('Ritual requires a title and 1 to 32 cues');
  }
  const score = cues.map(cue => cue?.kind === 'silence' ? silence(cue.milliseconds)
    : utterance(cue?.kind, cue?.voice, cue?.text));
  return { schema: 'wyrdrune.ritual-score/v0.1', title, cues: score, autoplay: false };
}

export const expressionOperations = [
  ['prose', { parameters: ['text', 'list'], result: 'record', run: prose }],
  ['utterance', { parameters: ['text', 'text', 'text'], result: 'record', run: utterance }],
  ['silence', { parameters: ['number'], result: 'record', run: silence }],
  ['ritual', { parameters: ['text', 'list'], result: 'record', run: ritual }],
];
