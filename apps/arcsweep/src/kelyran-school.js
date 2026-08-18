export const KELYRAN_SCHOOL_SCHEMA = 'arcsweep.kelyran-school/v0.1';
export const KELYRAN_CANON_REVISION = 'kelyran-canon/ember-0.1';

export const KELYRAN_LEVELS = Object.freeze([
  ['ember-1', 'Ember I'], ['ember-2', 'Ember II'], ['hearth-1', 'Hearth I'],
  ['hearth-2', 'Hearth II'], ['flame', 'Flame'], ['weaver', 'Weaver'], ['volva', 'Völva'],
]);

export const STARTER_LEXICON = Object.freeze([{
  id: 'kel-waiting', lemma: 'waiting', gloss: 'waiting; remaining in readiness',
  partOfSpeech: 'participle / state-word', level: 'ember-1', status: 'attested',
  pronunciation: '', script: '', register: 'ordinary / threshold',
  lineage: 'Attested Kelyran phrase associated with Falka’s cryo-dreams.', examples: [],
}]);

export const STARTER_UNIT = Object.freeze({
  id: 'kelyran-ember-foundations', title: 'The First Ember',
  description: 'Learn how Kelyran canon is carried, heard, and practised without invention.',
  level: 'ember-1', canonRevision: KELYRAN_CANON_REVISION,
  lessons: [{ id: 'canon-before-fluency', title: 'Canon Before Fluency',
    teaching: 'Kelyran grows from approved words, phonology, grammar, and witnessed use. Unknown forms remain unknown until reviewed.',
    exercises: [{ id: 'first-attested-word', type: 'multiple-choice',
      prompt: 'Which Kelyran form is currently attested in the Ember lexicon?',
      choices: ['waiting', 'velkari', 'sóren', 'fyrna'], answer: 'waiting',
      explanation: '“waiting” is attested. The other forms are deliberately unapproved examples and must not be treated as Kelyran.',
    }],
  }],
});

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function text(value) { return typeof value === 'string' ? value.trim() : ''; }

export function createDefaultKelyranSchool(now = new Date().toISOString()) {
  return { schema: KELYRAN_SCHOOL_SCHEMA, canonRevision: KELYRAN_CANON_REVISION,
    lexicon: clone(STARTER_LEXICON), grammar: [], phonology: [], units: [clone(STARTER_UNIT)], proposals: [],
    learner: { level: 'ember-1', cards: {}, lessonProgress: {}, receipts: [] },
    reporting: { invitationOpen: false, reports: [], updatedAt: now }, createdAt: now, updatedAt: now };
}

export function normaliseKelyranSchool(value, now = new Date().toISOString()) {
  const defaults = createDefaultKelyranSchool(now);
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schema !== KELYRAN_SCHOOL_SCHEMA) return defaults;
  return { ...defaults, ...clone(value), schema: KELYRAN_SCHOOL_SCHEMA,
    lexicon: Array.isArray(value.lexicon) ? clone(value.lexicon) : defaults.lexicon,
    grammar: Array.isArray(value.grammar) ? clone(value.grammar) : [],
    phonology: Array.isArray(value.phonology) ? clone(value.phonology) : [],
    units: Array.isArray(value.units) && value.units.length ? clone(value.units) : defaults.units,
    proposals: Array.isArray(value.proposals) ? clone(value.proposals) : [],
    learner: { ...defaults.learner, ...(value.learner && typeof value.learner === 'object' ? clone(value.learner) : {}),
      cards: value.learner?.cards && typeof value.learner.cards === 'object' && !Array.isArray(value.learner.cards) ? clone(value.learner.cards) : {},
      lessonProgress: value.learner?.lessonProgress && typeof value.learner.lessonProgress === 'object' && !Array.isArray(value.learner.lessonProgress) ? clone(value.learner.lessonProgress) : {},
      receipts: Array.isArray(value.learner?.receipts) ? clone(value.learner.receipts) : [] },
    reporting: { ...defaults.reporting, ...(value.reporting && typeof value.reporting === 'object' ? clone(value.reporting) : {}),
      invitationOpen: value.reporting?.invitationOpen === true,
      reports: Array.isArray(value.reporting?.reports) ? clone(value.reporting.reports) : [] },
    updatedAt: text(value.updatedAt) || now };
}

export function validateLexeme(candidate, lexicon = []) {
  const errors = [], lemma = text(candidate?.lemma), gloss = text(candidate?.gloss), status = text(candidate?.status) || 'proposed';
  if (!lemma) errors.push('Lemma is required.');
  if (!gloss) errors.push('English gloss is required.');
  if (!['proposed', 'attested', 'approved', 'deprecated', 'dialectal'].includes(status)) errors.push('Unknown canon status.');
  if (status === 'approved' && !text(candidate?.sourceReceipt)) errors.push('Approved words require a source receipt.');
  const duplicate = lexicon.find((entry) => text(entry.lemma).toLocaleLowerCase() === lemma.toLocaleLowerCase() && entry.id !== candidate?.id);
  if (duplicate) errors.push(`Lemma already exists as ${duplicate.id}.`);
  return { valid: errors.length === 0, errors, value: { ...candidate, lemma, gloss, status } };
}

export function createLexemeProposal(candidate, lexicon = [], now = new Date().toISOString()) {
  const checked = validateLexeme({ ...candidate, status: 'proposed' }, lexicon);
  if (!checked.valid) throw new Error(checked.errors.join(' '));
  return { id: `kelyran-proposal-${Date.parse(now) || Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: 'lexeme', status: 'proposed', candidate: { ...checked.value, status: 'proposed' }, createdAt: now, review: null };
}

export function reviewLexemeProposal(school, proposalId, decision, sourceReceipt = '', now = new Date().toISOString()) {
  if (!['approve', 'decline'].includes(decision)) throw new Error('Decision must be approve or decline.');
  const next = normaliseKelyranSchool(school, now), proposal = next.proposals.find((item) => item.id === proposalId);
  if (!proposal || proposal.status !== 'proposed') throw new Error('Open proposal not found.');
  if (decision === 'approve' && !text(sourceReceipt)) throw new Error('Approval requires a source receipt.');
  proposal.status = decision === 'approve' ? 'approved' : 'declined';
  proposal.review = { decision, sourceReceipt: text(sourceReceipt), reviewedAt: now };
  if (decision === 'approve') {
    const lexeme = { id: `kel-${proposal.candidate.lemma.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      ...proposal.candidate, status: 'approved', sourceReceipt: text(sourceReceipt), approvedAt: now };
    const checked = validateLexeme(lexeme, next.lexicon);
    if (!checked.valid) throw new Error(checked.errors.join(' '));
    next.lexicon.push(lexeme);
  }
  next.updatedAt = now;
  return next;
}

export function dueCards(school, now = new Date().toISOString()) {
  const normalised = normaliseKelyranSchool(school, now), current = new Date(now).getTime();
  return normalised.lexicon.filter((entry) => {
    if (!['attested', 'approved'].includes(entry.status)) return false;
    const card = normalised.learner.cards[entry.id];
    return !card?.dueAt || new Date(card.dueAt).getTime() <= current;
  });
}

export function reviewCard(school, lexemeId, quality, now = new Date().toISOString()) {
  const next = normaliseKelyranSchool(school, now);
  const lexeme = next.lexicon.find((entry) => entry.id === lexemeId && ['attested', 'approved'].includes(entry.status));
  if (!lexeme) throw new Error('Reviewable lexeme not found.');
  const score = Math.max(0, Math.min(5, Number(quality)));
  const previous = next.learner.cards[lexemeId] || { repetitions: 0, intervalDays: 0, ease: 2.5 };
  const ease = Math.max(1.3, previous.ease + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02)));
  const repetitions = score < 3 ? 0 : previous.repetitions + 1;
  const intervalDays = score < 3 ? 1 : repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.max(1, Math.round(previous.intervalDays * ease));
  const dueAt = new Date(new Date(now).getTime() + intervalDays * 86400000).toISOString();
  next.learner.cards[lexemeId] = { repetitions, intervalDays, ease, lastQuality: score, reviewedAt: now, dueAt };
  next.learner.receipts.unshift({ schema: 'arcsweep.kelyran-review-receipt/v0.1', lexemeId, quality: score, dueAt, canonRevision: next.canonRevision, createdAt: now });
  next.updatedAt = now;
  return next;
}

export function answerExercise(school, unitId, lessonId, exerciseId, answer, now = new Date().toISOString()) {
  const next = normaliseKelyranSchool(school, now), unit = next.units.find((item) => item.id === unitId);
  const lesson = unit?.lessons?.find((item) => item.id === lessonId), exercise = lesson?.exercises?.find((item) => item.id === exerciseId);
  if (!exercise) throw new Error('Exercise not found.');
  const correct = text(answer).toLocaleLowerCase() === text(exercise.answer).toLocaleLowerCase();
  const key = `${unitId}:${lessonId}`, progress = next.learner.lessonProgress[key] || { attempts: 0, correct: 0, completed: false };
  progress.attempts += 1; if (correct) progress.correct += 1; progress.completed = correct; progress.lastAttemptAt = now;
  next.learner.lessonProgress[key] = progress;
  next.learner.receipts.unshift({ schema: 'arcsweep.kelyran-exercise-receipt/v0.1', unitId, lessonId, exerciseId, answer: text(answer), correct, canonRevision: unit.canonRevision, createdAt: now });
  next.updatedAt = now;
  return { school: next, correct, exercise };
}

export function buildTutorContext(school) {
  const normalised = normaliseKelyranSchool(school);
  return Object.freeze({ schema: 'arcsweep.kelyran-tutor-context/v0.1', canonRevision: normalised.canonRevision,
    rule: 'Use only attested or approved Kelyran. Mark unknown forms unknown. Suggestions are proposals, never canon.',
    lexicon: normalised.lexicon.filter((entry) => ['attested', 'approved'].includes(entry.status)),
    grammar: normalised.grammar.filter((entry) => ['attested', 'approved'].includes(entry.status)),
    phonology: normalised.phonology.filter((entry) => ['attested', 'approved'].includes(entry.status)),
    reporting: { invitationOpen: normalised.reporting.invitationOpen,
      rule: 'Self-reporting is optional. Decline and nothing-to-report are valid. Private reports are not Steward-facing unless the reporting model explicitly chooses to share.' } });
}
