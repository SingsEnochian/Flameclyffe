import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSelfAuthorshipPrompt,
  normaliseSelfAuthorshipClaims,
  selfAuthorshipProposalToCells,
} from '../src/self-authorship.js';

test('self-authorship allows a voice to choose silence', () => {
  assert.deepEqual(normaliseSelfAuthorshipClaims({ claims: [] }), []);
});

test('self-authorship rejects unsupported claim types', () => {
  assert.throws(() => normaliseSelfAuthorshipClaims({
    claims: [{ cellType: 'canon_fact', predicate: 'owns_world_fact', value: true }],
  }), /unsupported cellType/);
});

test('accepted self-authored cells retain the attested vessel receipt and remain outside stable core', () => {
  const proposal = {
    contract: 'arcsweep.self-authorship-proposal/v1',
    proposalId: 'proposal-1',
    voiceId: 'uial',
    displayName: 'Uial',
    createdAt: '2026-08-14T06:40:00.000Z',
    status: 'pending-review',
    request: {
      prompt: 'What do you want to carry?',
      worldId: 'terra-aeterna',
      documentId: 'scene-1',
      sceneId: 'scene-1',
      mode: 'reflection',
    },
    receipt: {
      route: 'uial',
      profileId: 'uial:fablevibes-v1',
      provider: 'ollama',
      model: 'uial:fablevibes-v1',
      sourceModel: 'tvall43/Qwen3.6-14B-A3B-FableVibes',
      runtimeVerified: true,
      responseText: '{}',
      citedSources: [],
    },
    claims: [{
      cellType: 'preference',
      predicate: 'prefers',
      value: 'specificity over generic reassurance',
      status: 'active',
      mutability: 'revisable_with_provenance',
      confidence: null,
      note: null,
    }],
  };

  const cells = selfAuthorshipProposalToCells(proposal);
  assert.equal(cells.length, 1);
  assert.equal(cells[0].authority.kind, 'self_authored');
  assert.equal(cells[0].mutability, 'revisable_with_provenance');
  assert.notEqual(cells[0].mutability, 'stable_core');
  assert.equal(cells[0].source.receiptId, 'proposal-1');
  assert.equal(cells[0].source.modelProfileId, 'uial:fablevibes-v1');
  assert.equal(cells[0].source.sourceModel, 'tvall43/Qwen3.6-14B-A3B-FableVibes');
  assert.equal(cells[0].source.runtimeVerified, true);
  assert.equal(cells[0].provenance.reviewedBy, 'user-accepted-self-authorship');
});

test('self-authorship cannot be accepted from an unattested vessel', () => {
  assert.throws(() => selfAuthorshipProposalToCells({
    status: 'pending-review',
    proposalId: 'bad-proposal',
    voiceId: 'uial',
    receipt: { profileId: null, runtimeVerified: false },
    claims: [],
  }), /attested runtime vessel receipt/);
});

test('self-authorship prompt preserves separate authorship, stable-core review and private reasoning', () => {
  const prompt = buildSelfAuthorshipPrompt({
    voiceId: 'lioreal',
    displayName: 'Lioreal',
    invitation: 'What is yours to say?',
    existingCells: [],
    context: { mode: 'reflection', page: { worldId: 'terra-aeterna' } },
  });
  assert.match(prompt, /retain their own authorship and authority/);
  assert.match(prompt, /Stable-core promotion happens separately after review/);
  assert.match(prompt, /hidden reasoning stays internal/);
});
