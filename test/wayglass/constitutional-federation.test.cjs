'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash, generateKeyPairSync, sign } = require('node:crypto');
const {
  createConstitutionalFederation,
  constitutionalDecisionBytes,
} = require('../../lib/wayglass-constitutional-federation.cjs');
const kernel = require('../../lib/wayglass-kernel.cjs');

const hash = value => createHash('sha256').update(value, 'utf8').digest('hex');
const baseSource = 'operator base() -> Number = 1';
const nextSource = 'operator improved() -> Number = 2';

function fixture({ verifier = true, maxCells = 6 } = {}) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const charter = {
    charterId: 'wayglass-charter-test',
    version: '0.1',
    allowedCapabilities: ['wtl:pure'],
    maxCells,
    maxTissues: 2,
    maxCandidates: 8,
    maxSourceBytes: 4096,
    maxMessageBytes: 8192,
    maxCyclesPerCell: 8,
    phaseTimeoutMs: 1500,
  };
  const federation = createConstitutionalFederation({
    charter,
    constitutionalSeat: { seatId: 'wayglass:constitutional-seat:test', keyId: 'test-key-1', publicKeyPem },
    verifyCandidate: verifier ? async () => [
      { ok: true, reason: 'independent parser fixture accepted source' },
      { ok: true, reason: 'independent type and conformance fixture accepted WIR' },
    ] : null,
  });
  return { federation, privateKey, charter, publicKeyPem };
}

async function buildTissue(federation) {
  const sourceHash = hash(baseSource);
  const proposer = await federation.registerCell({
    cellId: 'cell:proposer', worldId: 'universe:proposer', role: 'proposer',
    sourceHash, localCanon: { focus: 'variation' }, lawSet: { laws: ['bounded-source'] },
    resourceBudget: { maxCycles: 8, phaseTimeoutMs: 1200 },
  });
  const verifier = await federation.registerCell({
    cellId: 'cell:verifier', worldId: 'universe:verifier', role: 'verifier',
    sourceHash, localCanon: { focus: 'independent-critique' }, lawSet: { laws: ['independent-check'] },
  });
  const continuity = await federation.registerCell({
    cellId: 'cell:continuity', worldId: 'universe:continuity', role: 'continuity',
    sourceHash, localCanon: { focus: 'ancestry' }, lawSet: { laws: ['append-only-history'] },
  });
  const tissue = await federation.createTissue({
    tissueId: 'tissue:first-organism',
    moduleId: 'wtl:sample-module',
    cellIds: [proposer.cellId, verifier.cellId, continuity.cellId],
    initialSourceHash: sourceHash,
    allowedCapabilities: ['wtl:pure'],
    localCanon: { purpose: 'first constitutional tissue' },
  });
  return { tissue, proposer, verifier, continuity, sourceHash };
}

function signedProof(federation, privateKey, candidateId) {
  const decision = federation.buildSeatDecision({
    candidateId,
    nonce: 'test-nonce-00000001',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });
  return {
    decision,
    signature: sign(null, constitutionalDecisionBytes(decision), privateKey).toString('base64'),
  };
}

test('canonical kernel exposes the federation and its one in-memory test registry', () => {
  assert.equal(kernel.createConstitutionalFederation, createConstitutionalFederation);
  assert.equal(kernel.CONSTITUTIONAL_FEDERATION_SCHEMA, 'wayglass.constitutional-federation/v0.1');
  assert.equal(typeof kernel.createMemoryFederationRegistry, 'function');
});

test('three-universe tissue keeps distinct identities, laws, canon and Möbius roots', async () => {
  const { federation } = fixture();
  const { tissue, proposer, verifier, continuity } = await buildTissue(federation);
  assert.equal(tissue.cellIds.length, 3);
  assert.equal(new Set([proposer.worldId, verifier.worldId, continuity.worldId]).size, 3);
  assert.equal(new Set([proposer.lineageRoot, verifier.lineageRoot, continuity.lineageRoot]).size, 3);
  assert.notEqual(proposer.localCanonDigest, verifier.localCanonDigest);
  assert.notEqual(verifier.lawSetHash, continuity.lawSetHash);
  assert.equal(federation.snapshot().identity, 'wayglass');
  assert.equal(federation.snapshot().homeostasis.status, 'stable');
});

test('candidate evolution requires independent verification and a signed constitutional decision', async () => {
  const { federation, privateKey } = fixture();
  const { sourceHash } = await buildTissue(federation);
  const proposed = await federation.proposeCandidate({
    tissueId: 'tissue:first-organism',
    candidateId: 'candidate:descendant-1',
    source: nextSource,
    parentSourceHash: sourceHash,
    requestedCapabilities: ['wtl:pure'],
    requestedAuthority: [],
    author: 'cell:proposer',
    intent: 'Add a pure operator without changing the parent',
    provenance: { source: 'test-fixture' },
  });
  assert.equal(proposed.status, 'proposed');

  const verified = await federation.verifyCandidate(proposed.candidateId);
  assert.equal(verified.status, 'verified');
  assert.equal(verified.verification.every(v => v.ok), true);

  const proof = signedProof(federation, privateKey, proposed.candidateId);
  const promoted = await federation.promoteCandidate({ candidateId: proposed.candidateId, proof });
  assert.equal(promoted.status, 'promoted');
  assert.equal(promoted.cycle.status, 'committed');
  assert.equal(federation.getCandidate(proposed.candidateId).status, 'promoted');
  assert.equal(federation.snapshot().homeostasis.status, 'stable');
  const promotionEvent = federation.events().find(e => e.kind === 'candidate.promoted');
  assert.ok(promotionEvent);
  assert.equal(promotionEvent.seatId, 'wayglass:constitutional-seat:test');
  assert.ok(promotionEvent.mobiusCheckpoint);
});

test('missing independent WTL verifier refuses promotion instead of making a cosmetic pass', async () => {
  const { federation } = fixture({ verifier: false });
  const { sourceHash } = await buildTissue(federation);
  const proposed = await federation.proposeCandidate({
    tissueId: 'tissue:first-organism', source: nextSource,
    parentSourceHash: sourceHash, requestedCapabilities: ['wtl:pure'],
  });
  const result = await federation.verifyCandidate(proposed.candidateId);
  assert.equal(result.status, 'rejected');
  assert.equal(result.verification.some(v => v.reason.includes('independent WTL')), true);
  assert.equal(federation.getCandidate(proposed.candidateId).status, 'rejected');
});

test('capability expansion and membrane bypass are refused', async () => {
  const { federation } = fixture();
  const { sourceHash } = await buildTissue(federation);
  await assert.rejects(
    federation.sendMessage('cell:proposer', 'cell:continuity', 'candidate.proposed', {}),
    /Membrane refused/,
  );
  const proposed = await federation.proposeCandidate({
    tissueId: 'tissue:first-organism', source: nextSource,
    parentSourceHash: sourceHash, requestedCapabilities: ['provider:network-write'],
  });
  const result = await federation.verifyCandidate(proposed.candidateId);
  assert.equal(result.status, 'rejected');
  assert.equal(result.verification.some(v => v.reason.includes('capability')), true);
});

test('forged or expired constitutional proof cannot change registry selection', async () => {
  const { federation, privateKey } = fixture();
  const { sourceHash } = await buildTissue(federation);
  const proposed = await federation.proposeCandidate({
    tissueId: 'tissue:first-organism', source: nextSource,
    parentSourceHash: sourceHash, requestedCapabilities: ['wtl:pure'],
  });
  await federation.verifyCandidate(proposed.candidateId);
  const decision = federation.buildSeatDecision({
    candidateId: proposed.candidateId, nonce: 'test-nonce-00000002',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });
  const refused = await federation.promoteCandidate({
    candidateId: proposed.candidateId,
    proof: { decision, signature: sign(null, Buffer.from('forged'), privateKey).toString('base64') },
  });
  assert.equal(refused.authorization, 'refused');
  assert.equal(refused.status, 'verified');
  assert.equal(federation.getCandidate(proposed.candidateId).status, 'verified');
  assert.equal(federation.events().some(e => e.kind === 'candidate.promoted'), false);
});

test('cell division creates a distinct universe and lineage; retirement preserves inspectable history', async () => {
  const { federation } = fixture();
  await buildTissue(federation);
  const child = await federation.forkCell({
    parentCellId: 'cell:proposer',
    cellId: 'cell:offspring',
    worldId: 'universe:offspring',
  });
  assert.notEqual(child.lineageRoot, federation.getCell('cell:proposer').lineageRoot);
  assert.equal(child.parentCellId, 'cell:proposer');
  await federation.addCellToTissue('tissue:first-organism', 'cell:offspring');
  const retired = await federation.retireCell('cell:offspring', 'experiment concluded');
  assert.equal(retired.status, 'retired');
  assert.equal(federation.getCell('cell:offspring').status, 'retired');
  assert.equal(federation.snapshot().cells.length, 4);
});

test('Feather halts the federation without erasing cells or tissue history', async () => {
  const { federation } = fixture();
  await buildTissue(federation);
  const halted = await federation.halt('Feather test');
  assert.equal(halted.homeostasis.status, 'resting');
  assert.equal(halted.cells.length, 3);
  await assert.rejects(
    federation.runCell('cell:proposer'),
    /halted by Feather/,
  );
  const resumed = await federation.resume();
  assert.equal(resumed.tissues[0].status, 'active');
  assert.equal(resumed.cells.length, 3);
});


test('seat-authorized revocation routes future selection back to the preserved parent', async () => {
  const { federation, privateKey } = fixture();
  const { sourceHash } = await buildTissue(federation);
  const proposed = await federation.proposeCandidate({
    tissueId: 'tissue:first-organism',
    candidateId: 'candidate:revoke-me',
    source: nextSource,
    parentSourceHash: sourceHash,
    requestedCapabilities: ['wtl:pure'],
  });
  await federation.verifyCandidate(proposed.candidateId);
  const promoteDecision = federation.buildSeatDecision({
    candidateId: proposed.candidateId,
    nonce: 'promote-nonce-00000001',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });
  const promoted = await federation.promoteCandidate({
    candidateId: proposed.candidateId,
    proof: { decision: promoteDecision, signature: sign(null, constitutionalDecisionBytes(promoteDecision), privateKey).toString('base64') },
  });
  assert.equal(promoted.status, 'promoted');
  assert.equal((await federation.getSelection('tissue:first-organism', 'wtl:sample-module')).sourceHash, hash(nextSource));

  const revokeDecision = federation.buildSeatDecision({
    candidateId: proposed.candidateId,
    operation: 'candidate.revoke',
    nonce: 'revoke-nonce-00000001',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });
  const revoked = await federation.revokeCandidate({
    candidateId: proposed.candidateId,
    proof: { decision: revokeDecision, signature: sign(null, constitutionalDecisionBytes(revokeDecision), privateKey).toString('base64') },
  });
  assert.equal(revoked.status, 'revoked');
  assert.equal((await federation.getSelection('tissue:first-organism', 'wtl:sample-module')).sourceHash, sourceHash);
  assert.equal(federation.events().some(e => e.kind === 'candidate.revoked'), true);
});


test('immune quarantine is local, inspectable and degrades only the affected constitutional tissue', async () => {
  const { federation } = fixture();
  await buildTissue(federation);
  const quarantined = await federation.quarantineCell('cell:verifier', 'adversarial verification anomaly');
  assert.equal(quarantined.status, 'quarantined');
  assert.equal(federation.getCell('cell:verifier').status, 'quarantined');
  assert.equal(federation.getTissue('tissue:first-organism').status, 'degraded');
  assert.equal(federation.snapshot().homeostasis.status, 'degraded');
  assert.equal(federation.snapshot().cells.length, 3);
});
