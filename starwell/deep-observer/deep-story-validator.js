const NARRATIVE_TREATMENTS = new Set([
  'verbatim',
  'paraphrased',
  'sequenced',
  'interpreted',
  'mythologised',
  'speculated',
  'fictionalised',
]);

function error(path, message) {
  return { path, message };
}

export function validateDeepStoryRecord(record) {
  const errors = [];

  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { valid: false, errors: [error('$', 'Record must be an object.')] };
  }

  if (record.dataset_kind !== 'deep_story') {
    errors.push(error('dataset_kind', 'Expected dataset_kind to equal deep_story.'));
  }

  const declaredSources = new Set();
  if (!Array.isArray(record.source_refs) || record.source_refs.length === 0) {
    errors.push(error('source_refs', 'At least one source reference is required.'));
  } else {
    record.source_refs.forEach((source, index) => {
      const ref = source?.ref;
      if (typeof ref !== 'string' || ref.length === 0) {
        errors.push(error(`source_refs[${index}].ref`, 'Source ref must be a non-empty string.'));
        return;
      }
      if (declaredSources.has(ref)) {
        errors.push(error(`source_refs[${index}].ref`, `Duplicate source ref: ${ref}.`));
      }
      declaredSources.add(ref);
    });
  }

  if (!Array.isArray(record.events) || record.events.length === 0) {
    errors.push(error('events', 'At least one story event is required.'));
  } else {
    record.events.forEach((event, index) => {
      const eventPath = `events[${index}]`;
      if (!NARRATIVE_TREATMENTS.has(event?.narrative_treatment)) {
        errors.push(error(
          `${eventPath}.narrative_treatment`,
          'Every event must explicitly declare a valid narrative treatment.'
        ));
      }

      if (!Array.isArray(event?.source_refs) || event.source_refs.length === 0) {
        errors.push(error(`${eventPath}.source_refs`, 'Every event must reference at least one declared source.'));
        return;
      }

      event.source_refs.forEach((sourceRef, sourceIndex) => {
        if (!declaredSources.has(sourceRef)) {
          errors.push(error(
            `${eventPath}.source_refs[${sourceIndex}]`,
            `Unknown source ref: ${sourceRef}.`
          ));
        }
      });
    });
  }

  return { valid: errors.length === 0, errors };
}

export function assertValidDeepStoryRecord(record) {
  const result = validateDeepStoryRecord(record);
  if (!result.valid) {
    const detail = result.errors.map(({ path, message }) => `${path}: ${message}`).join('\n');
    throw new Error(`Invalid DEEPStory record:\n${detail}`);
  }
  return record;
}
