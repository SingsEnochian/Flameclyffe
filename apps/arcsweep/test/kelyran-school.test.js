import assert from 'node:assert/strict';
import test from 'node:test';
import {
  KELYRAN_SCHOOL_SCHEMA,
  APPROVED_FLUID_LEXICON,
  answerExercise,
  buildTutorContext,
  createDefaultKelyranSchool,
  createLexemeProposal,
  dueCards,
  normaliseKelyranSchool,
  reviewCard,
  reviewLexemeProposal,
  validateLexeme,
} from '../src/kelyran-school.js';

const NOW = '2026-08-17T00:00:00.000Z';

test('default school carries an attested starter form and a canon-bound lesson', () => {
  const school = createDefaultKelyranSchool(NOW);
  assert.equal(school.schema, KELYRAN_SCHOOL_SCHEMA);
  assert.equal(school.lexicon[0].lemma, 'waiting');
  assert.equal(school.lexicon[0].status, 'attested');
  assert.equal(school.units[0].canonRevision, school.canonRevision);
});

test('unknown state is repaired without discarding valid school arrays', () => {
  const school = createDefaultKelyranSchool(NOW);
  school.grammar.push({ id: 'rule-one', status: 'proposed' });
  school.learner.cards = [];
  const normalised = normaliseKelyranSchool(school, NOW);
  assert.equal(normalised.grammar.length, 1);
  assert.deepEqual(normalised.learner.cards, {});
});

test('proposal gate prevents duplicates and requires a receipt for approval', () => {
  const school = createDefaultKelyranSchool(NOW);
  assert.equal(validateLexeme({ lemma: 'waiting', gloss: 'duplicate' }, school.lexicon).valid, false);
  const proposal = createLexemeProposal({ lemma: 'seldrin', gloss: 'clear; mutually understood' }, school.lexicon, NOW);
  school.proposals.push(proposal);
  assert.throws(() => reviewLexemeProposal(school, proposal.id, 'approve', '', NOW), /receipt/i);
  const approved = reviewLexemeProposal(school, proposal.id, 'approve', 'rowan:kelyran:seldrin:v1', NOW);
  assert.equal(approved.lexicon.at(-1).status, 'approved');
  assert.equal(approved.lexicon.at(-1).sourceReceipt, 'rowan:kelyran:seldrin:v1');
});

test('tutor context excludes proposals and deprecated forms', () => {
  const school = createDefaultKelyranSchool(NOW);
  school.lexicon.push({ id: 'proposal', lemma: 'invented', gloss: 'no', status: 'proposed' });
  school.lexicon.push({ id: 'old', lemma: 'old-form', gloss: 'no', status: 'deprecated' });
  const context = buildTutorContext(school);
  assert.deepEqual(context.lexicon.map((entry) => entry.lemma), ['waiting', ...APPROVED_FLUID_LEXICON.map((entry) => entry.lemma)]);
  assert.match(context.rule, /unknown forms unknown/i);
});

test('SM-2 review produces a due date and immutable practice receipt', () => {
  const school = createDefaultKelyranSchool(NOW);
  assert.equal(dueCards(school, NOW).length, 9);
  const reviewed = reviewCard(school, 'kel-waiting', 5, NOW);
  assert.equal(reviewed.learner.cards['kel-waiting'].intervalDays, 1);
  assert.equal(reviewed.learner.receipts[0].quality, 5);
  assert.equal(dueCards(reviewed, NOW).length, 8);
});

test('lesson answers are receipted and never mutate canon', () => {
  const school = createDefaultKelyranSchool(NOW);
  const before = JSON.stringify(school.lexicon);
  const result = answerExercise(school, 'kelyran-ember-foundations', 'canon-before-fluency', 'first-attested-word', 'waiting', NOW);
  assert.equal(result.correct, true);
  assert.equal(JSON.stringify(result.school.lexicon), before);
  assert.equal(result.school.learner.receipts[0].correct, true);
});

test('approved fluid vocabulary has receipts, stress and explicit unfinished sound/script data', () => {
  assert.equal(APPROVED_FLUID_LEXICON.length, 8);
  for (const entry of APPROVED_FLUID_LEXICON) {
    assert.equal(validateLexeme(entry).valid, true);
    assert.equal(entry.status, 'approved');
    assert.ok(entry.stress.primarySyllable <= entry.syllables.length);
    assert.equal(entry.phonemes, null);
    assert.equal(entry.script, '');
    assert.equal(entry.audio, null);
  }
});

test('old saves gain approved words once while preserving learner data and existing entries', () => {
  const school = createDefaultKelyranSchool(NOW);
  school.canonRevision = 'kelyran-canon/ember-0.1';
  school.lexicon = [school.lexicon[0], { id: 'custom-mira', lemma: 'MIRA', gloss: 'preserved', status: 'deprecated' }];
  school.learner.cards['kel-waiting'] = { repetitions: 4 };
  const before = JSON.stringify(school);
  const once = normaliseKelyranSchool(school, NOW);
  const twice = normaliseKelyranSchool(once, NOW);
  assert.equal(once.lexicon.length, 9);
  assert.deepEqual(twice, once);
  assert.equal(JSON.stringify(school), before);
  assert.equal(once.lexicon[1].gloss, 'preserved');
  assert.equal(once.lexicon[1].status, 'deprecated');
  assert.equal(once.learner.cards['kel-waiting'].repetitions, 4);
  assert.equal(buildTutorContext(once).lexicon.some(entry => entry.lemma === 'MIRA'), false);
});
