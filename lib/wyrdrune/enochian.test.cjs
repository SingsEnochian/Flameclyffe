'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ANGELIC_LETTER_NAMES, enochianInscription, angelicLetter, votive } = require('./enochian.cjs');
const { compile, execute } = require('./wyrdrune.cjs');

const ritualSource = `mobius {
  perceive { let light = votive("Lantern", "For a traveler and a ship"); }
  compress { let letter = angelicLetter(1); }
  release { let inscription = enochian("Pa", "working letter-name example"); }
  verify { emit light; }
  integrate { emit letter; }
  choose { emit inscription; }
  return { emit "light held"; }
  transcend { emit 1; }
}`;

test('historical register has three ordered heptads; glyphs stay unassigned', () => {
  assert.equal(ANGELIC_LETTER_NAMES.length, 21);
  assert.deepEqual([angelicLetter(1).romanizedName, angelicLetter(8).romanizedName, angelicLetter(21).romanizedName], ['Pa', 'Tal', 'Gisa']);
  assert.deepEqual([angelicLetter(1).heptad, angelicLetter(8).heptad, angelicLetter(21).heptad], [1, 2, 3]);
  assert.equal(angelicLetter(21).glyph, null);
  assert.match(angelicLetter(1).glyphStatus, /awaiting/);
});

test('inscription keeps declared source unverified and does not hallucinate translation', () => {
  const record = enochianInscription('Pa', 'Sloane MS 3188');
  assert.equal(record.sourceStatus, 'unverified-author-assertion');
  assert.equal(record.translation, null);
  assert.equal(record.glyphs, null);
  assert.equal(record.effect, 'none');
  assert.ok(record.recordHash.startsWith('wce1:'));
  assert.equal(record.recordHash, enochianInscription('Pa', 'Sloane MS 3188').recordHash);
});

test('NFC normalization and bounded validation are deterministic', () => {
  assert.equal(enochianInscription('e\u0301').recordHash, enochianInscription('\u00e9').recordHash);
  assert.throws(() => enochianInscription(''), /inscription/);
  assert.throws(() => enochianInscription('a\nb'), /printable/);
  assert.throws(() => enochianInscription('X'.repeat(513)), /512/);
  assert.throws(() => angelicLetter(0), /1 to 21/);
  assert.throws(() => angelicLetter(22), /1 to 21/);
  assert.throws(() => angelicLetter(2.5), /1 to 21/);
});

test('votive is author-declared intent, with no host effects', () => {
  const v = votive('Lantern', 'For a traveler and a ship');
  assert.equal(v.effect, 'none');
  assert.equal(v.provenance, 'author-declared');
  assert.equal(v.name, 'Lantern');
});

test('WTL lexer, compiler and eightfold interpreter evaluate ritual values', async () => {
  const parsed = compile(ritualSource);
  const out = await execute(parsed);
  assert.equal(out.receipts.length, 8);
  assert.equal(out.output[0].kind, 'votive-intention');
  assert.equal(out.output[1].kind, 'letter-reference');
  assert.equal(out.output[2].kind, 'inscription');
  assert.deepEqual(out.output.slice(3), ['light held', 1]);
  assert.equal(out.output[2].translation, null);
  assert.equal(out.output[0].recordHash, votive('Lantern', 'For a traveler and a ship').recordHash);
});

test('wrong ritual function arity and type fail closed', async () => {
  const bad = [
    'enochian()', 'angelicLetter(0)', 'angelicLetter("Pa")',
    'votive("too few")', 'enochian(9)',
  ];
  for (const expression of bad) {
    const source = ritualSource.replace('emit "light held";', 'emit ' + expression + ';');
    await assert.rejects(execute(compile(source)), Error, expression);
  }
});

test('Feather halts the ritual before executing phases', async () => {
  await assert.rejects(execute(compile(ritualSource), { signal: { aborted: true } }), /Feather/);
});
