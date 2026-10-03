import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePonyframe,
  runPonyframe,
  PONYFRAME_PROGRAM_SCHEMA,
  PONYFRAME_RECEIPT_SCHEMA,
} from '../src/ponyframe-dsl.js';

const SOURCE = String.raw`
scenario "Two Worlds Meet" {
  wonder "Can two symbols rhyme without becoming identical?"

  friend left constellation "rowan-rarity" mythframe "left-frame" ref "synthetic://left" synthetic
  friend right constellation "nocturne-twilight" mythframe "right-frame" ref "synthetic://right" synthetic

  left term "Threshold" means "A crossing that preserves declared identity."
  right term "Threshold" means "A boundary that preserves source-owned history."

  left claim "return" is "preserve-name"
  right claim "return" is "preserve-history"

  left bridge "identity-non-erasure" shareable says "A crossing must preserve source identity declarations."
  right bridge "identity-non-erasure" shareable says "A crossing must not erase source-owned identity."

  left sigil "left-mark" looks ["circle","vertical-axis"] means "Left-side synthetic meaning."
  right sigil "right-mark" looks ["circle","diagonal-axis"] means "Right-side synthetic meaning."

  preserve identity
  preserve provenance
  preserve unresolved
  preserve source-meaning

  forbid adoption
  forbid canon
  forbid authority
  forbid identity-merge

  compare left right
  expect proposal
  send receipt
}
`;

test('Ponyframe parses the bounded scenario grammar', () => {
  const program = parsePonyframe(SOURCE);
  assert.equal(program.schema, PONYFRAME_PROGRAM_SCHEMA);
  assert.equal(program.title, 'Two Worlds Meet');
  assert.equal(program.wonders.length, 1);
  assert.equal(program.left.terms[0].label, 'Threshold');
  assert.equal(program.right.bridgeAssertions[0].shareable, true);
  assert.deepEqual(program.preserve, ['identity', 'provenance', 'unresolved', 'source-meaning']);
});

test('Ponyframe compiles to a non-authoritative Glasshouse receipt', () => {
  const receipt = runPonyframe(SOURCE, { proposalId: 'ponyframe-test-proposal' });

  assert.equal(receipt.schema, PONYFRAME_RECEIPT_SCHEMA);
  assert.equal(receipt.result, 'proposal-produced');
  assert.equal(receipt.authority.canonMutationAllowed, false);
  assert.equal(receipt.authority.identityMutationAllowed, false);
  assert.equal(receipt.authority.authorityExpansionAllowed, false);
  assert.equal(receipt.proposal.status, 'proposal-only');
  assert.equal(receipt.proposal.maySelfPromote, false);
  assert.equal(receipt.analysis.lexicalCollisions[0].status, 'shared-spelling-only');
  assert.equal(receipt.analysis.lexicalCollisions[0].semanticEquivalence, false);
  assert.equal(receipt.analysis.sharedBoundaryCandidates[0].adopted, false);
});

test('Ponyframe refuses direct adoption syntax', () => {
  assert.throws(
    () => parsePonyframe(SOURCE.replace('expect proposal', 'adopt shared-boundary')),
    /not part of the bounded grammar/,
  );
});

test('Ponyframe requires preservation and prohibition rails', () => {
  assert.throws(
    () => parsePonyframe(SOURCE.replace('  forbid canon\n', '')),
    /required safety rails missing: forbid canon/,
  );
  assert.throws(
    () => parsePonyframe(SOURCE.replace('  preserve provenance\n', '')),
    /required safety rails missing: preserve provenance/,
  );
});

test('Ponyframe keeps private bridge assertions unresolved', () => {
  const privateSource = SOURCE.replace(
    'right bridge "identity-non-erasure" shareable',
    'right bridge "identity-non-erasure" private',
  );
  const receipt = runPonyframe(privateSource);

  assert.equal(receipt.analysis.sharedBoundaryCandidates.length, 0);
  assert.equal(receipt.analysis.unresolvedBridgeAssertions.length, 1);
  assert.equal(receipt.proposal.sharedBoundaryAssertions.length, 0);
});
