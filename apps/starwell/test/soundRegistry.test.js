import test from 'node:test';
import assert from 'node:assert/strict';

import { findSoundPatch, portalSoundPatches, validateSoundPatchRegistry } from '../src/sound/portalSoundRegistry.js';
import { createYggdrasilSoundProposal } from '../src/sound/yggdrasilSoundPlanner.js';

test('STARWELL sound registry validates seeded patches', () => {
  assert.deepEqual(validateSoundPatchRegistry(portalSoundPatches), []);
  assert.ok(findSoundPatch('safe_gateway_369'));
  assert.ok(findSoundPatch('runa_gateway_432'));
  assert.ok(findSoundPatch('yggdrasil_root_breath'));
});

test('Yggdrasil sound proposal stays data-only in v0.1', () => {
  const proposal = createYggdrasilSoundProposal({ patchId: 'yggdrasil_root_breath', roomId: 'ygg-gate' });

  assert.equal(proposal.proposalOnly, true);
  assert.equal(proposal.playbackEnabled, false);
  assert.equal(proposal.patchSummary.id, 'yggdrasil_root_breath');
  assert.equal(proposal.featherStop, true);
  assert.equal(proposal.plainPass, true);
});
