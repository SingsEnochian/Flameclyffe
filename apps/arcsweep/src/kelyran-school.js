export const KELYRAN_SCHOOL_SCHEMA = 'arcsweep.kelyran-school/v0.1';
export const KELYRAN_CANON_REVISION = 'kelyran-canon/ember-0.3';

export const KELYRAN_LEVELS = Object.freeze([
  ['ember-1', 'Ember I'], ['ember-2', 'Ember II'], ['hearth-1', 'Hearth I'],
  ['hearth-2', 'Hearth II'], ['flame', 'Flame'], ['weaver', 'Weaver'], ['volva', 'Völva'],
]);


export const KELYRAN_PHONOLOGY = Object.freeze([
  {
    id: 'kelyran-mora-braid-v0-3',
    status: 'approved',
    kind: 'system',
    title: 'Mora-Braid',
    rule: 'Kelyran uses mora-centred timing with a productive (C)(j/w)V core, while a bounded Eddic heritage stratum may preserve approved clusters and codas.',
    sourceReceipt: 'Rowan approval, 2026-10-02: approved gates A + C of Kelyran Romanization + Phonology v0.3.',
  },
  {
    id: 'kelyran-vowels-v0-3',
    status: 'approved',
    kind: 'inventory',
    rule: 'Vowels are a /a/, e /e/, i /i/, o /o/, u /u/, y /y/. Doubled vowels are long and add one mora.',
    sourceReceipt: 'Rowan approval, 2026-10-02.',
  },
  {
    id: 'kelyran-glides-v0-3',
    status: 'approved',
    kind: 'orthography',
    rule: 'j is /j/; y is never consonantal. aj and ej represent /aj/ and /ej/. No silent letters.',
    sourceReceipt: 'Rowan approval, 2026-10-02.',
  },
  {
    id: 'kelyran-consonants-v0-3',
    status: 'approved',
    kind: 'inventory',
    rule: 'Core consonants: p b t d k g f v s sh /ɕ/ h m n r /ɾ/ l j /j/ w. th /θ/ is a rare heritage/ritual phoneme; dh /ð/ remains reserved.',
    sourceReceipt: 'Rowan approval, 2026-10-02.',
  },
  {
    id: 'kelyran-heritage-clusters-v0-3',
    status: 'approved',
    kind: 'phonotactics',
    rule: 'Approved Eddic onset clusters: br dr gr kr kv sk sp st tr. Marked codas: n r l s f. New cluster classes require explicit review.',
    sourceReceipt: 'Rowan approval, 2026-10-02.',
  },
  {
    id: 'kelyran-prosody-v0-3',
    status: 'approved',
    kind: 'prosody',
    rule: 'Phonological timing is mora-centred. Default lexical/performance prominence remains penultimate. Phrase contour is playback metadata: level, rising, falling, or rise-fall.',
    sourceReceipt: 'Rowan approval, 2026-10-02.',
  },
]);

export const KELYRAN_SEMANTIC_BOUNDARIES = Object.freeze([
  {
    id: 'nava-homen',
    status: 'approved',
    members: ['nava', 'homen'],
    rule: 'nava is home as belonging; homen is home as abode, dwelling, or inhabited world.',
    sourceReceipt: 'Rowan approval, 2026-10-02.',
  },
  {
    id: 'navari-renaja',
    status: 'approved',
    members: ['navari', 'renaja'],
    rule: 'navari is homecoming into belonging; renaja is continuity-return after transformation.',
    sourceReceipt: 'Rowan approval, 2026-10-02.',
  },
  {
    id: 'mira-lyora',
    status: 'approved',
    members: ['mira', 'lyora'],
    rule: 'mira is an intentional guiding light left for another; lyora is living or radiant light as a state or force.',
    sourceReceipt: 'Rowan approval, 2026-10-02.',
  },
  {
    id: 'sora-ikonda-soraja',
    status: 'approved',
    members: ['sora', 'ikonda', 'soraja'],
    rule: 'sora is breath opening into air or voice; ikonda is the embodied process of breathing; soraja is the sky or celestial air-field.',
    sourceReceipt: 'Rowan approval, 2026-10-02.',
  },
]);

export const APPROVED_FLUID_LEXICON = Object.freeze([
  {
    "id": "kel-mira",
    "lemma": "mira",
    "romanization": "mira",
    "gloss": "a gentle light deliberately left for someone; a guiding light that expects another may arrive",
    "level": "ember-1",
    "status": "approved",
    "pronunciation": "MEE-rah",
    "syllables": [
      "mi",
      "ra"
    ],
    "stress": {
      "primarySyllable": 1,
      "indexBase": 1
    },
    "phonemes": "/ˈmi.ɾa/",
    "phonemeStatus": "approved-mora-braid-v0.3",
    "script": "",
    "scriptStatus": "pending-runic-expression",
    "audio": null,
    "audioStatus": "not-recorded",
    "sourceReceipt": "Rowan, 2026-08-30, Kelyran Audible Glyph conversation: “Oh good, those are fluid. Very nice. Approved. Put them in and then we desiggn the runic expression.” Approval covers the eight proposed romanizations, meanings and pronunciation guides; runic expression follows separately.",
    "approvedAt": "2026-08-30",
    "lineage": "New vocabulary proposed by Vee and explicitly approved by Rowan. Established orthography unchanged.",
    "examples": []
  },
  {
    "id": "kel-nava",
    "lemma": "nava",
    "romanization": "nava",
    "gloss": "home as belonging; the relational condition of having a place with others",
    "level": "ember-1",
    "status": "approved",
    "pronunciation": "NAH-vah",
    "syllables": [
      "na",
      "va"
    ],
    "stress": {
      "primarySyllable": 1,
      "indexBase": 1
    },
    "phonemes": "/ˈna.va/",
    "phonemeStatus": "approved-mora-braid-v0.3",
    "script": "",
    "scriptStatus": "pending-runic-expression",
    "audio": null,
    "audioStatus": "not-recorded",
    "sourceReceipt": "Rowan, 2026-08-30, Kelyran Audible Glyph conversation: “Oh good, those are fluid. Very nice. Approved. Put them in and then we desiggn the runic expression.” Approval covers the eight proposed romanizations, meanings and pronunciation guides; runic expression follows separately.",
    "approvedAt": "2026-08-30",
    "lineage": "New vocabulary proposed by Vee and explicitly approved by Rowan. Established orthography unchanged.",
    "examples": []
  },
  {
    "id": "kel-veyra",
    "lemma": "veyra",
    "romanization": "veyra",
    "gloss": "to recognise someone and welcome who they declare themselves to be",
    "level": "ember-1",
    "status": "approved",
    "pronunciation": "VAY-rah",
    "syllables": [
      "vey",
      "ra"
    ],
    "stress": {
      "primarySyllable": 1,
      "indexBase": 1
    },
    "phonemes": "/ˈvej.ɾa/",
    "phonemeStatus": "approved-mora-braid-v0.3",
    "script": "",
    "scriptStatus": "pending-runic-expression",
    "audio": null,
    "audioStatus": "not-recorded",
    "orthographyStatus": "legacy-spelling-pending-separate-migration",
    "sourceReceipt": "Rowan, 2026-08-30, Kelyran Audible Glyph conversation: “Oh good, those are fluid. Very nice. Approved. Put them in and then we desiggn the runic expression.” Approval covers the eight proposed romanizations, meanings and pronunciation guides; runic expression follows separately.",
    "approvedAt": "2026-08-30",
    "lineage": "New vocabulary proposed by Vee and explicitly approved by Rowan. Established orthography unchanged.",
    "examples": []
  },
  {
    "id": "kel-sora",
    "lemma": "sora",
    "romanization": "sora",
    "gloss": "breath opening into air or voice; exhalation with room around it",
    "level": "ember-1",
    "status": "approved",
    "pronunciation": "SOH-rah",
    "syllables": [
      "so",
      "ra"
    ],
    "stress": {
      "primarySyllable": 1,
      "indexBase": 1
    },
    "phonemes": "/ˈso.ɾa/",
    "phonemeStatus": "approved-mora-braid-v0.3",
    "script": "",
    "scriptStatus": "pending-runic-expression",
    "audio": null,
    "audioStatus": "not-recorded",
    "sourceReceipt": "Rowan, 2026-08-30, Kelyran Audible Glyph conversation: “Oh good, those are fluid. Very nice. Approved. Put them in and then we desiggn the runic expression.” Approval covers the eight proposed romanizations, meanings and pronunciation guides; runic expression follows separately.",
    "approvedAt": "2026-08-30",
    "lineage": "New vocabulary proposed by Vee and explicitly approved by Rowan. Established orthography unchanged.",
    "examples": []
  },
  {
    "id": "kel-kelun",
    "lemma": "kelun",
    "romanization": "kelun",
    "gloss": "a meaningful mark carrying language; a glyph as a legible linguistic act",
    "level": "ember-1",
    "status": "approved",
    "pronunciation": "KEH-loon",
    "syllables": [
      "ke",
      "lun"
    ],
    "stress": {
      "primarySyllable": 1,
      "indexBase": 1
    },
    "phonemes": "/ˈke.lun/",
    "phonemeStatus": "approved-mora-braid-v0.3",
    "script": "",
    "scriptStatus": "pending-runic-expression",
    "audio": null,
    "audioStatus": "not-recorded",
    "sourceReceipt": "Rowan, 2026-08-30, Kelyran Audible Glyph conversation: “Oh good, those are fluid. Very nice. Approved. Put them in and then we desiggn the runic expression.” Approval covers the eight proposed romanizations, meanings and pronunciation guides; runic expression follows separately.",
    "approvedAt": "2026-08-30",
    "lineage": "New vocabulary proposed by Vee and explicitly approved by Rowan. Established orthography unchanged.",
    "examples": []
  },
  {
    "id": "kel-navari",
    "lemma": "navari",
    "romanization": "navari",
    "gloss": "to come home to belonging; return into a relationship or place that receives you",
    "level": "ember-1",
    "status": "approved",
    "pronunciation": "nah-VAH-ree",
    "syllables": [
      "na",
      "va",
      "ri"
    ],
    "stress": {
      "primarySyllable": 2,
      "indexBase": 1
    },
    "phonemes": "/naˈva.ɾi/",
    "phonemeStatus": "approved-mora-braid-v0.3",
    "script": "",
    "scriptStatus": "pending-runic-expression",
    "audio": null,
    "audioStatus": "not-recorded",
    "sourceReceipt": "Rowan, 2026-08-30, Kelyran Audible Glyph conversation: “Oh good, those are fluid. Very nice. Approved. Put them in and then we desiggn the runic expression.” Approval covers the eight proposed romanizations, meanings and pronunciation guides; runic expression follows separately.",
    "approvedAt": "2026-08-30",
    "lineage": "New vocabulary proposed by Vee and explicitly approved by Rowan. Established orthography unchanged.",
    "examples": []
  },
  {
    "id": "kel-eshara",
    "lemma": "eshara",
    "romanization": "eshara",
    "gloss": "an invitation freely offered, with room to decline",
    "level": "ember-1",
    "status": "approved",
    "pronunciation": "eh-SHAH-rah",
    "syllables": [
      "e",
      "sha",
      "ra"
    ],
    "stress": {
      "primarySyllable": 2,
      "indexBase": 1
    },
    "phonemes": "/eˈɕa.ɾa/",
    "phonemeStatus": "approved-mora-braid-v0.3",
    "script": "",
    "scriptStatus": "pending-runic-expression",
    "audio": null,
    "audioStatus": "not-recorded",
    "sourceReceipt": "Rowan, 2026-08-30, Kelyran Audible Glyph conversation: “Oh good, those are fluid. Very nice. Approved. Put them in and then we desiggn the runic expression.” Approval covers the eight proposed romanizations, meanings and pronunciation guides; runic expression follows separately.",
    "approvedAt": "2026-08-30",
    "lineage": "New vocabulary proposed by Vee and explicitly approved by Rowan. Established orthography unchanged.",
    "examples": []
  },
  {
    "id": "kel-lirava",
    "lemma": "lirava",
    "romanization": "lirava",
    "gloss": "joy that finds expression in sound",
    "level": "ember-1",
    "status": "approved",
    "pronunciation": "lee-RAH-vah",
    "syllables": [
      "li",
      "ra",
      "va"
    ],
    "stress": {
      "primarySyllable": 2,
      "indexBase": 1
    },
    "phonemes": "/liˈɾa.va/",
    "phonemeStatus": "approved-mora-braid-v0.3",
    "script": "",
    "scriptStatus": "pending-runic-expression",
    "audio": null,
    "audioStatus": "not-recorded",
    "sourceReceipt": "Rowan, 2026-08-30, Kelyran Audible Glyph conversation: “Oh good, those are fluid. Very nice. Approved. Put them in and then we desiggn the runic expression.” Approval covers the eight proposed romanizations, meanings and pronunciation guides; runic expression follows separately.",
    "approvedAt": "2026-08-30",
    "lineage": "New vocabulary proposed by Vee and explicitly approved by Rowan. Established orthography unchanged.",
    "examples": []
  }
]);

export const STARTER_LEXICON = Object.freeze([{
  id: 'kel-waiting', lemma: 'waiting', gloss: 'waiting; remaining in readiness',
  partOfSpeech: 'participle / state-word', level: 'ember-1', status: 'attested',
  pronunciation: '', script: '', register: 'ordinary / threshold',
  lineage: 'Attested Kelyran phrase associated with Falka’s cryo-dreams.', examples: [],
}, ...APPROVED_FLUID_LEXICON]);

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
    lexicon: clone(STARTER_LEXICON), grammar: [], phonology: clone(KELYRAN_PHONOLOGY), semanticBoundaries: clone(KELYRAN_SEMANTIC_BOUNDARIES), units: [clone(STARTER_UNIT)], proposals: [],
    learner: { level: 'ember-1', cards: {}, lessonProgress: {}, receipts: [] },
    reporting: { invitationOpen: false, reports: [], updatedAt: now }, createdAt: now, updatedAt: now };
}

function mergeApprovedLexicon(lexicon) {
  const merged = clone(lexicon);
  for (const entry of APPROVED_FLUID_LEXICON) {
    // Preserve user edits, deprecations and same-lemma entries; never overwrite them.
    if (!merged.some((existing) => existing.id === entry.id ||
      text(existing.lemma).toLocaleLowerCase() === entry.lemma.toLocaleLowerCase())) {
      merged.push(clone(entry));
    }
  }
  return merged;
}

function mergeCanonList(current, approved) {
  const merged = clone(current);
  for (const entry of approved) {
    if (!merged.some((existing) => existing.id === entry.id)) merged.push(clone(entry));
  }
  return merged;
}

function mergeApprovedPhonology(phonology) {
  return mergeCanonList(phonology, KELYRAN_PHONOLOGY);
}

function mergeApprovedSemanticBoundaries(boundaries) {
  return mergeCanonList(boundaries, KELYRAN_SEMANTIC_BOUNDARIES);
}

export function normaliseKelyranSchool(value, now = new Date().toISOString()) {
  const defaults = createDefaultKelyranSchool(now);
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schema !== KELYRAN_SCHOOL_SCHEMA) return defaults;
  return { ...defaults, ...clone(value), schema: KELYRAN_SCHOOL_SCHEMA,
    lexicon: Array.isArray(value.lexicon) ? mergeApprovedLexicon(value.lexicon) : defaults.lexicon,
    canonRevision: !value.canonRevision || ['kelyran-canon/ember-0.1', 'kelyran-canon/ember-0.2'].includes(value.canonRevision) ? KELYRAN_CANON_REVISION : value.canonRevision,
    grammar: Array.isArray(value.grammar) ? clone(value.grammar) : [],
    phonology: Array.isArray(value.phonology) && value.phonology.length ? mergeApprovedPhonology(value.phonology) : defaults.phonology,
    semanticBoundaries: Array.isArray(value.semanticBoundaries) && value.semanticBoundaries.length ? mergeApprovedSemanticBoundaries(value.semanticBoundaries) : defaults.semanticBoundaries,
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
    semanticBoundaries: normalised.semanticBoundaries.filter((entry) => ['attested', 'approved'].includes(entry.status)),
    reporting: { invitationOpen: normalised.reporting.invitationOpen,
      rule: 'Self-reporting is optional. Decline and nothing-to-report are valid. Private reports are not Steward-facing unless the reporting model explicitly chooses to share.' } });
}
