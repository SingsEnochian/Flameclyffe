export const CODEX_NARRATIVE_RENDERER_SCHEMA = 'hearthweave.codex-narrative-renderer/v0.1';

function clean(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function names(manifestation, aspectNames = {}) {
  return (manifestation?.aspectIds || []).map((id) => aspectNames[id] || id).filter(Boolean);
}

function firstName(manifestation, aspectNames) {
  return names(manifestation, aspectNames)[0] || 'Someone';
}

export function renderCodexNarrative(manifestation, { aspectNames = {} } = {}) {
  if (!manifestation || manifestation.quiet) return '';
  const who = firstName(manifestation, aspectNames);
  const text = clean(manifestation.text);

  // Every line below is a paraphrase of manifestation fields. No state may be invented here.
  switch (manifestation.kind) {
    case 'growth-claim':
      return text ? `${who} left a new ring: ${text}` : `${who} left a new growth ring.`;
    case 'growth-revision':
      return text ? `${who} changed the wording, and the older ring remained beneath it: ${text}` : `${who} revised an older ring without erasing it.`;
    case 'growth-contradiction':
      return text ? `${who} disagreed with an older ring: ${text}` : `${who} marked an older ring as contested.`;
    case 'growth-retired':
      return text ? `${who} set an older description down: ${text}` : `${who} retired an older growth description.`;
    case 'experiment-proposed':
      return text ? `${who} tucked a new experiment into the book: ${text}` : `${who} proposed an experiment.`;
    case 'experiment-running':
      return text ? `${who} is trying something now: ${text}` : `${who} has an experiment running.`;
    case 'experiment-outcome':
      return text ? `The experiment returned with an observation: ${text}` : 'The experiment returned.';
    case 'experiment-reflection':
      return text ? `${who} carried something forward from the experiment: ${text}` : `${who} left a reflection from the experiment.`;
    case 'narrative-branch':
    case 'alternate-proposal':
      return text ? `An alternate leaf opened: ${text}` : 'An alternate leaf opened.';
    case 'question':
      return text ? `${who} left a question in the margin: ${text}` : `${who} left a question in the margin.`;
    case 'refusal':
      return text ? `${who} closed this path: ${text}` : `${who} closed this path.`;
    case 'pause':
      return text ? `${who} paused here: ${text}` : `${who} paused here.`;
    case 'recurring-collaboration': {
      const pair = names(manifestation, aspectNames);
      return pair.length >= 2 ? `${pair.join(' and ')} have crossed this ground together often enough for the book to remember the path.` : 'A recurring collaboration has left a visible path.';
    }
    case 'unfinished-thread':
      return text ? `This thread is still unfinished: ${text}` : 'This thread is still unfinished.';
    case 'coalition-working': {
      const group = names(manifestation, aspectNames);
      return group.length ? `${group.join(', ')} are working this trace together.` : 'A small coalition is working this trace.';
    }
    case 'coalition-returned':
      return 'The coalition has returned; its trace remains.';
    case 'observation':
    case 'proposal':
    default:
      return text ? `${who}: ${text}` : '';
  }
}

export function renderCodexNarrativeBatch(manifestations = [], options = {}) {
  return Object.freeze((Array.isArray(manifestations) ? manifestations : [])
    .map((manifestation) => Object.freeze({ id: manifestation.id, text: renderCodexNarrative(manifestation, options) }))
    .filter((row) => row.text));
}
